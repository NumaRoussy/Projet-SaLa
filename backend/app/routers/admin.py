"""
app/routers/admin.py
Routes d'administration protégées par le header X-Admin-Key.

Routes disponibles :
  POST /api/admin/prune-branch        — Sciage récursif immédiat d'une branche
  POST /api/admin/reports/{id}/review — Validation ou rejet d'un rapport PENDING
  POST /api/admin/campaigns           — Création d'une campagne bootstrap
  DELETE /api/admin/campaigns/{id}    — Désactivation d'une campagne
  POST /api/admin/blackout            — Activer / lever le coupe-circuit de camp
  GET  /api/admin/reports             — Liste des rapports PENDING
"""
import hashlib
import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
import aiosqlite
from app.database import get_db
from app.config import ADMIN_KEY
from app.models import (
    PruneBranchPayload,
    ValidateReportPayload,
    BootstrapCampaignCreate,
    BlackoutPayload,
)
from app.services.tree_service import prune_branch_recursive

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_admin(x_admin_key: str = Header(...)) -> None:
    """Dépendance qui valide le header X-Admin-Key."""
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Clé d'administration invalide.")


def _hash(token: str) -> str:
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Sciage de branche
# ---------------------------------------------------------------------------

@router.post("/prune-branch")
async def admin_prune_branch(
    payload: PruneBranchPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Révoque immédiatement un appareil et toute sa descendance."""
    count = await prune_branch_recursive(db, payload.target_device_id, payload.reason)
    if count == 0:
        raise HTTPException(
            status_code=404,
            detail=f"Appareil '{payload.target_device_id}' introuvable.",
        )
    return {"revoked_count": count, "status": "pruned"}


# ---------------------------------------------------------------------------
# Validation de rapport de révocation
# ---------------------------------------------------------------------------

@router.get("/reports")
async def list_pending_reports(
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Retourne tous les rapports en statut PENDING."""
    async with db.execute(
        "SELECT id, target_device_id, reason, reporter_name, reporter_group, created_at "
        "FROM revocation_reports WHERE status = 'PENDING' ORDER BY created_at DESC"
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {
            "id": r[0],
            "target_device_id": r[1],
            "reason": r[2],
            "reporter_name": r[3],
            "reporter_group": r[4],
            "created_at": r[5],
        }
        for r in rows
    ]


@router.post("/reports/{report_id}/review")
async def review_report(
    report_id: int,
    payload: ValidateReportPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    APPROVED → déclenche le sciage récursif de la branche cible puis marque le rapport.
    REJECTED → marque le rapport rejeté sans toucher à l'arbre.
    """
    async with db.execute(
        "SELECT target_device_id, reason, status FROM revocation_reports WHERE id = ?",
        (report_id,),
    ) as cursor:
        report = await cursor.fetchone()

    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable.")
    if report[2] != "PENDING":
        raise HTTPException(status_code=409, detail="Ce rapport a déjà été traité.")

    revoked_count = 0
    if payload.action == "APPROVED":
        revoked_count = await prune_branch_recursive(db, report[0], report[1])

    await db.execute(
        "UPDATE revocation_reports SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
        (payload.action, report_id),
    )
    await db.commit()

    return {
        "report_id": report_id,
        "action": payload.action,
        "revoked_count": revoked_count,
    }


# ---------------------------------------------------------------------------
# Gestion des campagnes bootstrap
# ---------------------------------------------------------------------------

@router.post("/campaigns", status_code=201)
async def create_campaign(
    payload: BootstrapCampaignCreate,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Crée une nouvelle campagne d'amorçage (token en clair → hash SHA-256 stocké)."""
    token_hash = _hash(payload.token)
    try:
        await db.execute(
            "INSERT INTO bootstrap_campaigns (id, name, token_hash, expires_at) VALUES (?, ?, ?, ?)",
            (payload.id, payload.name, token_hash, payload.expires_at),
        )
        await db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail=f"Conflit d'ID ou de token : {e}")
    return {"id": payload.id, "status": "created"}


@router.delete("/campaigns/{campaign_id}")
async def deactivate_campaign(
    campaign_id: str,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Désactive une campagne d'amorçage (is_active = 0)."""
    await db.execute(
        "UPDATE bootstrap_campaigns SET is_active = 0 WHERE id = ?",
        (campaign_id,),
    )
    await db.commit()
    return {"id": campaign_id, "status": "deactivated"}


# ---------------------------------------------------------------------------
# Interrupteur d'urgence camp_blackout_active
# ---------------------------------------------------------------------------

@router.post("/blackout")
async def set_blackout(
    payload: BlackoutPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Active (active=true) ou lève (active=false) le coupe-circuit de camp.
    Utilise un UPSERT SQLite natif.
    """
    value = "true" if payload.active else "false"
    await db.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_active', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (value,),
    )
    await db.commit()
    return {"camp_blackout_active": payload.active}

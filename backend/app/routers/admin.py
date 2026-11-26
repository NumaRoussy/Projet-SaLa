"""
app/routers/admin.py
Routes d'administration protégées par le header X-Admin-Key.

Routes disponibles :
  GET  /api/admin/check-key           — Vérification de validité de la clé
  POST /api/admin/prune-branch        — Sciage récursif immédiat d'une branche
  GET  /api/admin/reports             — Liste des rapports PENDING
  POST /api/admin/reports/{id}/review — Validation ou rejet d'un rapport PENDING
  GET  /api/admin/campaigns           — Liste des campagnes bootstrap
  POST /api/admin/campaigns           — Création d'une campagne bootstrap
  DELETE /api/admin/campaigns/{id}    — Désactivation d'une campagne
  GET  /api/admin/blackout            — État complet du coupe-circuit (manuel + dates)
  POST /api/admin/blackout            — Activer / lever le coupe-circuit manuel
  POST /api/admin/blackout-dates      — Programmer les dates de camp
  POST /api/admin/import-csv          — Réimportation à chaud du catalogue de cartes
"""
import os
import csv
import io
import hashlib
import hmac
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import FileResponse
import aiosqlite
from app.database import get_db
from app.config import ADMIN_KEY
from app.models import (
    PruneBranchPayload,
    ValidateReportPayload,
    BootstrapCampaignCreate,
    BlackoutPayload,
    BlackoutDatesPayload,
    BlackoutMessagePayload,
    ImportCsvPayload,
    CardCreatePayload,
    FeedbackStatusPayload,
)
from app.services.tree_service import prune_branch_recursive
from app.services.blackout_service import (
    get_blackout_config,
    set_blackout_manual,
    set_blackout_dates,
    set_blackout_message,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_admin(x_admin_key: str = Header(...)) -> None:
    """Dépendance qui valide le header X-Admin-Key.
    Utilise hmac.compare_digest pour une comparaison en temps constant
    (prévient les timing attacks qui pourraient deviner la clé octet par octet).
    """
    if not hmac.compare_digest(x_admin_key.encode("utf-8"), ADMIN_KEY.encode("utf-8")):
        raise HTTPException(status_code=403, detail="Clé d'administration invalide.")


def _hash(token: str) -> str:
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Vérification d'authentification admin
# ---------------------------------------------------------------------------

@router.get("/check-key")
async def check_admin_key(_: None = Depends(_require_admin)):
    """Valide la clé d'administration pour la console visuelle du Hub."""
    return {"valid": True, "status": "authenticated"}


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

@router.get("/campaigns")
async def list_campaigns(
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Retourne toutes les campagnes d'amorçage."""
    async with db.execute(
        "SELECT id, name, is_active, expires_at, created_at FROM bootstrap_campaigns ORDER BY created_at DESC"
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "is_active": bool(r[2]),
            "expires_at": r[3],
            "created_at": r[4],
        }
        for r in rows
    ]


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
    except Exception:
        raise HTTPException(status_code=409, detail="Conflit d'identifiant ou de token de campagne.")
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
# Coupe-circuit Blackout (manuel + dates programmées)
# ---------------------------------------------------------------------------

@router.get("/blackout")
async def get_blackout_status(
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Retourne l'état complet du blackout (manuel, dates programmées et effectif)."""
    return await get_blackout_config(db)


@router.post("/blackout")
async def set_blackout(
    payload: BlackoutPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Active ou désactive manuellement le blackout."""
    await set_blackout_manual(db, payload.active)
    return await get_blackout_config(db)


@router.post("/blackout-dates")
async def configure_blackout_dates(
    payload: BlackoutDatesPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Configure ou réinitialise la plage de dates de camp programmée."""
    await set_blackout_dates(db, payload.start_date, payload.end_date)
    return await get_blackout_config(db)


@router.post("/blackout-message")
async def configure_blackout_message(
    payload: BlackoutMessagePayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Met à jour le message d'avertissement de blackout affiché aux utilisateurs."""
    await set_blackout_message(db, payload.message)
    return await get_blackout_config(db)


# ---------------------------------------------------------------------------
# Helpers CSV et synchronisation bidirectionnelle DB <-> content.csv
# ---------------------------------------------------------------------------

def get_csv_path() -> str:
    possible_paths = [
        os.path.abspath("data/content.csv"),
        os.path.abspath("../data/content.csv"),
        os.path.abspath("/app/data/content.csv"),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return os.path.abspath("data/content.csv")


async def sync_db_to_csv(db: aiosqlite.Connection) -> None:
    csv_path = get_csv_path()
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    async with db.execute(
        "SELECT game, mode, category, title, content, extra, sips, loss_percent, min_players FROM cards ORDER BY game ASC, id ASC"
    ) as cursor:
        rows = await cursor.fetchall()
    with open(csv_path, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["game", "mode", "category", "title", "content", "extra", "sips", "loss_percent", "min_players"])
        for r in rows:
            writer.writerow([r[0], r[1] or "", r[2] or "", r[3] or "", r[4], r[5] or "", r[6] or 0, r[7] if r[7] is not None else 0.0, r[8] or 2])


async def import_csv_to_db(db: aiosqlite.Connection, raw_csv: str) -> int:
    # Strip UTF-8 BOM if present (Excel, macOS TextEdit)
    cleaned_csv = raw_csv.strip()
    if cleaned_csv.startswith('\ufeff'):
        cleaned_csv = cleaned_csv[1:]
    reader = csv.DictReader(io.StringIO(cleaned_csv))
    records = []
    for row in reader:
        if not row.get("game") or not row.get("content"):
            continue
        try:
            loss_val = float(row.get("loss_percent") or 0.0)
        except ValueError:
            loss_val = 0.0
        records.append(
            (
                row["game"],
                row.get("mode") or "",
                row.get("category") or "",
                row.get("title") or "",
                row["content"],
                row.get("extra") or "",
                int(row.get("sips") or 0),
                loss_val,
                int(row.get("min_players") or 2),
            )
        )
    if not records:
        raise HTTPException(
            status_code=400,
            detail="Le contenu CSV ne contient aucune carte valide.",
        )
    await db.execute("BEGIN IMMEDIATE")
    try:
        await db.execute("DELETE FROM cards")
        await db.executemany(
            """INSERT INTO cards (game, mode, category, title, content, extra, sips, loss_percent, min_players)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            records,
        )
        await db.execute("COMMIT")
    except Exception as e:
        await db.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import atomique du catalogue : {e}")
    return len(records)


# ---------------------------------------------------------------------------
# Réimportation à chaud du catalogue de cartes CSV
# ---------------------------------------------------------------------------

@router.post("/import-csv")
async def import_csv_cards(
    payload: Optional[ImportCsvPayload] = None,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Recharge le catalogue de cartes :
    - Soit depuis payload.csv_content si fourni,
    - Soit depuis data/content.csv.
    """
    raw_csv = ""
    if payload and payload.csv_content:
        raw_csv = payload.csv_content
    else:
        found_path = get_csv_path()
        if not os.path.exists(found_path):
            raise HTTPException(
                status_code=404,
                detail="Fichier content.csv introuvable sur le serveur.",
            )
        with open(found_path, mode="r", encoding="utf-8") as f:
            raw_csv = f.read()

    count = await import_csv_to_db(db, raw_csv)
    return {
        "status": "success",
        "imported_count": count,
        "message": f"{count} cartes importées avec succès.",
    }


# ---------------------------------------------------------------------------
# Arbre Visuel des Embranchements (Point 3)
# ---------------------------------------------------------------------------

@router.get("/tree")
async def get_device_tree(
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Retourne toutes les campagnes bootstrap et la hiérarchie complète des appareils."""
    async with db.execute(
        "SELECT id, name, is_active, created_at, expires_at FROM bootstrap_campaigns ORDER BY created_at DESC"
    ) as cursor:
        campaign_rows = await cursor.fetchall()

    async with db.execute(
        "SELECT id, parent_device_id, bootstrap_campaign_id, is_revoked, revocation_reason, created_at, last_seen_at FROM devices ORDER BY created_at ASC"
    ) as cursor:
        device_rows = await cursor.fetchall()

    device_nodes = {}
    children_map = {}
    for r in device_rows:
        dev_id = r[0]
        parent_id = r[1]
        camp_id = r[2]
        device_nodes[dev_id] = {
            "id": dev_id,
            "parent_device_id": parent_id,
            "bootstrap_campaign_id": camp_id,
            "is_revoked": bool(r[3]),
            "revocation_reason": r[4],
            "created_at": r[5],
            "last_seen_at": r[6],
            "descendant_count": 0,
            "children": [],
        }
        if parent_id:
            children_map.setdefault(parent_id, []).append(dev_id)

    def compute_descendants(node_id: str) -> int:
        child_ids = children_map.get(node_id, [])
        total = len(child_ids)
        node = device_nodes[node_id]
        node["children"] = []
        for cid in child_ids:
            total += compute_descendants(cid)
            node["children"].append(device_nodes[cid])
        node["descendant_count"] = total
        return total

    campaign_devices = {}
    orphan_devices = []
    for dev_id, node in device_nodes.items():
        if node["bootstrap_campaign_id"]:
            campaign_devices.setdefault(node["bootstrap_campaign_id"], []).append(node)
        elif not node["parent_device_id"]:
            orphan_devices.append(node)

    for dev_list in campaign_devices.values():
        for root in dev_list:
            compute_descendants(root["id"])
    for root in orphan_devices:
        compute_descendants(root["id"])

    campaigns_data = []
    for c in campaign_rows:
        c_id = c[0]
        campaigns_data.append({
            "id": c_id,
            "name": c[1],
            "is_active": bool(c[2]),
            "created_at": c[3],
            "expires_at": c[4],
            "devices": campaign_devices.get(c_id, []),
        })

    active_count = sum(1 for d in device_nodes.values() if not d["is_revoked"])
    revoked_count = sum(1 for d in device_nodes.values() if d["is_revoked"])

    return {
        "campaigns": campaigns_data,
        "orphans": orphan_devices,
        "total_devices": len(device_nodes),
        "active_devices": active_count,
        "revoked_devices": revoked_count,
    }


# ---------------------------------------------------------------------------
# Statistiques d'utilisation (Point 4)
# ---------------------------------------------------------------------------

@router.get("/stats")
async def get_admin_stats(
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Agrège telemetry_events et devices : parties jouées, temps, durée moyenne par jeu."""
    async with db.execute(
        "SELECT COUNT(*), SUM(CASE WHEN is_revoked = 0 THEN 1 ELSE 0 END), SUM(CASE WHEN is_revoked = 1 THEN 1 ELSE 0 END) FROM devices"
    ) as cur:
        d_row = await cur.fetchone()
        total_devices = d_row[0] or 0
        active_devices = d_row[1] or 0
        revoked_devices = d_row[2] or 0

    async with db.execute("SELECT COUNT(*) FROM devices WHERE last_seen_at >= datetime('now', '-7 days')") as cur:
        devices_7d = (await cur.fetchone())[0] or 0
    async with db.execute("SELECT COUNT(*) FROM devices WHERE last_seen_at >= datetime('now', '-30 days')") as cur:
        devices_30d = (await cur.fetchone())[0] or 0

    async with db.execute("""
        SELECT game_id, COUNT(*), SUM(duration_seconds), AVG(duration_seconds)
        FROM telemetry_events
        GROUP BY game_id
    """) as cur:
        game_stats_rows = await cur.fetchall()

    game_stats = {}
    for r in game_stats_rows:
        game_stats[r[0]] = {
            "game_id": r[0],
            "play_count": r[1],
            "total_duration_seconds": r[2] or 0,
            "avg_duration_seconds": round(r[3] or 0, 1),
        }

    all_games = ['infiltre', 'couvrefeu', 'chrono', 'carnotzet', 'debout', 'debrief', 'rondedenuit']
    for g in all_games:
        if g not in game_stats:
            game_stats[g] = {
                "game_id": g,
                "play_count": 0,
                "total_duration_seconds": 0,
                "avg_duration_seconds": 0,
            }

    async with db.execute("SELECT COUNT(*), SUM(duration_seconds) FROM telemetry_events WHERE created_at >= datetime('now', '-7 days')") as cur:
        row_7d = await cur.fetchone()
        events_7d = row_7d[0] or 0
        duration_7d = row_7d[1] or 0

    async with db.execute("SELECT COUNT(*), SUM(duration_seconds) FROM telemetry_events WHERE created_at >= datetime('now', '-30 days')") as cur:
        row_30d = await cur.fetchone()
        events_30d = row_30d[0] or 0
        duration_30d = row_30d[1] or 0

    total_plays = sum(g["play_count"] for g in game_stats.values())
    total_play_time = sum(g["total_duration_seconds"] for g in game_stats.values())

    return {
        "devices": {
            "total": total_devices,
            "active": active_devices,
            "revoked": revoked_devices,
            "active_7d": devices_7d,
            "active_30d": devices_30d,
        },
        "games": list(game_stats.values()),
        "summary": {
            "total_plays": total_plays,
            "total_play_time_seconds": total_play_time,
            "events_7d": events_7d,
            "duration_7d": duration_7d,
            "events_30d": events_30d,
            "duration_30d": duration_30d,
        },
    }


# ---------------------------------------------------------------------------
# Gestionnaire de Cartes & CSV (Point 5)
# ---------------------------------------------------------------------------

@router.get("/cards")
async def list_admin_cards(
    game: Optional[str] = None,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Liste les cartes du catalogue avec filtre optionnel par jeu."""
    query = "SELECT id, game, mode, category, title, content, extra, sips, loss_percent, min_players FROM cards"
    params = []
    if game:
        query += " WHERE game = ?"
        params.append(game)
    query += " ORDER BY game ASC, id ASC"
    async with db.execute(query, tuple(params)) as cur:
        rows = await cur.fetchall()
    return [
        {
            "id": r[0],
            "game": r[1],
            "mode": r[2],
            "category": r[3],
            "title": r[4],
            "content": r[5],
            "extra": r[6],
            "sips": r[7],
            "loss_percent": r[8] if r[8] is not None else 0.0,
            "min_players": r[9],
        }
        for r in rows
    ]


@router.post("/cards", status_code=201)
async def create_admin_card(
    payload: CardCreatePayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Ajoute une nouvelle carte et resynchronise data/content.csv."""
    cursor = await db.execute(
        """INSERT INTO cards (game, mode, category, title, content, extra, sips, loss_percent, min_players)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            payload.game,
            payload.mode or "",
            payload.category,
            payload.title or "",
            payload.content,
            payload.extra or "",
            payload.sips,
            payload.loss_percent,
            payload.min_players,
        ),
    )
    new_id = cursor.lastrowid
    await db.commit()
    await sync_db_to_csv(db)
    return {"id": new_id, "status": "created"}


@router.put("/cards/{card_id}")
async def update_admin_card(
    card_id: int,
    payload: CardCreatePayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Met à jour une carte existante et resynchronise data/content.csv."""
    async with db.execute("SELECT id FROM cards WHERE id = ?", (card_id,)) as cur:
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Carte introuvable.")

    await db.execute(
        """UPDATE cards
           SET game = ?, mode = ?, category = ?, title = ?, content = ?, extra = ?, sips = ?, loss_percent = ?, min_players = ?
           WHERE id = ?""",
        (
            payload.game,
            payload.mode or "",
            payload.category,
            payload.title or "",
            payload.content,
            payload.extra or "",
            payload.sips,
            payload.loss_percent,
            payload.min_players,
            card_id,
        ),
    )
    await db.commit()
    await sync_db_to_csv(db)
    return {"id": card_id, "status": "updated"}


@router.delete("/cards/{card_id}")
async def delete_admin_card(
    card_id: int,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Supprime une carte et resynchronise data/content.csv."""
    await db.execute("DELETE FROM cards WHERE id = ?", (card_id,))
    await db.commit()
    await sync_db_to_csv(db)
    return {"id": card_id, "status": "deleted"}


@router.get("/cards/export-csv")
async def export_cards_csv(
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Télécharge le fichier data/content.csv actuel synchronisé."""
    await sync_db_to_csv(db)
    csv_path = get_csv_path()
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Fichier CSV introuvable sur le serveur.")
    return FileResponse(
        csv_path,
        media_type="text/csv",
        filename="scoutgame_content.csv",
    )


@router.post("/cards/upload-csv")
async def upload_cards_csv(
    payload: ImportCsvPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Reçoit un fichier CSV complet, remplace data/content.csv et met à jour SQLite."""
    if not payload.csv_content or not payload.csv_content.strip():
        raise HTTPException(status_code=400, detail="Contenu CSV manquant ou vide.")

    csv_path = get_csv_path()
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    with open(csv_path, mode="w", encoding="utf-8") as f:
        f.write(payload.csv_content)

    count = await import_csv_to_db(db, payload.csv_content)
    return {"imported_count": count, "status": "success"}


# ---------------------------------------------------------------------------
# Propositions utilisateurs et intégration directe (Point 5)
# ---------------------------------------------------------------------------

@router.get("/feedback")
async def list_admin_feedback(
    status: Optional[str] = None,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Liste les retours et propositions de cartes soumises par les joueurs."""
    query = """
    SELECT id, type, target_game, mode, category, title, content, extra_data, extra,
           sips, loss_percent, min_players, author_alias, contact_email, status, created_at
    FROM user_feedback
    """
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"

    async with db.execute(query, tuple(params)) as cur:
        rows = await cur.fetchall()

    return [
        {
            "id": r[0],
            "type": r[1],
            "target_game": r[2],
            "mode": r[3],
            "category": r[4],
            "title": r[5],
            "content": r[6],
            "extra_data": r[7] if r[7] is not None else r[8],
            "extra": r[8] if r[8] is not None else r[7],
            "sips": r[9] if r[9] is not None else 0,
            "loss_percent": float(r[10]) if r[10] is not None else 0.0,
            "min_players": r[11] if r[11] is not None else 2,
            "author_alias": r[12],
            "contact_email": r[13],
            "status": r[14],
            "created_at": r[15],
        }
        for r in rows
    ]


@router.post("/feedback/{feedback_id}/status")
async def review_feedback(
    feedback_id: int,
    payload: FeedbackStatusPayload,
    _: None = Depends(_require_admin),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Valide ou rejette une proposition :
    Si APPROVED (et pas une suggestion couvrefeu), insère automatiquement la carte
    dans SQLite et synchronise data/content.csv.
    """
    async with db.execute(
        """SELECT id, type, target_game, mode, category, title, content,
                  extra_data, extra, sips, loss_percent, min_players
           FROM user_feedback WHERE id = ?""",
        (feedback_id,),
    ) as cur:
        fb = await cur.fetchone()

    if not fb:
        raise HTTPException(status_code=404, detail="Feedback introuvable.")

    card_inserted = False
    if payload.action == "APPROVED":
        game = (payload.target_game if payload.target_game is not None else fb[2]) or "debrief"
        is_suggestion = fb[1] == "SUGGESTION" or game == "couvrefeu"
        if not is_suggestion:
            mode = payload.mode if payload.mode is not None else (fb[3] or "")
            category = payload.category if payload.category is not None else (fb[4] or "")
            if not category:
                if game == "infiltre":
                    category = "defi"
                elif game == "chrono":
                    category = "campement" if mode == "scout" else "objet"
                elif game == "vachao":
                    category = "carte"
                elif game == "crise":
                    category = "attaque"
                else:
                    category = "dossiers"
            if not mode:
                if game == "crise":
                    mode = "crise"
                elif game == "debrief":
                    mode = "debrief"
                elif game == "vachao":
                    mode = "passif"
                elif game == "chrono":
                    mode = "scout"

            content = (payload.content if payload.content is not None else fb[6]) or ""
            title = payload.title if payload.title is not None else (fb[5] or "")
            if game == "chrono" and not title:
                title = content
            extra = payload.extra if payload.extra is not None else (fb[8] if fb[8] is not None else (fb[7] or ""))
            sips = payload.sips if payload.sips is not None else (fb[9] if fb[9] is not None else 0)
            loss_percent = (
                float(payload.loss_percent)
                if payload.loss_percent is not None
                else (float(fb[10]) if fb[10] is not None else 0.0)
            )
            default_min = 3 if game == "infiltre" else (4 if game == "chrono" else 2)
            min_players = payload.min_players if payload.min_players is not None else (fb[11] if fb[11] is not None else default_min)

            await db.execute(
                """INSERT INTO cards (game, mode, category, title, content, extra, sips, loss_percent, min_players)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (game, mode, category, title, content, extra, sips, loss_percent, min_players),
            )
            card_inserted = True

    await db.execute(
        "UPDATE user_feedback SET status = ? WHERE id = ?",
        (payload.action, feedback_id),
    )
    await db.commit()

    if card_inserted:
        await sync_db_to_csv(db)

    return {"id": feedback_id, "status": payload.action, "card_inserted": card_inserted}

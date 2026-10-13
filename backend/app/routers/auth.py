"""
app/routers/auth.py
Routeur d'authentification et relais P2P (section 5.3).

Modifications supplémentaires par rapport au code de la spec :
- /api/auth/verify et /api/invite/generate vérifient le coupe-circuit
  camp_blackout_active dans system_config avant de valider l'accès.
"""
import hashlib
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
import aiosqlite
from app.database import get_db
from app.services.tree_service import is_device_ancestry_valid
from app.models import BootstrapPayload, InviteConsumePayload, VerifyPayload

router = APIRouter(prefix="/api", tags=["auth"])


def hash_token(token: str) -> str:
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


async def _is_blackout_active(db: aiosqlite.Connection) -> bool:
    """Vérifie le coupe-circuit camp_blackout_active dans system_config."""
    async with db.execute(
        "SELECT value FROM system_config WHERE key = 'camp_blackout_active'"
    ) as cursor:
        row = await cursor.fetchone()
        if row and str(row[0]).lower() == "true":
            return True
    return False


@router.post("/auth/bootstrap")
async def exchange_bootstrap_token(
    payload: BootstrapPayload,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Échange un jeton d'amorce papier contre un device_pass UUID."""
    if not payload.bootstrap_token:
        raise HTTPException(status_code=400, detail="Token manquant")

    token_h = hash_token(payload.bootstrap_token)
    query = """
    SELECT id, is_active, expires_at FROM bootstrap_campaigns
    WHERE token_hash = ? AND is_active = 1
    """
    async with db.execute(query, (token_h,)) as cursor:
        campaign = await cursor.fetchone()

    if not campaign:
        raise HTTPException(status_code=403, detail="Jeton d'amorce invalide ou expiré")

    camp_id, _, expires_at = campaign
    if expires_at and datetime.datetime.fromisoformat(expires_at) < datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Jeton d'amorce expiré")

    new_device_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO devices (id, bootstrap_campaign_id) VALUES (?, ?)",
        (new_device_id, camp_id),
    )
    await db.commit()
    return {"device_pass": new_device_id, "status": "authorized"}


@router.post("/invite/generate")
async def generate_ephemeral_invite(
    authorization: str = Header(...),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Génère un jeton d'invitation P2P éphémère de 120 secondes.
    Bloqué si le camp_blackout_active est activé.
    """
    # --- Coupe-circuit blackout ---
    if await _is_blackout_active(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "Période des camps scouts en cours. L'espace festif est temporairement suspendu. "
                "Nos valeurs imposent une sobriété absolue auprès des jeunes. "
                "Bon camp à vos patrouilles, rendez-vous à la rentrée !"
            ),
        )

    device_id = authorization.replace("Bearer ", "").strip()
    valid, reason = await is_device_ancestry_valid(db, device_id)
    if not valid:
        raise HTTPException(status_code=403, detail=reason)

    raw_invite_token = f"inv_{uuid.uuid4().hex}"
    invite_hash = hash_token(raw_invite_token)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=120)

    await db.execute(
        """INSERT INTO ephemeral_invites (token_hash, creator_device_id, expires_at)
           VALUES (?, ?, ?)""",
        (invite_hash, device_id, expires_at.isoformat()),
    )
    await db.commit()
    return {"invite_token": raw_invite_token, "expires_in": 120}


@router.post("/invite/consume")
async def consume_ephemeral_invite(
    payload: InviteConsumePayload,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Consomme un jeton éphémère et enregistre le nouvel appareil fils."""
    raw_token = payload.invite_token
    if not raw_token:
        raise HTTPException(status_code=400, detail="Token manquant")

    token_h = hash_token(raw_token)
    now = datetime.datetime.utcnow().isoformat()

    query = """
    SELECT creator_device_id, is_consumed, expires_at FROM ephemeral_invites
    WHERE token_hash = ?
    """
    async with db.execute(query, (token_h,)) as cursor:
        invite = await cursor.fetchone()

    if not invite or invite[1] == 1 or invite[2] < now:
        raise HTTPException(status_code=400, detail="Invitation invalide ou expirée (>120s)")

    creator_id = invite[0]
    parent_valid, reason = await is_device_ancestry_valid(db, creator_id)
    if not parent_valid:
        raise HTTPException(status_code=403, detail="Le terminal parrain a été révoqué")

    new_device_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO devices (id, parent_device_id) VALUES (?, ?)",
        (new_device_id, creator_id),
    )
    await db.execute(
        "UPDATE ephemeral_invites SET is_consumed = 1, consumed_by_device_id = ? WHERE token_hash = ?",
        (new_device_id, token_h),
    )
    await db.commit()
    return {"device_pass": new_device_id, "status": "authorized"}


@router.post("/auth/verify")
async def verify_device(
    payload: VerifyPayload,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Vérifie la validité d'un device_pass et met à jour last_seen_at.
    Retourne valid=False si le blackout camp est actif.
    """
    device_id = payload.device_pass
    if not device_id:
        return {"valid": False, "reason": "Jeton manquant"}

    # --- Coupe-circuit blackout ---
    if await _is_blackout_active(db):
        return {
            "valid": False,
            "blackout": True,
            "reason": (
                "Période des camps scouts en cours. L'espace festif est temporairement suspendu. "
                "Nos valeurs imposent une sobriété absolue auprès des jeunes. "
                "Bon camp à vos patrouilles, rendez-vous à la rentrée !"
            ),
        }

    valid, reason = await is_device_ancestry_valid(db, device_id)
    if not valid:
        return {"valid": False, "reason": reason}

    await db.execute(
        "UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
        (device_id,),
    )
    await db.commit()
    return {"valid": True}

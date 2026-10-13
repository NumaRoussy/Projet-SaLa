"""
app/routers/reports.py
Permet à un chef témoin de soumettre un signalement de révocation (section 2.3).
Crée une entrée dans revocation_reports avec statut PENDING.
"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from app.database import get_db
from app.models import RevocationReportCreate

router = APIRouter(prefix="/api", tags=["reports"])


@router.post("/reports", status_code=201)
async def create_revocation_report(
    payload: RevocationReportCreate,
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Soumet un signalement de terrain. Le device cible doit exister en base.
    Le rapport est créé avec statut PENDING pour validation admin.
    """
    # Vérifie que l'appareil cible existe
    async with db.execute(
        "SELECT id FROM devices WHERE id = ?", (payload.target_device_id,)
    ) as cursor:
        device = await cursor.fetchone()

    if not device:
        raise HTTPException(
            status_code=404,
            detail=f"Appareil cible '{payload.target_device_id}' introuvable.",
        )

    await db.execute(
        """INSERT INTO revocation_reports
               (target_device_id, reason, reporter_name, reporter_group)
           VALUES (?, ?, ?, ?)""",
        (
            payload.target_device_id,
            payload.reason,
            payload.reporter_name,
            payload.reporter_group,
        ),
    )
    await db.commit()

    return {
        "status": "PENDING",
        "message": "Signalement enregistré. Un administrateur va examiner la situation.",
    }

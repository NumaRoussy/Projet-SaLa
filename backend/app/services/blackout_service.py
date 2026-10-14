"""
app/services/blackout_service.py
Gestion du coupe-circuit de camp :
1. Interrupteur d'urgence manuel : camp_blackout_active ('true'/'false')
2. Dates programmées : camp_blackout_start et camp_blackout_end (format YYYY-MM-DD)
"""
import datetime
from typing import Optional, Tuple, Dict, Any
import aiosqlite

OFFICIAL_BLACKOUT_MESSAGE = (
    "Période des camps scouts en cours. L'espace festif est temporairement suspendu. "
    "Nos valeurs imposent une sobriété absolue auprès des jeunes. "
    "Bon camp à vos patrouilles, rendez-vous à la rentrée !"
)


async def get_blackout_config(db: aiosqlite.Connection) -> Dict[str, Any]:
    """Récupère l'état complet du blackout et calcule son effectivité."""
    query = """
    SELECT key, value FROM system_config
    WHERE key IN ('camp_blackout_active', 'camp_blackout_start', 'camp_blackout_end', 'camp_blackout_message')
    """
    async with db.execute(query) as cursor:
        rows = await cursor.fetchall()
        cfg = {r[0]: r[1] for r in rows}

    manual_active = cfg.get("camp_blackout_active", "false").lower() == "true"
    start_date = cfg.get("camp_blackout_start") or None
    end_date = cfg.get("camp_blackout_end") or None
    custom_message = cfg.get("camp_blackout_message") or ""
    active_message = custom_message.strip() if custom_message.strip() else OFFICIAL_BLACKOUT_MESSAGE

    date_active = False
    if start_date and end_date:
        today = datetime.date.today().isoformat()
        date_active = (start_date <= today <= end_date)

    effective = manual_active or date_active

    return {
        "camp_blackout_active": manual_active,
        "camp_blackout_start": start_date,
        "camp_blackout_end": end_date,
        "date_active": date_active,
        "effective_blackout": effective,
        "camp_blackout_message": active_message,
        "default_blackout_message": OFFICIAL_BLACKOUT_MESSAGE,
        "reason": active_message if effective else "",
    }


async def is_blackout_active(db: aiosqlite.Connection) -> Tuple[bool, str]:
    """Retourne (effective_bool, reason_str)."""
    cfg = await get_blackout_config(db)
    return cfg["effective_blackout"], cfg["reason"]


async def set_blackout_manual(db: aiosqlite.Connection, active: bool) -> None:
    """Active ou désactive manuellement le coupe-circuit."""
    val = "true" if active else "false"
    await db.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_active', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (val,),
    )
    await db.commit()


async def set_blackout_dates(
    db: aiosqlite.Connection,
    start_date: Optional[str],
    end_date: Optional[str],
) -> None:
    """Configure la plage de dates de camp (YYYY-MM-DD)."""
    await db.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_start', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (start_date or "",),
    )
    await db.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_end', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (end_date or "",),
    )
    await db.commit()


async def set_blackout_message(db: aiosqlite.Connection, message: Optional[str]) -> None:
    """Met à jour le message de blackout personnalisé."""
    msg = (message or "").strip()
    await db.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_message', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (msg,),
    )
    await db.commit()

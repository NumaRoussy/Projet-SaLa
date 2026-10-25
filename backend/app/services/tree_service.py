"""
app/services/tree_service.py
Algorithme récursif de sciage de branche via des requêtes CTE SQLite (section 5.2).
"""
import aiosqlite
from typing import Tuple


async def is_device_ancestry_valid(db: aiosqlite.Connection, device_id: str) -> Tuple[bool, str]:
    """
    Remonte la chaîne des ancêtres. Si le nœud ou un ancêtre est révoqué, retourne False.
    """
    query = """
    WITH RECURSIVE Ancestors(id, parent_device_id, is_revoked, revocation_reason, depth) AS (
        SELECT id, parent_device_id, is_revoked, revocation_reason, 0
        FROM devices
        WHERE id = ?

        UNION ALL

        SELECT d.id, d.parent_device_id, d.is_revoked, d.revocation_reason, a.depth + 1
        FROM devices d
        INNER JOIN Ancestors a ON d.id = a.parent_device_id
        WHERE a.depth < 50
    )
    SELECT id, revocation_reason FROM Ancestors WHERE is_revoked = 1 LIMIT 1;
    """
    async with db.execute(query, (device_id,)) as cursor:
        row = await cursor.fetchone()
        if row:
            return False, f"Accès révoqué suite à la coupure de la branche (nœud: {row[0]})"
    return True, ""


async def prune_branch_recursive(db: aiosqlite.Connection, target_device_id: str, reason: str) -> int:
    """
    Révoque un appareil et l'ensemble de ses descendants directs et indirects.
    Retourne le nombre d'appareils révoqués.
    """
    select_descendants_query = """
    WITH RECURSIVE Descendants(id, depth) AS (
        SELECT id, 0 FROM devices WHERE id = ?
        UNION ALL
        SELECT d.id, desc.depth + 1 FROM devices d
        INNER JOIN Descendants desc ON d.parent_device_id = desc.id
        WHERE desc.depth < 50
    )
    SELECT id FROM Descendants;
    """
    async with db.execute(select_descendants_query, (target_device_id,)) as cursor:
        rows = await cursor.fetchall()
        device_ids_to_revoke = [r[0] for r in rows]

    if not device_ids_to_revoke:
        return 0

    placeholders = ",".join("?" for _ in device_ids_to_revoke)
    update_query = f"""
    UPDATE devices
    SET is_revoked = 1,
        revoked_at = CURRENT_TIMESTAMP,
        revocation_reason = ?
    WHERE id IN ({placeholders})
    """
    await db.execute(update_query, [reason] + device_ids_to_revoke)
    await db.commit()
    return len(device_ids_to_revoke)

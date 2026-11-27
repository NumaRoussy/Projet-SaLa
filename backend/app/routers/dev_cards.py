"""
app/routers/dev_cards.py
API temps réel & anti-collision pour l'outil collaboratif de revue de cartes (dev.scoutgame.ch).

Isolation stricte :
- Toutes les opérations de revue passent par ./data/dev_cards.db (DEV_DB_PATH).
- La base de production (scoutgame.db) et data/content.csv ne sont modifiés
  qu'au moment explicite de POST /api/dev/sync/push-to-prod (avec sauvegarde .bak).
"""
from __future__ import annotations

import asyncio
import csv
import hmac
import importlib.util
import io
import os
import shutil
import sqlite3
import tempfile
import time
from typing import Any, Literal, Optional

import aiosqlite
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel, Field

from app.config import DB_PATH, DEV_ACCESS_CODE, DEV_DB_PATH

LOCK_TTL_SECONDS = 180.0
VALID_STATUSES = ("PENDING", "VALIDATED", "REVIEW_LATER", "REJECTED")
CSV_COLUMNS = [
    "game",
    "mode",
    "category",
    "title",
    "content",
    "extra",
    "sips",
    "loss_percent",
    "min_players",
]

router = APIRouter(tags=["dev"])
_db_initialized = False
_init_lock = asyncio.Lock()


# ---------------------------------------------------------------------------
# Modèles Pydantic
# ---------------------------------------------------------------------------

class DevAuthPayload(BaseModel):
    code: str


class ClaimNextPayload(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    game: Optional[str] = None
    mode: Optional[str] = None
    queue: Literal["pending", "review_later"] = "pending"
    skip_id: Optional[int] = None


class HeartbeatPayload(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)


class CardActionPayload(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    action: Literal["validate", "review_later", "reject", "restore"]
    note: Optional[str] = Field(default="", max_length=500)
    actor: Optional[str] = Field(default=None, max_length=80)


class DevCardUpsertPayload(BaseModel):
    game: str = Field(..., min_length=1, max_length=60)
    mode: Optional[str] = Field(default="", max_length=60)
    category: str = Field(..., min_length=1, max_length=80)
    title: Optional[str] = Field(default="", max_length=500)
    content: str = Field(..., min_length=1, max_length=5000)
    extra: Optional[str] = Field(default="", max_length=2000)
    sips: int = Field(default=0, ge=0, le=50)
    loss_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    min_players: int = Field(default=2, ge=1, le=50)
    validate_card: bool = Field(default=False, alias="validate")
    status: Optional[Literal["PENDING", "VALIDATED"]] = None
    session_id: Optional[str] = Field(default=None, max_length=120)
    actor: Optional[str] = Field(default=None, max_length=80)

    model_config = {"populate_by_name": True}


class SyncFromProdPayload(BaseModel):
    strategy: Literal["replace", "append"] = "append"
    actor: Optional[str] = Field(default=None, max_length=80)


# ---------------------------------------------------------------------------
# Gestionnaire WebSocket temps réel
# ---------------------------------------------------------------------------

class DevConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[WebSocket, dict[str, str]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, label: str) -> None:
        await websocket.accept()
        self._connections[websocket] = {
            "session_id": session_id,
            "label": label or session_id[:8],
        }

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    @property
    def active_count(self) -> int:
        return len(self._connections)

    async def broadcast(self, message: dict[str, Any]) -> None:
        if not self._connections:
            return
        dead: list[WebSocket] = []
        for ws in list(self._connections.keys()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.pop(ws, None)


ws_manager = DevConnectionManager()


# ---------------------------------------------------------------------------
# Sécurité : vérification DEV_ACCESS_CODE en temps constant
# ---------------------------------------------------------------------------

def _verify_dev_code(candidate: Optional[str]) -> bool:
    if not candidate or not DEV_ACCESS_CODE:
        return False
    return hmac.compare_digest(candidate.encode("utf-8"), DEV_ACCESS_CODE.encode("utf-8"))


def _require_dev(x_dev_key: Optional[str] = Header(default=None, alias="X-Dev-Key")) -> None:
    if not _verify_dev_code(x_dev_key):
        raise HTTPException(status_code=403, detail="Code d'accès développeur invalide.")


# ---------------------------------------------------------------------------
# Base SQLite isolée (./data/dev_cards.db)
# ---------------------------------------------------------------------------

DEV_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS dev_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game TEXT NOT NULL,
    mode TEXT DEFAULT '',
    category TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT NOT NULL,
    extra TEXT DEFAULT '',
    sips INTEGER DEFAULT 0,
    loss_percent REAL DEFAULT 0.0,
    min_players INTEGER DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'PENDING',
    flagged_by TEXT DEFAULT NULL,
    flag_note TEXT DEFAULT '',
    locked_by TEXT DEFAULT NULL,
    locked_at REAL DEFAULT NULL,
    updated_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dev_cards_status ON dev_cards(status);
CREATE INDEX IF NOT EXISTS idx_dev_cards_game ON dev_cards(game);
CREATE INDEX IF NOT EXISTS idx_dev_cards_locked ON dev_cards(locked_by, locked_at);
"""


async def init_dev_db() -> None:
    global _db_initialized
    async with _init_lock:
        if _db_initialized:
            return
        parent = os.path.dirname(DEV_DB_PATH)
        if parent:
            os.makedirs(parent, exist_ok=True)
        async with aiosqlite.connect(DEV_DB_PATH, isolation_level=None) as db:
            await db.execute("PRAGMA journal_mode = WAL")
            await db.execute("PRAGMA synchronous = NORMAL")
            await db.execute("PRAGMA busy_timeout = 5000")
            await db.executescript(DEV_SCHEMA_SQL)
        _db_initialized = True


async def get_dev_db():
    await init_dev_db()
    async with aiosqlite.connect(DEV_DB_PATH, isolation_level=None) as db:
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA synchronous = NORMAL")
        await db.execute("PRAGMA busy_timeout = 5000")
        db.row_factory = aiosqlite.Row
        try:
            yield db
        except Exception:
            try:
                await db.execute("ROLLBACK")
            except Exception:
                pass
            raise


def _serialize_card(row: aiosqlite.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "game": row["game"],
        "mode": row["mode"] or "",
        "category": row["category"],
        "title": row["title"] or "",
        "content": row["content"],
        "extra": row["extra"] or "",
        "sips": int(row["sips"]) if row["sips"] is not None else 0,
        "loss_percent": float(row["loss_percent"]) if row["loss_percent"] is not None else 0.0,
        "min_players": int(row["min_players"]) if row["min_players"] is not None else 2,
        "status": row["status"],
        "flagged_by": row["flagged_by"],
        "flag_note": row["flag_note"] or "",
        "locked_by": row["locked_by"],
        "locked_at": row["locked_at"],
        "updated_at": row["updated_at"],
    }


async def _compute_stats(db: aiosqlite.Connection) -> dict[str, int]:
    async with db.execute(
        """
        SELECT
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_cnt,
            SUM(CASE WHEN status = 'REVIEW_LATER' THEN 1 ELSE 0 END) AS review_later_cnt,
            SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) AS validated_cnt,
            SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_cnt,
            COUNT(*) AS total_cnt
        FROM dev_cards
        """
    ) as cur:
        row = await cur.fetchone()

    return {
        "pending": int(row[0] or 0),
        "review_later": int(row[1] or 0),
        "validated": int(row[2] or 0),
        "rejected": int(row[3] or 0),
        "total": int(row[4] or 0),
    }


async def _broadcast_state(db: aiosqlite.Connection, actor: Optional[str], action: str) -> dict[str, int]:
    stats = await _compute_stats(db)
    await ws_manager.broadcast(
        {
            "type": "state_updated",
            "stats": stats,
            "actor": actor or "dev",
            "action": action,
            "active_devs": ws_manager.active_count,
            "timestamp": time.time(),
        }
    )
    return stats


# ---------------------------------------------------------------------------
# Helpers CSV & Chemins data/
# ---------------------------------------------------------------------------

def _resolve_data_file(filename: str) -> str:
    dev_dir = os.path.dirname(os.path.abspath(DEV_DB_PATH))
    prod_dir = os.path.dirname(os.path.abspath(DB_PATH))
    candidates = [
        os.path.join(dev_dir, filename),
        os.path.join(prod_dir, filename),
        os.path.abspath(os.path.join("data", filename)),
        os.path.abspath(os.path.join("..", "data", filename)),
        os.path.abspath(os.path.join("/app/data", filename)),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


def _parse_csv_rows(raw_csv: str) -> list[tuple[str, str, str, str, str, str, int, float, int]]:
    cleaned = raw_csv.strip()
    if cleaned.startswith("\ufeff"):
        cleaned = cleaned[1:]
    if not cleaned:
        return []

    reader = csv.DictReader(io.StringIO(cleaned))
    records: list[tuple[str, str, str, str, str, str, int, float, int]] = []
    for row in reader:
        game = (row.get("game") or "").strip()
        content = (row.get("content") or "").strip()
        if not game or not content:
            continue
        mode = (row.get("mode") or "").strip()
        category = (row.get("category") or "").strip() or "general"
        title = (row.get("title") or "").strip()
        extra = (row.get("extra") or "").strip()
        try:
            sips = max(0, int(float(row.get("sips") or 0)))
        except ValueError:
            sips = 0
        try:
            loss_percent = max(0.0, float(row.get("loss_percent") or 0.0))
        except ValueError:
            loss_percent = 0.0
        try:
            min_players = max(1, int(float(row.get("min_players") or 2)))
        except ValueError:
            min_players = 2
        records.append((game, mode, category, title, content, extra, sips, loss_percent, min_players))
    return records


def _serialize_csv_rows(rows: list[Any]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(CSV_COLUMNS)
    for r in rows:
        writer.writerow(
            [
                r["game"],
                r["mode"] or "",
                r["category"] or "",
                r["title"] or "",
                r["content"],
                r["extra"] or "",
                int(r["sips"]) if r["sips"] is not None else 0,
                float(r["loss_percent"]) if r["loss_percent"] is not None else 0.0,
                int(r["min_players"]) if r["min_players"] is not None else 2,
            ]
        )
    return buf.getvalue()


async def _insert_imported_records(
    db: aiosqlite.Connection,
    records: list[tuple[str, str, str, str, str, str, int, float, int]],
    strategy: Literal["replace", "append"],
) -> tuple[int, int]:
    now = time.time()
    imported = 0
    skipped = 0

    await db.execute("BEGIN IMMEDIATE")
    try:
        if strategy == "replace":
            await db.execute("DELETE FROM dev_cards")
            to_insert = records
        else:
            existing_keys: set[tuple[str, str, str]] = set()
            async with db.execute("SELECT game, mode, content FROM dev_cards") as cur:
                for row in await cur.fetchall():
                    existing_keys.add(((row[0] or "").strip(), (row[1] or "").strip(), (row[2] or "").strip()))

            to_insert = []
            for rec in records:
                key = (rec[0], rec[1], rec[4])
                if key in existing_keys:
                    skipped += 1
                    continue
                existing_keys.add(key)
                to_insert.append(rec)

        if to_insert:
            await db.executemany(
                """
                INSERT INTO dev_cards
                    (game, mode, category, title, content, extra, sips, loss_percent, min_players, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
                """,
                [(*rec, now) for rec in to_insert],
            )
            imported = len(to_insert)

        await db.execute("COMMIT")
    except Exception:
        await db.execute("ROLLBACK")
        raise

    return imported, skipped


def _run_prod_import_sync(csv_path: str, prod_db_path: str) -> None:
    """Appelle import_csv_to_db depuis data/import_content.py pour mettre à jour la prod."""
    import_script = _resolve_data_file("import_content.py")
    if os.path.exists(import_script):
        spec = importlib.util.spec_from_file_location("scout_import_content", import_script)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            if hasattr(mod, "import_csv_to_db"):
                mod.import_csv_to_db(csv_path, prod_db_path)
                return

    # Fallback sûr si import_content.py absent du runtime
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        records = _parse_csv_rows(f.read())
    conn = sqlite3.connect(prod_db_path)
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM cards")
        cur.executemany(
            """INSERT INTO cards (game, mode, category, title, content, extra, sips, loss_percent, min_players)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            records,
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 1. Authentification Dev
# ---------------------------------------------------------------------------

@router.post("/api/dev/auth")
async def dev_authenticate(payload: DevAuthPayload):
    """Vérifie le code d'accès développeur en temps constant."""
    if not _verify_dev_code(payload.code):
        raise HTTPException(status_code=403, detail="Code d'accès invalide.")
    return {"ok": True}


# ---------------------------------------------------------------------------
# 2. WebSocket temps réel (/ws/dev)
# ---------------------------------------------------------------------------

@router.websocket("/ws/dev")
async def dev_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
    session_id: str = Query(default="anonymous"),
    label: str = Query(default="Dev"),
):
    if not _verify_dev_code(token):
        await websocket.close(code=4003)
        return

    await init_dev_db()
    await ws_manager.connect(websocket, session_id=session_id, label=label)
    try:
        async with aiosqlite.connect(DEV_DB_PATH, isolation_level=None) as db:
            db.row_factory = aiosqlite.Row
            stats = await _compute_stats(db)

        await websocket.send_json(
            {
                "type": "connected",
                "stats": stats,
                "active_devs": ws_manager.active_count,
                "timestamp": time.time(),
            }
        )
        await ws_manager.broadcast(
            {
                "type": "presence",
                "active_devs": ws_manager.active_count,
                "actor": label,
            }
        )

        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type": "pong", "active_devs": ws_manager.active_count})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        await ws_manager.broadcast({"type": "presence", "active_devs": ws_manager.active_count})
    except Exception:
        ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# 3. Stats & Attribution Anti-Collision
# ---------------------------------------------------------------------------

@router.get("/api/dev/stats")
async def get_dev_stats(
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    stats = await _compute_stats(db)
    return {"stats": stats, "active_devs": ws_manager.active_count}


@router.post("/api/dev/cards/claim-next")
async def claim_next_card(
    payload: ClaimNextPayload,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    """
    Récupère et verrouille atomiquement la prochaine carte à traiter pour `session_id` :
    1. Libère les verrous expirés (> 180s).
    2. Libère les anciens verrous de cette session.
    3. En file `pending`, priorise les cartes `REVIEW_LATER` signalées par l'autre dev,
       puis les cartes `PENDING` non verrouillées.
    4. Pose `locked_by` et `locked_at`.
    """
    now = time.time()
    expiry_cutoff = now - LOCK_TTL_SECONDS

    filters_sql = []
    filter_params: list[Any] = []
    if payload.game and payload.game != "all":
        filters_sql.append("game = ?")
        filter_params.append(payload.game)
    if payload.mode and payload.mode != "all":
        filters_sql.append("mode = ?")
        filter_params.append(payload.mode)

    where_filter = (" AND " + " AND ".join(filters_sql)) if filters_sql else ""

    claimed_row = None
    await db.execute("BEGIN IMMEDIATE")
    try:
        # 1. Libérer les verrous expirés
        await db.execute(
            "UPDATE dev_cards SET locked_by = NULL, locked_at = NULL WHERE locked_at IS NOT NULL AND locked_at < ?",
            (expiry_cutoff,),
        )
        # 2. Libérer les éventuels verrous précédents de cette session
        await db.execute(
            "UPDATE dev_cards SET locked_by = NULL, locked_at = NULL WHERE locked_by = ?",
            (payload.session_id,),
        )

        async def _find_candidate(skip_current: bool) -> Optional[aiosqlite.Row]:
            skip_sql = " AND id != ?" if (skip_current and payload.skip_id) else ""
            skip_params = [payload.skip_id] if (skip_current and payload.skip_id) else []

            if payload.queue == "pending":
                # Priorité 1 : REVIEW_LATER envoyée par l'autre téléphone
                q_peer = f"""
                    SELECT * FROM dev_cards
                    WHERE status = 'REVIEW_LATER'
                      AND locked_by IS NULL
                      AND (flagged_by IS NULL OR flagged_by != ?)
                      {where_filter}
                      {skip_sql}
                    ORDER BY updated_at ASC, id ASC
                    LIMIT 1
                """
                async with db.execute(q_peer, [payload.session_id, *filter_params, *skip_params]) as cur:
                    row = await cur.fetchone()
                if row:
                    return row

                # Priorité 2 : prochaine carte PENDING libre
                q_pending = f"""
                    SELECT * FROM dev_cards
                    WHERE status = 'PENDING'
                      AND locked_by IS NULL
                      {where_filter}
                      {skip_sql}
                    ORDER BY id ASC
                    LIMIT 1
                """
                async with db.execute(q_pending, [*filter_params, *skip_params]) as cur:
                    return await cur.fetchone()
            else:
                # File dédiée 'review_later' : préfère d'abord celles de l'autre dev
                q_rl = f"""
                    SELECT * FROM dev_cards
                    WHERE status = 'REVIEW_LATER'
                      AND locked_by IS NULL
                      {where_filter}
                      {skip_sql}
                    ORDER BY CASE WHEN flagged_by IS NULL OR flagged_by != ? THEN 0 ELSE 1 END,
                             updated_at ASC, id ASC
                    LIMIT 1
                """
                async with db.execute(q_rl, [*filter_params, *skip_params, payload.session_id]) as cur:
                    return await cur.fetchone()

        candidate = await _find_candidate(skip_current=True)
        if not candidate and payload.skip_id:
            candidate = await _find_candidate(skip_current=False)

        if candidate:
            await db.execute(
                "UPDATE dev_cards SET locked_by = ?, locked_at = ? WHERE id = ?",
                (payload.session_id, now, candidate["id"]),
            )
            async with db.execute("SELECT * FROM dev_cards WHERE id = ?", (candidate["id"],)) as cur:
                claimed_row = await cur.fetchone()

        await db.execute("COMMIT")
    except Exception:
        await db.execute("ROLLBACK")
        raise

    stats = await _compute_stats(db)
    return {
        "card": _serialize_card(claimed_row) if claimed_row else None,
        "stats": stats,
        "active_devs": ws_manager.active_count,
    }


@router.post("/api/dev/cards/{card_id}/heartbeat")
async def card_heartbeat(
    card_id: int,
    payload: HeartbeatPayload,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    """Prolonge le verrou de lecture/édition tant que le dev reste sur la carte."""
    now = time.time()
    expiry_cutoff = now - LOCK_TTL_SECONDS

    await db.execute("BEGIN IMMEDIATE")
    try:
        async with db.execute("SELECT locked_by, locked_at FROM dev_cards WHERE id = ?", (card_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            await db.execute("ROLLBACK")
            raise HTTPException(status_code=404, detail="Carte introuvable.")

        locked_by, locked_at = row[0], row[1]
        if locked_by and locked_by != payload.session_id and locked_at and locked_at >= expiry_cutoff:
            await db.execute("ROLLBACK")
            raise HTTPException(status_code=409, detail="Carte actuellement verrouillée par un autre développeur.")

        await db.execute(
            "UPDATE dev_cards SET locked_by = ?, locked_at = ? WHERE id = ?",
            (payload.session_id, now, card_id),
        )
        await db.execute("COMMIT")
    except HTTPException:
        raise
    except Exception:
        await db.execute("ROLLBACK")
        raise

    return {"ok": True, "locked_until": now + LOCK_TTL_SECONDS}


# ---------------------------------------------------------------------------
# 4. Actions, Édition, Création & Liste
# ---------------------------------------------------------------------------

@router.post("/api/dev/cards/{card_id}/action")
async def perform_card_action(
    card_id: int,
    payload: CardActionPayload,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    now = time.time()
    await db.execute("BEGIN IMMEDIATE")
    try:
        async with db.execute("SELECT id FROM dev_cards WHERE id = ?", (card_id,)) as cur:
            if not await cur.fetchone():
                await db.execute("ROLLBACK")
                raise HTTPException(status_code=404, detail="Carte introuvable.")

        if payload.action == "validate":
            await db.execute(
                """
                UPDATE dev_cards
                SET status = 'VALIDATED', locked_by = NULL, locked_at = NULL,
                    flagged_by = NULL, flag_note = '', updated_at = ?
                WHERE id = ?
                """,
                (now, card_id),
            )
        elif payload.action == "review_later":
            await db.execute(
                """
                UPDATE dev_cards
                SET status = 'REVIEW_LATER', flagged_by = ?, flag_note = ?,
                    locked_by = NULL, locked_at = NULL, updated_at = ?
                WHERE id = ?
                """,
                (payload.session_id, (payload.note or "").strip(), now, card_id),
            )
        elif payload.action == "reject":
            await db.execute(
                """
                UPDATE dev_cards
                SET status = 'REJECTED', locked_by = NULL, locked_at = NULL, updated_at = ?
                WHERE id = ?
                """,
                (now, card_id),
            )
        elif payload.action == "restore":
            await db.execute(
                """
                UPDATE dev_cards
                SET status = 'PENDING', locked_by = NULL, locked_at = NULL,
                    flagged_by = NULL, flag_note = '', updated_at = ?
                WHERE id = ?
                """,
                (now, card_id),
            )

        async with db.execute("SELECT * FROM dev_cards WHERE id = ?", (card_id,)) as cur:
            updated_row = await cur.fetchone()
        await db.execute("COMMIT")
    except HTTPException:
        raise
    except Exception:
        await db.execute("ROLLBACK")
        raise

    stats = await _broadcast_state(db, actor=payload.actor, action=payload.action)
    return {"card": _serialize_card(updated_row), "stats": stats}


@router.put("/api/dev/cards/{card_id}")
async def update_dev_card(
    card_id: int,
    payload: DevCardUpsertPayload,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    now = time.time()
    await db.execute("BEGIN IMMEDIATE")
    try:
        async with db.execute("SELECT status FROM dev_cards WHERE id = ?", (card_id,)) as cur:
            existing = await cur.fetchone()
        if not existing:
            await db.execute("ROLLBACK")
            raise HTTPException(status_code=404, detail="Carte introuvable.")

        if payload.validate_card:
            await db.execute(
                """
                UPDATE dev_cards
                SET game = ?, mode = ?, category = ?, title = ?, content = ?, extra = ?,
                    sips = ?, loss_percent = ?, min_players = ?,
                    status = 'VALIDATED', locked_by = NULL, locked_at = NULL,
                    flagged_by = NULL, flag_note = '', updated_at = ?
                WHERE id = ?
                """,
                (
                    payload.game.strip(),
                    (payload.mode or "").strip(),
                    payload.category.strip(),
                    (payload.title or "").strip(),
                    payload.content.strip(),
                    (payload.extra or "").strip(),
                    payload.sips,
                    round(float(payload.loss_percent), 2),
                    payload.min_players,
                    now,
                    card_id,
                ),
            )
        else:
            await db.execute(
                """
                UPDATE dev_cards
                SET game = ?, mode = ?, category = ?, title = ?, content = ?, extra = ?,
                    sips = ?, loss_percent = ?, min_players = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    payload.game.strip(),
                    (payload.mode or "").strip(),
                    payload.category.strip(),
                    (payload.title or "").strip(),
                    payload.content.strip(),
                    (payload.extra or "").strip(),
                    payload.sips,
                    round(float(payload.loss_percent), 2),
                    payload.min_players,
                    now,
                    card_id,
                ),
            )

        async with db.execute("SELECT * FROM dev_cards WHERE id = ?", (card_id,)) as cur:
            updated_row = await cur.fetchone()
        await db.execute("COMMIT")
    except HTTPException:
        raise
    except Exception:
        await db.execute("ROLLBACK")
        raise

    action_name = "edit_and_validate" if payload.validate_card else "edit"
    stats = await _broadcast_state(db, actor=payload.actor, action=action_name)
    return {"card": _serialize_card(updated_row), "stats": stats}


@router.post("/api/dev/cards", status_code=201)
async def create_dev_card(
    payload: DevCardUpsertPayload,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    now = time.time()
    target_status = "VALIDATED" if (payload.validate_card or payload.status == "VALIDATED") else "PENDING"

    await db.execute("BEGIN IMMEDIATE")
    try:
        cursor = await db.execute(
            """
            INSERT INTO dev_cards
                (game, mode, category, title, content, extra, sips, loss_percent, min_players, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.game.strip(),
                (payload.mode or "").strip(),
                payload.category.strip(),
                (payload.title or "").strip(),
                payload.content.strip(),
                (payload.extra or "").strip(),
                payload.sips,
                round(float(payload.loss_percent), 2),
                payload.min_players,
                target_status,
                now,
            ),
        )
        new_id = cursor.lastrowid
        async with db.execute("SELECT * FROM dev_cards WHERE id = ?", (new_id,)) as cur:
            created_row = await cur.fetchone()
        await db.execute("COMMIT")
    except Exception:
        await db.execute("ROLLBACK")
        raise

    stats = await _broadcast_state(db, actor=payload.actor, action="create")
    return {"card": _serialize_card(created_row), "stats": stats}


@router.get("/api/dev/cards")
async def list_dev_cards(
    game: Optional[str] = Query(default=None),
    mode: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    conditions = []
    params: list[Any] = []

    if game and game != "all":
        conditions.append("game = ?")
        params.append(game)
    if mode and mode != "all":
        conditions.append("mode = ?")
        params.append(mode)
    if status and status in VALID_STATUSES:
        conditions.append("status = ?")
        params.append(status)
    if search and search.strip():
        like = f"%{search.strip()}%"
        conditions.append("(title LIKE ? OR content LIKE ? OR extra LIKE ? OR category LIKE ?)")
        params.extend([like, like, like, like])

    where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    query = f"SELECT * FROM dev_cards{where_clause} ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?"
    async with db.execute(query, [*params, limit, offset]) as cur:
        rows = await cur.fetchall()

    stats = await _compute_stats(db)
    return {
        "cards": [_serialize_card(r) for r in rows],
        "stats": stats,
        "active_devs": ws_manager.active_count,
    }


# ---------------------------------------------------------------------------
# 5. Synchronisation Bidirectionnelle Prod <-> Dev & CSV
# ---------------------------------------------------------------------------

@router.post("/api/dev/sync/from-prod")
async def sync_from_prod(
    payload: SyncFromProdPayload,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    csv_path = _resolve_data_file("content.csv")
    records: list[tuple[str, str, str, str, str, str, int, float, int]] = []

    if os.path.exists(csv_path):
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            records = _parse_csv_rows(f.read())
    elif os.path.exists(DB_PATH):
        async with aiosqlite.connect(DB_PATH) as prod_db:
            async with prod_db.execute(
                "SELECT game, mode, category, title, content, extra, sips, loss_percent, min_players FROM cards ORDER BY game ASC, id ASC"
            ) as cur:
                rows = await cur.fetchall()
            records = [
                (
                    (r[0] or "").strip(),
                    (r[1] or "").strip(),
                    (r[2] or "").strip(),
                    (r[3] or "").strip(),
                    (r[4] or "").strip(),
                    (r[5] or "").strip(),
                    int(r[6] or 0),
                    float(r[7] or 0.0),
                    int(r[8] or 2),
                )
                for r in rows
                if r[0] and r[4]
            ]
    else:
        raise HTTPException(status_code=404, detail="Aucune source de production trouvée (content.csv ou scoutgame.db).")

    if not records:
        raise HTTPException(status_code=400, detail="Le catalogue de production est vide.")

    imported, skipped = await _insert_imported_records(db, records, strategy=payload.strategy)
    stats = await _broadcast_state(db, actor=payload.actor, action="sync_from_prod")
    return {"imported": imported, "skipped": skipped, "strategy": payload.strategy, "stats": stats}


@router.post("/api/dev/sync/upload-csv")
async def upload_csv_to_dev(
    request: Request,
    strategy: Literal["replace", "append"] = Query(default="append"),
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    """Importe un lot CSV (multipart file ou JSON csv_content ou texte brut) dans dev_cards.db."""
    content_type = (request.headers.get("content-type") or "").lower()
    raw_csv = ""
    effective_strategy: Literal["replace", "append"] = strategy
    actor: Optional[str] = None

    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Impossible de lire le formulaire multipart : {exc}")
        strat_val = form.get("strategy")
        if strat_val in ("replace", "append"):
            effective_strategy = strat_val  # type: ignore[assignment]
        actor_val = form.get("actor")
        if isinstance(actor_val, str):
            actor = actor_val
        file_obj = form.get("file")
        text_obj = form.get("csv_content")
        if hasattr(file_obj, "read"):
            raw_bytes = await file_obj.read()  # type: ignore[union-attr]
            raw_csv = raw_bytes.decode("utf-8-sig", errors="replace")
        elif isinstance(text_obj, str):
            raw_csv = text_obj
    elif "application/json" in content_type:
        body = await request.json()
        raw_csv = str(body.get("csv_content") or "")
        if body.get("strategy") in ("replace", "append"):
            effective_strategy = body["strategy"]
        actor = body.get("actor")
    else:
        raw_bytes = await request.body()
        raw_csv = raw_bytes.decode("utf-8-sig", errors="replace")

    records = _parse_csv_rows(raw_csv)
    if not records:
        raise HTTPException(
            status_code=400,
            detail="Aucune carte valide trouvée dans le CSV (colonnes requises : game, category, content...).",
        )

    imported, skipped = await _insert_imported_records(db, records, strategy=effective_strategy)
    stats = await _broadcast_state(db, actor=actor, action="upload_csv")
    return {"imported": imported, "skipped": skipped, "strategy": effective_strategy, "stats": stats}


@router.get("/api/dev/sync/export-csv")
async def export_validated_csv(
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    """Exporte uniquement les cartes VALIDATED au format CSV strict à 9 colonnes."""
    async with db.execute(
        "SELECT * FROM dev_cards WHERE status = 'VALIDATED' ORDER BY game ASC, mode ASC, category ASC, id ASC"
    ) as cur:
        rows = await cur.fetchall()

    csv_text = _serialize_csv_rows(rows)
    return Response(
        content=csv_text.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="content_validated.csv"'},
    )


@router.post("/api/dev/sync/push-to-prod")
async def push_validated_to_prod(
    request: Request,
    _: None = Depends(_require_dev),
    db: aiosqlite.Connection = Depends(get_dev_db),
):
    """
    Synchronise toutes les cartes VALIDATED vers la production :
    1. Vérifie >= 1 carte VALIDATED.
    2. Sauvegarde ./data/content.csv.bak.
    3. Écrit ./data/content.csv au format UTF-8 exact (9 colonnes).
    4. Appelle import_csv_to_db de data/import_content.py vers ./data/scoutgame.db.
    """
    actor: Optional[str] = None
    try:
        if "application/json" in (request.headers.get("content-type") or "").lower():
            body = await request.json()
            actor = body.get("actor")
    except Exception:
        pass

    async with db.execute(
        "SELECT * FROM dev_cards WHERE status = 'VALIDATED' ORDER BY game ASC, mode ASC, category ASC, id ASC"
    ) as cur:
        rows = await cur.fetchall()

    if not rows:
        raise HTTPException(status_code=400, detail="Impossible de publier : aucune carte n'est validée.")

    csv_path = _resolve_data_file("content.csv")
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    backup_path = f"{csv_path}.bak"

    if os.path.exists(csv_path):
        shutil.copy2(csv_path, backup_path)

    csv_text = _serialize_csv_rows(rows)
    fd, tmp_path = tempfile.mkstemp(prefix=".content_tmp_", suffix=".csv", dir=os.path.dirname(csv_path))
    try:
        with os.fdopen(fd, mode="w", encoding="utf-8", newline="") as f:
            f.write(csv_text)
        os.replace(tmp_path, csv_path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise

    await asyncio.to_thread(_run_prod_import_sync, csv_path, DB_PATH)
    stats = await _broadcast_state(db, actor=actor, action="push_to_prod")
    return {
        "pushed_count": len(rows),
        "csv_path": csv_path,
        "backup_path": backup_path if os.path.exists(backup_path) else None,
        "stats": stats,
    }

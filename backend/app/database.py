"""
app/database.py
Initialise la base de données SQLite avec les 7 tables applicatives + la table cards.
Active PRAGMA foreign_keys = ON à chaque connexion.
"""
import aiosqlite
from app.config import DB_PATH

# DDL complet (section 4 de la spec + table cards de la section 6.2)
SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

-- 1. Campagnes d'amorçage initiales (AG, comités de responsables)
CREATE TABLE IF NOT EXISTS bootstrap_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Nœuds de l'arbre généalogique des appareils autorisés
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    parent_device_id TEXT,
    bootstrap_campaign_id TEXT,
    is_revoked BOOLEAN DEFAULT 0,
    revoked_at DATETIME,
    revocation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME,
    FOREIGN KEY(parent_device_id) REFERENCES devices(id),
    FOREIGN KEY(bootstrap_campaign_id) REFERENCES bootstrap_campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_devices_parent ON devices(parent_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_revoked ON devices(is_revoked);

-- 3. Jetons d'invitations éphémères (validité 120 secondes, usage unique)
CREATE TABLE IF NOT EXISTS ephemeral_invites (
    token_hash TEXT PRIMARY KEY,
    creator_device_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_consumed BOOLEAN DEFAULT 0,
    consumed_by_device_id TEXT,
    FOREIGN KEY(creator_device_id) REFERENCES devices(id),
    FOREIGN KEY(consumed_by_device_id) REFERENCES devices(id)
);

-- 4. Demandes de révocation soumises par le terrain
CREATE TABLE IF NOT EXISTS revocation_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_device_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    reporter_name TEXT,
    reporter_group TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY(target_device_id) REFERENCES devices(id)
);

-- 5. Configuration dynamique du système (blackout camps, urgence)
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Retours utilisateurs, propositions et signalements juridiques
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    target_game TEXT,
    category TEXT,
    title TEXT,
    content TEXT NOT NULL,
    extra_data TEXT,
    author_alias TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Métriques anonymisées d'activité
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    game_id TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Catalogue universel de cartes (section 6.2)
CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game TEXT NOT NULL,
    mode TEXT,
    category TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    extra TEXT,
    sips INTEGER DEFAULT 0,
    loss_percent REAL DEFAULT 0.0,
    min_players INTEGER DEFAULT 2
);
"""


async def init_db() -> None:
    """Crée toutes les tables au démarrage de l'application."""
    import os
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        # Robustesse SQLite : WAL + busy_timeout + timezone UTC
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA busy_timeout = 5000")
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(SCHEMA_SQL)

        # Migrations légères pour colonnes récentes
        try:
            await db.execute("ALTER TABLE cards ADD COLUMN mode TEXT")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE cards ADD COLUMN loss_percent REAL DEFAULT 0.0")
        except Exception:
            pass

        await db.commit()


async def get_db():
    # isolation_level=None active l'autocommit natif pour permettre les transactions manuelles explicites
    async with aiosqlite.connect(DB_PATH, isolation_level=None) as db:
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA busy_timeout = 5000")
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute("PRAGMA synchronous = NORMAL")
        db.row_factory = aiosqlite.Row
        try:
            yield db
        except Exception:
            try:
                await db.execute("ROLLBACK")
            except Exception:
                pass
            raise


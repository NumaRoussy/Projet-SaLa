"""
app/config.py
Centralise la lecture des variables d'environnement via python-dotenv.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Clé d'administration (header X-Admin-Key)
ADMIN_KEY: str = os.getenv("ADMIN_KEY", "")
if not ADMIN_KEY or ADMIN_KEY == "changeme_admin_key":
    # En production ou hors test explicite, refuser de démarrer avec un secret vulnérable
    if os.getenv("APP_ENV", "production") != "test":
        raise RuntimeError("ERREUR CRITIQUE : La variable ADMIN_KEY doit être définie avec un secret robuste.")

# Code d'accès outil Dev Cards (dev.scoutgame.ch) — fallback sur ADMIN_KEY si absent
DEV_ACCESS_CODE: str = os.getenv("DEV_ACCESS_CODE") or ADMIN_KEY

# Configuration SMTP
SMTP_HOST: str = os.getenv("SMTP_HOST", "mail.infomaniak.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "info@scoutgame.ch")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")

# Chemin vers la base de données SQLite
DB_PATH: str = os.getenv("DB_PATH", "./data/scoutgame.db")
DEV_DB_PATH: str = os.getenv(
    "DEV_DB_PATH",
    os.path.join(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else "./data", "dev_cards.db"),
)

# Emails de destination des formulaires (tous centralisés sur info@scoutgame.ch)
EMAIL_PROPOSITIONS: str = os.getenv("EMAIL_RECIPIENT", "info@scoutgame.ch")
EMAIL_CONTACT_LEGAL: str = os.getenv("EMAIL_RECIPIENT", "info@scoutgame.ch")

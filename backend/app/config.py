"""
app/config.py
Centralise la lecture des variables d'environnement via python-dotenv.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Clé d'administration (header X-Admin-Key)
ADMIN_KEY: str = os.getenv("ADMIN_KEY", "changeme_admin_key")

# Configuration SMTP
SMTP_HOST: str = os.getenv("SMTP_HOST", "mail.infomaniak.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "info@scoutgame.ch")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")

# Chemin vers la base de données SQLite
DB_PATH: str = os.getenv("DB_PATH", "./data/scoutgame.db")

# Emails de destination des formulaires
EMAIL_PROPOSITIONS: str = "proposition@scoutgame.ch"
EMAIL_CONTACT_LEGAL: str = "info@scoutgame.ch"

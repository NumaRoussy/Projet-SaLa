"""
app/services/mailer.py
Relais email SMTP asynchrone vers proposition@scoutgame.ch et info@scoutgame.ch (section 5.4).
L'envoi est délégué à un executor pour ne pas bloquer la boucle asyncio.
"""
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS


def _send_sync(to_email: str, subject: str, content: str, reply_to: str | None) -> bool:
    """Envoi synchrone (exécuté dans un thread séparé)."""
    try:
        msg = MIMEMultipart()
        msg["From"] = f"Scout Game Bot <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        if reply_to:
            msg["Reply-To"] = reply_to

        msg.attach(MIMEText(content, "plain", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[MAIL ERROR] Échec d'envoi du message : {e}")
        return False


async def send_relay_email(
    to_email: str,
    subject: str,
    content: str,
    reply_to: str | None = None,
) -> bool:
    """
    Envoi asynchrone délégué au thread executor pour éviter le blocage de la boucle.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _send_sync, to_email, subject, content, reply_to)

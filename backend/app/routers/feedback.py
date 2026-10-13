"""
app/routers/feedback.py
Enregistre les retours utilisateurs dans user_feedback et envoie un email
de relais via mailer.py vers proposition@scoutgame.ch ou info@scoutgame.ch.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
import aiosqlite
from app.database import get_db
from app.models import FeedbackCreate
from app.services.mailer import send_relay_email
from app.config import EMAIL_PROPOSITIONS, EMAIL_CONTACT_LEGAL

router = APIRouter(prefix="/api", tags=["feedback"])


def _build_email_content(payload: FeedbackCreate) -> tuple[str, str, str]:
    """Retourne (to_email, subject, body) selon le type de feedback."""
    if payload.type == "PROPOSITION":
        to_email = EMAIL_PROPOSITIONS
        subject = f"[Scout Game] Proposition – {payload.title or payload.target_game or 'sans titre'}"
        body = (
            f"Type      : {payload.type}\n"
            f"Jeu cible : {payload.target_game or '—'}\n"
            f"Catégorie : {payload.category or '—'}\n"
            f"Titre     : {payload.title or '—'}\n"
            f"Alias     : {payload.author_alias or 'Anonyme'}\n"
            f"\n--- Message ---\n{payload.content}\n"
            f"\n--- Extra ---\n{payload.extra_data or '—'}"
        )
    else:  # CONTACT_LEGAL
        to_email = EMAIL_CONTACT_LEGAL
        subject = "[Scout Game] Demande légale / Contact"
        body = (
            f"Type      : {payload.type}\n"
            f"Contact   : {payload.contact_email or 'non renseigné'}\n"
            f"Alias     : {payload.author_alias or 'Anonyme'}\n"
            f"\n--- Message ---\n{payload.content}\n"
            f"\n--- Extra ---\n{payload.extra_data or '—'}"
        )
    return to_email, subject, body


@router.post("/feedback", status_code=201)
async def submit_feedback(
    payload: FeedbackCreate,
    background_tasks: BackgroundTasks,
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Enregistre un feedback en base et envoie un email de relais en arrière-plan.
    PROPOSITION  → proposition@scoutgame.ch
    CONTACT_LEGAL → info@scoutgame.ch
    """
    await db.execute(
        """INSERT INTO user_feedback
               (type, target_game, category, title, content, extra_data, author_alias, contact_email)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            payload.type,
            payload.target_game,
            payload.category,
            payload.title,
            payload.content,
            payload.extra_data,
            payload.author_alias,
            payload.contact_email,
        ),
    )
    await db.commit()

    to_email, subject, body = _build_email_content(payload)
    reply_to = payload.contact_email or None
    background_tasks.add_task(send_relay_email, to_email, subject, body, reply_to)

    return {"status": "received", "message": "Merci pour votre retour !"}

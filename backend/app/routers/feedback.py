"""
app/routers/feedback.py
Enregistre les retours utilisateurs dans user_feedback et envoie un email
de relais via mailer.py vers info@scoutgame.ch.
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
    extra_val = payload.extra if payload.extra is not None else payload.extra_data
    if payload.type in ("PROPOSITION", "SUGGESTION"):
        to_email = EMAIL_PROPOSITIONS
        kind_label = "Suggestion" if payload.type == "SUGGESTION" else "Proposition"
        subject = f"[Scout Game] {kind_label} – {payload.title or payload.target_game or 'sans titre'}"
        body = (
            f"Type      : {payload.type}\n"
            f"Jeu cible : {payload.target_game or '—'}\n"
            f"Mode      : {payload.mode or '—'}\n"
            f"Catégorie : {payload.category or '—'}\n"
            f"Titre     : {payload.title or '—'}\n"
            f"Gorgées   : {payload.sips if payload.sips is not None else '—'}\n"
            f"Perte J+S : {payload.loss_percent if payload.loss_percent is not None else '—'}%\n"
            f"Min. J    : {payload.min_players if payload.min_players is not None else '—'}\n"
            f"Alias     : {payload.author_alias or 'Anonyme'}\n"
            f"\n--- Message ---\n{payload.content}\n"
            f"\n--- Extra ---\n{extra_val or '—'}"
        )
    else:  # CONTACT_LEGAL
        to_email = EMAIL_CONTACT_LEGAL
        subject = "[Scout Game] Demande légale / Contact"
        body = (
            f"Type      : {payload.type}\n"
            f"Contact   : {payload.contact_email or 'non renseigné'}\n"
            f"Alias     : {payload.author_alias or 'Anonyme'}\n"
            f"\n--- Message ---\n{payload.content}\n"
            f"\n--- Extra ---\n{extra_val or '—'}"
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
    PROPOSITION / SUGGESTION → proposition@scoutgame.ch
    CONTACT_LEGAL            → info@scoutgame.ch
    """
    extra_val = payload.extra if payload.extra is not None else payload.extra_data
    sips_val = payload.sips if payload.sips is not None else 0
    loss_val = float(payload.loss_percent) if payload.loss_percent is not None else 0.0
    min_players_val = payload.min_players if payload.min_players is not None else 2

    await db.execute(
        """INSERT INTO user_feedback
               (type, target_game, mode, category, title, content, extra_data, extra,
                sips, loss_percent, min_players, author_alias, contact_email)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            payload.type,
            payload.target_game,
            payload.mode,
            payload.category,
            payload.title,
            payload.content,
            extra_val,
            extra_val,
            sips_val,
            loss_val,
            min_players_val,
            payload.author_alias,
            payload.contact_email,
        ),
    )
    await db.commit()

    to_email, subject, body = _build_email_content(payload)
    reply_to = payload.contact_email or None
    background_tasks.add_task(send_relay_email, to_email, subject, body, reply_to)

    return {"status": "received", "message": "Merci pour votre retour !"}

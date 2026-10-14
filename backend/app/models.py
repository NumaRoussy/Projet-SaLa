"""
app/models.py
Schémas Pydantic v2 pour la validation des requêtes et réponses de l'API.
"""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth / Devices
# ---------------------------------------------------------------------------

class BootstrapPayload(BaseModel):
    bootstrap_token: str


class InviteConsumePayload(BaseModel):
    invite_token: str


class VerifyPayload(BaseModel):
    device_pass: str


# ---------------------------------------------------------------------------
# Revocation Reports (section 2.3)
# ---------------------------------------------------------------------------

class RevocationReportCreate(BaseModel):
    target_device_id: str
    reason: str = Field(..., min_length=5)
    reporter_name: Optional[str] = None
    reporter_group: Optional[str] = None


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class PruneBranchPayload(BaseModel):
    target_device_id: str
    reason: str = Field(..., min_length=3)


class ValidateReportPayload(BaseModel):
    report_id: int
    action: str = Field(..., pattern="^(APPROVED|REJECTED)$")


class BootstrapCampaignCreate(BaseModel):
    id: str
    name: str
    token: str  # token en clair — le backend calcule le hash
    expires_at: Optional[str] = None


class BlackoutPayload(BaseModel):
    active: bool


class BlackoutDatesPayload(BaseModel):
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD


class ImportCsvPayload(BaseModel):
    csv_content: Optional[str] = None


class BlackoutMessagePayload(BaseModel):
    message: Optional[str] = None


class CardCreatePayload(BaseModel):
    game: str
    category: str
    title: Optional[str] = None
    content: str
    extra: Optional[str] = None
    sips: int = 0
    min_players: int = 2


class FeedbackStatusPayload(BaseModel):
    action: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    target_game: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    extra: Optional[str] = None
    sips: Optional[int] = None
    min_players: Optional[int] = None


# ---------------------------------------------------------------------------
# User Feedback (section 6 + mailer)
# ---------------------------------------------------------------------------

class FeedbackCreate(BaseModel):
    type: str = Field(..., pattern="^(PROPOSITION|CONTACT_LEGAL)$")
    target_game: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    content: str = Field(..., min_length=10)
    extra_data: Optional[str] = None
    author_alias: Optional[str] = None
    contact_email: Optional[str] = None


# ---------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------

class TelemetryEvent(BaseModel):
    device_id: Optional[str] = None
    game_id: str
    duration_seconds: int = 0


# ---------------------------------------------------------------------------
# Cards
# ---------------------------------------------------------------------------

class CardOut(BaseModel):
    id: int
    game: str
    category: str
    title: Optional[str]
    content: str
    extra: Optional[str]
    sips: int
    min_players: int

    model_config = {"from_attributes": True}

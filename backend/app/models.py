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
    target_device_id: str = Field(..., max_length=200)
    reason: str = Field(..., min_length=5, max_length=2000)
    reporter_name: Optional[str] = Field(default=None, max_length=200)
    reporter_group: Optional[str] = Field(default=None, max_length=200)


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
    target_game: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = Field(default=None, max_length=100)
    title: Optional[str] = Field(default=None, max_length=500)
    content: str = Field(..., min_length=10, max_length=5000)
    extra_data: Optional[str] = Field(default=None, max_length=2000)
    author_alias: Optional[str] = Field(default=None, max_length=200)
    contact_email: Optional[str] = Field(default=None, max_length=320)


# ---------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------

class TelemetryEvent(BaseModel):
    device_id: Optional[str] = Field(default=None, max_length=200)
    game_id: str = Field(..., max_length=100)
    duration_seconds: int = Field(default=0, ge=0, le=86400)  # max 24h


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

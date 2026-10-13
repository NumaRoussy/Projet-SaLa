"""
app/main.py
Point d'entrée FastAPI du backend Scout Game.

Fonctionnalités :
- Initialise la base de données (toutes les tables) au démarrage
- Configure le middleware CORS (*.scoutgame.ch + localhost)
- Supprime les en-têtes serveurs indiscrets (Server, X-Powered-By)
- Assemble tous les routeurs
- Expose GET /api/cards/{game_id} — récupération des cartes d'un jeu
- Expose POST /api/telemetry     — enregistrement d'un événement télémétrique
"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiosqlite

from app.database import get_db, init_db
from app.models import CardOut, TelemetryEvent
from app.routers import auth, reports, feedback, admin


# ---------------------------------------------------------------------------
# Lifecycle : initialisation de la base au démarrage
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Scout Game API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    # Supprime la bannière FastAPI/Starlette dans les réponses OpenAPI
    openapi_tags=[
        {"name": "auth", "description": "Authentification P2P et gestion des accès"},
        {"name": "reports", "description": "Signalements terrain"},
        {"name": "feedback", "description": "Retours et propositions"},
        {"name": "admin", "description": "Administration (protégé X-Admin-Key)"},
        {"name": "cards", "description": "Catalogue de cartes"},
        {"name": "telemetry", "description": "Métriques anonymisées"},
    ],
)

# ---------------------------------------------------------------------------
# CORS — autorise *.scoutgame.ch et origines localhost de développement
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = [
    "https://scoutgame.ch",
    "https://www.scoutgame.ch",
    "https://carnotzet.scoutgame.ch",
    "https://debout.scoutgame.ch",
    "https://debrief.scoutgame.ch",
    "https://infiltre.scoutgame.ch",
    "https://rondedenuit.scoutgame.ch",
    "https://chrono.scoutgame.ch",
    "https://api.scoutgame.ch",
    # Développement local
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Middleware : suppression des en-têtes indiscrets
# ---------------------------------------------------------------------------

@app.middleware("http")
async def remove_server_headers(request, call_next):
    response = await call_next(request)
    for h in ("server", "x-powered-by"):
        if h in response.headers:
            del response.headers[h]
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(feedback.router)
app.include_router(admin.router)


# ---------------------------------------------------------------------------
# Route : catalogue de cartes par jeu
# ---------------------------------------------------------------------------

@app.get("/api/cards/{game_id}", tags=["cards"], response_model=list[CardOut])
async def get_cards(
    game_id: str,
    category: Optional[str] = Query(default=None, description="Filtrer par catégorie"),
    min_players: Optional[int] = Query(default=None, description="Filtrer par nombre minimum de joueurs"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Retourne les cartes du jeu `game_id`.
    Filtres optionnels : category, min_players.
    """
    base_query = "SELECT id, game, category, title, content, extra, sips, min_players FROM cards WHERE game = ?"
    params: list = [game_id]

    if category:
        base_query += " AND category = ?"
        params.append(category)
    if min_players is not None:
        base_query += " AND min_players <= ?"
        params.append(min_players)

    base_query += " ORDER BY id"

    async with db.execute(base_query, params) as cursor:
        rows = await cursor.fetchall()

    return [
        CardOut(
            id=r[0],
            game=r[1],
            category=r[2],
            title=r[3],
            content=r[4],
            extra=r[5],
            sips=r[6],
            min_players=r[7],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Route : enregistrement télémétrique anonymisé
# ---------------------------------------------------------------------------

@app.post("/api/telemetry", status_code=204, tags=["telemetry"])
async def record_telemetry(
    payload: TelemetryEvent,
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Enregistre un événement d'activité anonymisé (game_id, durée, device_id optionnel).
    Retourne 204 No Content.
    """
    await db.execute(
        "INSERT INTO telemetry_events (device_id, game_id, duration_seconds) VALUES (?, ?, ?)",
        (payload.device_id, payload.game_id, payload.duration_seconds),
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Healthcheck
# ---------------------------------------------------------------------------

@app.get("/health", tags=["infra"])
async def health():
    return {"status": "ok"}

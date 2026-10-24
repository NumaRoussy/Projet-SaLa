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
# CORS — autorise *.scoutgame.ch et origines locales de développement
# (localhost, 127.0.0.1, 192.168.*, 10.*, 172.*) sur n'importe quel port
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = [
    "https://scoutgame.ch",
    "https://www.scoutgame.ch",
    "https://carnotzet.scoutgame.ch",
    "https://debout.scoutgame.ch",
    "https://debrief.scoutgame.ch",
    "https://infiltre.scoutgame.ch",
    "https://couvrefeu.scoutgame.ch",
    "https://rondedenuit.scoutgame.ch",
    "https://chrono.scoutgame.ch",
    "https://api.scoutgame.ch",
]

CORS_ORIGIN_REGEX = (
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9.-]+)(:\d+)?$"
    r"|^https://([a-zA-Z0-9-]+\.)*scoutgame\.ch$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
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
# Middleware : rate-limiting léger pour les endpoints publics
# ---------------------------------------------------------------------------

from collections import defaultdict
import time as _time

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 30  # requêtes
_RATE_WINDOW = 60  # secondes

@app.middleware("http")
async def rate_limit_public_endpoints(request, call_next):
    """Limite les requêtes publiques (hors admin, docs, health) à 30/min par IP."""
    # Ne JAMAIS bloquer ni compter les prévols CORS OPTIONS (Firefox / Chrome)
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    # Ne pas limiter les routes admin (déjà protégées par X-Admin-Key),
    # ni la doc OpenAPI ni le healthcheck
    if path.startswith("/api/admin") or path.startswith("/docs") or path.startswith("/redoc") or path == "/health" or path == "/openapi.json":
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = _time.time()
    window_start = now - _RATE_WINDOW

    # Purger les anciennes entrées
    _rate_limit_store[client_ip] = [t for t in _rate_limit_store[client_ip] if t > window_start]

    if len(_rate_limit_store[client_ip]) >= _RATE_LIMIT:
        headers = {}
        origin = request.headers.get("origin")
        if origin:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(
            status_code=429,
            content={"detail": "Trop de requêtes. Réessayez dans quelques secondes."},
            headers=headers,
        )

    _rate_limit_store[client_ip].append(now)
    return await call_next(request)


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

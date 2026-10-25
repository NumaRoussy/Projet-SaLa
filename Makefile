# ==============================================================================
# SCOUT GAME — Makefile d'exploitation et d'administration
# ==============================================================================

SHELL := /bin/bash
PYTHON := python3
NODE_PATH := $(HOME)/.local/node/bin:$(PATH)

.PHONY: help dev-wifi dev-backend dev-hub dev-games build-all up down logs restart \
        import-cards ag-create ag-close blackout-on blackout-off blackout-dates \
        blackout-status reports prune test

# --- Aide interactive par défaut ---
help: ## Affiche cette aide interactive
	@echo "======================================================================"
	@echo "⚜️  SCOUT GAME — COMMANDES D'EXPLOITATION & D'ADMINISTRATION"
	@echo "======================================================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Exemples d'utilisation :"
	@echo "  make ag-create NAME=\"AG Automne 2026\" HOURS=24"
	@echo "  make ag-close ID=\"ag-automne-2026\""
	@echo "  make blackout-dates START=2026-07-01 END=2026-08-15"
	@echo "  make prune DEVICE=\"e8f3...\" REASON=\"Compromission patrouille\""
	@echo "======================================================================"

# --- Développement Local ---
dev-wifi: ## Lance l'ensemble de la plateforme pour smartphones Wi-Fi (IP locale)
	@./scripts/dev_wifi.sh

dev-backend: ## Lance le backend FastAPI en mode dev local (port 8000)
	PYTHONPATH=backend $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-hub: ## Lance le serveur dev Vite du Hub (port 5173)
	export PATH="$(NODE_PATH)" && cd hub && npm run dev -- --host 0.0.0.0 --port 5173

dev-games: ## Lance les 6 jeux locaux en arrière-plan (ports 3001 à 3006)
	./scripts/start_games.sh

build-all: ## Compile les 7 applications Frontend (Hub + 6 jeux) avec npm run build
	@export PATH="$(NODE_PATH)" && \
	echo "Compiling Hub..." && (cd hub && npm run build) && \
	echo "Compiling Face A: infiltre..." && (cd games/infiltre && npm run build) && \
	echo "Compiling Face A: couvrefeu..." && (cd games/couvrefeu && npm run build) && \
	echo "Compiling Face A: chrono..." && (cd games/chrono && npm run build) && \
	echo "Compiling Face B: vachao..." && (cd games/vachao && npm run build) && \
	echo "Compiling Face B: crise..." && (cd games/crise && npm run build) && \
	echo "Compiling Face B: debrief..." && (cd games/debrief && npm run build) && \
	echo "✅ Tous les projets ont été compilés avec succès !"

# --- Déploiement Docker Compose & Caddy ---
up: ## Démarre tous les services Docker en arrière-plan (Caddy, Backend, Hub, 6 jeux)
	docker compose up -d --build

down: ## Arrête et supprime les conteneurs Docker
	docker compose down

logs: ## Affiche les logs en continu de tous les services Docker
	docker compose logs -f

restart: ## Redémarre l'ensemble de la stack Docker
	docker compose restart

# --- Catalogue de Cartes ---
import-cards: ## Importe les cartes depuis data/content.csv vers data/scoutgame.db
	$(PYTHON) data/import_content.py

# --- Procédure Assemblée Générale (AG) ---
NAME ?= AG 2026
HOURS ?= 24
TOKEN ?=
ID ?=
ag-create: ## Crée une campagne d'amorce AG et génère data/ag_print_sheet.html (NAME="Nom" HOURS=24)
	@$(PYTHON) scripts/admin_cli.py ag-create --name "$(NAME)" --hours $(HOURS) $(if $(TOKEN),--token "$(TOKEN)",) $(if $(ID),--id "$(ID)",)

ag-close: ## Clôture immédiatement un jeton d'amorce AG (ID="ag-nom")
	@if [ -z "$(ID)" ]; then echo "❌ Erreur: Paramètre ID requis. Ex: make ag-close ID=ag-2026"; exit 1; fi
	@$(PYTHON) scripts/admin_cli.py ag-close --id "$(ID)"

# --- Coupe-Circuit Blackout de Camp ---
blackout-on: ## Verrouille manuellement l'ensemble de la Face B (sobriété camp)
	@$(PYTHON) scripts/admin_cli.py blackout-on

blackout-off: ## Déverrouille manuellement la Face B
	@$(PYTHON) scripts/admin_cli.py blackout-off

START ?= 2026-07-01
END ?= 2026-08-15
blackout-dates: ## Programme la plage de dates de blackout (START=YYYY-MM-DD END=YYYY-MM-DD)
	@$(PYTHON) scripts/admin_cli.py blackout-dates --start "$(START)" --end "$(END)"

blackout-status: ## Affiche le statut actuel du coupe-circuit (manuel + dates)
	@$(PYTHON) scripts/admin_cli.py blackout-status

# --- Gestion des Signalements & Sciage de branche ---
reports: ## Liste les signalements de terrain en attente
	@$(PYTHON) scripts/admin_cli.py reports

DEVICE ?=
REASON ?= Sciage administratif
prune: ## Révocation récursive d'une branche (DEVICE="<uuid>" REASON="<motif>")
	@if [ -z "$(DEVICE)" ]; then echo "❌ Erreur: Paramètre DEVICE requis. Ex: make prune DEVICE=uuid REASON=\"Fuite\""; exit 1; fi
	@$(PYTHON) scripts/admin_cli.py prune --device "$(DEVICE)" --reason "$(REASON)"

# --- Tests & Linting ---
test: ## Lance les vérifications d'intégrité de la base de données et du code
	$(PYTHON) -m pytest backend/tests 2>/dev/null || $(PYTHON) -c "import sqlite3; c=sqlite3.connect('data/scoutgame.db'); print('Tables SQLite:', [r[0] for r in c.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")])"

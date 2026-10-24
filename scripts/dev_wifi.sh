#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node/bin:$PATH"

# Détection automatique de l'IP Wi-Fi / réseau local
IP=$(hostname -I | awk '{print $1}')
if [ -z "$IP" ]; then
  IP="127.0.0.1"
fi

echo "======================================================================"
echo "⚜️  SCOUT GAME — SERVEUR DE DÉVELOPPEMENT MULTI-APPAREILS (WI-FI)"
echo "======================================================================"
echo "Adresse IP locale détectée : $IP"
echo ""
echo "📱 À ouvrir sur vos smartphones connectés au même réseau Wi-Fi :"
echo "   ▶ Vitrine Hub (Face A)      : http://$IP:5173"
echo "   ▶ Console d'administration   : http://$IP:5173/?admin=1"
echo "   ▶ API Backend FastAPI       : http://$IP:8000/docs"
echo ""
echo "🎲 Accès direct aux jeux (ports 3001 à 3006) :"
echo "   ▶ L'Infiltré                : http://$IP:3001"
echo "   ▶ Couvre-feu                : http://$IP:3002"
echo "   ▶ Chrono                    : http://$IP:3003"
echo "   ▶ Carnotzet (18+)           : http://$IP:3004"
echo "   ▶ Debout (18+)              : http://$IP:3005"
echo "   ▶ Débrief (18+)             : http://$IP:3006"
echo "======================================================================"
echo "Appuyez sur Ctrl+C pour arrêter l'ensemble des serveurs."
echo ""

# Arrêt propre de tous les processus en tâche de fond sur Ctrl+C ou sortie
trap 'echo ""; echo "🛑 Arrêt de tous les serveurs..."; kill $(jobs -p) 2>/dev/null || true; exit 0' SIGINT SIGTERM EXIT

# Nettoyage préventif des ports au cas où un ancien serveur tourne encore
fuser -k 8000/tcp 5173/tcp 3001/tcp 3002/tcp 3003/tcp 3004/tcp 3005/tcp 3006/tcp 2>/dev/null || true
sleep 1

# 1. Backend FastAPI sur 0.0.0.0:8000
echo "🚀 [1/3] Démarrage du Backend FastAPI (port 8000)..."
(cd "$BASE_DIR" && PYTHONPATH=backend python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &

# 2. Hub Vite sur 0.0.0.0:5173
echo "🚀 [2/3] Démarrage du Hub (port 5173)..."
(cd "$BASE_DIR/hub" && npm run dev -- --host 0.0.0.0 --port 5173) &

# 3. Les 6 jeux Vite sur 0.0.0.0:3001 à 3006
echo "🚀 [3/3] Démarrage des 6 jeux Vite (ports 3001 à 3006)..."
(cd "$BASE_DIR/games/infiltre" && npm run dev -- --host 0.0.0.0 --port 3001) &
(cd "$BASE_DIR/games/couvrefeu" && npm run dev -- --host 0.0.0.0 --port 3002) &
(cd "$BASE_DIR/games/chrono" && npm run dev -- --host 0.0.0.0 --port 3003) &
(cd "$BASE_DIR/games/carnotzet" && npm run dev -- --host 0.0.0.0 --port 3004) &
(cd "$BASE_DIR/games/debout" && npm run dev -- --host 0.0.0.0 --port 3005) &
(cd "$BASE_DIR/games/debrief" && npm run dev -- --host 0.0.0.0 --port 3006) &

wait

#!/usr/bin/env bash
set -e

export PATH="/home/numa/.local/node/bin:$PATH"
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

trap 'echo "Stopping all games..."; kill $(jobs -p) 2>/dev/null || true' SIGINT SIGTERM EXIT

echo "⚜️ [1/6] Démarrage de L'Infiltré (Port 3001)..."
(cd "$BASE_DIR/games/infiltre" && npm run dev -- --host 0.0.0.0 --port 3001) &

echo "⚜️ [2/6] Démarrage de Ronde de Nuit (Port 3002)..."
(cd "$BASE_DIR/games/rondedenuit" && npm run dev -- --host 0.0.0.0 --port 3002) &

echo "⚜️ [3/6] Démarrage de Chrono (Port 3003)..."
(cd "$BASE_DIR/games/chrono" && npm run dev -- --host 0.0.0.0 --port 3003) &

echo "⚜️ [4/6] Démarrage de Carnotzet (Port 3004)..."
(cd "$BASE_DIR/games/carnotzet" && npm run dev -- --host 0.0.0.0 --port 3004) &

echo "⚜️ [5/6] Démarrage de Debout (Port 3005)..."
(cd "$BASE_DIR/games/debout" && npm run dev -- --host 0.0.0.0 --port 3005) &

echo "⚜️ [6/6] Démarrage de Débrief (Port 3006)..."
(cd "$BASE_DIR/games/debrief" && npm run dev -- --host 0.0.0.0 --port 3006) &

echo "✅ Tous les jeux Face A et Face B sont en cours d'exécution !"
wait

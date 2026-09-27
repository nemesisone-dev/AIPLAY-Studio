#!/usr/bin/env bash
set -euo pipefail

worker_token="${AIPLAY_WORKER_TOKEN:-}"
if [[ ${#worker_token} -lt 32 ]]; then
  echo "Set AIPLAY_WORKER_TOKEN to the token shown in AIPLAY Studio, then run this script again."
  exit 2
fi

workspace="${AIPLAY_WORKSPACE:-/workspace}"
ace_dir="${ACESTEP_DIR:-$workspace/ACE-Step-1.5}"
studio_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  python -m pip install --upgrade uv
fi
if [[ ! -d "$ace_dir/.git" ]]; then
  git clone https://github.com/ace-step/ACE-Step-1.5.git "$ace_dir"
fi
git -C "$ace_dir" pull --ff-only
(cd "$ace_dir" && uv sync)

mkdir -p "$workspace/aiplay-logs" "$workspace/aiplay-training"
pkill -F "$workspace/aiplay-ace.pid" 2>/dev/null || true
pkill -F "$workspace/aiplay-worker.pid" 2>/dev/null || true

(cd "$ace_dir" && nohup uv run acestep-api --host 127.0.0.1 --port 8001 >"$workspace/aiplay-logs/ace-api.log" 2>&1 & echo $! >"$workspace/aiplay-ace.pid")

for _ in $(seq 1 180); do
  curl -fsS http://127.0.0.1:8001/health >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://127.0.0.1:8001/health >/dev/null

cd "$studio_dir"
nohup env \
  AIPLAY_WORKER_TOKEN="$worker_token" \
  AIPLAY_COMFY_DIR="${AIPLAY_COMFY_DIR:-$workspace/ComfyUI}" \
  AIPLAY_ACE_URL="http://127.0.0.1:8001" \
  AIPLAY_TRAINING_DIR="$workspace/aiplay-training" \
  node worker/runpod-worker.js >"$workspace/aiplay-logs/aiplay-worker.log" 2>&1 &
echo $! >"$workspace/aiplay-worker.pid"

echo "AIPLAY custom model worker is starting on port 8787."
echo "Logs: $workspace/aiplay-logs/ace-api.log and $workspace/aiplay-logs/aiplay-worker.log"

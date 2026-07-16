#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

killed_any=0

kill_matching() {
  local pattern="$1"
  local pids
  pids="$(pgrep -f "$pattern" || true)"
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    killed_any=1
  fi
}

# Stop backend dev server started from this repo.
kill_matching "$ROOT_DIR/backend/manage.py runserver"

# Stop frontend Next.js dev server started from this repo.
kill_matching "$ROOT_DIR/frontend/node_modules/.bin/next dev"
kill_matching "$ROOT_DIR/frontend/.*/next/dist/bin/next dev"

# Fallback: stop anything bound to expected dev ports.
for port in 3000 8000; do
  pids_on_port="$(lsof -ti tcp:"$port" || true)"
  if [[ -n "$pids_on_port" ]]; then
    echo "$pids_on_port" | xargs kill 2>/dev/null || true
    killed_any=1
  fi
done

if [[ "$killed_any" -eq 1 ]]; then
  echo "Stopped local dev services (backend/frontend) if they were running."
else
  echo "No matching local dev services were running."
fi

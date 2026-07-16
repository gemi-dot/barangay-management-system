#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"
PIP_BIN="$VENV_DIR/bin/pip"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed."
  exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating Python virtual environment at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

if ! "$PYTHON_BIN" -c "import django" >/dev/null 2>&1; then
  echo "Installing backend dependencies..."
  "$PIP_BIN" install -r "$BACKEND_DIR/requirements.txt"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

ENV_FILE="$FRONTEND_DIR/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE"
  echo "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api" > "$ENV_FILE"
fi

echo "Starting backend on http://127.0.0.1:8000 ..."
(
  cd "$BACKEND_DIR"
  "$PYTHON_BIN" manage.py migrate
  "$PYTHON_BIN" manage.py runserver 0.0.0.0:8000
) &
BACKEND_PID=$!

echo "Starting frontend on http://127.0.0.1:3000 ..."
(
  cd "$FRONTEND_DIR"
  NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://127.0.0.1:8000/api}" \
    npm run dev -- --hostname 0.0.0.0 --port 3000
) &
FRONTEND_PID=$!

echo ""
echo "App is starting."
echo "Frontend: http://127.0.0.1:3000"
echo "Backend:  http://127.0.0.1:8000"
echo "Press Ctrl+C to stop both services."
echo ""

set +e
wait -n "$BACKEND_PID" "$FRONTEND_PID"
EXIT_CODE=$?
set -e

echo "A service exited (code $EXIT_CODE). Stopping remaining services..."
cleanup
exit "$EXIT_CODE"

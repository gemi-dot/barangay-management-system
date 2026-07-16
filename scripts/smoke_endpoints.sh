#!/usr/bin/env bash

set -euo pipefail

BACKEND_BASE="${BACKEND_BASE:-http://localhost:8000}"
FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:3000}"
RESIDENT_ID="${RESIDENT_ID:-}"

failures=0

check() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local code

  code="$(curl -s -o /dev/null -w '%{http_code}' "$url")"

  if [[ "$code" == "$expected" ]]; then
    printf 'PASS %-34s %s -> %s\n' "$name" "$code" "$url"
  else
    printf 'FAIL %-34s expected=%s actual=%s %s\n' "$name" "$expected" "$code" "$url"
    failures=$((failures + 1))
  fi
}

echo "Running unauthenticated route smoke checks..."

if [[ -z "$RESIDENT_ID" ]]; then
  RESIDENT_ID="$(curl -sS "$BACKEND_BASE/api/residents/?page=1&page_size=1" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n 1)"
fi

if [[ -z "$RESIDENT_ID" ]]; then
  echo "FAIL could not resolve resident id from $BACKEND_BASE/api/residents/?page=1&page_size=1"
  echo "Set RESIDENT_ID manually and retry."
  exit 1
fi

echo "Using resident id: $RESIDENT_ID"

# Backend routes from latest verification run.
check "dashboard root" "$BACKEND_BASE/" "302"
check "accounts login" "$BACKEND_BASE/accounts/login/" "200"
check "assistant page" "$BACKEND_BASE/assistant/" "200"
check "inventory root" "$BACKEND_BASE/inventory/" "302"
check "inventory items" "$BACKEND_BASE/inventory/items/" "302"
check "reports root" "$BACKEND_BASE/reports/" "302"
check "households report root" "$BACKEND_BASE/reports/households/" "302"
check "today visitors report root" "$BACKEND_BASE/reports/today-visitors/" "302"
check "senior citizens report root" "$BACKEND_BASE/reports/senior-citizens/" "302"
check "businesses report root" "$BACKEND_BASE/reports/businesses/" "302"
check "4ps report root" "$BACKEND_BASE/reports/4ps/" "302"
check "pregnancy report root" "$BACKEND_BASE/reports/pregnancy/" "302"
check "residents voters report" "$BACKEND_BASE/residents/voters-report/" "302"
check "residents request doc" "$BACKEND_BASE/residents/request-document/" "200"
check "resident portal login" "$BACKEND_BASE/resident/login/" "200"
check "resident portal register" "$BACKEND_BASE/resident/register/" "200"
check "resident portal dashboard" "$BACKEND_BASE/resident/dashboard/" "302"
check "resident portal requests" "$BACKEND_BASE/resident/requests/" "302"
check "api residents list" "$BACKEND_BASE/api/residents/?page=1&page_size=1" "200"
check "api dashboard summary" "$BACKEND_BASE/api/dashboard/summary/" "200"
check "api resident detail" "$BACKEND_BASE/api/residents/$RESIDENT_ID/detail/" "200"

# Frontend routes from latest verification run.
check "frontend home" "$FRONTEND_BASE/" "200"
check "frontend residents list" "$FRONTEND_BASE/residents" "200"
check "frontend resident detail" "$FRONTEND_BASE/residents/$RESIDENT_ID" "200"
check "frontend reports" "$FRONTEND_BASE/reports" "200"
check "frontend today visitors" "$FRONTEND_BASE/reports/today-visitors" "200"
check "frontend senior citizens" "$FRONTEND_BASE/reports/senior-citizens" "200"
check "frontend businesses" "$FRONTEND_BASE/reports/businesses" "200"
check "frontend 4ps" "$FRONTEND_BASE/reports/fourps" "200"
check "frontend pregnancy" "$FRONTEND_BASE/reports/pregnancy" "200"
check "frontend households" "$FRONTEND_BASE/households" "200"
check "frontend inventory" "$FRONTEND_BASE/inventory" "200"
check "frontend assistant" "$FRONTEND_BASE/assistant" "200"
check "frontend bhw reports" "$FRONTEND_BASE/bhw-reports" "200"
check "frontend resident portal" "$FRONTEND_BASE/resident-portal" "200"

if (( failures > 0 )); then
  echo
  echo "Smoke checks finished with $failures failure(s)."
  exit 1
fi

echo
echo "All smoke checks passed."

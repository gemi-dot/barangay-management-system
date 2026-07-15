#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
USERNAME="${BIMS_USERNAME:-${1:-}}"
PASSWORD="${BIMS_PASSWORD:-${2:-}}"
MESSAGE="${BIMS_ASSISTANT_MESSAGE:-hello}"
COOKIE_JAR="$(mktemp)"
LOGIN_HTML="$(mktemp)"
ASSISTANT_JSON="$(mktemp)"

json_escape() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

cleanup() {
  rm -f "$COOKIE_JAR" "$LOGIN_HTML" "$ASSISTANT_JSON"
}
trap cleanup EXIT

if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "Usage: BIMS_USERNAME=<user> BIMS_PASSWORD=<pass> $0"
  echo "   or: $0 <username> <password>"
  exit 2
fi

extract_csrf_cookie() {
  awk '$6 == "csrftoken" {print $7}' "$COOKIE_JAR" | tail -n 1
}

echo "[1/5] Fetch login page and CSRF cookie..."
curl -sS -c "$COOKIE_JAR" "$BASE_URL/accounts/login/" > "$LOGIN_HTML"
CSRF_TOKEN="$(extract_csrf_cookie)"
if [[ -z "$CSRF_TOKEN" ]]; then
  echo "FAIL: Could not read csrftoken cookie from login page."
  exit 1
fi

echo "[2/5] Authenticate session..."
LOGIN_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -e "$BASE_URL/accounts/login/" \
  --data-urlencode "username=$USERNAME" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "csrfmiddlewaretoken=$CSRF_TOKEN" \
  "$BASE_URL/accounts/login/")"

if [[ "$LOGIN_STATUS" != "302" ]]; then
  echo "FAIL: Login did not redirect (expected 302, got $LOGIN_STATUS)."
  echo "Check credentials or login form behavior."
  exit 1
fi

SESSION_ID="$(awk '$6 == "sessionid" {print $7}' "$COOKIE_JAR" | tail -n 1)"
if [[ -z "$SESSION_ID" ]]; then
  echo "FAIL: sessionid cookie not found after login."
  exit 1
fi

echo "[3/5] Refresh CSRF token from assistant page..."
curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$BASE_URL/assistant/" > /dev/null
CSRF_TOKEN="$(extract_csrf_cookie)"
if [[ -z "$CSRF_TOKEN" ]]; then
  echo "FAIL: Could not refresh csrf token before assistant API call."
  exit 1
fi

echo "[4/5] Call assistant API with session + CSRF..."
JSON_PAYLOAD="$(printf '{\"message\":\"%s\"}' "$(json_escape "$MESSAGE")")"
API_STATUS="$(curl -sS -o "$ASSISTANT_JSON" -w '%{http_code}' \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -H "Referer: $BASE_URL/assistant/" \
  -d "$JSON_PAYLOAD" \
  "$BASE_URL/assistant/api/ask/")"

if [[ "$API_STATUS" != "200" ]]; then
  echo "FAIL: Assistant API expected 200, got $API_STATUS"
  echo "Response snippet:"
  head -c 400 "$ASSISTANT_JSON"
  echo
  exit 1
fi

echo "[5/5] Validate response shape..."
if ! grep -q '"answer"' "$ASSISTANT_JSON"; then
  echo "FAIL: Assistant API response missing 'answer' key."
  echo "Response snippet:"
  head -c 400 "$ASSISTANT_JSON"
  echo
  exit 1
fi

echo "PASS: assistant API smoke check succeeded."
echo "HTTP $API_STATUS"
head -c 400 "$ASSISTANT_JSON"
echo

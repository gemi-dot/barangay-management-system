#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_BASE="${BACKEND_BASE:-http://localhost:8000}"
FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:3000}"
RESIDENT_ID="${RESIDENT_ID:-}"

# Auth options: provide BIMS_USERNAME/BIMS_PASSWORD or let the suite auto-provision.
BIMS_USERNAME="${BIMS_USERNAME:-}"
BIMS_PASSWORD="${BIMS_PASSWORD:-}"
AUTO_PROVISION_SMOKE_USER="${AUTO_PROVISION_SMOKE_USER:-1}"
SMOKE_USER_PREFIX="${SMOKE_USER_PREFIX:-smoke_staff}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-SmokePass123!}"

MANAGE_DIR=""
PYTHON_BIN="${PYTHON_BIN:-}"

TMP_STAFF_USER=""
CREATED_TMP_STAFF_USER=0

COOKIE_JAR="$(mktemp)"
PORTAL_COOKIE_JAR="$(mktemp)"

feature_names=()
feature_statuses=()

current_feature=""
current_feature_failures=0
total_assertions=0
failed_assertions=0

cleanup() {
  rm -f "$COOKIE_JAR" "$PORTAL_COOKIE_JAR"

  if (( CREATED_TMP_STAFF_USER == 1 )) && [[ -n "$TMP_STAFF_USER" ]] && [[ -n "$MANAGE_DIR" ]]; then
    (
      cd "$MANAGE_DIR"
      SMOKE_USER="$TMP_STAFF_USER" "$PYTHON_BIN" manage.py shell -c 'import os; from django.contrib.auth import get_user_model; U=get_user_model(); U.objects.filter(username=os.environ["SMOKE_USER"]).delete(); print("cleaned")' >/dev/null 2>&1 || true
    )
  fi
}
trap cleanup EXIT

feature_begin() {
  current_feature="$1"
  current_feature_failures=0
  echo
  echo "=== $current_feature ==="
}

feature_end() {
  if (( current_feature_failures == 0 )); then
    feature_names+=("$current_feature")
    feature_statuses+=("PASS")
    echo "Feature result: PASS"
  else
    feature_names+=("$current_feature")
    feature_statuses+=("FAIL")
    echo "Feature result: FAIL (${current_feature_failures} failed assertion(s))"
  fi
}

pass_assertion() {
  local msg="$1"
  total_assertions=$((total_assertions + 1))
  printf 'PASS %s\n' "$msg"
}

fail_assertion() {
  local msg="$1"
  total_assertions=$((total_assertions + 1))
  failed_assertions=$((failed_assertions + 1))
  current_feature_failures=$((current_feature_failures + 1))
  printf 'FAIL %s\n' "$msg"
}

assert_status() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local code

  code="$(curl -sS -o /dev/null -w '%{http_code}' "$url")"
  if [[ "$code" == "$expected" ]]; then
    pass_assertion "$label [$code] $url"
  else
    fail_assertion "$label expected=$expected actual=$code $url"
  fi
}

assert_status_with_cookie() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local jar="$4"
  local code

  code="$(curl -sS -b "$jar" -c "$jar" -o /dev/null -w '%{http_code}' "$url")"
  if [[ "$code" == "$expected" ]]; then
    pass_assertion "$label [$code] $url"
  else
    fail_assertion "$label expected=$expected actual=$code $url"
  fi
}

assert_body_contains() {
  local label="$1"
  local url="$2"
  local needle="$3"
  local body

  body="$(curl -sS "$url")"
  if grep -Fq "$needle" <<< "$body"; then
    pass_assertion "$label contains '$needle'"
  else
    fail_assertion "$label missing '$needle' in $url"
  fi
}

assert_body_contains_with_cookie() {
  local label="$1"
  local url="$2"
  local needle="$3"
  local jar="$4"
  local body

  body="$(curl -sS -b "$jar" -c "$jar" "$url")"
  if grep -Fq "$needle" <<< "$body"; then
    pass_assertion "$label contains '$needle'"
  else
    fail_assertion "$label missing '$needle' in $url"
  fi
}

assert_redirect_location() {
  local label="$1"
  local url="$2"
  local expected_location="$3"
  local headers
  local location

  headers="$(curl -sSI "$url")"
  location="$(printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1} /^Location:/ {print $2}' | tr -d '\r' | tail -n 1)"

  if [[ "$location" == "$expected_location" ]]; then
    pass_assertion "$label location=$location"
  else
    fail_assertion "$label expected_location=$expected_location actual_location=${location:-<none>}"
  fi
}

resolve_manage_context() {
  if [[ -f "$ROOT_DIR/backend/manage.py" ]]; then
    MANAGE_DIR="$ROOT_DIR/backend"
  elif [[ -f "$ROOT_DIR/manage.py" ]]; then
    MANAGE_DIR="$ROOT_DIR"
  else
    return 1
  fi

  if [[ -z "$PYTHON_BIN" ]]; then
    if [[ -x "$ROOT_DIR/venv/bin/python" ]]; then
      PYTHON_BIN="$ROOT_DIR/venv/bin/python"
    elif [[ -x "$ROOT_DIR/backend/venv/bin/python" ]]; then
      PYTHON_BIN="$ROOT_DIR/backend/venv/bin/python"
    else
      PYTHON_BIN="python3"
    fi
  fi

  return 0
}

provision_smoke_staff_user() {
  TMP_STAFF_USER="${SMOKE_USER_PREFIX}_$(date +%s)"

  (
    cd "$MANAGE_DIR"
    SMOKE_USER="$TMP_STAFF_USER" SMOKE_PASS="$SMOKE_PASSWORD" "$PYTHON_BIN" manage.py shell -c 'import os; from django.contrib.auth import get_user_model; U=get_user_model(); username=os.environ["SMOKE_USER"]; u=U.objects.create(username=username, is_staff=True, is_superuser=False, email=username + "@example.com"); u.set_password(os.environ["SMOKE_PASS"]); u.save(); print("created")' >/dev/null
  )

  BIMS_USERNAME="$TMP_STAFF_USER"
  BIMS_PASSWORD="$SMOKE_PASSWORD"
  CREATED_TMP_STAFF_USER=1
}

extract_csrf_cookie() {
  local jar="$1"
  awk '$6 == "csrftoken" {print $7}' "$jar" | tail -n 1
}

login_staff_session() {
  local csrf
  local login_status

  curl -sS -c "$COOKIE_JAR" "$BACKEND_BASE/accounts/login/" > /dev/null
  csrf="$(extract_csrf_cookie "$COOKIE_JAR")"
  if [[ -z "$csrf" ]]; then
    return 1
  fi

  login_status="$(curl -sS -o /dev/null -w '%{http_code}' \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -e "$BACKEND_BASE/accounts/login/" \
    --data-urlencode "username=$BIMS_USERNAME" \
    --data-urlencode "password=$BIMS_PASSWORD" \
    --data-urlencode "csrfmiddlewaretoken=$csrf" \
    "$BACKEND_BASE/accounts/login/")"

  [[ "$login_status" == "302" ]]
}

login_resident_portal_session() {
  local csrf
  local login_status

  curl -sS -c "$PORTAL_COOKIE_JAR" "$BACKEND_BASE/resident/login/" > /dev/null
  csrf="$(extract_csrf_cookie "$PORTAL_COOKIE_JAR")"
  if [[ -z "$csrf" ]]; then
    return 1
  fi

  login_status="$(curl -sS -o /dev/null -w '%{http_code}' \
    -b "$PORTAL_COOKIE_JAR" -c "$PORTAL_COOKIE_JAR" \
    -e "$BACKEND_BASE/resident/login/" \
    --data-urlencode "username=$BIMS_USERNAME" \
    --data-urlencode "password=$BIMS_PASSWORD" \
    --data-urlencode "csrfmiddlewaretoken=$csrf" \
    "$BACKEND_BASE/resident/login/")"

  [[ "$login_status" == "302" ]]
}

if [[ -z "$RESIDENT_ID" ]]; then
  RESIDENT_ID="$(curl -sS "$BACKEND_BASE/api/residents/?page=1&page_size=1" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n 1)"
fi

if [[ -z "$RESIDENT_ID" ]]; then
  echo "FAIL: Could not resolve RESIDENT_ID from $BACKEND_BASE/api/residents/?page=1&page_size=1"
  echo "Set RESIDENT_ID manually and retry."
  exit 1
fi

echo "Resolved resident id: $RESIDENT_ID"

if [[ -z "$BIMS_USERNAME" || -z "$BIMS_PASSWORD" ]]; then
  if [[ "$AUTO_PROVISION_SMOKE_USER" != "1" ]]; then
    echo "FAIL: Missing BIMS_USERNAME/BIMS_PASSWORD and AUTO_PROVISION_SMOKE_USER is disabled."
    exit 1
  fi

  if ! resolve_manage_context; then
    echo "FAIL: Could not find manage.py to auto-provision smoke user."
    exit 1
  fi

  provision_smoke_staff_user
  echo "Using auto-provisioned smoke user: $BIMS_USERNAME"
fi

feature_begin "Core route baseline"
if bash "$SCRIPT_DIR/smoke_endpoints.sh"; then
  pass_assertion "Existing baseline smoke script"
else
  fail_assertion "Existing baseline smoke script"
fi
feature_end

feature_begin "Staff auth session"
if login_staff_session; then
  pass_assertion "Accounts login session established"
else
  fail_assertion "Accounts login session establishment"
fi
feature_end

feature_begin "Dashboard and APIs"
assert_status_with_cookie "dashboard page" "$BACKEND_BASE/" "200" "$COOKIE_JAR"
assert_status_with_cookie "dashboard residents list" "$BACKEND_BASE/residents/" "200" "$COOKIE_JAR"
assert_status_with_cookie "dashboard summary API" "$BACKEND_BASE/api/dashboard/summary/" "200" "$COOKIE_JAR"
assert_body_contains_with_cookie "dashboard summary cards" "$BACKEND_BASE/api/dashboard/summary/" '"cards"' "$COOKIE_JAR"
assert_body_contains_with_cookie "dashboard summary charts" "$BACKEND_BASE/api/dashboard/summary/" '"charts"' "$COOKIE_JAR"
feature_end

feature_begin "Residents module"
assert_status_with_cookie "residents list API" "$BACKEND_BASE/api/residents/?page=1&page_size=1" "200" "$COOKIE_JAR"
assert_body_contains_with_cookie "residents list payload" "$BACKEND_BASE/api/residents/?page=1&page_size=1" '"results"' "$COOKIE_JAR"
assert_status_with_cookie "resident detail API" "$BACKEND_BASE/api/residents/$RESIDENT_ID/detail/" "200" "$COOKIE_JAR"
assert_status_with_cookie "request-document page" "$BACKEND_BASE/residents/request-document/" "200" "$COOKIE_JAR"
assert_status_with_cookie "reports home page" "$BACKEND_BASE/residents/reports/" "200" "$COOKIE_JAR"
feature_end

feature_begin "Reports routing"
assert_status "reports root status" "$BACKEND_BASE/reports/" "302"
assert_redirect_location "reports root redirect" "$BACKEND_BASE/reports/" "/residents/reports/"
assert_status_with_cookie "reports redirect target" "$BACKEND_BASE/residents/reports/" "200" "$COOKIE_JAR"
feature_end

feature_begin "Households module"
assert_status_with_cookie "households legacy report page" "$BACKEND_BASE/reports/households/" "200" "$COOKIE_JAR"
assert_status_with_cookie "households summary api" "$BACKEND_BASE/api/households/summary/" "200" "$COOKIE_JAR"
assert_body_contains_with_cookie "households summary field" "$BACKEND_BASE/api/households/summary/" '"total_households"' "$COOKIE_JAR"
assert_status_with_cookie "households list api" "$BACKEND_BASE/api/households/list/?page=1&page_size=10" "200" "$COOKIE_JAR"
assert_body_contains_with_cookie "households list payload" "$BACKEND_BASE/api/households/list/?page=1&page_size=10" '"results"' "$COOKIE_JAR"
feature_end

feature_begin "Legacy report pages"
assert_status_with_cookie "today visitors report page" "$BACKEND_BASE/reports/today-visitors/" "200" "$COOKIE_JAR"
assert_status_with_cookie "senior citizens report page" "$BACKEND_BASE/reports/senior-citizens/" "200" "$COOKIE_JAR"
assert_status_with_cookie "businesses report page" "$BACKEND_BASE/reports/businesses/" "200" "$COOKIE_JAR"
assert_status_with_cookie "4ps report page" "$BACKEND_BASE/reports/4ps/" "200" "$COOKIE_JAR"
assert_status_with_cookie "pregnancy report page" "$BACKEND_BASE/reports/pregnancy/" "200" "$COOKIE_JAR"
feature_end

feature_begin "Reports API + Next pages"
assert_status_with_cookie "today visitors api" "$BACKEND_BASE/api/reports/today-visitors/" "200" "$COOKIE_JAR"
assert_body_contains_with_cookie "today visitors payload" "$BACKEND_BASE/api/reports/today-visitors/" '"visitors_today_count"' "$COOKIE_JAR"
assert_status_with_cookie "senior citizens api" "$BACKEND_BASE/api/reports/senior-citizens/?page=1&page_size=10" "200" "$COOKIE_JAR"
assert_status_with_cookie "businesses api" "$BACKEND_BASE/api/reports/businesses/?page=1&page_size=10" "200" "$COOKIE_JAR"
assert_status_with_cookie "4ps api" "$BACKEND_BASE/api/reports/fourps/?page=1&page_size=10" "200" "$COOKIE_JAR"
assert_status_with_cookie "pregnancy api" "$BACKEND_BASE/api/reports/pregnancy/?page=1&page_size=10" "200" "$COOKIE_JAR"
assert_status "frontend today visitors" "$FRONTEND_BASE/reports/today-visitors" "200"
assert_status "frontend senior citizens" "$FRONTEND_BASE/reports/senior-citizens" "200"
assert_status "frontend businesses" "$FRONTEND_BASE/reports/businesses" "200"
assert_status "frontend 4ps" "$FRONTEND_BASE/reports/fourps" "200"
assert_status "frontend pregnancy" "$FRONTEND_BASE/reports/pregnancy" "200"
feature_end

feature_begin "Inventory module"
assert_status_with_cookie "inventory home" "$BACKEND_BASE/inventory/" "200" "$COOKIE_JAR"
assert_status_with_cookie "inventory items" "$BACKEND_BASE/inventory/items/" "200" "$COOKIE_JAR"
assert_status_with_cookie "inventory by-office report" "$BACKEND_BASE/inventory/reports/by-office/" "200" "$COOKIE_JAR"
assert_status_with_cookie "inventory by-category report" "$BACKEND_BASE/inventory/reports/by-category/" "200" "$COOKIE_JAR"
feature_end

feature_begin "Assistant module"
if BASE_URL="$BACKEND_BASE" BIMS_USERNAME="$BIMS_USERNAME" BIMS_PASSWORD="$BIMS_PASSWORD" BIMS_ASSISTANT_MESSAGE=$'full bims smoke "assistant" check\nline2' bash "$SCRIPT_DIR/smoke_assistant_api_auth.sh" >/dev/null; then
  pass_assertion "assistant auth + csrf API flow"
else
  fail_assertion "assistant auth + csrf API flow"
fi
feature_end

feature_begin "BHW reports module"
assert_status_with_cookie "bhw summary api" "$BACKEND_BASE/api/bhw-reports/summary/" "200" "$COOKIE_JAR"
assert_body_contains_with_cookie "bhw summary field senior" "$BACKEND_BASE/api/bhw-reports/summary/" '"senior_citizens_total"' "$COOKIE_JAR"
assert_status_with_cookie "bhw senior list api" "$BACKEND_BASE/api/bhw-reports/senior-citizens/?page=1&page_size=5" "200" "$COOKIE_JAR"
assert_status_with_cookie "bhw 4ps list api" "$BACKEND_BASE/api/bhw-reports/fourps/?page=1&page_size=5" "200" "$COOKIE_JAR"
assert_status_with_cookie "bhw pregnancy list api" "$BACKEND_BASE/api/bhw-reports/pregnancy/?page=1&page_size=5" "200" "$COOKIE_JAR"
assert_status_with_cookie "bhw health list api" "$BACKEND_BASE/api/bhw-reports/health/?page=1&page_size=5" "200" "$COOKIE_JAR"
feature_end

feature_begin "Resident portal"
assert_status "resident login page" "$BACKEND_BASE/resident/login/" "200"
assert_status "resident register page" "$BACKEND_BASE/resident/register/" "200"
if login_resident_portal_session; then
  pass_assertion "resident portal login session established"
else
  fail_assertion "resident portal login session establishment"
fi
assert_status_with_cookie "resident portal dashboard" "$BACKEND_BASE/resident/dashboard/" "200" "$PORTAL_COOKIE_JAR"
assert_status_with_cookie "resident portal requests" "$BACKEND_BASE/resident/requests/" "200" "$PORTAL_COOKIE_JAR"
assert_status_with_cookie "resident portal announcements" "$BACKEND_BASE/resident/announcements/" "200" "$PORTAL_COOKIE_JAR"
feature_end

feature_begin "Frontend app"
assert_status "frontend home" "$FRONTEND_BASE/" "200"
assert_status "frontend residents list" "$FRONTEND_BASE/residents" "200"
assert_status "frontend resident detail" "$FRONTEND_BASE/residents/$RESIDENT_ID" "200"
assert_status "frontend households" "$FRONTEND_BASE/households" "200"
feature_end

echo
echo "=== Full BIMS Feature Matrix ==="
for idx in "${!feature_names[@]}"; do
  printf '%-28s %s\n' "${feature_names[$idx]}" "${feature_statuses[$idx]}"
done

echo
echo "Assertions: $total_assertions"
echo "Failed assertions: $failed_assertions"

if (( failed_assertions > 0 )); then
  exit 1
fi

echo "Full BIMS smoke suite PASSED."
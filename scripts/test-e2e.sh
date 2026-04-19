#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Full end-to-end smoke test for the microservices stack.
# Requires: curl, node, docker
# Usage: bash scripts/test-e2e.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="http://localhost:4040"
COOKIE_JAR=$(mktemp)
PASS=0
FAIL=0

# ── helpers ──────────────────────────────────────────────────────────────────

green() { echo -e "\033[32m  ✓ $*\033[0m"; }
red()   { echo -e "\033[31m  ✗ $*\033[0m"; }
header(){ echo -e "\n\033[1;36m══ $* \033[0m"; }

# parse a JSON field using node (no jq dependency)
json_field() {
  node -e "try{const d=JSON.parse(process.argv[1]);const v=process.argv[2].split('.').filter(Boolean).reduce((o,k)=>o&&o[k],d);process.stdout.write(v!=null?String(v):'')}catch(e){}" "$1" "$2"
}

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    green "$label  (HTTP $actual)"
    (( PASS++ )) || true
  else
    red "$label  — expected HTTP $expected, got $actual"
    (( FAIL++ )) || true
  fi
}

assert_field() {
  local label="$1" field="$2" body="$3"
  local val
  val=$(json_field "$body" "$field")
  if [[ -n "$val" && "$val" != "null" ]]; then
    green "$label  ($field = $val)"
    (( PASS++ )) || true
  else
    red "$label  — field '$field' missing or null in: $body"
    (( FAIL++ )) || true
  fi
}

assert_contains() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    green "$label  (contains '$expected')"
    (( PASS++ )) || true
  else
    red "$label  — expected to contain '$expected', got: $actual"
    (( FAIL++ )) || true
  fi
}

assert_empty() {
  local label="$1" actual="$2"
  if [[ -z "$actual" ]]; then
    green "$label  (empty — correct)"
    (( PASS++ )) || true
  else
    red "$label  — expected empty, got: $actual"
    (( FAIL++ )) || true
  fi
}

redis_keys() {
  docker exec microservices-redis-1 redis-cli -a app_redis_password KEYS "$1" 2>/dev/null | grep -v "Warning" || true
}

# unique email per run so reruns don't collide
EMAIL="smoketest_$(date +%s)@demo.com"
PASSWORD="Test1234!"

# ─────────────────────────────────────────────────────────────────────────────
header "GATEWAY HEALTH"
# ─────────────────────────────────────────────────────────────────────────────

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
assert_status "GET /health" 200 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "USER — Register"
# ─────────────────────────────────────────────────────────────────────────────

BODY=$(curl -s -X POST "$BASE/user" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"notifyByEmail\":false}")
assert_field "POST /user — returns id"    "id"    "$BODY"
assert_field "POST /user — returns email" "email" "$BODY"
USER_ID=$(json_field "$BODY" "id")

# duplicate registration must fail
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/user" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"notifyByEmail\":false}")
assert_status "POST /user duplicate — 409 Conflict" 409 "$STATUS"

# invalid body (missing notifyByEmail)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/user" \
  -H "Content-Type: application/json" \
  -d '{"email":"bad@demo.com","password":"Test1234!"}')
assert_status "POST /user invalid body — 400 Bad Request" 400 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "AUTH — Login"
# ─────────────────────────────────────────────────────────────────────────────

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_JAR" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
assert_status "POST /auth/login — 201" 201 "$STATUS"

TOKEN_KEYS=$(redis_keys "refresh_token:${USER_ID}:*")
assert_contains "Redis has refresh_token after login" "refresh_token:" "$TOKEN_KEYS"

# wrong password must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"WrongPassword1!\"}")
assert_status "POST /auth/login wrong password — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "AUTH — Refresh (token rotation)"
# ─────────────────────────────────────────────────────────────────────────────

OLD_KEY=$(redis_keys "refresh_token:${USER_ID}:*")

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/auth/refresh")
assert_status "POST /auth/refresh — 200" 200 "$STATUS"

NEW_KEY=$(redis_keys "refresh_token:${USER_ID}:*")
if [[ "$OLD_KEY" != "$NEW_KEY" && -n "$NEW_KEY" ]]; then
  green "Redis key rotated (old tokenId replaced with new)"
  (( PASS++ )) || true
else
  red "Redis key was NOT rotated (old=$OLD_KEY, new=$NEW_KEY)"
  (( FAIL++ )) || true
fi

# refresh without cookie must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/refresh")
assert_status "POST /auth/refresh no cookie — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "ACCOUNT — Create (authenticated)"
# ─────────────────────────────────────────────────────────────────────────────

BODY=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE/account" \
  -H "Content-Type: application/json" \
  -d '{"exchange":"binance","environment":"test","apiKey":"test_api_key_12345","apiSecret":"test_api_secret_12345"}')
assert_field "POST /account — returns id"       "id"       "$BODY"
assert_field "POST /account — returns exchange" "exchange" "$BODY"
ACCOUNT_ID=$(json_field "$BODY" "id")

# unauthenticated must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/account" \
  -H "Content-Type: application/json" \
  -d '{"exchange":"binance","environment":"test","apiKey":"k","apiSecret":"s"}')
assert_status "POST /account no auth — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "ROBOT — Create"
# ─────────────────────────────────────────────────────────────────────────────

ROBOT_BODY="{\"name\":\"smoke-bot\",\"fsymbol\":\"BTCUSDT\",\"type\":\"test\",\"assets\":\"BTC\",\"active\":true,\"accountId\":\"$ACCOUNT_ID\",\"funds\":{\"initial\":1000,\"value\":1000,\"base\":\"USDT\",\"dynamic\":false,\"partial\":\"0\",\"size\":100},\"instrument\":{\"name\":\"Bitcoin\",\"symbol\":\"BTC\"}}"

BODY=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE/robot" \
  -H "Content-Type: application/json" \
  -d "$ROBOT_BODY")
assert_field "POST /robot — returns id"   "id"   "$BODY"
assert_field "POST /robot — returns name" "name" "$BODY"
ROBOT_ID=$(json_field "$BODY" "id")

# unauthenticated must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/robot" \
  -H "Content-Type: application/json" \
  -d "$ROBOT_BODY")
assert_status "POST /robot no auth — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "ROBOT — Update Indicators"
# ─────────────────────────────────────────────────────────────────────────────

INDICATORS_BODY="{\"robotId\":\"$ROBOT_ID\",\"open\":{\"rsi\":{\"enabled\":true,\"period\":14,\"rule\":\"crosses up\",\"value\":30},\"hl\":{\"enabled\":false,\"period\":14,\"rule\":\"greater\",\"value\":0}},\"close\":{\"take_profit\":{\"enabled\":true,\"factor\":\"percent\",\"value\":2},\"stop_lose\":{\"enabled\":true,\"factor\":\"percent\",\"value\":1},\"min_profit\":{\"enabled\":false,\"factor\":\"percent\",\"value\":0},\"rsi\":{\"enabled\":false,\"period\":14,\"rule\":\"crosses down\",\"value\":70},\"hl\":{\"enabled\":false,\"period\":14,\"rule\":\"less\",\"value\":0}}}"

BODY=$(curl -s -b "$COOKIE_JAR" -X PATCH "$BASE/robot" \
  -H "Content-Type: application/json" \
  -d "$INDICATORS_BODY")
assert_field "PATCH /robot indicators — returns id" "id" "$BODY"

# unauthenticated must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/robot" \
  -H "Content-Type: application/json" \
  -d "$INDICATORS_BODY")
assert_status "PATCH /robot no auth — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "AUTH — Logout (revocation)"
# ─────────────────────────────────────────────────────────────────────────────

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/auth/logout")
assert_status "POST /auth/logout — 200" 200 "$STATUS"

REMAINING=$(redis_keys "refresh_token:${USER_ID}:*")
assert_empty "Redis — session token deleted after logout" "$REMAINING"

# refresh with the now-revoked cookie must fail
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -X POST "$BASE/auth/refresh")
assert_status "POST /auth/refresh after logout — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "PROTECTED ROUTES — Cookies expired after logout"
# ─────────────────────────────────────────────────────────────────────────────

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -X POST "$BASE/account" \
  -H "Content-Type: application/json" \
  -d '{"exchange":"binance","environment":"test","apiKey":"k","apiSecret":"s"}')
assert_status "POST /account after logout — 401" 401 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -X POST "$BASE/robot" \
  -H "Content-Type: application/json" \
  -d "$ROBOT_BODY")
assert_status "POST /robot after logout — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "ROBOT — List (paginated)"
# ─────────────────────────────────────────────────────────────────────────────

# re-login to get fresh cookies (we logged out above)
curl -s -o /dev/null -c "$COOKIE_JAR" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

BODY=$(curl -s -b "$COOKIE_JAR" "$BASE/robot?page=1&limit=10")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE/robot?page=1&limit=10")
assert_status "GET /robot?page=1&limit=10 — 200" 200 "$STATUS"
assert_field "GET /robot — has data"       "data"       "$BODY"
assert_field "GET /robot — has total"      "total"      "$BODY"
assert_field "GET /robot — has page"       "page"       "$BODY"
assert_field "GET /robot — has limit"      "limit"      "$BODY"
assert_field "GET /robot — has totalPages" "totalPages" "$BODY"

# verify our robot is in the data
ROBOT_COUNT=$(json_field "$BODY" "total")
if [[ "$ROBOT_COUNT" -ge 1 ]]; then
  green "GET /robot — total >= 1 ($ROBOT_COUNT)"
  (( PASS++ )) || true
else
  red "GET /robot — expected total >= 1, got $ROBOT_COUNT"
  (( FAIL++ )) || true
fi

# unauthenticated must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/robot?page=1&limit=10")
assert_status "GET /robot no auth — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "POSITIONS — List (paginated)"
# ─────────────────────────────────────────────────────────────────────────────

BODY=$(curl -s -b "$COOKIE_JAR" "$BASE/robot/positions?page=1&limit=10")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE/robot/positions?page=1&limit=10")
assert_status "GET /robot/positions?page=1&limit=10 — 200" 200 "$STATUS"
assert_contains "GET /robot/positions — has data" '"data":' "$BODY"
assert_field "GET /robot/positions — has total"      "total"      "$BODY"
assert_field "GET /robot/positions — has page"       "page"       "$BODY"
assert_field "GET /robot/positions — has totalPages" "totalPages" "$BODY"

# unauthenticated must 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/robot/positions?page=1&limit=10")
assert_status "GET /robot/positions no auth — 401" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
header "AUTH — Logout (final cleanup)"
# ─────────────────────────────────────────────────────────────────────────────

curl -s -o /dev/null -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/auth/logout"

# ─────────────────────────────────────────────────────────────────────────────
header "RESULTS"
# ─────────────────────────────────────────────────────────────────────────────

TOTAL=$(( PASS + FAIL ))
echo ""
echo "  Passed: $PASS / $TOTAL"
echo "  Failed: $FAIL / $TOTAL"
echo ""

rm -f "$COOKIE_JAR"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1

# ─────────────────────────────────────────────────────────────────────────────

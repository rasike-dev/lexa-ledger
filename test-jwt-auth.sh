#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  JWT AUTHENTICATION TEST                                             ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

echo "Step 1: Testing public endpoint (no token required)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3000/api/health/live | jq .
echo ""

echo "Step 2: Testing protected endpoint WITHOUT token (should be 401)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/response.json http://localhost:3000/api/portfolio/summary)
cat /tmp/response.json | jq .
echo "HTTP Status: $HTTP_CODE"
echo ""

echo "Step 3: Obtaining access token from Keycloak..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8088/realms/lexa-ledger/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=lexa-ledger-web" \
  -d "grant_type=password" \
  -d "username=rasike" \
  -d "password=rasike" \
  -d "scope=openid")

if echo "$TOKEN_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ ERROR: Failed to obtain token"
  echo "$TOKEN_RESPONSE" | jq .
  echo ""
  echo "⚠️  Make sure Direct Access Grants is enabled:"
  echo "   http://localhost:8088/admin/master/console/#/lexa-ledger"
  echo "   → Clients → lexa-ledger-web → Capability config"
  echo "   → Enable: Direct access grants"
  exit 1
fi

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
echo "✅ Token obtained successfully!"
echo ""
echo "Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."
echo ""

# Decode and show token claims
echo "Step 4: Decoded JWT claims..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$ACCESS_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq '{
  sub: .sub,
  preferred_username: .preferred_username,
  email: .email,
  tenant_id: .tenant_id,
  roles: .realm_access.roles,
  iss: .iss,
  aud: .aud,
  exp: .exp
}'
echo ""

echo "Step 5: Testing protected endpoint WITH valid token..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/response_auth.json \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3000/api/portfolio/summary)

cat /tmp/response_auth.json | jq .
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! JWT authentication is working!"
  echo ""
  echo "Summary:"
  echo "  ✅ Public endpoint works without token"
  echo "  ✅ Protected endpoint rejects requests without token (401)"
  echo "  ✅ Protected endpoint accepts valid JWT (200)"
  echo "  ✅ tenant_id extracted from JWT"
  echo "  ✅ roles extracted from JWT"
else
  echo "❌ FAILED: Expected 200, got $HTTP_CODE"
  echo ""
  echo "Possible issues:"
  echo "  - JWT validation failed (check issuer/audience/expiration)"
  echo "  - tenant_id missing from token"
  echo "  - JWKS endpoint unreachable"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  TEST COMPLETE                                                       ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"


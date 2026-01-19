#!/bin/bash
# Keycloak Setup Script - Creates complete Keycloak configuration from scratch
# Use this to recreate the setup in a VM environment

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM_NAME="${REALM_NAME:-lexa-ledger}"
CLIENT_ID="${CLIENT_ID:-lexa-ledger-web}"

echo "🔐 Keycloak Setup Script"
echo "========================"
echo "URL: $KEYCLOAK_URL"
echo "Realm: $REALM_NAME"
echo "Client: $CLIENT_ID"
echo ""

# Login to Keycloak
echo "📝 Logging into Keycloak..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" > /dev/null 2>&1

# Create realm if it doesn't exist
echo "📦 Creating realm: $REALM_NAME..."
REALM_EXISTS=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get realms/"$REALM_NAME" 2>/dev/null || echo "not found")

if [ "$REALM_EXISTS" = "not found" ]; then
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create realms -s realm="$REALM_NAME" -s enabled=true -s displayName="LEXA Ledger"
  echo "✅ Realm created"
else
  echo "✓ Realm already exists"
fi

# Create client
echo "📦 Creating client: $CLIENT_ID..."
CLIENT_EXISTS=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get clients \
  --realm "$REALM_NAME" \
  --format json | jq -r ".[] | select(.clientId == \"$CLIENT_ID\") | .id" || echo "")

if [ -z "$CLIENT_EXISTS" ]; then
  CLIENT_ID_OUTPUT=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create clients \
    --realm "$REALM_NAME" \
    -s clientId="$CLIENT_ID" \
    -s enabled=true \
    -s publicClient=true \
    -s 'redirectUris=["http://localhost:5173/auth/callback","lexa-ledger://auth/callback"]' \
    -s 'webOrigins=["http://localhost:5173","lexa-ledger://"]' \
    -s standardFlowEnabled=true \
    -s directAccessGrantsEnabled=true \
    --id)
  echo "✅ Client created: $CLIENT_ID"
else
  echo "✓ Client already exists"
fi

# Create realm roles
echo "📦 Creating realm roles..."
ROLES=(
  "PLATFORM_SUPER_ADMIN"
  "TENANT_ADMIN"
  "LOAN_OFFICER"
  "DOCUMENT_SPECIALIST"
  "SERVICING_MANAGER"
  "TRADING_ANALYST"
  "TRADING_VIEWER"
  "ESG_ANALYST"
  "ESG_VERIFIER"
  "RISK_OFFICER"
  "COMPLIANCE_AUDITOR"
  "SUPPORT_OPERATOR"
  "INTEGRATION_SERVICE"
)

for ROLE in "${ROLES[@]}"; do
  ROLE_EXISTS=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get roles \
    --realm "$REALM_NAME" \
    --format json | jq -r ".[] | select(.name == \"$ROLE\") | .name" || echo "")
  
  if [ -z "$ROLE_EXISTS" ]; then
    docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create roles \
      --realm "$REALM_NAME" \
      -s name="$ROLE" > /dev/null
    echo "   ✅ Created role: $ROLE"
  else
    echo "   ✓ Role exists: $ROLE"
  fi
done

# Create users
echo "📦 Creating users..."

# User 1: Alex Morgan (TENANT_ADMIN)
USER1_ID=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create users \
  --realm "$REALM_NAME" \
  -s username="user-alex-001" \
  -s email="alex.morgan@acmecapital.com" \
  -s firstName="Alex" \
  -s lastName="Morgan" \
  -s enabled=true \
  -s emailVerified=true \
  2>&1 | grep -oP '(?<=Created new user with id '\'').*(?='\'')' || echo "")

if [ -n "$USER1_ID" ]; then
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh set-password \
    --realm "$REALM_NAME" \
    --username "user-alex-001" \
    --new-password "Demo2026!" \
    --temporary false > /dev/null
  
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh update users/"$USER1_ID" \
    --realm "$REALM_NAME" \
    -s 'attributes.tenant_id=["acme-capital-001"]' > /dev/null
  
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh add-roles \
    --realm "$REALM_NAME" \
    --uusername "user-alex-001" \
    --rolename "TENANT_ADMIN" > /dev/null
  
  echo "   ✅ Created user: user-alex-001 (TENANT_ADMIN)"
fi

# User 2: Jamie Lee (TRADING_ANALYST)
USER2_ID=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create users \
  --realm "$REALM_NAME" \
  -s username="user-jamie-001" \
  -s email="jamie.lee@acmecapital.com" \
  -s firstName="Jamie" \
  -s lastName="Lee" \
  -s enabled=true \
  -s emailVerified=true \
  2>&1 | grep -oP '(?<=Created new user with id '\'').*(?='\'')' || echo "")

if [ -n "$USER2_ID" ]; then
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh set-password \
    --realm "$REALM_NAME" \
    --username "user-jamie-001" \
    --new-password "Demo2026!" \
    --temporary false > /dev/null
  
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh update users/"$USER2_ID" \
    --realm "$REALM_NAME" \
    -s 'attributes.tenant_id=["acme-capital-001"]' > /dev/null
  
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh add-roles \
    --realm "$REALM_NAME" \
    --uusername "user-jamie-001" \
    --rolename "TRADING_ANALYST" > /dev/null
  
  echo "   ✅ Created user: user-jamie-001 (TRADING_ANALYST)"
fi

# User 3: Priya Shah (COMPLIANCE_AUDITOR)
USER3_ID=$(docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create users \
  --realm "$REALM_NAME" \
  -s username="user-priya-001" \
  -s email="priya.shah@acmecapital.com" \
  -s firstName="Priya" \
  -s lastName="Shah" \
  -s enabled=true \
  -s emailVerified=true \
  2>&1 | grep -oP '(?<=Created new user with id '\'').*(?='\'')' || echo "")

if [ -n "$USER3_ID" ]; then
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh set-password \
    --realm "$REALM_NAME" \
    --username "user-priya-001" \
    --new-password "Demo2026!" \
    --temporary false > /dev/null
  
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh update users/"$USER3_ID" \
    --realm "$REALM_NAME" \
    -s 'attributes.tenant_id=["acme-capital-001"]' > /dev/null
  
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh add-roles \
    --realm "$REALM_NAME" \
    --uusername "user-priya-001" \
    --rolename "COMPLIANCE_AUDITOR" > /dev/null
  
  echo "   ✅ Created user: user-priya-001 (COMPLIANCE_AUDITOR)"
fi

echo ""
echo "✅ Keycloak setup complete!"
echo ""
echo "🔍 Configuration:"
echo "   - Realm: $REALM_NAME"
echo "   - Client: $CLIENT_ID"
echo "   - Admin Console: ${KEYCLOAK_URL/admin}"
echo ""
echo "👥 Demo Users:"
echo "   1. user-alex-001 / Demo2026! (TENANT_ADMIN)"
echo "   2. user-jamie-001 / Demo2026! (TRADING_ANALYST)"
echo "   3. user-priya-001 / Demo2026! (COMPLIANCE_AUDITOR)"
echo ""

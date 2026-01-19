#!/bin/bash
# Simplified Keycloak Export - runs all commands in single session

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM_NAME="${REALM_NAME:-lexa-ledger}"
EXPORT_DIR="${EXPORT_DIR:-./keycloak-export}"

echo "🔐 Keycloak Configuration Export"
echo "================================"
echo "URL: $KEYCLOAK_URL"
echo "Realm: $REALM_NAME"
echo "Export Directory: $EXPORT_DIR"
echo ""

mkdir -p "$EXPORT_DIR"

# Export using --no-config to pass credentials directly (more reliable)
echo "📝 Exporting Keycloak configuration..."

echo "📦 Exporting realm configuration..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get realms/$REALM_NAME \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --no-config \
  --format json > "$EXPORT_DIR/realm.json"

echo "📦 Exporting clients..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get clients \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --no-config \
  --target-realm "$REALM_NAME" \
  --format json > "$EXPORT_DIR/clients.json"

echo "📦 Exporting roles..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get roles \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --no-config \
  --target-realm "$REALM_NAME" \
  --format json > "$EXPORT_DIR/roles.json"

echo "📦 Exporting users..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get users \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --no-config \
  --target-realm "$REALM_NAME" \
  --format json > "$EXPORT_DIR/users.json"

echo "📦 Exporting client scopes..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get client-scopes \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --no-config \
  --target-realm "$REALM_NAME" \
  --format json > "$EXPORT_DIR/client-scopes.json"


# Export client roles and user role mappings (if jq available)
if command -v jq &> /dev/null; then
  echo "📦 Exporting client roles and user mappings..."
  mkdir -p "$EXPORT_DIR/client-roles" "$EXPORT_DIR/user-roles"
  
  CLIENTS=$(cat "$EXPORT_DIR/clients.json" | jq -r '.[].id')
  for CLIENT_ID in $CLIENTS; do
    CLIENT_NAME=$(cat "$EXPORT_DIR/clients.json" | jq -r ".[] | select(.id == \"$CLIENT_ID\") | .clientId")
    docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get clients/$CLIENT_ID/roles \
      --server "$KEYCLOAK_URL" \
      --realm master \
      --user "$KEYCLOAK_ADMIN" \
      --password "$KEYCLOAK_ADMIN_PASSWORD" \
      --no-config \
      --target-realm "$REALM_NAME" \
      --format json > "$EXPORT_DIR/client-roles/${CLIENT_NAME}.json" 2>/dev/null || true
  done
  
  USERS=$(cat "$EXPORT_DIR/users.json" | jq -r '.[].id')
  for USER_ID in $USERS; do
    USERNAME=$(cat "$EXPORT_DIR/users.json" | jq -r ".[] | select(.id == \"$USER_ID\") | .username")
    docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get users/$USER_ID/role-mappings \
      --server "$KEYCLOAK_URL" \
      --realm master \
      --user "$KEYCLOAK_ADMIN" \
      --password "$KEYCLOAK_ADMIN_PASSWORD" \
      --no-config \
      --target-realm "$REALM_NAME" \
      --format json > "$EXPORT_DIR/user-roles/${USERNAME}.json" 2>/dev/null || true
  done
fi

echo ""
echo "✅ Export complete!"
echo ""
echo "📁 Files exported to: $EXPORT_DIR"
ls -lh "$EXPORT_DIR"
echo ""
echo "💡 To recreate in VM, use: infra/keycloak-import.sh or infra/keycloak-setup.sh"

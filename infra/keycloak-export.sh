#!/bin/bash
# Keycloak Configuration Export Script
# Exports current Keycloak setup for recreation in VM

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

# Create export directory
mkdir -p "$EXPORT_DIR"

# Helper function - authenticates and runs command
# Each call authenticates fresh to avoid session issues
kcadm() {
  # Authenticate first, then run the command
  docker exec infra-keycloak-1 bash -c \
    "/opt/keycloak/bin/kcadm.sh config credentials --server $KEYCLOAK_URL --realm master --user $KEYCLOAK_ADMIN --password $KEYCLOAK_ADMIN_PASSWORD > /dev/null 2>&1 && \
     /opt/keycloak/bin/kcadm.sh $*"
}

# Test connection
echo "📝 Testing Keycloak connection..."

# Export realm configuration
echo "📦 Exporting realm configuration..."
docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get realms/$REALM_NAME \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --no-config \
  --format json > "$EXPORT_DIR/realm.json"

# Export clients
echo "📦 Exporting clients..."
kcadm get clients --format json > "$EXPORT_DIR/clients.json"

# Export roles
echo "📦 Exporting realm roles..."
kcadm get roles --format json > "$EXPORT_DIR/roles.json"

# Export users
echo "📦 Exporting users..."
kcadm get users --format json > "$EXPORT_DIR/users.json"

# Export client roles for each client
echo "📦 Exporting client roles..."
CLIENTS=$(kcadm get clients --format json | jq -r '.[].id')

mkdir -p "$EXPORT_DIR/client-roles"
for CLIENT_ID in $CLIENTS; do
  CLIENT_NAME=$(kcadm get clients/$CLIENT_ID --format json | jq -r '.clientId')
  
  kcadm get clients/$CLIENT_ID/roles --format json > "$EXPORT_DIR/client-roles/${CLIENT_NAME}.json" 2>/dev/null || true
done

# Export user role mappings
echo "📦 Exporting user role mappings..."
mkdir -p "$EXPORT_DIR/user-roles"
USERS=$(kcadm get users --format json | jq -r '.[].id')

for USER_ID in $USERS; do
  USERNAME=$(kcadm get users/$USER_ID --format json | jq -r '.username')
  
  kcadm get users/$USER_ID/role-mappings --format json > "$EXPORT_DIR/user-roles/${USERNAME}.json" 2>/dev/null || true
done

# Export client scopes
echo "📦 Exporting client scopes..."
kcadm get client-scopes --format json > "$EXPORT_DIR/client-scopes.json"

# Create summary
echo ""
echo "✅ Export complete!"
echo ""
echo "📁 Files exported to: $EXPORT_DIR"
echo "   - realm.json (realm configuration)"
echo "   - clients.json (all clients)"
echo "   - roles.json (realm roles)"
echo "   - users.json (all users)"
echo "   - client-roles/ (client-specific roles)"
echo "   - user-roles/ (user role mappings)"
echo "   - client-scopes.json (client scopes)"
echo ""
echo "💡 To recreate in VM, use: infra/keycloak-import.sh"

#!/bin/bash
# Keycloak JSON Import Script
# Imports Keycloak configuration directly from JSON files

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM_NAME="${REALM_NAME:-lexa-ledger}"
IMPORT_DIR="${IMPORT_DIR:-./keycloak-export}"
BACKUP_DIR=""  # Will be set if backup is created

echo "🔐 Keycloak JSON Import"
echo "======================"
echo "URL: $KEYCLOAK_URL"
echo "Realm: $REALM_NAME"
echo "Import Directory: $IMPORT_DIR"
echo ""

if [ ! -d "$IMPORT_DIR" ]; then
  echo "❌ Import directory not found: $IMPORT_DIR"
  echo "   Run keycloak-export-simple.sh first to create export files"
  exit 1
fi

# Helper function to run kcadm with authentication
kcadm() {
  docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh "$@" \
    --server "$KEYCLOAK_URL" \
    --realm master \
    --user "$KEYCLOAK_ADMIN" \
    --password "$KEYCLOAK_ADMIN_PASSWORD" \
    --no-config
}

# Check if realm exists
echo "📝 Checking if realm exists..."
REALM_EXISTS=$(kcadm get realms/$REALM_NAME 2>/dev/null || echo "not found")

if [ "$REALM_EXISTS" != "not found" ]; then
  echo "⚠️  Realm $REALM_NAME already exists."
  
  # Create backup before deletion
  BACKUP_DIR="${IMPORT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
  echo "📦 Creating backup to: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  
  # Export current realm configuration to backup
  echo "   Exporting realm..."
  kcadm get realms/$REALM_NAME --format json > "$BACKUP_DIR/realm.json" 2>/dev/null || true
  
  echo "   Exporting clients..."
  kcadm get clients --target-realm "$REALM_NAME" --format json > "$BACKUP_DIR/clients.json" 2>/dev/null || true
  
  echo "   Exporting roles..."
  kcadm get roles --target-realm "$REALM_NAME" --format json > "$BACKUP_DIR/roles.json" 2>/dev/null || true
  
  echo "   Exporting users..."
  kcadm get users --target-realm "$REALM_NAME" --format json > "$BACKUP_DIR/users.json" 2>/dev/null || true
  
  echo "✅ Backup created in: $BACKUP_DIR"
  echo ""
  echo "⚠️  Deleting existing realm (backup saved)..."
  kcadm delete realms/$REALM_NAME
  echo "✅ Deleted existing realm"
  echo ""
fi

# Import realm from JSON
echo "📦 Importing realm from JSON..."
if [ -f "$IMPORT_DIR/realm.json" ]; then
  # Remove only internal fields, keep realm name
  cat "$IMPORT_DIR/realm.json" | jq 'del(.id, .internalId)' | \
    docker exec -i infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create realms \
      --server "$KEYCLOAK_URL" \
      --realm master \
      --user "$KEYCLOAK_ADMIN" \
      --password "$KEYCLOAK_ADMIN_PASSWORD" \
      --no-config \
      -f - > /dev/null
  echo "✅ Realm imported"
else
  echo "❌ realm.json not found in $IMPORT_DIR"
  exit 1
fi

# Import clients from JSON
echo "📦 Importing clients from JSON..."
if [ -f "$IMPORT_DIR/clients.json" ]; then
  CLIENTS=$(cat "$IMPORT_DIR/clients.json" | jq -c '.[]')
  echo "$CLIENTS" | while read -r client; do
    CLIENT_ID=$(echo "$client" | jq -r '.clientId')
    # Skip default Keycloak clients
    if [[ "$CLIENT_ID" == "account" ]] || [[ "$CLIENT_ID" == "account-console" ]] || [[ "$CLIENT_ID" == "broker" ]] || [[ "$CLIENT_ID" == "security-admin-console" ]]; then
      continue
    fi
    
    echo "$client" | jq 'del(.id, .internalId, .clientId)' | \
      docker exec -i infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create clients \
        --server "$KEYCLOAK_URL" \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD" \
        --no-config \
        --target-realm "$REALM_NAME" \
        -f - > /dev/null 2>&1 && echo "   ✅ Imported client: $CLIENT_ID" || echo "   ⚠️  Client $CLIENT_ID may already exist"
  done
  echo "✅ Clients imported"
fi

# Import realm roles from JSON
echo "📦 Importing realm roles from JSON..."
if [ -f "$IMPORT_DIR/roles.json" ]; then
  ROLES=$(cat "$IMPORT_DIR/roles.json" | jq -c '.[] | select(.name != "offline_access" and .name != "uma_authorization" and (.name | startswith("default-roles")))')
  echo "$ROLES" | while read -r role; do
    ROLE_NAME=$(echo "$role" | jq -r '.name')
    echo "$role" | jq 'del(.id, .containerId)' | \
      docker exec -i infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create roles \
        --server "$KEYCLOAK_URL" \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD" \
        --no-config \
        --target-realm "$REALM_NAME" \
        -f - > /dev/null 2>&1 && echo "   ✅ Imported role: $ROLE_NAME" || echo "   ⚠️  Role $ROLE_NAME may already exist"
  done
  echo "✅ Realm roles imported"
fi

# Import users from JSON
echo "📦 Importing users from JSON..."
if [ -f "$IMPORT_DIR/users.json" ]; then
  # Use process substitution to avoid subshell issues with while loop
  while read -r user; do
    USERNAME=$(echo "$user" | jq -r '.username')
    PASSWORD=$(echo "$user" | jq -r '.credentials[0].value // "Demo2026!"')
    
    # Create user with attributes included (Keycloak may require attributes at creation time)
    USER_ENABLED=$(echo "$user" | jq -r '.enabled // true')
    USER_EMAIL_VERIFIED=$(echo "$user" | jq -r '.emailVerified // true')
    # Preserve attributes if they exist, otherwise create empty object
    USER_DATA=$(echo "$user" | jq --arg enabled "$USER_ENABLED" --arg emailVerified "$USER_EMAIL_VERIFIED" \
      'del(.id, .createdTimestamp, .totp, .credentials, .federatedIdentities, .disableableCredentialTypes, .requiredActions, .realmRoles, .notBefore, .groups, .access) | 
       .enabled = ($enabled | test("true")) | 
       .emailVerified = ($emailVerified | test("true")) |
       if .attributes then . else .attributes = {} end')
    
    # Create user and extract ID from response
    CREATE_OUTPUT=$(echo "$USER_DATA" | \
      docker exec -i infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create users \
        --server "$KEYCLOAK_URL" \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD" \
        --no-config \
        --target-realm "$REALM_NAME" \
        -f - 2>&1)
    
    # Extract user ID (works on both GNU and BSD grep)
    USER_ID=$(echo "$CREATE_OUTPUT" | grep -o "Created new user with id '[^']*'" | sed "s/Created new user with id '\(.*\)'/\1/" || echo "")
    
    if [ -n "$USER_ID" ]; then
      # Set password
      docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh set-password \
        --server "$KEYCLOAK_URL" \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD" \
        --no-config \
        --target-realm "$REALM_NAME" \
        --username "$USERNAME" \
        --new-password "$PASSWORD" \
        --temporary=false > /dev/null 2>&1
      
      # Enable user
      docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh update users/"$USER_ID" \
        --server "$KEYCLOAK_URL" \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD" \
        --no-config \
        --target-realm "$REALM_NAME" \
        -s enabled=true > /dev/null 2>&1
      
      # Set attributes (like tenant_id) - using correct kcadm syntax
      TENANT_ID=$(echo "$user" | jq -r '.attributes.tenant_id[0] // empty')
      if [ -n "$TENANT_ID" ]; then
        docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh update users/"$USER_ID" \
          --server "$KEYCLOAK_URL" \
          --realm master \
          --user "$KEYCLOAK_ADMIN" \
          --password "$KEYCLOAK_ADMIN_PASSWORD" \
          --no-config \
          --target-realm "$REALM_NAME" \
          -s "attributes.tenant_id=[\"$TENANT_ID\"]" > /dev/null 2>&1
      fi
      
      echo "   ✅ Created user: $USERNAME"
    else
      echo "   ⚠️  User $USERNAME may already exist or failed"
    fi
  done < <(cat "$IMPORT_DIR/users.json" | jq -c '.[]')
  echo "✅ Users imported"
fi

# Import user role mappings
echo "📦 Importing user role mappings..."
if [ -d "$IMPORT_DIR/user-roles" ] && command -v jq &> /dev/null; then
  for ROLE_FILE in "$IMPORT_DIR/user-roles"/*.json; do
    if [ -f "$ROLE_FILE" ]; then
      USERNAME=$(basename "$ROLE_FILE" .json)
      REALM_ROLES=$(cat "$ROLE_FILE" | jq -r '.realmMappings[]?.name // empty' | head -20)
      for ROLE in $REALM_ROLES; do
        docker exec infra-keycloak-1 /opt/keycloak/bin/kcadm.sh add-roles \
          --server "$KEYCLOAK_URL" \
          --realm master \
          --user "$KEYCLOAK_ADMIN" \
          --password "$KEYCLOAK_ADMIN_PASSWORD" \
          --no-config \
          --target-realm "$REALM_NAME" \
          --uusername "$USERNAME" \
          --rolename "$ROLE" > /dev/null 2>&1 || true
      done
      echo "   ✅ Mapped roles for: $USERNAME"
    fi
  done
  echo "✅ User role mappings imported"
fi

echo ""
echo "✅ Import complete!"
echo ""
if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
  echo "💾 Backup saved to: $BACKUP_DIR"
  echo "   To restore: Copy files from backup to keycloak-export/ and run this script again"
  echo ""
fi
echo "🔍 Verify configuration:"
echo "   - Admin Console: ${KEYCLOAK_URL/admin}"
echo "   - Realm: $REALM_NAME"
echo ""

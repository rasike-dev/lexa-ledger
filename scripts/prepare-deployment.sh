#!/bin/bash
set -e

# Script to prepare deployment package for production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📦 Preparing LEXA Ledger deployment package..."
echo ""

# Build all components
echo "🔨 Building frontend..."
pnpm build

echo "🔨 Building API..."
pnpm api:build

echo "🔨 Building Worker..."
pnpm worker:build

# Create deployment directory
DEPLOY_DIR="$PROJECT_ROOT/deployment-package"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "📁 Creating deployment package..."

# Copy frontend build
cp -r dist "$DEPLOY_DIR/"

# Copy API
mkdir -p "$DEPLOY_DIR/api-dist"
cp -r apps/api/dist "$DEPLOY_DIR/api-dist/"
cp -r apps/api/prisma "$DEPLOY_DIR/api-prisma/"
cp apps/api/package.json "$DEPLOY_DIR/api-package.json"

# Copy worker
mkdir -p "$DEPLOY_DIR/worker-dist"
cp -r apps/worker/dist "$DEPLOY_DIR/worker-dist/"
cp apps/worker/package.json "$DEPLOY_DIR/worker-package.json"

# Copy infrastructure files
cp -r infra "$DEPLOY_DIR/"

# Copy package files
cp package.json "$DEPLOY_DIR/"
[ -f pnpm-lock.yaml ] && cp pnpm-lock.yaml "$DEPLOY_DIR/" || cp package-lock.json "$DEPLOY_DIR/"

# Create environment template
cat > "$DEPLOY_DIR/.env.production.template" << 'EOF'
# API Environment Variables
DATABASE_URL=postgresql://lexa:YOUR_PASSWORD@postgres:5432/lexa?schema=public
NODE_ENV=production
PORT=3000
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=lexa
S3_SECRET_KEY=YOUR_SECRET_KEY
S3_BUCKET=lexa-ledger
S3_REGION=us-east-1

# Keycloak Configuration
KEYCLOAK_ISSUER=http://keycloak:8088/realms/lexa-ledger
KEYCLOAK_JWKS_URI=http://keycloak:8088/realms/lexa-ledger/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=lexa-ledger-api
EOF

echo "✅ Deployment package created in: $DEPLOY_DIR"
echo ""
echo "📋 Next steps:"
echo "   1. Review and update .env.production.template with production values"
echo "   2. Transfer deployment-package/ to your VM"
echo "   3. Follow DEPLOYMENT_GUIDE.md for deployment instructions"
echo ""
echo "💡 To create archive:"
echo "   cd deployment-package && tar -czf ../lexa-ledger-deployment-\$(date +%Y%m%d-%H%M%S).tar.gz ."

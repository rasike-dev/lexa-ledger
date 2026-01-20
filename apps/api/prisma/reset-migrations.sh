#!/bin/bash
# Reset migrations and create fresh baseline
# Usage: ./reset-migrations.sh

set -e

echo "🔄 Resetting migrations..."

cd "$(dirname "$0")"

# Backup existing migrations
if [ -d "migrations" ] && [ "$(ls -A migrations/202* 2>/dev/null)" ]; then
  BACKUP_DIR="migrations_backup_$(date +%Y%m%d_%H%M%S)"
  echo "📦 Backing up existing migrations to $BACKUP_DIR..."
  mkdir -p "$BACKUP_DIR"
  cp -r migrations/* "$BACKUP_DIR/" 2>/dev/null || true
fi

# Remove old migration directories (keep migration_lock.toml)
echo "🗑️  Removing old migration directories..."
find migrations -mindepth 1 -maxdepth 1 -type d -name "20*" -exec rm -rf {} +

echo "✨ Creating fresh baseline migration from schema..."
cd ../..  # Go to apps/api directory
pnpm prisma migrate dev --name init_baseline --create-only

echo "✅ Migration reset complete!"
echo ""
echo "Next steps:"
echo "1. Review the new migration in apps/api/prisma/migrations/"
echo "2. Apply migrations: pnpm prisma:migrate"
echo "3. Seed database: pnpm db:seed"

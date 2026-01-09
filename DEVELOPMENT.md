# Development Guide

## Quick Start

### Running with Mock Data (No Backend Required)

1. Ensure `.env.local` has `VITE_API_MODE=mock`:
```bash
echo "VITE_API_MODE=mock" >> .env.local
```

2. Start the frontend:
```bash
npm run dev
```

3. Open http://localhost:5173

### Running with Full Backend (Live Mode)

#### 1. Start Infrastructure Services

Start PostgreSQL, Redis, and MinIO:
```bash
cd infra
docker-compose up -d
```

Wait for services to be healthy:
```bash
docker-compose ps
```

#### 2. Setup API Database

```bash
cd apps/api

# Run Prisma migrations
pnpm prisma migrate dev

# Seed the database
pnpm db:seed
pnpm seed:servicing
pnpm seed:trading
pnpm seed:esg
```

#### 3. Configure API Environment

Create `apps/api/.env`:
```bash
DATABASE_URL="postgresql://lexa:lexa@localhost:5432/lexa?schema=public"
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_ACCESS_KEY_ID=lexa
AWS_SECRET_ACCESS_KEY=lexa_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=lexa-ledger
AWS_ENDPOINT=http://localhost:9000
```

#### 4. Start API Server

```bash
cd apps/api
pnpm dev
```

The API will be available at http://localhost:3000/api

#### 5. (Optional) Start Worker

```bash
cd apps/worker

# Create apps/worker/.env with same config as API
cp ../api/.env .env

pnpm dev
```

#### 6. Switch Frontend to Live Mode

Update `.env.local`:
```bash
VITE_API_MODE=live
```

#### 7. Start Frontend

```bash
# From project root
npm run dev
```

## Architecture

```
┌─────────────────┐
│   Frontend      │  Port 5173
│   (Vite/React)  │  → /api proxied to :3000
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   API Server    │  Port 3000
│   (NestJS)      │  → /api prefix
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    ↓         ↓          ↓         ↓
┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐
│Postgres│ │Redis │ │ MinIO  │ │Worker  │
│  :5432 │ │:6379 │ │ :9000  │ │        │
└────────┘ └──────┘ └────────┘ └────────┘
```

## Switching Between Mock and Live Mode

### Mock Mode (Default)
- No backend required
- Uses local mock data
- Good for UI development
- Set `VITE_API_MODE=mock` in `.env.local`

### Live Mode
- Requires full backend stack
- Real database persistence
- Document upload/processing
- Set `VITE_API_MODE=live` in `.env.local`

## Troubleshooting

### Documents not loading in live mode
- Check if API server is running: `curl http://localhost:3000/api/health`
- Check if database is accessible: `docker-compose ps` in `infra/`
- Check browser console for API errors
- Verify `.env.local` has `VITE_API_MODE=live`

### API won't start
- Ensure Docker services are running: `cd infra && docker-compose up -d`
- Check database connection in `apps/api/.env`
- Run migrations: `cd apps/api && pnpm prisma migrate dev`

### Port conflicts
- API: Change `PORT` in `apps/api/.env` and update `vite.config.ts` proxy
- Frontend: Change port in `vite.config.ts` server.port
- Postgres: Change port mapping in `infra/docker-compose.yml`

## Database Management

### Reset database
```bash
cd apps/api
pnpm prisma migrate reset
pnpm db:seed
```

### View database
```bash
cd apps/api
pnpm prisma studio
```

### Create new migration
```bash
cd apps/api
pnpm prisma migrate dev --name your_migration_name
```

## Testing API Endpoints

### Health check
```bash
curl http://localhost:3000/api/health
```

### List loans
```bash
curl http://localhost:3000/api/loans
```

### Get loan documents
```bash
curl http://localhost:3000/api/loans/{loanId}/documents
```

## Environment Variables

### Frontend (.env.local)
- `VITE_API_BASE_URL`: API base URL (default: `/api`)
- `VITE_API_MODE`: `mock` or `live` (default: `live`)
- `VITE_TENANT_ID`: Tenant identifier
- `VITE_ACTOR`: User identifier

### Backend (apps/api/.env)
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: API server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port
- `AWS_*`: S3/MinIO configuration

## Development Workflow

1. **UI-only changes**: Use mock mode, no backend needed
2. **API changes**: Start infrastructure + API, use live mode
3. **Full stack**: Start all services including worker for background jobs
4. **Testing**: Switch between mock/live to test both code paths


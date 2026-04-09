# Copilot Instructions: Circuit Social Monorepo

## Project Overview

**Circuit Social** is a multi-chain H5 social platform MVP with EVM and Solana wallet authentication. It's an NPM workspace monorepo combining a NestJS backend, Next.js frontend, and reusable SDKs.

- **Tech Stack**: Next.js 15 + Tailwind (frontend), NestJS + Socket.IO (backend), Prisma (ORM), Wagmi + Viem (Web3)
- **Deployment**: Docker-based (docker-compose.yml for local dev with PostgreSQL + Redis)
- **Testing**: Playwright (E2E) + Vitest (unit/integration)

---

## Essential Commands for Development

### Root workspace orchestration
| Task | Command |
|------|---------|
| **Dev (both servers)** | `npm run dev:web` (terminal 1) + `npm run dev:api` (terminal 2) |
| **Build all** | `npm run build` |
| **Full CI pipeline** | `npm run test:ci` (build + API tests + E2E) |
| **API tests only** | `npm run test:api` |
| **E2E tests** | `npm run test:e2e` (smoke + mobile) |
| **Real wallet tests** | `npm run test:wallet` (requires MetaMask setup) |
| **Type check** | `npm run typecheck` |

### Individual workspace commands
```bash
# API (port 4100 in test mode, 3333 in dev)
npm run start:dev --workspace @cx/api
npm run build --workspace @cx/api
npm run test --workspace @cx/api

# Web (port 3000)
npm run dev --workspace @cx/web
npm run build --workspace @cx/web

# SDK packages
npm run build --workspace @cx/sdk-js
npm run build --workspace @cx/sdk-react
```

### Key environment config
- Copy `.env.example` files from `apps/web/` and `apps/api/`
- Copy `.env.e2e.example` for E2E/wallet tests
- Feature flags in `apps/web/.env`: `NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true` (default: false)

---

## Architecture & Code Patterns

### Backend (apps/api/) — NestJS Modular Structure

**Module organization** (each has `.module.ts`, `.controller.ts`, `.service.ts`):
- `auth/`: SIWE + session guard, nonce validation, replay protection
- `did/`: Decentralized ID resolver
- `realtime/`: Socket.IO WebSocket gateway
- `identity/`, `social/`, `tenant/`: Legacy modules (complete)
- `store/`: Abstracted repository layer (in-memory by default, Prisma-ready for production)

**Key patterns**:
- Global error filter returns `{ ok: false, error, errorCode }` (see [error-codes.ts](apps/api/src/common/error-codes.ts))
- Rate limiting: 45 req/min globally via `@Throttle()`
- Helmet + CORS configured for multi-chain origins
- All routes prefixed `/api` (e.g., `/api/auth/login`)
- WebSocket events on `socket.emit()` handled by `@SubscribeMessage()` in gateway

### Frontend (apps/web/) — Next.js App Router

**Structure**:
- `app/`: Server layout with client-side providers (React Query, Wagmi context)
- `src/components/`: UI components
- `src/lib/`: Utilities and Web3 helpers
- `src/shims/`: Compatibility shimps for optional wagmi dependencies

**Key patterns**:
- Path alias `@/` from tsconfig
- Tailwind + custom CSS globals
- Wagmi hooks for wallet connection
- Socket.IO client for real-time sync

### Monorepo Setup

**Workspace declaration**: Root `package.json` declares `apps/web`, `apps/api`, `packages/*`, `examples/*`

**Naming convention**: `@cx/<package>` (cx = Circuit)

**Dependencies**:
- `@cx/sdk-js` ← core TypeScript library
- `@cx/sdk-react` ← wrapper for React (depends on sdk-js)
- `@cx/integration-demo` ← example consuming SDKs

**TypeScript config inheritance**:
- `tsconfig.base.json` (ES2022, bundler resolution)
- API extends base + CommonJS, decorators enabled
- Web extends base for Next.js

---

## Common Development Workflows

### Setting up a new feature (e.g., NestJS endpoint)

1. **Add endpoint in API**:
   - Create/modify module in `apps/api/src/<module>/`
   - Define DTO in `*.controller.ts` route handler
   - Implement business logic in `*.service.ts`
   - Add guard/middleware if needed (e.g., `session.guard.ts` for auth checks)

2. **Add frontend UI**:
   - Create component in `src/components/`
   - Use `useQuery()` from React Query to call API
   - Integrate Wagmi hooks if wallet interaction needed

3. **Test coverage**:
   - Unit/integration: `apps/api/tests/*.integration.test.ts`
   - E2E: `tests/e2e/*.spec.ts` (Playwright)

### Running tests locally

```bash
# API integration tests (requires API build first)
npm run test:api

# E2E smoke tests (requires full build + API running)
npm run test:e2e

# Specific E2E project
npx playwright test --project=mobile-smoke

# Release gate (validates build + tests)
npm run release:gate
```

### Debugging with Docker

```bash
# Start full stack locally
docker-compose up -d

# API will connect to PostgreSQL + Redis
# Check .env for `DATABASE_URL` and `REDIS_URL`
```

---

## Key Conventions & Patterns

### Error Handling
- Custom errors: `throw new BadRequestException(message)` with optional `errorCode`
- See [docs/errors/auth-error-codes.md](docs/errors/auth-error-codes.md) for auth-specific codes
- All API responses contain `ok: boolean` flag

### Authentication
- **Primary**: SIWE (Sign-In with Ethereum) — nonce exchange, verification via Viem
- **Secondary**: Solana sign verification (feature-flagged, `NEXT_PUBLIC_ENABLE_SOLANA_LOGIN`)
- Session guard: `@UseGuards(SessionGuard)` for protected routes
- Cookie-based session management with replay protection

### WebSocket (Socket.IO)
- Gateway in `realtime.gateway.ts` with namespace events
- Emitted via `socket.emit('event', data)` on server
- Client listens with `socket.on('event', handler)` in Next.js useEffect

### Data Persistence
- **Current**: In-memory store (fast local dev)
- **Production**: Switch via `StoreModule` to PostgreSQL/Redis (Prisma schema ready in `apps/api/prisma/schema.prisma`)
- Uploads currently to local `/static/uploads` (migrate to R2/S3 in production)

### Testing Patterns
- **Vitest**: Sequential execution (prevents test collisions), global setup for DB init
- **Playwright**: 90s timeout, artifacts on failure (trace/screenshot/video)
- Mobile smoke tests: `--project=mobile-smoke` using mobile viewport

---

## Workspace Structure Overview

| Folder | Purpose |
|--------|---------|
| `apps/api/` | NestJS backend (port 3333 dev / 4100 test) |
| `apps/web/` | Next.js frontend (port 3000) |
| `packages/sdk-js/` | Core TypeScript SDK |
| `packages/sdk-react/` | React wrapper over sdk-js |
| `examples/integration-demo/` | Vite-based demo app |
| `tests/e2e/` | Playwright E2E tests |
| `docs/` | Documentation (errors, roadmap, security, testing) |
| `docker-compose.yml` | Local dev DB + cache (PostgreSQL 16, Redis 7) |

---

## Potential Pitfalls

❌ **Store layer assumptions**: Don't assume data persists between restarts in local dev (in-memory by default). Use Docker if testing in-memory + Redis behavior.

❌ **Cross-origin issues**: All SIWE origins must match `WEB_ORIGIN` env var. Check [web-origins.ts](apps/api/src/common/web-origins.ts) for validation.

❌ **Test isolation**: Always run `npm run build` before `npm run test` (Vitest needs compiled .js in dist/). API tests are sequential for stability.

❌ **Monorepo package resolution**: Use `--workspace @cx/<package>` syntax; npm may not resolve workspaces correctly without explicit flag.

❌ **Wallet binding**: SIWE + Solana are distinct auth flows. Solana binding is feature-flagged; check `NEXT_PUBLIC_ENABLE_SOLANA_LOGIN` before testing that flow.

---

## For AI Agents: Productivity Checklist

When implementing a feature:

- [ ] **API side**: Confirm module exists or create new module + controller + service
- [ ] **Error codes**: Check [error-codes.ts](apps/api/src/common/error-codes.ts); add new enum if needed
- [ ] **Sessions/Auth**: Use `@UseGuards(SessionGuard)` if endpoint requires auth
- [ ] **Frontend**: Wire up React Query `useQuery()` or `useMutation()` to new endpoint
- [ ] **Real-time**: If WebSocket event needed, emit from `realtime.gateway.ts` and listen in component
- [ ] **Tests**: Add Vitest integration test in `apps/api/tests/`; add Playwright E2E in `tests/e2e/`
- [ ] **Env vars**: Document new configs in `.env.example` files
- [ ] **Type checking**: Run `npm run typecheck` (must pass before commit)
- [ ] **Build**: Run `npm run build` (catches monorepo issues)

---

## Documentation Links

- **Architecture & Errors**: [docs/errors/auth-error-codes.md](docs/errors/auth-error-codes.md)
- **Testing & Setup**: [docs/testing/wallet-setup.md](docs/testing/wallet-setup.md)
- **Release Process**: [docs/release-checklist.md](docs/release-checklist.md)
- **Security**: [docs/security-checklist.md](docs/security-checklist.md)
- **Roadmap**: [docs/roadmap/platformization-12w.md](docs/roadmap/platformization-12w.md)

---

## Quick Start for New Contributors

1. `npm install` 
2. Copy `.env.example` files: `cp apps/web/.env.example apps/web/.env` (repeat for api)
3. `npm run dev:web` (terminal 1) + `npm run dev:api` (terminal 2)
4. Open `http://127.0.0.1:3000` → connect your EVM wallet via Wagmi
5. Run `npm run test:ci` to validate everything builds and tests pass

# syntax=docker/dockerfile:1
# Monorepo: shared `deps` stage runs `npm ci` once; api/web builders branch from it.
# Build: `docker compose build` or `docker build -f Dockerfile --target api .`

FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/sdk-js/package.json packages/sdk-js/package.json
COPY packages/sdk-react/package.json packages/sdk-react/package.json
COPY examples/integration-demo/package.json examples/integration-demo/package.json

# BuildKit: speeds repeated builds locally/CI when lockfile unchanged
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM deps AS api-builder

COPY . .
RUN npm run build --workspace @cx/api

FROM node:20-alpine AS api

WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# 必须从 api-builder 复制 node_modules：`prisma generate` 在 build 时写入
# `node_modules/.prisma` 与 `@prisma/client`；deps 阶段仅有 `npm ci`，无生成产物。
COPY --from=api-builder /app/node_modules node_modules
COPY --from=deps /app/package.json package.json
COPY --from=deps /app/package-lock.json package-lock.json
COPY --from=api-builder /app/apps/api/dist apps/api/dist
COPY --from=api-builder /app/apps/api/package.json apps/api/package.json
COPY --from=api-builder /app/apps/api/prisma apps/api/prisma

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "@cx/api"]

FROM deps AS web-builder

ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
ARG INTERNAL_API_ORIGIN=http://127.0.0.1:4000
ENV NEXT_PUBLIC_API_ORIGIN=${NEXT_PUBLIC_API_ORIGIN}
ENV INTERNAL_API_ORIGIN=${INTERNAL_API_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build --workspace @cx/web

FROM node:20-alpine AS web

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
ENV NEXT_PUBLIC_API_ORIGIN=${NEXT_PUBLIC_API_ORIGIN}

ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/package.json package.json
COPY --from=deps /app/package-lock.json package-lock.json
COPY --from=web-builder /app/apps/web/.next apps/web/.next
COPY --from=web-builder /app/apps/web/package.json apps/web/package.json
COPY --from=web-builder /app/apps/web/next.config.ts apps/web/next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@cx/web", "--", "--port", "3000"]

# Hugging Face Spaces default build target is the LAST stage in Dockerfile.
# Keep this stage at the end so HF can run Web + API in one container on port 7860.
FROM node:20-alpine AS hf

WORKDIR /app

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NEXT_TELEMETRY_DISABLED=1

ENV PORT=7860
ENV API_PORT=4000
ENV NEXT_PUBLIC_API_ORIGIN=same-origin
ENV INTERNAL_API_ORIGIN=http://127.0.0.1:4000
ENV WEB_ORIGIN=https://localhost
ENV ALLOW_IN_MEMORY_STORE_IN_PRODUCTION=1

# Include Prisma-generated artifacts from api-builder node_modules.
COPY --from=api-builder /app/node_modules node_modules
COPY --from=deps /app/package.json package.json
COPY --from=deps /app/package-lock.json package-lock.json

COPY --from=api-builder /app/apps/api/dist apps/api/dist
COPY --from=api-builder /app/apps/api/package.json apps/api/package.json
COPY --from=api-builder /app/apps/api/prisma apps/api/prisma

COPY --from=web-builder /app/apps/web/.next apps/web/.next
COPY --from=web-builder /app/apps/web/package.json apps/web/package.json
COPY --from=web-builder /app/apps/web/next.config.ts apps/web/next.config.ts

COPY --from=api-builder /app/scripts scripts
RUN chmod +x /app/scripts/start-hf.sh

EXPOSE 7860
CMD ["/app/scripts/start-hf.sh"]

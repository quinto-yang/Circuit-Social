# Docker 部署流程

本文说明使用仓库根目录 [docker-compose.yml](../docker-compose.yml) 在本地或单机环境拉起 **PostgreSQL**、**Redis**、**API（NestJS）**、**Web（Next.js）**。

## 架构与启动顺序

| 服务 | 说明 |
|------|------|
| `postgres` | PostgreSQL 16，持久化卷 `postgres_data` |
| `redis` | Redis 7，持久化卷 `redis_data` |
| `db-init` | 一次性任务：执行 `prisma migrate deploy`，成功后退出（`Exited` 是正常） |
| `api` | 镜像 `wx-api`，容器内端口 `4000`，探活 `GET /api/health` |
| `web` | 镜像 `wx-web`，容器内端口 `3000`，依赖 API 健康后启动 |

依赖关系：`postgres`/`redis` 健康 -> `db-init` 成功 -> `api` 健康 -> `web`。

## 前置条件

- 已安装 **Docker** 与 **Docker Compose**（Docker Desktop 需运行中）。
- 默认占用端口：`3000`（Web）、`4000`（API）。

## 快速部署

1. 复制环境变量（可选）：

```bash
cp .env.docker.example .env
```

2. 构建并启动：

```bash
docker compose up --build -d
```

3. 验证：

```bash
curl -sS http://127.0.0.1:4000/api/health
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
docker compose ps
```

期望：`/api/health` 返回 `{"ok":true}`，Web 返回 `200`。

## 重建策略

日常代码改动推荐：

```bash
docker compose up --build -d
```

完全无缓存重建（仅排查疑难时）：

```bash
docker compose build --no-cache
docker compose up -d --force-recreate
```

## 环境变量要点

- `WEB_ORIGIN`：前端来源地址（默认 `http://localhost:3000`）。
- `NEXT_PUBLIC_API_ORIGIN`：前端请求 API 根地址（默认 `http://localhost:4000`，前端会再拼接 `/api`）。
- `WEB_HOST_PORT` / `API_HOST_PORT`：宿主机端口映射。
- `DATABASE_URL`：需与 `POSTGRES_*` 一致。

## 数据与卷

Postgres/Redis 使用命名卷。仅在本地可丢数据场景下，才执行：

```bash
docker compose down -v
docker compose up -d --build
```

`down -v` 会删除数据库与 Redis 数据。

## 常见问题

### `db-init` 显示 Exited

正常。它是一次性迁移任务，执行完会退出。

### `db-init` 报 `P3005`

表示库不为空且迁移历史不匹配。可本地清空卷重跑，或按 [Prisma baseline](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) 对齐历史。

### API 报 `@prisma/client did not initialize yet`

说明运行镜像缺少 `prisma generate` 产物。当前 [Dockerfile](../Dockerfile) 已修复为从 `api-builder` 复制 `node_modules`；若你本地仍旧镜像，请执行：

```bash
docker compose build --no-cache api
docker compose up -d
```

### Web 一直加载

优先确认 API 已启动并健康，且 `NEXT_PUBLIC_API_ORIGIN` 指向正确地址。修改该变量后必须重建 `web` 镜像。

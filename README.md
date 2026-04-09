---
title: Wx
emoji: 🚀
colorFrom: yellow
colorTo: yellow
sdk: docker
pinned: false
license: apache-2.0
short_description: 链上wx
---

# Circuit Social

多链社交 H5 MVP。项目采用 `Next.js 15 + Tailwind + wagmi + SIWE` 前端和 `NestJS + WebSocket` 后端，保留“链上身份 + 安全会话”入口，同时把第一版重心放在社交闭环。

## 已实现

- SIWE 登录入口与多链 EVM 钱包连接配置
- Cookie Session、Nonce、防重放基础校验
- 个人资料页与多钱包绑定入口
- 好友申请、好友列表、私聊创建
- 群聊创建、加入、群成员、群主踢人/禁言/退群
- 消息列表、发送消息、未读刷新、Socket.IO 实时推送、轮询降级
- 朋友圈动态、图片上传、举报入口
- 安全头、基础限流、审计日志骨架、统一错误 JSON 响应
- Solana 登录/绑定验签链路（受服务端运行时开关与 `GET /api/public-config` 控制）
- SaaS 应用配置扩展：域名白名单、回调地址、链策略、品牌配置、租户密钥轮换
- PostgreSQL Prisma schema 预留，当前默认使用内存仓储以便本地快速运行

## 当前实现边界

- `apps/api/prisma/schema.prisma` 已完整建模，但运行时默认仍是内存存储；生产环境切 PostgreSQL/Redis 需要继续接仓储层。
- 图片上传当前为本地磁盘适配器，生产应切换到 R2/S3。
- 前端保留 WalletConnect 配置入口，但未做 Reown AppKit UI 封装。
- Web 端已对 `wagmi` 依赖树中的可选模块做 shim 兼容，默认 `typecheck/build` 不再出现相关 warning。

## 目录

- `apps/web`: Next.js 移动端 H5
- `apps/api`: NestJS API + WebSocket
- `apps/api/prisma/schema.prisma`: 生产用数据模型草案
- `项目截图`: 参考截图素材

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 启动 API

```bash
npm run start:dev --workspace @cx/api
```

3. 启动 Web

```bash
npm run dev --workspace @cx/web
```

4. 生产构建

```bash
npm run build --workspace @cx/api
npm run build --workspace @cx/web
```

## Docker 部署

仓库根目录 [docker-compose.yml](docker-compose.yml) 与 [Dockerfile](Dockerfile)（多阶段：共享 **`deps` 层只跑一次 `npm ci`**，再分别产出 `api` / `web` 镜像）一键拉起 **Postgres 16**、**Redis 7**、**API**（`wx-api`）、**Web**（`wx-web`）；`db-init` 在 API 启动前执行 **`prisma migrate deploy`**。

日常构建请勿使用 `docker compose build --no-cache`（会强制重跑依赖安装，CI/本地都会很慢）；依赖未改时优先直接 `docker compose up --build` 利用层缓存。详见 [docs/docker-deployment.md](docs/docker-deployment.md#构建加速与重建策略)。

**快速启动**

```bash
cp .env.docker.example .env   # 可选
docker compose up --build
```

- Web：`http://localhost:3000` · API：`http://localhost:4000` · API 探活：`GET http://localhost:4000/api/health`

**完整流程**（架构说明、重建镜像、环境变量、P3005 与卷、生产注意）见 **[docs/docker-deployment.md](docs/docker-deployment.md)**。

**Hugging Face Spaces（Docker）部署**见 **[docs/huggingface-docker.md](docs/huggingface-docker.md)**。

**摘要**

- 可复制 [.env.docker.example](.env.docker.example) 为 `.env` 自定义端口与域名相关变量。
- 修改 `NEXT_PUBLIC_API_ORIGIN` 后须重新 **`docker compose up --build`**（前端构建期注入）。
- `apps/api` 在 Docker 中已注入 `DATABASE_URL`，使用 Prisma 持久化；非 Docker 本地开发未设置时仍可退回内存模式。

## 环境变量

- 复制 [apps/web/.env.example](apps/web/.env.example)
- 复制 [apps/api/.env.example](apps/api/.env.example)
- E2E 和真钱包测试环境复制 [`.env.e2e.example`](.env.e2e.example)

**前端（构建/开发）**

- `NEXT_PUBLIC_API_ORIGIN`：浏览器请求 API 的根地址（Docker/本地均可用 `http://127.0.0.1:4000`）
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`、`NEXT_PUBLIC_APP_NAME` 等：WalletConnect 与构建时展示名；**运行时站点名、广告位、Solana 是否开放** 以 `GET /api/public-config` 为准，可在 [后台 `/admin`](apps/web/app/admin/page.tsx) 配合 `ADMIN_TOKEN` 调整

**API（服务端）**

- `ENABLE_SOLANA_LOGIN`、`ADS_ENABLED`、`APP_PUBLIC_NAME`：进程启动或测试 reset 时初始化内存中的站点公开配置；运行中可通过 Admin `POST /api/admin/site-settings` 覆盖，**重启后再次以环境变量为准**
- `ADMIN_TOKEN`：管理后台 Bearer；未设置时默认使用 `123`（建议首次登录后立即在 `/admin` 轮换）
- `WEB_ORIGIN`、`PORT`：CORS/ cookie 等与部署相关
- 启动时会执行基础环境变量校验（`DATABASE_URL`/`WEB_ORIGIN` URL 格式、`ENABLE_SOLANA_LOGIN` 布尔值语义）；生产环境未配置 `DATABASE_URL` 会直接启动失败

## SSR / Hydration 注意事项

- 主题与初始化脚本必须保证 SSR 与客户端输出一致（避免 hydration mismatch）
- 任何 `window` / `localStorage` 访问放入 `useEffect`，或先做 `typeof window === "undefined"` 守卫
- 避免无效 HTML 结构（例如 `<button>` 嵌套 `<button>`），这会触发客户端重建和 hydration warning
- 新组件合入前建议至少执行一次 `npm run build --workspace @cx/web`，提前暴露 SSR 与类型问题

## 后台管理文档

后台管理能力（鉴权、配置、审计日志筛选/分页/导出、密钥轮换等）见：

- [docs/admin-console.md](docs/admin-console.md)

## 测试

```bash
npm run test:api
npm run test:e2e
npm run e2e:demo
npm run release:gate
npm run test:ci
```

真钱包自动化：

```bash
npm run test:wallet
```

- `test:api`：Vitest API 集成测试 + 上传服务测试
- `test:e2e`：Playwright 无钱包烟测
- `e2e:demo`：SDK integration-demo 烟测
- `test:ci`：`build + test:api + smoke e2e`
- `release:gate`：发布门禁（默认含 demo e2e，可通过 `-- --no-demo` 关闭）
- `test:wallet`：`Chrome + MetaMask` 真钱包链路，默认不进 CI

钱包自动化环境准备见 [docs/testing/wallet-setup.md](docs/testing/wallet-setup.md)。

## 认证错误码（Auth Error Codes）

认证错误码清单、前端映射策略与新增 checklist 见：

- [docs/errors/auth-error-codes.md](docs/errors/auth-error-codes.md)

## 版本分层与授权

- 授权策略与开源/商业边界：`docs/licensing.md`
- 社区版/商业版能力矩阵：`docs/edition-matrix.md`

## 发布与安全清单

- 安全审计检查清单：`docs/security-checklist.md`
- 发布准备检查清单：`docs/release-checklist.md`

## 后续优先事项

1. 将 `MemoryStoreService` 抽象到 Prisma + Redis 仓储实现。
2. 将本地上传切到 R2/S3，增加 presign 上传与压缩链路。
3. 增加真正的多钱包解绑、后台审核页和消息搜索。
4. 替换 `window.alert/confirm/prompt` 为统一的移动端模态组件。

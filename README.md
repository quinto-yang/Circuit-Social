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
- Solana 登录/绑定验签链路（受前端开关控制）
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

## 环境变量

- 复制 [apps/web/.env.example](/Users/quinto/Desktop/Project/wx/apps/web/.env.example)
- 复制 [apps/api/.env.example](/Users/quinto/Desktop/Project/wx/apps/api/.env.example)
- E2E 和真钱包测试环境复制 [/.env.e2e.example](/Users/quinto/Desktop/Project/wx/.env.e2e.example)
- 前端灰度开关：
  - `NEXT_PUBLIC_ADS_ENABLED=true` 开启广告位占位
  - `NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true` 开启 Solana 登录/绑定入口（默认关闭，灰度控制）

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

钱包自动化环境准备见 [wallet-setup.md](/Users/quinto/Desktop/Project/wx/docs/testing/wallet-setup.md)。

## 认证错误码（Auth Error Codes）

认证错误码清单、前端映射策略与新增 checklist 见：

- [docs/errors/auth-error-codes.md](/Users/quinto/Desktop/Project/wx/docs/errors/auth-error-codes.md)

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

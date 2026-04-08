# CX-like 平台化 12 周路线图

目标：从“单应用社交产品”升级为“可被第三方 DApp 集成的身份与会话服务”。

## W1-W2: 架构抽象与多链基础

- 抽象 `ChainAdapter` 接口（签名消息、地址校验、链标识映射）
- 保留 EVM 现有登录链路，新增 Solana 适配器骨架
- 用户模型补充多链主身份策略（primary identity by tenant）
- 交付：
  - `apps/api/src/identity/adapters/`（evm + solana）
  - `apps/api/src/identity/identity.service.ts`
  - 单测：地址校验、签名载荷构建

## W3-W4: Solana 登录 + 统一会话

- 实现 Solana 钱包登录（Sign-In with Solana）
- 后端统一发放会话（同一 cookie/session 模型）
- 前端登录 UI 支持链切换（EVM / Solana）
- 交付：
  - API: `POST /auth/nonce` 支持 `chainType`
  - API: `POST /auth/verify` 支持 Solana 验签
  - Web: 登录页链选择 + 失败兜底

## W5-W6: DID (did:ethr) 集成

- 新增 DID 解析服务（只读解析 + 缓存）
- 用户资料可绑定 DID URI
- 会话页展示 DID 状态（可解析 / 解析失败）
- 交付：
  - `apps/api/src/did/did-resolver.service.ts`
  - API: `GET /did/resolve?uri=...`
  - 解析缓存 + TTL

## W7-W8: SDK MVP（JS + React）

- 提供 `@cx/identity-sdk`:
  - `init`
  - `login`
  - `getSession`
  - `logout`
  - `bindWallet`
- React hooks:
  - `useCxAuth`
  - `useCxSession`
- 交付：
  - `packages/sdk-js/`
  - `packages/sdk-react/`
  - 示例 DApp：`examples/integration-demo`

## W9-W10: SaaS 化（多租户）

- 租户模型：`tenant`, `tenant_domain`, `tenant_keys`, `tenant_branding`
- 应用接入配置：域名白名单、回调地址、链策略
- 基础管理后台（只做最小可用）
- 交付：
  - API: `POST /tenant/apps`
  - API: `POST /tenant/apps/:id/domains`
  - Web Admin: 应用配置页

## W11: 开源/商业版分层

- 社区版模块边界定义
- 商业能力插件化（VC、审计、SLA 能力位）
- License 与文档策略确定
- 交付：
  - `docs/licensing.md`
  - `docs/edition-matrix.md`

## W12: 稳定性与发布准备

- 安全审计清单（签名重放、nonce、跨域、租户隔离）
- E2E 全链路（EVM + Solana + SDK Demo）
- 发布流程与版本策略
- 交付：
  - `docs/release-checklist.md`
  - `docs/security-checklist.md`

---

## 首周可执行任务（马上开工）

1. 新建 `identity` 模块并定义 `ChainAdapter` 接口
2. 把现有 EVM 登录逻辑迁移到 `EvmAdapter`
3. 给 `auth/nonce` 与 `auth/verify` 增加 `chainType` 参数（默认 `evm`）
4. 补 `identity` 模块单测（地址校验、payload 构建、nonce 场景）
5. 前端登录页增加链选择 UI（暂只启用 EVM，Solana 标注“即将支持”）

## 风险与建议

- 先保证 EVM 回归稳定，再并入 Solana，避免双链同时改动带来的回归成本
- DID 与 SDK 不要阻塞主登录链路，全部做可选增强能力
- SaaS 多租户务必优先做域名校验和回调白名单，先防误配置与越权

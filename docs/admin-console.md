# 后台管理功能文档

本文汇总 `Web /admin` 与 `API /api/admin/*` 的已实现能力、操作流程与接口说明，用于产品运营、测试与开发协作。

## 1. 功能总览

后台管理页当前支持：

- 管理鉴权（Bearer / `X-Admin-Token`）
- 管理密钥轮换（首次默认 `123`，登录后可改）
- 站点运行时配置管理（branding/support/banner/discover/features）
- 公开配置联动预览（`GET /api/public-config`）
- 运行概览（用户、会话、消息、举报、审计条数等）
- 审计日志查询（筛选、分页）与当前页 CSV 导出

核心文件：

- 前端页：`apps/web/app/admin/page.tsx`
- 鉴权与接口：`apps/api/src/admin/admin.controller.ts`
- 管理鉴权 Guard：`apps/api/src/admin/admin-auth.guard.ts`
- 管理 token 服务：`apps/api/src/admin/admin-token.service.ts`

## 2. 鉴权与密钥机制

### 2.1 管理接口鉴权

- 所有 `GET/POST /api/admin/*` 受 `AdminAuthGuard` 保护
- 支持两种传递方式：
  - `Authorization: Bearer <token>`
  - `X-Admin-Token: <token>`

错误码：

- `ADMIN_UNAUTHORIZED`：未提供或密钥错误（HTTP 401）

### 2.2 默认密钥与轮换

- 服务端未设置 `ADMIN_TOKEN` 时，默认密钥为 `123`
- `/admin` 页面首次会默认填入 `123`
- 建议首次登录后立即调用“更新管理密钥”进行轮换

接口：

- `GET /api/admin/auth-state` -> `{ ok, usingDefaultToken }`
- `POST /api/admin/token` -> 更新密钥
  - `ADMIN_TOKEN_EMPTY`：新密钥为空
  - `ADMIN_TOKEN_TOO_SHORT`：新密钥长度不足（<4）

## 3. 站点配置管理

### 3.1 读写接口

- `GET /api/admin/site-settings`
  - 返回完整公开配置 + `meta.updatedAt`
- `POST /api/admin/site-settings`
  - 支持结构化 payload（`features/branding/support/discover/banners`）
  - 兼容部分旧字段映射
  - 返回更新后的配置 + `meta.updatedAt`

### 3.2 前端操作体验优化

- 自动尝试加载：读取到本地 token 后自动拉取管理数据
- 保存前校验：
  - email 格式
  - 主题色 Hex 格式
  - URL 合法性
  - Lounge 行格式（`名称|成员数|中文状态|英文状态`）
- 保存按钮状态：
  - 无变更：禁用并显示“暂无变更”
  - 有校验错误：禁用并显示错误列表
- 保存后展示“最近保存时间”

## 4. 公开配置联动

主应用通过 `GET /api/public-config` 获取运行时配置，后台写入后前端刷新即可生效：

- 站点名、客服信息
- Solana 开关
- Banner 槽位
- Discover 标签、Lounge、卡片、热榜配置

## 5. 运行概览

接口：`GET /api/admin/overview`

用于快速运维观察内存仓储状态（本地/测试环境），包括：

- users / wallets / activeSessions
- conversations / messages / moments
- friendRequestsPending / reports / tenantApps / auditLogEntries

## 6. 审计日志

### 6.1 查询接口

`GET /api/admin/audit-logs` 支持参数：

- `limit`：每页条数（1-100）
- `offset`：偏移量
- `action`：动作模糊筛选
- `targetType`：目标类型模糊筛选
- `startAt`：起始时间（ISO）
- `endAt`：结束时间（ISO）

返回：

- `items`：当前页数据（新在前）
- `total`：总条数
- `offset` / `limit`

### 6.2 前端能力

- 条件筛选（action/type/time）
- 分页切换（上一页/下一页）
- 当前页 CSV 导出（前端生成）

## 7. 推荐操作流程

1. 打开 `/admin`
2. 使用默认密钥 `123` 或自定义密钥加载数据
3. 若提示默认密钥，先执行“更新管理密钥”
4. 修改站点配置并保存，确认“最近保存时间”
5. 在“公开配置预览”或主应用侧验证生效
6. 在“审计日志”按 action/type/time 检索并导出留档

## 8. 验证命令

```bash
npm run test --workspace @cx/api -- admin.integration.test.ts
npm run build --workspace @cx/web
```

---

如需继续增强，建议下一步增加：

- 审计日志“导出全部筛选结果”
- 审计日志快捷时间范围（最近 1h / 24h / 7d）
- 配置操作变更 diff 展示

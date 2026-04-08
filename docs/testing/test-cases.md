# CX 社交 H5 测试用例

## 概述
- 目标：覆盖认证、关系链、聊天、群聊、朋友圈、资料和回归问题。
- 测试层次：`API 集成`、`Playwright 无钱包烟测`、`MetaMask 真钱包自动化`、`手工回归`。
- 种子数据：`Circuit Concierge`、`Atlas Research`、官方群邀请码 `C8X6J2QH`。

## API 集成
| 编号 | 标签 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- |
| API-AUTH-001 | `auth` | 无 | 调用 `POST /api/auth/nonce`，传合法地址与 `8453` | 返回 `nonce/issuedAt/expiresAt` |
| API-AUTH-002 | `auth` | 无 | 调用 `POST /api/auth/nonce`，传非法地址 | 返回 `400` 与 `钱包地址无效` |
| API-AUTH-003 | `auth` | 无 | 调用 `POST /api/auth/nonce`，传不支持链 | 返回 `400` 与 `暂不支持该链` |
| API-AUTH-004 | `auth` | 有合法 nonce | 生成合法 SIWE 签名并调用 `POST /api/auth/verify` | 返回 cookie、用户信息和钱包列表 |
| API-AUTH-005 | `auth` | 已成功登录一次 | 使用相同消息再次调用 `/api/auth/verify` | 返回 `401` 与 `Nonce 无效或已过期` |
| API-AUTH-006 | `auth` | 有合法 nonce | 使用错误签名调用 `/api/auth/verify` | 返回 `401` 与 `SIWE 验证失败` |
| API-AUTH-007 | `auth` | 已登录 | 调用 `GET /api/me` 后执行 `POST /api/auth/logout` | 登出成功，后续 `GET /api/me` 返回 `user=null` |
| API-SOCIAL-001 | `social` | fresh-user 会话 | 调用 `GET /api/friends`、`GET /api/conversations` | 自动拥有 Concierge 好友、欢迎私聊和 `Circuit Lounge` |
| API-SOCIAL-002 | `social` | fresh-user 与 guide 会话 | fresh-user 通过用户 ID 发好友申请，guide 接受，再两次创建 DM | 两次返回同一私聊会话 |
| API-SOCIAL-003 | `social` | fresh-user 会话 | 通过钱包地址向 guide 发好友申请，再重复发送 | 第二次返回 `好友申请已存在` |
| API-SOCIAL-004 | `social` | fresh-user 会话 | 创建群聊并调用 `POST /api/groups/join` 输入 `C8X6J2QH` 和非法邀请码 | 合法邀请码成功，非法邀请码失败 |
| API-MSG-001 | `realtime` | fresh-user 与 guide 会话 | guide 向官方群发送消息，fresh-user 查询会话未读，再调用 `messages/read` | 未读数先增后清零 |
| API-MSG-002 | `realtime` | concierge 与 fresh-user 会话 | concierge 禁言 fresh-user，fresh-user 发言失败，再解禁后重试 | 禁言时报错，解禁后发送成功 |
| API-CONTENT-001 | `content` | fresh-user 会话 | 上传文本文件到 `POST /api/uploads/image` | 返回 `仅支持图片上传` |
| API-CONTENT-002 | `content` | fresh-user 会话 | 上传超过 3MB 的图片 | 返回 `图片不能超过 3MB` |
| API-CONTENT-003 | `content` | fresh-user 会话 | 上传合法图片并发布动态，再拉取动态列表 | 新动态立即出现在列表 |
| API-CONTENT-004 | `content` | fresh-user 会话 | 举报一条非本人动态 | 返回举报记录 |
| API-PROFILE-001 | `profile` | fresh-user 会话且已绑定第二钱包 | 更新昵称、简介、头像和主钱包 | 资料展示与主钱包同步更新 |

## Playwright 无钱包烟测
| 编号 | 标签 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- |
| UI-SMOKE-001 | `regression` | `/api/test/session` fresh-user | 进入 `Circuit Concierge` 私聊后点击返回 | 返回会话列表且页面响应正常 |
| UI-SMOKE-002 | `regression` | `/api/test/session` fresh-user | 在欢迎私聊发送文本并刷新页面 | 消息始终只有一条 |
| UI-SMOKE-003 | `social` | `/api/test/session` fresh-user | 进入 `Circuit Lounge` 并打开群管理 | 能看到成员抽屉与群号 `C8X6J2QH` |
| UI-SMOKE-004 | `content` | `/api/test/session` fresh-user | 发布一条纯文本动态并修改昵称/简介 | 动态成功出现，资料页显示新昵称 |
| UI-MOBILE-001 | `mobile` | 未登录态，iPhone 小屏视口 | 打开首页并检查登录主按钮位置 | 无需滚动即可看到并点击登录按钮 |
| UI-MOBILE-002 | `mobile` | 未登录态，iPhone 小屏视口 | 打开首页并切换钱包选项 | 品牌头、钱包选项和主按钮都保持在首屏可见范围内 |

## MetaMask 真钱包自动化
| 编号 | 标签 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- |
| UI-WALLET-001 | `wallet` | Chrome + MetaMask 扩展 + 测试助记词 | 导入钱包并连接站点完成签名登录 | 成功进入已登录态 |
| UI-WALLET-002 | `wallet` | 已登录 | 验证欢迎私聊和官方群可见 | 页面显示 `Circuit Concierge` 与 `Circuit Lounge` |
| UI-WALLET-003 | `wallet` | 已登录 | 在欢迎私聊发消息并刷新页面 | 消息只显示一条且可持久化 |
| UI-WALLET-004 | `wallet` | 已登录 | 从“我的”页退出登录 | 页面恢复未登录态 |

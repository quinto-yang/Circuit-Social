# Wallet E2E Setup

## 目标

- 在本地运行 `Chrome + MetaMask` 真钱包自动化。
- 覆盖 `连接钱包 -> SIWE 签名登录 -> 进入欢迎私聊/官方群 -> 发消息 -> 退出登录`。

## 前置条件

- 已执行 `npm install`
- 已执行 `npx playwright install chromium`
- 有一份可导入的 MetaMask 测试助记词
- 有 MetaMask unpacked extension 目录

## 环境文件

1. 复制根目录模板

```bash
cp .env.e2e.example .env.e2e.local
```

2. 填入以下字段

- `E2E_BASE_URL`
- `E2E_API_URL`
- `E2E_METAMASK_EXTENSION_PATH`
- `E2E_METAMASK_SEED_PHRASE`
- `E2E_METAMASK_PASSWORD`
- `E2E_CHAIN=base`

`playwright.config.ts` 会优先读取 `.env.e2e.local`，其次读取 `.env.e2e`。

## 获取 MetaMask unpacked extension

一种稳定做法：

1. 在 Chrome 打开 `chrome://extensions`
2. 打开“开发者模式”
3. 安装或定位 MetaMask 扩展
4. 从本机扩展目录找到对应版本文件夹
5. 将该目录解压或复制为一个固定的 unpacked 目录
6. 把该绝对路径写入 `E2E_METAMASK_EXTENSION_PATH`

如果你已经有团队内固定版本的 MetaMask 测试包，直接复用那份更稳。

## 运行方式

```bash
npm run test:wallet
```

如果环境变量未提供，`wallet-metamask` 套件会被跳过，不会误报失败。

## 当前覆盖

- 导入 MetaMask 助记词
- 连接 dApp
- 执行 SIWE 签名登录
- 进入 `Circuit Concierge` 和 `Circuit Lounge`
- 发送一条消息并刷新校验不重复
- 退出登录后回到未登录态

## 失败产物

失败时会保留：

- `test-results/**/wallet-failure.png`
- `test-results/**/wallet-trace.zip`
- 浏览器控制台日志附件

## 注意事项

- 只使用测试钱包或小额地址
- 真钱包自动化不放进默认 CI
- 如果 MetaMask UI 版本升级导致 `data-testid` 变化，需要同步更新 [fixtures.ts](/Users/quinto/Desktop/Project/wx/tests/e2e/wallet/fixtures.ts)

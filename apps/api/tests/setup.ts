import "reflect-metadata";

/** 集成测试默认开启 Solana 能力（与生产可通过 ENABLE_SOLANA_LOGIN 关闭区分） */
process.env.ENABLE_SOLANA_LOGIN = "true";

/** 子进程测试 API 会继承该变量，供 /api/admin/* 集成测试使用 */
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "test-admin-token-for-ci";

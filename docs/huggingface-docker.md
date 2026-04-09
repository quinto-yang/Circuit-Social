# Hugging Face Docker 部署

本项目提供 `Dockerfile.hf`，用于在 Hugging Face Spaces（Docker 模式）单容器部署 **Web + API**：

- 外部暴露端口：`$PORT`（默认 `7860`）
- 容器内部：Web 监听 `$PORT`，API 监听 `4000`
- 前端以 `same-origin` 访问 `/api/*`，由 Next.js rewrite 转发到内部 API（`127.0.0.1:4000`）

## 1) Space 配置

- Space 类型：**Docker**
- Root Dockerfile：`Dockerfile.hf`

## 2) 关键环境变量（Space Settings）

- `PORT=7860`（通常 HF 会自动注入，可不填）
- `WEB_ORIGIN=https://<your-space-subdomain>.hf.space`
- `DATABASE_URL=postgresql://...`（如使用外部 Postgres）
- `ADMIN_TOKEN=...`（建议设置）

可选：

- `INTERNAL_API_ORIGIN=http://127.0.0.1:4000`（默认即可）
- `NEXT_PUBLIC_API_ORIGIN=same-origin`（默认即可）

## 3) 本地模拟构建（可选）

```bash
docker build -f Dockerfile.hf -t wx-hf .
docker run --rm -p 7860:7860 \
  -e WEB_ORIGIN=http://localhost:7860 \
  -e NEXT_PUBLIC_API_ORIGIN=same-origin \
  wx-hf
```

访问：`http://localhost:7860`

## 4) 常见问题

### 页面一直 Loading

- 检查 Space 日志中 API 是否启动成功
- 确认 `NEXT_PUBLIC_API_ORIGIN` 为 `same-origin`
- 确认 `WEB_ORIGIN` 与实际 Space 域名一致

### API 连接失败

- 确认 `DATABASE_URL` 有效（若需要 DB 持久化）
- 如仅演示可不配置 DB，服务会回退到内存模式（部分功能重启后不持久）

### CORS / Cookie 异常

- `WEB_ORIGIN` 必须匹配真实访问域名（含协议）

export const defaultWebOrigins = ["http://127.0.0.1:3000", "http://localhost:3000"];

export function resolveAllowedWebOrigins() {
  if (!process.env.WEB_ORIGIN) {
    return defaultWebOrigins;
  }
  const configured = process.env.WEB_ORIGIN.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set([...configured, ...defaultWebOrigins]));
}

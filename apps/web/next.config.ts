import type { NextConfig } from "next";
import path from "node:path";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://127.0.0.1:4000";
const localApiOrigins = ["http://127.0.0.1:4000", "http://localhost:4000"];
const distDir = process.env.NEXT_DIST_DIR ?? ".next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: http: https:",
      `connect-src 'self' ${[apiOrigin, ...localApiOrigins].join(" ")} ws: wss: https://rpc.walletconnect.com https://explorer-api.walletconnect.com`,
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  }
];

const nextConfig: NextConfig = {
  distDir,
  reactStrictMode: true,
  transpilePackages: [],
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@react-native-async-storage/async-storage"] = path.resolve(
      __dirname,
      "src/shims/async-storage.ts"
    );
    config.resolve.alias["pino-pretty"] = path.resolve(__dirname, "src/shims/pino-pretty.ts");
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;

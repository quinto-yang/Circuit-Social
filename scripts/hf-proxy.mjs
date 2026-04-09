import http from "node:http";

const port = Number(process.env.PORT ?? 7860);
const apiPort = Number(process.env.API_PORT ?? 4000);
const webPort = Number(process.env.WEB_PORT ?? 3000);

function resolveTarget(pathname = "/") {
  if (pathname.startsWith("/api/") || pathname === "/api") {
    return { host: "127.0.0.1", port: apiPort };
  }
  if (pathname.startsWith("/socket.io")) {
    return { host: "127.0.0.1", port: apiPort };
  }
  return { host: "127.0.0.1", port: webPort };
}

const server = http.createServer((req, res) => {
  const pathname = req.url?.split("?")[0] ?? "/";
  const target = resolveTarget(pathname);
  const upstream = http.request(
    {
      host: target.host,
      port: target.port,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: req.headers.host ?? `127.0.0.1:${target.port}`,
        "x-forwarded-proto": "https"
      }
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ ok: false, error: "Upstream unavailable" }));
  });

  req.pipe(upstream);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[HF] proxy listening on ${port}, api=${apiPort}, web=${webPort}`);
});

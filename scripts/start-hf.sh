#!/bin/sh
set -eu

API_PORT="${API_PORT:-4000}"
APP_PORT="${PORT:-7860}"
WEB_PORT="${WEB_PORT:-3000}"

echo "[HF] starting API on ${API_PORT}"
PORT="${API_PORT}" LISTEN_HOST=0.0.0.0 npm run start --workspace @cx/api &
API_PID=$!

echo "[HF] starting Web on ${WEB_PORT}"
PORT="${WEB_PORT}" npm run start --workspace @cx/web -- --port "${WEB_PORT}" &
WEB_PID=$!

echo "[HF] starting edge proxy on ${APP_PORT}"
PORT="${APP_PORT}" API_PORT="${API_PORT}" WEB_PORT="${WEB_PORT}" node /app/scripts/hf-proxy.mjs &
PROXY_PID=$!

cleanup() {
  kill "${PROXY_PID}" "${WEB_PID}" "${API_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

wait "${PROXY_PID}"
PROXY_STATUS=$?
kill "${WEB_PID}" "${API_PID}" 2>/dev/null || true
wait "${API_PID}" 2>/dev/null || true
wait "${WEB_PID}" 2>/dev/null || true
exit "${PROXY_STATUS}"

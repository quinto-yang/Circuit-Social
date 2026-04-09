#!/bin/sh
set -eu

API_PORT="${API_PORT:-4000}"
APP_PORT="${PORT:-7860}"

echo "[HF] starting API on ${API_PORT}"
PORT="${API_PORT}" LISTEN_HOST=0.0.0.0 npm run start --workspace @cx/api &
API_PID=$!

echo "[HF] starting Web on ${APP_PORT}"
PORT="${APP_PORT}" npm run start --workspace @cx/web -- --port "${APP_PORT}" &
WEB_PID=$!

cleanup() {
  kill "${WEB_PID}" "${API_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

wait "${WEB_PID}"
WEB_STATUS=$?
kill "${API_PID}" 2>/dev/null || true
wait "${API_PID}" 2>/dev/null || true
exit "${WEB_STATUS}"

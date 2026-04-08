# Integration Demo

Minimal runnable demo for SDK integration.

## Run

```bash
npm run dev:api
npm run dev:demo
```

Open `http://127.0.0.1:5173`.

## What It Demonstrates

- `@cx/sdk-js` client initialization
- `@cx/sdk-react` provider and hooks
- session refresh and logout flows
- bootstrap test session for E2E smoke (`/api/test/session`)

## Solana Demo Hint

- Enable web Solana entry by setting `NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true` in web env.
- In SDK usage, pass `chainType: "solana"` and provide wallet `signMessage`.



# @cx/sdk-js

JavaScript SDK for CX identity/session APIs.

## Install (workspace)

```bash
npm install
```

## Quick Start

```ts
import { createCxIdentityClient } from "@cx/sdk-js";

const client = createCxIdentityClient({
  apiOrigin: "http://127.0.0.1:4100",
  defaultDomain: "127.0.0.1:3000",
  defaultUri: "http://127.0.0.1:3000"
});

const session = await client.init();
```

## API

- `init()`
- `getSession()`
- `login(input)`
- `bindWallet(input)`
- `logout()`

`login`/`bindWallet` accept either:

- `signMessage(message) => Promise<string>` (recommended), or
- `preparedMessage + preparedSignature` (advanced/integration testing).

## Solana Notes

- Set `chainType: "solana"` and use supported `chainId` (`101/102/103`).
- SDK will build a JSON payload message for Solana, then call your `signMessage`.
- Return signature as base58 string from the wallet adapter.


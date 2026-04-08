# Auth Error Codes

## Response Shape

API errors are returned in a unified JSON shape by `HttpErrorFilter`:

```json
{
  "ok": false,
  "error": "错误说明",
  "errorCode": "SOME_ERROR_CODE"
}
```

## Current Auth Error Codes

Source of truth: `apps/api/src/common/error-codes.ts`

- `CHAIN_NOT_SUPPORTED`: chain id is not in supported list
- `WALLET_ADDRESS_INVALID`: wallet address format is invalid
- `CHAIN_TYPE_UNSUPPORTED`: unsupported chain type (`evm/solana` only)
- `NONCE_INVALID_OR_EXPIRED`: nonce does not exist or has been consumed
- `NONCE_EXPIRED`: nonce timed out
- `SIGN_INTENT_MISMATCH`: signed intent does not match current flow (`login/bind`)
- `SIWE_VERIFY_FAILED`: SIWE signature verification failed
- `SOLANA_VERIFY_FAILED`: Solana signature verification failed
- `SIGNER_ADDRESS_MISMATCH`: signer address does not match nonce address
- `SIGNER_CHAIN_ID_MISMATCH`: signer chain id does not match nonce chain id
- `SOLANA_INVALID_PAYLOAD`: Solana payload is malformed

## Frontend Mapping

- `apps/web/src/lib/api.ts` throws unified `ApiError` with `code/status/path`
- `apps/web/src/lib/api-error.ts` maps error codes first, then falls back to status (`0/401/403/404/5xx`)

## Adding A New Error Code

1. Add code constant in `apps/api/src/common/error-codes.ts`
2. Return structured exception payload in backend service/controller:
   - `throw new BadRequestException({ message, code })`
   - or `throw new UnauthorizedException({ message, code })`
3. Add/adjust API integration test assertions to include `errorCode`
4. Add frontend mapping in `apps/web/src/lib/api-error.ts`
5. Run:
   - `npm run test:api`
   - `npm run typecheck --workspace @cx/web`
6. Update this doc when code list changes


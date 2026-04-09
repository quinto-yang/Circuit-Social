## Summary

- 

## Test Plan

- [ ] `npm run test:api`
- [ ] `npm run typecheck --workspace @cx/web`
- [ ] `npm run e2e:run` (if UI or interaction flow is affected)

## Checklist

- [ ] Scope and risk are clearly described in Summary
- [ ] Backward compatibility considered (API fields, behavior, data shape)
- [ ] Docs updated when behavior/config changed

### Error Code Checklist (if API errors changed)

Reference: `docs/errors/auth-error-codes.md`

- [ ] Added/updated code in `apps/api/src/common/error-codes.ts`
- [ ] Backend throws structured payload `{ message, code }`
- [ ] API integration tests assert `errorCode`
- [ ] Frontend mapping updated in `apps/web/src/lib/api-error.ts`
- [ ] Fallback UX still reasonable when `errorCode` is missing


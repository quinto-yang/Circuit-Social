-- Unique idempotency key for point ledger rows (e.g. task rewards: reason=task.reward, refType=task, refId=<taskKey>).
-- Note: PostgreSQL treats NULL as distinct in UNIQUE; ensure idempotent rows always set refType/refId.

CREATE UNIQUE INDEX IF NOT EXISTS "PointLedger_userId_reason_refType_refId_key" ON "PointLedger"("userId", "reason", "refType", "refId");

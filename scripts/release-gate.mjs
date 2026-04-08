import { spawnSync } from "node:child_process";

const STEPS = [
  { name: "API tests", command: "npm run test:api" },
  { name: "Typecheck", command: "npm run typecheck" },
  { name: "E2E smoke", command: "npm run e2e:run" }
];

const withWallet = process.argv.includes("--with-wallet");
const withDemo = !process.argv.includes("--no-demo");
if (withWallet) {
  STEPS.push({ name: "Wallet E2E", command: "npm run test:wallet" });
}
if (withDemo) {
  STEPS.push({ name: "SDK Demo E2E", command: "npm run e2e:demo" });
}

const results = [];

for (const step of STEPS) {
  process.stdout.write(`\n==> ${step.name}: ${step.command}\n`);
  const startedAt = Date.now();
  const run = spawnSync(step.command, {
    shell: true,
    stdio: "inherit",
    env: process.env
  });
  const durationMs = Date.now() - startedAt;
  const passed = run.status === 0;
  results.push({
    name: step.name,
    command: step.command,
    passed,
    durationMs
  });

  if (!passed) {
    process.stderr.write(`\nRelease gate failed at "${step.name}".\n`);
    break;
  }
}

process.stdout.write("\n=== Release Gate Summary ===\n");
for (const result of results) {
  const status = result.passed ? "PASS" : "FAIL";
  const seconds = (result.durationMs / 1000).toFixed(1);
  process.stdout.write(`- [${status}] ${result.name} (${seconds}s)\n`);
}

const failed = results.find((item) => !item.passed);
if (failed) {
  process.stderr.write(
    `\nGate status: FAILED. Fix "${failed.name}" before release.\n`
  );
  process.exit(1);
}

process.stdout.write("\nGate status: PASSED. Ready for release checklist review.\n");

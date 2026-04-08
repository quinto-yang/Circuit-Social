import "reflect-metadata";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { SiweMessage } from "siwe";
import superagent from "superagent";
import request, { type SuperAgentTest, type SuperTest, type Test as SupertestTest } from "supertest";
import { privateKeyToAccount } from "viem/accounts";

import type { TestSessionPreset } from "../../src/store/memory-store.service";

const DEFAULT_DOMAIN = "127.0.0.1:3000";
const DEFAULT_URI = "http://127.0.0.1:3000";
const TEST_API_HOST = "http://127.0.0.1";
const API_ROOT = path.resolve(__dirname, "..", "..");

const PRIVATE_KEYS = {
  alpha:
    "0x59c6995e998f97a5a0044976f7d4f8577f4a5f3b8cfbaaf8b9f1f3f5c0d7a7d9",
  beta:
    "0x8b3a350cf5c34c9194ca3a9d8bca9b8c5f3f5d8a7a9c7f5d8b7a6c5d4e3f2a1b",
  gamma:
    "0x7c8521182946a5b6c7d8e9f00112233445566778899aabbccddeeff001122334"
} as const;

export const testAccounts = {
  alpha: privateKeyToAccount(PRIVATE_KEYS.alpha),
  beta: privateKeyToAccount(PRIVATE_KEYS.beta),
  gamma: privateKeyToAccount(PRIVATE_KEYS.gamma)
} as const;

export type ApiTestApp = {
  api: SuperTest<SupertestTest>;
  createAgent: () => SuperAgentTest;
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

type SharedApiServer = {
  baseUrl: string;
  api: SuperTest<SupertestTest>;
  createAgent: () => SuperAgentTest;
  close: () => Promise<void>;
};

type CookieAwareAgent = SuperAgentTest & {
  __baseUrl?: string;
  __sessionCookie?: string;
};

let sharedServerPromise: Promise<SharedApiServer> | null = null;
let sharedServerRefCount = 0;

function applySessionCookie(agent: SuperAgentTest, response: { headers: Record<string, unknown> }) {
  const setCookie = response.headers["set-cookie"];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [String(setCookie)] : [];
  const cookieAwareAgent = agent as CookieAwareAgent;
  for (const cookie of cookies) {
    const sessionCookie = cookie.split(";")[0];
    cookieAwareAgent.__sessionCookie = sessionCookie;
    agent.jar.setCookie(sessionCookie, cookieAwareAgent.__baseUrl ?? TEST_API_HOST);
  }
}

function createCookieAwareAgent(baseUrl: string) {
  const agent = request.agent(baseUrl) as CookieAwareAgent;
  agent.__baseUrl = baseUrl;
  const originalGet = agent.get.bind(agent);
  const originalPost = agent.post.bind(agent);
  const originalDelete = agent.delete.bind(agent);

  agent.get = ((url: string) => {
    const req = originalGet(url);
    if (agent.__sessionCookie) {
      req.set("Cookie", agent.__sessionCookie);
    }
    return req;
  }) as typeof agent.get;

  agent.post = ((url: string) => {
    const req = originalPost(url);
    if (agent.__sessionCookie) {
      req.set("Cookie", agent.__sessionCookie);
    }
    return req;
  }) as typeof agent.post;

  agent.delete = ((url: string) => {
    const req = originalDelete(url);
    if (agent.__sessionCookie) {
      req.set("Cookie", agent.__sessionCookie);
    }
    return req;
  }) as typeof agent.delete;

  return agent;
}

async function findFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("unable to resolve a free port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForServerReady(baseUrl: string, child: ChildProcessWithoutNullStreams) {
  const startedAt = Date.now();
  let output = "";

  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  while (Date.now() - startedAt < 15_000) {
    if (child.exitCode !== null) {
      throw new Error(`test API server exited early:\n${output}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/me`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`timed out waiting for test API server:\n${output}`);
}

async function ensureSharedApiServer() {
  if (!sharedServerPromise) {
    sharedServerPromise = (async () => {
      const port = await findFreePort();
      const baseUrl = `${TEST_API_HOST}:${port}`;
      const child = spawn(process.execPath, ["dist/main.js"], {
        cwd: API_ROOT,
        env: {
          ...process.env,
          NODE_ENV: "test",
          PORT: String(port),
          WEB_ORIGIN: "http://127.0.0.1:3100"
        },
        stdio: ["ignore", "pipe", "pipe"]
      });

      await waitForServerReady(baseUrl, child);

      return {
        baseUrl,
        api: request(baseUrl),
        createAgent: () => createCookieAwareAgent(baseUrl),
        close: async () => {
          if (child.exitCode === null) {
            child.kill("SIGTERM");
            await new Promise<void>((resolve) => {
              child.once("exit", () => resolve());
              setTimeout(() => {
                if (child.exitCode === null) {
                  child.kill("SIGKILL");
                }
              }, 2_000);
            });
          }
        }
      };
    })();
  }

  return sharedServerPromise;
}

export async function createApiTestApp(): Promise<ApiTestApp> {
  const server = await ensureSharedApiServer();
  sharedServerRefCount += 1;
  return {
    api: server.api,
    createAgent: server.createAgent,
    reset: async () => {
      const response = await server.api.post("/api/test/reset").send({});
      if (response.status !== 201) {
        throw new Error(
          `reset failed: ${response.status} ${JSON.stringify(response.body)}`
        );
      }
    },
    close: async () => {
      sharedServerRefCount -= 1;
      if (sharedServerRefCount === 0 && sharedServerPromise) {
        const activeServer = await sharedServerPromise;
        sharedServerPromise = null;
        await activeServer.close();
      }
    }
  };
}

export async function createTestSession(
  agent: SuperAgentTest,
  preset: TestSessionPreset = "fresh-user"
) {
  const response = await agent.post("/api/test/session").send({ preset }).expect(201);
  applySessionCookie(agent, response);
  return response.body;
}

export function buildSiweMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  domain?: string;
  uri?: string;
  statement?: string;
}) {
  return new SiweMessage({
    domain: input.domain ?? DEFAULT_DOMAIN,
    address: input.address,
    statement:
      input.statement ?? "Sign in to Circuit Social. Use a test wallet if this is your first visit.",
    uri: input.uri ?? DEFAULT_URI,
    version: "1",
    chainId: input.chainId,
    nonce: input.nonce,
    issuedAt: input.issuedAt
  }).prepareMessage();
}

export async function loginWithSiwe(
  agent: SuperAgentTest,
  account: (typeof testAccounts)[keyof typeof testAccounts],
  options?: {
    nonceChainId?: number;
    messageChainId?: number;
    domain?: string;
    verifyDomain?: string;
    statement?: string;
  }
) {
  const nonceChainId = options?.nonceChainId ?? 8453;
  const messageChainId = options?.messageChainId ?? nonceChainId;
  const domain = options?.domain ?? DEFAULT_DOMAIN;

  const nonceResponse = await agent
    .post("/api/auth/nonce")
    .send({
      address: account.address,
      chainId: nonceChainId,
      intent: "login"
    })
    .expect(201);

  const message = buildSiweMessage({
    address: account.address,
    chainId: messageChainId,
    nonce: nonceResponse.body.nonce,
    issuedAt: nonceResponse.body.issuedAt,
    domain,
    statement: options?.statement
  });

  const signature = await account.signMessage({ message });
  const verifyResponse = await agent.post("/api/auth/verify").send({
    message,
    signature,
    domain: options?.verifyDomain ?? domain
  });
  applySessionCookie(agent, verifyResponse);

  return {
    nonceResponse,
    message,
    signature,
    verifyResponse
  };
}

export async function bindWalletWithSiwe(
  agent: SuperAgentTest,
  account: (typeof testAccounts)[keyof typeof testAccounts],
  options?: {
    chainId?: number;
    domain?: string;
  }
) {
  const chainId = options?.chainId ?? 8453;
  const domain = options?.domain ?? DEFAULT_DOMAIN;

  const nonceResponse = await agent
    .post("/api/auth/nonce")
    .send({
      address: account.address,
      chainId,
      intent: "bind"
    })
    .expect(201);

  const message = buildSiweMessage({
    address: account.address,
    chainId,
    nonce: nonceResponse.body.nonce,
    issuedAt: nonceResponse.body.issuedAt,
    domain,
    statement: "Bind this wallet to your Circuit Social profile."
  });

  const signature = await account.signMessage({ message });
  const cookieAwareAgent = agent as CookieAwareAgent;
  const response = await request(cookieAwareAgent.__baseUrl ?? TEST_API_HOST)
    .post("/api/wallets/bind")
    .set("Cookie", cookieAwareAgent.__sessionCookie ?? "")
    .send({
      message,
      signature,
      domain
    });
  applySessionCookie(agent, response);
  return response;
}

export async function uploadImageFile(
  agent: SuperAgentTest,
  input: {
    filePath: string;
    fileName?: string;
    mimeType: string;
  }
) {
  const cookieAwareAgent = agent as CookieAwareAgent;
  const response = await superagent
    .post(`${cookieAwareAgent.__baseUrl ?? TEST_API_HOST}/api/uploads/image`)
    .set("Cookie", cookieAwareAgent.__sessionCookie ?? "")
    .attach("file", input.filePath, {
      filename: input.fileName ?? path.basename(input.filePath),
      contentType: input.mimeType
    })
    .ok(() => true);

  return {
    status: response.status,
    body: response.body as { ok?: boolean; error?: string; upload?: unknown } | null
  };
}

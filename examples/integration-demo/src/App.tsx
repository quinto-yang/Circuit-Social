import React from "react";

import { createCxIdentityClient } from "@cx/sdk-js";
import { CxAuthProvider, useCxAuth, useCxSession } from "@cx/sdk-react";

const client = createCxIdentityClient({
  apiOrigin: "http://127.0.0.1:4100",
  defaultDomain: "127.0.0.1:5173",
  defaultUri: "http://127.0.0.1:5173"
});

function SessionPanel() {
  const { session, loading, refresh } = useCxSession();
  const { logout } = useCxAuth();

  async function bootstrapTestSession() {
    await fetch("http://127.0.0.1:4100/api/test/session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preset: "fresh-user"
      })
    });
    await refresh();
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Session</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" data-testid="demo-refresh" onClick={() => void refresh()}>
          Refresh Session
        </button>
        <button type="button" data-testid="demo-logout" onClick={() => void logout()}>
          Logout
        </button>
        <button type="button" data-testid="demo-bootstrap" onClick={() => void bootstrapTestSession()}>
          Bootstrap Test Login
        </button>
      </div>
      <pre
        data-testid="demo-session-json"
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 8,
          background: "#0f172a",
          color: "#e2e8f0",
          overflow: "auto",
          fontSize: 12
        }}
      >
        {loading ? "loading..." : JSON.stringify(session, null, 2)}
      </pre>
    </section>
  );
}

export function App() {
  return (
    <main
      data-testid="demo-root"
      style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px", fontFamily: "sans-serif" }}
    >
      <h1>CX SDK Integration Demo</h1>
      <p>
        This page demonstrates <code>@cx/sdk-js</code> + <code>@cx/sdk-react</code> session hooks.
      </p>
      <CxAuthProvider client={client}>
        <SessionPanel />
      </CxAuthProvider>
    </main>
  );
}


# @cx/sdk-react

React bindings for `@cx/sdk-js`.

## Exports

- `CxAuthProvider`
- `useCxAuth`
- `useCxSession`

## Usage

```tsx
import { createCxIdentityClient } from "@cx/sdk-js";
import { CxAuthProvider, useCxSession } from "@cx/sdk-react";

const client = createCxIdentityClient({
  apiOrigin: "http://127.0.0.1:4000",
  defaultDomain: "127.0.0.1:3000",
  defaultUri: "http://127.0.0.1:3000"
});

function SessionPanel() {
  const { session, loading, refresh } = useCxSession();
  return (
    <div>
      <button onClick={() => void refresh()}>Refresh</button>
      <pre>{loading ? "loading..." : JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}

export default function App() {
  return (
    <CxAuthProvider client={client}>
      <SessionPanel />
    </CxAuthProvider>
  );
}
```


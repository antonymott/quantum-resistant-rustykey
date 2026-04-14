# Browser demo (Vite)

Small frontend to exercise `quantum-resistant-rustykey` in the browser (Web Crypto + vendored WASM).

## Prerequisite

Build the library once from the **repository root** so `dist/` exists:

```bash
cd /path/to/quantum-resistant-rustykey
pnpm install
pnpm build
```

## Run the dev server

From the repo root:

```bash
pnpm --filter browser-demo dev
```

Or from this folder:

```bash
cd examples/browser-demo
pnpm install
pnpm dev
```

Vite defaults to port **5174** (see `vite.config.ts`). Open the URL it prints, choose 512 / 768 / 1024, click **Run test**.

## What it checks

1. Load the selected ML-KEM variant.
2. Keygen → encapsulate → decapsulate; compare shared secrets.
3. `encryptMessage` / `decryptMessage` with AES-GCM.

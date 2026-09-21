---
title: SQIsign-webGPU
description: Browser SQIsign in a dedicated worker under COOP/COEP — same WASM as standard loaders.
---

# SQIsign-webGPU

Browser-only SQIsign loaders that run the **same Emscripten WASM** as `loadSqisignLvl*()`, inside a **dedicated Worker** when the page is cross-origin isolated. This is **not** GPU-accelerated signing today.

:::important What this path actually does
- **Crypto:** identical SQIsign WASM (L1 / L3 / L5).
- **Worker:** keeps signing off the main thread when COOP/COEP + `SharedArrayBuffer` + WebGPU are available.
- **WebGPU:** device warmup only (compute shader smoke test) — **no** field arithmetic on GPU yet. Warmup buffers hold dummy constants, then are overwritten and destroyed; they never receive keys. See the [threat model](../security/threat-model).
- **`SharedArrayBuffer`:** required for feature gating; not used for crypto buffers in the current code.
:::

For reviewer detail (RNG, tests, provenance), see [SQIsign WASM toolchain](../guides/sqisign-wasm).

| Level | Standard | Browser worker path |
| --- | --- | --- |
| L5 | `loadSqisignLvl5()` | `loadSqisignLvl5WebGpu()` → label **SQISign-L5-webGPU** |
| L3 | `loadSqisignLvl3()` | `loadSqisignLvl3WebGpu()` → label **SQISign-L3-webGPU** |
| L1 | `loadSqisignLvl1()` | `loadSqisignLvl1WebGpu()` → label **SQISign-L1-webGPU** |

Labels: `SQISIGN_WEBGPU_VARIANT_LABELS`.

## Requirements (COOP / COEP)

Needs a **cross-origin isolated** context:

1. `crossOriginIsolated === true`
2. `SharedArrayBuffer` available
3. `navigator.gpu` (WebGPU)

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

:::danger Production caution
`require-corp` breaks third-party scripts, analytics, iframes, and cross-origin images unless they send `Cross-Origin-Resource-Policy`. Prefer standard WASM loaders on the backend unless you need the worker isolation model.
:::

:::warning Security unknowns
A future GPU field path would not inherit upstream constant-time proofs. Today’s WebGPU step does not perform signing math.
:::

### Next.js headers example

```js
// next.config.mjs
async headers() {
  return [
    {
      source: "/your-pqc-page/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    },
  ];
}
```

## Worker script

Bundlers cannot load `sqisign-accel-worker.js` from `node_modules` as a worker URL. Copy it to a public path:

```bash
cp node_modules/quantum-resistant-rustykey/dist/sqisign-accel-worker.js public/pqc/
```

Default URL: `/pqc/sqisign-accel-worker.js`. Override with:

```ts
import { setSqisignAccelWorkerUrl } from "quantum-resistant-rustykey";
setSqisignAccelWorkerUrl("/your/path/sqisign-accel-worker.js");
```

If the worker fails to load, the library **falls back to main-thread WASM** (still not GPU). Check `getSqisignWebGpuSupport()` first.

## Usage

`loadSqisignLvl*WebGpu().keypair()` / `.sign()` throw in the page (same gate as the other signature loaders). Browser keygen/sign use the [OPFS encrypted-sk wallet](./opfs-sk) with algorithm ids `sqisign-lvl*-webgpu` (still WASM; no keys on the GPU). `verify()` and `getSqisignWebGpuSupport()` stay available. `benchSqisignWebGpu()` is gated the same way.

```ts
import {
  getSqisignWebGpuSupport,
  loadOpfsSkWallet,
  loadSqisignLvl5,
  opfsSkTriggerWebAuthn,
  setOpfsSkWorkerUrl,
  OPFS_SK_SLOT_SD_BUNDLE,
} from "quantum-resistant-rustykey";

const support = getSqisignWebGpuSupport();
if (!support.available) {
  console.warn(support.reason);
}

setOpfsSkWorkerUrl("/pqc/opfs-sk-worker.js");
const { prf } = await opfsSkTriggerWebAuthn({
  mode: "get",
  publicKey: authenticationOptions, // RP options used prf: {}
  salt,
});
const wallet = await loadOpfsSkWallet();
const msg = new TextEncoder().encode("hello");
const { public_key } = await wallet.keygen("sqisign-lvl5-webgpu", prf, {
  slot: OPFS_SK_SLOT_SD_BUNDLE,
});
const sig = await wallet.sign("sqisign-lvl5-webgpu", msg, prf, {
  slot: OPFS_SK_SLOT_SD_BUNDLE,
});
const sq = await loadSqisignLvl5();
const ok = await sq.verify(sig, msg, public_key);
```

Live side-by-side timings: [pqc.rustykey.me](https://pqc.rustykey.me).

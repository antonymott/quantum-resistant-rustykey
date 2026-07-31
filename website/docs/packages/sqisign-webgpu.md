---
title: SQIsign-webGPU
description: Browser-accelerated SQIsign using SharedArrayBuffer and WebGPU.
---

# SQIsign-webGPU

Browser-only accelerated SQIsign variants using **SharedArrayBuffer** and **WebGPU**. Separate from standard WASM loaders — **not available in Node.js**.

| Level | Standard | Accelerated |
| --- | --- | --- |
| L5 | `loadSqisignLvl5()` | `loadSqisignLvl5WebGpu()` → **SQISign-L5-webGPU** |
| L3 | `loadSqisignLvl3()` | `loadSqisignLvl3WebGpu()` → **SQISign-L3-webGPU** |
| L1 | `loadSqisignLvl1()` | `loadSqisignLvl1WebGpu()` → **SQISign-L1-webGPU** |

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
`require-corp` breaks third-party scripts, analytics, iframes, and cross-origin images unless they send `Cross-Origin-Resource-Policy`. Prefer standard WASM loaders on the backend; treat webGPU as a browser "racecar".
:::

:::warning Security unknowns
GPU field arithmetic is optimized for throughput, not constant-time crypto. Upstream C formal proofs do **not** cover WebGPU compute shaders.
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

If the worker fails, the library falls back to main-thread WASM.

## Usage

```ts
import {
  benchSqisignWebGpu,
  getSqisignWebGpuSupport,
  loadSqisignLvl5WebGpu,
} from "quantum-resistant-rustykey";

const support = getSqisignWebGpuSupport();
if (!support.available) {
  console.warn(support.reason);
}

const sq = await loadSqisignLvl5WebGpu();
const kp = sq.keypair();
const pk = await kp.get("public_key");
const sk = await kp.get("private_key");
const msg = new TextEncoder().encode("hello");
const sig = await sq.sign(msg, sk);
const ok = await sq.verify(sig, msg, pk);

const bench = await benchSqisignWebGpu("lvl5");
console.log(bench.algorithm); // SQISign-L5-webGPU
```

Live side-by-side timings: [pqc.rustykey.me](https://pqc.rustykey.me).

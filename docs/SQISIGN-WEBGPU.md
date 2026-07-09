# SQISign-webGPU (browser accelerated "racecar")

Browser-only accelerated SQISign variants using **SharedArrayBuffer** and **WebGPU**.
These are separate from the standard server-compatible WASM loaders and are **not available in Node.js**.

## Variant names

| Security level | Standard loader | Accelerated (browser) |
|----------------|-----------------|------------------------|
| L5 | `loadSqisignLvl5()` → SQISign-L5 | `loadSqisignLvl5WebGpu()` → **SQISign-L5-webGPU** |
| L3 | `loadSqisignLvl3()` → SQISign-L3 | `loadSqisignLvl3WebGpu()` → **SQISign-L3-webGPU** |
| L1 | `loadSqisignLvl1()` → SQISign-L1 | `loadSqisignLvl1WebGpu()` → **SQISign-L1-webGPU** |

Labels are exported as `SQISIGN_WEBGPU_VARIANT_LABELS`.

## Requirements (COOP / COEP)

Accelerated SQISign requires a **cross-origin isolated** browsing context:

1. `crossOriginIsolated === true`
2. `SharedArrayBuffer` available
3. `navigator.gpu` (WebGPU) available

Serve these response headers on pages that load the accelerated variants:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

⚠️ IMPORTANT for this highly-tuned "racecar" version

Enforcing these headers on a production web app creates a challenging isolation boundary
 - Breaking Third Parties: Every single script, analytic tracker, embedded iframe (like Stripe or YouTube), and cross-origin image on that page will immediately break or be blocked unless they are explicitly served with a Cross-Origin-Resource-Policy header
 - Maintenance Overhead: the accelerated version is browser-only frontend, use our standard web-assembly package in nodejs backend***
 - ok, so you're a self-confessed speed demon, you've read the cautions. But before you jump into this shiny new machine, remember you asked the crew to fit 'racing slicks for dry weather only'. If the weather changes unexpectedly, you'll find yourself behind the wheel of an 'aquatic hydroplaning device'. No airbags.


## Specific risks introduced with this "racecar" version

1. Security unknowns
- Side-Channel Vulnerabilities are untested. Offloading cryptographic math to a smartphone's WebGPU - billions of them, various model, makes, years - means executing field arithmetic directly on the host computer's GPU threads. Graphics processors are fundamentally optimized for parallel throughput, not constant-time deterministic execution.
- Novel unseen threats: Running cryptographic primitives on shared GPU hardware makes them highly susceptible to advanced timing and memory-coalescing side-channel attacks. ⚠️ Upstream C formal proofs absolutely do not account for WebGPU compute shader pipeline execution. ⚠️

### Next.js example

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

Third-party scripts, images, and iframes on the same page must be served with appropriate `Cross-Origin-Resource-Policy` (or `crossorigin` attributes) or they will be blocked under `require-corp`.

### Worker script (required for bundlers like Next.js)

Bundled apps cannot load `sqisign-accel-worker.js` from `node_modules`. Copy it to a public URL:

```bash
cp node_modules/quantum-resistant-rustykey/dist/sqisign-accel-worker.js public/pqc/
```

The testbed sync script does this automatically (`pnpm pqc:sync-local`).

Default worker URL: `/pqc/sqisign-accel-worker.js`. Override if needed:

```ts
import { setSqisignAccelWorkerUrl } from "quantum-resistant-rustykey";
setSqisignAccelWorkerUrl("/your/path/sqisign-accel-worker.js");
```

If the worker fails to load, the library falls back to main-thread WASM (same crypto, UI may stutter on L5).

## Usage

```ts
import {
  benchSqisignWebGpu,
  getSqisignWebGpuSupport,
  isSqisignWebGpuAvailable,
  loadSqisignLvl5WebGpu,
  SQISIGN_WEBGPU_VARIANT_LABELS,
} from "quantum-resistant-rustykey";

const support = getSqisignWebGpuSupport();
if (!support.available) {
  console.warn(support.reason);
}

// Same IFnDsa surface as standard loaders
const sq = await loadSqisignLvl5WebGpu();
const kp = sq.keypair();
const pk = await kp.get("public_key");
const sk = await kp.get("private_key");
const msg = new TextEncoder().encode("hello");
const sig = await sq.sign(msg, sk);
const ok = await sq.verify(sig, msg, pk);

// Built-in keygen + sign + verify benchmark (browser only)
const bench = await benchSqisignWebGpu("lvl5");
console.log(bench.algorithm); // SQISign-L5-webGPU
console.log(bench.steps);
```

## Architecture

1. **Web Worker** — SQISign WASM runs off the main thread (worker bundle: `dist/sqisign-accel-worker.js`).
2. **SharedArrayBuffer** — enabled when COOP/COEP isolate the origin (required for future pthread WASM builds).
3. **WebGPU** — device initialization and compute pipeline warmup for field-arithmetic acceleration.

Standard `loadSqisignLvl*` loaders remain unchanged for Node.js and non-isolated browsers.

## Live comparison

The [pqc.rustykey.me](https://pqc.rustykey.me) testbed shows side-by-side timings for SQISign-L1/L3/L5 vs SQISign-L1-webGPU / L3 / L5 on the **COSE** and **Verifiable Credentials** tabs when SQISign is selected.

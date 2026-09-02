# <img src="./logo-rustykey.png" width="48" align="center" alt="" /> quantum-resistant-rustykey

[![npm version](https://img.shields.io/npm/v/quantum-resistant-rustykey)](https://www.npmjs.com/package/quantum-resistant-rustykey)
[![docs](https://img.shields.io/badge/docs-GitHub%20Pages-1a5f4a)](https://antonymott.github.io/quantum-resistant-rustykey/)
![Node v26.7.0](https://img.shields.io/badge/node-v26.7.0-blue.svg)

TypeScript-first **WebAssembly and WebGPU\* quantum-resistant** crypto for Node and browser — SQIsign, ML-DSA, FN-DSA, SLH-DSA, ML-KEM.  
RustyKey® is a **FIDO® Alliance** member.

> \*Only the SQIsign algorithm ships WebGPU-accelerated variants, at all three security 
> levels (L5, L3, L1). We introduced them experimentally, since several of SQIsign's 
> isogeny computations are GPU-parallelizable, and offloading them to WebGPU 
> meaningfully speeds up signature creation over the WebAssembly path (itself already 
> faster than plain JS) — typically 1.25x–1.8x, depending on security level and GPU.
>
> **⚠️ Treat WebGPU variants as experimental — no production use at all — until v1.0.0.** 
> Combining WebAssembly and WebGPU with the inherent mathematical properties of isogenies 
> shifts the most likely attack vectors toward algorithmic side-channels, GPU 
> memory-architecture quirks, and memory-safety mismatches at the Wasm/WGSL translation 
> boundary (full analysis: `docs/security/threat-model.md`). This risk is more likely to 
> affect the WebGPU-accelerated path — the WebAssembly-only implementation is less likely 
> affected by these GPU-specific vectors.
>
> These WebGPU variants are **browser-only** and require the page to be served with 
> COOP and COEP headers so that `self.crossOriginIsolated === true`. Without cross-origin 
> isolation, WebGPU compute cannot be used at all — the library detects this and 
> automatically falls back to the WebAssembly implementation, which is also the 
> default (and only) backend in Node.
>
> **Do not patch out or bypass the `crossOriginIsolated` check to force WebGPU execution 
> on a non-isolated page.** That check is not a convenience gate — it enforces the same 
> isolation boundary that limits the cross-tab cache-timing and high-resolution-timer 
> attacks this package's WebGPU path is otherwise exposed to. The same applies if your 
> own application runs keygen and other, untrusted code in the same tab, worker, or 
> execution context even with the check fully intact — that is not isolation, it's just 
> two things sharing a room. Builds or integrations that do either of these fall outside 
> this package's threat model and support/disclosure scope — key-recovery incidents on 
> such setups should not be attributed to the maintained package's supported 
> configuration.
>
> **Think you've found a genuine key-recovery or forgery issue under a properly isolated 
> configuration?** Please report it per `SECURITY.md` before sharing it publicly or with 
> standards bodies — it defines what's in scope and includes a safe-harbor commitment for 
> good-faith research.

```bash
pnpm i quantum-resistant-rustykey@latest
```

TypeScript types are included (`dist/index.d.ts`) — no `@types/quantum-resistant-rustykey`.

### NIST™ approval status: quantum resistant algorithms
- ML-DSA, FN-DSA, SLH-DSA, ML-KEM [NIST™ approved](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards)
- SQIsign [NIST™ NOT YET approved, advanced to round 3](https://csrc.nist.gov/projects/pqc-dig-sig/round-3-additional-signatures)

**Docs:** [antonymott.github.io/quantum-resistant-rustykey](https://antonymott.github.io/quantum-resistant-rustykey/)  
**Live testbed:** [pqc.rustykey.me](https://pqc.rustykey.me)  
**License:** ISC


WASM modules are compiled from pinned C under `vendor/` (see `vendor.lock.json`). Independent C→WASM check: `REQUIRE_REPRODUCIBLE=1 pnpm build:vendor && pnpm verify:repro`. Provenance: [Supply-chain provenance](https://antonymott.github.io/quantum-resistant-rustykey/docs/guides/provenance).

> Pre-production until v1.0.0. Prefer `@latest` (or a caret range) so dependents pick up patches.

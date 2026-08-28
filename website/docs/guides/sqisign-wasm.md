---
title: SQIsign WASM toolchain
description: What we ship for SQIsign L1/L3/L5, RNG wiring, tests, and the webGPU path — for reviewers.
---

# SQIsign WASM toolchain

This page is for **cryptographic reviewers** (upstream C, WASM build, browser “webGPU” path). It states what is proven, what is tested, and what is still scaffolding.

## Upstream source

| Item | Value |
| --- | --- |
| Upstream | [SQISign/the-sqisign](https://github.com/SQISign/the-sqisign) |
| Vendored tree | `vendor/sqisign-native/` (pruned; see `SOURCE.txt`) |
| Pin | Content hash in `vendor.lock.json` → `sqisign-native.treeHash` (308 files) |
| Build type | `SQISIGN_BUILD_TYPE=ref` only (portable reference backend) |
| GMP | `MINI` (bundled mini-gmp) |

The vendored tree is **not** a raw `git clone` checkout (CMake patches, pruned `apps/` / `test/`). The **tree hash** is the reproducibility anchor.

## What npm ships

```
vendor/sqisign-native (C, ref)
  → wasm/build_sqisign_lvl{1,3,5}.sh (Emscripten 3.1.51)
  → wasm/build/sqisign-lvl*-module.js
  → scripts/bundle-signatures.mjs (esbuild)
  → src/vendor/sqisignlvl{1,3,5}.js   ← repro.hashes.json
  → tsdown → dist/index.js
  → dist/sqisign-accel-worker.js (all three WASM blobs)
```

`repro.hashes.json` covers `src/vendor/sqisignlvl*.js`. Published tarball is `dist/` only — see [Supply-chain provenance](./provenance).

## RNG path (important)

Production WASM links the upstream **NIST KAT / test** libraries (`libsqisign_*_test*.a`), not the default `RANDOMBYTES_SYSTEM` production path.

- Each `keypair` / `sign` from JavaScript passes a **48-byte** seed from `crypto.getRandomValues`.
- C wrappers call `randombytes_init(seed, …)` then `crypto_sign_*` / `crypto_sign_keypair`.
- CTR-DRBG state is **module-global** in upstream test RNG code.

**Implication:** one WASM instance per level must not run concurrent `keypair` / `sign` without serialization. This package serializes those ops per level (main thread and worker).

Verify does not re-seed the DRBG and may run concurrently with other verifies.

## Tests in CI

| Coverage | Levels | Notes |
| --- | --- | --- |
| NIST KAT **verify** (count=0 vectors) | L1, L3, L5 | `src/index.test.ts` |
| Sign → verify round-trip | L1 | Slow; optional extended job |
| Sign/keygen KAT regression | — | Not in default CI (runtime) |

Negative test: bit-flip on signature must fail verify.

## “SQISign-webGPU” path (browser)

**Name is historical.** Today this path means:

- Same **SQIsign WASM** as `loadSqisignLvl*()`.
- Crypto runs in a **dedicated Worker** when COOP/COEP + `SharedArrayBuffer` + WebGPU are available.
- WebGPU runs a **device warmup** compute shader only (not field arithmetic).
- `SharedArrayBuffer` is required for gating but **not** used for crypto buffers yet.

Use `getSqisignWebGpuSupport()` before enabling. If the worker fails to load, the library falls back to main-thread WASM (not GPU).

Formal upstream proofs do **not** cover WebGPU shaders. GPU arithmetic would not inherit constant-time claims from ref C.

## Constant-time expectations

- Shipped build: **ref** backend, `-O3` Emscripten, `ENABLE_STRICT=OFF`.
- Upstream ref code includes explicitly variable-time helpers (e.g. `fp2_pow_vartime`).
- Do **not** claim browser WASM or a future GPU path matches upstream native constant-time analysis without separate review.

## Independent verification commands

```bash
pnpm fetch:vendors
REQUIRE_REPRODUCIBLE=1 pnpm build:vendor
pnpm verify:repro
pnpm test
```

Audit WASM with source maps exists for **ML-KEM / Falcon / ML-DSA** (`pnpm build:audit`); SQIsign audit maps are not yet in that pipeline.

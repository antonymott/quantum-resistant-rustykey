# AGENTS.md

Instructions for AI coding agents (and human contributors) working in this repository:
`quantum-resistant-rustykey` — a TypeScript-first WASM (+ experimental WebGPU)
post-quantum crypto library (SQIsign, ML-DSA, FN-DSA, SLH-DSA, ML-KEM) for Node and
browser, working testbed at pqc.rustykey.me. RustyKey® is a
FIDO® Alliance member.

**Read the "Non-negotiable Security Invariants" section before making any change.**
If a task requires touching any of them, stop and ask a human maintainer instead of
proceeding on inference alone.

## Current architecture (read this before editing WebGPU files)

The public names `loadSqisignLvl*WebGpu()` / `SQISign-L*-webGPU` are **historical**.
As shipped today they do **not** run SQIsign field arithmetic or isogeny walks on the GPU:

- **Crypto:** the same Emscripten WASM as `loadSqisignLvl*()` (`src/sqisign.ts`, worker copy in `src/sqisign-accel-worker.ts`).
- **Worker:** signing is off the main thread when COOP/COEP + `SharedArrayBuffer` + `navigator.gpu` are available; if the worker fails to load, the library **falls back to main-thread WASM**.
- **WebGPU:** a dummy XOR warmup compute shader in `src/webgpu/init.ts` — **no key material, ideals, or points are written to GPU buffers**.
- **Private keys** (standard loaders) are `Uint8Array`s that round-trip through JS (`postMessage` without transfer on `sign()`). `withStack()` wipes JS `stackAlloc` regions (and the saved→current stack span) with `HEAPU8.fill(0, …)` on success **and** throw, then `stackRestore`. Caller-owned `private_key` buffers are not wiped. C `malloc` leftovers and restored C frames in the SQIsign **ref** module are **not** claimed wiped — see `website/docs/security/threat-model.md`.
- **OPFS encrypted-sk wallet** (`loadOpfsSkWallet`): **normative browser path** for keygen/sign of SQIsign, ML-DSA, FN-DSA, and SLH-DSA (including SQIsign `*-webgpu` ids, still WASM). Browser `load*().keypair()` / `.sign()` throw unless they run inside the `qrr-opfs-sk` Worker. Requires `crossOriginIsolated === true` with **no main-thread plaintext fallback**. `sk` is AES-GCM wrapped with a WebAuthn PRF + RP salt, stored via `FileSystemSyncAccessHandle`. The UI thread receives only `pk` / signatures. create() uses `prf: {}` (no salt); get() uses `prf.eval`. Mock throwaway keygen/sign after the real op is remnant pollution, not a full `HEAPU8` clean. Do not put wrap keys or `sk` on the GPU. Node / server REST `load*()` loaders are unchanged. `verify()` is not gated.

Do not document, benchmark-claim, or implement “GPU-accelerated signing math” without an explicit maintainer request and a threat-model update. A future WGSL field path is the experimental risk the README warns about — it is not the code that is running today.

## Non-negotiable Security Invariants

1. **Never** remove, weaken, or make conditional/bypassable the `crossOriginIsolated:true`
   / COOP–COEP gate around WebGPU code paths, even as part of an "unrelated" refactor.
   That gate is not a performance hint — it is the isolation boundary for SharedArrayBuffer,
   Site Isolation, and any future GPU kernel that *does* touch secrets.
   The same applies to `loadOpfsSkWallet()`: do not add a main-thread plaintext
   fallback, and do not run that wallet when `crossOriginIsolated !== true`.
2. **Never** introduce non-constant-time branches, table lookups, or early returns keyed
   on secret material (private keys, ephemeral exponents, isogeny walk data, Cornacchia
   inputs) in signing/keygen code — including changes that look purely stylistic (e.g.,
   "simplifying" a branchless `select` back into an `if`). Upstream SQIsign **ref** C
   already contains explicitly variable-time helpers (e.g. `fp2_pow_vartime`); do not add
   more, and do not claim the WASM port is constant-time.
3. **Never** remove or shortcut explicit zeroization of Wasm linear memory or GPU storage
   buffers after use — including on error, exception, and early-return paths.
   JS `stackAlloc` copies of `sk` / seed are wiped in `withStack` (success and throw);
   do not remove that. C `malloc` / restored C frames are still not wiped — do not
   claim a full `HEAPU8` clean. `stackRestore` alone is not zeroization. Dropping a
   JS `GPUBuffer` reference without `writeBuffer` of zeros + `destroy()` is not
   zeroization.
4. **Never** add network calls, telemetry, analytics, or logging that could transmit key
   material, DIDs, biometric/rPPG/saccades in-browser liveness data, or any user-identifying data. This project's
   stated goal is zero PII — no e164, email, password, passphrase, or similar.
5. **Never** silently downgrade a signature/keygen call to a weaker COSE algorithm than
   requested — surface an explicit error instead. The WebGPU→main-thread WASM fallback
   is the same algorithm, not a downgrade, but must not be described as GPU signing.
6. **Never** loosen TLS/PQC negotiation defaults (e.g., ML-KEM in TLS 1.3, Ed25519/Ed448
   as the minimum fallback) in example code, tests, or config templates a consumer might
   copy-paste into production.
7. **Never** remove or soften the "experimental / no production use until v1.0.0" status
   of WebGPU code paths in README, docs, badges, or version metadata without explicit
   maintainer approval.
8. **Never** edit the *Scope* section of `SECURITY.md`, or the WebGPU warning language
   in `README.md`, without explicit maintainer approval — this wording is deliberately
   calibrated, not casual copy.
9. **Never** land WGSL/WebGPU shaders that operate on private keys, seeds, ideals, or
   isogeny-walk state without (a) updating the threat model, (b) tests for zeroization
   and the COI gate, and (c) human security-reviewer sign-off. Today's warmup shader
   must stay free of secret buffers.

## Project Overview

- Public npm package: `quantum-resistant-rustykey`
- Targets: Node (WASM-only backend; plaintext `load*()` unconstrained) and browser (keygen/sign **must** use `loadOpfsSkWallet()` — WebAuthn UV + PRF + OPFS; optional SQIsign
  “webGPU” loaders when `crossOriginIsolated === true` — Worker + warmup, see above; `*-webgpu` ids still WASM, still wallet-gated for keygen/sign)
- Docs: GitHub Pages (`antonymott.github.io/quantum-resistant-rustykey`)

## Setup Commands

Consumers:

```bash
pnpm i quantum-resistant-rustykey@latest
# or
bun add quantum-resistant-rustykey@latest
npm add quantum-resistant-rustykey@latest
```

Contributors (this repo):

```bash
git clone https://github.com/antonymott/quantum-resistant-rustykey.git
cd quantum-resistant-rustykey
pnpm i
pnpm fetch:vendors   # verify vendor/ trees match vendor.lock.json
pnpm build
pnpm test
```

## Code Style

- Linted/format: always lint using included rules, do not disable rules inline without
  a comment explaining why.
- TypeScript: match the version in `package.json` (`typescript` 6.x at time of writing),
  strict mode. No `any` in public API surfaces.

## Build

```bash
pnpm i
pnpm fetch:vendors   # verify vendor/ trees match vendor.lock.json
pnpm build
```

## Audit build

```bash
pnpm build:audit
# outputs under wasm/audit-build/ (gitignored; also uploaded from CI)
# Note: SQIsign audit source maps are not yet in this pipeline (ML-KEM / Falcon / ML-DSA are).
```

## PR / Commit Instructions

- Any change to cryptographic primitives, constant-time code, WGSL shaders, or memory
  zeroization must:
  - Reference the relevant section of `website/docs/security/threat-model.md`
  - Include/update tests demonstrating the invariant still holds
  - Get explicit human security-reviewer sign-off — agents should not self-merge these
- Keep commits scoped; do not bundle security-relevant changes with unrelated refactors.

## References

- `README.md` — public API + WebGPU experimental warning (see Non-negotiable Invariant #7)
- `SECURITY.md` — vulnerability disclosure process + scope
- `website/docs/packages/sqisign-webgpu.md` — what the webGPU loaders actually do today
- `website/docs/packages/opfs-sk.md` — PRF-wrapped OPFS private-key wallet
- `website/docs/security/threat-model.md` — SQIsign Wasm + WebGPU attack surface (as shipped)

---
title: SQIsign Wasm + WebGPU threat model
description: Attack surface for SQIsign in this package — Wasm linear memory, stack zeroization, and why WebGPU is warmup only.
---

# SQIsign Wasm + WebGPU threat model

This is the attack-surface note referenced from [`SECURITY.md`](https://github.com/antonymott/quantum-resistant-rustykey/blob/main/SECURITY.md) and `AGENTS.md`. It describes **this package as shipped**, not a general isogeny-crypto paper.

:::warning Experimental WebGPU path
The `loadSqisignLvl*WebGpu()` loaders are **experimental** and **not for production** until `v1.0.0`. Today they run the **same SQIsign WASM** as the standard loaders, optionally in a dedicated Worker, plus a WebGPU **warmup** that does not perform signing math and **does not receive keys**. See [SQIsign-webGPU](../packages/sqisign-webgpu).
:::

## Assets

| Asset | Where it lives today |
| --- | --- |
| Long-term private keys | Caller-owned JS `Uint8Array` / `CryptoKey` after `keypair()` / `sign()` arguments. The library copies them onto the Emscripten stack for the C call. |
| Ephemeral keygen / sign seeds | JS `Uint8Array` from `crypto.getRandomValues`, then copied onto the Emscripten stack. |
| Isogeny walk / signing state | Inside the SQIsign **ref** C module (Wasm linear memory: stack frames and `malloc` heap). |
| GPU storage buffers | Warmup only. Filled with the constants `1` and `2`, then overwritten and `destroy()`ed. **Not keys.** |

Returned key objects remain readable by the same JS realm that called `keypair`. That class of access is **out of scope** for this library ([`SECURITY.md` Scope](https://github.com/antonymott/quantum-resistant-rustykey/blob/main/SECURITY.md)).

## Trust boundaries

1. **Same-tab JS** that holds the `Uint8Array` keys can always read them (DevTools, XSS, a shared closure). Enclave that signer; do not treat Wasm opacity as isolation from the page.
2. **Cross-origin isolation (COOP / COEP)** is required for the Worker + `SharedArrayBuffer` feature gate. Do not remove, weaken, or bypass `crossOriginIsolated === true` on WebGPU code paths. Forks that drop that gate are out of scope ([`SECURITY.md` Scope](https://github.com/antonymott/quantum-resistant-rustykey/blob/main/SECURITY.md)).
3. **GPU**. No key material is written to WebGPU buffers. The COOP/COEP gate is also a mitigation against the cross-tab GPU cache-timing class; putting keys on the GPU later would reopen that class and needs a new review.
4. **Host OS / hypervisor / physical access**. Out of scope. This is a userspace library.

## What the implementation does

Signing and keygen math for SQIsign, FN-DSA, and ML-DSA is **WASM-only**. The name `*WebGpu` is a Worker + warmup label, not GPU arithmetic.

### Emscripten stack (JS copies)

`withStack()` in `src/signature-common.ts` is the shared wrapper around `stackSave` / `stackAlloc` / `stackRestore` (SQIsign, FN-DSA, ML-DSA, and the accel worker).

On **every** exit, including thrown errors:

1. Each JS `stackAlloc` region is overwritten with `HEAPU8.fill(0, …)` (length taken from the allocation, not from secret bytes).
2. The span `[min(now, saved), max(now, saved))` is filled, covering alignment padding between the saved stack pointer and the current `stackSave()`.
3. Then `stackRestore` runs.

JS-owned ephemeral seeds / sign randomness are `fill(0)` after `withStack` returns or throws. **Caller-owned `private_key` buffers are not wiped.**

ML-KEM already zeroed its stack slots before `stackRestore`; signature suites now follow that pattern for JS-copied stack bytes.

### WebGPU warmup buffers

`warmupWebGpu()` writes dummy `u32` constants, runs a no-key XOR shader, then overwrites each buffer with zeros and `destroy()`s it on success and error paths.

## What this does not claim

| Residue | Status |
| --- | --- |
| JS `stackAlloc` copies of `sk` / seed | Wiped in `withStack` (success and throw). Covered by unit tests and a live SQIsign L1 module test. |
| C `malloc` / libc heap inside the SQIsign **ref** module | **Not wiped.** A full `HEAPU8.fill(0)` would also destroy module globals (including the test-build CTR-DRBG). Do not treat a heap scan after `sign()` as a complete secret-absence proof. |
| Restored **C** stack frames | After a C function returns, `STACKTOP` is typically back at the JS allocations. Bytes the C function used below that pointer can remain until reused. Not claimed wiped. |
| Constant-time behaviour of the WASM build | Upstream proofs apply to native C. Emscripten output needs its own review ([Security & WASM](../guides/security)). |
| GPU signing, GPU constant-time, or keys on GPU | **Not implemented.** Do not enable a GPU field path without a new threat-model revision and human security review. |

## Tests

```bash
pnpm test
```

Relevant cases:

- `src/signature-common.test.ts` — mock heap; secret gone after success and after throw; bytes outside the stack window left intact.
- `src/wasm-stack-zeroize.test.ts` — live SQIsign L1 `HEAPU8`; JS stack marker gone after success and after throw.
- `src/index.test.ts` — SQIsign L1 sign→verify also asserts the caller-owned `private_key` buffer is unchanged.

## Residual risk (honest)

A process or in-tab memory dump after `sign()` may still contain private-key bytes in the C heap or in restored C frames. The stack work removes the **JavaScript-copied** stack slots that were previously left intact after `stackRestore` alone. It is not a Wasm enclave.

Changes to cryptographic primitives, constant-time code, WGSL shaders, or memory zeroization need a threat-model reference, tests for the invariant, and **explicit human security-reviewer sign-off**. Agents must not self-merge those changes.

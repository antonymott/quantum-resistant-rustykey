# Security Policy

## Supported Versions

| Version | Supported | Notes |
|---|---|---|
| `0.x` (latest minor) | ✅ | Pre-1.0, active development — security fixes land on the latest minor |
| `0.x` (older minors) | ❌ | Please upgrade before reporting |
| WebGPU-accelerated code paths (all versions) | ⚠️ Experimental | Not production-supported until `v1.0.0` — see [Known Experimental Risk Area](#known-experimental-risk-area--webgpu-variants) |

## Reporting a Vulnerability

Please do not open a public GitHub issue for suspected security vulnerabilities.

- Preferred: use GitHub's private ["Report a vulnerability"](../../security/advisories/new) flow on this repo.
- Alternate: `a@uqs.org`

We aim to acknowledge new reports within 72 hours, provide an initial severity assessment within 5 business days, and default to 90-day coordinated disclosure, extendable by mutual agreement for complex fixes (e.g., anything requiring a WGSL/Wasm ABI change).

Hackathon / TPAC write-ups: please report here **before** posting a “we extracted the key” claim, and say which [track](#hackathon-and-research-classification) the result belongs to. Safe harbor below still applies.

## Scope

**In scope:**
- Source of the `quantum-resistant-rustykey` package as published to npm, used per the documented API in `README.md`
- Both the WebAssembly (Node + browser) and WebGPU (browser, `crossOriginIsolated`) code paths, including SQIsign, ML-DSA, FN-DSA, SLH-DSA, and ML-KEM implementations
- Residual secret material left in Wasm linear memory (`HEAPU8`) or GPU buffers **after a public API call returns** — including when there is not yet a documented cleanup function. Observing that residue may require same-process access; the bug is still ours.
- Timing or cache leakage from **our** `keygen` / `sign` / `verify` that enables private-key recovery or signature forgery by a party who does **not** already hold the `Uint8Array` we returned to the caller
- Build/release tooling in this repo (supply-chain issues in our own publish pipeline)

**Out of scope:**
- Forks or locally patched builds that remove, bypass, or weaken the `crossOriginIsolated` / COOP–COEP gate on WebGPU code paths. This gate is a deliberate isolation boundary. Bypassing it reopens SharedArrayBuffer / high-resolution-timer / (future) GPU-cache surfaces; key-recovery on such a build is not a vulnerability in the maintained package.
- Reading the caller-owned `Uint8Array` that `keypair()` / `sign()` already returned, or any other value the integrator stored in the same JS execution context (DevTools on `window`, a shared closure, a global). That is a hosting failure to enclave the signer, not a library flaw. Distinct from leftover copies **inside** Wasm/GPU that the library failed to clear — those are in scope.
- Attacks requiring a compromised host OS, hypervisor, or physical access (voltage glitching, hardware probes). Side-channel resistance against a fully compromised host is a harder class than this userspace/browser library can guarantee.
- Browser/GPU-driver sandbox escapes (Dawn, ANGLE, vendor compilers) used as a generic Chrome/Firefox 0-day, unless our shaders/buffers are the trigger **and** the result is key recovery/forgery in a supported configuration. Please still report; we will route vendor bugs to the browser vendor.
- The deployed pqc.rustykey.me testbed production services (including DID creator, DID resolver, DWN mesh, WebAuthn flows, rppg-orchestrator and saccades liveness checks). These follow a separate, live-service incident response process — please still report via the address above, but flag clearly that it's a service issue, not a library issue.
- Resource-exhaustion / DoS from adversarially large inputs to local Wasm/WebGPU compute, unless it also causes a memory-safety violation.
- Vulnerabilities in the underlying published cryptographic schemes themselves (as opposed to our implementation of them) — see [Cryptographic Algorithm Concerns](#cryptographic-algorithm-concerns) below.

## Known Experimental Risk Area — WebGPU Variants

SQIsign's `*WebGpu` loaders (L5/L3/L1) are explicitly marked experimental, no production use, pre-`v1.0.0` in the README.

**What they do today:** the same SQIsign WASM as the standard loaders, optionally inside a dedicated Worker, plus a non-secret WebGPU warmup shader. They do **not** currently move isogeny / quaternion arithmetic onto the GPU. Private keys still exist as JS `Uint8Array`s.

**Why they are still experimental:** (1) the vendored SQIsign **ref** C is not a constant-time implementation; `crossOriginIsolated` pages also unlock high-resolution timers that make Wasm timing attacks *easier*; (2) Worker + `postMessage` is not an enclave; (3) a future WGSL field path would add GPU L2 cache and leftover-local leakage that today's warmup does not yet create; (4) the COOP/COEP gate is easy for an integrator to bypass or to misunderstand as “the key is isolated.”

Attack-surface note (as shipped): [`website/docs/security/threat-model.md`](./website/docs/security/threat-model.md). JS `stackAlloc` copies of `sk` / seed are wiped on success and error; C `malloc` leftovers and restored C frames are **not** claimed wiped. Signing math is WASM-only; WebGPU is warmup.

If you're researching this area, we're especially interested in reports here — see [Safe Harbor](#safe-harbor) below.

## Hackathon and research classification

If you recover key material, say which of these you did — they are scored differently:

- **Library defect:** leftover bytes in `HEAPU8` / GPU buffers after the API returns (JS stack copies are wiped; C-heap / C-frame residue is still in scope if found); variable-time signing that leaks the key from another origin; memory-safety in our WASM. Report here.
- **Integration / same-context read:** you opened DevTools on the page that called `keypair()` and read the `Uint8Array` we handed the page. Out of scope for “breaking SQIsign.” Still useful as a demo of why the signer must be enclaved; please do not headline it as a cryptographic break.
- **OPFS wallet, outside the ceremony:** with `loadOpfsSkWallet`, at-rest bytes are AES-GCM ciphertext. Recovering `sk` from OPFS without the WebAuthn PRF is the intended bar for “extraction after the API returned.” Recovering `sk` **during** that wallet’s keygen/sign window (same-tab DevTools, worker HEAP dump mid-op) is the same class as a same-context read of a live ceremony — still report it, but it is not “the disk was plaintext.” `SECURITY.md` Scope is unchanged: leftover Wasm copies **after** the public API returns remain in scope.
- **Future GPU math:** Prime+Probe / leftover-locals against shaders that hold secrets. Not reachable on today's warmup shader; in scope the moment we ship secret-touching WGSL.

## Cryptographic Algorithm Concerns

If you believe you've found a weakness in SQIsign, ML-DSA, FN-DSA, SLH-DSA, or ML-KEM as specified (rather than in our implementation of them), please report it to us and to the relevant standards body / reference implementation maintainers (e.g., the NIST PQC forum, the SQIsign team) in parallel — that class of issue is broader than this package.

## Safe Harbor

We support good-faith security research, including organized hackathon / TPAC challenge participation. If you make a good-faith effort to comply with this policy during your research — including not accessing or modifying data beyond what's needed to demonstrate an issue, not attacking pqc.rustykey.me production users, and giving us a reasonable time to respond before any public disclosure — we will credit you (unless you prefer to remain anonymous) once the issue is fixed and disclosed.

## Credit

With your permission, we will credit reporters in the fix's release notes and in a `SECURITY-THANKS.md` acknowledgments file.

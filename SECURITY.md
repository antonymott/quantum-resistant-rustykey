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

## Scope

**In scope:**
- Source of the `quantum-resistant-rustykey` package as published to npm, used per the documented API in `README.md`
- Both the WebAssembly (Node + browser) and WebGPU (browser, `crossOriginIsolated`) code paths, including SQIsign, ML-DSA, FN-DSA, SLH-DSA, and ML-KEM implementations
- Build/release tooling in this repo (supply-chain issues in our own publish pipeline)

**Out of scope:**
- Forks or locally patched builds that remove, bypass, or weaken the `crossOriginIsolated` / COOP–COEP gate on WebGPU code paths. This gate is a deliberate mitigation against the cross-tab GPU cache-timing side-channel class documented in [`docs/security/threat-model.md`](./website/docs/security/threat-model.md) — bypassing it reopens that attack surface, and any key-recovery incident on such a build is not a vulnerability in the maintained package.
- Key material accessed via the same JS execution context/tab/process that performed keygen (e.g., DevTools inspection, a global variable, a shared closure). This describes a hosting/integration failure to enclave the signer — the same class of issue as bypassing the `crossOriginIsolated` gate — not a flaw in the library itself.
- Attacks requiring a compromised host OS, hypervisor, or physical access to the machine. Side-channel resistance against a fully compromised host is a distinct, harder threat class than this userspace/browser library can guarantee — see the threat model doc for what is and isn't covered.
- The deployed pqc.rustykey.me testbed production services (including DID creator, DID resolver, DWN mesh, WebAuthn flows, rppg-orchestrator and saccades liveness checks). These follow a separate, live-service incident response process — please still report via the address above, but flag clearly that it's a service issue, not a library issue.
- Resource-exhaustion / DoS from adversarially large inputs to local Wasm/WebGPU compute, unless it also causes a memory-safety violation.
- Vulnerabilities in the underlying published cryptographic schemes themselves (as opposed to our implementation of them) — see [Cryptographic Algorithm Concerns](#cryptographic-algorithm-concerns) below.

## Known Experimental Risk Area — WebGPU Variants

SQIsign's WebGPU-accelerated variants (L5/L3/L1) are explicitly marked experimental, no production use, pre-`v1.0.0` in the README. Combining WebAssembly and WebGPU with the mathematical structure of isogenies shifts likely attack vectors toward algorithmic side-channels, GPU memory-architecture quirks, and Wasm/WGSL memory-safety mismatches. Full analysis: [`docs/security/threat-model.md`](./website/docs/security/threat-model.md).

If you're researching this area, we're especially interested in reports here — see [Safe Harbor](#safe-harbor) below.

## Cryptographic Algorithm Concerns

If you believe you've found a weakness in SQIsign, ML-DSA, FN-DSA, SLH-DSA, or ML-KEM as specified (rather than in our implementation of them), please report it to us and to the relevant standards body / reference implementation maintainers (e.g., the NIST PQC forum, the SQIsign team) in parallel — that class of issue is broader than this package.

## Safe Harbor

We support good-faith security research. If you make a good-faith effort to comply with this policy during your research — including not accessing or modifying data beyond what's needed to demonstrate an issue, and giving us a reasonable time to respond before any public disclosure — we will credit you (unless you prefer to remain anonymous) once the issue is fixed and disclosed.

## Credit

With your permission, we will credit reporters in the fix's release notes and in a `SECURITY-THANKS.md` acknowledgments file.
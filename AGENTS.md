# AGENTS.md

Instructions for AI coding agents (and human contributors) working in this repository:
`quantum-resistant-rustykey` — a TypeScript-first WASM (+ experimental WebGPU) 
post-quantum crypto library (SQIsign, ML-DSA, FN-DSA, SLH-DSA, ML-KEM) for Node and 
browser, working testbed at pqc.rustykey.me. RustyKey® is a
FIDO® Alliance member.

**Read the "Non-negotiable Security Invariants" section before making any change.**
If a task requires touching any of them, stop and ask a human maintainer instead of
proceeding on inference alone.

## Non-negotiable Security Invariants

1. **Never** remove, weaken, or make conditional/bypassable the `crossOriginIsolated:true` 
   / COOP–COEP gate around WebGPU code paths, even as part of an "unrelated" refactor.
2. **Never** introduce non-constant-time branches, table lookups, or early returns keyed 
   on secret material (private keys, ephemeral exponents, isogeny walk data) in 
   signing/keygen code — including changes that look purely stylistic (e.g., "simplifying" 
   a branchless `select` back into an `if`).
3. **Never** remove or shortcut explicit zeroization of Wasm linear memory or GPU storage 
   buffers after use — including on error, exception, and early-return paths.
4. **Never** add network calls, telemetry, analytics, or logging that could transmit key 
   material, DIDs, biometric/rPPG/saccades in-browser liveness data, or any user-identifying data. This project's 
   stated goal is zero PII — no e164, email, password, passphrase, or similar.
5. **Never** silently downgrade a signature/keygen call to a weaker COSE algorithm than 
   requested — surface an explicit error instead.
6. **Never** loosen TLS/PQC negotiation defaults (e.g., ML-KEM in TLS 1.3, Ed25519/Ed448 
   as the minimum fallback) in example code, tests, or config templates a consumer might 
   copy-paste into production.
7. **Never** remove or soften the "experimental / no production use until v1.0.0" status 
   of WebGPU code paths in README, docs, badges, or version metadata without explicit 
   maintainer approval.
8. **Never** edit the *Scope* section of `SECURITY.md`, or the WebGPU warning language 
   in `README.md`, without explicit maintainer approval — this wording is deliberately 
   calibrated, not casual copy.

## Project Overview

- Public npm package: `quantum-resistant-rustykey`
- Targets: Node (WASM-only backend) and browser (WASM default, optional WebGPU 
  acceleration for SQIsign when `crossOriginIsolated === true`)
- Docs: GitHub Pages (`antonymott.github.io/quantum-resistant-rustykey`)

## Setup Commands

```bash
pnpm i quantum-resistant-rustykey@latest
# or
bun add quantum-resistant-rustykey@latest
npm add quantum-resistant-rustykey@latest
```

## Code Style

- Linted/format: always lint using included rules, do not disable rules inline without 
  a comment explaining why.
- TypeScript v7 or higher, strict mode. No `any` in public API surfaces.

## Build

```bash
git clone https://github.com/antonymott/quantum-resistant-rustykey.git
cd quantum-resistant-rustykey
pnpm i
pnpm fetch:vendors   # verify vendor/ trees match vendor.lock.json
pnpm build
```

## Audit build

```bash
pnpm build:audit
# outputs under wasm/audit-build/ (gitignored; also uploaded from CI)
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
- `website/docs/security/threat-model.md` — SQIsign Wasm+WebGPU attack surface analysis
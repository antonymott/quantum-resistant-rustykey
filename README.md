# <img src="./logo-rustykey.png" width="48" align="center" alt="" /> quantum-resistant-rustykey

[![npm version](https://img.shields.io/npm/v/quantum-resistant-rustykey)](https://www.npmjs.com/package/quantum-resistant-rustykey)
[![docs](https://img.shields.io/badge/docs-GitHub%20Pages-1a5f4a)](https://antonymott.github.io/quantum-resistant-rustykey/)
![Node v26.5.0](https://img.shields.io/badge/node-v26.5.0-blue.svg)

TypeScript-first **WebAssembly post-quantum** crypto for Node and the browser — SQIsign, ML-DSA, FN-DSA, SLH-DSA, ML-KEM.  
RustyKey® is a **FIDO Alliance** member.

```bash
pnpm i quantum-resistant-rustykey@latest
```

TypeScript types are included (`dist/index.d.ts`) — no `@types/quantum-resistant-rustykey`.

**Docs:** [antonymott.github.io/quantum-resistant-rustykey](https://antonymott.github.io/quantum-resistant-rustykey/)  
**Live testbed:** [pqc.rustykey.me](https://pqc.rustykey.me)  
**License:** ISC

WASM modules are compiled from pinned C under `vendor/` (see `vendor.lock.json`). Independent C→WASM check: `REQUIRE_REPRODUCIBLE=1 pnpm build:vendor && pnpm verify:repro`. Provenance: [Supply-chain provenance](https://antonymott.github.io/quantum-resistant-rustykey/docs/guides/provenance).

> Pre-production until v1.0.0. Prefer `@latest` (or a caret range) so dependents pick up patches.

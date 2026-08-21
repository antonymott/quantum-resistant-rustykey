---
title: Security & WASM
description: Upstream verification, C→WASM choices, and SQIsign vs SIDH.
---

# Security & WASM

This package relies on upstream **mlkem-native** for arithmetic and security properties. Parameter sets 512 / 768 / 1024 share one implementation family and differ by compile-time `MLK_CONFIG_PARAMETER_SET`.

:::important
Formal proofs validate **native C / assembly**. Once that code is compiled through our `wasm/Makefile`, those upstream formal-verification guarantees no longer apply as-is to the shipped WASM.
:::

## Upstream evidence

- [mlkem-native README](https://github.com/pq-code-package/mlkem-native/blob/main/README.md)
- [SOUNDNESS.md](https://github.com/pq-code-package/mlkem-native/blob/main/SOUNDNESS.md)
- [HOL-Light proofs](https://github.com/pq-code-package/mlkem-native/blob/main/proofs/hol_light/README.md)
- [CBMC proofs](https://github.com/pq-code-package/mlkem-native/blob/main/proofs/cbmc/README.md)

Constant-time claims live with upstream. This package builds the same source for all three KEM sizes by changing only the parameter define in `wasm/Makefile`.

## Why C → Emscripten (not Rust cores)

We are not rewriting cryptography from scratch. Shipped WASM modules are built with **Emscripten from vetted C** upstream (mlkem-native, Falcon ref, SQIsign). Rust/TypeScript wrap the package ergonomics.

Reasons we stay on C cores for now:

- **Upstream reliability** — audited constant-time C for NIST algorithms
- **Traceability** — security claims attach to the C that was reviewed
- **Toolchain maturity** — Emscripten remains a practical bridge for specialized C → web
- **Rust still matters** — for orchestration, validation, and integration layers

**Downstream security ≠ upstream security.** WASM opacity and compile transforms can change timing behavior; treat WASM ports as needing their own review.

## SQIsign vs SIDH

The algorithm spectacularly broken in 2022 was **SIDH** (Castryck–Decru / auxiliary torsion points). **SQIsign** is different: it relies on the Deuring correspondence (supersingular curves ↔ quaternion algebras), not the SIDH auxiliary-point problem. NIST accepted SQIsign onto the additional-signatures / on-ramp track.

## Side-channel note

This implementation includes patches aimed at side-channel resistance. Background reading: [KyberSlash / related work](https://kannwischer.eu/papers/2024_kyberslash_preprint20240628.pdf).

## Independent checks

```bash
pnpm fetch:vendors
REQUIRE_REPRODUCIBLE=1 pnpm build:vendor
pnpm verify:repro
rg "MLK_CONFIG_PARAMETER_SET=512|MLK_CONFIG_PARAMETER_SET=768|MLK_CONFIG_PARAMETER_SET=1024" wasm/Makefile
rg "mlk_fqmul|mlk_barrett_reduce" vendor/mlkem-native/mlkem/src/poly.c
rg "constant-time|HOL-Light|CBMC" vendor/mlkem-native/README.md vendor/mlkem-native/SOUNDNESS.md
```

See [Supply-chain provenance](./provenance) for Sigstore vs reproducible C→WASM, and where public audit source maps are published.

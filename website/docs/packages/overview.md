---
title: Package overview
description: Algorithms and loaders shipped by quantum-resistant-rustykey.
---

# Package overview

All cryptographic **signature** loaders share one interface: `keypair()`, `sign()`, `verify()`, and `buffer_to_string()`.

## Public loaders

```ts
import {
  // KEM
  loadMlKem512,
  loadMlKem768,
  loadMlKem1024,
  // Signatures
  loadFnDsa512,
  loadFnDsa1024,
  loadMlDsa3,
  loadMlDsa5,
  loadSqisignLvl1,
  loadSqisignLvl3,
  loadSqisignLvl5,
  loadSlhDsa128,
  loadSlhDsa192,
  loadSlhDsa256,
  // Browser-accelerated SQIsign
  loadSqisignLvl1WebGpu,
  loadSqisignLvl3WebGpu,
  loadSqisignLvl5WebGpu,
  getSqisignWebGpuSupport,
  setSqisignAccelWorkerUrl,
} from "quantum-resistant-rustykey";
```

## Specification notice (SQIsign identifiers)

COSE/JOSE algorithm IDs (`-61`, `-62`, `-63`) and strings (`SQIsign-L1`, `SQIsign-L3`, `SQIsign-L5`) follow the active [cose-sqisign](https://datatracker.ietf.org/doc/draft-mott-cose-sqisign/) Internet-Draft. They are **provisional** — not final IANA assignments. Use them for interop testing and R&D.

## Why SQIsign matters for WebAuthn

Many FIDO2 / CTAP2 authenticators use a ~**1024-byte** buffer. Dilithium-class signatures (~2.4 KB) and Falcon-1024 do not fit. SQIsign signatures (~200 bytes class) are currently the practical PQC option that fits with metadata.

## Credits

- NIST (ML-KEM, ML-DSA, SLH-DSA / FN-DSA lineage)
- SQIsign team — official C at [`SQISign/the-sqisign`](https://github.com/SQISign/the-sqisign)
- ML-KEM packaging approach adapted from [mlkem-wasm](https://github.com/dchest/mlkem-wasm)

## Funding

Supported by University of Quantum Science, RustyKey®, Customers' Yachts® Advisors, and [BuzzyBee®](https://buzzybee.ai).

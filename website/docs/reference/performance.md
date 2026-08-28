---
title: Performance & KATs
description: Benchmark table and known-answer test notes.
---

# Performance & KATs

Measured on a standard Node.js / WASM development environment — your numbers will vary.

| Algorithm | KeyGen (ms) | Sign (ms) | Verify (ms) |
| --- | :---: | :---: | :---: |
| FN-DSA-512 | 8.13 | 0.74 | 0.78 |
| FN-DSA-1024 | 25.62 | 1.25 | 0.24 |
| ML-DSA-3 | 0.22 | 0.45 | 0.25 |
| ML-DSA-5 | 0.33 | 0.63 | 0.34 |
| SQIsign L1 | 99.95 | 534.41 | 15.35 |
| SQIsign L3 | — | — | — |
| SQIsign L5 | 312.47 | 1823.16 | 48.92 |

## Known Answer Tests

CI checks **verify** against NIST / reference vectors (count=0 `.rsp` excerpts inlined in `src/sqisign-kat-lvl1.ts`). **Sign/keygen KAT** regression is not in default CI (runtime). L1 sign→verify round-trip is covered in `src/index.test.ts`.

### ML-DSA-3

- **Msg**: `6dbbc4375136df3b07f7c70e639e223e`
- Full vectors in `src/*.test.ts`

### FN-DSA-1024

- **Msg**: `6dbbc4375136df3b07f7c70e639e223e`

### SQIsign Level 5

- **Msg**: `d81c4d8d734fcbfbeade3d3f8a039faa2a2c9957e835ad55b22e75bf57bb556ac8`

Byte-perfect fixtures live in the package tests and KAT exports.

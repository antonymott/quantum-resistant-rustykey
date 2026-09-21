---
title: API overview
description: Public exports from quantum-resistant-rustykey with usage notes.
---

# API overview

Human-oriented map of the public surface.

## Types

TypeScript declarations ship with the package (`dist/index.d.ts` via `"types"` / `exports`). You do **not** need `@types/quantum-resistant-rustykey`.

| Type | Role |
| --- | --- |
| `IFnDsa` / `IMlDsa` | Shared signature API (`keypair` / `sign` / `verify`) |
| `IMlKem` | ML-KEM API |
| `KeyPair` | Signature key handles → `Uint8Array` |
| `MlKemKeyPair` | KEM key handles → `CryptoKey` |
| `BytesLike` | `Uint8Array` \| `ArrayBuffer` \| hex `string` |
| `EncryptResult` | KEM encapsulate result (`cyphertext` / `secret`) |
| `IOpfsSkWallet` | Browser OPFS encrypted-sk wallet |
| `OpfsSkAlgorithm` | Wallet algorithm id |
| `OpfsSkPrfMaterial` | `{ prfOutput, salt, userVerified: true }` |

Import types alongside loaders, e.g. `import { loadSqisignLvl1, type IFnDsa } from "quantum-resistant-rustykey"`.

## KEM

| Export | Description |
| --- | --- |
| `loadMlKem512()` | ML-KEM-512 loader |
| `loadMlKem768()` | ML-KEM-768 loader |
| `loadMlKem1024()` | ML-KEM-1024 loader |

Each loader returns an object with `keypair()`, `encrypt()`, `decrypt()`, `encryptMessage()`, `decryptMessage()`, `buffer_to_string()`.

## Signatures (`IFnDsa`-style)

| Export | Algorithm |
| --- | --- |
| `loadFnDsa512` / `loadFnDsa1024` | FN-DSA (Falcon) |
| `loadMlDsa3` / `loadMlDsa5` | ML-DSA |
| `loadSqisignLvl1` / `Lvl3` / `Lvl5` | SQIsign WASM |
| `loadSlhDsa128` / `192` / `256` | SLH-DSA (JS) |

Common methods: `keypair()`, `sign()`, `verify()`, `buffer_to_string()`.

## SQIsign-webGPU (browser)

| Export | Role |
| --- | --- |
| `loadSqisignLvl1WebGpu` / `Lvl3` / `Lvl5` | Accelerated loaders |
| `getSqisignWebGpuSupport()` | Feature detection |
| `isSqisignWebGpuAvailable()` | Boolean helper |
| `benchSqisignWebGpu(level)` | Built-in bench |
| `setSqisignAccelWorkerUrl(url)` | Worker path override |
| `SQISIGN_WEBGPU_VARIANT_LABELS` | Display labels |

## OPFS encrypted-sk wallet (browser)

Requires `crossOriginIsolated`. Browser `load*().keypair()` / `.sign()` throw; use this wallet. Node loaders stay unconstrained. See [OPFS encrypted-sk wallet](../packages/opfs-sk).

| Export | Role |
| --- | --- |
| `loadOpfsSkWallet()` | Worker + OPFS AES-GCM wallet |
| `setOpfsSkWorkerUrl(url)` | Worker path override |
| `OPFS_SK_ALGORITHMS` | SQIsign, ML-DSA, FN-DSA, SLH-DSA ids |
| `OPFS_SK_SLOT_SD_BUNDLE` | Static demo slot name (`sd-bundle`) |
| `assertOpfsSkCrossOriginIsolated()` | COI gate |
| `assertBrowserSkCeremonyAllowed()` | Throws in the page; allows Node and the OPFS worker |
| `opfsSkPrfOutputFromExtensionResults()` | Read WebAuthn PRF output |
| `opfsSkPrfMaterialFromCeremony()` | Build `{ prfOutput, salt, userVerified: true }` |
| `opfsSkTriggerWebAuthn()` | create: `prf: {}`; get: UV + `prf.eval` |

## KAT hex exports

`SQISIGN_LVL*_KAT0_*_HEX` constants for known-answer checks (see package entry).

## License

ISC

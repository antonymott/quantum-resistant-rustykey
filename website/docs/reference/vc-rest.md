---
title: VC REST endpoints
description: Reference HTTP surface on pqc.rustykey.me that wraps this library.
---

# Verifiable Credentials REST (testbed)

The package itself ships **no server**. The **[pqc.rustykey.me](https://pqc.rustykey.me)** testbed wraps these loaders in Next.js route handlers so you can produce W3C VC data-integrity proofs over HTTP.

All endpoints are server-side (`runtime: "nodejs"`) JSON.

## `POST /api/pqc/vc/sign`

One-shot: fresh keypair → canonicalize → hash → proof.

| Field | Type | Description |
| --- | --- | --- |
| `document` | object | Unsecured W3C credential payload |
| `algorithm` | string | See table below |
| `dataset_canonicalization` | `"rdfc"` \| `"jcs"` | RDF Dataset Canonicalization or JSON Canonicalization Scheme |

**Algorithms:** `SQIsign-L1` / `L3` / `L5`, `mldsa44`, `falcon512`, `slhdsa128` / `192` / `256`.

```bash
curl -X POST https://pqc.rustykey.me/api/pqc/vc/sign \
  -H "Content-Type: application/json" \
  -d '{
    "document": { "@context": ["https://www.w3.org/ns/credentials/v2"], "type": ["VerifiableCredential"] },
    "algorithm": "slhdsa128",
    "dataset_canonicalization": "rdfc"
  }'
```

## `POST /api/pqc/vc/proof`

Lower-level pipeline / BYO keys:

- **Proof pipeline** — `unsecuredDocument`, `family` (`sqisign` \| `mldsa` \| `falcon` \| `slhdsa`), `level`, `canonicalization`, keys
- **Sign-only** — `hashDataHex` + family/level/keys

## `PUT /api/pqc/vc/proof`

Keygen: `{ "family": "slhdsa", "level": "l1" }` → `publicKeyHex` / `secretKeyHex`.

## Selective Disclosure (`sqisign1-sd-2026`)

Interactive UI: [https://pqc.rustykey.me/#vc-di-quantum-resistant-sd](https://pqc.rustykey.me/#vc-di-quantum-resistant-sd)

Completes the W3C VC-DI Quantum-Resistant SD appendix for SQIsign-I (shared common-outputs with ML-DSA / SLH-DSA / Falcon SD vectors). Responses are byte-stable against the published golden vectors.

### `GET /api/pqc/vc/sd`

| Query | Description |
| --- | --- |
| `cryptosuite` | `sqisign1-sd-2026` (default), `mldsa44-sd-2024`, `slhdsa128-sd-2024`, or `falcon512-sd-2024` |

Returns Table 13 metadata, Example 34 `proofHash`, Example 40 `signature`, base/derived documents, and `matchesGolden` flags.

```bash
curl 'https://pqc.rustykey.me/api/pqc/vc/sd?cryptosuite=sqisign1-sd-2026'
```

### `POST /api/pqc/vc/sd`

| Field | Type | Description |
| --- | --- | --- |
| `cryptosuite` | string | Same values as GET |
| `action` | `"appendix"` \| `"issue-base"` \| `"derive"` \| `"verify"` | Default `appendix` |

```bash
curl -X POST https://pqc.rustykey.me/api/pqc/vc/sd \
  -H "Content-Type: application/json" \
  -d '{"cryptosuite":"sqisign1-sd-2026","action":"appendix"}'
```

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
| `dataset_canonicalization` | `"rdfc"` \| `"ics"` | RDFC or JCS-style |

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

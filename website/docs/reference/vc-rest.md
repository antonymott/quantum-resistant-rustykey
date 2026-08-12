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

Completes the W3C [VC-DI Quantum-Resistant](https://w3c.github.io/vc-di-quantum-resistant/) SD appendix for **SQIsign-I**. HMAC salts / saltedHashes / mandatoryHash / labelMap are the shared Category‑1 common outputs (same as ML-DSA / Falcon / SLH). Only the SQIsign-specific `proofHash`, signature, and CBOR `proofValue`s are suite-private.

Responses are **byte-stable**: the JSON fields below are the exact strings proposed for the draft examples (no regeneration on each request).

### One curl for W3C reviewers (copy-paste)

Paste this into a terminal. The JSON body is large; that is intentional — it contains the full suggested appendix examples so reviewers can confirm byte-for-byte equality against a proposed draft edit.

```bash
curl -sS 'https://pqc.rustykey.me/api/pqc/vc/sd?cryptosuite=sqisign1-sd-2026' | jq .
```

(`jq` is optional; omit `| jq .` if you only want the raw JSON.)

Equivalent POST (same golden payload via `action: "appendix"`):

```bash
curl -sS -X POST https://pqc.rustykey.me/api/pqc/vc/sd \
  -H "Content-Type: application/json" \
  -d '{"cryptosuite":"sqisign1-sd-2026","action":"appendix"}' | jq .
```

### JSON → draft example map

| Response field | Maps to draft |
| --- | --- |
| `table13` / `appendix.table13` | Table 13 cryptosuite row (`sqisign1-sd-2026`, SQIsign-I, 148) |
| `proofHash` / `appendix.example34ProofHash` | Example 34 SD Base Hashing `proofHash` (64 hex) |
| `signature` / `appendix.example40Signature` | Example 40 PQC Signatures entry (296 hex / 148 bytes) |
| `baseDocument` | Example 37A Base VC (includes `proof.proofValue`) |
| `derivedDocument` | Example 43A Derived VC (includes `proof.proofValue`) |
| `baseProofValue` / `derivedProofValue` | Standalone multibase `u…` strings (same as the documents’ `proof.proofValue`) |
| `matchesGolden.*` | Always `true` for this GET/appendix path (fixtures, not live re-sign) |

Optional extractors (still one request):

```bash
# Example 34 proofHash only
curl -sS 'https://pqc.rustykey.me/api/pqc/vc/sd?cryptosuite=sqisign1-sd-2026' \
  | jq -r '.proofHash'

# Example 40 signature only
curl -sS 'https://pqc.rustykey.me/api/pqc/vc/sd?cryptosuite=sqisign1-sd-2026' \
  | jq -r '.signature'

# Full Base / Derived VCs (Examples 37A / 43A)
curl -sS 'https://pqc.rustykey.me/api/pqc/vc/sd?cryptosuite=sqisign1-sd-2026' \
  | jq '.baseDocument, .derivedDocument'
```

### `GET /api/pqc/vc/sd`

| Query | Description |
| --- | --- |
| `cryptosuite` | `sqisign1-sd-2026` (default), `mldsa44-sd-2024`, `slhdsa128-sd-2024`, or `falcon512-sd-2024` |

### `POST /api/pqc/vc/sd`

| Field | Type | Description |
| --- | --- | --- |
| `cryptosuite` | string | Same values as GET |
| `action` | `"appendix"` \| `"issue-base"` \| `"derive"` \| `"verify"` | Default `appendix`. Use `appendix` (or GET) for the byte-stable W3C check; other actions run the live pipeline and may set `matchesGolden` from recomputation. |

---
title: SLH-DSA
description: NIST FIPS 205 hash-based signatures (SHA2 small-signature sets).
---

# SLH-DSA (SPHINCS+)

Stateless **hash-based** signatures standardized in [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final). Security rests on the hash function — conservative assumptions, large signatures, slow signing.

This package ships the three SHA2 **`s` (small-signature)** sets via [`@noble/post-quantum`](https://github.com/paulmillr/noble-post-quantum) (pure JS — works in Node and browsers, no WASM / COOP-COEP).

| Loader | Variant | COSE (provisional) | PK | SK | Signature |
| --- | --- | :---: | :---: | :---: | :---: |
| `loadSlhDsa128()` | SLH-DSA-SHA2-128s | `0x1220` | 32 B | 64 B | 7,856 B |
| `loadSlhDsa192()` | SLH-DSA-SHA2-192s | `0x1221` | 48 B | 96 B | 16,224 B |
| `loadSlhDsa256()` | SLH-DSA-SHA2-256s | `0x1222` | 64 B | 128 B | 29,792 B |

:::note
COSE code points above are **provisional** for testbed/interop. Cryptosuite names follow W3C VC data-integrity patterns (`slhdsa128-rdfc-2024`, etc.).
:::

:::warning
Unsuitable for the CTAP2 1024-byte WebAuthn buffer. Prefer where hash-only security matters and bandwidth is not tight (firmware, archival VCs).
:::

```ts
import { loadSlhDsa128 } from "quantum-resistant-rustykey";

async function demo() {
  const slh = await loadSlhDsa128(); // or loadSlhDsa192 / loadSlhDsa256
  const kp = slh.keypair();
  const publicKey = await kp.get("public_key");
  const privateKey = await kp.get("private_key");

  const message = new TextEncoder().encode("Authored by RustyKey (SLH-DSA)");
  const signature = await slh.sign(message, privateKey);
  const isValid = await slh.verify(signature, message, publicKey);
  console.log("SLH-DSA-SHA2-128s valid?", isValid);
}

demo().catch(console.error);
```

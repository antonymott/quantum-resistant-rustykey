---
title: Signatures
description: Shared signature API for SQIsign, FN-DSA, and ML-DSA.
---

# Signatures

All signature variants expose the same surface: `keypair()`, `sign()`, `verify()`, `buffer_to_string()` — typed as [`IFnDsa`](../reference/api) (types ship with the package; no `@types/…` install).

:::note SQIsign performance
Level 1 signing can take seconds (or longer) depending on hardware. Prefer **sign-once, verify-many** for certificates and firmware-style use.
:::

## Node.js / backend

```ts
import {
  loadSqisignLvl1,
  loadSqisignLvl5,
  loadFnDsa512,
  type IFnDsa,
} from "quantum-resistant-rustykey";

async function demo(): Promise<void> {
  const message: Uint8Array = new TextEncoder().encode("RustyKey signature test");

  const variants: ReadonlyArray<readonly [string, IFnDsa]> = [
    ["SQIsign-I", await loadSqisignLvl1()],
    ["SQIsign-V", await loadSqisignLvl5()],
    ["FN-DSA-512", await loadFnDsa512()],
  ];

  for (const [name, signer] of variants) {
    const kp = signer.keypair();
    const pk: Uint8Array = await kp.get("public_key");
    const sk: Uint8Array = await kp.get("private_key");
    const sig: Uint8Array = await signer.sign(message, sk);
    const ok: boolean = await signer.verify(sig, message, pk);
    console.log(`${name}:`, ok ? "OK" : "FAIL");
  }
}

demo().catch(console.error);
```

## Browser

Browser `load*().keypair()` / `.sign()` throw. Keygen and sign go through the [OPFS encrypted-sk wallet](./opfs-sk) (WebAuthn UV + PRF, ciphertext at rest). `verify()` can still use the standard loaders.

```ts
import {
  loadOpfsSkWallet,
  loadSqisignLvl1,
  opfsSkTriggerWebAuthn,
  setOpfsSkWorkerUrl,
  OPFS_SK_SLOT_SD_BUNDLE,
} from "quantum-resistant-rustykey";

setOpfsSkWorkerUrl("/pqc/opfs-sk-worker.js");

const { prf } = await opfsSkTriggerWebAuthn({
  mode: "get",
  publicKey: authenticationOptions, // RP options used prf: {}
  salt,
});
const wallet = await loadOpfsSkWallet();
const { public_key } = await wallet.keygen("sqisign-lvl1", prf, {
  slot: OPFS_SK_SLOT_SD_BUNDLE,
});
const message = new TextEncoder().encode("hello from browser signatures");
const signature = await wallet.sign("sqisign-lvl1", message, prf, {
  slot: OPFS_SK_SLOT_SD_BUNDLE,
});
const sq = await loadSqisignLvl1();
const ok = await sq.verify(signature, message, public_key);
```

## Web app security notes

- Never store private keys in `localStorage` / `sessionStorage`
- Prefer HTTPS and short-lived keys
- Browser private keys stay AES-GCM ciphertext in OPFS; unwrap only inside the wallet worker after WebAuthn UV + PRF

Also see [SLH-DSA](./slh-dsa) and [SQIsign-webGPU](./sqisign-webgpu).

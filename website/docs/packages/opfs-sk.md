---
title: OPFS encrypted-sk wallet
description: Browser-only PRF-wrapped private keys in OPFS for all four signature families.
---

# OPFS encrypted-sk wallet

In the **browser**, keygen and sign for SQIsign, ML-DSA, FN-DSA, and SLH-DSA (including SQIsign `*-webgpu` ids) **must** go through `loadOpfsSkWallet()`. `load*().keypair()` and `.sign()` throw on the page. Node and server REST `load*()` loaders are unchanged. `verify()` is not gated.

Unencrypted `sk` exists only inside the **keygen/sign window** in a dedicated Worker (`name: qrr-opfs-sk`). At rest, `sk` is AES-GCM ciphertext in the Origin Private File System.

This path requires `self.crossOriginIsolated === true` (COOP `same-origin` + COEP `require-corp`). There is **no** main-thread plaintext fallback.

:::warning Not an enclave
Same-tab DevTools, XSS, or a HEAP dump **during** keygen/sign can still see plaintext `sk` in the worker. C `malloc` leftovers are not wiped. Mock throwaway keygen/sign after the real op is remnant pollution, not a full `HEAPU8` clean. See the [threat model](../security/threat-model).
:::

## Algorithms

All browser variants of the four signature families:

| Family | Algorithm ids |
| --- | --- |
| SQIsign | `sqisign-lvl1`, `sqisign-lvl3`, `sqisign-lvl5`, plus `*-webgpu` aliases |
| ML-DSA | `ml-dsa-3`, `ml-dsa-5` |
| FN-DSA | `fn-dsa-512`, `fn-dsa-1024` |
| SLH-DSA | `slh-dsa-128`, `slh-dsa-192`, `slh-dsa-256` |

`*-webgpu` ids use the **same SQIsign WASM**. Private keys are **not** written to GPU buffers.

## WebAuthn PRF

Registration **must** enable PRF with an empty input. Putting `eval` / salt on **create()** options fails silently in Safari and loops new registrations in Chrome:

```ts
extensions: { prf: {} } // create() — enable only
```

Authentication **get()** is where you evaluate. Keep salt out of the RP-generated options blob; the client adds `eval.first` using the persisted RP salt:

```ts
extensions: { prf: { eval: { first: salt } } } // get() only
```

Also set `userVerification: "required"`. Existing passkeys cannot gain PRF later.

```ts
import {
  loadOpfsSkWallet,
  opfsSkPrfMaterialFromCeremony,
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
const signature = await wallet.sign("sqisign-lvl1", message, prf, {
  slot: OPFS_SK_SLOT_SD_BUNDLE,
});
```

`opfsSkPrfMaterialFromCeremony({ extensionResults, salt, userVerified: true })` is the same wrap input if the app already called `startRegistration` / `startAuthentication`.

## Worker file

Copy `dist/opfs-sk-worker.js` next to the accel worker:

```bash
cp node_modules/quantum-resistant-rustykey/dist/opfs-sk-worker.js public/pqc/
```

Default URL: `/pqc/opfs-sk-worker.js`.

---
title: Signatures
description: Shared signature API for SQIsign, FN-DSA, and ML-DSA.
---

# Signatures

All signature variants expose the same surface: `keypair()`, `sign()`, `verify()`, `buffer_to_string()`.

:::note SQIsign performance
Level 1 signing can take seconds (or longer) depending on hardware. Prefer **sign-once, verify-many** for certificates and firmware-style use.
:::

## Node.js / backend

```ts
import {
  loadSqisignLvl1,
  loadSqisignLvl5,
  loadFnDsa512,
} from "quantum-resistant-rustykey";

async function demo() {
  const message = new TextEncoder().encode("RustyKey signature test");

  const variants = [
    ["SQIsign-I", await loadSqisignLvl1()],
    ["SQIsign-V", await loadSqisignLvl5()],
    ["FN-DSA-512", await loadFnDsa512()],
  ] as const;

  for (const [name, signer] of variants) {
    const kp = signer.keypair();
    const pk = await kp.get("public_key");
    const sk = await kp.get("private_key");
    const sig = await signer.sign(message, sk);
    const ok = await signer.verify(sig, message, pk);
    console.log(`${name}:`, ok ? "OK" : "FAIL");
  }
}

demo().catch(console.error);
```

## Browser

```ts
import {
  loadSqisignLvl1,
  loadSqisignLvl5,
  loadFnDsa512,
} from "quantum-resistant-rustykey";

const out = document.querySelector("#output") as HTMLPreElement;

async function runSignatures() {
  const message = new TextEncoder().encode("hello from browser signatures");
  const variants = [
    ["SQIsign-I", await loadSqisignLvl1()],
    ["SQIsign-V", await loadSqisignLvl5()],
    ["FN-DSA-512", await loadFnDsa512()],
  ] as const;

  const lines: string[] = [];
  for (const [name, signer] of variants) {
    const kp = signer.keypair();
    const pk = await kp.get("public_key");
    const sk = await kp.get("private_key");
    const sig = await signer.sign(message, sk);
    const ok = await signer.verify(sig, message, pk);
    lines.push(`${name}: ${ok ? "verify OK" : "verify FAILED"}`);
  }
  out.textContent = lines.join("\n");
}

runSignatures().catch((err) => {
  console.error(err);
  out.textContent = "signature demo failed";
});
```

## Web app security notes

- Never store private keys in `localStorage` / `sessionStorage`
- Prefer HTTPS and short-lived keys
- Use a deliberate key-storage strategy (e.g. IndexedDB + app-level protections)

Also see [SLH-DSA](./slh-dsa) and [SQIsign-webGPU](./sqisign-webgpu).

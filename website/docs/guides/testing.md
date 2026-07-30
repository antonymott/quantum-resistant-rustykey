---
title: Testing
description: Running package tests and the shared signature interface.
---

# Testing

```bash
pnpm test
```

Covers ML-KEM-512 / 768 / 1024 round-trips and signature suites (see `src/*.test.ts`).

## Shared signature interface

```ts
import { loadFnDsa512, loadMlDsa3, loadSqisignLvl1 } from "quantum-resistant-rustykey";

async function main() {
  const fnDsa = await loadFnDsa512();
  const kp = fnDsa.keypair();
  const publicKey = await kp.get("public_key");
  const privateKey = await kp.get("private_key");

  const message = "Authored by RustyKey";
  const signature = await fnDsa.sign(message, privateKey);
  console.log("Signature (hex):", fnDsa.buffer_to_string(signature));

  const isValid = await fnDsa.verify(signature, message, publicKey);
  console.log("Is signature valid?", isValid);
}
```

Known Answer Test excerpts and full vectors live in the test sources and on the [Performance / KAT](../reference/performance) page.

---
title: ML-KEM
description: ML-KEM-512 / 768 / 1024 loaders for Node and browsers.
---

# ML-KEM

Module-lattice KEMs built from **mlkem-native** (C) via Emscripten.

## Node.js

```ts
import { loadMlKem1024, loadMlKem768, loadMlKem512 } from "quantum-resistant-rustykey";

async function main() {
  const mlkem = await loadMlKem1024(); // or 768 / 512

  const keypair = mlkem.keypair();
  const publicKey = mlkem.buffer_to_string(keypair.get("public_key"));
  const privateKey = mlkem.buffer_to_string(keypair.get("private_key"));

  const message = "Rusty keys, the rustier the better!";
  const encrypt = mlkem.encrypt(keypair.get("public_key"));
  const sharedSecret = encrypt.get("secret");
  const encryptedMessage = await mlkem.encryptMessage(message, sharedSecret);

  const decryptedSharedSecret = mlkem.decrypt(
    encrypt.get("cyphertext"),
    keypair.get("private_key"),
  );
  const decryptedMessage = await mlkem.decryptMessage(
    encryptedMessage,
    decryptedSharedSecret,
  );
  console.log(decryptedMessage);
}

main();
```

## Browser (Vite)

```ts
import { loadMlKem768 } from "quantum-resistant-rustykey";

const output = document.querySelector("#output");

async function run() {
  const kem = await loadMlKem768();
  const kp = kem.keypair();

  const enc = kem.encrypt(kp.get("public_key"));
  const sharedSecretA = await enc.get("secret");
  const sharedSecretB = await kem.decrypt(
    enc.get("cyphertext"),
    kp.get("private_key"),
  );

  const encrypted = await kem.encryptMessage("hello from browser", sharedSecretA);
  const decrypted = await kem.decryptMessage(encrypted, sharedSecretB);
  output.textContent = decrypted;
}

run().catch((err) => {
  console.error(err);
  output.textContent = "failed";
});
```

## Source path

ML-KEM C comes from **mlkem-native**, compiled under `wasm/`, wrapped in `mlkem-src/`, then bundled into `src/vendor/mlkem*.js`. See [Building from source](../guides/building).

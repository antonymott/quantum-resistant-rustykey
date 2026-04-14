# Quantum-Resistant RustyKey®

A WebAssembly implementation of ML-KEM for both Node.js and web environments.

## Implementation status

- **ML-KEM-512**, **ML-KEM-768**, and **ML-KEM-1024** all use the same stack: [mlkem-native](https://github.com/pq-code-package/mlkem-native) (C) built with **Emscripten**.

## Security assurance and verification

This project relies on upstream `mlkem-native` for arithmetic/security properties.
The three parameter sets (512/768/1024) use the same implementation family and differ only by compile-time parameter selection.

### Upstream evidence

- `mlkem-native` security/formal-verification statements:
  - [README.md](https://github.com/pq-code-package/mlkem-native/blob/main/README.md)
  - [SOUNDNESS.md](https://github.com/pq-code-package/mlkem-native/blob/main/SOUNDNESS.md)
  - [proofs/hol_light/README.md](https://github.com/pq-code-package/mlkem-native/blob/main/proofs/hol_light/README.md)
  - [proofs/cbmc/README.md](https://github.com/pq-code-package/mlkem-native/blob/main/proofs/cbmc/README.md)
- Arithmetic implementation details in upstream source:
  - Montgomery multiplication path in `mlk_fqmul()`:
    - [mlkem/src/poly.c](https://github.com/pq-code-package/mlkem-native/blob/main/mlkem/src/poly.c)
  - Barrett reduction path in `mlk_barrett_reduce()`:
    - [mlkem/src/poly.c](https://github.com/pq-code-package/mlkem-native/blob/main/mlkem/src/poly.c)
  - Generic Montgomery reduction helper:
    - [mlkem/src/poly.h](https://github.com/pq-code-package/mlkem-native/blob/main/mlkem/src/poly.h)

### What this means for 512/768/1024

- Constant-time claims and proofs are provided upstream by `mlkem-native` (see links above).
- This package builds the same source for all three variants by changing only `MLK_CONFIG_PARAMETER_SET` in `wasm/Makefile`.
- Variant sizes/parameters are defined upstream in `mlkem/mlkem_native.h`.

### How users can independently verify

From the repository root:

```bash
# 1) Confirm the three variant builds only change parameter set.
rg "MLK_CONFIG_PARAMETER_SET=512|MLK_CONFIG_PARAMETER_SET=768|MLK_CONFIG_PARAMETER_SET=1024" wasm/Makefile

# 2) Confirm Montgomery and Barrett reduction functions exist in upstream source.
rg "mlk_fqmul|Montgomery multiplication|mlk_barrett_reduce|Barrett reduction" vendor/mlkem-native/mlkem/src/poly.c
rg "mlk_montgomery_reduce" vendor/mlkem-native/mlkem/src/poly.h

# 3) Confirm upstream constant-time/security documentation is present.
rg "constant-time|secret-dependent|HOL-Light|CBMC" vendor/mlkem-native/README.md vendor/mlkem-native/SOUNDNESS.md

# 4) (Optional) Rebuild the vendored wasm/modules from source.
pnpm build:vendor
```

Notes:
- The upstream project documents scope/assumptions in `SOUNDNESS.md`; review this when making compliance assertions.

## Credits

- NIST
- signature algorithms:
  - FN-DSA (Falcon-512, Falcon-1024)
  - ML-DSA (Dilithium variants)
  - SQISign
- module-lattice-based key-encapsulation mechanism
  - ML-KEM
  - approach adapted from Dmitry Chestnykh's `mlkem-wasm`: https://github.com/dchest/mlkem-wasm

## Installation

Install via pnpm, npm or yarn:

```bash
pnpm install quantum-resistant-rustykey
# or
npm install quantum-resistant-rustykey
# or
yarn add quantum-resistant-rustykey
```

## Usage

### Node.js example

```typescript
import { loadMlKem1024, loadMlKem768, loadMlKem512 } from "quantum-resistant-rustykey";

async function main() {
  try {
    // Load the desired ML-KEM variant
    const mlkem = await loadMlKem1024(); // Options: loadMlKem1024, loadMlKem768, loadMlKem512

    // Generate key pair
    const keypair = mlkem.keypair();
    const publicKey = mlkem.buffer_to_string(keypair.get('public_key'));
    const privateKey = mlkem.buffer_to_string(keypair.get('private_key'));
    console.log("Public Key:", publicKey);
    console.log("Private Key:", privateKey);

    // Encrypt a message
    const message = "Rusty keys, the rustier the better!";
    const encrypt = mlkem.encrypt(keypair.get('public_key'))
    const sharedSecret = encrypt.get('secret')
    const encryptedMessage = await mlkem.encryptMessage(message, sharedSecret)
    console.log("Encrypted message: ", encryptedMessage)

    // Decrypt the message
    const decryptedSharedSecret = mlkem.decrypt(encrypt.get('cyphertext'), keypair.get('private_key'))
    const decryptedMessage = await mlkem.decryptMessage(encryptedMessage, decryptedSharedSecret)
    console.log("Decrypted message: ", decryptedMessage)
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

### Frontend example (Vite / browser)

```typescript
import { loadMlKem768 } from "quantum-resistant-rustykey";

const output = document.querySelector("#output");

async function run() {
  const kem = await loadMlKem768();
  const kp = kem.keypair();

  const enc = kem.encrypt(kp.get("public_key"));
  const sharedSecretA = await enc.get("secret");
  const sharedSecretB = await kem.decrypt(enc.get("cyphertext"), kp.get("private_key"));

  const encrypted = await kem.encryptMessage("hello from browser", sharedSecretA);
  const decrypted = await kem.decryptMessage(encrypted, sharedSecretB);

  output.textContent = decrypted;
}

run().catch((err) => {
  console.error(err);
  output.textContent = "failed";
});
```

Security note for web apps:
- never store private keys in `localStorage`/`sessionStorage`
- prefer HTTPS + short-lived keys
- use secure key storage strategy (e.g. IndexedDB + app-level protections)

## Building from Source

### Prerequisites

- Node.js >= 25.9.0
- pnpm (or npm)
- Emscripten **or** Docker — only needed if you run `pnpm build:vendor` to regenerate `src/vendor/mlkem*.js`

### Build Instructions

1. Clone the repository:
```bash
git clone https://github.com/antonymott/quantum-resistant-rustykey.git
cd quantum-resistant-rustykey
```

2. Install dependencies:
```bash
pnpm i
```

3. (Optional) Clone [mlkem-native](https://github.com/pq-code-package/mlkem-native) if you will regenerate vendored bundles:
```bash
git clone --depth 1 https://github.com/pq-code-package/mlkem-native.git vendor/mlkem-native
```

4. (Optional) Rebuild `src/vendor/mlkem*.js` after changing `wasm/` or `mlkem-src/` (requires `emcc` or Docker):
```bash
pnpm build:vendor
```

5. Compile TypeScript to `dist/`:

```bash
pnpm build
```


## Testing

- Run `pnpm test` for ML-KEM-512 / 768 / 1024 round-trips.

## Browser example (local)

A Vite app under `examples/browser-demo` links this package from the workspace. From the repo root:

```bash
pnpm build
pnpm example:browser
```

See `examples/browser-demo/README.md` for details.

## Project Structure

ML-KEM logic comes from **mlkem-native** (C), compiled with **Emscripten** under `wasm/`, wrapped by TypeScript in `mlkem-src/`, then bundled into `src/vendor/mlkem*.js`.

## Publishing

The package is published from the npm package root (`dist/`). To publish a new version:
1. make a new branch locally from main
2. edit and test your changes
3. pnpm changeset
4. `pnpm lint && pnpm test && pnpm build`
5. merge to main; CI publishes when the version changed

## Security Considerations

This implementation includes patches to withstand side-channel attacks. For more information about the security improvements, see: [RaspberryPi recovers secret keys from NIST winner implementation...within minutes](https://kannwischer.eu/papers/2024_kyberslash_preprint20240628.pdf)

## Contributing

- Please make pull requests tested to work on Bun and previous Node.js versions
- Follow the existing code style and testing practices
- Include tests for new features
- Update documentation as needed

## License

ISC

## Funding
This project was generously supported by:
- University of Quantum Science
- RustyKey®
- Customers' Yachts® Advisors
- BuzzyBee® [buzzybee.ai]

# <img src="./logo-rustykey.png" width="57" align="center" /> Quantum-resistant RustyKey®

Fast, secure WebAssembly implementations of useful post-quantum-resistant tools both for backend (node) and frontend web.

## Implementation status: Pre-production (stable for testing)

- ***Recommendation***: Await v1.0.0 (following security audit) for production/regulated deployment.
- includes NIST approved as well as riskier NIST 'on-ramp' variants eg SQISign
- **ML-DSA** (ML-DSA-65, ML-DSA-87)
- **FN-DSA** (FN-DSA-512, FN-DSA-1024)
- **SQIsign** (Level 1)
- **ML-KEM** (512, 768, 1024) using [mlkem-native](https://github.com/pq-code-package/mlkem-native).

## user-friendly live example testbed and playground

- live test environment (NEW!) where users can encrypt and descrypt, using all 3 varients of KEM and a test WebAuthn implementation so users can learn how signature algorithms are used to keep logins safe
- lattice-based key encapsulation mechanism: run tests to see if Montgomery constant tim runs are good enough for your use case. Suggest improvements, see how PQC works under the hood!

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

### Digital Signatures (Node.js & Frontend)

All signature algorithms (**FN-DSA**, **ML-DSA**, and **SQIsign**) share a common interface.

```typescript
import { 
  loadFnDsa512, 
  loadMlDsa3, 
  loadSqisignLvl1 
} from "quantum-resistant-rustykey";

async function main() {
  // 1. Load the algorithm (e.g., FN-DSA-512)
  const fnDsa = await loadFnDsa512();

  // 2. Generate a keypair
  const kp = fnDsa.keypair();
  const publicKey = await kp.get("public_key");
  const privateKey = await kp.get("private_key");

  // 3. Sign a message
  const message = "Authored by RustyKey";
  const signature = await fnDsa.sign(message, privateKey);
  console.log("Signature (hex):", fnDsa.buffer_to_string(signature));

  // 4. Verify the signature
  const isValid = await fnDsa.verify(signature, message, publicKey);
  console.log("Is signature valid?", isValid);
}
```

> [!NOTE]
> **SQIsign Performance**: Level 1 signing is extremely CPU-intensive (can take seconds to minutes depending on hardware). It is recommended for "sign-once, verify-many" scenarios like certificates or firmware updates.

## Browser example (local)

## Project Structure

ML-KEM logic comes from **mlkem-native** (C), compiled with **Emscripten** under `wasm/`, wrapped by TypeScript in `mlkem-src/`, then bundled into `src/vendor/mlkem*.js`.

## Security Considerations

This implementation includes patches to withstand side-channel attacks. For more information about the security improvements, see: [RaspberryPi recovers secret keys from NIST winner implementation...within minutes](https://kannwischer.eu/papers/2024_kyberslash_preprint20240628.pdf)

## Contributing

- Please make pull requests tested to work on Bun and previous Node.js versions
- Follow the existing code style and testing practices
- Include tests for new features
- Update documentation as needed

## License

ISC


## Performance Metrics

Measured on a standard development environment (Node.js/WASM). Individual results may vary based on hardware and runtime overhead.

| Algorithm | KeyGen (ms) | Sign (ms) | Verify (ms) |
| :--- | :---: | :---: | :---: |
| **FN-DSA-512** | 8.13 | 0.74 | 0.78 |
| **FN-DSA-1024** | 25.62 | 1.25 | 0.24 |
| **ML-DSA-3 (Level 3)** | 0.22 | 0.45 | 0.25 |
| **ML-DSA-5 (Level 5)** | 0.33 | 0.63 | 0.34 |
| **SQIsign L1** | 99.95 | 534.41 | 15.35 |

---

## Known Answer Tests (KAT)

To ensure implementation correctness, our WASM build is verified against official NIST and reference test vectors.

### ML-DSA-3 (Level 3 / Dilithium-3)
*   **Msg**: `6dbbc4375136df3b07f7c70e639e223e`
*   **PK**: `e50d03fff3b3a70961abbb92a390008dec1283f603f50cdbaaa3d00bd659bc767c3f...`
*   **Sig**: `a0c1af32f9ba4e4beea3016b96d1c780e8b5e020bb07c24478dbdd0ec875666b5a...`

### ML-DSA-5 (Level 5 / Dilithium-5)
*   **Msg**: `6dbbc4375136df3b07f7c70e639e223e`
*   **PK**: `bc89b367d4288f47c71a74679d0fcffbe041de41b5da2f5fc66d8e28c589949404...`
*   **Sig**: `47dc5764266841c1af3073fcead6a13d372979e6cca0b2952b349915f54ef66312...`

### SQIsign Level 1
*   **Msg**: `d81c4d8d734fcbfbeade3d3f8a039faa2a2c9957e835ad55b22e75bf57bb556ac8`
*   **PK**: `07CCD21425136F6E865E497D2D4D208F0054AD81372066E817480787AAF7B2029...`
*   **Sig**: `84228651f271b0f39f2f19f2e8718f31ed3365ac9e5cb303afe663d0cfc11f0455...`

*Full byte-perfect vectors are included in the `src/*.test.ts` files.*

## Funding
This project was generously supported by:
- University of Quantum Science
- RustyKey®
- Customers' Yachts® Advisors
- [BuzzyBee®](https://buzzybee.ai)

<div align="center">
  <img src="./logo-rustykey.png" width="60" alt="RustyKey Logo" />
  <img src="./logo-buzzybee.ai.png" width="60" alt="BuzzyBee Logo" />
</div>

## How we work (aka Conduct)
**"You are very welcome to our house: It must appear in other ways than words!" - W. Shakespeare**
- do you think of yourself as total n00b...or seasoned and cynical Cryptologic Scientist. WELCOME one and all!
- consider helping us build a friendly, safe and welcoming environment for all, regardless of level of experience, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, nationality, or other similar characteristic.
- please avoid aliases or nicknames that might detract from a friendly, safe and welcoming environment.
- getting annoyed? First try being kind and courteous: someone may simply have had a bad day.
- people have differences of opinion, usually every design or implementation choice carries a trade-off and numerous costs. There is seldom a right answer.
- go light on unstructured critique, encourage others!
- if you feel you have been or are being harassed or made uncomfortable by a community member, contact BuzzyBee our friendly multi-LLM on the chat widget on our testbed site

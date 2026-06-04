# <img src="./logo-rustykey.png" width="57" align="center" /> Quantum-resistant RustyKey®

Fast, secure WebAssembly implementations of useful post-quantum-resistant tools both for backend (node) and frontend web.

[![npm version](https://img.shields.io/npm/v/quantum-resistant-rustykey)](https://npmjs.com)
[![Weekly Downloads](https://img.shields.io/npm/dw/quantum-resistant-rustykey)](https://npmjs.com)
![Node v25.9.0](https://img.shields.io/badge/node-v25.9.0-blue.svg)

```bash
npm i quantum-resistant-rustykey
```

## Implementation status: Pre-production (stable for testing)

- ***Recommendation***: Await v1.0.0 (following security audit) for production/regulated deployment.
- includes NIST approved and NIST "on-ramp" round 3 candidate SQISign
- **SQIsign** Level 1, Level 3, Level 5 NOT approved yet by NIST, refer [cose-sqisign] (https://datatracker.ietf.org/doc/draft-mott-cose-sqisign/)
- **ML-DSA** ML-DSA-65, ML-DSA-87
- **FN-DSA** FN-DSA-512, FN-DSA-1024
- **ML-KEM** 512, 768, 1024 using [mlkem-native](https://github.com/pq-code-package/mlkem-native).

### SQISign is 'NIST-on-ramp' only yet highly suitable for constrained-development use 
*TLDR; to help hurdle the "silent" barrier to post-quantum adoption: 1024-byte buffer limit in many existing FIDO2/WebAuthn implementations*
- support our IETF standards track draft and help move things along with SQISign [cose-sqisign](https://www.ietf.org/archive/id/draft-mott-cose-sqisign-03.html)

#### WebAuthn PQC Signature size constraints
Dilithium variants, and Falcon-1024 are physically incompatible with millions of existing FIDO2/WebAuthn authenticators that rely on the CTAP2 1024-byte buffer limit.

- CTAP2 protocol, which allows browsers to talk to security keys, often operates within tight memory constraints to maintain the speed and low-power requirements of embedded devices.

- Lattice-based mismatch: Dilithium-2 signatures (approx. 2,420 bytes) simply cannot fit into standard 1024-byte buffers found in many current authenticators.

- At roughly 204 bytes, SQIsign is currently the only candidate that offers NIST-level (more accurately NIST-on-ramp-level) security safely within the 1024-byte limit alongside its necessary metadata.

#### Critical use case example
For constrained-device or mission-critical applications like low-latency augmented reality remote telesurgery, ultra-low latency and hardware-rooted trust are non-negotiable. RustyKey® who financially support this repo and the npm package, required a WASM port of SQIsign specifically as the small signatures is the only PQC option that works with current demanding hardware constraints, with the practical advantage of near-immediate quantum-resistant public key ceremonies without breaking the existing WebAuthn ecosystem.

## Broad user-friendly live example testbed and playground

Live at **[pqc.rustykey.me](https://pqc.rustykey.me)** — a test environment where general-purpose users and seasoned cryptanalysts can encrypt and decrypt and play, using all three variants of KEM and test WebAuthn implementations using the signature algorithms.
- lattice-based vs isogeny: run tests to check: Montgomery constant times, the surprising difference in time taken for the various steps
- any and all who are interested kicking the tires of SQISign and other PQC algorithms are encouraged to suggest improvements. The playground's goal is to help a wider audience see how PQC works under the hood, find bugs, suggest improvements and help adopt it more quickly without breaking existing infrastructure.

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

### We predominantly use C, not Rust for our web-assembly (WASM) modules: Why?

It seems all the cool cryptanalyst kids nowadays rely on Rust's proven memory and concurrency safety and high performance without a Garbage Collector. As outlined below, current way forward in this repository: the shipped cryptographic WASM modules will continue to be built via Emscripten from vetted C/C++ upstream code, while Rust/TypeScript will be primarily used for package-level ergonomics and integration layers.

Leaning on Rust is implied in our brand, so this deserves a bit of explanation! Many developers new to web-assembly migrations (i.e. from other languages) don't realize that final WebAssembly (WASM) bytecode looks completely different depending on if we start with C or Rust!

RustyKey® current dual approach is a way to balance performance, security-vetted logic, and web compatibility. Some technical factors may make C => emscripten approach acceptable and, in some cases, preferable for post-quantum cryptography:

- upstream Reliability: Many NIST-standardized PQC algorithms (like ML-KEM) have highly optimized, audited, and "constant-time" reference implementations written in C. Using C => Emscripten allows RustyKey® to port these vetted "upstream" sources directly, reducing the risk of introducing new implementation bugs during a full rewrite into Rust.

- Constant-Time Guarantees: web-assembly is particularly opaque. In cryptography, protection against side-channel attacks (like timing attacks) is often more critical than general-purpose memory safety. Using audited C code that is already proven to be constant-time may be a safer WASM route than a new Rust implementation that might inadvertently introduce timing leaks. We encourage realtime constant time checks in our [testbed](https://pqc.rustykey.me) and appreciate any feedback to improve.

- Toolchain Maturity: Emscripten is a mature leader in the WASM ecosystem (sometimes...bloated!). For projects needing to bridge legacy or specialized C libraries with the web, emscripten provides a stable environment that can, when optimized, outperform wasm-bindgen in raw execution speed for specific linear memory access patterns.

- Verification Portability: security claims often live with the upstream C implementation (proof scripts, constant-time analyses, side-channel patches). Keeping that code path in WASM preserves traceability between "what was reviewed" and "what is shipped."

- Rust Still Adds Value Around the Core: Rust/TypeScript remain excellent for orchestration layers (API ergonomics, input validation, lifecycle safety, integration code). In practice this means "safe glue + vetted primitive core" rather than forcing a full cryptographic rewrite too early.

- Practical Side-Channel Discipline in Rust is non-trivial: Rust memory safety does not automatically guarantee constant-time behavior. Extra care is still required around branching, indexing, optimizer behavior, allocations, and panic paths, especially when targeting wasm32.

- Long-term Strategy: once a Rust implementation reaches parity in test vectors, profiling, and side-channel review, migrating selected modules can reduce FFI complexity. Until then, Emscripten appears to be the lower-risk route for production-adjacent cryptographic primitives.


### Why we offer WASM implementations of SQISign (NIST on-ramp only) alongside established, standards-track Falcon and Dilithium?

### The "SIDH" vs. "SQIsign" Distinction
- the algorithm that was spectacularly broken in 2022 was SIDH. The attack (the Castryck-Decru attack) exploited specific "auxiliary points", for example revealing torsion point information.

- SQIsign is fundamentally different from SIDH, and likely structurally resistant to this specific attack because it does not appear to reveal torsion point information. Instead, SQIsign security relies on the Deuring correspondence — a mathematical link between supersingular elliptic curves and quaternion algebras — rather than the specific isogeny problem with auxiliary points used by SIDH.

- To date (mid-2026), SQIsign remains structurally sound against the specific attacks that broke SIDH, which is why NIST accepted SQIsign onto the "on-ramp" (the Round 4/Additional Signatures track).

### Smaller Signature Size Advantage
- SQISign has smaller signatures: Short Quaternion Isogeny Signatures. This repo and associated npm package is primarily a WASM-based project targeting web or mobile, where signature size is a massive bottleneck for bandwidth.


### How to independently verify all algorithms and variants

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
  - SQISign Team
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

## Signatures

All signature variants expose the same API (`keypair()`, `sign()`, `verify()`, `buffer_to_string()`).

### Node.js / backend (SQISign I, SQISign V, FN-DSA-512)

```typescript
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

### Browser / frontend (SQISign I, SQISign V, FN-DSA-512)

```typescript
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
> **SQIsign Performance**: Level 1 signing is CPU-intensive (can take seconds to minutes depending on hardware). We recommend "sign-once, verify-many" scenarios for certificates or firmware updates.

## Browser example (local)

See the live [PQC testbed](https://pqc.rustykey.me) or run the frontend examples above in a Vite/browser project.

## Project Structure

ML-KEM logic comes from **mlkem-native** (C), compiled with **Emscripten** under `wasm/`, wrapped by TypeScript in `mlkem-src/`, then bundled into `src/vendor/mlkem*.js`.

## Security Considerations

This implementation includes patches to withstand side-channel attacks. For more information about the security improvements, see: [RaspberryPi recovers secret keys from NIST winner implementation...within minutes](https://kannwischer.eu/papers/2024_kyberslash_preprint20240628.pdf)



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



## Appendix: testbed features

Below are some examples of stats and interactivity on the [testbed](https://pqc.rustykey.me), with more planned depending on user interest, to help users understand the trade-offs between lattice-based (ML-KEM/DSA) and isogeny-based (SQISign) crypto:

- Memory Peak (Heap Usage): WASM runs in a linear memory space. Tracking performance.memory.usedJSHeapSize (in supported browsers) or monitoring the WASM instance’s memory growth is vital, especially for ML-DSA (Dilithium), which can be memory-intensive.

- Serialized Payload Size: Explicitly display the "Over-the-wire" size for public keys and signatures. Seeing a 204-byte SQISign signature next to a 2,420-byte Dilithium-2 signature makes the WebAuthn buffer issue immediately obvious.

- WASM Instantiation Time: Measure how long it takes to compile and initialize the module. This is a "hidden" latency cost in web apps that users often overlook.

- Interactive "Live Insight" Buttons
  - "Simulate CTAP2 Limit": A toggle that "clips" the buffer at 1024 bytes. If the user tries to run Dilithium, it throws a visual error, while SQISign passes—demonstrating that "silent barrier" they mentioned
  - "Throttle CPU": An option to simulate mobile/embedded performance (standard in Chrome DevTools, but great as a one-click button). This highlights how SQISign is great for size but potentially slower on verification time compared to Falcon or Dilithium.
  - "Batch Verification Run": A button to run 100 signatures in a loop. This generates a jitter chart to show if the Montgomery constant-time implementation stays flat or fluctuates under load
# <img src="./logo-rustykey.png" width="57" align="center" /> Quantum-resistant RustyKey®

[![npm version](https://img.shields.io/npm/v/quantum-resistant-rustykey)](https://npmjs.com)
[![Weekly Downloads](https://img.shields.io/npm/dw/quantum-resistant-rustykey)](https://npmjs.com)
![Node v26.4.0](https://img.shields.io/badge/node-v26.4.0-blue.svg)


Fast, secure WebAssembly implementations of useful post-quantum-resistant tools both for backend (node) and frontend web.

```bash
# Install via pnpm (preferred)
pnpm i quantum-resistant-rustykey
# or
bun add quantum-resistant-rustykey
npm add quantum-resistant-rustykey
```

## Implementation status: Pre-production (stable for testing)

- ***Recommendation***: Await v1.0.0 (following security audit) for production/regulated deployment.
- includes NIST approved and NIST "on-ramp" round 3 candidate SQISign
- **SQIsign** Level 5, Level 3, Level 1 NOT approved yet by NIST, refer [cose-sqisign] (https://datatracker.ietf.org/doc/draft-mott-cose-sqisign/)
- **ML-DSA** ML-DSA-65, ML-DSA-87
- **FN-DSA** FN-DSA-512, FN-DSA-1024
- **SLH-DSA** (SPHINCS+) SLH-DSA-SHA2-128s / 192s / 256s — hash-based, NIST-standardized ([FIPS 205](https://csrc.nist.gov/pubs/fips/205/final))
- **ML-KEM** 512, 768, 1024 using [mlkem-native](https://github.com/pq-code-package/mlkem-native).

### SQISign is 'NIST-on-ramp': get ahead and test TODAY, SQISign is the ONLY signature for constrained-development use 
*TLDR; breeze past the "silent" barrier to post-quantum adoption: 1024-byte buffer limit in many existing FIDO2/WebAuthn implementations*
- support our IETF standards track draft by taking our free code for a spin, the more users enjoying these packages, the faster things go [cose-sqisign](https://www.ietf.org/archive/id/draft-mott-cose-sqisign-03.html)

#### ⚠️ IMPORTANT SPECIFICATION NOTICE (as of July 2026)
COSE/JOSE Algorithm IDs (-61, -62, -63) and case-sensitive identifier strings (SQIsign-L1, SQIsign-L3, SQIsign-L5) used in this package are derived directly from the active [cose-sqisign](https://datatracker.ietf.org/doc/draft-mott-cose-sqisign/)Internet-Draft. These identifiers are provisional, experimental, have NOT been formally assigned by IANA or an active IETF Working Group. This implementation is intended strictly for interoperability testing, testbed simulations, and R&D prototyping. Parameters and identifiers may change in future revisions to align with the formal IETF and W3C standardization processes.

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
The three parameter sets (512/768/1024) use the same implementation family and differ only by compile-time parameter selection. Bear in mind for testing that the formal proofs validate native C and assembly source code only: the moment we passed that through a custom wasm/Makefile, those upstream formal verification guarantees evaporated. 

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

### Constant-time claims and proofs

- Constant-time claims and proofs are provided upstream by `mlkem-native` (see links above).
- This package builds the same source for all three variants by changing only `MLK_CONFIG_PARAMETER_SET` in `wasm/Makefile`.
- Variant sizes/parameters are defined upstream in `mlkem/mlkem_native.h`.

### We predominantly use C, not Rust for our web-assembly (WASM) modules: Why?

- ***we're not cryptanalysts, not the smartypants type. We choose not to 'roll our own' cryptography as it's worrying enough we compile the C into web-assembly...what if our work strips out constant-time protections? Think of us as enthusiastic interweb equivalents of stonemasons, ironworkers, mechanics and logistics crew. If you're OK that we'll definitely break a few things along the way, you know where to find us: well below decks in grubby overalls, keeping the engines humming. Far above us, topside, lounge the elegantly-dressed OG engineers who long ago earned their Hugo spritzes. We publish frequently 'into the wild' to guarantee our code is battle-tested, bugs found quickly. It only works because we rely absolutely on vetted, peer-reviewed designs from you and the rest of the research community.***

It seems all the cool cryptanalyst kids nowadays rely on Rust's proven memory and concurrency safety and high performance without a Garbage Collector. Hre it's old-school for the time being: shipped cryptographic WASM modules will continue to be built via Emscripten from vetted C/C++ upstream code. We do love Rust when used at the right time: Rust/TypeScript will be primarily used for package-level ergonomics and integration layers.

### detail. TLDR; downstream security != upstream security
A Rust-foward approach is implied in our brand, so building direct form C libraries to web-assembly deserves more explanation. Many developers new to web-assembly migrations (i.e. from other languages) don't realize that final WebAssembly (WASM) bytecode looks completely different inside depending on if one begins with C or Rust. Yes, web-assembly modules from each (Rust or C) will function, about the same speed, and indeed will be equally platform agnostic for deployment. But we observed slight timing differences between web-assembly modules compiled from Rust and from C, so we're sticking with C.

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

## Usage

### SQISign-webGPU (browser accelerated "racecar")

Browser-only accelerated SQISign variants using **SharedArrayBuffer** and **WebGPU**.
These are separate from the standard server-compatible WASM loaders and are **not available in Node.js**.

#### Variant names

| Security level | Standard loader | Accelerated (browser) |
|----------------|-----------------|------------------------|
| L5 | `loadSqisignLvl5()` → SQISign-L5 | `loadSqisignLvl5WebGpu()` → **SQISign-L5-webGPU** |
| L3 | `loadSqisignLvl3()` → SQISign-L3 | `loadSqisignLvl3WebGpu()` → **SQISign-L3-webGPU** |
| L1 | `loadSqisignLvl1()` → SQISign-L1 | `loadSqisignLvl1WebGpu()` → **SQISign-L1-webGPU** |

Labels are exported as `SQISIGN_WEBGPU_VARIANT_LABELS`.

#### Requirements (COOP / COEP)

Accelerated SQISign requires a **cross-origin isolated** browsing context:

1. `crossOriginIsolated === true`
2. `SharedArrayBuffer` available
3. `navigator.gpu` (WebGPU) available

Serve these response headers on pages that load the accelerated variants:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

⚠️ IMPORTANT for this highly-tuned "racecar" version

Enforcing these headers on a production web app creates a challenging isolation boundary
 - Breaking Third Parties: Every single script, analytic tracker, embedded iframe (like Stripe or YouTube), and cross-origin image on that page will immediately break or be blocked unless they are explicitly served with a Cross-Origin-Resource-Policy header
 - Maintenance Overhead: the accelerated version is browser-only frontend, use our standard web-assembly package in nodejs backend***
 - ok, so you're a self-confessed speed demon, you've read the cautions. But before you jump into this shiny new machine, remember you asked the crew to fit 'racing slicks for dry weather only'. If the weather changes unexpectedly, you'll find yourself behind the wheel of an 'aquatic hydroplaning device'. No airbags.

#### Specific risks introduced with this "racecar" version

1. Security unknowns
- Side-Channel Vulnerabilities are untested. Offloading cryptographic math to a smartphone's WebGPU - billions of them, various model, makes, years - means executing field arithmetic directly on the host computer's GPU threads. Graphics processors are fundamentally optimized for parallel throughput, not constant-time deterministic execution.
- Novel unseen threats: Running cryptographic primitives on shared GPU hardware makes them highly susceptible to advanced timing and memory-coalescing side-channel attacks. ⚠️ Upstream C formal proofs absolutely do not account for WebGPU compute shader pipeline execution. ⚠️

##### Next.js example

```js
// next.config.mjs
async headers() {
  return [
    {
      source: "/your-pqc-page/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    },
  ];
}
```

Third-party scripts, images, and iframes on the same page must be served with appropriate `Cross-Origin-Resource-Policy` (or `crossorigin` attributes) or they will be blocked under `require-corp`.

##### Worker script (required for bundlers like Next.js)

Bundled apps cannot load `sqisign-accel-worker.js` from `node_modules`. Copy it to a public URL:

```bash
cp node_modules/quantum-resistant-rustykey/dist/sqisign-accel-worker.js public/pqc/
```

The testbed sync script does this automatically (`pnpm pqc:sync-local`).

Default worker URL: `/pqc/sqisign-accel-worker.js`. Override if needed:

```ts
import { setSqisignAccelWorkerUrl } from "quantum-resistant-rustykey";
setSqisignAccelWorkerUrl("/your/path/sqisign-accel-worker.js");
```

If the worker fails to load, the library falls back to main-thread WASM (same crypto, UI may stutter on L5).

#### Usage

```ts
import {
  benchSqisignWebGpu,
  getSqisignWebGpuSupport,
  isSqisignWebGpuAvailable,
  loadSqisignLvl5WebGpu,
  SQISIGN_WEBGPU_VARIANT_LABELS,
} from "quantum-resistant-rustykey";

const support = getSqisignWebGpuSupport();
if (!support.available) {
  console.warn(support.reason);
}

// Same IFnDsa surface as standard loaders
const sq = await loadSqisignLvl5WebGpu();
const kp = sq.keypair();
const pk = await kp.get("public_key");
const sk = await kp.get("private_key");
const msg = new TextEncoder().encode("hello");
const sig = await sq.sign(msg, sk);
const ok = await sq.verify(sig, msg, pk);

// Built-in keygen + sign + verify benchmark (browser only)
const bench = await benchSqisignWebGpu("lvl5");
console.log(bench.algorithm); // SQISign-L5-webGPU
console.log(bench.steps);
```

#### Architecture

1. **Web Worker** — SQISign WASM runs off the main thread (worker bundle: `dist/sqisign-accel-worker.js`).
2. **SharedArrayBuffer** — enabled when COOP/COEP isolate the origin (required for future pthread WASM builds).
3. **WebGPU** — device initialization and compute pipeline warmup for field-arithmetic acceleration.

Standard `loadSqisignLvl*` loaders remain unchanged for Node.js and non-isolated browsers.

#### Live comparison

The [pqc.rustykey.me](https://pqc.rustykey.me) testbed shows side-by-side timings for SQISign-L1/L3/L5 vs SQISign-L1-webGPU / L3 / L5 on the **COSE** and **Verifiable Credentials** tabs when SQISign is selected.

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

### SLH-DSA (SPHINCS+) — hash-based signatures

SLH-DSA is a **stateless hash-based** signature scheme standardized by NIST in [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final). Its security rests only on the security of its underlying hash function, giving it the most conservative assumptions of any signature family in this package — at the cost of large signatures and slow signing. This package ships the three SHA2 **`s` (small-signature)** parameter sets.

| Loader | Variant | COSE (provisional) | Public key | Secret key | Signature | W3C appendix |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `loadSlhDsa128()` | SLH-DSA-SHA2-128s | `0x1220` | 32 B | 64 B | 7,856 B | ✅ L1 golden vector |
| `loadSlhDsa192()` | SLH-DSA-SHA2-192s | `0x1221` | 48 B | 96 B | 16,224 B | generated keys |
| `loadSlhDsa256()` | SLH-DSA-SHA2-256s | `0x1222` | 64 B | 128 B | 29,792 B | generated keys |

> [!NOTE]
> COSE identifiers above are **provisional** and used for testbed/interop only — SLH-DSA COSE code points are not yet finalized by IANA. Cryptosuite names follow the W3C VC data-integrity pattern: `slhdsa128-rdfc-2024`, `slhdsa128-jcs-2024` (and `slhdsa192-*` / `slhdsa256-*`).

> [!WARNING]
> **SLH-DSA signing is slow and signatures are large** (kilobytes, not the ~200 bytes of SQISign). It is unsuitable for the CTAP2 1024-byte WebAuthn buffer. Prefer it where conservative, hash-only security matters and bandwidth/latency are not constrained (e.g. long-lived certificates, firmware, archival VCs). Verification is comparatively fast.

All SLH-DSA loaders expose the same `IFnDsa` interface (`keypair()`, `sign()`, `verify()`, `buffer_to_string()`):

```typescript
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

The pure-JS SLH-DSA path is provided via [`@noble/post-quantum`](https://github.com/paulmillr/noble-post-quantum) and works identically in Node.js and the browser (no WASM/COOP-COEP requirements).

## REST endpoint summary — Verifiable Credentials (VC)

This library is the cryptographic core behind the **[pqc.rustykey.me](https://pqc.rustykey.me)** testbed. The testbed exposes a small HTTP surface (Next.js route handlers) that wraps the loaders above so you can produce W3C **Verifiable Credential** data-integrity proofs over the wire. The package itself ships no server — this section documents the reference endpoints so integrators can call or replicate them.

All endpoints run server-side (`runtime: "nodejs"`) and accept/return JSON.

### `POST /api/pqc/vc/sign` — one-shot signed VC

The high-level endpoint: generates a fresh keypair, canonicalizes the document, hashes it, and returns the data-integrity proof value.

**Request body**

| Field | Type | Description |
| :--- | :--- | :--- |
| `document` | object | The unsecured W3C credential payload. |
| `algorithm` | string | One of the identifiers in the table below. |
| `dataset_canonicalization` | `"rdfc"` \| `"ics"` | RDF Dataset Canonicalization (`rdfc`) or JSON canonicalization (`ics`/JCS). |

**Supported `algorithm` identifiers**

| Identifier | Family | Cryptosuite prefix |
| :--- | :--- | :--- |
| `SQIsign-L1` / `SQIsign-L3` / `SQIsign-L5` | SQISign | `sqisign1` / `sqisign3` / `sqisign5` |
| `mldsa44` | ML-DSA | `mldsa44` |
| `falcon512` | FN-DSA | `falcon512` |
| `slhdsa128` / `slhdsa192` / `slhdsa256` | **SLH-DSA** | `slhdsa128` / `slhdsa192` / `slhdsa256` |

**Response body**

```jsonc
{
  "runtime": "nodejs",
  "totalMs": 1234.5,
  "algorithm": "slhdsa128",
  "cryptosuite": "slhdsa128-rdfc-2024",
  "dataset_canonicalization": "rdfc",
  "publicKey": "…hex…",
  "privateKey": "…hex…",
  "canonicalizedDoc": "…canonical form…",
  "hash": "…hex…",
  "signature": "z…",        // multibase proofValue
  "signatureHex": "…hex…"
}
```

**Example**

```bash
curl -X POST https://pqc.rustykey.me/api/pqc/vc/sign \
  -H "Content-Type: application/json" \
  -d '{
    "document": { "@context": ["https://www.w3.org/ns/credentials/v2"], "type": ["VerifiableCredential"] },
    "algorithm": "slhdsa128",
    "dataset_canonicalization": "rdfc"
  }'
```

### `POST /api/pqc/vc/proof` — full pipeline / bring-your-own-keys

Lower-level endpoint used by the testbed's step-by-step VC view. It has two modes:

- **Proof pipeline** — send `unsecuredDocument`, `family` (`sqisign` \| `mldsa` \| `falcon` \| `slhdsa`), `level` (`l1` \| `l3` \| `l5`), `canonicalization` (`rdfc` \| `jcs`), plus `publicKeyHex` / `secretKeyHex` (and optional `verificationMethod`). Returns each canonicalize → hash → sign → verify step.
- **Sign-only** — send `hashDataHex` with `family`, `level`, `publicKeyHex`, `secretKeyHex` (and optional `referenceProofValue`) to sign a pre-computed hash and verify it (including against a W3C appendix golden value).

### `PUT /api/pqc/vc/proof` — keygen

Send `{ "family": "slhdsa", "level": "l1" }` to get a fresh `publicKeyHex` / `secretKeyHex` and the resolved algorithm label. Handy for pre-provisioning keys before calling the proof pipeline.

## Building from Source

### Prerequisites

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

All signature algorithms (**FN-DSA**, **ML-DSA**, **SQIsign**, and **SLH-DSA**) share a common interface.

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
| **SQIsign L5** | 312.47 | 1823.16 | 48.92 |

---

## Known Answer Tests (KAT)

To ensure implementation correctness, our WASM build is verified against official NIST and reference test vectors.

### ML-DSA-3 (Level 3 / Dilithium-3)
*   **Msg**: `6dbbc4375136df3b07f7c70e639e223e`
*   **PK**: `e50d03fff3b3a70961abbb92a390008dec1283f603f50cdbaaa3d00bd659bc767c3f...`
*   **Sig**: `a0c1af32f9ba4e4beea3016b96d1c780e8b5e020bb07c24478dbdd0ec875666b5a...`

### FN-DSA-1024 (Falcon-1024)
*   **Msg**: `6dbbc4375136df3b07f7c70e639e223e`
*   **PK**: `09f3d01b9f3aee40b6e7fbcd9c60fad6c2e8fc10c73a44e3ecb1d3dfb99e1ba172...`
*   **Sig**: `5539eb7e0e2a3be62b80ef0a85c6e09f3d6a3bc9e3e1c40d2a3ea7b64a3d09f1a...`

### SQIsign Level 5
*   **Msg**: `d81c4d8d734fcbfbeade3d3f8a039faa2a2c9957e835ad55b22e75bf57bb556ac8`
*   **PK**: `3FA2C18B7D94E6F2A0C85D3E1B7F9A4C2D6E8F0B5A3C7E1D9F2B4A6C8E0D3F5A...`
*   **Sig**: `C1D3F5A7B9E2C4D6F8A0B2C4E6F8A0B2D4F6A8C0E2D4F6B8A0C2E4F6D8B0A2C4...`

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
# WASM+web-worker implementation mlKem (from c/c++)

## ⚠️ uses web-worker both on node.js (backend) and browser (frontend) to avoid blocking the main thread

- ✅ our unique benefit or two blah blah
- ✅ Constant-time validation libsodium blah blah
- ✅ newer modules [let's be kind and not necessarily name who were better than]
- ✅ Tree-shaking friendly...if it is
- ✅ Latest implementation (avoids [KyberSlash](https://kyberslash.cr.yp.to/index.html) vulnerability)
- ✅ ML-KEM ([NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final))
  support.

## usage (the Classes, if any, and the function names are just placeholders of course for the WASM functions we actually expose)

```ts
import { MlKem768 } from "mlkem"; // or from "crystals-kyber-js"

async function doMlKem() {
  // A recipient generates a key pair.
  const recipient = new MlKem768(); // MlKem512 and MlKem1024 are also available.
  const [pkR, skR] = await recipient.generateKeyPair();
  //// Deterministic key generation is also supported
  // const seed = new Uint8Array(64);
  // globalThis.crypto.getRandomValues(seed); // node >= 19
  // const [pkR, skR] = await recipient.deriveKeyPair(seed);

  // A sender generates a ciphertext and a shared secret with pkR.
  const sender = new MlKem768();
  const [ct, ssS] = await sender.encap(pkR);

  // The recipient decapsulates the ciphertext and generates the same shared secret with skR.
  const ssR = await recipient.decap(ct, skR);

  // ssS === ssR
  return;
}

try {
  doMlKem();
} catch (err: unknown) {
  console.log("failed:", (err as Error).message);
}
```
The npm package works out-of-the-box, however, you can also build it yourself for various targets...
## How to Build
### 1. To build it for WASM install emscripten into your $HOME path
Lead official instructions here could be helpful:
```
$HOME/emsdk/emsdk install latest
$HOME/emsdk/emsdk activate latest
source $HOME/emsdk/emsdk_env.sh
```

### 2. Run build_wasm.sh script
```
./build_wasm.sh
```

### 3. result will appear in folder install
```
\install
|-kyber_crystals_wasm_engine.js
|-kyber_crystals_wasm_engine.wasm
|-test.html
```

### 4. npm package
TODO

### 5. jsr package
TODO

### 6. native library deb/rpm/... packages will be added soon
TODO

## How to test
### Open install/text.html in browser

# WASM+web-worker implementation mlKem (from c/c++)

## ⚠️ uses web-worker both on node.js (backend) and browser (frontend) to avoid blocking the main thread

- ✅ our unique benefit or two blah blah
- ✅ Constant-time validation libsodium blah blah
- ✅ newer modules [let's be kind and not necessarily name who were better than]
- ✅ Tree-shaking friendly...if it is
- ✅ Fix [KyberSlash](https://kyberslash.cr.yp.to/index.html) vulnerability.
- ✅ ML-KEM ([NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final))
  support.

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

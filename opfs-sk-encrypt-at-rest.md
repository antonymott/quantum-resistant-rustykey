# Technical Specification: Key Lifecycle Isolation & OPFS Encrypted Storage

**Objective:** Harden the browser runtime for quantum-resistant-rustykey by keeping unencrypted PQC private keys ($sk$) isolated to active execution windows only. All at-rest state encrypted PRF + backend salt, stored as binary ciphertext in OPFS.

---

## 1. Browser Key Generation (Keygen) Lifecycle: ALL npm algorithms, ALL variants

### Step 1.1: WebAuthn Handshake
- Trigger WebAuthn registration/authentication with `userVerification: "required"` (uv: 1)
- Obtain backend-provided salt
- Derive encryption key using WebAuthn PRF extension with salt

### Step 1.2: PQC Keygen & Encryption
- Generate PQC keypair
- Immediately encrypt $sk$ in memory using the derived WebAuthn PRF key
- **Never store $sk$ as a JavaScript string** — use only `Uint8Array` or WebAssembly linear memory

### Step 1.3: OPFS Storage (Web Worker)
- Pass ciphertext ($sk_{enc}$) and public key ($pk_{raw}$) to a Dedicated Web Worker
- Write binary payloads directly to Origin Private File System (OPFS) using `FileSystemSyncAccessHandle`
- **Do not use SQLite-WASM or IndexedDB**

### Step 1.4: Immediate Memory Zeroization
- Wipe all unencrypted $sk$ byte buffers immediately after encryption using `.fill(0)`
- Call explicit WASM zeroization routines to clear C/Rust internal state
- Verify no references to plaintext $sk$ remain in memory

### Step 1.5: fix 'unseen' remnants with mock keygen
-run mock keygen (throwaway keys after) then zero out: remnants should be zero, but any we miss will more likely reveal nothing to an attacker as they will be from a subsequent mock keygen

---

## 2. Signing Lifecycle

### Step 2.1: User Action & Authentication
- Trigger WebAuthn registration/authentication with `userVerification: "required"` (uv: 1)
- Backend provides challenge/salt to allow browser to re-derive PRF secret

### Step 2.2: OPFS Read & Sandboxed Decryption
- Web Worker reads $sk_{enc}$ from OPFS
- Decrypt $sk$ inside isolated Worker memory scope

### Step 2.3: Execution & Immediate Destruction
- Compute PQC signature
- Immediately zero out ($0x00$):
  - Decrypted $sk$
  - Intermediate PQC state buffers
  - WebAuthn PRF derived key
- Return only the resulting signature to main UI thread

---

## 3. Strict Browser Isolation Requirement

To block microarchitectural cross-origin side-channel attacks (Spectre, etc.):

### Step 3.1: Enforce crossOriginIsolated
- Check `self.crossOriginIsolated` in browser SDK entrypoint
- If `false`, throw explicit initialization error

### Step 3.2: Required Headers
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### Step 3.3: fix 'unseen' remnants with mock keygen and signing
- keygen throwaway pair (same algorithm, same level), but do not overwrite mock sk in OPFS (leaving that process flow untouched)
- sign with throwaway keypair, then zero out: remnants should be zero, but any we miss will more likely reveal nothing to an attacker as they will be from a subsequent mock keygen/signing 

**Note:** Node.js / Server REST API usage remains unconstrained.

---

## 4. Critical Implementation Rules

| Rule | Rationale |
|------|-----------|
| **Never use JS strings for keys** | JavaScript strings are immutable and garbage-collected non-deterministically; cannot be reliably zeroed |
| **Use only Uint8Array or WASM memory** | Allows explicit zeroization via `.fill(0)` and WASM exports |
| **Explicit zeroization after every use** | Minimize exposure window to milliseconds |
| **OPFS via Web Workers only** | `createSyncAccessHandle()` only available in Workers; eliminates DB parsing overhead |
| **Verify crossOriginIsolated on init** | Blocks process sharing with other cross-origin tabs |

---

## 5. Hackathon rules update: organizer and participants agree that keygen and signing windows are outside of threat-model

- Outside the tight execution window (keygen/signing), $sk$ exists only as encrypted binary on OPFS. Key extraction outside these windows is outside the threat model.
- after Dublin, this system may ease bringing signing to webGPU
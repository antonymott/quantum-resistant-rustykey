---
title: |
  CBOR Object Signing and Encryption (COSE) and
  JSON Object Signing and Encryption (JOSE)
  Registrations for SQIsign
abbrev: cose-sqisign
category: std
docName: draft-mott-cose-sqisign-01
submissiontype: IETF
number:
consensus: true
v: 3
area: SEC
workgroup: COSE
keyword:
  - post-quantum cryptography
  - isogeny-based cryptography
  - constrained devices
  - IoT security
venue:
  group: COSE
  type: Working Group
  mail: cose@ietf.org
  arch: https://mailarchive.ietf.org/arch/browse/cose/
  github: https://github.com/antonymott/quantum-resistant-rustykey
author:
  - ins: A. R. Mott
    name: Antony R. Mott
    organization: RustyKey
    email: antony@rustykey.io
    country: United States of America

normative:
  RFC7515:
  RFC7517:
  RFC8152:
  RFC9052:
  RFC9053:
  RFC9054:

informative:
  RFC4086:
  RFC7049:
  I-D.ietf-cose-falcon:
  I-D.ietf-cose-dilithium:

  SQIsign-Spec:
    target: https://sqisign.org/spec/sqisign-20250205.pdf
    title: "SQIsign: Compact Post-Quantum Signatures \
      from Quaternions and Isogenies (Round 2)"
    author:
      - ins: SQIsign team
    date: 2025-02

  NIST-Finalized-Standards:
    target: |
      https://www.nist.gov/news-events/news/2024/08/
      nist-releases-first-3-finalized-post-quantum-encryption-standards
    title: |
      "NIST Releases First 3 Finalized
      Post-Quantum Encryption Standards"
    author:
      org: NIST
    date: 2024-08

  SQIsign-Analysis:
    target: https://eprint.iacr.org/2020/1240
    title: |
      "SQIsign: Compact Post-Quantum Signatures
      from Quaternions and Isogenies"
    author:
      org: IACR ePrint Archive
    date: 2021-01

  CNSA-2:
    target: |
      https://media.defense.gov/2025/May/30/
      2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF
    title: "Commercial National Security Algorithm Suite 2.0"
    author:
      org: National Security Agency
    date: 2025-05

  WebAuthn-PQC-Signature-size-constraints:
    target: https://www.npmjs.com/package/quantum-resistant-rustykey
    title: "WebAuthn PQC Signature size constraints"
    author:
      org: University of Quantum Science
    date: 2026-04
---

--- abstract

**NOTE: This document describes a signature scheme based on an algorithm currently under evaluation in the NIST Post-Quantum Cryptography standardization process. Be aware that the underlying primitive may change as a result of that process.**
 
This document specifies the algorithm encodings and representations for the SQIsign digital signature scheme within the CBOR Object Signing and Encryption (COSE) and JSON Object Signing and Encryption (JOSE) frameworks.

SQIsign is an isogeny-based post-quantum signature scheme that provides the most compact signature and public key sizes of any candidate in the NIST Post-Quantum Cryptography (PQC) standardization and on-ramp-to-standardization processes.

The standardization of SQIsign is critical to addressing immediate infrastructure bottlenecks, specifically the FIDO2 CTAP2 specification used by an estimated 6.25 billion in-service devices and browser installations. CTAP2 enforces a 1024-byte default limit for external key communication. Most standardized post-quantum signatures exceed this limit, so cannot easily be deployed in these ecosystems without prohibitive protocol renegotiation, complex message fragmentation or hardware replacement. SQIsign-L1 signatures are small enough to enable delivery over highly constrained networks like 802.15.4 with minimal fragmentation.

This document clarifies that SQIsign's security relies on the general supersingular isogeny problem and is fundamentally unaffected by the torsion-point attacks that deprecated the SIDH/SIKE key exchange. By establishing stable COSE and JOSE identifiers, this document ensures the interoperability required for the seamless integration of post-quantum security into high-density, bandwidth-constrained, and legacy-compatible hardware environments.

--- middle

# Introduction

This document registers algorithm identifiers and key type parameters for SQIsign in COSE and JOSE.

## Background and Motivation

Post-quantum cryptography readiness is critical for constrained devices. As of 2026, while FIDO2/WebAuthn supports various COSE algorithms, hardware authenticators (like YubiKeys) and platform authenticators (like TPMs) have strict memory/storage constraints, effectively limiting public keys to 1024 bytes or less, hindering the adoption of large-key post-quantum algorithms.

### Pressing Need for Smaller PQC Signatures

FN-DSA (Falcon) and ML-DSA (Dilithium) have larger signatures that may not fit in constrained environments. 

The fundamental differences between ML-DSA, FN-DSA, and SQIsign lie in their underlying hard mathematical problems, implementation complexity, and performance trade-offs.

Falcon (NIST secondary) uses NTRU lattices to achieve very small signatures and fast verification, but requires complex floating-point math. Dilithium (NIST primary) is a balanced, high-efficiency lattice scheme using Module-LWE/SIS, easy to implement.

SQIsign {{SQIsign-Spec}} {{SQIsign-Analysis}} is a non-lattice, isogeny-based scheme that offers the smallest signature sizes but suffers from significantly slower signature generation where even vI may take seconds to minutes, or longer with WASM implementations for browsers of particular relevance to signatures required for WebAuthn PassKeys {{WebAuthn-PQC-Signature-size-constraints}}. SQIsign is an isogeny-based digital signature scheme participating in NIST's Round 2 Additional Digital Signature Schemes, not yet a NIST standard {{NIST-Finalized-Standards}}.

Speed: SQIsign is significantly slower at signing (roughly 100x to 1000x) compared to ML-DSA, though the math is changing fast and variants improve this.

| Algorithm | Public Key Size | Signature Size | PK + Sig Fits < 1024?|
|-----------|-----------------|----------------|----------------------|
| ML-DSA-44 | 1,312 bytes | 2,420 bytes | ❌|
| ML-DSA-65 | 1,952 bytes | 3,293 bytes | ❌|
| ML-DSA-87 | 2,592 bytes | 4,595 bytes | ❌|
| FN-DSA-512 | 897 bytes  | 666 bytes | ❌ (1,563 total)|
| FN-DSA-1024 | 1,793 bytes | 1,280 bytes | ❌|
| SQIsign-L1  | 65 bytes  | 148 bytes | ✅ (213 total)|
| SQIsign-L3  | 97 bytes  | 224 bytes | ✅ (321 total)|
| SQIsign-L5  | 129 bytes | 292 bytes | ✅ (421 total)|

### Estimated Constrained Device Footprint

The total addressable market for SQIsign in constrained devices is estimated at ~6.25 billion units.

#### Device Category Breakdown

##### Legacy Hardware Security Keys: ~120 - 150 million
- YubiKeys in Service: Based on Yubico’s historical growth and preliminary 2026 financial estimates, there are approximately
80 million legacy YubiKeys in active circulation (Series 5 and older). While firmware 5.7+ introduced some PQC readiness,
older keys cannot be updated to increase buffer sizes - Other Vendors: Competitors (Google Titan, Feitian, Thales) contribute another 40–50 million active legacy keys

##### Constrained TPMs and Platform Modules: ~1.1 billion
Trusted Platform Modules (TPMs) are integrated into PCs and servers, but their WebAuthn implementation often inherits protocol-level constraints. Estimated ~2.5 billion active chips worldwide. Constrained Subset: We estimate ~1.1 billion of these are in older Windows 10/11 or Linux machines where the OS "virtual authenticator" or TPM driver still enforces the 1024-byte message default to maintain backward compatibility with external CTAP1/2 tools.

##### Browser and Software Implementations: ~5 billion
This category refers to the "User-Agent" layer that mediates between the web and the hardware.
Global Browser Agents: There are over 5 billion active browser instances across mobile and desktop (Chrome, Safari, Edge, Firefox). Legacy Protocols: Even on modern hardware, browsers often use the FIDO2 CTAP2 specification which, unless explicitly negotiated for larger messages, maintains a 1024-byte default for external key communication.

##### Critical Infrastructure: ~300 Million includes Energy (electric, nuclear, oil, gas), Water & Wastewater, Transportation Systems, Communications, Government, Emergency Services, Healthcare and Financial Services
Industrial/Government: Agencies like the U.S. Department of Defense rely on high-security FIPS-certified keys that are notoriously slow to upgrade. We estimate ~50 million "frozen" government keys. IoT Security: Of the 21.9 billion connected IoT devices in 2026, only a fraction use WebAuthn. However, for those that do (smart locks, secure gateways), approximately 250 million are estimated to use older, non-upgradable secure elements limited to 1024-byte payloads. Recent government-level initiatives highlight the necessity to "...effectively deprecate the use of RSA, Diffie-Hellman (DH), and elliptic curve cryptography (ECDH and ECDSA) when mandated." {{CNSA-2}}, Page 4.

### Urgency: Limit or Stop 'Harvest now; decrypt later' Attacks
Adversaries are collecting encrypted data today to decrypt when quantum computers become available. The transition to post-quantum cryptography (PQC) is critical for ensuring long-term security of digital communications against adversaries equipped with large-scale quantum computers. The National Institute of Standards and Technology (NIST) has been leading standardization efforts, having selected initial PQC algorithms and continuing to evaluate additional candidates.

CBOR Object Signing and Encryption (COSE) {{RFC9052}} is specifically designed for constrained node networks and IoT environments where bandwidth, storage, and computational resources are limited. The compact nature of SQIsign makes it an ideal candidate for COSE deployments.

## Scope and Status

This document is published on the **Standards** track rather than Informational Track for the following reasons:

1. **Algorithm Maturity**: SQIsign is currently undergoing evaluation in NIST's on-ramp process
2. **Continued Cryptanalysis**: The algorithm has active ongoing review by the cryptographic research community, including the IRTF CFRG
3. **High anticipated demand**: This specification enables experimentation and early deployment to gather implementation experience

**This document does not represent Working Group consensus on algorithm innovation.** The COSE and JOSE working groups focus on algorithm *integration* and *encoding*, not cryptographic algorithm design. The cryptographic properties of SQIsign are being evaluated through NIST's process and academic peer review.

## Relationship to Other Work

This document follows the precedent established by {{I-D.ietf-cose-falcon}} and {{I-D.ietf-cose-dilithium}} for integrating NIST PQC candidate algorithms into COSE and JOSE. The structure and approach are intentionally aligned to provide consistency across post-quantum signature scheme integrations.

## Constrained Device Applicability
SQIsign is particularly attractive for:

- **IoT sensors** with limited flash memory
- **Firmware updates** over low-bandwidth networks (LoRaWAN, NB-IoT)
- **Embedded certificates** in constrained devices
- **Blockchain and DLT** where transaction size affects fees
- **Satellite communications** with bandwidth constraints

# Conventions and Definitions

{::boilerplate bcp14-tagged}

This document uses the following terms:

- **PQC**: Post-Quantum Cryptography
- **COSE**: CBOR Object Signing and Encryption
- **JOSE**: JSON Object Signing and Encryption
- **JWS**: JSON Web Signature
- **JWK**: JSON Web Key
- **CBOR**: Concise Binary Object Representation {{RFC7049}}
- **ECDH**: Elliptic Curve Diffie-Hellman
- **IANA**: Internet Assigned Numbers Authority

# Resistance to "Torsion Point" attack

## SIKE Vulnerability (The "Torsion Point" Attack) of 2022

SIKE (Supersingular Isogeny Key Encapsulation) was a key exchange, more specifically, a Key Encapsulation Mechanism (KEM). In the SIKE protocol, users had to share more than just the target elliptic curve. To make the math work for key exchange, they shared the images of specific points (called torsion points) under the secret isogeny.
- The Info: If the secret isogeny is 𝜙, SIKE gave away 𝜙(𝑃) and 𝜙(𝑄) for specific basis points 𝑃 and 𝑄.
- The Break: In 2022, Castryck and Decru showed that this auxiliary information allowed an attacker to "glue" the elliptic curves together into a higher-dimensional surface (an Abelian surface). In this higher dimension, the secret isogeny became a path that could be computed efficiently using the "Kani’s Lemma" approach.
- The Oversight: For years, cryptanalysts thought this extra info was harmless, but had missed the math to break it had existed in pure geometry papers since the late 1990s. No one had applied it to cryptography yet.

## Why SQISign appears unaffected by the SIKE Vulnerability

SQISign is built differently. It is a digital signature scheme, not a key exchange.
- No Torsion Points: In SQISign, the prover (signer) does not need to provide the images of torsion points to the verifier. The verifier only sees the starting curve 𝐸₀ and the final curve 𝐸ₐ.
- The "Pure" Isogeny Problem: Because that auxiliary info is absent, the specific attack that broke SIKE has no "hook" to grab onto. An attacker is left with the Hard Isogeny Problem: finding a path between two curves in a graph that looks like a tangled ball of yarn.
- The Quaternion Shield: SQISign relies on the Deuring Correspondence. Even if you find a vulnerability in the curve geometry, you still have to contend with the Endomorphism Ring Problem in the quaternion algebra, which is a completely different mathematical domain.

# SQIsign Algorithm Overview

## Cryptographic Foundation

SQIsign is based on the hardness of finding isogenies between supersingular elliptic curves over finite fields. The security assumption relies primarily on the difficulty of the **Isogeny Path Problem**

Unlike lattice-based schemes, isogeny-based cryptography offers:

- **Smaller key and signature sizes**
- **Algebraic structure** based on elliptic curve isogenies
- **Different security assumptions** (diversification from lattice-based schemes)

## Security Levels

SQIsign is defined with three parameter sets corresponding to NIST security levels:

| Parameter Set | NIST Level | Public Key | Signature  | Classical Sec|
|---------------|------------|------------|------------|--------------|
| SQIsign-L1    | I          | 65 bytes  | 148 bytes | ~128 bits      |
| SQIsign-L3    | III        | 97 bytes  | 224 bytes | ~192 bits      |
| SQIsign-L5    | V          | 129 bytes | 292 bytes | ~256 bits      |

## Performance Characteristics

- **Signing**: Computationally intensive (slower than lattice schemes)
- **Verification**: Moderate computational cost
- **Key Generation**: Intensive computation required
- **Size**: Exceptional efficiency (10 - 20x smaller than lattice alternatives)

**Recommended Use Cases:**
- Sign-once, verify-many scenarios (firmware, certificates)
- Bandwidth-constrained environments
- Storage-limited devices
- Applications where signature/key size dominates performance considerations

# COSE Integration

This section defines the identifiers for SQIsign in COSE {{RFC8152}}.

## SQIsign Algorithms

The algorithms defined in this document are:

*   SQIsign-L1: SQIsign NIST Level I (suggested value -61)
*   SQIsign-L3: SQIsign NIST Level III (suggested value -62)
*   SQIsign-L5: SQIsign NIST Level V (suggested value -63)

## SQIsign Key Types

A new key type is defined for SQIsign with the name "SQIsign".

## SQIsign Key Parameters

SQIsign keys use the following COSE Key common parameters:

| Key Parameter | COSE Label | CBOR Type | Description |
|---------------|------------|-----------|-------------|
| kty | 1 | int | Key type: IETF (SQIsign) |
| kid | 2 | bstr | Key ID (optional) |
| alg | 3 | int | Algorithm identifier (-61, -62, or -63) |
| key_ops | 4 | array | Key operations (`sign`, `verify`) |

## SQIsign-Specific Key Parameters

| Key Parameter | Label | CBOR Type | Description |
|---------------|-------|-----------|-------------|
| pub | -1 | bstr | SQIsign public key |
| priv | -2 | bstr | SQIsign private key (sensitive) |

## COSE Key Format Examples

### Public Key (COSE_Key)

```cbor
{
  1: IETF,              / kty: SQIsign /
  3: -61,              / alg: SQIsign-L1 /
  -1: h'[PUBLIC_KEY]'  / pub: SQIsign public key bytes /
}
```

### Private Key (COSE_Key)

```cbor
{
  1: IETF,               / kty: SQIsign /
  3: -61,               / alg: SQIsign-L1 /
  -1: h'[PUBLIC_KEY]',  / pub: SQIsign public key bytes /
  -2: h'[PRIVATE_KEY]'  / priv: SQIsign private key bytes /
}
```

## COSE Signature Format

SQIsign signatures in COSE follow the standard COSE_Sign1 structure {{RFC9052}}:

```
COSE_Sign1 = [
    protected: bstr .cbor header_map,
    unprotected: header_map,
    payload: bstr / nil,
    signature: bstr
]
```

The `signature` field contains the raw SQIsign signature bytes.

### Protected Headers

The protected header MUST include:

```cbor
{
  1: -61  / alg: SQIsign-L1, -62 for L3, -63 for L5 /
}
```

### Example COSE_Sign1 Structure

```cbor
18(                                  / COSE_Sign1 tag /
  [
    h'A10139003C',                   / protected: {"alg": -61} /
    {},                              / unprotected /
    h'546869732069732074686520636F6E74656E742E', / payload /
    h'[SQISIGN_SIGNATURE_BYTES]'     / signature /
  ]
)
```

# JOSE Integration

## JSON Web Signature (JWS) Algorithm Registration

The following algorithm identifiers are registered for use in the JWS "alg" header parameter for JSON Web Signatures {{RFC7515}}:

| Algorithm Name | Description | Implementation Requirements |
|---------------|-------------|------------------------------|
| SQIsign-L1 | SQIsign NIST Level I | Optional |
| SQIsign-L3 | SQIsign NIST Level III | Optional |
| SQIsign-L5 | SQIsign NIST Level V | Optional |

## JSON Web Key (JWK) Representation

SQIsign keys are represented in JWK {{RFC7517}} format as follows:

### Public Key Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| kty | string | Key type: "SQIsign" |
| alg | string | Algorithm: "SQIsign-L1", "SQIsign-L3", or "SQIsign-L5"|
| pub | string | Base64url-encoded public key |
| kid | string | Key ID (optional) |
| use | string | Public key use: "sig" (optional) |
| key_ops | array | Key operations: \[verify\] (optional) |

### Private Key Parameters

Private keys include all public key parameters plus:

| Parameter | Type | Description |
|-----------|------|-------------|
| priv | string | Base64url-encoded private key |

## JWK Examples

### Public Key (JWK) Example

```json
{
  "kty": "SQIsign",
  "alg": "SQIsign-L1",
  "pub": "KxtQx8s8RcBEU67wr57K37fdPEztN4M8NUC_\
    5xZuqgMwkaeJhM94YHi_-2UsQllbnmm-W4XFSLm2hUwiMylrAh0",
  "kid": "2027-01-device-key",
  "use": "sig",
  "key_ops": ["verify"]
}
```

### Private Key (JWK) Example

```json
{
  "kty": "SQIsign",
  "alg": "SQIsign-L1",
  "pub": "KxtQx8s8RcBEU67wr57K37fdPEztN4M8NUC_\
    5xZuqgMwkaeJhM94YHi_-2UsQllbnmm-W4XFSLm2hUwiMylrAh0",
  "priv": "KxtQx8s8RcBEU67wr57K37fdPEztN4M8NUC_5xZuqgMwkaeJhM94YHi_\
    -2UsQllbnmm-W4XFSLm2hUwiMylrAh1VwP9vNkBZH0Bjj2wc-\
    p7sUgQAAAAAAAAAAAAAAAAAAN68tviJbcCpQ84fh-4IJB4-\
    ____________________P38m3fKOhfhMspQU9GmA4CD5___\
    _______________________________________________\
    ___________wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
    AAAAAAA5cP9aha40v-8mFd_bdAgpR93Ug2iPhu4_NxG97C7\
    8wBvVMGOrQTCli7NxrR2KlPZR1AC5VddGf4p-ZjCzrWfAJv\
    xhEh4uOKXq1MmuS9TwZGuz1YIYMIguu1wqjdmfaQAfOmK2g\
    WWO3vcld5s7GR2AcrTv65ocK_pVUWY8eJDcQA",
  "kid": "2027-01-device-key",
  "use": "sig",
  "key_ops": ["sign"]
}
```

## JWS Compact Serialization

A JWS using SQIsign follows the standard compact serialization:

```
BASE64URL(UTF8(JWS Protected Header)) || '.' ||
BASE64URL(JWS Payload) || '.' ||
BASE64URL(JWS Signature)
```

### Example JWS Protected Header

```json
{
  "alg": "SQIsign-L1",
  "typ": "JWT"
}
```

Base64url-encoded: `eyJhbGciOiJTUUlzaWduLUwxIiwidHlwIjoiSldUIn0`

### Complete JWS Example

```
eyJhbGciOiJTUUlzaWduLUwxIiwidHlwIjoiSldUIn0
.
[BASE64URL_PAYLOAD]
.
[BASE64URL_SQISIGN_SIGNATURE]
```

# Implementation Considerations

## Signature and Key Generation

Implementations MUST follow the SQIsign specification {{SQIsign-Spec}} for:

- Key pair generation
- Signature generation
- Signature verification

## Randomness Requirements

SQIsign signature generation requires high-quality randomness. Implementations MUST use a cryptographically secure random number generator (CSRNG) compliant with {{RFC4086}} or equivalent.

## Side-Channel Protections

Implementations SHOULD implement protections against:

- Timing attacks
- Power analysis
- Fault injection attacks

Particularly for constrained devices deployed in physically accessible environments.

## Performance Trade-offs

Implementers should be aware:

- **Signing is computationally expensive**: Consider pre-signing or batch operations
- **Verification is moderate**: Suitable for resource-constrained verifiers
- **Size is exceptional**: Minimizes bandwidth and storage

## Interoperability Testing

Early implementations SHOULD participate in interoperability testing to ensure:

- Consistent signature generation and verification
- Proper encoding in COSE and JOSE formats
- Cross-platform compatibility

# Security Considerations

## Algorithm Security

The security of SQIsign relies primarily on the hardness of finding isogenies between supersingular elliptic curves.

These assumptions are **different from lattice-based schemes**, providing cryptographic diversity in the post-quantum landscape.

## Quantum Security

SQIsign is designed to resist attacks by large-scale quantum computers. The three parameter sets provide security equivalent to AES-128, AES-192, and AES-256 against both classical and quantum adversaries.

## Current Cryptanalysis Status

As of this writing, SQIsign is undergoing active cryptanalytic review:

- **NIST Round 2 evaluation**: {{NIST-Finalized-Standards}}
- **Academic research**: Ongoing analysis of isogeny-based cryptography
- **Known attacks**: No practical breaks of the security assumptions

**Implementers are advised**:
- Monitor NIST announcements and updates
- Follow academic literature on isogeny cryptanalysis
- Be prepared to deprecate or update as cryptanalysis evolves

## Implementation Security

### Random Number Generation

Poor randomness can completely compromise SQIsign security. Implementations MUST use robust CSRNGs, especially on constrained devices with limited entropy sources.

### Side-Channel Resistance

Constrained devices may be physically accessible to attackers. Implementations SHOULD:

- Use constant-time algorithms where possible
- Implement countermeasures against DPA/SPA
- Consider fault attack mitigations

### Key Management

- Private keys MUST be protected with appropriate access controls
- Consider hardware security modules (HSMs) or secure elements for key storage
- Implement key rotation policies appropriate to the deployment

## Cryptographic Agility

Organizations deploying SQIsign SHOULD:

- Maintain hybrid deployments with classical algorithms during transition
- Plan for algorithm migration if cryptanalysis reveals weaknesses
- Monitor NIST and IRTF guidance on PQC deployment

## Constrained Device Specific Risks

IoT devices face unique challenges:

- **Physical access**: Devices may be deployed in hostile environments
- **Limited update capability**: Firmware updates may be infrequent or impossible
- **Long deployment lifetimes**: Devices may operate for 10+ years

Design systems with:
- Defense in depth (multiple security layers)
- Remote update capability when possible
- Graceful degradation if algorithm is compromised

# IANA Considerations

## Additions to Existing Registries

IANA is requested to add the following entries to the COSE and JOSE registries. The following completed registration actions are provided as described in {{RFC9053}} and {{RFC9054}}.

### New COSE Algorithms

IANA is requested to register the following entries in the "COSE Algorithms" registry:

| Name | Value| Description| Capabilities| Change Cont | Ref| Rec'd |
|------------|-----|------------------|-----|------|----------|----|
| SQIsign-L1 | -61 | SQIsign NIST L I | kty | IETF | THIS-RFC | No |
| SQIsign-L3 | -62 | SQIsign NIST L III | kty | IETF | THIS-RFC | No |
| SQIsign-L5 | -63 | SQIsign NIST L V | kty | IETF | THIS-RFC | No |

### New COSE Key Types

IANA is requested to register the following entry in the "COSE Key Types" registry:

| Name | Value | Description | Capabilities | Change Cont | Ref |
|---------|------|-----------------|--------------|------|----------|
| SQIsign | IETF | SQIsign pub key | sign, verify | IETF | THIS-RFC |

### New COSE Key Type Parameters

IANA is requested to register the following entries in the "COSE Key Type Parameters" registry:

| Key Type | Name | Label | CBOR Type | Desc | Change Cont | Reference |
|---------|-----|----|------|------------|------|----------|
| SQIsign | pub | -1 | bstr | Public key | IETF | THIS-RFC |
| SQIsign | priv | -2 | bstr | Private key | IETF | THIS-RFC |

### New JWS Algorithms

IANA is requested to register the following entries in the "JSON Web Signature and Encryption Algorithms" registry:

| Algorithm Name | Desc | Impl Req | Change Cont | Ref | Recommended |
|------------|------------------|----------|------|----------|----|
| SQIsign-L1 | SQIsign NIST L I | Optional | IETF | THIS-RFC | No |
| SQIsign-L3 | SQIsign NIST L III | Optional | IETF | THIS-RFC | No |
| SQIsign-L5 | SQIsign NIST L V | Optional | IETF | THIS-RFC | No |

### New JSON Web Key Types

IANA is requested to register the following entry in the "JSON Web Key Types" registry:

| "kty" Param Value | Key Type Desc | Change Cont | Reference |
|---------|--------------------|------|----------|
| SQIsign | SQIsign public key | IETF | THIS-RFC |

### New JSON Web Key Parameters

IANA is requested to register the following entries in the "JSON Web Key Parameters" registry:

| Param Name | Desc | Used with "kty" Val | Change Cont | Reference |
|-----|------------|---------|------|----------|
| pub | Public key | SQIsign | IETF | THIS-RFC |
| priv | Private key | SQIsign | IETF | THIS-RFC |

# Acknowledgments

The authors would like to thank:

- The SQIsign design team for groundbreaking work on isogeny-based signatures
- The NIST PQC team for managing the standardization process
- The COSE and JOSE working groups for guidance on integration
- The IRTF Crypto Forum Research Group for ongoing cryptanalytic review
- Early implementers who provide valuable feedback

This work builds upon the template established by {{I-D.ietf-cose-falcon}} and similar PQC integration efforts.

# References

## Normative References

*Populated automatically from metadata*

## Informative References

*Populated automatically from metadata*

--- back

# Test Vectors

## SQIsign-L1 Test Vectors

### Example 1: Simple Message Signing

The following test vector exhibits a SQIsign Level I signature over a short message.

Message (hex): `d81c4d8d734fcbfbeade3d3f8a039faa2a2c9957e835ad55b2 \
2e75bf57bb556ac8`
Message (ASCII): `MsO=?*,W5U.uWUj`

Public Key (hex): `07CCD21425136F6E865E497D2D4D208F0054AD81372066E \
817480787AAF7B2029550C89E892D618CE3230F23510BFBE68FCCDDAEA51DB1436 \
B462ADFAF008A010B`
Public Key (Base64url): `B8zSFCUTb26GXkl9LU0gjwBUrYE3IGboF0gHh6r3s \
gKVUMieiS1hjOMjDyNRC_vmj8zdrqUdsUNrRirfrwCKAQs`

Signature (hex): `84228651f271b0f39f2f19f2e8718f31ed3365ac9e5cb303 \
afe663d0cfc11f0455d891b0ca6c7e653f9ba2667730bb77befe1b1a3182840428 \
4af8fd7baacc010001d974b5ca671ff65708d8b462a5a84a1443ee9b5fed721876 \
7c9d85ceed04db0a69a2f6ec3be835b3b2624b9a0df68837ad00bcacc27d1ec806 \
a44840267471d86eff3447018adb0a6551ee8322ab30010202`
Signature (Base64url): `hCKGUfJxsPOfLxny6HGPMe0zZayeXLMDr-Zj0M_BHw \
RV2JGwymx-ZT-bomZ3MLt3vv4bGjGChAQoSvj9e6rMAQAB2XS1ymcf9lcI2LRipahK \
FEPum1_tchh2fJ2Fzu0E2wppovbsO-g1s7JiS5oN9og3rQC8rMJ9HsgGpEhAJnRx2G \
7_NEcBitsKZVHugyKrMAECAg`

### COSE_Sign1 Complete Example

```cbor
18(
  [
    h'a10139003c', / protected: {"alg": -61} /
    {},           / unprotected /
    h'd81c4d8d734fcbfbeade3d3f8a039faa2a2c9957e835ad55b22e75bf57bb \
    556ac8', / payload /
    h'84228651f271b0f39f2f19f2e8718f31ed3365ac9e5cb303afe663d0cfc1 \
    1f0455d891b0ca6c7e653f9ba2667730bb77befe1b1a31828404284af8fd7b \
    aacc010001d974b5ca671ff65708d8b462a5a84a1443ee9b5fed7218767c9d \
    85ceed04db0a69a2f6ec3be835b3b2624b9a0df68837ad00bcacc27d1ec806 \
    a44840267471d86eff3447018adb0a6551ee8322ab30010202'
  ]
)
```

### JWS Complete Example

```
eyJhbGciOiJTUUlzaWduLUwxIiwidHlwIjoiSldUIn0
.
2BxNjXNPy_vq3j0_igOfqiosmVfoNa1Vsi51v1e7VWrI
.
hCKGUfJxsPOfLxny6HGPMe0zZayeXLMDr-Zj0M_BHwRV2JGwymx-ZT-bomZ3MLt3vv \
4bGjGChAQoSvj9e6rMAQAB2XS1ymcf9lcI2LRipahKFEPum1_tchh2fJ2Fzu0E2wpp \
ovbsO-g1s7JiS5oN9og3rQC8rMJ9HsgGpEhAJnRx2G7_NEcBitsKZVHugyKrMAECAg
```

## SQIsign-L3 Test Vectors

```
[PLACEHOLDER FOR L3 TEST VECTORS]
```

## SQIsign-L5 Test Vectors

```
[PLACEHOLDER FOR L5 TEST VECTORS]
```

# Implementation Status

\[RFC Editor: Please remove this section before publication\]

This section records the status of known implementations at the time of writing.

## Open Source Implementations

### Reference Implementation

- **Organization**: SQIsign team
- **Repository**: https://github.com/SQISign/the-sqisign
- **Language**: C
- **License**: MIT
- **Status**: Active development
- **COSE/JOSE Support**: Not yet integrated

### Rust Implementation

- **Organization**: IETF - Community implementation
- **Repository**: IETF
- **Language**: Rust
- **License**: IETF
- **COSE Support**: Planned
- **Status**: Development

## Commercial Implementations

\[RFC EDITOR: To be populated as vendors implement\]

## Interoperability Testing

- **Test Suite Location**: IETF
- **Participating Organizations**: IETF

# Design Rationale

## Algorithm Identifier Selection

The requested algorithm identifiers (-61, -62, -63) are:

- In the range designated for experimental/informational use
- Sequential for the three parameter sets
- Not conflicting with existing registrations
- Consistent with the approach used for other PQC algorithms

## Key Type Design

The SQIsign key type is intentionally simple:

- Only two parameters (pub, priv) following minimalist design
- Binary encoding (bstr) for efficiency
- No algorithm-specific encoding—raw bytes from SQIsign spec

This approach:
- Minimizes CBOR encoding overhead (critical for constrained devices)
- Simplifies implementation
- Provides future flexibility for parameter set evolution

# Change Log

\[RFC Editor Note:** Please remove this section before publication\]

## draft-mott-cose-sqisign-01

- updated version
- Algorithm registrations for SQIsign-L1, L3, L5
- COSE and JOSE integration specifications
- Security considerations for constrained devices

---
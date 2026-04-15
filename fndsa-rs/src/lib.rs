use fn_dsa::{
    sign_key_size, signature_size, vrfy_key_size, CryptoRng, KeyPairGenerator,
    KeyPairGeneratorStandard, RngCore, SigningKey, SigningKeyStandard, VerifyingKey,
    VerifyingKeyStandard, FN_DSA_LOGN_1024, FN_DSA_LOGN_512, HASH_ID_RAW, DOMAIN_NONE, SHAKE256,
};
use wasm_bindgen::prelude::*;

struct ShakeRng {
    shake: SHAKE256,
}

impl ShakeRng {
    fn new(seed: &[u8]) -> Self {
        let mut shake = SHAKE256::new();
        shake.inject(seed);
        shake.flip();
        Self { shake }
    }
}

impl CryptoRng for ShakeRng {}

impl RngCore for ShakeRng {
    fn next_u32(&mut self) -> u32 {
        let mut out = [0u8; 4];
        self.fill_bytes(&mut out);
        u32::from_le_bytes(out)
    }

    fn next_u64(&mut self) -> u64 {
        let mut out = [0u8; 8];
        self.fill_bytes(&mut out);
        u64::from_le_bytes(out)
    }

    fn fill_bytes(&mut self, dest: &mut [u8]) {
        self.shake.extract(dest);
    }

    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), fn_dsa::RngError> {
        self.fill_bytes(dest);
        Ok(())
    }
}

#[wasm_bindgen]
pub struct FalconKeyPair {
    public_key: Vec<u8>,
    private_key: Vec<u8>,
}

#[wasm_bindgen]
impl FalconKeyPair {
    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn private_key(&self) -> Vec<u8> {
        self.private_key.clone()
    }
}

fn check_logn(logn: u32) -> Result<(), JsValue> {
    if logn == FN_DSA_LOGN_512 || logn == FN_DSA_LOGN_1024 {
        Ok(())
    } else {
        Err(JsValue::from_str(
            "Unsupported FN-DSA parameter. Use 512 or 1024.",
        ))
    }
}

fn normalize_logn(variant: u32) -> Result<u32, JsValue> {
    if variant == 512 {
        Ok(FN_DSA_LOGN_512)
    } else if variant == 1024 {
        Ok(FN_DSA_LOGN_1024)
    } else {
        Err(JsValue::from_str("FN-DSA variant must be 512 or 1024"))
    }
}

fn sign_inner(logn: u32, secret_key: &[u8], message: &[u8], seed: &[u8]) -> Result<Vec<u8>, JsValue> {
    check_logn(logn)?;
    if seed.is_empty() {
        return Err(JsValue::from_str("Signing seed must not be empty"));
    }
    if secret_key.len() != sign_key_size(logn) {
        return Err(JsValue::from_str("Invalid FN-DSA secret key length"));
    }

    let mut signing_key = SigningKeyStandard::decode(secret_key)
        .ok_or_else(|| JsValue::from_str("Could not decode FN-DSA secret key"))?;

    let mut sig = vec![0u8; signature_size(logn)];
    let mut rng = ShakeRng::new(seed);
    signing_key.sign(
        &mut rng,
        &DOMAIN_NONE,
        &HASH_ID_RAW,
        message,
        &mut sig,
    );
    Ok(sig)
}

fn verify_inner(logn: u32, public_key: &[u8], message: &[u8], signature: &[u8]) -> Result<bool, JsValue> {
    check_logn(logn)?;
    if public_key.len() != vrfy_key_size(logn) {
        return Err(JsValue::from_str("Invalid FN-DSA public key length"));
    }

    let verifying_key = VerifyingKeyStandard::decode(public_key)
        .ok_or_else(|| JsValue::from_str("Could not decode FN-DSA public key"))?;
    Ok(verifying_key.verify(
        signature,
        &DOMAIN_NONE,
        &HASH_ID_RAW,
        message,
    ))
}

#[wasm_bindgen]
pub fn falcon_keygen(variant: u32, seed: &[u8]) -> Result<FalconKeyPair, JsValue> {
    if seed.is_empty() {
        return Err(JsValue::from_str("Keygen seed must not be empty"));
    }

    let logn = normalize_logn(variant)?;
    let mut keygen = KeyPairGeneratorStandard::default();
    let mut rng = ShakeRng::new(seed);

    let mut private_key = vec![0u8; sign_key_size(logn)];
    let mut public_key = vec![0u8; vrfy_key_size(logn)];
    keygen.keygen(logn, &mut rng, &mut private_key, &mut public_key);

    Ok(FalconKeyPair {
        public_key,
        private_key,
    })
}

#[wasm_bindgen]
pub fn falcon_sign(
    variant: u32,
    secret_key: &[u8],
    message: &[u8],
    seed: &[u8],
) -> Result<Vec<u8>, JsValue> {
    let logn = normalize_logn(variant)?;
    sign_inner(logn, secret_key, message, seed)
}

#[wasm_bindgen]
pub fn falcon_verify(
    variant: u32,
    public_key: &[u8],
    message: &[u8],
    signature: &[u8],
) -> Result<bool, JsValue> {
    let logn = normalize_logn(variant)?;
    verify_inner(logn, public_key, message, signature)
}

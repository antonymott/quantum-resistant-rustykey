#include <emscripten.h>
#include <stddef.h>
#include <stdint.h>

#define MLD_CONFIG_PARAMETER_SET 65
#define MLD_CONFIG_NAMESPACE_PREFIX mldsa65
#include "mldsa_native.h"

EMSCRIPTEN_KEEPALIVE
int
mldsa65_public_key_bytes(void)
{
	return (int)MLDSA_PUBLICKEYBYTES(65);
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_private_key_bytes(void)
{
	return (int)MLDSA_SECRETKEYBYTES(65);
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_signature_bytes(void)
{
	return (int)MLDSA_BYTES(65);
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_seed_bytes(void)
{
	return (int)MLDSA_SEEDBYTES;
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_random_bytes(void)
{
	return (int)MLDSA_RNDBYTES;
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_keypair_seeded(uint8_t *pk, uint8_t *sk, const uint8_t *seed)
{
	return mldsa65_keypair_internal(pk, sk, seed);
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_sign_seeded(uint8_t *sig, const uint8_t *msg, size_t msg_len,
	const uint8_t *sk, const uint8_t *rnd)
{
	size_t sig_len;
	int rc;

	sig_len = MLDSA_BYTES(65);
	rc = mldsa65_signature_internal(sig, &sig_len, msg, msg_len, NULL, 0, rnd,
		sk, 0);
	if (rc != 0) {
		return rc;
	}
	return sig_len == MLDSA_BYTES(65) ? 0 : MLD_ERR_FAIL;
}

EMSCRIPTEN_KEEPALIVE
int
mldsa65_verify_signature(const uint8_t *sig, size_t sig_len, const uint8_t *msg,
	size_t msg_len, const uint8_t *pk)
{
	return mldsa65_verify_internal(sig, sig_len, msg, msg_len, NULL, 0, pk, 0);
}

#include <emscripten.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

#include "falcon.h"

#define FALCON_LOGN 9
#define FALCON_SEED_BYTES 48

static int
falcon512_run_keygen(uint8_t *pk, uint8_t *sk, const uint8_t *seed)
{
	shake256_context rng;
	void *tmp;
	int rc;

	tmp = malloc(FALCON_TMPSIZE_KEYGEN(FALCON_LOGN));
	if (tmp == NULL) {
		return FALCON_ERR_INTERNAL;
	}

	shake256_init_prng_from_seed(&rng, seed, FALCON_SEED_BYTES);
	rc = falcon_keygen_make(&rng, FALCON_LOGN, sk, FALCON_PRIVKEY_SIZE(FALCON_LOGN),
		pk, FALCON_PUBKEY_SIZE(FALCON_LOGN), tmp,
		FALCON_TMPSIZE_KEYGEN(FALCON_LOGN));
	free(tmp);
	return rc;
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_public_key_bytes(void)
{
	return (int)FALCON_PUBKEY_SIZE(FALCON_LOGN);
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_private_key_bytes(void)
{
	return (int)FALCON_PRIVKEY_SIZE(FALCON_LOGN);
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_signature_bytes(void)
{
	return (int)FALCON_SIG_PADDED_SIZE(FALCON_LOGN);
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_seed_bytes(void)
{
	return FALCON_SEED_BYTES;
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_keypair_seeded(uint8_t *pk, uint8_t *sk, const uint8_t *seed)
{
	return falcon512_run_keygen(pk, sk, seed);
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_sign_seeded(uint8_t *sig, const uint8_t *msg, size_t msg_len,
	const uint8_t *sk, const uint8_t *seed)
{
	shake256_context rng;
	size_t sig_len;
	void *tmp;
	int rc;

	tmp = malloc(FALCON_TMPSIZE_SIGNDYN(FALCON_LOGN));
	if (tmp == NULL) {
		return FALCON_ERR_INTERNAL;
	}

	shake256_init_prng_from_seed(&rng, seed, FALCON_SEED_BYTES);
	sig_len = FALCON_SIG_PADDED_SIZE(FALCON_LOGN);
	rc = falcon_sign_dyn(&rng, sig, &sig_len, FALCON_SIG_PADDED, sk,
		FALCON_PRIVKEY_SIZE(FALCON_LOGN), msg, msg_len, tmp,
		FALCON_TMPSIZE_SIGNDYN(FALCON_LOGN));
	free(tmp);
	return rc;
}

EMSCRIPTEN_KEEPALIVE
int
falcon512_verify(const uint8_t *sig, size_t sig_len, const uint8_t *msg,
	size_t msg_len, const uint8_t *pk)
{
	void *tmp;
	int rc;

	tmp = malloc(FALCON_TMPSIZE_VERIFY(FALCON_LOGN));
	if (tmp == NULL) {
		return FALCON_ERR_INTERNAL;
	}

	rc = falcon_verify(sig, sig_len, FALCON_SIG_PADDED, pk,
		FALCON_PUBKEY_SIZE(FALCON_LOGN), msg, msg_len, tmp,
		FALCON_TMPSIZE_VERIFY(FALCON_LOGN));
	free(tmp);
	return rc;
}

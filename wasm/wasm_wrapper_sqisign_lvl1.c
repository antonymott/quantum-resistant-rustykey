#include <emscripten.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include <api.h>
#include <sig.h>

extern void randombytes_init(unsigned char *entropy_input,
	unsigned char *personalization_string, int security_strength);

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_public_key_bytes(void)
{
	return (int)CRYPTO_PUBLICKEYBYTES;
}

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_private_key_bytes(void)
{
	return (int)CRYPTO_SECRETKEYBYTES;
}

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_signature_bytes(void)
{
	return (int)CRYPTO_BYTES;
}

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_seed_bytes(void)
{
	return 48;
}

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_keypair_seeded(uint8_t *pk, uint8_t *sk, const uint8_t *seed)
{
	randombytes_init((unsigned char *)seed, NULL, 256);
	return crypto_sign_keypair(pk, sk);
}

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_sign_seeded(uint8_t *sig, const uint8_t *msg, size_t msg_len,
	const uint8_t *sk, const uint8_t *seed)
{
	unsigned long long smlen;
	size_t cap = (size_t)CRYPTO_BYTES + msg_len;
	unsigned char *sm;
	int rc;

	sm = (unsigned char *)malloc(cap);
	if (sm == NULL) {
		return -1;
	}
	randombytes_init((unsigned char *)seed, NULL, 256);
	rc = crypto_sign(sm, &smlen, msg, (unsigned long long)msg_len, sk);
	if (rc != 0) {
		free(sm);
		return rc;
	}
	if (smlen < (unsigned long long)CRYPTO_BYTES) {
		free(sm);
		return -2;
	}
	memcpy(sig, sm, (size_t)CRYPTO_BYTES);
	free(sm);
	return 0;
}

EMSCRIPTEN_KEEPALIVE int
sqisign_lvl1_verify(const uint8_t *sig, size_t sig_len, const uint8_t *msg,
	size_t msg_len, const uint8_t *pk)
{
	if (sig_len != (size_t)CRYPTO_BYTES) {
		return 1;
	}
	return sqisign_verify(msg, (unsigned long long)msg_len, sig,
		(unsigned long long)sig_len, pk);
}

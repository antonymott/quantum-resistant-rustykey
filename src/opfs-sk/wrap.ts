import { zeroizeBytes } from "../signature-common.js";
import { asArrayBuffer, requireOpfsSkBytes } from "./bytes.js";

const WRAP_VERSION = 0x01;
const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const MIN_PRF_BYTES = 16;
const MIN_SALT_BYTES = 16;
const WRAP_INFO = new TextEncoder().encode("qrr-opfs-sk-wrap-v1");

function requireSecretBytes(
	value: unknown,
	label: string,
	minLength: number,
): Uint8Array {
	const bytes = requireOpfsSkBytes(value, label);
	if (bytes.byteLength < minLength) {
		throw new TypeError(`${label} must be at least ${minLength} bytes`);
	}
	return bytes;
}

function subtleCopy(bytes: Uint8Array): {
	view: Uint8Array;
	buffer: ArrayBuffer;
} {
	const buffer = asArrayBuffer(bytes);
	return { view: new Uint8Array(buffer), buffer };
}

async function deriveAesGcmKey(
	prfOutput: Uint8Array,
	salt: Uint8Array,
): Promise<CryptoKey> {
	const ikmCopy = subtleCopy(prfOutput);
	const saltCopy = subtleCopy(salt);
	try {
		const ikm = await crypto.subtle.importKey(
			"raw",
			ikmCopy.buffer,
			"HKDF",
			false,
			["deriveKey"],
		);
		return await crypto.subtle.deriveKey(
			{
				name: "HKDF",
				hash: "SHA-256",
				salt: saltCopy.buffer,
				info: asArrayBuffer(WRAP_INFO),
			},
			ikm,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"],
		);
	} finally {
		zeroizeBytes(ikmCopy.view);
		zeroizeBytes(saltCopy.view);
	}
}

/**
 * AES-256-GCM wrap of a PQC private key. `prfOutput` is WebAuthn
 * `prf.results.first`; `salt` is the RP-stored registration salt.
 */
export async function wrapPrivateKey(
	plaintext: Uint8Array,
	prfOutput: Uint8Array,
	salt: Uint8Array,
): Promise<Uint8Array> {
	const sk = requireOpfsSkBytes(plaintext, "private_key");
	const prf = requireSecretBytes(prfOutput, "prfOutput", MIN_PRF_BYTES);
	const saltBytes = requireSecretBytes(salt, "salt", MIN_SALT_BYTES);
	const key = await deriveAesGcmKey(prf, saltBytes);
	const ivCopy = subtleCopy(crypto.getRandomValues(new Uint8Array(IV_BYTES)));
	const skCopy = subtleCopy(sk);
	try {
		const ciphertext = new Uint8Array(
			await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv: ivCopy.buffer },
				key,
				skCopy.buffer,
			),
		);
		const out = new Uint8Array(1 + IV_BYTES + ciphertext.byteLength);
		out[0] = WRAP_VERSION;
		out.set(ivCopy.view, 1);
		out.set(ciphertext, 1 + IV_BYTES);
		return out;
	} finally {
		zeroizeBytes(skCopy.view);
		zeroizeBytes(ivCopy.view);
	}
}

export async function unwrapPrivateKey(
	sealed: Uint8Array,
	prfOutput: Uint8Array,
	salt: Uint8Array,
): Promise<Uint8Array> {
	const blob = requireOpfsSkBytes(sealed, "sk_enc");
	const prf = requireSecretBytes(prfOutput, "prfOutput", MIN_PRF_BYTES);
	const saltBytes = requireSecretBytes(salt, "salt", MIN_SALT_BYTES);
	if (
		blob[0] !== WRAP_VERSION ||
		blob.byteLength < 1 + IV_BYTES + GCM_TAG_BYTES
	) {
		throw new Error("OPFS sk wrap: invalid ciphertext");
	}
	const iv = blob.slice(1, 1 + IV_BYTES);
	const data = blob.slice(1 + IV_BYTES);
	const key = await deriveAesGcmKey(prf, saltBytes);
	return new Uint8Array(
		await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: asArrayBuffer(iv) },
			key,
			asArrayBuffer(data),
		),
	);
}

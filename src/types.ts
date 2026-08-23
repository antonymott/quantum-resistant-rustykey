export type MaybePromise<T> = T | Promise<T>;

/** Hex string, ArrayBuffer, or raw bytes — common input for signature APIs. */
export type BytesLike = Uint8Array | ArrayBuffer | string;

/**
 * Key material returned by signature schemes (FN-DSA, ML-DSA, SLH-DSA, SQIsign).
 * Prefer awaiting `get(...)` so callers always hold concrete `Uint8Array`s.
 */
export interface KeyPair {
	get(key: "public_key" | "private_key"): MaybePromise<Uint8Array>;
}

/**
 * ML-KEM keys are Web Crypto `CryptoKey` handles (raw export via `buffer_to_string`).
 */
export interface MlKemKeyPair {
	get(key: "public_key" | "private_key"): MaybePromise<CryptoKey>;
}

export interface EncryptResult {
	// `cyphertext` is intentionally spelled this way to match the existing README/API.
	get(key: "cyphertext" | "secret"): MaybePromise<ArrayBuffer>;
}

/** Shared secret material for AES-GCM helpers (KEM secret or hex). */
export type SecretLike = BytesLike | ArrayBufferView;

export interface IMlKem {
	keypair(): MlKemKeyPair;
	encrypt(public_key: MaybePromise<CryptoKey>): EncryptResult;
	decrypt(
		cyphertext: MaybePromise<BufferSource>,
		private_key: MaybePromise<CryptoKey>,
	): Promise<ArrayBuffer>;
	buffer_to_string(
		buffer: MaybePromise<CryptoKey | BufferSource | string>,
	): MaybePromise<string>;
	encryptMessage(
		message: string,
		secret: MaybePromise<SecretLike>,
	): Promise<Uint8Array>;
	decryptMessage(
		encryptedMessage: Uint8Array,
		secret: MaybePromise<SecretLike>,
	): Promise<string>;
	delete(): void;
}

export type KemVariant = "k1024" | "k768" | "k512";

export type FnDsaVariant = "falcon512" | "falcon1024";
export type MlDsaVariant = "dilithium3" | "dilithium5";
export type SlhDsaVariant = "sha2_128s" | "sha2_192s" | "sha2_256s";
export type SqisignVariant = "lvl1" | "lvl3" | "lvl5";

export interface IFnDsa {
	keypair(): KeyPair;
	sign(message: BytesLike, private_key: BytesLike): Promise<Uint8Array>;
	verify(
		signature: BytesLike,
		message: BytesLike,
		public_key: BytesLike,
	): Promise<boolean>;
	buffer_to_string(value: BytesLike): string;
}

export type IMlDsa = IFnDsa;

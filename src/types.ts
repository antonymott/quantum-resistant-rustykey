export type MaybePromise<T> = T | Promise<T>;

export interface KeyPair {
	// `mlkem-wasm` is async under the hood; we expose that via Promise values.
	get(key: "public_key" | "private_key"): MaybePromise<any>;
}

export interface EncryptResult {
	// `cyphertext` is intentionally spelled this way to match the existing README/API.
	get(key: "cyphertext" | "secret"): MaybePromise<any>;
}

export interface IMlKem {
	keypair(): KeyPair;
	encrypt(public_key: any): EncryptResult;
	decrypt(cyphertext: any, private_key: any): Promise<any>;
	buffer_to_string(buffer: any): MaybePromise<string>;
	encryptMessage(message: string, secret: any): Promise<Uint8Array>;
	decryptMessage(encryptedMessage: Uint8Array, secret: any): Promise<string>;
	delete(): void;
}

export type KemVariant = "k1024" | "k768" | "k512";

export type FnDsaVariant = "falcon512" | "falcon1024";

export interface IFnDsa {
	keypair(): KeyPair;
	sign(
		message: Uint8Array | ArrayBuffer | string,
		private_key: unknown,
	): Promise<Uint8Array>;
	verify(
		signature: Uint8Array | ArrayBuffer | string,
		message: Uint8Array | ArrayBuffer | string,
		public_key: unknown,
	): Promise<boolean>;
	buffer_to_string(value: Uint8Array | ArrayBuffer | string): string;
}

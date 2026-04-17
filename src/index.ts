import type { EncryptResult, IMlKem, KeyPair, MaybePromise } from "./types.js";
import mlkem768 from "./vendor/mlkem.js";
import mlkem512 from "./vendor/mlkem512.js";
import mlkem1024 from "./vendor/mlkem1024.js";

export { loadFnDsa512, loadFnDsa1024 } from "./fndsa.js";
export { loadMlDsa3, loadMlDsa5 } from "./mldsa.js";
export { loadSqisignLvl1 } from "./sqisign.js";
export {
	SQISIGN_LVL1_KAT0_MSG_HEX,
	SQISIGN_LVL1_KAT0_PK_HEX,
	SQISIGN_LVL1_KAT0_SIG_HEX,
	SQISIGN_LVL1_KAT0_SM_HEX,
} from "./sqisign-kat-lvl1.js";

/** Minimal surface used by this package (mlkem-wasm–style API). */
type MlKemImpl = {
	generateKey(
		algorithm: { name: string } | string,
		extractable: boolean,
		usages: string[],
	): Promise<CryptoKeyPair>;
	encapsulateBits(
		algorithm: { name: string } | string,
		encapsulationKey: CryptoKey,
	): Promise<{ sharedKey: ArrayBuffer; ciphertext: ArrayBuffer }>;
	decapsulateBits(
		algorithm: { name: string } | string,
		decapsulationKey: CryptoKey,
		ciphertext: BufferSource,
	): Promise<ArrayBuffer>;
	exportKey(format: string, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey>;
};

function bytesToHexWithSpaces(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

function hexStringToBytes(hex: string): Uint8Array {
	const cleaned = hex.trim().replace(/^0x/i, "");
	if (!cleaned) return new Uint8Array();

	const parts = cleaned.includes(" ") ? cleaned.split(/\s+/) : null;
	if (parts) {
		return Uint8Array.from(parts.map((p) => parseInt(p, 16)));
	}

	if (cleaned.length % 2 !== 0) {
		throw new TypeError("Hex string must have even length");
	}

	const out = new Uint8Array(cleaned.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

function bufferSourceToBytes(value: unknown): Uint8Array {
	if (value instanceof Uint8Array) {
		if (
			typeof SharedArrayBuffer !== "undefined" &&
			value.buffer instanceof SharedArrayBuffer
		)
			return new Uint8Array(value);
		return value;
	}

	if (value instanceof ArrayBuffer) return new Uint8Array(value);

	if (ArrayBuffer.isView(value)) {
		const buffer = value.buffer;
		if (
			typeof SharedArrayBuffer !== "undefined" &&
			buffer instanceof SharedArrayBuffer
		) {
			const view = value as ArrayBufferView;
			const u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
			return new Uint8Array(u8);
		}
		return new Uint8Array(buffer, value.byteOffset, value.byteLength);
	}

	throw new TypeError("Expected a BufferSource (ArrayBuffer or typed array)");
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	if (
		typeof SharedArrayBuffer !== "undefined" &&
		bytes.buffer instanceof SharedArrayBuffer
	) {
		return Uint8Array.from(bytes).buffer;
	}
	return bytes.buffer as ArrayBuffer;
}

async function secretToKeyBytes(secret: unknown): Promise<Uint8Array> {
	const resolved = await secret;

	if (typeof resolved === "string") return hexStringToBytes(resolved);
	const bytes = bufferSourceToBytes(resolved);
	return new Uint8Array(bytes);
}

async function cryptoKeyToRawHex(
	impl: MlKemImpl,
	key: CryptoKey,
): Promise<string> {
	const format = key.type === "public" ? "raw-public" : "raw-seed";
	const raw = await impl.exportKey(format, key);
	return bytesToHexWithSpaces(bufferSourceToBytes(raw));
}

class MlKemWrapper implements IMlKem {
	constructor(
		private readonly impl: MlKemImpl,
		private readonly algorithm: { readonly name: string },
	) {}

	keypair(): KeyPair {
		const keyPairPromise = this.impl.generateKey(this.algorithm, true, [
			"encapsulateBits",
			"decapsulateBits",
		]);

		return {
			get: (key: "public_key" | "private_key") =>
				keyPairPromise.then((kp) =>
					key === "public_key" ? kp.publicKey : kp.privateKey,
				),
		};
	}

	encrypt(public_key: unknown): EncryptResult {
		const publicKeyPromise = Promise.resolve(public_key);
		const encPromise = publicKeyPromise.then((pk) =>
			this.impl.encapsulateBits(this.algorithm, pk as CryptoKey),
		);

		return {
			get: (key: "cyphertext" | "secret") => {
				if (key === "cyphertext") return encPromise.then((r) => r.ciphertext);
				if (key === "secret") return encPromise.then((r) => r.sharedKey);
				throw new Error(`Unknown encrypt result field: ${String(key)}`);
			},
		};
	}

	decrypt(cyphertext: unknown, private_key: unknown): Promise<unknown> {
		const ctPromise = Promise.resolve(cyphertext);
		const skPromise = Promise.resolve(private_key);

		return Promise.all([ctPromise, skPromise]).then(([ct, sk]) =>
			this.impl.decapsulateBits(
				this.algorithm,
				sk as CryptoKey,
				ct as BufferSource,
			),
		);
	}

	buffer_to_string(buffer: unknown): MaybePromise<string> {
		if (buffer && typeof (buffer as Promise<unknown>).then === "function") {
			return (buffer as Promise<unknown>).then((b) => this.buffer_to_string(b));
		}

		if (buffer instanceof CryptoKey) {
			return cryptoKeyToRawHex(this.impl, buffer);
		}

		return bytesToHexWithSpaces(bufferSourceToBytes(buffer));
	}

	async encryptMessage(message: string, secret: unknown): Promise<Uint8Array> {
		const secretBytes = await secretToKeyBytes(secret);
		const secretKeyBuffer = bytesToArrayBuffer(secretBytes);

		const key = await crypto.subtle.importKey(
			"raw",
			secretKeyBuffer,
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		);

		const iv = crypto.getRandomValues(new Uint8Array(12));
		const messageBytes = new TextEncoder().encode(message);
		const encryptedData = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			key,
			messageBytes,
		);

		const encryptedMessage = new Uint8Array(
			iv.length + encryptedData.byteLength,
		);
		encryptedMessage.set(iv, 0);
		encryptedMessage.set(new Uint8Array(encryptedData), iv.length);
		return encryptedMessage;
	}

	async decryptMessage(
		encryptedMessage: Uint8Array,
		secret: unknown,
	): Promise<string> {
		const secretBytes = await secretToKeyBytes(secret);
		const secretKeyBuffer = bytesToArrayBuffer(secretBytes);

		const iv = encryptedMessage.slice(0, 12);
		const encryptedData = encryptedMessage.slice(12);

		const key = await crypto.subtle.importKey(
			"raw",
			secretKeyBuffer,
			{ name: "AES-GCM" },
			false,
			["decrypt"],
		);

		const decryptedData = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			key,
			encryptedData,
		);
		return new TextDecoder().decode(decryptedData);
	}

	delete(): void {
		// Key material is zeroized on GC via mlkem-wasm finalization registry.
	}
}

export async function loadMlKem768(): Promise<IMlKem> {
	return new MlKemWrapper(mlkem768 as MlKemImpl, { name: "ML-KEM-768" });
}

export async function loadMlKem512(): Promise<IMlKem> {
	return new MlKemWrapper(mlkem512 as MlKemImpl, { name: "ML-KEM-512" });
}

export async function loadMlKem1024(): Promise<IMlKem> {
	return new MlKemWrapper(mlkem1024 as MlKemImpl, { name: "ML-KEM-1024" });
}

import type { FnDsaVariant, IFnDsa, KeyPair } from "./types.js";
import initFnDsa, {
	falcon_keygen,
	falcon_sign,
	falcon_verify,
} from "./vendor/fndsa/fndsa_rs.js";

let initPromise: Promise<unknown> | null = null;

function ensureInit(): Promise<unknown> {
	if (!initPromise) {
		initPromise = (async () => {
			const wasmUrl = new URL(
				"./vendor/fndsa/fndsa_rs_bg.wasm",
				import.meta.url,
			);
			const isNode = typeof process !== "undefined" && !!process.versions?.node;

			if (isNode) {
				const { readFile } = await import("node:fs/promises");
				const wasmBytes = await readFile(wasmUrl);
				return initFnDsa(wasmBytes);
			}

			return initFnDsa(wasmUrl);
		})();
	}
	return initPromise;
}

function normalizeVariant(variant: FnDsaVariant): 512 | 1024 {
	return variant === "falcon1024" ? 1024 : 512;
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

function fromHex(hex: string): Uint8Array {
	const cleaned = hex.trim().replace(/^0x/i, "").replace(/\s+/g, "");
	if (cleaned.length % 2 !== 0) {
		throw new TypeError("Hex input length must be even");
	}

	const out = new Uint8Array(cleaned.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

function asBytes(value: Uint8Array | ArrayBuffer | string): Uint8Array {
	if (typeof value === "string") return fromHex(value);
	if (value instanceof Uint8Array) return value;
	return new Uint8Array(value);
}

class FnDsaWrapper implements IFnDsa {
	constructor(private readonly variant: FnDsaVariant) {}

	keypair(): KeyPair {
		const pairPromise = (async () => {
			await ensureInit();
			const seed = crypto.getRandomValues(new Uint8Array(48));
			return falcon_keygen(normalizeVariant(this.variant), seed);
		})();

		return {
			get: (key: "public_key" | "private_key") =>
				pairPromise.then((pair) =>
					key === "public_key" ? pair.public_key : pair.private_key,
				),
		};
	}

	sign(
		message: Uint8Array | ArrayBuffer | string,
		private_key: unknown,
	): Promise<Uint8Array> {
		return Promise.all([ensureInit(), Promise.resolve(private_key)]).then(
			([_, sk]) => {
				const msg = asBytes(message as Uint8Array | ArrayBuffer | string);
				const key = asBytes(sk as Uint8Array | ArrayBuffer | string);
				const seed = crypto.getRandomValues(new Uint8Array(48));
				return falcon_sign(normalizeVariant(this.variant), key, msg, seed);
			},
		);
	}

	verify(
		signature: Uint8Array | ArrayBuffer | string,
		message: Uint8Array | ArrayBuffer | string,
		public_key: unknown,
	): Promise<boolean> {
		return Promise.all([ensureInit(), Promise.resolve(public_key)]).then(
			([_, pk]) => {
				const sig = asBytes(signature);
				const msg = asBytes(message);
				const key = asBytes(pk as Uint8Array | ArrayBuffer | string);
				return falcon_verify(normalizeVariant(this.variant), key, msg, sig);
			},
		);
	}

	buffer_to_string(value: Uint8Array | ArrayBuffer | string): string {
		if (typeof value === "string") return value;
		return toHex(asBytes(value));
	}
}

export async function loadFnDsa512(): Promise<IFnDsa> {
	await ensureInit();
	return new FnDsaWrapper("falcon512");
}

export async function loadFnDsa1024(): Promise<IFnDsa> {
	await ensureInit();
	return new FnDsaWrapper("falcon1024");
}

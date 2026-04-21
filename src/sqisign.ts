import {
	asBytes,
	readBytes,
	toHex,
	withStack,
	writeBytes,
} from "./signature-common.js";
import type { IFnDsa, KeyPair } from "./types.js";
import SqisignLvl1Module from "./vendor/sqisignlvl1.js";

type SqisignModule = {
	_sqisign_lvl1_public_key_bytes?: () => number;
	_sqisign_lvl1_private_key_bytes?: () => number;
	_sqisign_lvl1_signature_bytes?: () => number;
	_sqisign_lvl1_seed_bytes?: () => number;
	_sqisign_lvl1_keypair_seeded?: (
		pk: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl1_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl1_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
} & import("./signature-common.js").EmscriptenModule;

let sqisignLvl1Promise: Promise<SqisignModule> | null = null;

function getSqisignLvl1Module(): Promise<SqisignModule> {
	if (!sqisignLvl1Promise) {
		sqisignLvl1Promise = SqisignLvl1Module() as Promise<SqisignModule>;
	}
	return sqisignLvl1Promise;
}

async function ensureInit(): Promise<SqisignModule> {
	return getSqisignLvl1Module();
}

class SqisignWrapper implements IFnDsa {
	keypair(): KeyPair {
		const pairPromise = (async () => {
			const module = await ensureInit();
			const seed = crypto.getRandomValues(
				new Uint8Array(module._sqisign_lvl1_seed_bytes!()),
			);
			return withStack(module, (alloc) => {
				const pkPtr = alloc(module._sqisign_lvl1_public_key_bytes!());
				const skPtr = alloc(module._sqisign_lvl1_private_key_bytes!());
				const seedPtr = writeBytes(module, alloc, seed);
				const rc = module._sqisign_lvl1_keypair_seeded!(pkPtr, skPtr, seedPtr);
				if (rc !== 0) {
					throw new Error(`SQISign keypair failed with code ${rc}`);
				}
				return {
					public_key: readBytes(
						module,
						pkPtr,
						module._sqisign_lvl1_public_key_bytes!(),
					),
					private_key: readBytes(
						module,
						skPtr,
						module._sqisign_lvl1_private_key_bytes!(),
					),
				};
			});
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
			([module, sk]) => {
				const msg = asBytes(message as Uint8Array | ArrayBuffer | string);
				const key = asBytes(sk as Uint8Array | ArrayBuffer | string);
				const seed = crypto.getRandomValues(
					new Uint8Array(module._sqisign_lvl1_seed_bytes!()),
				);
				return withStack(module, (alloc) => {
					const sigPtr = alloc(module._sqisign_lvl1_signature_bytes!());
					const msgPtr = writeBytes(module, alloc, msg);
					const skPtr = writeBytes(module, alloc, key);
					const seedPtr = writeBytes(module, alloc, seed);
					const rc = module._sqisign_lvl1_sign_seeded!(
						sigPtr,
						msgPtr,
						msg.length,
						skPtr,
						seedPtr,
					);
					if (rc !== 0) {
						throw new Error(`SQISign sign failed with code ${rc}`);
					}
					return readBytes(
						module,
						sigPtr,
						module._sqisign_lvl1_signature_bytes!(),
					);
				});
			},
		);
	}

	verify(
		signature: Uint8Array | ArrayBuffer | string,
		message: Uint8Array | ArrayBuffer | string,
		public_key: unknown,
	): Promise<boolean> {
		return Promise.all([ensureInit(), Promise.resolve(public_key)]).then(
			([module, pk]) => {
				const sig = asBytes(signature);
				const msg = asBytes(message);
				const key = asBytes(pk as Uint8Array | ArrayBuffer | string);
				return withStack(module, (alloc) => {
					const sigPtr = writeBytes(module, alloc, sig);
					const msgPtr = writeBytes(module, alloc, msg);
					const pkPtr = writeBytes(module, alloc, key);
					return (
						module._sqisign_lvl1_verify!(
							sigPtr,
							sig.length,
							msgPtr,
							msg.length,
							pkPtr,
						) === 0
					);
				});
			},
		);
	}

	buffer_to_string(value: Uint8Array | ArrayBuffer | string): string {
		if (typeof value === "string") return value;
		return toHex(asBytes(value));
	}
}

/**
 * Load **SQIsign level 1** (reference C via Emscripten, mini-gmp, CTR-DRBG seeding from JS).
 *
 * **Performance:** reference key generation and signing are extremely CPU-intensive (often
 * minutes per operation). Prefer `sqisign-kat-lvl1` test vectors for fast verify-only checks in CI;
 * use `keypair` / `sign` only when you accept long runtimes.
 */
export async function loadSqisignLvl1(): Promise<IFnDsa> {
	await ensureInit();
	return new SqisignWrapper();
}

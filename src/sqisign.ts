import { asBytes, readBytes, toHex, withStack, writeBytes } from "./signature-common.js";
import type { IFnDsa, KeyPair, SqisignVariant } from "./types.js";
import SqisignLvl1Module from "./vendor/sqisignlvl1.js";
import SqisignLvl3Module from "./vendor/sqisignlvl3.js";
import SqisignLvl5Module from "./vendor/sqisignlvl5.js";

type SqisignModule = {
	_sqisign_lvl1_public_key_bytes?: () => number;
	_sqisign_lvl1_private_key_bytes?: () => number;
	_sqisign_lvl1_signature_bytes?: () => number;
	_sqisign_lvl1_seed_bytes?: () => number;
	_sqisign_lvl1_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
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
	_sqisign_lvl3_public_key_bytes?: () => number;
	_sqisign_lvl3_private_key_bytes?: () => number;
	_sqisign_lvl3_signature_bytes?: () => number;
	_sqisign_lvl3_seed_bytes?: () => number;
	_sqisign_lvl3_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
	_sqisign_lvl3_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl3_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
	_sqisign_lvl5_public_key_bytes?: () => number;
	_sqisign_lvl5_private_key_bytes?: () => number;
	_sqisign_lvl5_signature_bytes?: () => number;
	_sqisign_lvl5_seed_bytes?: () => number;
	_sqisign_lvl5_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
	_sqisign_lvl5_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl5_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
} & import("./signature-common.js").EmscriptenModule;

type SqisignApi = {
	getModule: () => Promise<SqisignModule>;
	publicKeyBytes: (module: SqisignModule) => number;
	privateKeyBytes: (module: SqisignModule) => number;
	signatureBytes: (module: SqisignModule) => number;
	seedBytes: (module: SqisignModule) => number;
	keypair: (module: SqisignModule, pk: number, sk: number, seed: number) => number;
	sign: (
		module: SqisignModule,
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	verify: (
		module: SqisignModule,
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
};

let sqisignLvl1Promise: Promise<SqisignModule> | null = null;
let sqisignLvl3Promise: Promise<SqisignModule> | null = null;
let sqisignLvl5Promise: Promise<SqisignModule> | null = null;

function getSqisignLvl1Module(): Promise<SqisignModule> {
	if (!sqisignLvl1Promise) {
		sqisignLvl1Promise = SqisignLvl1Module() as Promise<SqisignModule>;
	}
	return sqisignLvl1Promise;
}

function getSqisignLvl3Module(): Promise<SqisignModule> {
	if (!sqisignLvl3Promise) {
		sqisignLvl3Promise = SqisignLvl3Module() as Promise<SqisignModule>;
	}
	return sqisignLvl3Promise;
}

function getSqisignLvl5Module(): Promise<SqisignModule> {
	if (!sqisignLvl5Promise) {
		sqisignLvl5Promise = SqisignLvl5Module() as Promise<SqisignModule>;
	}
	return sqisignLvl5Promise;
}

function getApi(variant: SqisignVariant): SqisignApi {
	if (variant === "lvl5") {
		return {
			getModule: getSqisignLvl5Module,
			publicKeyBytes: (module) => module._sqisign_lvl5_public_key_bytes!(),
			privateKeyBytes: (module) => module._sqisign_lvl5_private_key_bytes!(),
			signatureBytes: (module) => module._sqisign_lvl5_signature_bytes!(),
			seedBytes: (module) => module._sqisign_lvl5_seed_bytes!(),
			keypair: (module, pk, sk, seed) =>
				module._sqisign_lvl5_keypair_seeded!(pk, sk, seed),
			sign: (module, sig, msg, msgLen, sk, seed) =>
				module._sqisign_lvl5_sign_seeded!(sig, msg, msgLen, sk, seed),
			verify: (module, sig, sigLen, msg, msgLen, pk) =>
				module._sqisign_lvl5_verify!(sig, sigLen, msg, msgLen, pk),
		};
	}
	if (variant === "lvl3") {
		return {
			getModule: getSqisignLvl3Module,
			publicKeyBytes: (module) => module._sqisign_lvl3_public_key_bytes!(),
			privateKeyBytes: (module) => module._sqisign_lvl3_private_key_bytes!(),
			signatureBytes: (module) => module._sqisign_lvl3_signature_bytes!(),
			seedBytes: (module) => module._sqisign_lvl3_seed_bytes!(),
			keypair: (module, pk, sk, seed) =>
				module._sqisign_lvl3_keypair_seeded!(pk, sk, seed),
			sign: (module, sig, msg, msgLen, sk, seed) =>
				module._sqisign_lvl3_sign_seeded!(sig, msg, msgLen, sk, seed),
			verify: (module, sig, sigLen, msg, msgLen, pk) =>
				module._sqisign_lvl3_verify!(sig, sigLen, msg, msgLen, pk),
		};
	}
	return {
		getModule: getSqisignLvl1Module,
		publicKeyBytes: (module) => module._sqisign_lvl1_public_key_bytes!(),
		privateKeyBytes: (module) => module._sqisign_lvl1_private_key_bytes!(),
		signatureBytes: (module) => module._sqisign_lvl1_signature_bytes!(),
		seedBytes: (module) => module._sqisign_lvl1_seed_bytes!(),
		keypair: (module, pk, sk, seed) => module._sqisign_lvl1_keypair_seeded!(pk, sk, seed),
		sign: (module, sig, msg, msgLen, sk, seed) =>
			module._sqisign_lvl1_sign_seeded!(sig, msg, msgLen, sk, seed),
		verify: (module, sig, sigLen, msg, msgLen, pk) =>
			module._sqisign_lvl1_verify!(sig, sigLen, msg, msgLen, pk),
	};
}

async function ensureInit(variant: SqisignVariant): Promise<SqisignModule> {
	return getApi(variant).getModule();
}

class SqisignWrapper implements IFnDsa {
	constructor(private readonly variant: SqisignVariant) {}

	keypair(): KeyPair {
		const pairPromise = (async () => {
			const api = getApi(this.variant);
			const module = await api.getModule();
			const seed = crypto.getRandomValues(new Uint8Array(api.seedBytes(module)));
			return withStack(module, (alloc) => {
				const pkPtr = alloc(api.publicKeyBytes(module));
				const skPtr = alloc(api.privateKeyBytes(module));
				const seedPtr = writeBytes(module, alloc, seed);
				const rc = api.keypair(module, pkPtr, skPtr, seedPtr);
				if (rc !== 0) {
					throw new Error(`SQISign ${this.variant} keypair failed with code ${rc}`);
				}
				return {
					public_key: readBytes(module, pkPtr, api.publicKeyBytes(module)),
					private_key: readBytes(module, skPtr, api.privateKeyBytes(module)),
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
		return Promise.all([ensureInit(this.variant), Promise.resolve(private_key)]).then(
			([module, sk]) => {
				const api = getApi(this.variant);
				const msg = asBytes(message as Uint8Array | ArrayBuffer | string);
				const key = asBytes(sk as Uint8Array | ArrayBuffer | string);
				const seed = crypto.getRandomValues(new Uint8Array(api.seedBytes(module)));
				return withStack(module, (alloc) => {
					const sigPtr = alloc(api.signatureBytes(module));
					const msgPtr = writeBytes(module, alloc, msg);
					const skPtr = writeBytes(module, alloc, key);
					const seedPtr = writeBytes(module, alloc, seed);
					const rc = api.sign(module, sigPtr, msgPtr, msg.length, skPtr, seedPtr);
					if (rc !== 0) {
						throw new Error(`SQISign ${this.variant} sign failed with code ${rc}`);
					}
					return readBytes(module, sigPtr, api.signatureBytes(module));
				});
			},
		);
	}

	verify(
		signature: Uint8Array | ArrayBuffer | string,
		message: Uint8Array | ArrayBuffer | string,
		public_key: unknown,
	): Promise<boolean> {
		return Promise.all([ensureInit(this.variant), Promise.resolve(public_key)]).then(
			([module, pk]) => {
				const api = getApi(this.variant);
				const sig = asBytes(signature);
				const msg = asBytes(message);
				const key = asBytes(pk as Uint8Array | ArrayBuffer | string);
				return withStack(module, (alloc) => {
					const sigPtr = writeBytes(module, alloc, sig);
					const msgPtr = writeBytes(module, alloc, msg);
					const pkPtr = writeBytes(module, alloc, key);
					return (
						api.verify(module, sigPtr, sig.length, msgPtr, msg.length, pkPtr) === 0
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

export async function loadSqisignLvl1(): Promise<IFnDsa> {
	await ensureInit("lvl1");
	return new SqisignWrapper("lvl1");
}

export async function loadSqisignLvl3(): Promise<IFnDsa> {
	await ensureInit("lvl3");
	return new SqisignWrapper("lvl3");
}

export async function loadSqisignLvl5(): Promise<IFnDsa> {
	await ensureInit("lvl5");
	return new SqisignWrapper("lvl5");
}

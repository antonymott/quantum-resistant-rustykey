// @ts-expect-error generated Emscripten module
import Falcon1024Module from "./vendor/falcon1024.js";
// @ts-expect-error generated Emscripten module
import Falcon512Module from "./vendor/falcon512.js";
import { asBytes, readBytes, toHex, withStack, writeBytes } from "./signature-common.js";
import type { FnDsaVariant, IFnDsa, KeyPair } from "./types.js";

type FalconModule = {
	_falcon512_public_key_bytes?: () => number;
	_falcon512_private_key_bytes?: () => number;
	_falcon512_signature_bytes?: () => number;
	_falcon512_seed_bytes?: () => number;
	_falcon512_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
	_falcon512_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_falcon512_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
	_falcon1024_public_key_bytes?: () => number;
	_falcon1024_private_key_bytes?: () => number;
	_falcon1024_signature_bytes?: () => number;
	_falcon1024_seed_bytes?: () => number;
	_falcon1024_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
	_falcon1024_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_falcon1024_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
} & import("./signature-common.js").EmscriptenModule;

type FalconApi = {
	getModule: () => Promise<FalconModule>;
	publicKeyBytes: (module: FalconModule) => number;
	privateKeyBytes: (module: FalconModule) => number;
	signatureBytes: (module: FalconModule) => number;
	seedBytes: (module: FalconModule) => number;
	keypair: (module: FalconModule, pk: number, sk: number, seed: number) => number;
	sign: (
		module: FalconModule,
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	verify: (
		module: FalconModule,
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
};

let falcon512Promise: Promise<FalconModule> | null = null;
let falcon1024Promise: Promise<FalconModule> | null = null;

function getFalcon512Module() {
	if (!falcon512Promise) {
		falcon512Promise = Falcon512Module() as Promise<FalconModule>;
	}
	return falcon512Promise;
}

function getFalcon1024Module() {
	if (!falcon1024Promise) {
		falcon1024Promise = Falcon1024Module() as Promise<FalconModule>;
	}
	return falcon1024Promise;
}

function getApi(variant: FnDsaVariant): FalconApi {
	if (variant === "falcon1024") {
		return {
			getModule: getFalcon1024Module,
			publicKeyBytes: (module) => module._falcon1024_public_key_bytes!(),
			privateKeyBytes: (module) => module._falcon1024_private_key_bytes!(),
			signatureBytes: (module) => module._falcon1024_signature_bytes!(),
			seedBytes: (module) => module._falcon1024_seed_bytes!(),
			keypair: (module, pk, sk, seed) =>
				module._falcon1024_keypair_seeded!(pk, sk, seed),
			sign: (module, sig, msg, msgLen, sk, seed) =>
				module._falcon1024_sign_seeded!(sig, msg, msgLen, sk, seed),
			verify: (module, sig, sigLen, msg, msgLen, pk) =>
				module._falcon1024_verify!(sig, sigLen, msg, msgLen, pk),
		};
	}

	return {
		getModule: getFalcon512Module,
		publicKeyBytes: (module) => module._falcon512_public_key_bytes!(),
		privateKeyBytes: (module) => module._falcon512_private_key_bytes!(),
		signatureBytes: (module) => module._falcon512_signature_bytes!(),
		seedBytes: (module) => module._falcon512_seed_bytes!(),
		keypair: (module, pk, sk, seed) => module._falcon512_keypair_seeded!(pk, sk, seed),
		sign: (module, sig, msg, msgLen, sk, seed) =>
			module._falcon512_sign_seeded!(sig, msg, msgLen, sk, seed),
		verify: (module, sig, sigLen, msg, msgLen, pk) =>
			module._falcon512_verify!(sig, sigLen, msg, msgLen, pk),
	};
}

async function ensureInit(variant: FnDsaVariant): Promise<FalconModule> {
	return getApi(variant).getModule();
}

class FnDsaWrapper implements IFnDsa {
	constructor(private readonly variant: FnDsaVariant) {}

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
					throw new Error(`Falcon keypair failed with code ${rc}`);
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
						throw new Error(`Falcon sign failed with code ${rc}`);
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
					return api.verify(
						module,
						sigPtr,
						sig.length,
						msgPtr,
						msg.length,
						pkPtr,
					) === 0;
				});
			},
		);
	}

	buffer_to_string(value: Uint8Array | ArrayBuffer | string): string {
		if (typeof value === "string") return value;
		return toHex(asBytes(value));
	}
}

export async function loadFnDsa512(): Promise<IFnDsa> {
	await ensureInit("falcon512");
	return new FnDsaWrapper("falcon512");
}

export async function loadFnDsa1024(): Promise<IFnDsa> {
	await ensureInit("falcon1024");
	return new FnDsaWrapper("falcon1024");
}

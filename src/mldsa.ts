// @ts-expect-error generated Emscripten module
import MlDsa65Module from "./vendor/mldsa65.js";
// @ts-expect-error generated Emscripten module
import MlDsa87Module from "./vendor/mldsa87.js";
import { asBytes, readBytes, toHex, withStack, writeBytes } from "./signature-common.js";
import type { IFnDsa, MlDsaVariant } from "./types.js";

type MlDsaModule = {
	_mldsa65_public_key_bytes?: () => number;
	_mldsa65_private_key_bytes?: () => number;
	_mldsa65_signature_bytes?: () => number;
	_mldsa65_seed_bytes?: () => number;
	_mldsa65_random_bytes?: () => number;
	_mldsa65_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
	_mldsa65_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		rnd: number,
	) => number;
	_mldsa65_verify_signature?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
	_mldsa87_public_key_bytes?: () => number;
	_mldsa87_private_key_bytes?: () => number;
	_mldsa87_signature_bytes?: () => number;
	_mldsa87_seed_bytes?: () => number;
	_mldsa87_random_bytes?: () => number;
	_mldsa87_keypair_seeded?: (pk: number, sk: number, seed: number) => number;
	_mldsa87_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		rnd: number,
	) => number;
	_mldsa87_verify_signature?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
} & import("./signature-common.js").EmscriptenModule;

type MlDsaApi = {
	getModule: () => Promise<MlDsaModule>;
	publicKeyBytes: (module: MlDsaModule) => number;
	privateKeyBytes: (module: MlDsaModule) => number;
	signatureBytes: (module: MlDsaModule) => number;
	seedBytes: (module: MlDsaModule) => number;
	randomBytes: (module: MlDsaModule) => number;
	keypair: (module: MlDsaModule, pk: number, sk: number, seed: number) => number;
	sign: (
		module: MlDsaModule,
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		rnd: number,
	) => number;
	verify: (
		module: MlDsaModule,
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
};

let mldsa65Promise: Promise<MlDsaModule> | null = null;
let mldsa87Promise: Promise<MlDsaModule> | null = null;

function getMlDsa65Module() {
	if (!mldsa65Promise) {
		mldsa65Promise = MlDsa65Module() as Promise<MlDsaModule>;
	}
	return mldsa65Promise;
}

function getMlDsa87Module() {
	if (!mldsa87Promise) {
		mldsa87Promise = MlDsa87Module() as Promise<MlDsaModule>;
	}
	return mldsa87Promise;
}

function getApi(variant: MlDsaVariant): MlDsaApi {
	if (variant === "dilithium5") {
		return {
			getModule: getMlDsa87Module,
			publicKeyBytes: (module) => module._mldsa87_public_key_bytes!(),
			privateKeyBytes: (module) => module._mldsa87_private_key_bytes!(),
			signatureBytes: (module) => module._mldsa87_signature_bytes!(),
			seedBytes: (module) => module._mldsa87_seed_bytes!(),
			randomBytes: (module) => module._mldsa87_random_bytes!(),
			keypair: (module, pk, sk, seed) => module._mldsa87_keypair_seeded!(pk, sk, seed),
			sign: (module, sig, msg, msgLen, sk, rnd) =>
				module._mldsa87_sign_seeded!(sig, msg, msgLen, sk, rnd),
			verify: (module, sig, sigLen, msg, msgLen, pk) =>
				module._mldsa87_verify_signature!(sig, sigLen, msg, msgLen, pk),
		};
	}

	return {
		getModule: getMlDsa65Module,
		publicKeyBytes: (module) => module._mldsa65_public_key_bytes!(),
		privateKeyBytes: (module) => module._mldsa65_private_key_bytes!(),
		signatureBytes: (module) => module._mldsa65_signature_bytes!(),
		seedBytes: (module) => module._mldsa65_seed_bytes!(),
		randomBytes: (module) => module._mldsa65_random_bytes!(),
		keypair: (module, pk, sk, seed) => module._mldsa65_keypair_seeded!(pk, sk, seed),
		sign: (module, sig, msg, msgLen, sk, rnd) =>
			module._mldsa65_sign_seeded!(sig, msg, msgLen, sk, rnd),
		verify: (module, sig, sigLen, msg, msgLen, pk) =>
			module._mldsa65_verify_signature!(sig, sigLen, msg, msgLen, pk),
	};
}

async function ensureInit(variant: MlDsaVariant): Promise<MlDsaModule> {
	return getApi(variant).getModule();
}

class MlDsaWrapper implements IFnDsa {
	constructor(private readonly variant: MlDsaVariant) {}

	keypair() {
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
					throw new Error(`ML-DSA keypair failed with code ${rc}`);
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
				const msg = asBytes(message);
				const key = asBytes(sk as Uint8Array | ArrayBuffer | string);
				const rnd = crypto.getRandomValues(new Uint8Array(api.randomBytes(module)));
				return withStack(module, (alloc) => {
					const sigPtr = alloc(api.signatureBytes(module));
					const msgPtr = writeBytes(module, alloc, msg);
					const skPtr = writeBytes(module, alloc, key);
					const rndPtr = writeBytes(module, alloc, rnd);
					const rc = api.sign(module, sigPtr, msgPtr, msg.length, skPtr, rndPtr);
					if (rc !== 0) {
						throw new Error(`ML-DSA sign failed with code ${rc}`);
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

export async function loadMlDsa3(): Promise<IFnDsa> {
	await ensureInit("dilithium3");
	return new MlDsaWrapper("dilithium3");
}

export async function loadMlDsa5(): Promise<IFnDsa> {
	await ensureInit("dilithium5");
	return new MlDsaWrapper("dilithium5");
}

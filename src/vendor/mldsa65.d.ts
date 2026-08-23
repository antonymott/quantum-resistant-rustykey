import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type MlDsa65Wasm = EmscriptenRuntime & {
	_mldsa65_public_key_bytes(): number;
	_mldsa65_private_key_bytes(): number;
	_mldsa65_signature_bytes(): number;
	_mldsa65_seed_bytes(): number;
	_mldsa65_random_bytes(): number;
	_mldsa65_keypair_seeded(pk: number, sk: number, seed: number): number;
	_mldsa65_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		rnd: number,
	): number;
	_mldsa65_verify_signature(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<MlDsa65Wasm>;
export default init;

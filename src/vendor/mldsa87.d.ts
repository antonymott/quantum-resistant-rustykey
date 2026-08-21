import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type MlDsa87Wasm = EmscriptenRuntime & {
	_mldsa87_public_key_bytes(): number;
	_mldsa87_private_key_bytes(): number;
	_mldsa87_signature_bytes(): number;
	_mldsa87_seed_bytes(): number;
	_mldsa87_random_bytes(): number;
	_mldsa87_keypair_seeded(pk: number, sk: number, seed: number): number;
	_mldsa87_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		rnd: number,
	): number;
	_mldsa87_verify_signature(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<MlDsa87Wasm>;
export default init;

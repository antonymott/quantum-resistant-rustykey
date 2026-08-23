import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type SqisignLvl5Wasm = EmscriptenRuntime & {
	_sqisign_lvl5_public_key_bytes(): number;
	_sqisign_lvl5_private_key_bytes(): number;
	_sqisign_lvl5_signature_bytes(): number;
	_sqisign_lvl5_seed_bytes(): number;
	_sqisign_lvl5_keypair_seeded(pk: number, sk: number, seed: number): number;
	_sqisign_lvl5_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	): number;
	_sqisign_lvl5_verify(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<SqisignLvl5Wasm>;
export default init;

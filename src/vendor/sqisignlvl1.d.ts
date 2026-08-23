import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type SqisignLvl1Wasm = EmscriptenRuntime & {
	_sqisign_lvl1_public_key_bytes(): number;
	_sqisign_lvl1_private_key_bytes(): number;
	_sqisign_lvl1_signature_bytes(): number;
	_sqisign_lvl1_seed_bytes(): number;
	_sqisign_lvl1_keypair_seeded(pk: number, sk: number, seed: number): number;
	_sqisign_lvl1_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	): number;
	_sqisign_lvl1_verify(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<SqisignLvl1Wasm>;
export default init;

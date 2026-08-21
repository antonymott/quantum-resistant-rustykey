import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type SqisignLvl3Wasm = EmscriptenRuntime & {
	_sqisign_lvl3_public_key_bytes(): number;
	_sqisign_lvl3_private_key_bytes(): number;
	_sqisign_lvl3_signature_bytes(): number;
	_sqisign_lvl3_seed_bytes(): number;
	_sqisign_lvl3_keypair_seeded(pk: number, sk: number, seed: number): number;
	_sqisign_lvl3_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	): number;
	_sqisign_lvl3_verify(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<SqisignLvl3Wasm>;
export default init;

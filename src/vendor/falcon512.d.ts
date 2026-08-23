import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type Falcon512Wasm = EmscriptenRuntime & {
	_falcon512_public_key_bytes(): number;
	_falcon512_private_key_bytes(): number;
	_falcon512_signature_bytes(): number;
	_falcon512_seed_bytes(): number;
	_falcon512_keypair_seeded(pk: number, sk: number, seed: number): number;
	_falcon512_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	): number;
	_falcon512_verify(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<Falcon512Wasm>;
export default init;

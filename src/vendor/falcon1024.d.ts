import type {
	EmscriptenModuleFactory,
	EmscriptenRuntime,
} from "./emscripten-runtime.js";

export type Falcon1024Wasm = EmscriptenRuntime & {
	_falcon1024_public_key_bytes(): number;
	_falcon1024_private_key_bytes(): number;
	_falcon1024_signature_bytes(): number;
	_falcon1024_seed_bytes(): number;
	_falcon1024_keypair_seeded(pk: number, sk: number, seed: number): number;
	_falcon1024_sign_seeded(
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	): number;
	_falcon1024_verify(
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	): number;
};

declare const init: EmscriptenModuleFactory<Falcon1024Wasm>;
export default init;

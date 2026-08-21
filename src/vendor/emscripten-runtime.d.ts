/**
 * Shared Emscripten runtime surface used by signature WASM modules.
 * Concrete modules add their `_…` exports in per-file `.d.ts` stubs.
 */
export type EmscriptenRuntime = {
	HEAPU8: Uint8Array;
	getValue(ptr: number, type: string): number;
	setValue(ptr: number, value: number, type: string): void;
	stackSave(): number;
	stackAlloc(size: number): number;
	stackRestore(stack: number): void;
};

export type EmscriptenModuleFactory<T extends EmscriptenRuntime> = (
	moduleArg?: Partial<EmscriptenRuntime>,
) => Promise<T>;

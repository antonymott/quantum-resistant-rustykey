import type { BytesLike } from "./types.js";

export type EmscriptenModule = {
	HEAPU8: Uint8Array;
	stackSave(): number;
	stackAlloc(size: number): number;
	stackRestore(stack: number): void;
};

export function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

export function fromHex(hex: string): Uint8Array {
	const cleaned = hex.trim().replace(/^0x/i, "").replace(/\s+/g, "");
	if (cleaned.length % 2 !== 0) {
		throw new TypeError("Hex input length must be even");
	}

	const out = new Uint8Array(cleaned.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

export function asBytes(value: BytesLike): Uint8Array {
	if (typeof value === "string") return fromHex(value);
	if (value instanceof Uint8Array) return value;
	return new Uint8Array(value);
}

export function withStack<T>(
	module: EmscriptenModule,
	run: (alloc: (size: number) => number) => T,
): T {
	const stack = module.stackSave();
	const regions: Array<{ ptr: number; length: number }> = [];
	try {
		return run((size) => {
			const ptr = module.stackAlloc(size);
			regions.push({ ptr, length: size });
			return ptr;
		});
	} finally {
		zeroizeStackAllocations(module, stack, regions);
		module.stackRestore(stack);
	}
}

/** Wipe JS-owned ephemeral secrets. Do not use on caller-owned key buffers. */
export function zeroizeBytes(bytes: Uint8Array): void {
	bytes.fill(0);
}

function zeroizeStackAllocations(
	module: EmscriptenModule,
	savedStack: number,
	regions: Array<{ ptr: number; length: number }>,
): void {
	const heap = module.HEAPU8;
	for (const { ptr, length } of regions) {
		zeroizeHeapRange(heap, ptr, ptr + length);
	}
	// Emscripten stack grows down. Cover alignment padding and any C frames
	// that have not restored STACKTOP yet.
	const now = module.stackSave();
	const lo = now < savedStack ? now : savedStack;
	const hi = now < savedStack ? savedStack : now;
	zeroizeHeapRange(heap, lo, hi);
}

function zeroizeHeapRange(heap: Uint8Array, start: number, end: number): void {
	const lo = start < 0 ? 0 : start;
	const hi = end > heap.length ? heap.length : end;
	if (hi > lo) heap.fill(0, lo, hi);
}

export function writeBytes(
	module: EmscriptenModule,
	alloc: (size: number) => number,
	bytes: Uint8Array,
): number {
	const ptr = alloc(bytes.length);
	module.HEAPU8.set(bytes, ptr);
	return ptr;
}

export function readBytes(
	module: EmscriptenModule,
	ptr: number,
	length: number,
): Uint8Array {
	return new Uint8Array(module.HEAPU8.slice(ptr, ptr + length));
}

export function wasmExport<T>(fn: (() => T) | undefined): T {
	if (fn === undefined) {
		throw new Error("WASM export is not available");
	}
	return fn();
}

export function wasmExportWithArgs<TArgs extends unknown[], TResult>(
	fn: ((...args: TArgs) => TResult) | undefined,
	...args: TArgs
): TResult {
	if (fn === undefined) {
		throw new Error("WASM export is not available");
	}
	return fn(...args);
}

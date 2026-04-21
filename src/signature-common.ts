export type EmscriptenModule = {
	HEAPU8: Uint8Array;
	stackSave(): number;
	stackAlloc(size: number): number;
	stackRestore(stack: number): void;
	[name: string]: unknown;
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

export function asBytes(value: Uint8Array | ArrayBuffer | string): Uint8Array {
	if (typeof value === "string") return fromHex(value);
	if (value instanceof Uint8Array) return value;
	return new Uint8Array(value);
}

export function withStack<T>(
	module: EmscriptenModule,
	run: (alloc: (size: number) => number) => T,
): T {
	const stack = module.stackSave();
	try {
		return run((size) => module.stackAlloc(size));
	} finally {
		module.stackRestore(stack);
	}
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

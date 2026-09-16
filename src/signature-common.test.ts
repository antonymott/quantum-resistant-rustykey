import { describe, expect, it } from "vitest";
import {
	type EmscriptenModule,
	withStack,
	writeBytes,
	zeroizeBytes,
} from "./signature-common";

function createMockModule(heapSize = 8192): EmscriptenModule {
	const HEAPU8 = new Uint8Array(heapSize);
	let sp = heapSize;
	return {
		HEAPU8,
		stackSave(): number {
			return sp;
		},
		stackAlloc(size: number): number {
			sp -= size;
			if (sp < 0) throw new Error("stack overflow");
			return sp;
		},
		stackRestore(stack: number): void {
			sp = stack;
		},
	};
}

function countByteSequence(haystack: Uint8Array, needle: Uint8Array): number {
	if (needle.length === 0 || needle.length > haystack.length) return 0;
	let n = 0;
	for (let i = 0; i <= haystack.length - needle.length; i++) {
		let match = true;
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) {
				match = false;
				break;
			}
		}
		if (match) n++;
	}
	return n;
}

describe("withStack zeroization", () => {
	it("wipes JS stack copies after a successful callback", () => {
		const module = createMockModule();
		const secret = new Uint8Array([
			0x11, 0x22, 0x33, 0x44, 0xaa, 0xbb, 0xcc, 0xdd,
		]);
		const saved = module.stackSave();

		const ptr = withStack(module, (alloc) => writeBytes(module, alloc, secret));

		expect(ptr).toBeGreaterThanOrEqual(0);
		expect(module.stackSave()).toBe(saved);
		expect(countByteSequence(module.HEAPU8, secret)).toBe(0);
	});

	it("wipes JS stack copies when the callback throws", () => {
		const module = createMockModule();
		const secret = new Uint8Array([
			0xde, 0xad, 0xbe, 0xef, 0x01, 0x23, 0x45, 0x67,
		]);

		expect(() => {
			withStack(module, (alloc) => {
				writeBytes(module, alloc, secret);
				throw new Error("sign failed");
			});
		}).toThrow("sign failed");

		expect(countByteSequence(module.HEAPU8, secret)).toBe(0);
	});

	it("does not wipe bytes outside the used stack window", () => {
		const module = createMockModule();
		const keep = new Uint8Array([
			0x99, 0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22,
		]);
		module.HEAPU8.set(keep, 0);
		const secret = new Uint8Array([
			0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
		]);

		withStack(module, (alloc) => {
			writeBytes(module, alloc, secret);
		});

		expect(module.HEAPU8.slice(0, keep.length)).toEqual(keep);
		expect(countByteSequence(module.HEAPU8, secret)).toBe(0);
	});
});

describe("zeroizeBytes", () => {
	it("overwrites a JS-owned buffer and does not allocate a copy", () => {
		const seed = new Uint8Array([1, 2, 3, 4]);
		zeroizeBytes(seed);
		expect(seed).toEqual(new Uint8Array(4));
	});
});

import { describe, expect, it } from "vitest";
import { withStack, writeBytes } from "./signature-common";
import { sqisignLvl1ModuleForTests } from "./sqisign";

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

describe("SQIsign L1 wasm linear-memory residue", () => {
	it("wipes JS stack copies on the live module when the callback throws", async () => {
		const module = await sqisignLvl1ModuleForTests();
		const marker = crypto.getRandomValues(new Uint8Array(64));

		expect(() => {
			withStack(module, (alloc) => {
				writeBytes(module, alloc, marker);
				throw new Error("forced-stack-wipe");
			});
		}).toThrow("forced-stack-wipe");

		expect(countByteSequence(module.HEAPU8, marker)).toBe(0);
	});

	it("wipes JS stack copies on the live module after a successful callback", async () => {
		const module = await sqisignLvl1ModuleForTests();
		const marker = crypto.getRandomValues(new Uint8Array(64));

		withStack(module, (alloc) => {
			writeBytes(module, alloc, marker);
		});

		expect(countByteSequence(module.HEAPU8, marker)).toBe(0);
	});
});

import { describe, expect, it } from "vitest";
import { requireOpfsSkBytes } from "./bytes";
import { unwrapPrivateKey, wrapPrivateKey } from "./wrap";

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

describe("OPFS sk wrap", () => {
	it("round-trips a private-key buffer and does not leave plaintext in the blob", async () => {
		const sk = crypto.getRandomValues(new Uint8Array(64));
		const prf = crypto.getRandomValues(new Uint8Array(32));
		const salt = crypto.getRandomValues(new Uint8Array(32));
		const skBefore = new Uint8Array(sk);

		const sealed = await wrapPrivateKey(sk, prf, salt);
		expect(sk).toEqual(skBefore);
		expect(countByteSequence(sealed, sk)).toBe(0);

		const opened = await unwrapPrivateKey(sealed, prf, salt);
		expect(opened).toEqual(sk);
	});

	it("rejects a JS string as key material", () => {
		expect(() => requireOpfsSkBytes("deadbeef", "private_key")).toThrow(
			/must not be a JavaScript string/,
		);
	});

	it("fails open when the PRF output does not match", async () => {
		const sk = crypto.getRandomValues(new Uint8Array(48));
		const prf = crypto.getRandomValues(new Uint8Array(32));
		const salt = crypto.getRandomValues(new Uint8Array(32));
		const sealed = await wrapPrivateKey(sk, prf, salt);
		const wrong = crypto.getRandomValues(new Uint8Array(32));
		await expect(unwrapPrivateKey(sealed, wrong, salt)).rejects.toThrow();
	});
});

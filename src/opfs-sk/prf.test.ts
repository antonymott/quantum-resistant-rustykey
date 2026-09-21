import { describe, expect, it } from "vitest";
import {
	opfsSkPrfMaterialFromCeremony,
	opfsSkPrfOutputFromExtensionResults,
} from "./prf";

describe("opfsSkPrfOutputFromExtensionResults", () => {
	it("copies prf.results.first from client extension results", () => {
		const first = new Uint8Array([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
		]);
		const out = opfsSkPrfOutputFromExtensionResults({
			prf: { results: { first } },
		});
		expect(out).toEqual(first);
		first[0] = 99;
		expect(out[0]).toBe(1);
	});

	it("decodes base64url PRF output from JSON WebAuthn results", () => {
		const first = new Uint8Array([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
		]);
		const b64 = Buffer.from(first).toString("base64url");
		expect(
			opfsSkPrfOutputFromExtensionResults({ prf: { results: { first: b64 } } }),
		).toEqual(first);
	});

	it("builds wallet PRF material from extension results", () => {
		const first = crypto.getRandomValues(new Uint8Array(32));
		const salt = crypto.getRandomValues(new Uint8Array(32));
		const prf = opfsSkPrfMaterialFromCeremony({
			extensionResults: { prf: { results: { first } } },
			salt,
			userVerified: true,
		});
		expect(prf.prfOutput).toEqual(first);
		expect(prf.salt).toEqual(salt);
	});

	it("errors when PRF was not negotiated", () => {
		expect(() => opfsSkPrfOutputFromExtensionResults({})).toThrow(/PRF/);
	});
});

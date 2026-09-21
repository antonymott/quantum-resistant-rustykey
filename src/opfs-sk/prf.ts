import { requireOpfsSkBytes } from "./bytes.js";
import type { OpfsSkPrfMaterial } from "./lifecycle.js";

function base64UrlToBytes(value: string): Uint8Array {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const pad =
		padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
	const binary = atob(padded + pad);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		out[i] = binary.charCodeAt(i);
	}
	if (out.byteLength === 0) {
		throw new TypeError("prf.results.first base64url decoded empty");
	}
	return out;
}

/**
 * Read `prf.results.first` from `credential.getClientExtensionResults()`.
 * PRF must have been requested at the **first** registration; existing
 * credentials cannot gain the extension later.
 */
export function opfsSkPrfOutputFromExtensionResults(
	extensionResults: unknown,
): Uint8Array {
	if (extensionResults === null || typeof extensionResults !== "object") {
		throw new Error(
			"WebAuthn PRF extension results missing — request extensions: { prf: {} } at first registration",
		);
	}
	const prf = (extensionResults as { prf?: { results?: { first?: unknown } } })
		.prf;
	const first = prf?.results?.first;
	if (first === undefined || first === null) {
		throw new Error(
			"WebAuthn PRF eval.results.first is missing — request extensions.prf at first registration; existing credentials cannot gain PRF later",
		);
	}
	if (typeof first === "string") {
		return base64UrlToBytes(first);
	}
	if (first instanceof ArrayBuffer) {
		return new Uint8Array(first);
	}
	if (ArrayBuffer.isView(first)) {
		const view = first as ArrayBufferView;
		const copy = new Uint8Array(view.byteLength);
		copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
		return copy;
	}
	return requireOpfsSkBytes(first, "prf.results.first");
}

/**
 * Build wallet PRF material after a WebAuthn ceremony that requested
 * `userVerification: "required"`. create() uses `prf: {}`; get() uses `prf.eval`.
 */
export function opfsSkPrfMaterialFromCeremony(input: {
	extensionResults: unknown;
	salt: Uint8Array;
	userVerified: boolean;
}): OpfsSkPrfMaterial {
	if (input.userVerified !== true) {
		throw new Error(
			"OPFS encrypted-sk wallet requires userVerification: required (uv=1)",
		);
	}
	return {
		prfOutput: opfsSkPrfOutputFromExtensionResults(input.extensionResults),
		salt: requireOpfsSkBytes(input.salt, "salt"),
		userVerified: true,
	};
}

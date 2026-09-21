import { zeroizeBytes } from "../signature-common.js";

/** Reject JS strings — they cannot be zeroized. */
export function requireOpfsSkBytes(
	value: unknown,
	label: string,
	options?: { allowEmpty?: boolean },
): Uint8Array {
	if (typeof value === "string") {
		throw new TypeError(
			`${label} must not be a JavaScript string; pass a Uint8Array`,
		);
	}
	if (!(value instanceof Uint8Array)) {
		throw new TypeError(`${label} must be a Uint8Array`);
	}
	if (!options?.allowEmpty && value.byteLength === 0) {
		throw new TypeError(`${label} must be non-empty`);
	}
	return value;
}

export function copyStandaloneBytes(bytes: Uint8Array): Uint8Array {
	const out = new Uint8Array(bytes.byteLength);
	out.set(bytes);
	return out;
}

/** Copy into a standalone `ArrayBuffer` for WebCrypto / OPFS / transfer. */
export function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return copyStandaloneBytes(bytes).buffer as ArrayBuffer;
}

export function wipeBytes(bytes: Uint8Array | undefined): void {
	if (bytes) zeroizeBytes(bytes);
}

export function assertOpfsSkSlot(slot: string): string {
	if (!/^[A-Za-z0-9._-]{1,64}$/.test(slot)) {
		throw new Error("OPFS sk slot must match [A-Za-z0-9._-]{1,64}");
	}
	return slot;
}

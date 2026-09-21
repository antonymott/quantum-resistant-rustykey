import { zeroizeBytes } from "../signature-common.js";
import type { IFnDsa } from "../types.js";
import {
	loadOpfsSkScheme,
	type OpfsSkAlgorithm,
	opfsSkStorageId,
} from "./algorithms.js";
import { OPFS_SK_SLOT_SD_BUNDLE } from "./browser-gate.js";
import { assertOpfsSkSlot, requireOpfsSkBytes, wipeBytes } from "./bytes.js";
import type { OpfsSkStore } from "./store.js";
import { unwrapPrivateKey, wrapPrivateKey } from "./wrap.js";

export type OpfsSkPrfMaterial = {
	prfOutput: Uint8Array;
	salt: Uint8Array;
	/** Must be true — WebAuthn `userVerification: "required"` succeeded. */
	userVerified: true;
};

export function assertOpfsSkUserVerified(
	prf: OpfsSkPrfMaterial,
): OpfsSkPrfMaterial {
	if (prf.userVerified !== true) {
		throw new Error(
			"OPFS encrypted-sk wallet requires userVerification: required (uv=1)",
		);
	}
	requireOpfsSkBytes(prf.prfOutput, "prfOutput");
	requireOpfsSkBytes(prf.salt, "salt");
	return prf;
}

async function asKeyBytes(value: unknown, label: string): Promise<Uint8Array> {
	const resolved = await value;
	return requireOpfsSkBytes(resolved, label);
}

/** Throwaway keygen so leftover HEAPU8 is more likely mock material, not the stored sk. */
async function polluteWithMockKeygen(scheme: IFnDsa): Promise<void> {
	const kp = scheme.keypair();
	const mockSk = await asKeyBytes(kp.get("private_key"), "mock private_key");
	zeroizeBytes(mockSk);
}

/** Throwaway keygen+sign; never written to OPFS. */
async function polluteWithMockSign(scheme: IFnDsa): Promise<void> {
	const kp = scheme.keypair();
	const mockSk = await asKeyBytes(kp.get("private_key"), "mock private_key");
	const msg = crypto.getRandomValues(new Uint8Array(32));
	try {
		const sig = await scheme.sign(msg, mockSk);
		zeroizeBytes(sig);
	} finally {
		zeroizeBytes(mockSk);
		zeroizeBytes(msg);
	}
}

async function runMockBestEffort(run: () => Promise<void>): Promise<void> {
	try {
		await run();
	} catch {
		// Remnant pollution only — must not fail a completed keygen/sign.
	}
}

export async function sealedKeygen(
	store: OpfsSkStore,
	algorithm: OpfsSkAlgorithm,
	prf: OpfsSkPrfMaterial,
	slot = OPFS_SK_SLOT_SD_BUNDLE,
): Promise<{ public_key: Uint8Array }> {
	assertOpfsSkUserVerified(prf);
	const safeSlot = assertOpfsSkSlot(slot);
	const storageId = opfsSkStorageId(algorithm);
	const scheme = await loadOpfsSkScheme(algorithm);
	const kp = scheme.keypair();
	const public_key = await asKeyBytes(kp.get("public_key"), "public_key");
	const private_key = await asKeyBytes(kp.get("private_key"), "private_key");
	let sealed: Uint8Array;
	try {
		sealed = await wrapPrivateKey(private_key, prf.prfOutput, prf.salt);
	} finally {
		wipeBytes(private_key);
	}
	await store.write(safeSlot, storageId, { skEnc: sealed, pk: public_key });
	await runMockBestEffort(() => polluteWithMockKeygen(scheme));
	return { public_key };
}

export async function sealedSign(
	store: OpfsSkStore,
	algorithm: OpfsSkAlgorithm,
	message: Uint8Array,
	prf: OpfsSkPrfMaterial,
	slot = OPFS_SK_SLOT_SD_BUNDLE,
): Promise<Uint8Array> {
	assertOpfsSkUserVerified(prf);
	const safeSlot = assertOpfsSkSlot(slot);
	const msg = requireOpfsSkBytes(message, "message", { allowEmpty: true });
	const storageId = opfsSkStorageId(algorithm);
	const scheme = await loadOpfsSkScheme(algorithm);
	const record = await store.read(safeSlot, storageId);
	const sk = await unwrapPrivateKey(record.skEnc, prf.prfOutput, prf.salt);
	try {
		return await scheme.sign(msg, sk);
	} finally {
		wipeBytes(sk);
		await runMockBestEffort(() => polluteWithMockSign(scheme));
	}
}

export async function sealedVerify(
	algorithm: OpfsSkAlgorithm,
	signature: Uint8Array,
	message: Uint8Array,
	publicKey: Uint8Array,
): Promise<boolean> {
	const scheme = await loadOpfsSkScheme(algorithm);
	return scheme.verify(
		requireOpfsSkBytes(signature, "signature"),
		requireOpfsSkBytes(message, "message", { allowEmpty: true }),
		requireOpfsSkBytes(publicKey, "public_key"),
	);
}

export async function sealedHasKey(
	store: OpfsSkStore,
	algorithm: OpfsSkAlgorithm,
	slot = OPFS_SK_SLOT_SD_BUNDLE,
): Promise<boolean> {
	return store.has(assertOpfsSkSlot(slot), opfsSkStorageId(algorithm));
}

export async function sealedPublicKey(
	store: OpfsSkStore,
	algorithm: OpfsSkAlgorithm,
	slot = OPFS_SK_SLOT_SD_BUNDLE,
): Promise<Uint8Array> {
	const record = await store.read(
		assertOpfsSkSlot(slot),
		opfsSkStorageId(algorithm),
	);
	return record.pk;
}

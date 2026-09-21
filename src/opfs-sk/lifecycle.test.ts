import { describe, expect, it } from "vitest";
import type { OpfsSkAlgorithm } from "./algorithms";
import {
	type OpfsSkPrfMaterial,
	sealedHasKey,
	sealedKeygen,
	sealedPublicKey,
	sealedSign,
	sealedVerify,
} from "./lifecycle";
import { createMemoryOpfsSkStore } from "./store";

function testPrf(): OpfsSkPrfMaterial {
	return {
		prfOutput: crypto.getRandomValues(new Uint8Array(32)),
		salt: crypto.getRandomValues(new Uint8Array(32)),
		userVerified: true,
	};
}

async function roundTrip(algorithm: OpfsSkAlgorithm): Promise<void> {
	const store = createMemoryOpfsSkStore();
	const prf = testPrf();
	const message = new TextEncoder().encode(`opfs-sk:${algorithm}`);

	const { public_key } = await sealedKeygen(store, algorithm, prf);
	expect(store.writeCount).toBe(1);
	expect(await sealedHasKey(store, algorithm)).toBe(true);
	expect(await sealedPublicKey(store, algorithm)).toEqual(public_key);

	const signature = await sealedSign(store, algorithm, message, prf);
	expect(store.writeCount).toBe(1);
	expect(await sealedVerify(algorithm, signature, message, public_key)).toBe(
		true,
	);
}

describe("OPFS sk sealed lifecycle (in-memory store)", () => {
	it("refuses userVerified !== true", async () => {
		const store = createMemoryOpfsSkStore();
		await expect(
			sealedKeygen(store, "ml-dsa-3", {
				prfOutput: crypto.getRandomValues(new Uint8Array(32)),
				salt: crypto.getRandomValues(new Uint8Array(32)),
				userVerified: false as unknown as true,
			}),
		).rejects.toThrow(/userVerification/);
	});

	it("keygen/sign/verify ML-DSA-3 without a second OPFS write from mock keygen", async () => {
		await roundTrip("ml-dsa-3");
	});

	it("keygen/sign/verify FN-DSA-512", async () => {
		await roundTrip("fn-dsa-512");
	});

	it("keygen/sign/verify ML-DSA-87", async () => {
		await roundTrip("ml-dsa-5");
	});

	it("keygen/sign/verify FN-DSA-1024", async () => {
		await roundTrip("fn-dsa-1024");
	});

	it("keygen/sign/verify SLH-DSA-128", async () => {
		await roundTrip("slh-dsa-128");
	}, 30_000);

	it("keygen/sign/verify SQIsign L1 (same WASM as the webGPU alias)", async () => {
		await roundTrip("sqisign-lvl1-webgpu");
	}, 120_000);
});

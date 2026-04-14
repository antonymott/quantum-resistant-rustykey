import { describe, expect, it } from "vitest";
import { loadMlKem512, loadMlKem768, loadMlKem1024 } from "./index";

describe("quantum-resistant-rustykey (mlkem-wasm adapter)", () => {
	it("round-trips encrypt/decrypt + AES-GCM message", async () => {
		const mlkem = await loadMlKem768();

		const kp = mlkem.keypair();
		const publicKey = await kp.get("public_key");
		const privateKey = await kp.get("private_key");

		const enc = mlkem.encrypt(publicKey);
		const ciphertext = await enc.get("cyphertext");
		const sharedSecretEnc = await enc.get("secret");

		const sharedSecretDec = await mlkem.decrypt(ciphertext, privateKey);

		expect(new Uint8Array(sharedSecretDec)).toEqual(
			new Uint8Array(sharedSecretEnc),
		);

		const msg = "hello from mlkem-wasm";
		const encryptedMessage = await mlkem.encryptMessage(msg, sharedSecretDec);
		const decryptedMessage = await mlkem.decryptMessage(
			encryptedMessage,
			sharedSecretDec,
		);

		expect(decryptedMessage).toBe(msg);
	});

	it("round-trips ML-KEM-512 encrypt/decrypt + AES-GCM message", async () => {
		const mlkem = await loadMlKem512();

		const kp = mlkem.keypair();
		const publicKey = await kp.get("public_key");
		const privateKey = await kp.get("private_key");

		const enc = mlkem.encrypt(publicKey);
		const ciphertext = await enc.get("cyphertext");
		const sharedSecretEnc = await enc.get("secret");
		const sharedSecretDec = await mlkem.decrypt(ciphertext, privateKey);

		expect(new Uint8Array(sharedSecretDec as ArrayBuffer)).toEqual(
			new Uint8Array(sharedSecretEnc as ArrayBuffer),
		);

		const msg = "hello from mlkem-512";
		const encryptedMessage = await mlkem.encryptMessage(msg, sharedSecretDec);
		const decryptedMessage = await mlkem.decryptMessage(
			encryptedMessage,
			sharedSecretDec,
		);
		expect(decryptedMessage).toBe(msg);
	});

	it("round-trips ML-KEM-1024 encrypt/decrypt + AES-GCM message", async () => {
		const mlkem = await loadMlKem1024();

		const kp = mlkem.keypair();
		const publicKey = await kp.get("public_key");
		const privateKey = await kp.get("private_key");

		const enc = mlkem.encrypt(publicKey);
		const ciphertext = await enc.get("cyphertext");
		const sharedSecretEnc = await enc.get("secret");
		const sharedSecretDec = await mlkem.decrypt(ciphertext, privateKey);

		expect(new Uint8Array(sharedSecretDec as ArrayBuffer)).toEqual(
			new Uint8Array(sharedSecretEnc as ArrayBuffer),
		);

		const msg = "hello from mlkem-1024";
		const encryptedMessage = await mlkem.encryptMessage(msg, sharedSecretDec);
		const decryptedMessage = await mlkem.decryptMessage(
			encryptedMessage,
			sharedSecretDec,
		);
		expect(decryptedMessage).toBe(msg);
	});
});

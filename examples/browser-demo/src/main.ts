import {
	loadMlKem1024,
	loadMlKem512,
	loadMlKem768,
} from "quantum-resistant-rustykey";

const logEl = document.querySelector("#log") as HTMLPreElement;
const variantEl = document.querySelector("#variant") as HTMLSelectElement;
const runBtn = document.querySelector("#run") as HTMLButtonElement;

function log(msg: string) {
	logEl.textContent = `${logEl.textContent ?? ""}${msg}\n`;
}

async function run() {
	logEl.textContent = "";
	runBtn.disabled = true;
	const v = variantEl.value;
	log(`Loading ML-KEM-${v}…`);

	try {
		const kem =
			v === "512"
				? await loadMlKem512()
				: v === "1024"
					? await loadMlKem1024()
					: await loadMlKem768();

		const kp = kem.keypair();
		const publicKey = await kp.get("public_key");
		const privateKey = await kp.get("private_key");

		const enc = kem.encrypt(publicKey);
		const ct = await enc.get("cyphertext");
		const ssEnc = await enc.get("secret");
		const ssDec = await kem.decrypt(ct, privateKey);

		const a = new Uint8Array(ssEnc as ArrayBuffer);
		const b = new Uint8Array(ssDec as ArrayBuffer);
		if (a.length !== b.length || !a.every((x, i) => x === b[i])) {
			throw new Error("shared secret mismatch after decapsulate");
		}
		log("KEM round-trip OK (shared secrets match).");

		const msg = "hello from the browser demo";
		const encrypted = await kem.encryptMessage(msg, ssDec);
		const decrypted = await kem.decryptMessage(encrypted, ssDec);
		if (decrypted !== msg) {
			throw new Error("AES-GCM message round-trip failed");
		}
		log(`AES-GCM round-trip OK (“${msg}”).`);
		log("All checks passed.");
	} catch (e) {
		log(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
		console.error(e);
	} finally {
		runBtn.disabled = false;
	}
}

runBtn.addEventListener("click", () => {
	void run();
});

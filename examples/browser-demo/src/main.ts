import {
	loadFnDsa1024,
	loadFnDsa512,
	loadMlDsa3,
	loadMlDsa5,
	loadMlKem1024,
	loadMlKem512,
	loadMlKem768,
	loadSqisignLvl1,
	loadSqisignLvl3,
	loadSqisignLvl5,
	SQISIGN_LVL1_KAT0_MSG_HEX,
	SQISIGN_LVL1_KAT0_PK_HEX,
	SQISIGN_LVL1_KAT0_SIG_HEX,
	SQISIGN_LVL3_KAT0_MSG_HEX,
	SQISIGN_LVL3_KAT0_PK_HEX,
	SQISIGN_LVL3_KAT0_SIG_HEX,
	SQISIGN_LVL5_KAT0_MSG_HEX,
	SQISIGN_LVL5_KAT0_PK_HEX,
	SQISIGN_LVL5_KAT0_SIG_HEX,
} from "quantum-resistant-rustykey";

const logEl = document.querySelector("#log") as HTMLPreElement;
const algorithmEl = document.querySelector("#algorithm") as HTMLSelectElement;
const variantEl = document.querySelector("#variant") as HTMLSelectElement;
const runBtn = document.querySelector("#run") as HTMLButtonElement;

function log(msg: string) {
	logEl.textContent = `${logEl.textContent ?? ""}${msg}\n`;
}

function parseHex(hex: string): Uint8Array {
	return Uint8Array.from(
		hex.match(/.{1,2}/g)!.map((b: string) => Number.parseInt(b, 16)),
	);
}

function setVariantOptions(algorithm: string) {
	const optionsByAlgorithm: Record<string, Array<{ value: string; label: string }>> = {
		mlkem: [
			{ value: "768", label: "768" },
			{ value: "512", label: "512" },
			{ value: "1024", label: "1024" },
		],
		fndsa: [
			{ value: "512", label: "512 (Falcon-512)" },
			{ value: "1024", label: "1024 (Falcon-1024)" },
		],
		mldsa: [
			{ value: "512", label: "512 (Dilithium3)" },
			{ value: "1024", label: "1024 (Dilithium5)" },
		],
		sqisign: [
			{ value: "1", label: "I (Level 1)" },
			{ value: "3", label: "III (Level 3)" },
			{ value: "5", label: "V (Level 5)" },
		],
	};

	const options = optionsByAlgorithm[algorithm] ?? optionsByAlgorithm.mlkem;
	variantEl.replaceChildren();
	for (const option of options) {
		const el = document.createElement("option");
		el.value = option.value;
		el.textContent = option.label;
		variantEl.appendChild(el);
	}
}

async function run() {
	logEl.textContent = "";
	runBtn.disabled = true;
	const algorithm = algorithmEl.value;
	const v = variantEl.value;

	try {
		if (algorithm === "fndsa") {
			if (v !== "512" && v !== "1024") {
				throw new Error("FN-DSA supports only Falcon-512 and Falcon-1024");
			}

			log(`Loading FN-DSA Falcon-${v}…`);
			const fndsa = v === "512" ? await loadFnDsa512() : await loadFnDsa1024();
			const kp = fndsa.keypair();
			const publicKey = await kp.get("public_key");
			const privateKey = await kp.get("private_key");
			const msg = new TextEncoder().encode("hello from the browser demo");
			const signature = await fndsa.sign(msg, privateKey);
			const ok = await fndsa.verify(signature, msg, publicKey);
			if (!ok) {
				throw new Error("signature verification failed");
			}

			log("FN-DSA sign/verify OK.");
			log("All checks passed.");
			return;
		}

		if (algorithm === "mldsa") {
			if (v !== "512" && v !== "1024") {
				throw new Error(
					"ML-DSA demo maps 512 -> Dilithium3 and 1024 -> Dilithium5",
				);
			}

			log(`Loading ML-DSA ${v === "512" ? "Dilithium3" : "Dilithium5"}…`);
			const mldsa = v === "512" ? await loadMlDsa3() : await loadMlDsa5();
			const kp = mldsa.keypair();
			const publicKey = await kp.get("public_key");
			const privateKey = await kp.get("private_key");
			const msg = new TextEncoder().encode("hello from the browser demo");
			const signature = await mldsa.sign(msg, privateKey);
			const ok = await mldsa.verify(signature, msg, publicKey);
			if (!ok) {
				throw new Error("ML-DSA signature verification failed");
			}

			log("ML-DSA sign/verify OK.");
			log("All checks passed.");
			return;
		}

		if (algorithm === "sqisign") {
			const config =
				v === "3"
					? {
							name: "SQISign III (lvl3)",
							load: loadSqisignLvl3,
							pk: SQISIGN_LVL3_KAT0_PK_HEX,
							msg: SQISIGN_LVL3_KAT0_MSG_HEX,
							sig: SQISIGN_LVL3_KAT0_SIG_HEX,
						}
					: v === "5"
						? {
								name: "SQISign V (lvl5)",
								load: loadSqisignLvl5,
								pk: SQISIGN_LVL5_KAT0_PK_HEX,
								msg: SQISIGN_LVL5_KAT0_MSG_HEX,
								sig: SQISIGN_LVL5_KAT0_SIG_HEX,
							}
						: {
								name: "SQISign I (lvl1)",
								load: loadSqisignLvl1,
								pk: SQISIGN_LVL1_KAT0_PK_HEX,
								msg: SQISIGN_LVL1_KAT0_MSG_HEX,
								sig: SQISIGN_LVL1_KAT0_SIG_HEX,
							};
			log(`Loading ${config.name}…`);
			log(
				"Note: reference keygen/sign can take a long time; this demo only checks verify on a NIST KAT vector.",
			);
			const sq = await config.load();
			const pk = parseHex(config.pk);
			const msg = parseHex(config.msg);
			const sig = parseHex(config.sig);
			const ok = await sq.verify(sig, msg, pk);
			if (!ok) {
				throw new Error(`${config.name} KAT verification failed`);
			}
			log(`${config.name} KAT verify OK.`);
			log("All checks passed.");
			return;
		}

		log(`Loading ML-KEM-${v}…`);
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

algorithmEl.addEventListener("change", () => {
	setVariantOptions(algorithmEl.value);
});

setVariantOptions(algorithmEl.value);

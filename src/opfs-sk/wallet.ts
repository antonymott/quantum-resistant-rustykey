import type { OpfsSkAlgorithm } from "./algorithms.js";
import { OPFS_SK_SLOT_SD_BUNDLE, OPFS_SK_WORKER_NAME } from "./browser-gate.js";
import { copyStandaloneBytes } from "./bytes.js";
import { assertOpfsSkCrossOriginIsolated } from "./isolate.js";
import {
	assertOpfsSkUserVerified,
	type OpfsSkPrfMaterial,
} from "./lifecycle.js";
import type { OpfsSkWorkerRequest, OpfsSkWorkerResponse } from "./protocol.js";

const DEFAULT_OPFS_SK_WORKER_URL = "/pqc/opfs-sk-worker.js";

export type IOpfsSkWallet = {
	keygen(
		algorithm: OpfsSkAlgorithm,
		prf: OpfsSkPrfMaterial,
		options?: { slot?: string },
	): Promise<{ public_key: Uint8Array }>;
	sign(
		algorithm: OpfsSkAlgorithm,
		message: Uint8Array,
		prf: OpfsSkPrfMaterial,
		options?: { slot?: string },
	): Promise<Uint8Array>;
	verify(
		algorithm: OpfsSkAlgorithm,
		signature: Uint8Array,
		message: Uint8Array,
		public_key: Uint8Array,
	): Promise<boolean>;
	hasKey(algorithm: OpfsSkAlgorithm, slot?: string): Promise<boolean>;
	publicKey(algorithm: OpfsSkAlgorithm, slot?: string): Promise<Uint8Array>;
};

let customWorkerUrl: string | null = null;
let worker: Worker | null = null;
let nextId = 1;
let initPromise: Promise<Worker> | null = null;
const pending = new Map<
	number,
	{
		resolve: (value: OpfsSkWorkerResponse) => void;
		reject: (error: Error) => void;
	}
>();

/** Host apps (e.g. Next.js) must serve dist/opfs-sk-worker.js. */
export function setOpfsSkWorkerUrl(url: string): void {
	customWorkerUrl = url;
	if (worker) {
		worker.terminate();
		worker = null;
	}
	initPromise = null;
}

function resolveWorkerUrl(): string {
	if (customWorkerUrl) return customWorkerUrl;
	try {
		const sibling = new URL("./opfs-sk-worker.js", import.meta.url);
		if (
			sibling.pathname.endsWith("/opfs-sk-worker.js") &&
			!sibling.pathname.includes("/_next/") &&
			!sibling.pathname.includes("/chunks/")
		) {
			return sibling.href;
		}
	} catch {
		// fall through
	}
	return DEFAULT_OPFS_SK_WORKER_URL;
}

function workerErrorMessage(event: ErrorEvent): string {
	const parts = [event.message, event.error?.message].filter(Boolean);
	const base = parts[0] ?? "OPFS sk worker failed";
	const loc =
		event.filename && event.filename !== ""
			? ` (${event.filename}${event.lineno ? `:${event.lineno}` : ""})`
			: "";
	return `${base}${loc}`;
}

async function createWalletWorker(): Promise<Worker> {
	const url = resolveWorkerUrl();
	const instance = new Worker(url, {
		type: "module",
		name: OPFS_SK_WORKER_NAME,
	});

	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, 150);
		instance.addEventListener(
			"error",
			(event) => {
				clearTimeout(timer);
				reject(
					new Error(
						`${workerErrorMessage(event)} — worker url: ${url}. ` +
							"Copy dist/opfs-sk-worker.js to your app public/pqc/ folder.",
					),
				);
			},
			{ once: true },
		);
	});

	instance.onerror = (event) => {
		const message = workerErrorMessage(event);
		for (const [, handler] of pending) {
			handler.reject(new Error(message));
		}
		pending.clear();
	};

	instance.onmessage = (event: MessageEvent<OpfsSkWorkerResponse>) => {
		const handler = pending.get(event.data.id);
		if (!handler) return;
		pending.delete(event.data.id);
		handler.resolve(event.data);
	};

	return instance;
}

async function ensureWorker(): Promise<Worker> {
	if (initPromise) return initPromise;
	initPromise = (async () => {
		assertOpfsSkCrossOriginIsolated();
		if (!worker) {
			worker = await createWalletWorker();
		}
		return worker;
	})();
	try {
		return await initPromise;
	} catch (error) {
		initPromise = null;
		throw error;
	}
}

function transferableBuffer(bytes: Uint8Array): {
	bytes: Uint8Array;
	transfer: Transferable[];
} {
	const copy = copyStandaloneBytes(bytes);
	return { bytes: copy, transfer: [copy.buffer as ArrayBuffer] };
}

function postToWorker(
	build: (id: number) => {
		request: OpfsSkWorkerRequest;
		transfer: Transferable[];
	},
): Promise<OpfsSkWorkerResponse> {
	return ensureWorker().then((activeWorker) => {
		const id = nextId++;
		const { request, transfer } = build(id);
		return new Promise<OpfsSkWorkerResponse>((resolve, reject) => {
			pending.set(id, { resolve, reject });
			activeWorker.postMessage(request, transfer);
		});
	});
}

class OpfsSkWallet implements IOpfsSkWallet {
	async keygen(
		algorithm: OpfsSkAlgorithm,
		prf: OpfsSkPrfMaterial,
		options?: { slot?: string },
	): Promise<{ public_key: Uint8Array }> {
		assertOpfsSkUserVerified(prf);
		const prfXfer = transferableBuffer(prf.prfOutput);
		const saltXfer = transferableBuffer(prf.salt);
		const result = await postToWorker((id) => ({
			request: {
				id,
				op: "keygen",
				algorithm,
				slot: options?.slot ?? OPFS_SK_SLOT_SD_BUNDLE,
				prfOutput: prfXfer.bytes,
				salt: saltXfer.bytes,
			},
			transfer: [...prfXfer.transfer, ...saltXfer.transfer],
		}));
		if (!result.ok || !result.publicKey) {
			throw new Error(
				result.ok ? "OPFS sk keygen: missing public key" : result.error,
			);
		}
		return { public_key: result.publicKey };
	}

	async sign(
		algorithm: OpfsSkAlgorithm,
		message: Uint8Array,
		prf: OpfsSkPrfMaterial,
		options?: { slot?: string },
	): Promise<Uint8Array> {
		assertOpfsSkUserVerified(prf);
		const prfXfer = transferableBuffer(prf.prfOutput);
		const saltXfer = transferableBuffer(prf.salt);
		const msgXfer = transferableBuffer(message);
		const result = await postToWorker((id) => ({
			request: {
				id,
				op: "sign",
				algorithm,
				slot: options?.slot ?? OPFS_SK_SLOT_SD_BUNDLE,
				message: msgXfer.bytes,
				prfOutput: prfXfer.bytes,
				salt: saltXfer.bytes,
			},
			transfer: [
				...prfXfer.transfer,
				...saltXfer.transfer,
				...msgXfer.transfer,
			],
		}));
		if (!result.ok || !result.signature) {
			throw new Error(
				result.ok ? "OPFS sk sign: missing signature" : result.error,
			);
		}
		return result.signature;
	}

	async verify(
		algorithm: OpfsSkAlgorithm,
		signature: Uint8Array,
		message: Uint8Array,
		public_key: Uint8Array,
	): Promise<boolean> {
		const result = await postToWorker((id) => ({
			request: {
				id,
				op: "verify",
				algorithm,
				signature,
				message,
				publicKey: public_key,
			},
			transfer: [],
		}));
		if (!result.ok) throw new Error(result.error);
		return !!result.valid;
	}

	async hasKey(
		algorithm: OpfsSkAlgorithm,
		slot = OPFS_SK_SLOT_SD_BUNDLE,
	): Promise<boolean> {
		const result = await postToWorker((id) => ({
			request: { id, op: "has", algorithm, slot },
			transfer: [],
		}));
		if (!result.ok) throw new Error(result.error);
		return !!result.exists;
	}

	async publicKey(
		algorithm: OpfsSkAlgorithm,
		slot = OPFS_SK_SLOT_SD_BUNDLE,
	): Promise<Uint8Array> {
		const result = await postToWorker((id) => ({
			request: { id, op: "publicKey", algorithm, slot },
			transfer: [],
		}));
		if (!result.ok || !result.publicKey) {
			throw new Error(result.ok ? "OPFS sk: missing public key" : result.error);
		}
		return result.publicKey;
	}
}

/**
 * Browser-only encrypted-at-rest wallet. Requires `crossOriginIsolated`.
 * Decrypt + sign stay in the worker; the UI thread receives only signatures
 * and public keys. Node loaders are unchanged.
 */
export async function loadOpfsSkWallet(): Promise<IOpfsSkWallet> {
	assertOpfsSkCrossOriginIsolated();
	await ensureWorker();
	return new OpfsSkWallet();
}

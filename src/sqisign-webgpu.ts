import {
	getSqisignWebGpuSupport,
	isSqisignWebGpuAvailable,
	SQISIGN_WEBGPU_VARIANT_LABELS,
	type SqisignWebGpuSupport,
	type SqisignWebGpuVariant,
} from "./sqisign-accel-env.js";
import {
	loadSqisignLvl1,
	loadSqisignLvl3,
	loadSqisignLvl5,
} from "./sqisign.js";
import type { IFnDsa, KeyPair, SqisignVariant } from "./types.js";
import { initWebGpuDevice, warmupWebGpu } from "./webgpu/init.js";

export {
	getSqisignWebGpuSupport,
	isSqisignWebGpuAvailable,
	SQISIGN_WEBGPU_VARIANT_LABELS,
	type SqisignWebGpuSupport,
	type SqisignWebGpuVariant,
};

const DEFAULT_ACCEL_WORKER_URL = "/pqc/sqisign-accel-worker.js";

type WorkerOp =
	| { id: number; op: "keygen"; variant: SqisignVariant }
	| {
			id: number;
			op: "sign";
			variant: SqisignVariant;
			msg: Uint8Array;
			sk: Uint8Array;
	  }
	| {
			id: number;
			op: "verify";
			variant: SqisignVariant;
			sig: Uint8Array;
			msg: Uint8Array;
			pk: Uint8Array;
	  };

type WorkerResult =
	| { id: number; ok: true; pk?: Uint8Array; sk?: Uint8Array; sig?: Uint8Array; valid?: boolean }
	| { id: number; ok: false; error: string };

let customWorkerUrl: string | null = null;
let worker: Worker | null = null;
let nextId = 1;
let useMainThread = false;
const pending = new Map<
	number,
	{ resolve: (value: WorkerResult) => void; reject: (error: Error) => void }
>();

let initPromise: Promise<void> | null = null;

const mainThreadLoaders: Record<
	SqisignVariant,
	() => Promise<IFnDsa>
> = {
	lvl1: loadSqisignLvl1,
	lvl3: loadSqisignLvl3,
	lvl5: loadSqisignLvl5,
};

/** Host apps (e.g. Next.js) must serve dist/sqisign-accel-worker.js — see docs/SQISIGN-WEBGPU.md */
export function setSqisignAccelWorkerUrl(url: string): void {
	customWorkerUrl = url;
	if (worker) {
		worker.terminate();
		worker = null;
	}
	initPromise = null;
	useMainThread = false;
}

function assertBrowserAccel(): void {
	const support = getSqisignWebGpuSupport();
	if (!support.available) {
		throw new Error(
			support.reason ??
				"SQISign-webGPU requires crossOriginIsolated, SharedArrayBuffer, and WebGPU.",
		);
	}
}

function resolveWorkerUrl(): string {
	if (customWorkerUrl) return customWorkerUrl;

	try {
		const sibling = new URL("./sqisign-accel-worker.js", import.meta.url);
		if (
			sibling.pathname.endsWith("/sqisign-accel-worker.js") &&
			!sibling.pathname.includes("/_next/") &&
			!sibling.pathname.includes("/chunks/")
		) {
			return sibling.href;
		}
	} catch {
		// fall through to default public URL
	}

	return DEFAULT_ACCEL_WORKER_URL;
}

function workerErrorMessage(event: ErrorEvent): string {
	const parts = [event.message, event.error?.message].filter(Boolean);
	const base = parts[0] ?? "SQISign worker failed";
	const loc =
		event.filename && event.filename !== ""
			? ` (${event.filename}${event.lineno ? `:${event.lineno}` : ""})`
			: "";
	return `${base}${loc}`;
}

async function createAccelWorker(): Promise<Worker> {
	const url = resolveWorkerUrl();
	const instance = new Worker(url, { type: "module", name: "sqisign-accel" });

	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, 150);
		instance.addEventListener(
			"error",
			(event) => {
				clearTimeout(timer);
				reject(
					new Error(
						`${workerErrorMessage(event)} — worker url: ${url}. ` +
							"Copy dist/sqisign-accel-worker.js to your app public/pqc/ folder.",
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

	instance.onmessage = (event: MessageEvent<WorkerResult>) => {
		const handler = pending.get(event.data.id);
		if (!handler) return;
		pending.delete(event.data.id);
		handler.resolve(event.data);
	};

	return instance;
}

async function ensureAccelReady(): Promise<void> {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		assertBrowserAccel();
		await initWebGpuDevice();
		await warmupWebGpu();

		if (!worker && !useMainThread) {
			try {
				worker = await createAccelWorker();
			} catch {
				useMainThread = true;
			}
		}
	})();

	return initPromise;
}

function postToWorker(request: WorkerOp, transfer: Transferable[] = []): Promise<WorkerResult> {
	return ensureAccelReady().then(() => {
		if (useMainThread || !worker) {
			return runOnMainThread(request);
		}
		return new Promise<WorkerResult>((resolve, reject) => {
			pending.set(request.id, { resolve, reject });
			worker!.postMessage(request, transfer);
		});
	});
}

async function runOnMainThread(request: WorkerOp): Promise<WorkerResult> {
	try {
		const scheme = await mainThreadLoaders[request.variant]();
		if (request.op === "keygen") {
			const kp = scheme.keypair();
			const pk = (await kp.get("public_key")) as Uint8Array;
			const sk = (await kp.get("private_key")) as Uint8Array;
			return { id: request.id, ok: true, pk, sk };
		}
		if (request.op === "sign") {
			const sig = await scheme.sign(request.msg, request.sk);
			return { id: request.id, ok: true, sig };
		}
		const valid = await scheme.verify(request.sig, request.msg, request.pk);
		return { id: request.id, ok: true, valid };
	} catch (error) {
		return {
			id: request.id,
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function variantLabel(variant: SqisignVariant): string {
	if (variant === "lvl1") return SQISIGN_WEBGPU_VARIANT_LABELS.lvl1;
	if (variant === "lvl3") return SQISIGN_WEBGPU_VARIANT_LABELS.lvl3;
	return SQISIGN_WEBGPU_VARIANT_LABELS.lvl5;
}

class SqisignWebGpuWrapper implements IFnDsa {
	constructor(private readonly variant: SqisignVariant) {}

	keypair(): KeyPair {
		const pairPromise = postToWorker({
			id: nextId++,
			op: "keygen",
			variant: this.variant,
		}).then((result) => {
			if (!result.ok || !result.pk || !result.sk) {
				throw new Error(result.ok ? "Missing key material" : result.error);
			}
			return { public_key: result.pk, private_key: result.sk };
		});

		return {
			get: (key: "public_key" | "private_key") =>
				pairPromise.then((pair) =>
					key === "public_key" ? pair.public_key : pair.private_key,
				),
		};
	}

	sign(
		message: Uint8Array | ArrayBuffer | string,
		private_key: unknown,
	): Promise<Uint8Array> {
		return Promise.resolve(private_key).then(async (sk) => {
			const msg = new Uint8Array(
				typeof message === "string"
					? new TextEncoder().encode(message)
					: message instanceof Uint8Array
						? message
						: new Uint8Array(message),
			);
			const key = new Uint8Array(
				sk instanceof Uint8Array
					? sk
					: sk instanceof ArrayBuffer
						? new Uint8Array(sk)
						: new Uint8Array(sk as ArrayBuffer),
			);
			const result = await postToWorker(
				{
					id: nextId++,
					op: "sign",
					variant: this.variant,
					msg,
					sk: key,
				},
				[],
			);
			if (!result.ok || !result.sig) {
				throw new Error(result.ok ? "Missing signature" : result.error);
			}
			return result.sig;
		});
	}

	verify(
		signature: Uint8Array | ArrayBuffer | string,
		message: Uint8Array | ArrayBuffer | string,
		public_key: unknown,
	): Promise<boolean> {
		return Promise.all([
			Promise.resolve(signature),
			Promise.resolve(message),
			Promise.resolve(public_key),
		]).then(async ([sig, msg, pk]) => {
			const sigBytes = new Uint8Array(
				typeof sig === "string"
					? Uint8Array.from(sig.match(/.{1,2}/g)!.map((b) => Number.parseInt(b, 16)))
					: sig instanceof Uint8Array
						? sig
						: new Uint8Array(sig),
			);
			const msgBytes = new Uint8Array(
				typeof msg === "string"
					? new TextEncoder().encode(msg)
					: msg instanceof Uint8Array
						? msg
						: new Uint8Array(msg),
			);
			const pkBytes = new Uint8Array(
				pk instanceof Uint8Array
					? pk
					: pk instanceof ArrayBuffer
						? new Uint8Array(pk)
						: new Uint8Array(pk as ArrayBuffer),
			);
			const result = await postToWorker(
				{
					id: nextId++,
					op: "verify",
					variant: this.variant,
					sig: sigBytes,
					msg: msgBytes,
					pk: pkBytes,
				},
				[],
			);
			if (!result.ok) throw new Error(result.error);
			return !!result.valid;
		});
	}

	buffer_to_string(value: Uint8Array | ArrayBuffer | string): string {
		if (typeof value === "string") return value;
		const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
		return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
	}

	get label(): string {
		return variantLabel(this.variant);
	}
}

export type SqisignBenchSteps = {
	keygenMs: number;
	signMs: number;
	verifyMs: number;
};

export async function benchSqisignWebGpu(
	variant: SqisignVariant,
	message = "rustykey-signature-check",
): Promise<{
	algorithm: string;
	ok: boolean;
	signatureBytes: number;
	steps: SqisignBenchSteps;
}> {
	const scheme = await loadSqisignWebGpu(variant);
	const msgBytes = new TextEncoder().encode(message);

	const keygenStart = performance.now();
	const kp = scheme.keypair();
	const pk = (await kp.get("public_key")) as Uint8Array;
	const sk = (await kp.get("private_key")) as Uint8Array;
	const keygenMs = performance.now() - keygenStart;

	const signStart = performance.now();
	const sig = await scheme.sign(msgBytes, sk);
	const signMs = performance.now() - signStart;

	const verifyStart = performance.now();
	const ok = await scheme.verify(sig, msgBytes, pk);
	const verifyMs = performance.now() - verifyStart;

	return {
		algorithm: variantLabel(variant),
		ok,
		signatureBytes: sig.byteLength,
		steps: { keygenMs, signMs, verifyMs },
	};
}

async function loadSqisignWebGpu(variant: SqisignVariant): Promise<SqisignWebGpuWrapper> {
	await ensureAccelReady();
	return new SqisignWebGpuWrapper(variant);
}

export async function loadSqisignLvl1WebGpu(): Promise<IFnDsa> {
	return loadSqisignWebGpu("lvl1");
}

export async function loadSqisignLvl3WebGpu(): Promise<IFnDsa> {
	return loadSqisignWebGpu("lvl3");
}

export async function loadSqisignLvl5WebGpu(): Promise<IFnDsa> {
	return loadSqisignWebGpu("lvl5");
}

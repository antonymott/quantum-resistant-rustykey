/** Dedicated Worker name for `loadOpfsSkWallet()` — the only browser realm allowed to keygen/sign. */
export const OPFS_SK_WORKER_NAME = "qrr-opfs-sk";

/** Static OPFS slot used by the pqc.rustykey.me wallet demos. */
export const OPFS_SK_SLOT_SD_BUNDLE = "sd-bundle";

export const BROWSER_SK_CEREMONY_ERROR =
	"Browser keygen/sign requires WebAuthn userVerification:required, PRF, TEE, and loadOpfsSkWallet() (ciphertext in OPFS). Node and server REST loaders are unchanged. verify() remains available.";

function hasWorkerGlobalScope(): boolean {
	return (
		typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !==
		"undefined"
	);
}

function hasWindow(): boolean {
	return typeof (globalThis as { window?: unknown }).window !== "undefined";
}

function workerName(): string {
	const name = (globalThis as unknown as { name?: unknown }).name;
	return typeof name === "string" ? name : "";
}

/** Node / server REST — plaintext loaders stay unconstrained. */
export function isUnconstrainedSigningRealm(): boolean {
	return !hasWindow() && !hasWorkerGlobalScope();
}

/** OPFS encrypted-sk Worker (name `qrr-opfs-sk`). */
export function isOpfsSkWorkerRealm(): boolean {
	return (
		hasWorkerGlobalScope() &&
		!hasWindow() &&
		workerName() === OPFS_SK_WORKER_NAME
	);
}

/**
 * Browser page, SharedWorker, and non-wallet Dedicated Workers must not
 * keygen or sign with a plaintext `sk`. The OPFS wallet worker is the
 * exception. `verify()` is not gated.
 */
export function assertBrowserSkCeremonyAllowed(): void {
	if (isUnconstrainedSigningRealm() || isOpfsSkWorkerRealm()) return;
	throw new Error(BROWSER_SK_CEREMONY_ERROR);
}

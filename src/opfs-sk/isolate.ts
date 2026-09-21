function isBrowserOrWorker(): boolean {
	const g = globalThis as {
		window?: unknown;
		WorkerGlobalScope?: unknown;
	};
	return (
		typeof g.window !== "undefined" ||
		typeof g.WorkerGlobalScope !== "undefined"
	);
}

/**
 * Browser-only gate for the OPFS encrypted-sk wallet (`self.crossOriginIsolated`).
 * Node / server loaders (`loadSqisignLvl*`, `loadMlDsa*`, …) stay unconstrained.
 */
export function assertOpfsSkCrossOriginIsolated(): void {
	const g = globalThis as {
		crossOriginIsolated?: boolean;
	};
	if (!isBrowserOrWorker()) {
		throw new Error(
			"OPFS encrypted-sk wallet is browser-only. Node and server REST usage remain unconstrained.",
		);
	}
	if (g.crossOriginIsolated !== true) {
		throw new Error(
			"OPFS encrypted-sk wallet requires crossOriginIsolated === true. Serve Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.",
		);
	}
}

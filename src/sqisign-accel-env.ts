export type SqisignWebGpuSupport = {
	available: boolean
	crossOriginIsolated: boolean
	sharedArrayBuffer: boolean
	webGpu: boolean
	reason?: string
}

export const SQISIGN_WEBGPU_VARIANT_LABELS = {
	lvl1: "SQISign-L1-webGPU",
	lvl3: "SQISign-L3-webGPU",
	lvl5: "SQISign-L5-webGPU",
} as const

export type SqisignWebGpuVariant = keyof typeof SQISIGN_WEBGPU_VARIANT_LABELS

function isBrowserRuntime(): boolean {
	return (
		typeof globalThis !== "undefined" &&
		typeof (globalThis as { window?: unknown }).window !== "undefined" &&
		typeof (globalThis as { document?: unknown }).document !== "undefined"
	)
}

export function getSqisignWebGpuSupport(): SqisignWebGpuSupport {
	if (!isBrowserRuntime()) {
		return {
			available: false,
			crossOriginIsolated: false,
			sharedArrayBuffer: false,
			webGpu: false,
			reason: "SQISign-webGPU is browser-only (not available in Node.js).",
		}
	}

	const crossOriginIsolated =
		(globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true
	const sharedArrayBuffer = typeof SharedArrayBuffer !== "undefined"
	const webGpu =
		typeof navigator !== "undefined" && "gpu" in navigator && !!navigator.gpu

	if (!crossOriginIsolated) {
		return {
			available: false,
			crossOriginIsolated,
			sharedArrayBuffer,
			webGpu,
			reason:
				"crossOriginIsolated is false — serve COOP/COEP headers to enable SharedArrayBuffer.",
		}
	}

	if (!sharedArrayBuffer) {
		return {
			available: false,
			crossOriginIsolated,
			sharedArrayBuffer,
			webGpu,
			reason: "SharedArrayBuffer is not available in this browser.",
		}
	}

	if (!webGpu) {
		return {
			available: false,
			crossOriginIsolated,
			sharedArrayBuffer,
			webGpu,
			reason: "WebGPU is not available in this browser.",
		}
	}

	return {
		available: true,
		crossOriginIsolated,
		sharedArrayBuffer,
		webGpu,
	}
}

export function isSqisignWebGpuAvailable(): boolean {
	return getSqisignWebGpuSupport().available
}

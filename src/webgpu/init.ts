let devicePromise: Promise<GPUDevice | null> | null = null;

export async function initWebGpuDevice(): Promise<GPUDevice | null> {
	if (devicePromise) return devicePromise;

	devicePromise = (async () => {
		if (
			typeof navigator === "undefined" ||
			!("gpu" in navigator) ||
			!navigator.gpu
		) {
			return null;
		}

		const adapter = await navigator.gpu.requestAdapter({
			powerPreference: "high-performance",
		});
		if (!adapter) return null;

		return adapter.requestDevice({
			label: "sqisign-accelerator",
		});
	})();

	return devicePromise;
}

export async function warmupWebGpu(): Promise<boolean> {
	const device = await initWebGpuDevice();
	if (!device) return false;

	const module = device.createShaderModule({
		label: "sqisign-gpu-warmup",
		code: /* wgsl */ `
			@group(0) @binding(0) var<storage, read> a: array<u32>;
			@group(0) @binding(1) var<storage, read> b: array<u32>;
			@group(0) @binding(2) var<storage, read_write> out: array<u32>;

			@compute @workgroup_size(64)
			fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
				let i = gid.x;
				if (i >= arrayLength(&out)) { return; }
				out[i] = a[i % arrayLength(&a)] ^ b[i % arrayLength(&b)];
			}
		`,
	});

	const pipeline = device.createComputePipeline({
		label: "sqisign-gpu-warmup-pipeline",
		layout: "auto",
		compute: { module, entryPoint: "main" },
	});

	const bufferBytes = 256;
	let a: GPUBuffer | undefined;
	let b: GPUBuffer | undefined;
	let out: GPUBuffer | undefined;
	try {
		a = device.createBuffer({
			size: bufferBytes,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		b = device.createBuffer({
			size: bufferBytes,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		out = device.createBuffer({
			size: bufferBytes,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
		});

		device.queue.writeBuffer(a, 0, new Uint32Array(64).fill(1));
		device.queue.writeBuffer(b, 0, new Uint32Array(64).fill(2));

		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: a } },
				{ binding: 1, resource: { buffer: b } },
				{ binding: 2, resource: { buffer: out } },
			],
		});

		const encoder = device.createCommandEncoder({ label: "sqisign-warmup" });
		const pass = encoder.beginComputePass({ label: "sqisign-warmup-pass" });
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(1);
		pass.end();
		device.queue.submit([encoder.finish()]);

		await device.queue.onSubmittedWorkDone();
		return true;
	} finally {
		// Warmup buffers hold constants 1/2, not keys. Still wipe + destroy on every path.
		const zeros = new Uint8Array(bufferBytes);
		for (const buffer of [a, b, out]) {
			if (!buffer) continue;
			try {
				device.queue.writeBuffer(buffer, 0, zeros);
			} catch {
				// Device-lost / already-destroyed: still attempt destroy below.
			}
		}
		try {
			await device.queue.onSubmittedWorkDone();
		} catch {
			// Queue may already be lost; destroy anyway.
		}
		a?.destroy();
		b?.destroy();
		out?.destroy();
	}
}

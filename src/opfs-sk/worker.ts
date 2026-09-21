import { parseOpfsSkAlgorithm } from "./algorithms.js";
import { wipeBytes } from "./bytes.js";
import { assertOpfsSkCrossOriginIsolated } from "./isolate.js";
import {
	sealedHasKey,
	sealedKeygen,
	sealedPublicKey,
	sealedSign,
	sealedVerify,
} from "./lifecycle.js";
import { createOpfsSyncStore } from "./opfs-store.js";
import type { OpfsSkWorkerRequest, OpfsSkWorkerResponse } from "./protocol.js";

const store = createOpfsSyncStore();

const VERIFIED_PRF = { userVerified: true as const };

async function handleOp(
	request: OpfsSkWorkerRequest,
): Promise<OpfsSkWorkerResponse> {
	try {
		assertOpfsSkCrossOriginIsolated();
		const algorithm = parseOpfsSkAlgorithm(request.algorithm);
		if (request.op === "keygen") {
			try {
				const { public_key } = await sealedKeygen(
					store,
					algorithm,
					{
						prfOutput: request.prfOutput,
						salt: request.salt,
						...VERIFIED_PRF,
					},
					request.slot,
				);
				return { id: request.id, ok: true, publicKey: public_key };
			} finally {
				wipeBytes(request.prfOutput);
				wipeBytes(request.salt);
			}
		}
		if (request.op === "sign") {
			try {
				const signature = await sealedSign(
					store,
					algorithm,
					request.message,
					{
						prfOutput: request.prfOutput,
						salt: request.salt,
						...VERIFIED_PRF,
					},
					request.slot,
				);
				return { id: request.id, ok: true, signature };
			} finally {
				wipeBytes(request.prfOutput);
				wipeBytes(request.salt);
			}
		}
		if (request.op === "verify") {
			const valid = await sealedVerify(
				algorithm,
				request.signature,
				request.message,
				request.publicKey,
			);
			return { id: request.id, ok: true, valid };
		}
		if (request.op === "has") {
			const exists = await sealedHasKey(store, algorithm, request.slot);
			return { id: request.id, ok: true, exists };
		}
		const publicKey = await sealedPublicKey(store, algorithm, request.slot);
		return { id: request.id, ok: true, publicKey };
	} catch (error) {
		return {
			id: request.id,
			ok: false,
			error: error instanceof Error ? error.message : "OPFS sk worker failed",
		};
	}
}

let opChain: Promise<void> = Promise.resolve();

function enqueueOp(
	request: OpfsSkWorkerRequest,
): Promise<OpfsSkWorkerResponse> {
	const result = opChain.then(() => handleOp(request));
	opChain = result.then(
		() => undefined,
		() => undefined,
	);
	return result;
}

const workerScope = self as unknown as {
	onmessage: ((event: MessageEvent<OpfsSkWorkerRequest>) => void) | null;
	postMessage: (
		message: OpfsSkWorkerResponse,
		transfer?: Transferable[],
	) => void;
};

workerScope.onmessage = (event: MessageEvent<OpfsSkWorkerRequest>): void => {
	void enqueueOp(event.data).then((result) => {
		const transfers: Transferable[] = [];
		if (result.ok) {
			if (result.publicKey) {
				transfers.push(result.publicKey.buffer as ArrayBuffer);
			}
			if (result.signature) {
				transfers.push(result.signature.buffer as ArrayBuffer);
			}
		}
		workerScope.postMessage(result, transfers);
	});
};

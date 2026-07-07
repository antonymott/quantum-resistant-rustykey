import {
	asBytes,
	readBytes,
	wasmExport,
	wasmExportWithArgs,
	withStack,
	writeBytes,
} from "./signature-common.js";
import type { SqisignVariant } from "./types.js";
import SqisignLvl1Module from "./vendor/sqisignlvl1.js";
import SqisignLvl3Module from "./vendor/sqisignlvl3.js";
import SqisignLvl5Module from "./vendor/sqisignlvl5.js";

type SqisignModule = {
	HEAPU8: Uint8Array;
	stackSave(): number;
	stackAlloc(size: number): number;
	stackRestore(stack: number): void;
	_sqisign_lvl1_public_key_bytes?: () => number;
	_sqisign_lvl1_private_key_bytes?: () => number;
	_sqisign_lvl1_signature_bytes?: () => number;
	_sqisign_lvl1_seed_bytes?: () => number;
	_sqisign_lvl1_keypair_seeded?: (
		pk: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl1_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl1_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
	_sqisign_lvl3_public_key_bytes?: () => number;
	_sqisign_lvl3_private_key_bytes?: () => number;
	_sqisign_lvl3_signature_bytes?: () => number;
	_sqisign_lvl3_seed_bytes?: () => number;
	_sqisign_lvl3_keypair_seeded?: (
		pk: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl3_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl3_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
	_sqisign_lvl5_public_key_bytes?: () => number;
	_sqisign_lvl5_private_key_bytes?: () => number;
	_sqisign_lvl5_signature_bytes?: () => number;
	_sqisign_lvl5_seed_bytes?: () => number;
	_sqisign_lvl5_keypair_seeded?: (
		pk: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl5_sign_seeded?: (
		sig: number,
		msg: number,
		msgLen: number,
		sk: number,
		seed: number,
	) => number;
	_sqisign_lvl5_verify?: (
		sig: number,
		sigLen: number,
		msg: number,
		msgLen: number,
		pk: number,
	) => number;
};

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
	| {
			id: number;
			ok: true;
			pk?: Uint8Array;
			sk?: Uint8Array;
			sig?: Uint8Array;
			valid?: boolean;
	  }
	| { id: number; ok: false; error: string };

const moduleLoaders: Record<SqisignVariant, () => Promise<SqisignModule>> = {
	lvl1: () => SqisignLvl1Module() as Promise<SqisignModule>,
	lvl3: () => SqisignLvl3Module() as Promise<SqisignModule>,
	lvl5: () => SqisignLvl5Module() as Promise<SqisignModule>,
};

const moduleCache: Partial<Record<SqisignVariant, Promise<SqisignModule>>> = {};

function getModule(variant: SqisignVariant): Promise<SqisignModule> {
	let cached = moduleCache[variant];
	if (!cached) {
		cached = moduleLoaders[variant]();
		moduleCache[variant] = cached;
	}
	return cached;
}

function prefix(variant: SqisignVariant): "lvl1" | "lvl3" | "lvl5" {
	return variant;
}

async function runKeygen(
	variant: SqisignVariant,
): Promise<{ pk: Uint8Array; sk: Uint8Array }> {
	const module = await getModule(variant);
	const p = prefix(variant);
	const seed = crypto.getRandomValues(
		new Uint8Array(
			wasmExport(
				module[
					`_sqisign_${p}_seed_bytes` as keyof SqisignModule
				] as () => number,
			),
		),
	);
	return withStack(module, (alloc) => {
		const pkPtr = alloc(
			wasmExport(
				module[
					`_sqisign_${p}_public_key_bytes` as keyof SqisignModule
				] as () => number,
			),
		);
		const skPtr = alloc(
			wasmExport(
				module[
					`_sqisign_${p}_private_key_bytes` as keyof SqisignModule
				] as () => number,
			),
		);
		const seedPtr = writeBytes(module, alloc, seed);
		const rc = wasmExportWithArgs(
			module[`_sqisign_${p}_keypair_seeded` as keyof SqisignModule] as (
				pk: number,
				sk: number,
				seed: number,
			) => number,
			pkPtr,
			skPtr,
			seedPtr,
		);
		if (rc !== 0)
			throw new Error(`SQISign ${variant} keypair failed with code ${rc}`);
		return {
			pk: readBytes(
				module,
				pkPtr,
				wasmExport(
					module[
						`_sqisign_${p}_public_key_bytes` as keyof SqisignModule
					] as () => number,
				),
			),
			sk: readBytes(
				module,
				skPtr,
				wasmExport(
					module[
						`_sqisign_${p}_private_key_bytes` as keyof SqisignModule
					] as () => number,
				),
			),
		};
	});
}

async function runSign(
	variant: SqisignVariant,
	msg: Uint8Array,
	sk: Uint8Array,
): Promise<Uint8Array> {
	const module = await getModule(variant);
	const p = prefix(variant);
	const seed = crypto.getRandomValues(
		new Uint8Array(
			wasmExport(
				module[
					`_sqisign_${p}_seed_bytes` as keyof SqisignModule
				] as () => number,
			),
		),
	);
	return withStack(module, (alloc) => {
		const sigPtr = alloc(
			wasmExport(
				module[
					`_sqisign_${p}_signature_bytes` as keyof SqisignModule
				] as () => number,
			),
		);
		const msgPtr = writeBytes(module, alloc, msg);
		const skPtr = writeBytes(module, alloc, sk);
		const seedPtr = writeBytes(module, alloc, seed);
		const rc = wasmExportWithArgs(
			module[`_sqisign_${p}_sign_seeded` as keyof SqisignModule] as (
				sig: number,
				msg: number,
				msgLen: number,
				sk: number,
				seed: number,
			) => number,
			sigPtr,
			msgPtr,
			msg.length,
			skPtr,
			seedPtr,
		);
		if (rc !== 0)
			throw new Error(`SQISign ${variant} sign failed with code ${rc}`);
		return readBytes(
			module,
			sigPtr,
			wasmExport(
				module[
					`_sqisign_${p}_signature_bytes` as keyof SqisignModule
				] as () => number,
			),
		);
	});
}

async function runVerify(
	variant: SqisignVariant,
	sig: Uint8Array,
	msg: Uint8Array,
	pk: Uint8Array,
): Promise<boolean> {
	const module = await getModule(variant);
	const p = prefix(variant);
	return withStack(module, (alloc) => {
		const sigPtr = writeBytes(module, alloc, sig);
		const msgPtr = writeBytes(module, alloc, msg);
		const pkPtr = writeBytes(module, alloc, pk);
		return (
			wasmExportWithArgs(
				module[`_sqisign_${p}_verify` as keyof SqisignModule] as (
					sig: number,
					sigLen: number,
					msg: number,
					msgLen: number,
					pk: number,
				) => number,
				sigPtr,
				sig.length,
				msgPtr,
				msg.length,
				pkPtr,
			) === 0
		);
	});
}

async function handleOp(request: WorkerOp): Promise<WorkerResult> {
	try {
		if (request.op === "keygen") {
			const { pk, sk } = await runKeygen(request.variant);
			return { id: request.id, ok: true, pk, sk };
		}
		if (request.op === "sign") {
			const sig = await runSign(
				request.variant,
				asBytes(request.msg),
				asBytes(request.sk),
			);
			return { id: request.id, ok: true, sig };
		}
		const valid = await runVerify(
			request.variant,
			asBytes(request.sig),
			asBytes(request.msg),
			asBytes(request.pk),
		);
		return { id: request.id, ok: true, valid };
	} catch (error) {
		return {
			id: request.id,
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

const workerScope = self as unknown as {
	onmessage: ((event: MessageEvent<WorkerOp>) => void) | null;
	postMessage: (message: WorkerResult, transfer?: Transferable[]) => void;
};

workerScope.onmessage = (event: MessageEvent<WorkerOp>): void => {
	void handleOp(event.data).then((result) => {
		const transfers: Transferable[] = [];
		if (result.ok) {
			if (result.pk) transfers.push(result.pk.buffer);
			if (result.sk) transfers.push(result.sk.buffer);
			if (result.sig) transfers.push(result.sig.buffer);
		}
		workerScope.postMessage(result, transfers);
	});
};

import { loadFnDsa512, loadFnDsa1024 } from "../fndsa.js";
import { loadMlDsa3, loadMlDsa5 } from "../mldsa.js";
import { loadSlhDsa128, loadSlhDsa192, loadSlhDsa256 } from "../slhdsa.js";
import {
	loadSqisignLvl1,
	loadSqisignLvl3,
	loadSqisignLvl5,
} from "../sqisign.js";
import type { IFnDsa } from "../types.js";

/**
 * Browser signature variants that can store an encrypted private key in OPFS.
 * `*-webgpu` ids use the same WASM as the matching SQIsign level — no keys go
 * to the GPU.
 */
export const OPFS_SK_ALGORITHMS = [
	"sqisign-lvl1",
	"sqisign-lvl3",
	"sqisign-lvl5",
	"sqisign-lvl1-webgpu",
	"sqisign-lvl3-webgpu",
	"sqisign-lvl5-webgpu",
	"ml-dsa-3",
	"ml-dsa-5",
	"fn-dsa-512",
	"fn-dsa-1024",
	"slh-dsa-128",
	"slh-dsa-192",
	"slh-dsa-256",
] as const;

export type OpfsSkAlgorithm = (typeof OPFS_SK_ALGORITHMS)[number];

/** Storage / WASM identity — webGPU aliases collapse to the WASM level. */
export type OpfsSkStorageId =
	| "sqisign-lvl1"
	| "sqisign-lvl3"
	| "sqisign-lvl5"
	| "ml-dsa-3"
	| "ml-dsa-5"
	| "fn-dsa-512"
	| "fn-dsa-1024"
	| "slh-dsa-128"
	| "slh-dsa-192"
	| "slh-dsa-256";

const STORAGE_BY_ALGORITHM: Record<OpfsSkAlgorithm, OpfsSkStorageId> = {
	"sqisign-lvl1": "sqisign-lvl1",
	"sqisign-lvl3": "sqisign-lvl3",
	"sqisign-lvl5": "sqisign-lvl5",
	"sqisign-lvl1-webgpu": "sqisign-lvl1",
	"sqisign-lvl3-webgpu": "sqisign-lvl3",
	"sqisign-lvl5-webgpu": "sqisign-lvl5",
	"ml-dsa-3": "ml-dsa-3",
	"ml-dsa-5": "ml-dsa-5",
	"fn-dsa-512": "fn-dsa-512",
	"fn-dsa-1024": "fn-dsa-1024",
	"slh-dsa-128": "slh-dsa-128",
	"slh-dsa-192": "slh-dsa-192",
	"slh-dsa-256": "slh-dsa-256",
};

const LOADERS: Record<OpfsSkStorageId, () => Promise<IFnDsa>> = {
	"sqisign-lvl1": loadSqisignLvl1,
	"sqisign-lvl3": loadSqisignLvl3,
	"sqisign-lvl5": loadSqisignLvl5,
	"ml-dsa-3": loadMlDsa3,
	"ml-dsa-5": loadMlDsa5,
	"fn-dsa-512": loadFnDsa512,
	"fn-dsa-1024": loadFnDsa1024,
	"slh-dsa-128": loadSlhDsa128,
	"slh-dsa-192": loadSlhDsa192,
	"slh-dsa-256": loadSlhDsa256,
};

const schemeCache = new Map<OpfsSkStorageId, Promise<IFnDsa>>();

export function parseOpfsSkAlgorithm(value: string): OpfsSkAlgorithm {
	if ((OPFS_SK_ALGORITHMS as readonly string[]).includes(value)) {
		return value as OpfsSkAlgorithm;
	}
	throw new Error(`Unsupported OPFS sk algorithm: ${value}`);
}

export function opfsSkStorageId(algorithm: OpfsSkAlgorithm): OpfsSkStorageId {
	return STORAGE_BY_ALGORITHM[algorithm];
}

export function loadOpfsSkScheme(algorithm: OpfsSkAlgorithm): Promise<IFnDsa> {
	const storageId = opfsSkStorageId(algorithm);
	let pending = schemeCache.get(storageId);
	if (!pending) {
		pending = LOADERS[storageId]();
		schemeCache.set(storageId, pending);
	}
	return pending;
}

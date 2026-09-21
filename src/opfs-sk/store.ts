import type { OpfsSkStorageId } from "./algorithms.js";

export type OpfsSkRecord = {
	skEnc: Uint8Array;
	pk: Uint8Array;
};

export interface OpfsSkStore {
	write(
		slot: string,
		algorithm: OpfsSkStorageId,
		record: OpfsSkRecord,
	): Promise<void>;
	read(slot: string, algorithm: OpfsSkStorageId): Promise<OpfsSkRecord>;
	has(slot: string, algorithm: OpfsSkStorageId): Promise<boolean>;
}

export function memoryStoreKey(
	slot: string,
	algorithm: OpfsSkStorageId,
): string {
	return `${slot}/${algorithm}`;
}

export function createMemoryOpfsSkStore(): OpfsSkStore & {
	writeCount: number;
} {
	const records = new Map<string, OpfsSkRecord>();
	const store = {
		writeCount: 0,
		async write(
			slot: string,
			algorithm: OpfsSkStorageId,
			record: OpfsSkRecord,
		): Promise<void> {
			store.writeCount += 1;
			records.set(memoryStoreKey(slot, algorithm), {
				skEnc: new Uint8Array(record.skEnc),
				pk: new Uint8Array(record.pk),
			});
		},
		async read(
			slot: string,
			algorithm: OpfsSkStorageId,
		): Promise<OpfsSkRecord> {
			const record = records.get(memoryStoreKey(slot, algorithm));
			if (!record) {
				throw new Error("OPFS sk: no sealed key for this slot/algorithm");
			}
			return {
				skEnc: new Uint8Array(record.skEnc),
				pk: new Uint8Array(record.pk),
			};
		},
		async has(slot: string, algorithm: OpfsSkStorageId): Promise<boolean> {
			return records.has(memoryStoreKey(slot, algorithm));
		},
	};
	return store;
}

import type { OpfsSkStorageId } from "./algorithms.js";
import { asArrayBuffer, assertOpfsSkSlot } from "./bytes.js";
import type { OpfsSkRecord, OpfsSkStore } from "./store.js";

const ROOT_DIR = "qrr-opfs-sk";

type SyncAccessHandle = {
	write(buffer: BufferSource, options?: { at?: number }): number;
	read(buffer: BufferSource, options?: { at?: number }): number;
	getSize(): number;
	truncate(newSize: number): void;
	flush(): void;
	close(): void;
};

type FileHandleWithSync = FileSystemFileHandle & {
	createSyncAccessHandle(): Promise<SyncAccessHandle>;
};

function storageNavigator(): {
	storage: { getDirectory(): Promise<FileSystemDirectoryHandle> };
} {
	const nav = (
		globalThis as {
			navigator?: {
				storage?: { getDirectory(): Promise<FileSystemDirectoryHandle> };
			};
		}
	).navigator;
	if (!nav?.storage?.getDirectory) {
		throw new Error(
			"OPFS is not available in this worker (navigator.storage.getDirectory)",
		);
	}
	return { storage: nav.storage };
}

async function algorithmDir(
	slot: string,
	algorithm: OpfsSkStorageId,
): Promise<FileSystemDirectoryHandle> {
	const root = await storageNavigator().storage.getDirectory();
	const wallet = await root.getDirectoryHandle(ROOT_DIR, { create: true });
	const slotDir = await wallet.getDirectoryHandle(assertOpfsSkSlot(slot), {
		create: true,
	});
	return slotDir.getDirectoryHandle(algorithm, { create: true });
}

async function withSyncHandle<T>(
	dir: FileSystemDirectoryHandle,
	name: string,
	create: boolean,
	run: (handle: SyncAccessHandle) => T,
): Promise<T> {
	const file = (await dir.getFileHandle(name, {
		create,
	})) as FileHandleWithSync;
	if (typeof file.createSyncAccessHandle !== "function") {
		throw new Error(
			"FileSystemSyncAccessHandle is not available (dedicated Worker required)",
		);
	}
	const handle = await file.createSyncAccessHandle();
	try {
		return run(handle);
	} finally {
		handle.flush();
		handle.close();
	}
}

function writeAll(handle: SyncAccessHandle, bytes: Uint8Array): void {
	const buffer = asArrayBuffer(bytes);
	handle.truncate(0);
	handle.write(buffer, { at: 0 });
	handle.truncate(buffer.byteLength);
}

function readAll(handle: SyncAccessHandle): Uint8Array {
	const size = handle.getSize();
	const out = new Uint8Array(size);
	handle.read(out, { at: 0 });
	return out;
}

/** @internal Test helper for FileSystemSyncAccessHandle framing. */
export function writeOpfsSyncBytes(
	handle: SyncAccessHandle,
	bytes: Uint8Array,
): void {
	writeAll(handle, bytes);
}

/** @internal Test helper for FileSystemSyncAccessHandle framing. */
export function readOpfsSyncBytes(handle: SyncAccessHandle): Uint8Array {
	return readAll(handle);
}

export function createOpfsSyncStore(): OpfsSkStore {
	return {
		async write(
			slot: string,
			algorithm: OpfsSkStorageId,
			record: OpfsSkRecord,
		): Promise<void> {
			const dir = await algorithmDir(slot, algorithm);
			await withSyncHandle(dir, "sk.bin", true, (handle) => {
				writeAll(handle, record.skEnc);
			});
			await withSyncHandle(dir, "pk.bin", true, (handle) => {
				writeAll(handle, record.pk);
			});
		},
		async read(
			slot: string,
			algorithm: OpfsSkStorageId,
		): Promise<OpfsSkRecord> {
			const dir = await algorithmDir(slot, algorithm);
			const skEnc = await withSyncHandle(dir, "sk.bin", false, readAll);
			const pk = await withSyncHandle(dir, "pk.bin", false, readAll);
			if (skEnc.byteLength === 0) {
				throw new Error("OPFS sk: no sealed key for this slot/algorithm");
			}
			return { skEnc, pk };
		},
		async has(slot: string, algorithm: OpfsSkStorageId): Promise<boolean> {
			try {
				const dir = await algorithmDir(slot, algorithm);
				const skEnc = await withSyncHandle(dir, "sk.bin", false, readAll);
				return skEnc.byteLength > 0;
			} catch {
				return false;
			}
		},
	};
}

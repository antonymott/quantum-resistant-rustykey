import { describe, expect, it } from "vitest";
import { readOpfsSyncBytes, writeOpfsSyncBytes } from "./opfs-store";

class MemorySyncHandle {
	bytes = new Uint8Array();

	write(buffer: BufferSource, options?: { at?: number }): number {
		const src =
			buffer instanceof ArrayBuffer
				? new Uint8Array(buffer)
				: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		const at = options?.at ?? 0;
		const next = new Uint8Array(
			Math.max(this.bytes.byteLength, at + src.byteLength),
		);
		next.set(this.bytes);
		next.set(src, at);
		this.bytes = next;
		return src.byteLength;
	}

	read(buffer: BufferSource, options?: { at?: number }): number {
		const dest =
			buffer instanceof ArrayBuffer
				? new Uint8Array(buffer)
				: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		const at = options?.at ?? 0;
		const n = Math.min(dest.byteLength, this.bytes.byteLength - at);
		dest.set(this.bytes.subarray(at, at + n));
		return n;
	}

	getSize(): number {
		return this.bytes.byteLength;
	}

	truncate(newSize: number): void {
		const next = new Uint8Array(newSize);
		next.set(this.bytes.subarray(0, Math.min(newSize, this.bytes.byteLength)));
		this.bytes = next;
	}

	flush(): void {}
	close(): void {}
}

describe("OPFS sync handle framing", () => {
	it("truncates leftover ciphertext when the new blob is shorter", () => {
		const handle = new MemorySyncHandle();
		writeOpfsSyncBytes(handle, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
		writeOpfsSyncBytes(handle, new Uint8Array([9, 10]));
		expect(readOpfsSyncBytes(handle)).toEqual(new Uint8Array([9, 10]));
	});
});

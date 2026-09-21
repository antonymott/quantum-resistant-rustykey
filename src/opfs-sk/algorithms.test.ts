import { describe, expect, it } from "vitest";
import {
	OPFS_SK_ALGORITHMS,
	opfsSkStorageId,
	parseOpfsSkAlgorithm,
} from "./algorithms";

describe("OPFS sk algorithms", () => {
	it("covers all four signature families and SQIsign webGPU aliases", () => {
		expect(OPFS_SK_ALGORITHMS).toHaveLength(13);
		expect(OPFS_SK_ALGORITHMS).toEqual(
			expect.arrayContaining([
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
			]),
		);
		expect(opfsSkStorageId("sqisign-lvl1-webgpu")).toBe("sqisign-lvl1");
		expect(opfsSkStorageId("sqisign-lvl3-webgpu")).toBe("sqisign-lvl3");
		expect(opfsSkStorageId("sqisign-lvl5-webgpu")).toBe("sqisign-lvl5");
	});

	it("rejects unknown algorithms instead of downgrading", () => {
		expect(() => parseOpfsSkAlgorithm("ed25519")).toThrow(/Unsupported/);
	});
});

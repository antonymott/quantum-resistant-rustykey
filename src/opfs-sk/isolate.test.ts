import { afterEach, describe, expect, it } from "vitest";
import { assertOpfsSkCrossOriginIsolated } from "./isolate";
import { loadOpfsSkWallet } from "./wallet";

const g = globalThis as {
	window?: unknown;
	WorkerGlobalScope?: unknown;
	crossOriginIsolated?: boolean;
};

function define(
	name: "window" | "WorkerGlobalScope" | "crossOriginIsolated",
	value: unknown,
): void {
	Object.defineProperty(globalThis, name, {
		value,
		configurable: true,
		writable: true,
	});
}

afterEach(() => {
	delete g.window;
	delete g.WorkerGlobalScope;
	delete g.crossOriginIsolated;
});

describe("OPFS sk isolation gate", () => {
	it("throws in Node (no window / worker)", async () => {
		expect(() => assertOpfsSkCrossOriginIsolated()).toThrow(/browser-only/);
		await expect(loadOpfsSkWallet()).rejects.toThrow(/browser-only/);
	});

	it("throws when the page is not cross-origin isolated", () => {
		define("window", {});
		define("crossOriginIsolated", false);
		expect(() => assertOpfsSkCrossOriginIsolated()).toThrow(
			/crossOriginIsolated/,
		);
	});

	it("accepts an isolated browser realm", () => {
		define("window", {});
		define("crossOriginIsolated", true);
		expect(() => assertOpfsSkCrossOriginIsolated()).not.toThrow();
	});

	it("accepts an isolated dedicated worker", () => {
		define("WorkerGlobalScope", {});
		define("crossOriginIsolated", true);
		expect(() => assertOpfsSkCrossOriginIsolated()).not.toThrow();
	});
});

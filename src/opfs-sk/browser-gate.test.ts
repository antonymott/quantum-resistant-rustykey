import { afterEach, describe, expect, it } from "vitest";
import {
	assertBrowserSkCeremonyAllowed,
	BROWSER_SK_CEREMONY_ERROR,
	OPFS_SK_WORKER_NAME,
} from "./browser-gate";

const g = globalThis as {
	window?: unknown;
	WorkerGlobalScope?: unknown;
	name?: string;
};

function define(
	name: "window" | "WorkerGlobalScope" | "name",
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
	delete g.name;
});

describe("assertBrowserSkCeremonyAllowed", () => {
	it("allows Node (no window / worker)", () => {
		expect(() => assertBrowserSkCeremonyAllowed()).not.toThrow();
	});

	it("blocks the browser UI thread", () => {
		define("window", {});
		expect(() => assertBrowserSkCeremonyAllowed()).toThrow(
			BROWSER_SK_CEREMONY_ERROR,
		);
	});

	it("blocks a non-wallet dedicated worker", () => {
		define("WorkerGlobalScope", {});
		define("name", "sqisign-accel");
		expect(() => assertBrowserSkCeremonyAllowed()).toThrow(/loadOpfsSkWallet/);
	});

	it("allows the OPFS encrypted-sk worker", () => {
		define("WorkerGlobalScope", {});
		define("name", OPFS_SK_WORKER_NAME);
		expect(() => assertBrowserSkCeremonyAllowed()).not.toThrow();
	});
});

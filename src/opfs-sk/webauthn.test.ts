import { afterEach, describe, expect, it, vi } from "vitest";
import { opfsSkTriggerWebAuthn } from "./webauthn";

const UV_AUTH_DATA = new Uint8Array(37);
UV_AUTH_DATA[32] = 0x05;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("opfsSkTriggerWebAuthn", () => {
	it("requires UV and returns PRF material from get()", async () => {
		const prfFirst = crypto.getRandomValues(new Uint8Array(32));
		const salt = crypto.getRandomValues(new Uint8Array(32));
		const get = vi.fn(async () => ({
			response: {
				authenticatorData: UV_AUTH_DATA.buffer,
			},
			getClientExtensionResults: () => ({
				prf: { results: { first: prfFirst } },
			}),
		}));
		vi.stubGlobal("navigator", { credentials: { get, create: vi.fn() } });

		const result = await opfsSkTriggerWebAuthn({
			mode: "get",
			publicKey: {
				challenge: new Uint8Array(32),
				rpId: "localhost",
				userVerification: "preferred",
			},
			salt,
		});

		expect(get).toHaveBeenCalled();
		const firstCall = get.mock.calls[0] as unknown as [
			{ publicKey: { userVerification: string } },
		];
		expect(firstCall[0].publicKey.userVerification).toBe("required");
		const getCall = get.mock.calls[0] as unknown as [
			{
				publicKey: {
					extensions: { prf: { eval: { first: ArrayBuffer } } };
				};
			},
		];
		expect(
			new Uint8Array(getCall[0].publicKey.extensions.prf.eval.first),
		).toEqual(salt);
		expect(result.prf.userVerified).toBe(true);
		expect(result.prf.prfOutput).toEqual(prfFirst);
		expect(result.prf.salt).toEqual(salt);
	});

	it("requires UV on create() as well as get()", async () => {
		const prfFirst = crypto.getRandomValues(new Uint8Array(32));
		const salt = crypto.getRandomValues(new Uint8Array(32));
		const create = vi.fn(async () => ({
			response: {
				authenticatorData: UV_AUTH_DATA.buffer,
			},
			getClientExtensionResults: () => ({
				prf: { results: { first: prfFirst } },
			}),
		}));
		vi.stubGlobal("navigator", { credentials: { get: vi.fn(), create } });

		await opfsSkTriggerWebAuthn({
			mode: "create",
			publicKey: {
				challenge: new Uint8Array(32),
				rp: { name: "test", id: "localhost" },
				user: {
					id: new Uint8Array(16),
					name: "demo",
					displayName: "demo",
				},
				pubKeyCredParams: [{ type: "public-key", alg: -7 }],
				authenticatorSelection: { userVerification: "preferred" },
			},
			salt,
		});

		const firstCall = create.mock.calls[0] as unknown as [
			{
				publicKey: {
					authenticatorSelection: { userVerification: string };
					extensions: { prf: Record<string, unknown> };
				};
			},
		];
		expect(firstCall[0].publicKey.authenticatorSelection.userVerification).toBe(
			"required",
		);
		expect(firstCall[0].publicKey.extensions).toEqual({ prf: {} });
	});
});

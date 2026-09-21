import { asArrayBuffer, requireOpfsSkBytes } from "./bytes.js";
import type { OpfsSkPrfMaterial } from "./lifecycle.js";
import { opfsSkPrfMaterialFromCeremony } from "./prf.js";

const UV_FLAG = 0x04;

type CredentialWithExtensions = PublicKeyCredential & {
	getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
};

function requireCredentials(): CredentialsContainer {
	if (typeof navigator === "undefined" || !navigator.credentials) {
		throw new Error("WebAuthn is not available in this runtime");
	}
	return navigator.credentials;
}

function withPrfEnable(
	extensions: AuthenticationExtensionsClientInputs | undefined,
): AuthenticationExtensionsClientInputs {
	return {
		...extensions,
		prf: {},
	} as AuthenticationExtensionsClientInputs;
}

function withPrfEval(
	extensions: AuthenticationExtensionsClientInputs | undefined,
	salt: Uint8Array,
): AuthenticationExtensionsClientInputs {
	return {
		...extensions,
		prf: {
			eval: {
				first: asArrayBuffer(salt),
			},
		},
	} as AuthenticationExtensionsClientInputs;
}

function userVerifiedFromAuthenticatorData(data: ArrayBuffer): boolean {
	const flags = new Uint8Array(data)[32];
	return flags !== undefined && (flags & UV_FLAG) !== 0;
}

function assertionUserVerified(credential: PublicKeyCredential): boolean {
	const response = credential.response as AuthenticatorResponse & {
		authenticatorData?: ArrayBuffer;
		getAuthenticatorData?: () => ArrayBuffer;
	};
	if (response.authenticatorData) {
		return userVerifiedFromAuthenticatorData(response.authenticatorData);
	}
	if (typeof response.getAuthenticatorData === "function") {
		return userVerifiedFromAuthenticatorData(response.getAuthenticatorData());
	}
	return false;
}

export type OpfsSkWebAuthnHandshake = {
	prf: OpfsSkPrfMaterial;
	credential: PublicKeyCredential;
};

/**
 * Trigger WebAuthn create/get with `userVerification: "required"`.
 * create() sends `prf: {}` (enable only — salt/eval in options breaks Safari).
 * get() sends `prf.eval.first` using the RP salt.
 */
export async function opfsSkTriggerWebAuthn(input: {
	mode: "create" | "get";
	publicKey:
		| PublicKeyCredentialCreationOptions
		| PublicKeyCredentialRequestOptions;
	salt: Uint8Array;
}): Promise<OpfsSkWebAuthnHandshake> {
	const salt = requireOpfsSkBytes(input.salt, "salt");
	const credentials = requireCredentials();
	let credential: PublicKeyCredential | null = null;

	if (input.mode === "create") {
		const publicKey = input.publicKey as PublicKeyCredentialCreationOptions;
		credential = (await credentials.create({
			publicKey: {
				...publicKey,
				authenticatorSelection: {
					...publicKey.authenticatorSelection,
					userVerification: "required",
				},
				extensions: withPrfEnable(publicKey.extensions),
			},
		})) as PublicKeyCredential | null;
	} else {
		const publicKey = input.publicKey as PublicKeyCredentialRequestOptions;
		credential = (await credentials.get({
			publicKey: {
				...publicKey,
				userVerification: "required",
				extensions: withPrfEval(publicKey.extensions, salt),
			},
		})) as PublicKeyCredential | null;
	}

	if (!credential) {
		throw new Error("WebAuthn returned no credential");
	}

	const withExt = credential as CredentialWithExtensions;
	const userVerified = assertionUserVerified(credential);
	return {
		prf: opfsSkPrfMaterialFromCeremony({
			extensionResults: withExt.getClientExtensionResults(),
			salt,
			userVerified,
		}),
		credential,
	};
}

import {
	slh_dsa_sha2_128s,
	slh_dsa_sha2_192s,
	slh_dsa_sha2_256s,
} from "@noble/post-quantum/slh-dsa.js";
import { asBytes, toHex } from "./signature-common.js";
import type { BytesLike, IFnDsa, KeyPair, SlhDsaVariant } from "./types.js";

type SlhDsaImpl = typeof slh_dsa_sha2_128s;

function getImpl(variant: SlhDsaVariant): SlhDsaImpl {
	if (variant === "sha2_192s") return slh_dsa_sha2_192s;
	if (variant === "sha2_256s") return slh_dsa_sha2_256s;
	return slh_dsa_sha2_128s;
}

class SlhDsaWrapper implements IFnDsa {
	constructor(private readonly variant: SlhDsaVariant) {}

	private impl(): SlhDsaImpl {
		return getImpl(this.variant);
	}

	keypair(): KeyPair {
		const pairPromise = Promise.resolve().then(() => {
			const { secretKey, publicKey } = this.impl().keygen();
			return { public_key: publicKey, private_key: secretKey };
		});

		return {
			get: (key: "public_key" | "private_key") =>
				pairPromise.then((pair) =>
					key === "public_key" ? pair.public_key : pair.private_key,
				),
		};
	}

	sign(message: BytesLike, private_key: BytesLike): Promise<Uint8Array> {
		return Promise.resolve(private_key).then((sk) =>
			this.impl().sign(asBytes(message), asBytes(sk)),
		);
	}

	verify(
		signature: BytesLike,
		message: BytesLike,
		public_key: BytesLike,
	): Promise<boolean> {
		return Promise.all([
			Promise.resolve(signature),
			Promise.resolve(message),
			Promise.resolve(public_key),
		]).then(([sig, msg, pk]) =>
			this.impl().verify(asBytes(sig), asBytes(msg), asBytes(pk)),
		);
	}

	buffer_to_string(value: BytesLike): string {
		if (typeof value === "string") return value;
		return toHex(asBytes(value));
	}
}

export async function loadSlhDsa128(): Promise<IFnDsa> {
	return new SlhDsaWrapper("sha2_128s");
}

export async function loadSlhDsa192(): Promise<IFnDsa> {
	return new SlhDsaWrapper("sha2_192s");
}

export async function loadSlhDsa256(): Promise<IFnDsa> {
	return new SlhDsaWrapper("sha2_256s");
}

import type { OpfsSkAlgorithm } from "./algorithms.js";

export type OpfsSkWorkerRequest =
	| {
			id: number;
			op: "keygen";
			algorithm: OpfsSkAlgorithm;
			slot: string;
			prfOutput: Uint8Array;
			salt: Uint8Array;
	  }
	| {
			id: number;
			op: "sign";
			algorithm: OpfsSkAlgorithm;
			slot: string;
			message: Uint8Array;
			prfOutput: Uint8Array;
			salt: Uint8Array;
	  }
	| {
			id: number;
			op: "verify";
			algorithm: OpfsSkAlgorithm;
			signature: Uint8Array;
			message: Uint8Array;
			publicKey: Uint8Array;
	  }
	| {
			id: number;
			op: "has";
			algorithm: OpfsSkAlgorithm;
			slot: string;
	  }
	| {
			id: number;
			op: "publicKey";
			algorithm: OpfsSkAlgorithm;
			slot: string;
	  };

export type OpfsSkWorkerResponse =
	| {
			id: number;
			ok: true;
			publicKey?: Uint8Array;
			signature?: Uint8Array;
			exists?: boolean;
			valid?: boolean;
	  }
	| { id: number; ok: false; error: string };

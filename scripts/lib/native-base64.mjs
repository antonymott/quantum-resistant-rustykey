import { readFileSync, writeFileSync } from "node:fs";

const EMSCRIPTEN_NATIVE = `function intArrayFromBase64(s) {
      return Uint8Array.fromBase64(s);
    }`;

/** Emscripten data-URI decoder: `atob` byte loop (browser glue). */
const EMSCRIPTEN_ATOB_RE =
	/function intArrayFromBase64\(s\) \{\s*var decoded = atob\(s\);\s*var bytes = new Uint8Array\(decoded\.length\);\s*for \(var i = 0; i < decoded\.length; \+\+i\) \{\s*bytes\[i\] = decoded\.charCodeAt\(i\);\s*\}\s*return bytes;\s*\}/;

/** Emscripten data-URI decoder: Node `Buffer.from` + `atob` fallback. */
const EMSCRIPTEN_BUFFER_ATOB_RE =
	/function intArrayFromBase64\(s\) \{\s*if \(typeof ENVIRONMENT_IS_NODE != "undefined" && ENVIRONMENT_IS_NODE\) \{\s*var buf = Buffer\.from\(s, "base64"\);\s*return new Uint8Array\(buf\.buffer, buf\.byteOffset, buf\.length\);\s*\}\s*var decoded = atob\(s\);\s*var bytes = new Uint8Array\(decoded\.length\);\s*for \(var i = 0; i < decoded\.length; \+\+i\) \{\s*bytes\[i\] = decoded\.charCodeAt\(i\);\s*\}\s*return bytes;\s*\}/;

export function rewriteEmscriptenBase64(source) {
	if (source.includes("var decoded = atob(s);")) {
		let next = source.replace(EMSCRIPTEN_BUFFER_ATOB_RE, EMSCRIPTEN_NATIVE);
		if (next === source) {
			next = source.replace(EMSCRIPTEN_ATOB_RE, EMSCRIPTEN_NATIVE);
		}
		if (next === source) {
			throw new Error(
				"Found Emscripten atob() but the expected intArrayFromBase64 body did not match",
			);
		}
		return next;
	}
	return source;
}

export function rewriteVendorBase64(path) {
	const source = readFileSync(path, "utf8");
	const next = rewriteEmscriptenBase64(source);
	if (next !== source) {
		writeFileSync(path, next);
	}
}

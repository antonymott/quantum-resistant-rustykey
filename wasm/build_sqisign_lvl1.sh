#!/usr/bin/env bash
# Build SQISign level-1 WASM: CMake (Emscripten) + final emcc link with wasm wrapper.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WASM_DIR="$ROOT/wasm"
SQISIGN_SRC="${SQISIGN_NATIVE_DIR:-$ROOT/vendor/sqisign-native}"
BUILD_DIR="$WASM_DIR/build-sqisign-cmake"
OUT_JS="$WASM_DIR/build/sqisign-lvl1-module.js"
WRAPPER="$WASM_DIR/wasm_wrapper_sqisign_lvl1.c"
IMAGE="${EMSCRIPTEN_DOCKER_IMAGE:-emscripten/emsdk:3.1.51}"

# Prefer SQISIGN_MAKE_JOBS=1 under REQUIRE_REPRODUCIBLE for deterministic archives.
NJOBS="${SQISIGN_MAKE_JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-1702512000}"
export TZ="${TZ:-UTC}"
export LANG="${LANG:-C}"
export LC_ALL="${LC_ALL:-C}"

if [[ ! -f "$SQISIGN_SRC/CMakeLists.txt" ]]; then
	echo "Missing SQISign sources at $SQISIGN_SRC (expected CMakeLists.txt)." >&2
	exit 1
fi

if [[ ! -f "$WRAPPER" ]]; then
	echo "Missing wrapper $WRAPPER" >&2
	exit 1
fi

mkdir -p "$WASM_DIR/build"

WASM_LINK_FLAGS=(
	-s WASM=1
	-s EXPORTED_RUNTIME_METHODS='["getValue","setValue","stackSave","stackAlloc","stackRestore"]'
	-s ALLOW_MEMORY_GROWTH=1
	-s STACK_SIZE=8388608
	-s MODULARIZE=1
	-s EXPORT_ES6=1
	-s ENVIRONMENT='web,webview,worker,node'
	--no-entry
	-s SINGLE_FILE
	-s EXIT_RUNTIME=0
	-s INCOMING_MODULE_JS_API=[]
	-s EXPORT_NAME='SqisignLvl1Module'
	-s EXPORTED_FUNCTIONS='["_sqisign_lvl1_public_key_bytes","_sqisign_lvl1_private_key_bytes","_sqisign_lvl1_signature_bytes","_sqisign_lvl1_seed_bytes","_sqisign_lvl1_keypair_seeded","_sqisign_lvl1_sign_seeded","_sqisign_lvl1_verify"]'
)

run_link() {
	local mp_bytes gmp_limb_bits
	mp_bytes="$(grep '^MP_LIMB_T_BYTES:INTERNAL=' "$BUILD_DIR/CMakeCache.txt" | cut -d= -f2)"
	gmp_limb_bits=$((mp_bytes * 8))

	local -a group=(
		-Wl,--start-group
		"$BUILD_DIR/libGMP.a"
		"$BUILD_DIR/src/common/generic/libsqisign_common_test.a"
		"$BUILD_DIR/src/mp/ref/generic/libsqisign_mp_generic.a"
		"$BUILD_DIR/src/gf/ref/lvl1/libsqisign_gf_lvl1.a"
		"$BUILD_DIR/src/precomp/ref/lvl1/libsqisign_precomp_lvl1.a"
		"$BUILD_DIR/src/ec/ref/lvl1/libsqisign_ec_lvl1.a"
		"$BUILD_DIR/src/hd/ref/lvl1/libsqisign_hd_lvl1.a"
		"$BUILD_DIR/src/verification/ref/lvl1/libsqisign_verification_lvl1.a"
		"$BUILD_DIR/src/quaternion/ref/generic/libsqisign_quaternion_generic.a"
		"$BUILD_DIR/src/id2iso/ref/lvl1/libsqisign_id2iso_lvl1.a"
		"$BUILD_DIR/src/signature/ref/lvl1/libsqisign_signature_lvl1.a"
		"$BUILD_DIR/src/libsqisign_lvl1_test.a"
		"$BUILD_DIR/src/libsqisign_lvl1_test_nistapi.a"
		-Wl,--end-group
	)

	emcc -O3 -std=c11 \
		-DSQISIGN_BUILD_TYPE_REF -DSQISIGN_GF_IMPL_REF -DMINI_GMP -DENABLE_SIGN \
		"-DGMP_LIMB_BITS=${gmp_limb_bits}" \
		-DSQISIGN_VARIANT=lvl1 \
		-I"$SQISIGN_SRC/include" -I"$SQISIGN_SRC/src/nistapi/lvl1" \
		"$WRAPPER" -o "$OUT_JS" \
		"${WASM_LINK_FLAGS[@]}" \
		"${group[@]}"
}

if command -v emcmake >/dev/null 2>&1 && command -v emcc >/dev/null 2>&1; then
	rm -rf "$BUILD_DIR"
	mkdir -p "$BUILD_DIR"
	(
		cd "$BUILD_DIR"
		emcmake cmake "$SQISIGN_SRC" \
			-DSQISIGN_BUILD_TYPE=ref \
			-DGMP_LIBRARY=MINI \
			-DCMAKE_BUILD_TYPE=Release \
			-DENABLE_STRICT=OFF
		emmake make -j"$NJOBS" sqisign_lvl1_test_nistapi
	)
	run_link
elif command -v docker >/dev/null 2>&1; then
	docker run --rm \
		-e "SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}" \
		-e "TZ=${TZ}" \
		-e "LANG=${LANG}" \
		-e "LC_ALL=${LC_ALL}" \
		-e "SQISIGN_MAKE_JOBS=${NJOBS}" \
		-e "SQISIGN_NATIVE_DIR=/work/vendor/sqisign-native" \
		-v "$ROOT:/work" \
		-w /work/wasm \
		"$IMAGE" \
		bash -lc 'bash ./build_sqisign_lvl1.sh'
else
	echo "Need emcc (Emscripten) or Docker with image $IMAGE to build SQISign WASM." >&2
	exit 1
fi

if [[ ! -f "$OUT_JS" ]]; then
	echo "Expected output missing: $OUT_JS" >&2
	exit 1
fi

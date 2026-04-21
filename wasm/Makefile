# PQC wasm builds via Emscripten.

.PHONY: build clean all
.DEFAULT_GOAL := all

MLKEM_NATIVE_DIR ?= ../vendor/mlkem-native
FALCON_REF_DIR ?= ../vendor/falcon-ref
MLDSA_NATIVE_DIR ?= ../vendor/mldsa-native

CC = emcc
CFLAGS = -O3 -Wall -Wextra -DEMSCRIPTEN

WASM_FLAGS_SHARED = -s WASM=1 \
	-s EXPORTED_RUNTIME_METHODS='["getValue","setValue","stackSave","stackAlloc","stackRestore"]' \
	-s ALLOW_MEMORY_GROWTH=0 \
	-s STACK_SIZE=1048576 \
	-s MODULARIZE=1 \
	-s EXPORT_ES6=1 \
	-s ENVIRONMENT='web,webview,worker' \
	--no-entry \
	-s SINGLE_FILE \
	-s EXIT_RUNTIME=0 \
	-s INCOMING_MODULE_JS_API=[]

ifeq (,$(findstring $(CROSS_PREFIX),$(CC)))
CC := $(CROSS_PREFIX)$(CC)
endif

MLK_PREFIX := $(MLKEM_NATIVE_DIR)/mlkem
MLK_SOURCE := $(wildcard $(MLK_PREFIX)/src/*.c) \
	$(wildcard $(MLK_PREFIX)/src/**/*.c) \
	$(wildcard $(MLK_PREFIX)/src/**/**/*.c) \
	$(wildcard $(MLK_PREFIX)/src/**/**/**/*.c)
FALCON_SOURCE := $(wildcard $(FALCON_REF_DIR)/*.c)
MLDSA_SOURCE := $(MLDSA_NATIVE_DIR)/mldsa/mldsa_native.c

BUILD_DIR = build
BINARY_768 = $(BUILD_DIR)/wasm-module.js
BINARY_512 = $(BUILD_DIR)/wasm-module-512.js
BINARY_1024 = $(BUILD_DIR)/wasm-module-1024.js
BINARY_FALCON_512 = $(BUILD_DIR)/falcon-512-module.js
BINARY_FALCON_1024 = $(BUILD_DIR)/falcon-1024-module.js
BINARY_MLDSA_65 = $(BUILD_DIR)/mldsa-65-module.js
BINARY_MLDSA_87 = $(BUILD_DIR)/mldsa-87-module.js
BINARIES = $(BINARY_768) $(BINARY_512) $(BINARY_1024) \
	$(BINARY_FALCON_512) $(BINARY_FALCON_1024) \
	$(BINARY_MLDSA_65) $(BINARY_MLDSA_87)

CFLAGS_BASE := \
	-Wall \
	-Wextra \
	-Wno-long-long \
	-Wno-unknown-pragmas \
	-Wno-unused-command-line-argument \
	-fomit-frame-pointer \
	-std=c99 \
	-pedantic \
	-O3 \
	$(CFLAGS)

MLKEM_CFLAGS_COMMON := $(CFLAGS_BASE) -I$(MLKEM_NATIVE_DIR)/mlkem \
	-DMLK_CONFIG_NAMESPACE_PREFIX=mlkem
FALCON_CFLAGS_COMMON := $(CFLAGS_BASE) -I$(FALCON_REF_DIR) \
	-DFALCON_FPNATIVE=1 \
	-DFALCON_AVX2=0 \
	-DFALCON_FMA=0 \
	-DFALCON_ASM_CORTEXM4=0
MLDSA_CFLAGS_COMMON := $(CFLAGS_BASE) -I$(MLDSA_NATIVE_DIR)/mldsa

$(BINARY_768): private CFLAGS := $(MLKEM_CFLAGS_COMMON) -DMLK_CONFIG_PARAMETER_SET=768
$(BINARY_768): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MLKEM768Module'" \
	-s EXPORTED_FUNCTIONS='["_mlkem768_keypair_derand","_mlkem768_enc_derand","_mlkem768_dec"]'

$(BINARY_768): $(MLK_SOURCE) wasm_wrapper_768.c
	@test -f "$(MLK_PREFIX)/mlkem_native.h" || (echo "Set MLKEM_NATIVE_DIR to mlkem-native repo root (expected $(MLK_PREFIX)/mlkem_native.h)"; exit 1)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

$(BINARY_512): private CFLAGS := $(MLKEM_CFLAGS_COMMON) -DMLK_CONFIG_PARAMETER_SET=512
$(BINARY_512): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MLKEM512Module'" \
	-s EXPORTED_FUNCTIONS='["_mlkem512_keypair_derand","_mlkem512_enc_derand","_mlkem512_dec"]'

$(BINARY_512): $(MLK_SOURCE) wasm_wrapper_512.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

$(BINARY_1024): private CFLAGS := $(MLKEM_CFLAGS_COMMON) -DMLK_CONFIG_PARAMETER_SET=1024
$(BINARY_1024): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MLKEM1024Module'" \
	-s EXPORTED_FUNCTIONS='["_mlkem1024_keypair_derand","_mlkem1024_enc_derand","_mlkem1024_dec"]'

$(BINARY_1024): $(MLK_SOURCE) wasm_wrapper_1024.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

$(BINARY_FALCON_512): private CFLAGS := $(FALCON_CFLAGS_COMMON)
$(BINARY_FALCON_512): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'Falcon512Module'" \
	-s EXPORTED_FUNCTIONS='["_falcon512_public_key_bytes","_falcon512_private_key_bytes","_falcon512_signature_bytes","_falcon512_seed_bytes","_falcon512_keypair_seeded","_falcon512_sign_seeded","_falcon512_verify"]'

$(BINARY_FALCON_512): $(FALCON_SOURCE) wasm_wrapper_falcon_512.c
	@test -f "$(FALCON_REF_DIR)/falcon.h" || (echo "Missing Falcon reference source at $(FALCON_REF_DIR)"; exit 1)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -lm -o $@

$(BINARY_FALCON_1024): private CFLAGS := $(FALCON_CFLAGS_COMMON)
$(BINARY_FALCON_1024): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'Falcon1024Module'" \
	-s EXPORTED_FUNCTIONS='["_falcon1024_public_key_bytes","_falcon1024_private_key_bytes","_falcon1024_signature_bytes","_falcon1024_seed_bytes","_falcon1024_keypair_seeded","_falcon1024_sign_seeded","_falcon1024_verify"]'

$(BINARY_FALCON_1024): $(FALCON_SOURCE) wasm_wrapper_falcon_1024.c
	@test -f "$(FALCON_REF_DIR)/falcon.h" || (echo "Missing Falcon reference source at $(FALCON_REF_DIR)"; exit 1)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -lm -o $@

$(BINARY_MLDSA_65): private CFLAGS := $(MLDSA_CFLAGS_COMMON) \
	-DMLD_CONFIG_PARAMETER_SET=65 \
	-DMLD_CONFIG_NAMESPACE_PREFIX=mldsa65
$(BINARY_MLDSA_65): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MlDsa65Module'" \
	-s EXPORTED_FUNCTIONS='["_mldsa65_public_key_bytes","_mldsa65_private_key_bytes","_mldsa65_signature_bytes","_mldsa65_seed_bytes","_mldsa65_random_bytes","_mldsa65_keypair_seeded","_mldsa65_sign_seeded","_mldsa65_verify_signature"]'

$(BINARY_MLDSA_65): $(MLDSA_SOURCE) wasm_wrapper_mldsa_65.c
	@test -f "$(MLDSA_NATIVE_DIR)/mldsa/mldsa_native.h" || (echo "Missing mldsa-native source at $(MLDSA_NATIVE_DIR)"; exit 1)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

$(BINARY_MLDSA_87): private CFLAGS := $(MLDSA_CFLAGS_COMMON) \
	-DMLD_CONFIG_PARAMETER_SET=87 \
	-DMLD_CONFIG_NAMESPACE_PREFIX=mldsa87
$(BINARY_MLDSA_87): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MlDsa87Module'" \
	-s EXPORTED_FUNCTIONS='["_mldsa87_public_key_bytes","_mldsa87_private_key_bytes","_mldsa87_signature_bytes","_mldsa87_seed_bytes","_mldsa87_random_bytes","_mldsa87_keypair_seeded","_mldsa87_sign_seeded","_mldsa87_verify_signature"]'

$(BINARY_MLDSA_87): $(MLDSA_SOURCE) wasm_wrapper_mldsa_87.c
	@test -f "$(MLDSA_NATIVE_DIR)/mldsa/mldsa_native.h" || (echo "Missing mldsa-native source at $(MLDSA_NATIVE_DIR)"; exit 1)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

all: build

build: $(BINARIES)

clean:
	rm -rf $(BUILD_DIR)

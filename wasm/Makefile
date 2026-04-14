# ML-KEM wasm builds (mlkem-native + Emscripten). SPDX: CC-BY-4.0 (Makefile pattern from mlkem-wasm)

.PHONY: build clean all
.DEFAULT_GOAL := all

# Path to pq-code-package/mlkem-native checkout (see README).
MLKEM_NATIVE_DIR ?= ../vendor/mlkem-native

CC = emcc
CFLAGS = -O3 -Wall -Wextra -DEMSCRIPTEN

WASM_FLAGS_SHARED = -s WASM=1 \
	-s EXPORTED_RUNTIME_METHODS='["getValue","setValue","stackSave","stackAlloc","stackRestore"]' \
	-s ALLOW_MEMORY_GROWTH=0 \
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

CFLAGS_INCLUDES = -I$(MLKEM_NATIVE_DIR)/mlkem

BUILD_DIR = build
BINARY_768 = $(BUILD_DIR)/wasm-module.js
BINARY_512 = $(BUILD_DIR)/wasm-module-512.js
BINARY_1024 = $(BUILD_DIR)/wasm-module-1024.js
BINARIES = $(BINARY_768) $(BINARY_512) $(BINARY_1024)

CFLAGS_COMMON := \
	-Wall \
	-Wextra \
	-Werror \
	-Wshadow \
	-Wpointer-arith \
	-Wredundant-decls \
	-Wno-long-long \
	-Wno-unknown-pragmas \
	-Wno-unused-command-line-argument \
	-fomit-frame-pointer \
	-std=c99 \
	-pedantic \
	-MMD \
	-O3 \
	$(CFLAGS_INCLUDES) \
	$(CFLAGS)

CFLAGS_COMMON += -DMLK_CONFIG_NAMESPACE_PREFIX=mlkem

$(BINARY_768): private CFLAGS := $(CFLAGS_COMMON) -DMLK_CONFIG_PARAMETER_SET=768
$(BINARY_768): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MLKEM768Module'" \
	-s EXPORTED_FUNCTIONS='["_mlkem768_keypair_derand","_mlkem768_enc_derand","_mlkem768_dec"]'

$(BINARY_768): $(MLK_SOURCE) wasm_wrapper_768.c
	@test -f "$(MLK_PREFIX)/mlkem_native.h" || (echo "Set MLKEM_NATIVE_DIR to mlkem-native repo root (expected $(MLK_PREFIX)/mlkem_native.h)"; exit 1)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

$(BINARY_512): private CFLAGS := $(CFLAGS_COMMON) -DMLK_CONFIG_PARAMETER_SET=512
$(BINARY_512): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MLKEM512Module'" \
	-s EXPORTED_FUNCTIONS='["_mlkem512_keypair_derand","_mlkem512_enc_derand","_mlkem512_dec"]'

$(BINARY_512): $(MLK_SOURCE) wasm_wrapper_512.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

$(BINARY_1024): private CFLAGS := $(CFLAGS_COMMON) -DMLK_CONFIG_PARAMETER_SET=1024
$(BINARY_1024): private WASM_FLAGS := $(WASM_FLAGS_SHARED) \
	-s EXPORT_NAME="'MLKEM1024Module'" \
	-s EXPORTED_FUNCTIONS='["_mlkem1024_keypair_derand","_mlkem1024_enc_derand","_mlkem1024_dec"]'

$(BINARY_1024): $(MLK_SOURCE) wasm_wrapper_1024.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(WASM_FLAGS) $^ -o $@

all: build

build: $(BINARIES)

clean:
	rm -rf $(BUILD_DIR)

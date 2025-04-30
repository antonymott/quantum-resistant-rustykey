cmake_minimum_required(VERSION 3.29)
project(kyber_crystals_wasm)

set(CMAKE_CXX_STANDARD 17)

file(GLOB MLKEM1024_SOURCES
        PQClean/common/*.c
        PQClean/crypto_kem/ml-kem-1024/clean/*.c)

file(GLOB MLKEM768_SOURCES
		PQClean/common/*.c
		PQClean/crypto_kem/ml-kem-768/clean/*.c)

file(GLOB MLKEM512_SOURCES
		PQClean/common/*.c
		PQClean/crypto_kem/ml-kem-512/clean/*.c)

list(REMOVE_ITEM SOURCES ${CMAKE_CURRENT_LIST_DIR}/PQClean/common/randombytes.c)

add_executable(${PROJECT_NAME}_engine
		libsodium/src/libsodium/randombytes/sysrandom/randombytes_sysrandom.c
		libsodium/src/libsodium/randombytes/randombytes.c
		libsodium/src/libsodium/crypto_stream/chacha20/stream_chacha20.c
		libsodium/src/libsodium/crypto_stream/chacha20/ref/chacha20_ref.c
		libsodium/src/libsodium/sodium/utils.c
		${MLKEM1024_SOURCES}
		${MLKEM768_SOURCES}
		${MLKEM512_SOURCES}
		main.cpp)

target_include_directories(${PROJECT_NAME}_engine
		PRIVATE
		libsodium/src/libsodium/include/sodium
		pqclean/common
		pqclean/crypto_kem
		$ENV{EMSDK}/upstream/emscripten/cache/sysroot/include)

target_link_libraries(${PROJECT_NAME}_engine
        PRIVATE
        embind)

target_link_options(${PROJECT_NAME}_engine PRIVATE
		"-sMODULARIZE=1"
		"-sEXPORT_ES6=1"
		"-sEXPORT_NAME=kyber_crystals_wasm_engine"
		"-sENVIRONMENT=node,worker"
		"-sUSE_ES6_IMPORT_META=1"
		"-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
	  )
	  
set(CMAKE_EXECUTABLE_SUFFIX ".js")

install(TARGETS ${PROJECT_NAME}_engine
		ARCHIVE DESTINATION ${CMAKE_INSTALL_PREFIX}
		LIBRARY DESTINATION ${CMAKE_INSTALL_PREFIX}
		RUNTIME DESTINATION ${CMAKE_INSTALL_PREFIX})
install(FILES ${CMAKE_BINARY_DIR}/kyber_crystals_wasm_engine.wasm DESTINATION ${CMAKE_INSTALL_PREFIX})
install(FILES ${CMAKE_CURRENT_LIST_DIR}/test.html DESTINATION ${CMAKE_INSTALL_PREFIX})

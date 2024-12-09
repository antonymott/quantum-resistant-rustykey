cmake_minimum_required(VERSION 3.29)
project(kyber_crystals_wasm)

set(CMAKE_CXX_STANDARD 17)

file(GLOB SOURCES
        PQClean/common/*.c
        PQClean/crypto_kem/ml-kem-1024/clean/*.c)

list(REMOVE_ITEM SOURCES ${CMAKE_CURRENT_LIST_DIR}/PQClean/common/randombytes.c)

add_executable(${PROJECT_NAME}_engine
		libsodium/src/libsodium/randombytes/sysrandom/randombytes_sysrandom.c
		libsodium/src/libsodium/randombytes/randombytes.c
		libsodium/src/libsodium/crypto_stream/chacha20/stream_chacha20.c
		libsodium/src/libsodium/crypto_stream/chacha20/ref/chacha20_ref.c
		libsodium/src/libsodium/sodium/utils.c
		${SOURCES}
		main.cpp)

target_include_directories(${PROJECT_NAME}_engine
		PRIVATE
		libsodium/src/libsodium/include/sodium
		pqclean/common
		pqclean/crypto_kem/ml-kem-1024/clean
		$ENV{EMSDK}/upstream/emscripten/system/include)

target_link_libraries(${PROJECT_NAME}_engine
        PRIVATE
        embind)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

install(TARGETS ${PROJECT_NAME}_engine
		ARCHIVE DESTINATION ${CMAKE_INSTALL_PREFIX}
		LIBRARY DESTINATION ${CMAKE_INSTALL_PREFIX}
		RUNTIME DESTINATION ${CMAKE_INSTALL_PREFIX})
install(FILES ${CMAKE_BINARY_DIR}/kyber_crystals_wasm_engine.wasm DESTINATION ${CMAKE_INSTALL_PREFIX})
install(FILES ${CMAKE_CURRENT_LIST_DIR}/test.html DESTINATION ${CMAKE_INSTALL_PREFIX})

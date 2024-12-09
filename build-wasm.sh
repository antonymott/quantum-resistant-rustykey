#$HOME/emsdk/emsdk install latest

# Make the "latest" SDK "active" for the current user. (writes .emscripten file)
#$HOME/emsdk/emsdk activate latest

# Activate PATH and other environment variables in the current terminal
#source $HOME/emsdk/emsdk_env.sh

cmake -Bbuild \
-DCMAKE_BUILD_TYPE=Release \
-DCMAKE_INSTALL_PREFIX=./install \
-DCMAKE_TOOLCHAIN_FILE=$HOME/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake
cmake --build build --target install


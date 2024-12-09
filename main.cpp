extern "C" {
#include "PQClean/crypto_kem/ml-kem-1024/clean/api.h"
}
#include <randombytes.h>

#include <emscripten/bind.h>

#include <sstream>

using namespace emscripten;

class MlKem1024 {
  public:
  MlKem1024() {
    randombytes_stir();
  }

  std::map<std::string, std::vector<uint8_t>> keypair() {
    auto result = std::map<std::string, std::vector<uint8_t>>{
      {"public_key", std::vector<uint8_t>(PQCLEAN_MLKEM1024_CLEAN_CRYPTO_PUBLICKEYBYTES)},
      {"private_key", std::vector<uint8_t>(PQCLEAN_MLKEM1024_CLEAN_CRYPTO_SECRETKEYBYTES)}};
    if (PQCLEAN_MLKEM1024_CLEAN_crypto_kem_keypair(result["public_key"].data(), result["private_key"].data()) == 0) {
      return result;
    }
    return {};
  }

  std::string buffer_to_string(const std::vector<uint8_t>& buffer) {
    std::stringstream str;
    str << std::hex;
    for (auto const& item : buffer) {
      str << " " << static_cast<int>(item);
    }
    return str.str();
  }

  std::map<std::string,std::vector<uint8_t>> encrypt(const std::vector<uint8_t>& public_key) {
    auto result = std::map<std::string, std::vector<uint8_t>>{
      {"cyphertext", std::vector<uint8_t>(PQCLEAN_MLKEM1024_CLEAN_CRYPTO_CIPHERTEXTBYTES)},
      {"secret", std::vector<uint8_t>(PQCLEAN_MLKEM1024_CLEAN_CRYPTO_BYTES)}};
    if (PQCLEAN_MLKEM1024_CLEAN_crypto_kem_enc(result["cyphertext"].data(), result["secret"].data(), public_key.data()) == 0) {
      return result;
    }
    return {};
  }

  std::vector<uint8_t> decrypt(const std::vector<uint8_t>& cyphertext, const std::vector<uint8_t>& private_key) {
    auto secret = std::vector<uint8_t>(PQCLEAN_MLKEM1024_CLEAN_CRYPTO_BYTES);
    if (PQCLEAN_MLKEM1024_CLEAN_crypto_kem_dec(secret.data(), cyphertext.data(), private_key.data()) == 0) {
      return secret;
    }
    return {};
  }
};

EMSCRIPTEN_BINDINGS(EMTest) {
  register_vector<uint8_t>("VectorUint8t");
  register_vector<std::string>("VectorString");
  register_map<std::string, std::vector<uint8_t>>("MapVectorStringUint8t");
  emscripten::class_<MlKem1024>("MlKem1024")
    .constructor()
    .function("buffer_to_string", &MlKem1024::buffer_to_string)
    .function("keypair", &MlKem1024::keypair)
    .function("encrypt", &MlKem1024::encrypt)
    .function("decrypt", &MlKem1024::decrypt);
}

void sodium_misuse()
{
  // TODO: To be done
}

#ifndef __EMSCRIPTEN__
int main(int argc, char* argv[])
{
  return 0;
}
#endif

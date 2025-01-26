// import Worker from 'web-worker'
// import { Module } from 'kyber_crystals_wasm_engine'

WebAssembly.instantiateStreaming(fetch('kyber_crystals_wasm_engine.wasm'), onRuntimeInitialized).then(
  (obj) => obj.instance.exports.MlKem102(),
  )
import onRuntimeInitialized from './kyber_crystals_wasm_engine.js'

var Module = {
  onRuntimeInitialized: function() {
      const mlkem1024 = new Module.MlKem1024()
      var keypair = mlkem1024.keypair()
      console.log(" mlkem1024 public_key: ", mlkem1024.buffer_to_string(keypair.get('public_key')))
      console.log("private_key: ", mlkem1024.buffer_to_string(keypair.get('private_key')))
      var encrypt = mlkem1024.encrypt(keypair.get('public_key'))
      console.log("cyphertext: ", mlkem1024.buffer_to_string(encrypt.get('cyphertext')))
      console.log("secret: ", mlkem1024.buffer_to_string(encrypt.get('secret')))

      var secret = mlkem1024.decrypt(encrypt.get('cyphertext'), keypair.get('private_key'))
      console.log("secret: ", mlkem1024.buffer_to_string(secret))
      mlkem1024.delete();

      const mlkem768 = new Module.MlKem768()
      var keypair = mlkem768.keypair()
      console.log("mlkem768 public_key: ", mlkem768.buffer_to_string(keypair.get('public_key')))
      console.log("private_key: ", mlkem768.buffer_to_string(keypair.get('private_key')))
      var encrypt = mlkem768.encrypt(keypair.get('public_key'))
      console.log("cyphertext: ", mlkem768.buffer_to_string(encrypt.get('cyphertext')))
      console.log("secret: ", mlkem768.buffer_to_string(encrypt.get('secret')))

      var secret = mlkem768.decrypt(encrypt.get('cyphertext'), keypair.get('private_key'))
      console.log("secret: ", mlkem768.buffer_to_string(secret))
      mlkem768.delete();

      const mlkem512 = new Module.MlKem512()
      var keypair = mlkem512.keypair()
      console.log("mlkem512public_key: ", mlkem512.buffer_to_string(keypair.get('public_key')))
      console.log("private_key: ", mlkem512.buffer_to_string(keypair.get('private_key')))
      var encrypt = mlkem512.encrypt(keypair.get('public_key'))
      console.log("cyphertext: ", mlkem512.buffer_to_string(encrypt.get('cyphertext')))
      console.log("secret: ", mlkem512.buffer_to_string(encrypt.get('secret')))

      var secret = mlkem512.decrypt(encrypt.get('cyphertext'), keypair.get('private_key'))
      console.log("secret: ", mlkem512.buffer_to_string(secret))
      mlkem512.delete();
      // keypair.onclick = () => alert(instance.key_to_string(instance.keypair()))
      // encrypt.onclick = () => alert(instance.key_to_string(instance.keypair()))
      // decrypt.onclick = () => alert(instance.key_to_string(instance.keypair()))

      // instance.delete();
  }
};

export const add = (a: number, b: number) => {
  return a + b
}

export const kp = 1

// const url = new URL('./wasm-worker.ts', import.meta.url)
// const worker = new Worker(url)

// worker.addEventListener('message', (e: { data: any }) => {
//   console.log(e.data) // "hiya!"
// })

// worker.postMessage('hello')

// worker.onmessage = function(message: string) {
//   console.log(message)
// }

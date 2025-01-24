WebAssembly.instantiateStreaming(fetch('kyber_crystals_wasm_engine.wasm'), importObject).then(
(obj) => obj.instance.exports.exported_func(),
)
  

addEventListener('message', e => {
    if (e.data === 'hello') {
        postMessage('hiya!')
    }

    postMessage('hello')
})
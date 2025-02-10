// import { Module } from 'kyber_crystals_wasm_engine.js'
// import  onRuntimeInitialized from './kyber_crystals_wasm_engine.js'
// import './kyber_crystals_wasm_engine.wasm'

WebAssembly.instantiateStreaming(fetch('kyber_crystals_wasm_engine.wasm'), importObject).then(
(obj) => obj.instance.exports.our_func(),
)
// var Module = {

addEventListener('message', e => {
    if (e.data === 'hello') {
        postMessage('hiya!')
    }

    postMessage('hello')
})
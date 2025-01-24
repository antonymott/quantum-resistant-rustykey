import Worker from 'web-worker'

export const add = (a: number, b: number) => {
  return a + b
}

export const kp = 1

const url = new URL('./wasm-worker.js', import.meta.url)
const worker = new Worker(url)

worker.addEventListener('message', (e: { data: any }) => {
  console.log(e.data) // "hiya!"
})

worker.postMessage('hello')

worker.onmessage = function(message: string) {
  console.log(message)
}

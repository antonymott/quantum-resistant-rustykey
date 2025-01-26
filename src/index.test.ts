import { describe, test, expect, it } from 'vitest'

import { add } from './index'

// var Module = {
//   onRuntimeInitialized: function() {
//       const mlkem1024 = new Module.MlKem1024()
//       var keypair = mlkem1024.keypair()
//       console.log(" mlkem1024 public_key: ", mlkem1024.buffer_to_string(keypair.get('public_key')))
//       console.log("private_key: ", mlkem1024.buffer_to_string(keypair.get('private_key')))
//       var encrypt = mlkem1024.encrypt(keypair.get('public_key'))
//       console.log("cyphertext: ", mlkem1024.buffer_to_string(encrypt.get('cyphertext')))
//       console.log("secret: ", mlkem1024.buffer_to_string(encrypt.get('secret')))

//       var secret = mlkem1024.decrypt(encrypt.get('cyphertext'), keypair.get('private_key'))
//       console.log("secret: ", mlkem1024.buffer_to_string(secret))
//       mlkem1024.delete()
//   }
// }

describe('#sum', () => {
  it('returns 0 with no numbers', () => {
    expect(add(0, 0)).toBe(0)
  })
  it('returns same with one number', () => {
    const a = 2
    expect(add(a, 0)).toBe(a)
  })
  it('returns sum with 2 numbers', () => {
    expect(add(4, 2)).toBe(6)
  })
  test('should work', () => {
    expect(true).toBe(true)
  })
})

// import { MlKem1024 } from './mlKem/mlKem1024'

it('...', async () => {
  // const recipient = new MlKem1024()


  //const [pkR, skR] = await recipient.generateKeyPair()

  // const sender = new MlKem1024()
  //const [ct, ssS] = await sender.encap(pkR)

  //const ssR = await recipient.decap(ct, skR)
  // ssS === ssR
  // expect(ssR).toBe(ssS)
  await new Promise(r => setTimeout(r))
})

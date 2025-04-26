import { IMlKem, KeyPair, EncryptResult, KemVariant } from './types';

// @ts-ignore
import kyber from './kyber_crystals_wasm_engine.js';

// Embind class declarations
declare class MlKem1024 {
  keypair(): { get(key: 'public_key' | 'private_key'): any };
  encrypt(public_key: any): { get(key: 'cyphertext' | 'secret'): any };
  decrypt(cyphertext: any, private_key: any): any;
  buffer_to_string(buffer: any): string;
  delete(): void;
}
declare class MlKem768 extends MlKem1024 {}
declare class MlKem512 extends MlKem1024 {}

type RawInstance = MlKem1024 | MlKem768 | MlKem512;

class MlKemWrapper implements IMlKem {
  constructor(private readonly instance: RawInstance) {}

  keypair(): KeyPair {
    return this.instance.keypair();
  }

  encrypt(public_key: any): EncryptResult {
    return this.instance.encrypt(public_key);
  }

  decrypt(cyphertext: any, private_key: any): any {
    return this.instance.decrypt(cyphertext, private_key);
  }

  buffer_to_string(buffer: any): string {
    return this.instance.buffer_to_string(buffer);
  }

  delete(): void {
    this.instance.delete();
  }
}

export async function loadMlKem1024(): Promise<IMlKem> {
  const wasm = await kyber();

  return new MlKemWrapper(new wasm.MlKem1024());
}

export async function loadMlKem768(): Promise<IMlKem> {
  const wasm = await kyber();
  
  return new MlKemWrapper(new wasm.MlKem768());
}

export async function loadMlKem512(): Promise<IMlKem> {
  const wasm = await kyber();
  
  return new MlKemWrapper(new wasm.MlKem512());
}
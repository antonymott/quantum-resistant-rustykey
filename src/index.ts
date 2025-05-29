import { IMlKem, KeyPair, EncryptResult, KemVariant } from './types';

// @ts-ignore
import kyber from './kyber_crystals_wasm_engine.js';

// Embind class declarations
declare class MlKem1024 {
  keypair(): { get(key: 'public_key' | 'private_key'): any };
  encrypt(public_key: any): { get(key: 'cyphertext' | 'secret'): any };
  decrypt(cyphertext: any, private_key: any): any;
  buffer_to_string(buffer: any): string;
  encryptMessage(message: string, secret: any): Promise<Uint8Array>;
  decryptMessage(encryptedMessage: Uint8Array, secret: any): Promise<string>;
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

  async encryptMessage(message: string, secret: any): Promise<Uint8Array> {
    const sharedSecret = this.buffer_to_string(secret);
    const sharedSecretBuffer = new Uint8Array(sharedSecret.trim().split(' ').map(x => parseInt(x, 16)))

    // Convert the message to bytes
    const messageBytes = new TextEncoder().encode(message);
    // Convert the secret to a key using SHA-256
    const key = await crypto.subtle.importKey(
      'raw',
      sharedSecretBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    // Encrypt the message
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      messageBytes
    );
    // Combine IV and encrypted data
    const encryptedMessage = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedMessage.set(iv);
    encryptedMessage.set(new Uint8Array(encryptedData), iv.length);
    return encryptedMessage;
  }

  async decryptMessage(encryptedMessage: Uint8Array, secret: any): Promise<string> {
    const sharedSecret = this.buffer_to_string(secret);
    const sharedSecretBuffer = new Uint8Array(sharedSecret.trim().split(' ').map(x => parseInt(x, 16)))

    // Extract IV and encrypted data
    const iv = encryptedMessage.slice(0, 12);
    const encryptedData = encryptedMessage.slice(12);
    // Convert the secret to a key using SHA-256
    const key = await crypto.subtle.importKey(
      'raw',
      sharedSecretBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    // Decrypt the message
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    // Convert back to string
    return new TextDecoder().decode(decryptedData);
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
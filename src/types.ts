export interface KeyPair {
  get(key: 'public_key' | 'private_key'): any;
}

export interface EncryptResult {
  get(key: 'cyphertext' | 'secret'): any;
}

export interface IMlKem {
  keypair(): KeyPair;
  encrypt(public_key: any): EncryptResult;
  decrypt(cyphertext: any, private_key: any): any;
  buffer_to_string(buffer: any): string;
  encryptMessage(message: string, secret: any): Promise<Uint8Array>;
  decryptMessage(encryptedMessage: Uint8Array, secret: any): Promise<string>;
  delete(): void;
}

export type KemVariant = 'k1024' | 'k768' | 'k512';

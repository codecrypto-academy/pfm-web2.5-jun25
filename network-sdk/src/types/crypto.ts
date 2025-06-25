// Crypto-related type definitions
export interface CryptoKeys {
  privateKey: string;
  publicKey: string;
  address: string;
}

export interface KeysWithEnode extends CryptoKeys {
  enode: string;
}

export interface ValidatedArgsEnode {
  enodeIP: string;
  enodePort: string;
  directory: string;
}

export interface ValidatedArgsKeys {
  directory: string;
}

export type ValidatedArgs = ValidatedArgsEnode | ValidatedArgsKeys;
export type Command = 'createKeysAndEnode' | 'createKeys';
export type FileMap = Record<string, string>;

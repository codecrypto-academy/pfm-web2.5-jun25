import { KeyGenerator } from '../src/KeyGenerator';

describe('KeyGenerator', () => {
  const keyGen = new KeyGenerator();

  it('should be defined', () => {
    expect(KeyGenerator).toBeDefined();
  });

  it('should generate a valid key pair and address', () => {
    const creds = keyGen.generateKeyPair('127.0.0.1', 30303);
    expect(creds.privateKey).toMatch(/^0x[0-9a-f]+$/i);
    expect(creds.publicKey).toMatch(/^0x[0-9a-f]+$/i);
    expect(creds.address).toMatch(/^0x[0-9a-f]{40}$/i);
    expect(creds.enode).toContain('@127.0.0.1:30303');
  });

  it('should validate a correct address', () => {
    const creds = keyGen.generateKeyPair('127.0.0.1', 30303);
    expect(keyGen.isValidAddress(creds.address)).toBe(true);
  });

  it('should invalidate an incorrect address', () => {
    expect(keyGen.isValidAddress('0x123')).toBe(false);
    expect(keyGen.isValidAddress('not-an-address')).toBe(false);
  });
});

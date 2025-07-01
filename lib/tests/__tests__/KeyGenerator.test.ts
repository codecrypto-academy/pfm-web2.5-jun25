import { KeyGenerator } from '../../src/services/KeyGenerator';
import { Logger } from '../../src/utils/Logger';
import { FileSystem } from '../../src/utils/FileSystem';

describe('KeyGenerator', () => {
  let logger: Logger;
  let fs: FileSystem;
  beforeEach(() => {
    logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any;
    fs = { ensureDir: jest.fn().mockResolvedValue(undefined), writeFile: jest.fn().mockResolvedValue(undefined) } as any;
  });

  it('should construct KeyGenerator', () => {
    const generator = new KeyGenerator(logger, fs);
    expect(generator).toBeDefined();
  });

  it('should generate node keys', async () => {
    const generator = new KeyGenerator(logger, fs);
    const result = await generator.generateNodeKeys('nodeDir');
    expect(fs.ensureDir).toHaveBeenCalledWith('nodeDir');
    expect(fs.writeFile).toHaveBeenCalled();
    expect(result).toHaveProperty('privateKey');
    expect(result).toHaveProperty('address');
  });

  it('should return null if keys do not exist', async () => {
    fs.exists = jest.fn().mockResolvedValue(false);
    const generator = new KeyGenerator(logger, fs);
    const result = await generator.loadNodeKeys('nodeDir');
    expect(result).toBeNull();
  });

  it('should handle error when writeFile fails in generateNodeKeys', async () => {
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('write error'));
    const generator = new KeyGenerator(logger, fs);
    await expect(generator.generateNodeKeys('nodeDir')).rejects.toThrow('write error');
  });

  it('should handle error when ensureDir fails in generateNodeKeys', async () => {
    (fs.ensureDir as jest.Mock).mockRejectedValueOnce(new Error('dir error'));
    const generator = new KeyGenerator(logger, fs);
    await expect(generator.generateNodeKeys('nodeDir')).rejects.toThrow('dir error');
  });

  it('should handle error when loading keys throws', async () => {
    fs.exists = jest.fn().mockRejectedValueOnce(new Error('exists error'));
    const generator = new KeyGenerator(logger, fs);
    const result = await generator.loadNodeKeys('nodeDir');
    expect(result).toBeNull();
  });

  it('should generate encrypted node keys', async () => {
    const generator = new KeyGenerator(logger, fs);
    const mockWallet = {
      privateKey: '0xpriv',
      publicKey: '0xpub',
      address: '0xaddr',
      encrypt: jest.fn().mockResolvedValue('encrypted')
    };
    jest.spyOn(require('ethers').Wallet, 'createRandom').mockReturnValue(mockWallet);
    fs.ensureDir = jest.fn().mockResolvedValue(undefined); // Acepta cualquier string
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    const result = await generator.generateEncryptedNodeKeys('nodeDir', 'pass');
    expect(fs.writeFile).toHaveBeenCalled();
    expect(result).toHaveProperty('privateKey', '0xpriv');
    expect(result).toHaveProperty('address', '0xaddr');
  });

  it('should handle error when writeFile fails in generateEncryptedNodeKeys', async () => {
    const generator = new KeyGenerator(logger, fs);
    const mockWallet = {
      privateKey: '0xpriv',
      publicKey: '0xpub',
      address: '0xaddr',
      encrypt: jest.fn().mockResolvedValue('encrypted')
    };
    jest.spyOn(require('ethers').Wallet, 'createRandom').mockReturnValue(mockWallet);
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.writeFile = jest.fn().mockRejectedValueOnce(new Error('write error'));
    await expect(generator.generateEncryptedNodeKeys('nodeDir', 'pass')).rejects.toThrow('write error');
  });

  it('should generate password file with provided password', async () => {
    const generator = new KeyGenerator(logger, fs);
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    const password = await generator.generatePasswordFile('nodeDir', 'mypassword');
    expect(password).toBe('mypassword');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), 'mypassword');
  });

  it('should generate password file with random password', async () => {
    const generator = new KeyGenerator(logger, fs);
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(generator as any, 'generateRandomPassword').mockReturnValue('randompass');
    const password = await generator.generatePasswordFile('nodeDir');
    expect(password).toBe('randompass');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), 'randompass');
  });
});
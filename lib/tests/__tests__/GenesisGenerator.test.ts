import { GenesisGenerator } from '../../src/services/GenesisGenerator';
import { Logger } from '../../src/utils/Logger';
import { FileSystem } from '../../src/utils/FileSystem';

describe('GenesisGenerator', () => {
  let logger: Logger;
  let fs: FileSystem;
  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    fs = { 
      writeFile: jest.fn().mockResolvedValue(undefined),
      ensureDir: jest.fn().mockResolvedValue(undefined)
    } as any;
  });

  it('should construct GenesisGenerator', () => {
    const generator = new GenesisGenerator(logger, fs);
    expect(generator).toBeDefined();
  });

  it('should generate genesis file for Clique protocol', async () => {
    const fs = { 
      writeFile: jest.fn().mockResolvedValue(undefined),
      ensureDir: jest.fn().mockResolvedValue(undefined)
    };
    const logger = { info: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(logger as any, fs as any);
    const options = {
      consensusProtocol: 'clique',
      validatorAddresses: ['0x1111111111111111111111111111111111111111'],
      blockPeriod: 5
    };
    await generator.generateGenesisFile('file.json', options as any);
    expect(fs.writeFile).toHaveBeenCalledWith('file.json', expect.stringContaining('clique'));
    expect(logger.info).toHaveBeenCalled();
  });

  it('should generate genesis file for IBFT2 protocol', async () => {
    const fs = { 
      writeFile: jest.fn().mockResolvedValue(undefined),
      ensureDir: jest.fn().mockResolvedValue(undefined)
    };
    const logger = { info: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(logger as any, fs as any);
    const options = {
      consensusProtocol: 'ibft2',
      validatorAddresses: ['0x2222222222222222222222222222222222222222'],
      blockPeriod: 5
    };
    await generator.generateGenesisFile('file.json', options as any);
    expect(fs.writeFile).toHaveBeenCalledWith('file.json', expect.stringContaining('ibft2'));
    expect(logger.info).toHaveBeenCalled();
  });

  it('should generate genesis file for QBFT protocol', async () => {
    const fs = { 
      writeFile: jest.fn().mockResolvedValue(undefined),
      ensureDir: jest.fn().mockResolvedValue(undefined)
    };
    const logger = { info: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(logger as any, fs as any);
    const options = {
      consensusProtocol: 'qbft',
      validatorAddresses: ['0x3333333333333333333333333333333333333333'],
      blockPeriod: 5
    };
    await generator.generateGenesisFile('file.json', options as any);
    expect(fs.writeFile).toHaveBeenCalledWith('file.json', expect.stringContaining('qbft'));
    expect(logger.info).toHaveBeenCalled();
  });

  it('should add additionalOptions to genesis', async () => {
    const fs = { 
      writeFile: jest.fn().mockResolvedValue(undefined),
      ensureDir: jest.fn().mockResolvedValue(undefined)
    };
    const logger = { info: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(logger as any, fs as any);
    const options = {
      consensusProtocol: 'clique',
      validatorAddresses: ['0x1111111111111111111111111111111111111111'],
      blockPeriod: 5,
      additionalOptions: { chainId: 1234 }
    };
    await generator.generateGenesisFile('file.json', options as any);
    expect(fs.writeFile).toHaveBeenCalledWith('file.json', expect.stringContaining('1234'));
  });

  it('should use custom alloc if provided', async () => {
    const fs = { 
      writeFile: jest.fn().mockResolvedValue(undefined),
      ensureDir: jest.fn().mockResolvedValue(undefined)
    };
    const logger = { info: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(logger as any, fs as any);
    const options = {
      consensusProtocol: 'clique',
      validatorAddresses: ['0x1111111111111111111111111111111111111111'],
      blockPeriod: 5,
      alloc: { '0xabc': { balance: '0x1' } }
    };
    await generator.generateGenesisFile('file.json', options as any);
    expect(fs.writeFile).toHaveBeenCalledWith('file.json', expect.stringContaining('0xabc'));
  });

  it('should throw error for unsupported consensus protocol', async () => {
    const fs = { writeFile: jest.fn().mockResolvedValue(undefined) };
    const logger = { info: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(logger as any, fs as any);
    const options = {
      consensusProtocol: 'unsupported',
      validatorAddresses: ['0x1111111111111111111111111111111111111111'],
      blockPeriod: 5
    };
    await expect(generator.generateGenesisFile('file.json', options as any)).rejects.toThrow('Protocolo de consenso no soportado');
  });

  it('should handle error when writeFile fails', async () => {
    const mockFs = { writeFile: jest.fn().mockRejectedValue(new Error('write error')) };
    const mockLogger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const generator = new GenesisGenerator(mockLogger as any, mockFs as any);
    const options = {
      chainId: 1,
      consensusProtocol: 'clique',
      validatorAddresses: ['0x1234567890123456789012345678901234567890'],
      blockPeriod: 5
    } as any;
    
    await expect(generator.generateGenesisFile('genesis.json', options)).rejects.toThrow();
  });
});
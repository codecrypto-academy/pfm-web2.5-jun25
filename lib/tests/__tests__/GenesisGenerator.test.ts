import { GenesisGenerator } from '../../src/services/GenesisGenerator';
import { Logger } from '../../src/utils/Logger';
import { FileSystem } from '../../src/utils/FileSystem';

describe('GenesisGenerator', () => {
  let logger: Logger;
  let fs: FileSystem;
  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() } as any;
    fs = { writeFile: jest.fn().mockResolvedValue(undefined) } as any;
  });

  it('should construct GenesisGenerator', () => {
    const generator = new GenesisGenerator(logger, fs);
    expect(generator).toBeDefined();
  });

  it('should generate genesis file with clique protocol', async () => {
    const generator = new GenesisGenerator(logger, fs);
    const options = {
      chainId: 1,
      consensusProtocol: 'clique',
      validatorAddresses: ['0x1234'],
      blockPeriod: 5
    } as any;
    await generator.generateGenesisFile('genesis.json', options);
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('clique'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('génesis'));
  });

  it('should throw error for unsupported protocol', async () => {
    const generator = new GenesisGenerator(logger, fs);
    const options = {
      chainId: 1,
      consensusProtocol: 'unsupported',
      validatorAddresses: [],
      blockPeriod: 5
    } as any;
    await expect(generator.generateGenesisFile('genesis.json', options)).rejects.toThrow('Protocolo de consenso no soportado');
  });

  it('should handle error when writeFile fails', async () => {
    const generator = new GenesisGenerator(logger, fs);
    (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('write error'));
    const options = {
      chainId: 1,
      consensusProtocol: 'clique',
      validatorAddresses: ['0x1234'],
      blockPeriod: 5
    } as any;
    await expect(generator.generateGenesisFile('genesis.json', options)).rejects.toThrow('write error');
  });
});
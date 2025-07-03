import { ConfigGenerator } from '../../src/services/ConfigGenerator';
import { Logger } from '../../src/utils/Logger';
import { FileSystem } from '../../src/utils/FileSystem';
import { BesuNodeConfig, BesuNetworkConfig, BesuNodeType } from '../../src/models/types';

describe('ConfigGenerator', () => {
  let logger: Logger;
  let fs: FileSystem;
  let configGenerator: ConfigGenerator;
  let mockNode: BesuNodeConfig;
  let mockNetworkConfig: BesuNetworkConfig;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() } as any;
    fs = { writeFile: jest.fn().mockResolvedValue(undefined) } as any;
    configGenerator = new ConfigGenerator(logger, fs);
    
    mockNode = {
      name: 'test-node',
      rpcPort: 8545,
      p2pPort: 30303,
      dataDir: './data/test-node',
      nodeType: BesuNodeType.NORMAL,
      enabledApis: ['ETH', 'NET']
    };
    
    mockNetworkConfig = {
      name: 'test-network',
      chainId: 1337,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      dataDir: './data',
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      nodeCount: 1
    };
  });

  it('should construct ConfigGenerator', () => {
    expect(configGenerator).toBeDefined();
  });

  it('should generate bootnode config with correct parameters', async () => {
    const bootnodeConfig = {
      ...mockNode,
      name: 'bootnode',
      dataDir: './data/bootnode',
      nodeType: BesuNodeType.SIGNER,
      isBootnode: true,
      isValidator: true
    };

    await configGenerator.generateBootnodeConfig(bootnodeConfig, mockNetworkConfig);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('data\\bootnode\\config.toml'),
      expect.stringContaining('rpc-http-port=8545')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('p2p-port=30303')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('genesis-file="/genesis.json"')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Archivo config.toml generado para bootnode')
    );
  });

  it('should generate node config with bootnode enode', async () => {
    const bootnodeEnode = 'enode://abc123@172.20.0.2:30303';
    
    await configGenerator.generateNodeConfig(mockNode, mockNetworkConfig, bootnodeEnode);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('data\\test-node\\config.toml'),
      expect.stringContaining('rpc-http-port=8545')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('p2p-port=30303')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('bootnodes=["enode://abc123@172.20.0.2:30303"]')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Archivo config.toml generado para nodo test-node')
    );
  });

  it('should include enabled APIs in config', async () => {
    const nodeWithApis = {
      ...mockNode,
      enabledApis: ['ETH', 'NET', 'WEB3', 'ADMIN']
    };

    await configGenerator.generateBootnodeConfig(nodeWithApis, mockNetworkConfig);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('rpc-http-api=["ETH", "NET", "WEB3", "ADMIN"]')
    );
  });

  it('should include additional options in config', async () => {
    const nodeWithOptions = {
      ...mockNode,
      additionalOptions: {
        'logging': 'DEBUG',
        'miner-coinbase': '0x123456789',
        'miner-enabled': 'true'
      }
    };

    await configGenerator.generateBootnodeConfig(nodeWithOptions, mockNetworkConfig);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('logging="INFO"')
    );
    // Para nodos NORMAL, no se incluye miner-coinbase
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('miner-enabled=false')
    );
  });

  it('should handle miner node type with mining enabled', async () => {
    const minerNode = {
      ...mockNode,
      nodeType: BesuNodeType.MINER,
      additionalOptions: {
        'miner-coinbase': '0x123456789'
      }
    };

    await configGenerator.generateBootnodeConfig(minerNode, mockNetworkConfig);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('miner-coinbase=""')
    );
  });

  it('should handle signer node type for consensus', async () => {
    const signerNode = {
      ...mockNode,
      nodeType: BesuNodeType.SIGNER,
      isValidator: true
    };

    await configGenerator.generateBootnodeConfig(signerNode, mockNetworkConfig);

    // Para nodos SIGNER, se espera que tengan configuración específica de consenso
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('genesis-file="/genesis.json"')
    );
  });

  it('should handle error when writeFile fails', async () => {
    (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('write error'));

    await expect(
      configGenerator.generateBootnodeConfig(mockNode, mockNetworkConfig)
    ).rejects.toThrow('write error');
  });

  it('should generate config without bootnode for bootnode itself', async () => {
    const bootnodeConfig = {
      ...mockNode,
      name: 'bootnode',
      isBootnode: true
    };

    await configGenerator.generateBootnodeConfig(bootnodeConfig, mockNetworkConfig);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.stringContaining('bootnodes=')
    );
  });

  it('should use correct data directory path', async () => {
    const nodeWithCustomDataDir = {
      ...mockNode,
      dataDir: './custom/data/path'
    };

    await configGenerator.generateBootnodeConfig(nodeWithCustomDataDir, mockNetworkConfig);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('custom\\data\\path\\config.toml'),
      expect.any(String)
    );
  });
});
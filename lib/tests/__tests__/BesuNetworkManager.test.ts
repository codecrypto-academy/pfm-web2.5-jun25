import { BesuNetworkManager } from '../../src/services/BesuNetworkManager';
import { Logger } from '../../src/utils/Logger';
import { DockerService } from '../../src/services/DockerService';
import { FileSystem } from '../../src/utils/FileSystem';
import { GenesisGenerator } from '../../src/services/GenesisGenerator';
import { KeyGenerator } from '../../src/services/KeyGenerator';
import { BesuNetworkConfig } from '../../src/models/types';


describe('BesuNetworkManager', () => {
  let config: BesuNetworkConfig;
  let docker: DockerService;
  let logger: Logger;
  let fs: FileSystem;
  let genesisGenerator: GenesisGenerator;
  let keyGenerator: KeyGenerator;

  beforeEach(() => {
    config = {
      name: 'testnet',
      chainId: 1337,
      consensusProtocol: 'ibft2',
      nodeCount: 1,
      blockPeriod: 2,
      nodes: [],
      dataDir: './data'
    } as any;
    docker = { createNetwork: jest.fn().mockResolvedValue('network-id') } as any;
    logger = { info: jest.fn(), error: jest.fn() } as any;
    fs = { ensureDir: jest.fn().mockResolvedValue(undefined) } as any;
    genesisGenerator = { generateGenesisFile: jest.fn().mockResolvedValue(undefined) } as any;
    keyGenerator = { } as any;
  });

  it('should construct BesuNetworkManager', () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    expect(manager).toBeDefined();
  });

  it('should handle error in initialize', async () => {
    fs.ensureDir = jest.fn().mockRejectedValue(new Error('fail'));
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    await expect(manager.initialize()).rejects.toThrow('fail');
  });

  it('should call start and log info', async () => {
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", isValidator: true, enabledApis: [] },
      { name: "node2", rpcPort: 8546, p2pPort: 30304, dataDir: "./data/node2", isValidator: false, enabledApis: [] }
    ];
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    manager["generateNodeConfigs"] = jest.fn().mockResolvedValue([]);
    manager["startBootNode"] = jest.fn().mockResolvedValue(undefined);
    manager["startNode"] = jest.fn().mockResolvedValue(undefined);
    manager["waitForNodes"] = jest.fn().mockResolvedValue(undefined);
    await manager.start();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Iniciando red Besu'));
  });

  it('should call stop and log info', async () => {
    docker.stopContainer = jest.fn().mockResolvedValue(undefined);
    docker.removeNetwork = jest.fn().mockResolvedValue(undefined);
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any)["networkName"] = "testnet";
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", isValidator: true, enabledApis: [] },
      { name: "node2", rpcPort: 8546, p2pPort: 30304, dataDir: "./data/node2", isValidator: false, enabledApis: [] }
    ];
    await manager.stop();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deteniendo red Besu'));
    expect(docker.stopContainer).toHaveBeenCalledWith("besu-node1");
    expect(docker.stopContainer).toHaveBeenCalledWith("besu-node2");
    expect(docker.removeNetwork).toHaveBeenCalledWith("testnet");
    expect(docker.stopContainer).toHaveBeenCalledWith("testnet");
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Red Besu detenida'));
  });
});
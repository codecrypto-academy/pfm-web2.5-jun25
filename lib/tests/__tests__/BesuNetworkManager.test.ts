import { BesuNetworkConfig } from '../../src/models/types';
import { BesuNetworkManager } from '../../src/services/BesuNetworkManager';
import { DockerService } from '../../src/services/DockerService';
import { FileSystem } from '../../src/utils/FileSystem';
import { GenesisGenerator } from '../../src/services/GenesisGenerator';
import { KeyGenerator } from '../../src/services/KeyGenerator';
import { Logger } from '../../src/utils/Logger';

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

  it('should return status with nodes running and stopped', async () => {
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", isValidator: true, enabledApis: [] },
      { name: "node2", rpcPort: 8546, p2pPort: 30304, dataDir: "./data/node2", isValidator: false, enabledApis: [] }
    ];
    docker.getContainerInfo = jest.fn()
      .mockResolvedValueOnce({ id: "id1", state: "running", ipAddress: "1.2.3.4" })
      .mockResolvedValueOnce({ id: "id2", state: "exited", ipAddress: "1.2.3.5" });
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).getBlockNumber = jest.fn().mockResolvedValue(100);
    (manager as any).getPeerCount = jest.fn().mockResolvedValue(5);
    (manager as any).getEnodeUrl = jest.fn().mockResolvedValue("enode://abc");
    const status = await manager.getStatus();
    expect(status.nodes.length).toBe(2);
    expect(status.nodes[0].blockNumber).toBe(100);
    expect(status.nodes[0].peerCount).toBe(5);
    expect(status.nodes[0].enodeUrl).toBe("enode://abc");
    expect(status.nodes[0].ipAddress).toBe("1.2.3.4");
    expect(status.nodes[1].containerStatus).toBe("exited");
    expect(status.networkId).toBe("netid");
  });

  it('should handle error in getStatus for running node', async () => {
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", isValidator: true, enabledApis: [] }
    ];
    docker.getContainerInfo = jest.fn().mockResolvedValue({ id: "id1", state: "running", ipAddress: "1.2.3.4" });
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).getBlockNumber = jest.fn().mockRejectedValue(new Error("fail block"));
    (manager as any).getPeerCount = jest.fn();
    (manager as any).getEnodeUrl = jest.fn();
    const status = await manager.getStatus();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Error al obtener estado del nodo node1:"), expect.any(Error));
    expect(status.nodes[0].blockNumber).toBeUndefined();
  });

  it('should generate node configs with clique consensus', async () => {
    config.nodeCount = 2;
    config.baseRpcPort = 8545;
    config.baseP2pPort = 30303;
    config.consensusProtocol = 'clique';
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (fs as any).ensureDir = jest.fn().mockResolvedValue(undefined);
    (keyGenerator as any).generateNodeKeys = jest.fn().mockResolvedValue({ privateKey: 'priv', publicKey: 'pub', address: 'addr' });
    const nodes = await (manager as any).generateNodeConfigs();
    expect(nodes.length).toBe(2);
    expect(nodes[0].enabledApis).toContain('CLIQUE');
  });

  it('should start bootnode and set bootnode enode', async () => {
    config.chainId = 123;
    config.consensusProtocol = 'ibft2';
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).dataDir = './data';
    (manager as any).networkName = 'testnet';
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', isValidator: true, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'], additionalOptions: { foo: 'bar' } };
    docker.runContainer = jest.fn().mockResolvedValue({});
    (manager as any).waitForNodeReady = jest.fn().mockResolvedValue(undefined);
    (manager as any).getEnodeUrl = jest.fn().mockResolvedValue('enode://abc');
    await (manager as any).startBootNode(nodeConfig);
    expect(docker.runContainer).toHaveBeenCalled();
    expect((manager as any).bootnode).toBe('enode://abc');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Bootnode iniciado con enode: enode://abc'));
  });

  it('should throw error if bootnode is not set in startNode', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).bootnode = undefined;
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', isValidator: true, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'] };
    await expect((manager as any).startNode(nodeConfig)).rejects.toThrow('No se ha iniciado el bootnode');
  });

  it('should start node and log info', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).bootnode = 'enode://abc';
    (manager as any).dataDir = './data';
    (manager as any).networkName = 'testnet';
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', isValidator: true, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'], additionalOptions: { foo: 'bar' } };
    docker.runContainer = jest.fn().mockResolvedValue({});
    (manager as any).waitForNodeReady = jest.fn().mockResolvedValue(undefined);
    await (manager as any).startNode(nodeConfig);
    expect(docker.runContainer).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Nodo iniciado: node1'));
  });

  it('should resolve when node becomes ready in waitForNodeReady', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).getBlockNumber = jest.fn().mockResolvedValue(123);
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', isValidator: true, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'] };
    await (manager as any).waitForNodeReady(nodeConfig);
    expect((manager as any).getBlockNumber).toHaveBeenCalledWith(8545);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('listo, bloque actual: 123'));
  });

  it('should throw error if node never becomes ready in waitForNodeReady', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, ...args: any[]) => { fn(); return 0 as any; });
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).getBlockNumber = jest.fn().mockRejectedValue(new Error('not ready'));
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', isValidator: true, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'] };
    await expect((manager as any).waitForNodeReady(nodeConfig)).rejects.toThrow('Tiempo de espera agotado para el nodo node1');
    setTimeoutSpy.mockRestore();
  });

  it('should throw error if no nodes configured in start', async () => {
    config.nodes = undefined;
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    await expect(manager.start()).rejects.toThrow('No hay nodos configurados para iniciar');
  });

  it('should handle stop with no nodes', async () => {
    config.nodes = undefined;
    docker.stopContainer = jest.fn().mockResolvedValue(undefined);
    docker.removeNetwork = jest.fn().mockResolvedValue(undefined);
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any)["networkName"] = "testnet";
    await manager.stop();
    expect(docker.removeNetwork).toHaveBeenCalledWith("testnet");
    expect(docker.stopContainer).toHaveBeenCalledWith("testnet");
  });

  it('should return status with no nodes', async () => {
    config.nodes = undefined;
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    const status = await manager.getStatus();
    expect(status.nodes.length).toBe(0);
    expect(status.networkId).toBe("netid");
  });

  it('should handle error in getBlockNumber, getPeerCount, getEnodeUrl in getStatus', async () => {
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", isValidator: true, enabledApis: [] }
    ];
    docker.getContainerInfo = jest.fn().mockResolvedValue({ id: "id1", state: "running", ipAddress: "1.2.3.4" });
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator);
    (manager as any).getBlockNumber = jest.fn().mockRejectedValue(new Error('fail'));
    (manager as any).getPeerCount = jest.fn().mockRejectedValue(new Error('fail'));
    (manager as any).getEnodeUrl = jest.fn().mockRejectedValue(new Error('fail'));
    const status = await manager.getStatus();
    expect(status.nodes[0].blockNumber).toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
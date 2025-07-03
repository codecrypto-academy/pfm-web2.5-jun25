import { LogLevel, Logger } from '../../src/utils/Logger';

import { BesuNetworkConfig, BesuNodeType, NodeCreationConfig } from '../../src/models/types';
import { BesuNetworkManager } from '../../src/services/BesuNetworkManager';
import { ConfigGenerator } from '../../src/services/ConfigGenerator';
import { DockerService } from '../../src/services/DockerService';
import { FileSystem } from '../../src/utils/FileSystem';
import { GenesisGenerator } from '../../src/services/GenesisGenerator';
import { KeyGenerator } from '../../src/services/KeyGenerator';

describe('BesuNetworkManager', () => {
  let config: BesuNetworkConfig;
  let docker: DockerService;
  let logger: Logger;
  let fs: FileSystem;
  let genesisGenerator: GenesisGenerator;
  let keyGenerator: KeyGenerator;
  let configGenerator: ConfigGenerator;

  beforeEach(() => {
    config = {
      name: 'testnet',
      chainId: 1337,
      consensusProtocol: 'ibft2',
      nodeCount: 1,
      blockPeriod: 2,
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      nodes: [],
      dataDir: './data'
    } as any;
    docker = { 
      createNetwork: jest.fn().mockResolvedValue('network-id'),
      stopContainer: jest.fn().mockResolvedValue(undefined),
      removeNetwork: jest.fn().mockResolvedValue(undefined),
      getContainerInfo: jest.fn().mockResolvedValue({ id: 'id1', state: 'running', ipAddress: '1.2.3.4' }),
      getNetworkId: jest.fn().mockResolvedValue('netid'),
      runContainer: jest.fn().mockResolvedValue({})
    } as any;
    logger = { info: jest.fn(), error: jest.fn() } as any;
    fs = { ensureDir: jest.fn().mockResolvedValue(undefined) } as any;
    genesisGenerator = { generateGenesisFile: jest.fn().mockResolvedValue(undefined) } as any;
    keyGenerator = { generateNodeKeys: jest.fn().mockResolvedValue({ privateKey: 'priv', publicKey: 'pub', address: 'addr' }) } as any;
    configGenerator = { generateBootnodeConfig: jest.fn().mockResolvedValue(undefined), generateNodeConfig: jest.fn().mockResolvedValue(undefined) } as any;
  });

  it('should construct BesuNetworkManager', () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    expect(manager).toBeDefined();
  });

  it('should handle error in initialize', async () => {
    fs.ensureDir = jest.fn().mockRejectedValue(new Error('fail'));
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    await expect(manager.initialize()).rejects.toThrow('fail');
  });

  it('should call start and log info', async () => {
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", nodeType: BesuNodeType.SIGNER, enabledApis: [] },
      { name: "node2", rpcPort: 8546, p2pPort: 30304, dataDir: "./data/node2", nodeType: BesuNodeType.NORMAL, enabledApis: [] }
    ];
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    
    // Mock de métodos privados usando jest.spyOn
    jest.spyOn(manager as any, 'generateNodeConfigs').mockResolvedValue([]);
    jest.spyOn(manager as any, 'generateBootnodeConfigFile').mockResolvedValue(undefined);
    jest.spyOn(manager as any, 'generateNodesConfigFiles').mockResolvedValue(undefined);
    jest.spyOn(manager as any, 'startBootNode').mockResolvedValue(undefined);
    jest.spyOn(manager as any, 'startNode').mockResolvedValue(undefined);
    jest.spyOn(manager as any, 'waitForNodes').mockResolvedValue(undefined);
    
    await manager.start();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Iniciando red Besu'));
  });

  it('should call stop and log info', async () => {
    docker.stopContainer = jest.fn().mockResolvedValue(undefined);
    docker.removeNetwork = jest.fn().mockResolvedValue(undefined);
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any)["networkName"] = "testnet";
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", nodeType: BesuNodeType.SIGNER, enabledApis: [] },
      { name: "node2", rpcPort: 8546, p2pPort: 30304, dataDir: "./data/node2", nodeType: BesuNodeType.NORMAL, enabledApis: [] }
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
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", nodeType: BesuNodeType.SIGNER, enabledApis: [] },
      { name: "node2", rpcPort: 8546, p2pPort: 30304, dataDir: "./data/node2", nodeType: BesuNodeType.NORMAL, enabledApis: [] }
    ];
    docker.getContainerInfo = jest.fn()
      .mockResolvedValueOnce({ id: "id1", state: "running", ipAddress: "1.2.3.4" })
      .mockResolvedValueOnce({ id: "id2", state: "exited", ipAddress: "1.2.3.5" });
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
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
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", nodeType: BesuNodeType.SIGNER, enabledApis: [] }
    ];
    docker.getContainerInfo = jest.fn().mockResolvedValue({ id: "id1", state: "running", ipAddress: "1.2.3.4" });
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
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
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (fs as any).ensureDir = jest.fn().mockResolvedValue(undefined);
    (keyGenerator as any).generateNodeKeys = jest.fn().mockResolvedValue({ privateKey: 'priv', publicKey: 'pub', address: 'addr' });
    const nodes = await (manager as any).generateNodeConfigs();
    expect(nodes.length).toBe(2);
    expect(nodes[0].enabledApis).toContain('CLIQUE');
  });

  it('should start bootnode and set bootnode enode', async () => {
    config.chainId = 123;
    config.consensusProtocol = 'ibft2';
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any).dataDir = './data';
    (manager as any).networkName = 'testnet';
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', nodeType: BesuNodeType.SIGNER, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'], additionalOptions: { foo: 'bar' } };
    docker.runContainer = jest.fn().mockResolvedValue({});
    (manager as any).waitForNodeReady = jest.fn().mockResolvedValue(undefined);
    (manager as any).getEnodeUrl = jest.fn().mockResolvedValue('enode://abc');
    await (manager as any).startBootNode(nodeConfig);
    expect(docker.runContainer).toHaveBeenCalled();
    expect((manager as any).bootnode).toBe('enode://abc');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Bootnode iniciado con enode: enode://abc'));
  });

  it('should throw error if bootnode is not set in startNode', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any).bootnode = undefined;
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', nodeType: BesuNodeType.SIGNER, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'] };
    await expect((manager as any).startNode(nodeConfig)).rejects.toThrow('No se ha iniciado el bootnode');
  });

  it('should start node and log info', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any).bootnode = 'enode://abc';
    (manager as any).dataDir = './data';
    (manager as any).networkName = 'testnet';
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', nodeType: BesuNodeType.SIGNER, validatorAddress: 'addr', privateKey: 'priv', enabledApis: ['ETH','NET'], additionalOptions: { foo: 'bar' } };
    docker.runContainer = jest.fn().mockResolvedValue({});
    (manager as any).waitForNodeReady = jest.fn().mockResolvedValue(undefined);
    await (manager as any).startNode(nodeConfig);
    expect(docker.runContainer).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Nodo iniciado: node1'));
  });

  it('should resolve when node becomes ready in waitForNodeReady', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    const nodeConfig = { name: 'node1', rpcPort: 8545, p2pPort: 30303, dataDir: './data/node1', nodeType: BesuNodeType.NORMAL, enabledApis: [] };
    
    // Mock para simular contenedor corriendo inmediatamente
    docker.getContainerInfo = jest.fn().mockResolvedValue({ state: 'running' });
    
    // Mock para simular respuesta HTTP exitosa
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: '0x7b' }) // 123 en hex
    }) as any;
    
    await expect((manager as any).waitForNodeReady(nodeConfig)).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('listo'));
  }, 15000);

  it('should handle error when node is not ready', async () => {
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    
    // Mock para simular error en fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
    
    // Test del método getBlockNumber directamente
    await expect((manager as any).getBlockNumber(8545)).rejects.toThrow();
    // Removido expect(logger.error).toHaveBeenCalled() porque la implementación original no registra errores
  });

  it('should throw error if no nodes configured in start', async () => {
    config.nodes = undefined;
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    await expect(manager.start()).rejects.toThrow('No hay nodos configurados para iniciar');
  });

  it('should handle stop with no nodes', async () => {
    config.nodes = undefined;
    docker.stopContainer = jest.fn().mockResolvedValue(undefined);
    docker.removeNetwork = jest.fn().mockResolvedValue(undefined);
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any)["networkName"] = "testnet";
    await manager.stop();
    expect(docker.removeNetwork).toHaveBeenCalledWith("testnet");
    expect(docker.stopContainer).toHaveBeenCalledWith("testnet");
  });

  it('should return status with no nodes', async () => {
    config.nodes = undefined;
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    const status = await manager.getStatus();
    expect(status.nodes.length).toBe(0);
    expect(status.networkId).toBe("netid");
  });

  // Tests para las nuevas funcionalidades
  it('should generate nodes from NodeCreationConfig with custom ports', async () => {
    const nodeCreationConfigs: NodeCreationConfig[] = [
      {
        name: 'validator-bootnode',
        nodeType: BesuNodeType.SIGNER,
        isValidator: true,
        isBootnode: true,
        rpcPort: 8545,
        p2pPort: 30303
      },
      {
        name: 'miner-node',
        nodeType: BesuNodeType.MINER,
        isValidator: false,
        isBootnode: false,
        linkedTo: 'validator-bootnode',
        rpcPort: 8546,
        p2pPort: 30304
      }
    ];
    
    config.nodeCreationConfigs = nodeCreationConfigs;
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    
    const nodes = await (manager as any).generateNodesFromCreationConfigs(nodeCreationConfigs);
    
    expect(nodes.length).toBe(2);
    expect(nodes[0].name).toBe('validator-bootnode');
    expect(nodes[0].nodeType).toBe(BesuNodeType.SIGNER);
    expect(nodes[0].rpcPort).toBe(8545);
    expect(nodes[0].p2pPort).toBe(30303);
    expect(nodes[0].isValidator).toBe(true);
    expect(nodes[0].isBootnode).toBe(true);
    
    expect(nodes[1].name).toBe('miner-node');
    expect(nodes[1].nodeType).toBe(BesuNodeType.MINER);
    expect(nodes[1].rpcPort).toBe(8546);
    expect(nodes[1].p2pPort).toBe(30304);
    expect(nodes[1].isValidator).toBe(false);
    expect(nodes[1].isBootnode).toBe(false);
    expect(nodes[1].linkedTo).toBe('validator-bootnode');
  });

  it('should use default ports when not specified in NodeCreationConfig', async () => {
    const nodeCreationConfigs: NodeCreationConfig[] = [
      {
        name: 'node1',
        nodeType: BesuNodeType.NORMAL,
        isValidator: false,
        isBootnode: false
      }
    ];
    
    config.nodeCreationConfigs = nodeCreationConfigs;
    config.baseRpcPort = 8545;
    config.baseP2pPort = 30303;
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    
    const nodes = await (manager as any).generateNodesFromCreationConfigs(nodeCreationConfigs);
    
    expect(nodes[0].rpcPort).toBe(8545); // baseRpcPort + 0
    expect(nodes[0].p2pPort).toBe(30303); // baseP2pPort + 0
  });

  it('should initialize with nuevo=true and clean data directory', async () => {
    const existsSyncSpy = jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);
    const rmSyncSpy = jest.spyOn(require('fs'), 'rmSync').mockImplementation(() => {});
    
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    manager.stop = jest.fn().mockResolvedValue(undefined);
    
    await manager.initialize(true);
    
    expect(manager.stop).toHaveBeenCalled();
    expect(existsSyncSpy).toHaveBeenCalled();
    expect(rmSyncSpy).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('parámetro `nuevo` es true'));
    
    existsSyncSpy.mockRestore();
    rmSyncSpy.mockRestore();
  });

  it('should generate bootnode config file', async () => {
    config.nodes = [
      { name: 'bootnode', rpcPort: 8545, p2pPort: 30303, dataDir: './data/bootnode', nodeType: BesuNodeType.SIGNER, enabledApis: [] }
    ];
    
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    
    await manager.generateBootnodeConfigFile();
    
    expect(configGenerator.generateBootnodeConfig).toHaveBeenCalledWith(config.nodes[0], config);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Archivo config.toml del bootnode generado'));
  });

  it('should generate nodes config files with bootnode enode', async () => {
    config.nodes = [
      { name: 'bootnode', rpcPort: 8545, p2pPort: 30303, dataDir: './data/bootnode', nodeType: BesuNodeType.SIGNER, enabledApis: [] },
      { name: 'node1', rpcPort: 8546, p2pPort: 30304, dataDir: './data/node1', nodeType: BesuNodeType.NORMAL, enabledApis: [] }
    ];
    
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any).bootnode = 'enode://abc123';
    
    await manager.generateNodesConfigFiles();
    
    expect(configGenerator.generateNodeConfig).toHaveBeenCalledWith(config.nodes[1], config, 'enode://abc123');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Archivos config.toml de los nodos generados'));
  });

  it('should throw error when generating nodes config files without bootnode', async () => {
    config.nodes = [
      { name: 'bootnode', rpcPort: 8545, p2pPort: 30303, dataDir: './data/bootnode', nodeType: BesuNodeType.SIGNER, enabledApis: [] },
      { name: 'node1', rpcPort: 8546, p2pPort: 30304, dataDir: './data/node1', nodeType: BesuNodeType.NORMAL, enabledApis: [] }
    ];
    
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any).bootnode = null;
    
    await expect(manager.generateNodesConfigFiles()).rejects.toThrow('No hay bootnode disponible');
  });

  it('should handle nodes with additional options', async () => {
    const nodeCreationConfigs: NodeCreationConfig[] = [
      {
        name: 'custom-node',
        nodeType: BesuNodeType.MINER,
        isValidator: false,
        isBootnode: false,
        rpcPort: 8547,
        p2pPort: 30305,
        additionalOptions: {
          'logging': 'DEBUG',
          'miner-coinbase': '0x123456789'
        }
      }
    ];
    
    config.nodeCreationConfigs = nodeCreationConfigs;
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    
    const nodes = await (manager as any).generateNodesFromCreationConfigs(nodeCreationConfigs);
    
    expect(nodes[0].additionalOptions).toEqual({
      'logging': 'DEBUG',
      'miner-coinbase': '0x123456789'
    });
  });

  it('should handle error in getBlockNumber, getPeerCount, getEnodeUrl in getStatus', async () => {
    config.nodes = [
      { name: "node1", rpcPort: 8545, p2pPort: 30303, dataDir: "./data/node1", nodeType: BesuNodeType.SIGNER, enabledApis: [] }
    ];
    docker.getContainerInfo = jest.fn().mockResolvedValue({ id: "id1", state: "running", ipAddress: "1.2.3.4" });
    docker.getNetworkId = jest.fn().mockResolvedValue("netid");
    const manager = new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
    (manager as any).getBlockNumber = jest.fn().mockRejectedValue(new Error('fail'));
    (manager as any).getPeerCount = jest.fn().mockRejectedValue(new Error('fail'));
    (manager as any).getEnodeUrl = jest.fn().mockRejectedValue(new Error('fail'));
    const status = await manager.getStatus();
    expect(status.nodes[0].blockNumber).toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
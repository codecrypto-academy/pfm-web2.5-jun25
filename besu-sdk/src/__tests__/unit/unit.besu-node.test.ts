import { jest } from '@jest/globals';
import { ethers } from 'ethers';
import Docker from 'dockerode';
import { BesuNode } from '../../core/BesuNode';
import { DockerManager } from '../../services/DockerManager';
import { NodeConfig, NodeIdentity, NodeStatus, ContainerOptions } from '../../types';
import { 
  InvalidNodeStateError, 
  DockerOperationError, 
  ContainerNotAssociatedError, 
  NodeReadinessTimeoutError 
} from '../../errors';

// Define ContainerState interface locally since it's not exported
interface ContainerState {
  running: boolean;
  paused: boolean;
  restarting: boolean;
  dead: boolean;
  status: string;
}

// Mock ethers JsonRpcProvider
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    WebSocketProvider: jest.fn(),
    Wallet: jest.fn().mockImplementation((privateKey) => ({
      connect: jest.fn().mockReturnValue({ privateKey }),
      privateKey
    }))
  }
}));

// Mock Docker
jest.mock('dockerode');

describe('BesuNode - Unit Tests', () => {
  let mockDockerManager: jest.Mocked<DockerManager>;
  let mockContainer: jest.Mocked<Docker.Container>;
  let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;
  
  const testConfig: NodeConfig = {
    name: 'test-node',
    ip: '172.20.0.10',
    validator: true,
    rpc: true,
    rpcPort: 8545
  };
  
  const testIdentity: NodeIdentity = {
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0xabcdef',
    privateKey: '0x123456'
  };
  
  const testNetworkName = 'test-network';
  const testDataPath = '/tmp/test-data';
  const testGenesisPath = '/tmp/genesis.json';
  const testBootnodes = ['enode://abc@172.20.0.11:30303'];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Docker container
    mockContainer = {
      id: 'container-123',
      start: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn(),
      inspect: jest.fn(),
      logs: jest.fn(),
      exec: jest.fn()
    } as any;
    
    // Mock DockerManager with proper return types
    mockDockerManager = {
      createContainer: jest.fn<(options: ContainerOptions) => Promise<Docker.Container>>().mockResolvedValue(mockContainer),
      startContainer: jest.fn<(container: Docker.Container) => Promise<void>>().mockResolvedValue(undefined),
      stopContainer: jest.fn<(container: Docker.Container, timeout?: number) => Promise<void>>().mockResolvedValue(undefined),
      removeContainer: jest.fn<(container: Docker.Container, force?: boolean) => Promise<void>>().mockResolvedValue(undefined),
      getContainerLogs: jest.fn<(container: Docker.Container, options?: { tail?: number; since?: number }) => Promise<string>>().mockResolvedValue('test logs'),
      getContainerState: jest.fn<(container: Docker.Container) => Promise<ContainerState>>().mockResolvedValue({ 
        running: true, 
        paused: false, 
        restarting: false, 
        dead: false, 
        status: 'running' 
      }),
      executeSystemCommand: jest.fn<(container: Docker.Container, command: string[]) => Promise<string>>().mockResolvedValue('abc123publickey'),
      pullImageIfNeeded: jest.fn<(imageName?: string) => Promise<void>>().mockResolvedValue(undefined)
    } as any;
    
    // Mock ethers JsonRpcProvider
    mockProvider = {
      getBlockNumber: jest.fn<() => Promise<number>>().mockResolvedValue(1)
    } as any;
    
    (ethers.JsonRpcProvider as jest.Mock).mockImplementation(() => mockProvider);
  });

  describe('Constructor and Getters', () => {
    let node: BesuNode;

    beforeEach(() => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
    });

    test('should initialize with correct status', () => {
      expect(node.getStatus()).toBe(NodeStatus.CREATED);
    });

    test('should return correct config', () => {
      const config = node.getConfig();
      expect(config).toEqual(testConfig);
      // Ensure it's readonly
      expect(Object.isFrozen(config)).toBe(true);
    });

    test('should return correct identity', () => {
      const identity = node.getIdentity();
      expect(identity).toEqual(testIdentity);
      // Ensure it's readonly
      expect(Object.isFrozen(identity)).toBe(true);
    });

    test('should return correct address', () => {
      expect(node.getAddress()).toBe(testIdentity.address);
    });

    test('should return correct name', () => {
      expect(node.getName()).toBe(testConfig.name);
    });

    test('should return correct validator status', () => {
      expect(node.isValidator()).toBe(true);
    });

    test('should return correct RPC URL when RPC enabled', () => {
      expect(node.getRpcUrl()).toBe('http://localhost:8545');
    });

    test('should return correct WebSocket URL when RPC enabled', () => {
      expect(node.getWsUrl()).toBe('ws://localhost:8545');
    });

    test('should return null RPC URL when RPC disabled', () => {
      const nonRpcConfig = { ...testConfig, rpc: false };
      const nonRpcNode = new (BesuNode as any)(
        nonRpcConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      expect(nonRpcNode.getRpcUrl()).toBeNull();
      expect(nonRpcNode.getWsUrl()).toBeNull();
    });

    test('should return default RPC port when RPC enabled but no port specified', () => {
      const configWithoutPort = { ...testConfig, rpcPort: undefined };
      const nodeWithDefaultPort = new (BesuNode as any)(
        configWithoutPort,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      expect(nodeWithDefaultPort.getRpcUrl()).toBe('http://localhost:8545');
    });

    test('should return RPC provider when RPC enabled', () => {
      const provider = node.getRpcProvider();
      expect(provider).toBeDefined();
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://localhost:8545');
    });

    test('should return null RPC provider when RPC disabled', () => {
      const nonRpcConfig = { ...testConfig, rpc: false };
      const nonRpcNode = new (BesuNode as any)(
        nonRpcConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      expect(nonRpcNode.getRpcProvider()).toBeNull();
    });

    test('should return WebSocket provider when RPC enabled', () => {
      const wsProvider = node.getWsProvider();
      expect(wsProvider).toBeDefined();
      expect(ethers.WebSocketProvider).toHaveBeenCalledWith('ws://localhost:8545');
    });

    test('should return null WebSocket provider when RPC disabled', () => {
      const nonRpcConfig = { ...testConfig, rpc: false };
      const nonRpcNode = new (BesuNode as any)(
        nonRpcConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      expect(nonRpcNode.getWsProvider()).toBeNull();
    });

    test('should return wallet without provider', () => {
      const wallet = node.getWallet();
      expect(wallet).toBeDefined();
      expect(ethers.Wallet).toHaveBeenCalledWith(testIdentity.privateKey);
    });

    test('should return wallet with provider', () => {
      const mockConnectedWallet = { privateKey: testIdentity.privateKey };
      const mockWallet = {
        connect: jest.fn().mockReturnValue(mockConnectedWallet)
      };
      (ethers.Wallet as unknown as jest.Mock).mockReturnValue(mockWallet);
      
      const mockProvider = {} as ethers.Provider;
      const wallet = node.getWallet(mockProvider);
      
      expect(mockWallet.connect).toHaveBeenCalledWith(mockProvider);
      expect(wallet).toBe(mockConnectedWallet);
    });

    test('should return null container ID initially', () => {
      expect(node.getContainerId()).toBeNull();
    });
  });

  describe('start() method', () => {
    let node: BesuNode;

    beforeEach(() => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
    });

    test('should throw InvalidNodeStateError if already running', async () => {
      // Set node to running state
      (node as any).setStatus(NodeStatus.RUNNING);
      
      await expect(node.start()).rejects.toThrow(InvalidNodeStateError);
      await expect(node.start()).rejects.toThrow('Cannot perform operation \'start\' on node \'test-node\' in current state \'RUNNING\'');
    });

    test('should start successfully from CREATED state', async () => {
      const statusChanges: any[] = [];
      node.on('status-change', (event) => statusChanges.push(event));

      await node.start();

      expect(mockDockerManager.createContainer).toHaveBeenCalledTimes(1);
      expect(mockDockerManager.startContainer).toHaveBeenCalledWith(mockContainer);
      expect(mockProvider.getBlockNumber).toHaveBeenCalled();
      expect(node.getStatus()).toBe(NodeStatus.RUNNING);
      expect(node.getContainerId()).toBe('container-123');
      
      // Check status change events
      expect(statusChanges).toHaveLength(2);
      expect(statusChanges[0].to).toBe(NodeStatus.STARTING);
      expect(statusChanges[1].to).toBe(NodeStatus.RUNNING);
    });

    test('should start successfully from STOPPED state', async () => {
      // Set node to stopped state with existing container
      (node as any).setStatus(NodeStatus.STOPPED);
      (node as any).container = mockContainer;

      await node.start();

      // Should not create new container, just start existing one
      expect(mockDockerManager.createContainer).toHaveBeenCalledTimes(0);
      expect(mockDockerManager.startContainer).toHaveBeenCalledWith(mockContainer);
      expect(node.getStatus()).toBe(NodeStatus.RUNNING);
    });

    test('should set status to ERROR on failure', async () => {
      const error = new Error('Docker start failed');
      mockDockerManager.startContainer.mockRejectedValue(error);

      await expect(node.start()).rejects.toThrow(error);
      expect(node.getStatus()).toBe(NodeStatus.ERROR);
    });

    test('should wait for non-RPC node readiness', async () => {
      const nonRpcConfig = { ...testConfig, rpc: false };
      const nonRpcNode = new (BesuNode as any)(
        nonRpcConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );

      await nonRpcNode.start();

      expect(mockDockerManager.getContainerState).toHaveBeenCalled();
      expect(mockProvider.getBlockNumber).not.toHaveBeenCalled();
    });
  });

  describe('stop() method', () => {
    let node: BesuNode;

    beforeEach(async () => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      // Start node first
      await node.start();
    });

    test('should throw InvalidNodeStateError if not running', async () => {
      (node as any).setStatus(NodeStatus.CREATED);
      
      await expect(node.stop()).rejects.toThrow(InvalidNodeStateError);
      await expect(node.stop()).rejects.toThrow('Cannot perform operation \'stop\' on node \'test-node\' in current state \'CREATED\'');
    });

    test('should throw ContainerNotAssociatedError if no container', async () => {
      (node as any).container = null;
      
      await expect(node.stop()).rejects.toThrow(ContainerNotAssociatedError);
      await expect(node.stop()).rejects.toThrow('Node \'test-node\' has no associated container for operation \'stop\'');
    });

    test('should stop successfully', async () => {
      const statusChanges: any[] = [];
      node.on('status-change', (event) => statusChanges.push(event));

      await node.stop();

      expect(mockDockerManager.stopContainer).toHaveBeenCalledWith(mockContainer);
      expect(node.getStatus()).toBe(NodeStatus.STOPPED);
      
      // Check status change events
      expect(statusChanges).toHaveLength(2);
      expect(statusChanges[0].to).toBe(NodeStatus.STOPPING);
      expect(statusChanges[1].to).toBe(NodeStatus.STOPPED);
    });

    test('should set status to ERROR on failure', async () => {
      const error = new Error('Docker stop failed');
      mockDockerManager.stopContainer.mockRejectedValue(error);

      await expect(node.stop()).rejects.toThrow(error);
      expect(node.getStatus()).toBe(NodeStatus.ERROR);
    });
  });

  describe('remove() method', () => {
    let node: BesuNode;

    beforeEach(async () => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      await node.start();
    });

    test('should remove container successfully', async () => {
      await node.remove();

      expect(mockDockerManager.removeContainer).toHaveBeenCalledWith(mockContainer, true);
      expect(node.getContainerId()).toBeNull();
    });

    test('should handle removal when no container exists', async () => {
      (node as any).container = null;

      await node.remove();

      expect(mockDockerManager.removeContainer).not.toHaveBeenCalled();
    });

    test('should propagate removal errors', async () => {
      const error = new Error('Removal failed');
      mockDockerManager.removeContainer.mockRejectedValue(error);

      await expect(node.remove()).rejects.toThrow(error);
    });
  });

  describe('getLogs() method', () => {
    let node: BesuNode;

    beforeEach(async () => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      await node.start();
    });

    test('should get logs successfully', async () => {
      const logs = await node.getLogs(50);

      expect(mockDockerManager.getContainerLogs).toHaveBeenCalledWith(mockContainer, { tail: 50 });
      expect(logs).toBe('test logs');
    });

    test('should use default tail value', async () => {
      await node.getLogs();

      expect(mockDockerManager.getContainerLogs).toHaveBeenCalledWith(mockContainer, { tail: 100 });
    });

    test('should throw error when no container', async () => {
      (node as any).container = null;

      await expect(node.getLogs()).rejects.toThrow('Container not found');
    });
  });

  describe('getEnodeUrl() method', () => {
    let node: BesuNode;

    beforeEach(async () => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
      await node.start();
    });

    test('should throw InvalidNodeStateError if not running', async () => {
      (node as any).setStatus(NodeStatus.CREATED);
      
      await expect(node.getEnodeUrl()).rejects.toThrow(InvalidNodeStateError);
      await expect(node.getEnodeUrl()).rejects.toThrow('Cannot perform operation \'getEnodeUrl\' on node \'test-node\' in current state \'CREATED\'');
    });

    test('should throw InvalidNodeStateError if no container', async () => {
      (node as any).container = null;
      
      await expect(node.getEnodeUrl()).rejects.toThrow(InvalidNodeStateError);
    });

    test('should return correct enode URL', async () => {
      const enodeUrl = await node.getEnodeUrl();

      expect(mockDockerManager.executeSystemCommand).toHaveBeenCalledWith(
        mockContainer,
        ['besu', 'public-key', 'export']
      );
      expect(enodeUrl).toBe('enode://abc123publickey@172.20.0.10:30303');
    });

    test('should propagate command execution errors', async () => {
      const error = new Error('Command failed');
      mockDockerManager.executeSystemCommand.mockRejectedValue(error);

      await expect(node.getEnodeUrl()).rejects.toThrow(error);
    });
  });

  describe('createContainer() method (tested indirectly)', () => {
    let node: BesuNode;

    beforeEach(() => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
    });

    test('should create container with correct options', async () => {
      await node.start();

      expect(mockDockerManager.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'besu-test-network-test-node',
          image: 'hyperledger/besu:latest',
          env: expect.arrayContaining([
            'BESU_LOGGING=INFO',
            'BESU_DATA_PATH=/data',
            'BESU_GENESIS_FILE=/data/genesis.json',
            'BESU_NODE_PRIVATE_KEY_FILE=/data/key',
            'BESU_P2P_HOST=172.20.0.10',
            'BESU_P2P_PORT=30303',
            'BESU_MINER_COINBASE=0x1234567890123456789012345678901234567890',
            'BESU_RPC_HTTP_ENABLED=true',
            'BESU_RPC_HTTP_HOST=0.0.0.0',
            'BESU_RPC_HTTP_PORT=8545',
            'BESU_BOOTNODES=enode://abc@172.20.0.11:30303'
          ]),
          volumes: expect.arrayContaining([
            expect.stringMatching(/\/tmp\/test-data\/nodes\/test-node:\/data/),
            '/tmp/genesis.json:/data/genesis.json:ro'
          ]),
          networkMode: 'test-network',
          networks: {
            'test-network': {
              ipv4Address: '172.20.0.10'
            }
          },
          ports: {
            '8545': { hostPort: 8545 }
          }
        })
      );
    });

    test('should not include RPC config for non-RPC nodes', async () => {
      const nonRpcConfig = { ...testConfig, rpc: false };
      const nonRpcNode = new (BesuNode as any)(
        nonRpcConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );

      await nonRpcNode.start();

      const callArgs = mockDockerManager.createContainer.mock.calls[0][0];
      expect(callArgs.env).not.toContain('BESU_RPC_HTTP_ENABLED=true');
      expect(callArgs.ports).toBeUndefined();
    });

    test('should not include port mapping when RPC enabled but no port specified', async () => {
      const configWithoutPort = { ...testConfig, rpcPort: undefined };
      const nodeWithoutPort = new (BesuNode as any)(
        configWithoutPort,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );

      await nodeWithoutPort.start();

      const callArgs = mockDockerManager.createContainer.mock.calls[0][0];
      expect(callArgs.ports).toBeUndefined();
    });

    test('should not include bootnodes when empty', async () => {
      const nodeWithoutBootnodes = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        []
      );

      await nodeWithoutBootnodes.start();

      const callArgs = mockDockerManager.createContainer.mock.calls[0][0];
      expect(callArgs.env).not.toContain(expect.stringMatching(/BESU_BOOTNODES=/));
    });
  });

  describe('waitForNodeReady() method (tested indirectly)', () => {
    let node: BesuNode;

    beforeEach(() => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
    });

    test('should timeout for RPC node when provider not ready', async () => {
      mockProvider.getBlockNumber.mockRejectedValue(new Error('Not ready'));
      
      // Override timeout to make test faster
      const originalWaitForNodeReady = (node as any).waitForNodeReady;
      (node as any).waitForNodeReady = jest.fn().mockImplementation(() => 
        originalWaitForNodeReady.call(node, 1000) // 1 second timeout
      );

      await expect(node.start()).rejects.toThrow(NodeReadinessTimeoutError);
    });

    test('should timeout for non-RPC node when container not ready', async () => {
      const nonRpcConfig = { ...testConfig, rpc: false };
      const nonRpcNode = new (BesuNode as any)(
        nonRpcConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );

      mockDockerManager.getContainerState.mockResolvedValue({ 
        running: false, 
        paused: false, 
        restarting: true,
        dead: false,
        status: 'restarting'
      });

      // Override timeout to make test faster
      const originalWaitForNodeReady = (nonRpcNode as any).waitForNodeReady;
      (nonRpcNode as any).waitForNodeReady = jest.fn().mockImplementation(() => 
        originalWaitForNodeReady.call(nonRpcNode, 1000) // 1 second timeout
      );

      await expect(nonRpcNode.start()).rejects.toThrow(NodeReadinessTimeoutError);
    });
  });

  describe('setStatus() method and events', () => {
    let node: BesuNode;

    beforeEach(() => {
      node = new (BesuNode as any)(
        testConfig,
        testIdentity,
        mockDockerManager,
        testNetworkName,
        testDataPath,
        testGenesisPath,
        testBootnodes
      );
    });

    test('should emit status-change event', () => {
      const statusChangeHandler = jest.fn();
      node.on('status-change', statusChangeHandler);

      (node as any).setStatus(NodeStatus.STARTING);

      expect(statusChangeHandler).toHaveBeenCalledWith({
        nodeName: 'test-node',
        from: NodeStatus.CREATED,
        to: NodeStatus.STARTING,
        timestamp: expect.any(Date)
      });
      expect(node.getStatus()).toBe(NodeStatus.STARTING);
    });

    test('should support once() event listener', () => {
      const statusChangeHandler = jest.fn();
      node.once('status-change', statusChangeHandler);

      (node as any).setStatus(NodeStatus.STARTING);
      (node as any).setStatus(NodeStatus.RUNNING);

      expect(statusChangeHandler).toHaveBeenCalledTimes(1);
    });

    test('should support off() event listener removal', () => {
      const statusChangeHandler = jest.fn();
      node.on('status-change', statusChangeHandler);
      node.off('status-change', statusChangeHandler);

      (node as any).setStatus(NodeStatus.STARTING);

      expect(statusChangeHandler).not.toHaveBeenCalled();
    });
  });
}); 
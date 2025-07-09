/**
 * Network Unit Tests - Internal Logic and EventEmitter Testing
 * 
 * This test suite focuses on testing the Network class's internal logic,
 * EventEmitter functionality, and auxiliary functions with extensive mocking.
 * All external dependencies are mocked to isolate the Network class behavior.
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { Network } from '../../core/Network';
import { BesuNode } from '../../core/BesuNode';
import { DockerManager } from '../../services/DockerManager';
import { FileManager } from '../../services/FileManager';
import { logger } from '../../utils/logger';
import * as keyGenerator from '../../utils/key-generator';
import {
  NetworkConfig,
  NetworkStatus,
  NodeStatus,
  NodeConfig,
  NodeIdentity,
  NodeOptions
} from '../../types';
import {
  NodeNotFoundError,
  InvalidNetworkStateError
} from '../../errors';

// Mock all dependencies
jest.mock('../../core/BesuNode');
jest.mock('../../services/DockerManager');
jest.mock('../../services/FileManager');
jest.mock('../../utils/logger');
jest.mock('../../utils/key-generator');
jest.mock('ethers');

describe('Network Unit Tests', () => {
  let network: Network;
  let mockDockerManager: jest.Mocked<DockerManager>;
  let mockFileManager: jest.Mocked<FileManager>;
  let mockDockerNetwork: any;
  let mockLogger: any;
  let mockBesuNode: jest.Mocked<BesuNode>;
  let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;

  const mockConfig: NetworkConfig = {
    chainId: 1337,
    blockPeriodSeconds: 5,
    network: {
      name: 'test-network',
      subnet: '172.20.0.0/16'
    },
    nodes: [
      {
        name: 'validator1',
        ip: '172.20.0.10',
        validator: true,
        rpc: true,
        rpcPort: 8545
      },
      {
        name: 'node1',
        ip: '172.20.0.11',
        rpc: false
      }
    ]
  };

  const mockIdentity: NodeIdentity = {
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DockerManager
    mockDockerManager = {
      createNetwork: jest.fn(),
      removeNetwork: jest.fn(),
      networkExists: jest.fn().mockResolvedValue(false),
      pullImageIfNeeded: jest.fn(),
      createContainer: jest.fn(),
      startContainer: jest.fn(),
      stopContainer: jest.fn(),
      removeContainer: jest.fn(),
      getContainerState: jest.fn(),
      getContainerLogs: jest.fn(),
      listContainers: jest.fn(),
      removeContainers: jest.fn(),
      cleanupAll: jest.fn()
    } as any;

    // Mock FileManager
    mockFileManager = {
      ensureDirectory: jest.fn(),
      writeFile: jest.fn(),
      writeJSON: jest.fn(),
      readFile: jest.fn(),
      readJSON: jest.fn(),
      exists: jest.fn(),
      removeFile: jest.fn(),
      removeDirectory: jest.fn(),
      createNetworkStructure: jest.fn(),
      writeNodeKeys: jest.fn()
    } as any;

    // Mock Docker Network
    mockDockerNetwork = {
      id: 'network123',
      inspect: jest.fn().mockResolvedValue({
        Name: 'test-network',
        Id: 'network123'
      })
    };

    // Mock Logger
    mockLogger = {
      divider: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnThis()
    };

    // Mock BesuNode
    mockBesuNode = {
      getName: jest.fn().mockReturnValue('validator1'),
      getAddress: jest.fn().mockReturnValue(mockIdentity.address),
      isValidator: jest.fn().mockReturnValue(true),
      getRpcUrl: jest.fn().mockReturnValue('http://localhost:8545'),
      getRpcProvider: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn(),
      getStatus: jest.fn().mockReturnValue(NodeStatus.RUNNING),
      getConfig: jest.fn(),
      getIdentity: jest.fn().mockReturnValue(mockIdentity),
      getEnodeUrl: jest.fn().mockResolvedValue('enode://abc123@172.20.0.10:30303'),
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn()
    } as any;

    // Mock ethers provider
    mockProvider = {
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      getBlockNumber: jest.fn().mockResolvedValue(100),
      getBlock: jest.fn().mockResolvedValue({
        number: 100,
        miner: mockIdentity.address,
        timestamp: Date.now(),
        gasUsed: '21000',
        transactions: []
      })
    } as any;

    // Mock key generator
    (keyGenerator.generateNodeIdentity as jest.Mock).mockResolvedValue(mockIdentity);
    (keyGenerator.formatPrivateKeyForBesu as jest.Mock).mockReturnValue('1234567890abcdef');

    // Mock constructors
    (DockerManager as jest.MockedClass<typeof DockerManager>).mockImplementation(() => mockDockerManager);
    (FileManager as jest.MockedClass<typeof FileManager>).mockImplementation(() => mockFileManager);
    (BesuNode as jest.MockedClass<typeof BesuNode>).mockImplementation(() => mockBesuNode);
    (logger as any).child = jest.fn().mockReturnValue(mockLogger);

    // Setup successful defaults
    mockDockerManager.createNetwork.mockResolvedValue(mockDockerNetwork);
    mockBesuNode.getRpcProvider.mockReturnValue(mockProvider);

    // Create Network instance
    network = new (Network as any)(mockConfig, mockDockerManager, mockFileManager, './test-data');
  });

  describe('Getters', () => {
    test('getStatus returns correct status', () => {
      expect(network.getStatus()).toBe(NetworkStatus.UNINITIALIZED);
    });

    test('getConfig returns readonly config', () => {
      const config = network.getConfig();
      expect(config).toEqual(mockConfig);
      expect(Object.isFrozen(config)).toBe(true);
    });

    test('getDockerNetworkName returns network name', () => {
      expect(network.getDockerNetworkName()).toBe('test-network');
    });

    test('getDataDirectory returns correct path', () => {
      expect(network.getDataDirectory()).toBe('./test-data/test-network');
    });

    test('getNodes returns copy of nodes map', async () => {
      // Add a node to the internal map
      await network.setup();
      const nodes = network.getNodes();
      expect(nodes instanceof Map).toBe(true);
      // Ensure it's a copy, not the original
      expect(nodes).not.toBe((network as any).nodes);
    });

    test('getNode throws NodeNotFoundError for non-existent node', () => {
      expect(() => network.getNode('non-existent')).toThrow(NodeNotFoundError);
      expect(() => network.getNode('non-existent')).toThrow("Node 'non-existent' not found in the network.");
    });

    test('getNode returns correct node when it exists', async () => {
      await network.setup();
      // Mock that the node exists in the internal map
      (network as any).nodes.set('validator1', mockBesuNode);
      const node = network.getNode('validator1');
      expect(node).toBe(mockBesuNode);
    });

    test('getRpcNode returns null when no RPC nodes exist', () => {
      mockBesuNode.getRpcUrl.mockReturnValue(null);
      (network as any).nodes.set('node1', mockBesuNode);
      
      const rpcNode = network.getRpcNode();
      expect(rpcNode).toBeNull();
    });

    test('getRpcNode returns first available RPC node', () => {
      mockBesuNode.getRpcUrl.mockReturnValue('http://localhost:8545');
      (network as any).nodes.set('validator1', mockBesuNode);
      
      const rpcNode = network.getRpcNode();
      expect(rpcNode).toBe(mockBesuNode);
    });

    test('getProvider returns null when no RPC nodes exist', () => {
      jest.spyOn(network, 'getRpcNode').mockReturnValue(null);
      
      const provider = network.getProvider();
      expect(provider).toBeNull();
    });

    test('getProvider returns provider from RPC node', () => {
      jest.spyOn(network, 'getRpcNode').mockReturnValue(mockBesuNode);
      
      const provider = network.getProvider();
      expect(provider).toBe(mockProvider);
      expect(mockBesuNode.getRpcProvider).toHaveBeenCalled();
    });
  });

  describe('generateGenesis', () => {
    beforeEach(async () => {
      await network.setup();
    });

    test('calls writeNodeKeys for each node', () => {
      expect(mockFileManager.writeNodeKeys).toHaveBeenCalledTimes(mockConfig.nodes.length);
      expect(mockFileManager.writeNodeKeys).toHaveBeenCalledWith(
        expect.stringContaining('validator1'),
        mockIdentity.privateKey,
        mockIdentity.publicKey,
        mockIdentity.address
      );
    });

    test('generates genesis.json with correct structure', () => {
      expect(mockFileManager.writeJSON).toHaveBeenCalledWith(
        expect.stringContaining('genesis.json'),
        expect.objectContaining({
          config: expect.objectContaining({
            chainId: 1337,
            clique: expect.objectContaining({
              period: 5
            })
          }),
          extraData: expect.any(String),
          alloc: expect.any(Object)
        })
      );
    });

    test('uses correct hex-encoded balances in alloc', () => {
      const genesisCall = mockFileManager.writeJSON.mock.calls.find(
        call => call[0].includes('genesis.json')
      );
      expect(genesisCall).toBeDefined();
      
      const genesis = genesisCall![1];
      expect(genesis.alloc[mockIdentity.address]).toEqual({
        balance: expect.stringMatching(/^0x[0-9a-fA-F]+$/)
      });
    });

    test('uses default balance when not specified', () => {
      const genesisCall = mockFileManager.writeJSON.mock.calls.find(
        call => call[0].includes('genesis.json')
      );
      expect(genesisCall).toBeDefined();
      
      const genesis = genesisCall![1];
      // Should have a large default balance (converted to hex)
      expect(genesis.alloc[mockIdentity.address].balance).toEqual(
        expect.stringMatching(/^0x[0-9a-fA-F]{15,}$/) // At least 15 hex chars for a large number
      );
    });
  });

  describe('createAndStartNode', () => {
    let nodeConfig: NodeConfig;

    beforeEach(() => {
      nodeConfig = mockConfig.nodes[0];
    });

    test('instantiates BesuNode with correct parameters', async () => {
      await network.setup();
      
      expect(BesuNode).toHaveBeenCalledWith(
        nodeConfig,
        mockIdentity,
        mockDockerManager,
        'test-network',
        expect.stringContaining('validator1'),
        expect.stringContaining('genesis.json'),
        expect.any(Array) // bootnodes
      );
    });

    test('calls node.start()', async () => {
      await network.setup();
      
      expect(mockBesuNode.start).toHaveBeenCalled();
    });

    test('adds node to internal maps', async () => {
      await network.setup();
      
      const nodes = (network as any).nodes;
      expect(nodes.has('validator1')).toBe(true);
      expect(nodes.get('validator1')).toBe(mockBesuNode);
    });

    test('handles bootnodes correctly', async () => {
      // Mock first node setup
      const firstNode = { ...mockBesuNode };
      firstNode.getEnodeUrl = jest.fn().mockResolvedValue('enode://first@172.20.0.10:30303');
      (BesuNode as jest.MockedClass<typeof BesuNode>).mockImplementationOnce(() => firstNode as any);
      
      await network.setup();
      
      // Check that subsequent nodes get bootnodes
      if (mockConfig.nodes.length > 1) {
        expect(BesuNode).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.arrayContaining([expect.stringContaining('enode://')])
        );
      }
    });

    test('handles enodeUrl warning from BesuNode', async () => {
      mockBesuNode.getEnodeUrl.mockRejectedValue(new Error('Node not ready'));
      
      await network.setup();
      
      // Should still complete setup despite enode URL warning
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);
    });
  });

  describe('Block Monitoring', () => {
    beforeEach(async () => {
      (network as any).nodes.set('validator1', mockBesuNode);
      jest.spyOn(network, 'getRpcNode').mockReturnValue(mockBesuNode);
    });

    test('startBlockMonitoring calls provider.on', async () => {
      await (network as any).startBlockMonitoring();
      
      expect(mockProvider.on).toHaveBeenCalledWith('block', expect.any(Function));
    });

    test('stopBlockMonitoring calls removeAllListeners', () => {
      (network as any).provider = mockProvider;
      (network as any).stopBlockMonitoring();
      
      expect(mockProvider.removeAllListeners).toHaveBeenCalledWith('block');
    });

    test('emits new-block event with correct data', async () => {
      const mockBlock = {
        number: 100,
        miner: mockIdentity.address,
        timestamp: 1234567890,
        gasUsed: '21000',
        transactions: ['0xabc123']
      };
      
      mockProvider.getBlock.mockResolvedValue(mockBlock as any);
      
      const eventSpy = jest.fn();
      network.on('new-block', eventSpy);
      
      await (network as any).startBlockMonitoring();
      
      // Simulate block event
      const blockHandler = mockProvider.on.mock.calls[0][1];
      await blockHandler(100);
      
      expect(eventSpy).toHaveBeenCalledWith({
        number: 100,
        miner: mockIdentity.address,
        timestamp: 1234567890,
        gasUsed: '21000',
        transactionCount: 1
      });
    });
  });

  describe('saveNetworkMetadata', () => {
    test('calls FileManager.writeJSON with correct structure', async () => {
      (network as any).dockerNetwork = mockDockerNetwork;
      (network as any).nodes.set('validator1', mockBesuNode);
      
      await (network as any).saveNetworkMetadata();
      
      expect(mockFileManager.writeJSON).toHaveBeenCalledWith(
        expect.stringContaining('network.json'),
        expect.objectContaining({
          name: 'test-network',
          chainId: 1337,
          createdAt: expect.any(String),
          dockerNetworkId: 'network123',
          dataDirectory: expect.stringContaining('test-network'),
          nodes: expect.objectContaining({
            validator1: expect.objectContaining({
              address: mockIdentity.address,
              ip: '172.20.0.10',
              isValidator: true
            })
          })
        })
      );
    });
  });

  describe('logNetworkInfo', () => {
    test('calls logger with network information', () => {
      (network as any).nodes.set('validator1', mockBesuNode);
      (network as any).logNetworkInfo();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Network Information')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Chain ID: 1337')
      );
    });
  });

  describe('validateState', () => {
    test('throws InvalidNetworkStateError for forbidden state transitions', () => {
      // Set network to RUNNING state
      (network as any).setStatus(NetworkStatus.RUNNING);
      
      expect(() => {
        (network as any).validateState(NetworkStatus.UNINITIALIZED);
      }).toThrow(InvalidNetworkStateError);
    });

    test('allows valid state transitions', () => {
      // Set network to UNINITIALIZED
      expect(() => {
        (network as any).validateState(NetworkStatus.UNINITIALIZED, NetworkStatus.INITIALIZING);
      }).not.toThrow();
    });
  });

  describe('setStatus', () => {
    test('updates internal state', () => {
      const oldStatus = network.getStatus();
      (network as any).setStatus(NetworkStatus.INITIALIZING);
      
      expect(network.getStatus()).toBe(NetworkStatus.INITIALIZING);
      expect(network.getStatus()).not.toBe(oldStatus);
    });

    test('emits status-change event with correct data', () => {
      const eventSpy = jest.fn();
      network.on('status-change', eventSpy);
      
      const oldStatus = network.getStatus();
      (network as any).setStatus(NetworkStatus.INITIALIZING);
      
      expect(eventSpy).toHaveBeenCalledWith({
        from: oldStatus,
        to: NetworkStatus.INITIALIZING,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('addNode funding failures', () => {
    let mockWallet: any;
    let mockTx: any;

    beforeEach(() => {
      // Mock ethers components for funding
      mockTx = {
        wait: jest.fn(),
        hash: '0xabc123'
      };
      
      mockWallet = {
        sendTransaction: jest.fn().mockResolvedValue(mockTx)
      };
      
      mockBesuNode.getWallet.mockReturnValue(mockWallet);
      
      // Set up network in running state with existing nodes
      (network as any).setStatus(NetworkStatus.RUNNING);
      (network as any).nodes.set('validator1', mockBesuNode);
      (network as any).validators.add('validator1');
    });

    test('logs warning when sendTransaction fails but still adds node', async () => {
      mockWallet.sendTransaction.mockRejectedValue(new Error('Insufficient funds'));
      
      const nodeOptions: NodeOptions = {
        name: 'new-node',
        ip: '172.20.0.20',
        initialBalance: '10'
      };
      
      const newNode = await network.addNode(nodeOptions);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fund new node'),
        expect.any(Error)
      );
      expect(newNode).toBeDefined();
      expect((network as any).nodes.has('new-node')).toBe(true);
    });

    test('logs warning when tx.wait fails but still adds node', async () => {
      mockTx.wait.mockRejectedValue(new Error('Transaction failed'));
      
      const nodeOptions: NodeOptions = {
        name: 'new-node',
        ip: '172.20.0.20',
        initialBalance: '10'
      };
      
      const newNode = await network.addNode(nodeOptions);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fund new node'),
        expect.any(Error)
      );
      expect(newNode).toBeDefined();
      expect((network as any).nodes.has('new-node')).toBe(true);
    });

    test('still adds unfunded node when funding fails', async () => {
      mockWallet.sendTransaction.mockRejectedValue(new Error('Network error'));
      
      const nodeOptions: NodeOptions = {
        name: 'new-node',
        ip: '172.20.0.20',
        initialBalance: '5'
      };
      
      const addedNode = await network.addNode(nodeOptions);
      
      // Node should still be added despite funding failure
      expect(addedNode).toBe(mockBesuNode);
      expect((network as any).nodes.get('new-node')).toBe(mockBesuNode);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('EventEmitter functionality', () => {
    test('extends EventEmitter correctly', () => {
      expect(network).toBeInstanceOf(EventEmitter);
    });

    test('supports typed event emission', () => {
      const eventSpy = jest.fn();
      network.on('network-ready', eventSpy);
      
      network.emit('network-ready');
      
      expect(eventSpy).toHaveBeenCalled();
    });

    test('supports multiple event listeners', () => {
      const spy1 = jest.fn();
      const spy2 = jest.fn();
      
      network.on('network-ready', spy1);
      network.on('network-ready', spy2);
      
      network.emit('network-ready');
      
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    test('supports once listeners', () => {
      const eventSpy = jest.fn();
      network.once('network-ready', eventSpy);
      
      network.emit('network-ready');
      network.emit('network-ready');
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    test('supports removing listeners', () => {
      const eventSpy = jest.fn();
      network.on('network-ready', eventSpy);
      network.off('network-ready', eventSpy);
      
      network.emit('network-ready');
      
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
}); 
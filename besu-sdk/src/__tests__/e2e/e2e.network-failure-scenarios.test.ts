import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import Docker from 'dockerode';
import { BesuNetworkBuilder } from '../../core/NetworkBuilder';
import { Network } from '../../core/Network';
import { NetworkStatus, NodeStatus } from '../../types';
import { DockerManager } from '../../services/DockerManager';
import { SystemValidator } from '../../services/SystemValidator';
import {
  DockerNotAvailableError,
  InsufficientResourcesError,
  ChainIdConflictError,
  SubnetConflictError,
  DockerOperationError,
  InvalidNetworkStateError,
  ConfigurationValidationError,
  DuplicateNodeNameError,
  IPAddressConflictError,
  NodeNotFoundError
} from '../../errors';

describe('Network Failure Scenarios - E2E Tests', () => {
  let tempDir: string;
  let originalDocker: any;
  let mockDocker: jest.Mocked<Docker>;

  beforeEach(async () => {
    // Create unique temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'network-failure-test-'));
    
    // Setup Docker mocks
    mockDocker = {
      ping: jest.fn(),
      info: jest.fn(),
      version: jest.fn(),
      getImage: jest.fn(),
      listNetworks: jest.fn(),
      createNetwork: jest.fn(),
      getNetwork: jest.fn(),
      listContainers: jest.fn(),
      createContainer: jest.fn(),
      getContainer: jest.fn()
    } as any;
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Restore original Docker if mocked
    if (originalDocker) {
      // Restore any global mocks if needed
      jest.restoreAllMocks();
    }
  });

  describe('Docker Daemon Unavailable', () => {
    test('NetworkBuilder.build() with Docker stopped throws DockerNotAvailableError', async () => {
      // Mock Docker ping to fail
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      mockDocker.ping.mockRejectedValue(new Error('Connect ECONNREFUSED'));

      const builder = new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir);

      await expect(builder.build()).rejects.toThrow(DockerNotAvailableError);
      expect(mockDocker.ping).toHaveBeenCalled();
    });

    test('SystemValidator.checkPrerequisites failure propagates through NetworkBuilder', async () => {
      // Mock SystemValidator to throw DockerNotAvailableError
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockRejectedValue(
        new DockerNotAvailableError('Docker daemon not accessible')
      );

      const builder = new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir);

      await expect(builder.build()).rejects.toThrow(DockerNotAvailableError);
    });
  });

  describe('Insufficient System Resources', () => {
    test('NetworkBuilder.build() throws InsufficientResourcesError for insufficient memory', async () => {
      // Mock SystemValidator to throw InsufficientResourcesError
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockRejectedValue(
        new InsufficientResourcesError('memory', '4096MB', '1024MB')
      );

      const builder = new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .addValidator('validator2', '172.20.0.11')
        .addValidator('validator3', '172.20.0.12')
        .addValidator('validator4', '172.20.0.13')
        .addValidator('validator5', '172.20.0.14')
        .withDataDirectory(tempDir);

      await expect(builder.build()).rejects.toThrow(InsufficientResourcesError);
    });

    test('NetworkBuilder.build() throws InsufficientResourcesError for insufficient disk space', async () => {
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockRejectedValue(
        new InsufficientResourcesError('disk space', '10240MB', '2048MB')
      );

      const builder = new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir);

      await expect(builder.build()).rejects.toThrow(InsufficientResourcesError);
    });
  });

  describe('ChainId Conflict', () => {
    test('Create network A, teardown(false), then attempt to create network B with same chainId throws ChainIdConflictError', async () => {
      // Mock successful Docker operations for the first network
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();
      
      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);
      
      const mockNetwork = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetwork as any);
      mockDocker.getNetwork.mockReturnValue(mockNetwork as any);

      // Create first network with chainId 1337
      const networkA = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('network-a')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build(false); // Don't auto-start

      // Simulate teardown without removing data (teardown(false))
      await networkA.teardown(false);

      // Attempt to create second network with same chainId but different name
      const builderB = new BesuNetworkBuilder()
        .withChainId(1337) // Same chainId as network A
        .withBlockPeriod(5)
        .withNetworkName('network-b') // Different name
        .withSubnet('172.21.0.0/16')
        .addValidator('validator1', '172.21.0.10')
        .withDataDirectory(tempDir);

      await expect(builderB.build(false)).rejects.toThrow(ChainIdConflictError);
    });
  });

  describe('Subnet Conflict', () => {
    test('Create network A, then attempt to create network B with same subnet throws SubnetConflictError', async () => {
      // Mock Docker to return existing network with same subnet
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);

      // First call: no conflicting networks
      // Second call: return existing network with same subnet
      mockDocker.listNetworks
        .mockResolvedValueOnce([]) // First network creation succeeds
        .mockResolvedValueOnce([   // Second network creation detects conflict
          {
            Name: 'network-a',
            IPAM: {
              Config: [{ Subnet: '172.20.0.0/16' }]
            }
          }
        ] as any);

      const mockNetwork = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetwork as any);
      mockDocker.getNetwork.mockReturnValue(mockNetwork as any);

      // Create first network successfully
      await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('network-a')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build(false);

      // Attempt to create second network with same subnet
      const builderB = new BesuNetworkBuilder()
        .withChainId(1338) // Different chainId
        .withBlockPeriod(5)
        .withNetworkName('network-b')
        .withSubnet('172.20.0.0/16') // Same subnet as network A
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir);

      await expect(builderB.build(false)).rejects.toThrow(SubnetConflictError);
    });
  });

  describe('Port in Use', () => {
    test('Create two networks attempting to use the same RPC port fails with DockerOperationError', async () => {
      // Mock Docker operations
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetwork1 = {
        id: 'network-1',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      const mockNetwork2 = {
        id: 'network-2',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.21.0.0/16' }] }
        })
      };

      mockDocker.createNetwork
        .mockResolvedValueOnce(mockNetwork1 as any)
        .mockResolvedValueOnce(mockNetwork2 as any);
      
      mockDocker.getNetwork
        .mockReturnValueOnce(mockNetwork1 as any)
        .mockReturnValueOnce(mockNetwork2 as any);

      // Mock container creation to succeed for first network, fail for second due to port conflict
      const mockContainer1 = {
        id: 'container-1',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from(''))
      };

      mockDocker.createContainer
        .mockResolvedValueOnce(mockContainer1 as any)
        .mockRejectedValueOnce(new Error('Port 8545 is already allocated'));

      // Create first network with RPC on port 8545
      const networkA = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('network-a')
        .withSubnet('172.20.0.0/16')
        .addRpcNode('rpc1', '172.20.0.10', 8545)
        .withDataDirectory(tempDir)
        .build(false);

      await networkA.setup();

      // Attempt to create second network with RPC on the same port 8545
      const networkB = await new BesuNetworkBuilder()
        .withChainId(1338)
        .withBlockPeriod(5)
        .withNetworkName('network-b')
        .withSubnet('172.21.0.0/16')
        .addRpcNode('rpc2', '172.21.0.10', 8545) // Same port
        .withDataDirectory(tempDir)
        .build(false);

      await expect(networkB.setup()).rejects.toThrow();
    });
  });

  describe('Node Fails to Start', () => {
    test('Network.setup() goes to ERROR state when node fails to start and attempts cleanup', async () => {
      // Mock Docker operations
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetwork = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetwork as any);
      mockDocker.getNetwork.mockReturnValue(mockNetwork as any);

      // Mock container creation to succeed but container never becomes running
      const mockContainer = {
        id: 'container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: false, ExitCode: 1 } }),
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from('Container failed to start')),
        stop: jest.fn(),
        remove: jest.fn()
      };

      mockDocker.createContainer.mockResolvedValue(mockContainer as any);
      mockDocker.getContainer.mockReturnValue(mockContainer as any);

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build(false);

      // Setup should fail and network should be in ERROR state
      await expect(network.setup()).rejects.toThrow();
      expect(network.getStatus()).toBe(NetworkStatus.ERROR);
    });

    test('waitForNodeReady timeout causes node startup failure', async () => {
      // This test simulates a container that starts but Besu process never becomes ready
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetwork = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetwork as any);
      mockDocker.getNetwork.mockReturnValue(mockNetwork as any);

      // Mock container that starts but logs never show "Node is ready"
      const mockContainer = {
        id: 'container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from('Besu starting...\nWaiting for genesis...')), // Never ready
        stop: jest.fn(),
        remove: jest.fn()
      };

      mockDocker.createContainer.mockResolvedValue(mockContainer as any);
      mockDocker.getContainer.mockReturnValue(mockContainer as any);

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build(false);

      // Setup should timeout waiting for node to be ready
      await expect(network.setup()).rejects.toThrow();
    });
  });

  describe('Invalid State Operations', () => {
    let network: Network;

    beforeEach(async () => {
      // Create a network for state testing
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetworkObj = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetworkObj as any);
      mockDocker.getNetwork.mockReturnValue(mockNetworkObj as any);

      const mockContainer = {
        id: 'container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from('Node is ready')),
        stop: jest.fn(),
        remove: jest.fn()
      };

      mockDocker.createContainer.mockResolvedValue(mockContainer as any);
      mockDocker.getContainer.mockReturnValue(mockContainer as any);

      network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build(false);
    });

    test('network.setup() on RUNNING network throws InvalidNetworkStateError', async () => {
      // First setup should succeed
      await network.setup();
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);

      // Second setup should fail
      await expect(network.setup()).rejects.toThrow(InvalidNetworkStateError);
    });

    test('network.addNode() on STOPPED network throws InvalidNetworkStateError', async () => {
      // Setup then teardown to get STOPPED state
      await network.setup();
      await network.teardown();
      expect(network.getStatus()).toBe(NetworkStatus.STOPPED);

      // Adding node to stopped network should fail
      await expect(network.addNode({
        name: 'new-node',
        ip: '172.20.0.11',
        validator: false
      })).rejects.toThrow(InvalidNetworkStateError);
    });

    test('network.teardown() on UNINITIALIZED network throws InvalidNetworkStateError', async () => {
      // Network is UNINITIALIZED by default
      expect(network.getStatus()).toBe(NetworkStatus.UNINITIALIZED);

      // Teardown should fail
      await expect(network.teardown()).rejects.toThrow(InvalidNetworkStateError);
    });
  });

  describe('addNode() with invalid parameters', () => {
    let network: Network;

    beforeEach(async () => {
      // Create a running network for addNode testing
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetworkObj = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetworkObj as any);
      mockDocker.getNetwork.mockReturnValue(mockNetworkObj as any);

      const mockContainer = {
        id: 'container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from('Node is ready')),
        stop: jest.fn(),
        remove: jest.fn()
      };

      mockDocker.createContainer.mockResolvedValue(mockContainer as any);
      mockDocker.getContainer.mockReturnValue(mockContainer as any);

      network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build();
    });

    test('Duplicate node name throws DuplicateNodeNameError', async () => {
      await expect(network.addNode({
        name: 'validator1', // Same name as existing node
        ip: '172.20.0.11',
        validator: false
      })).rejects.toThrow(DuplicateNodeNameError);
    });

    test('Duplicate IP address throws IPAddressConflictError', async () => {
      await expect(network.addNode({
        name: 'new-node',
        ip: '172.20.0.10', // Same IP as existing node
        validator: false
      })).rejects.toThrow(IPAddressConflictError);
    });

    test('IP outside subnet throws ConfigurationValidationError', async () => {
      await expect(network.addNode({
        name: 'new-node',
        ip: '192.168.1.10', // Outside 172.20.0.0/16 subnet
        validator: false
      })).rejects.toThrow(ConfigurationValidationError);
    });

    test('Invalid IP format throws ConfigurationValidationError', async () => {
      await expect(network.addNode({
        name: 'new-node',
        ip: '300.300.300.300', // Invalid IP
        validator: false
      })).rejects.toThrow(ConfigurationValidationError);
    });
  });

  describe('Container stops unexpectedly', () => {
    test('getEnodeUrl() on stopped node fails appropriately', async () => {
      // Mock Docker operations
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetworkObj = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetworkObj as any);
      mockDocker.getNetwork.mockReturnValue(mockNetworkObj as any);

      // Mock container that starts but then stops unexpectedly
      const mockContainer = {
        id: 'container-id',
        inspect: jest.fn()
          .mockResolvedValueOnce({ State: { Running: true } }) // Initially running
          .mockResolvedValue({ State: { Running: false, ExitCode: 1 } }), // Then stopped
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from('Node is ready')),
        stop: jest.fn(),
        remove: jest.fn()
      };

      mockDocker.createContainer.mockResolvedValue(mockContainer as any);
      mockDocker.getContainer.mockReturnValue(mockContainer as any);

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build();

      const node = network.getNode('validator1');

      // Initially should work
      expect(node.getStatus()).toBe(NodeStatus.RUNNING);

      // After container stops, subsequent operations should fail
      await expect(node.getEnodeUrl()).rejects.toThrow();
    });
  });

  describe('Privileged ports without permissions', () => {
    test('Docker denies binding to privileged port and throws DockerOperationError', async () => {
      // Mock Docker operations
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetworkObj = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetworkObj as any);
      mockDocker.getNetwork.mockReturnValue(mockNetworkObj as any);

      // Mock container creation to fail due to privileged port binding
      mockDocker.createContainer.mockRejectedValue(
        new Error('Cannot bind to privileged port 80 without CAP_NET_BIND_SERVICE capability')
      );

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addRpcNode('rpc1', '172.20.0.10', 80) // Privileged port
        .withDataDirectory(tempDir)
        .build(false);

      // Setup should fail due to privileged port
      await expect(network.setup()).rejects.toThrow();
    });

    test('Docker denies binding to port 443 without permissions', async () => {
      // Similar test for HTTPS port 443
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetworkObj = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetworkObj as any);
      mockDocker.getNetwork.mockReturnValue(mockNetworkObj as any);

      mockDocker.createContainer.mockRejectedValue(
        new Error('Cannot bind to privileged port 443: permission denied')
      );

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addRpcNode('rpc1', '172.20.0.10', 443) // Privileged HTTPS port
        .withDataDirectory(tempDir)
        .build(false);

      await expect(network.setup()).rejects.toThrow();
    });
  });

  describe('Node operations with missing node', () => {
    test('getNode() with non-existent node throws NodeNotFoundError', async () => {
      // Mock basic setup
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build(false);

      expect(() => network.getNode('non-existent')).toThrow(NodeNotFoundError);
    });

    test('removeNode() with non-existent node throws NodeNotFoundError', async () => {
      // Setup running network
      jest.spyOn(DockerManager.prototype, 'getClient').mockReturnValue(mockDocker);
      jest.spyOn(SystemValidator, 'checkPrerequisites').mockResolvedValue();

      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024,
        DriverStatus: [['Data Space Available', '100 GB']]
      });
      mockDocker.version.mockResolvedValue({ Version: '20.10.17' } as any);
      mockDocker.listNetworks.mockResolvedValue([]);

      const mockNetworkObj = {
        id: 'network-id',
        inspect: jest.fn().mockResolvedValue({
          IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] }
        })
      };
      mockDocker.createNetwork.mockResolvedValue(mockNetworkObj as any);
      mockDocker.getNetwork.mockReturnValue(mockNetworkObj as any);

      const mockContainer = {
        id: 'container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn(),
        logs: jest.fn().mockResolvedValue(Buffer.from('Node is ready')),
        stop: jest.fn(),
        remove: jest.fn()
      };

      mockDocker.createContainer.mockResolvedValue(mockContainer as any);
      mockDocker.getContainer.mockReturnValue(mockContainer as any);

      const network = await new BesuNetworkBuilder()
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test-network')
        .withSubnet('172.20.0.0/16')
        .addValidator('validator1', '172.20.0.10')
        .withDataDirectory(tempDir)
        .build();

      await expect(network.removeNode('non-existent')).rejects.toThrow(NodeNotFoundError);
    });
  });
}); 
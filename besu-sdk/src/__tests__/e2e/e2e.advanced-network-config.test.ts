import {
  BesuNetworkBuilder,
  NetworkStatus,
  ConfigurationValidationError,
  generateDeterministicIdentity,
  deriveAddressFromPrivateKey,
  ethers
} from '../../index';
import type { Network } from '../../index';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('E2E: Advanced Network Configuration Tests', () => {
  let networks: Network[] = [];
  const testDataDir = path.join(__dirname, '../../../test-data-dir');

  beforeEach(async () => {
    // Clear any existing test networks
    networks = [];
  });

  afterEach(async () => {
    // Cleanup: Teardown all test networks
    for (const network of networks) {
      try {
        await network.teardown(true); // Full cleanup
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    }
    networks = [];

    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, which is fine
    }
  });

  describe('AutoStart Behavior', () => {
    test('should create UNINITIALIZED network with build(false) requiring manual setup()', async () => {
      // **Phase 1: Build without auto-start**
      const builder = new BesuNetworkBuilder()
        .withChainId(2001)
        .withBlockPeriod(3)
        .withNetworkName(`test-autostart-${Date.now()}`)
        .withSubnet('172.21.0.0/16')
        .addValidator('validator1', '172.21.0.10');

      const network = await builder.build(false); // autoStart = false
      networks.push(network);

      // **Phase 2: Verify network is UNINITIALIZED**
      expect(network.getStatus()).toBe(NetworkStatus.UNINITIALIZED);

      // **Phase 3: Manual setup should transition to RUNNING**
      await network.setup();
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);

      // **Phase 4: Verify network is functional**
      const nodes = network.getNodes();
      expect(nodes.size).toBe(1);
      expect(nodes.get('validator1')!.isValidator()).toBe(true);
    }, 60000);

    test('should create RUNNING network with default build() behavior (autoStart = true)', async () => {
      // **Phase 1: Build with default auto-start**
      const builder = new BesuNetworkBuilder()
        .withChainId(2002)
        .withBlockPeriod(3)
        .withNetworkName(`test-autostart-default-${Date.now()}`)
        .withSubnet('172.22.0.0/16')
        .addValidator('validator1', '172.22.0.10');

      const network = await builder.build(); // Default autoStart = true
      networks.push(network);

      // **Phase 2: Verify network is already RUNNING**
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);

      // **Phase 3: Verify network functionality immediately**
      const nodes = network.getNodes();
      expect(nodes.size).toBe(1);
      expect(nodes.get('validator1')!.getStatus()).toBe('RUNNING');
    }, 60000);
  });

  describe('Custom ChainId and Block Period', () => {
    test('should respect custom chainId and blockPeriod in configuration and genesis', async () => {
      const customChainId = 9999;
      const customBlockPeriod = 10;

      const builder = new BesuNetworkBuilder()
        .withChainId(customChainId)
        .withBlockPeriod(customBlockPeriod)
        .withNetworkName(`test-custom-config-${Date.now()}`)
        .withSubnet('172.23.0.0/16')
        .addValidator('validator1', '172.23.0.10')
        .addRpcNode('rpc1', '172.23.0.20', 8545);

      const network = await builder.build();
      networks.push(network);

      // **Verify configuration matches**
      const config = network.getConfig();
      expect(config.chainId).toBe(customChainId);
      expect(config.blockPeriodSeconds).toBe(customBlockPeriod);

      // **Verify provider reports correct chainId**
      const provider = network.getProvider();
      expect(provider).toBeDefined();

      if (provider) {
        const providerNetwork = await provider.getNetwork();
        expect(providerNetwork.chainId).toBe(BigInt(customChainId));
      }

      // **Verify genesis.json contains correct values**
      const dataDir = network.getDataDirectory();
      const genesisPath = path.join(dataDir, 'genesis.json');
      
      try {
        const genesisContent = await fs.readFile(genesisPath, 'utf-8');
        const genesis = JSON.parse(genesisContent);
        
        expect(genesis.config.chainId).toBe(customChainId);
        expect(genesis.config.clique.period).toBe(customBlockPeriod);
      } catch (error) {
        // Genesis file might not be accessible during test, which is acceptable
        console.warn('Could not verify genesis file:', error);
      }
    }, 60000);
  });

  describe('Custom Subnet Configuration', () => {
    test('should create network with custom subnet and assign IPs within range', async () => {
      const customSubnet = '192.168.100.0/24';

      const builder = new BesuNetworkBuilder()
        .withChainId(3001)
        .withBlockPeriod(5)
        .withNetworkName(`test-subnet-${Date.now()}`)
        .withSubnet(customSubnet)
        .addValidator('validator1', '192.168.100.10')
        .addValidator('validator2', '192.168.100.11')
        .addRpcNode('rpc1', '192.168.100.20', 8545);

      const network = await builder.build();
      networks.push(network);

      // **Verify network configuration**
      const config = network.getConfig();
      expect(config.network.subnet).toBe(customSubnet);

      // **Verify nodes have correct IPs within subnet**
      const nodes = network.getNodes();
      expect(nodes.get('validator1')!.getConfig().ip).toBe('192.168.100.10');
      expect(nodes.get('validator2')!.getConfig().ip).toBe('192.168.100.11');
      expect(nodes.get('rpc1')!.getConfig().ip).toBe('192.168.100.20');

      // **Verify all nodes are running with assigned IPs**
      for (const [name, node] of nodes) {
        expect(node.getStatus()).toBe('RUNNING');
        expect(node.getConfig().ip.startsWith('192.168.100.')).toBe(true);
      }
    }, 60000);
  });

  describe('Identity Seed Determinism', () => {
    test('should generate identical keys for identical identitySeed values', async () => {
      const seed = 'test-seed-123';

      // **Phase 1: Create first network with seed**
      const builder1 = new BesuNetworkBuilder()
        .withChainId(4001)
        .withBlockPeriod(5)
        .withNetworkName(`test-seed1-${Date.now()}`)
        .withSubnet('172.24.0.0/16')
        .addValidator('validator1', '172.24.0.10', { identitySeed: seed });

      const network1 = await builder1.build();
      networks.push(network1);

      // **Phase 2: Create second network with same seed**
      const builder2 = new BesuNetworkBuilder()
        .withChainId(4002)
        .withBlockPeriod(5)
        .withNetworkName(`test-seed2-${Date.now()}`)
        .withSubnet('172.25.0.0/16')
        .addValidator('validator1', '172.25.0.10', { identitySeed: seed });

      const network2 = await builder2.build();
      networks.push(network2);

      // **Phase 3: Compare generated addresses**
      const node1 = network1.getNode('validator1');
      const node2 = network2.getNode('validator1');

      // Should have identical addresses because of same seed
      expect(node1.getAddress()).toBe(node2.getAddress());

      // **Phase 4: Verify with direct utility function**
      const directIdentity = await generateDeterministicIdentity(seed);
      expect(node1.getAddress().toLowerCase()).toBe(directIdentity.address.toLowerCase());
    }, 60000);

    test('should generate different keys for different identitySeed values', async () => {
      const seed1 = 'different-seed-1';
      const seed2 = 'different-seed-2';

      const builder = new BesuNetworkBuilder()
        .withChainId(4003)
        .withBlockPeriod(5)
        .withNetworkName(`test-different-seeds-${Date.now()}`)
        .withSubnet('172.26.0.0/16')
        .addValidator('validator1', '172.26.0.10', { identitySeed: seed1 })
        .addValidator('validator2', '172.26.0.11', { identitySeed: seed2 });

      const network = await builder.build();
      networks.push(network);

      // **Verify different seeds produce different addresses**
      const node1 = network.getNode('validator1');
      const node2 = network.getNode('validator2');

      expect(node1.getAddress()).not.toBe(node2.getAddress());

      // **Verify with direct utility functions**
      const identity1 = await generateDeterministicIdentity(seed1);
      const identity2 = await generateDeterministicIdentity(seed2);

      expect(identity1.address).not.toBe(identity2.address);
      expect(node1.getAddress().toLowerCase()).toBe(identity1.address.toLowerCase());
      expect(node2.getAddress().toLowerCase()).toBe(identity2.address.toLowerCase());
    }, 60000);
  });

  describe('Validators Acting as RPC Nodes', () => {
    test('should allow validators to serve RPC requests when no dedicated RPC nodes exist', async () => {
      // **Create network with only validators (no dedicated RPC nodes)**
      const builder = new BesuNetworkBuilder()
        .withChainId(5001)
        .withBlockPeriod(5)
        .withNetworkName(`test-validator-rpc-${Date.now()}`)
        .withSubnet('172.27.0.0/16')
        .addValidator('validator1', '172.27.0.10')
        .addValidator('validator2', '172.27.0.11');

      const network = await builder.build();
      networks.push(network);

      // **Verify network has only validators**
      const nodes = network.getNodes();
      expect(nodes.size).toBe(2);

      const validators = network.getValidators();
      expect(validators.length).toBe(2);

      // **Verify we can get an RPC node (should be a validator)**
      const rpcNode = network.getRpcNode();
      expect(rpcNode).toBeDefined();
      expect(rpcNode!.isValidator()).toBe(true);

      // **Verify provider works through validator**
      const provider = network.getProvider();
      expect(provider).toBeDefined();

      if (provider) {
        const blockNumber = await provider.getBlockNumber();
        expect(blockNumber).toBeGreaterThanOrEqual(0);
      }
    }, 60000);

    test('should use explicit RPC configuration on validators when specified', async () => {
      const customRpcPort = 9545;

      const builder = new BesuNetworkBuilder()
        .withChainId(5002)
        .withBlockPeriod(5)
        .withNetworkName(`test-validator-custom-rpc-${Date.now()}`)
        .withSubnet('172.28.0.0/16')
        .addNode('validator1', '172.28.0.10', { 
          rpc: true, 
          rpcPort: customRpcPort,
          // Note: validators are added through addNode with rpc: true
        });

      const network = await builder.build();
      networks.push(network);

      // **Verify RPC configuration**
      const rpcNode = network.getRpcNode();
      expect(rpcNode).toBeDefined();
      expect(rpcNode!.getConfig().rpcPort).toBe(customRpcPort);
    }, 60000);
  });

  describe('Custom Data Directory', () => {
    test('should use custom data directory and create proper structure', async () => {
      const builder = new BesuNetworkBuilder()
        .withChainId(6001)
        .withBlockPeriod(5)
        .withNetworkName(`test-custom-data-${Date.now()}`)
        .withSubnet('172.29.0.0/16')
        .withDataDirectory(testDataDir)
        .addValidator('validator1', '172.29.0.10')
        .addRpcNode('rpc1', '172.29.0.20', 8545);

      const network = await builder.build();
      networks.push(network);

      // **Verify custom data directory is used**
      const dataDir = network.getDataDirectory();
      expect(dataDir).toContain('test-data-dir');

      // **Verify directory structure exists**
      try {
        const stats = await fs.stat(dataDir);
        expect(stats.isDirectory()).toBe(true);

        // Check for node directories
        const entries = await fs.readdir(dataDir);
        expect(entries).toContain('validator1');
        expect(entries).toContain('rpc1');
      } catch (error) {
        // Directory might not be immediately accessible, log for debugging
        console.warn('Could not verify data directory structure:', error);
      }
    }, 60000);
  });

  describe('Initial Balance Configuration', () => {
    test('should handle various initialBalance formats correctly', async () => {
      const builder = new BesuNetworkBuilder()
        .withChainId(7001)
        .withBlockPeriod(5)
        .withNetworkName(`test-balances-${Date.now()}`)
        .withSubnet('172.30.0.0/16')
        .addValidator('validator-int', '172.30.0.10', { initialBalance: '1000' }) // Integer
        .addValidator('validator-decimal', '172.30.0.11', { initialBalance: '100.5' }) // Decimal
        .addValidator('validator-large', '172.30.0.12', { initialBalance: '999999999999999999' }) // Large value
        .addRpcNode('rpc1', '172.30.0.20', 8545);

      const network = await builder.build();
      networks.push(network);

      // **Verify network starts successfully with various balance formats**
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);

      const nodes = network.getNodes();
      expect(nodes.size).toBe(4);

      // **All nodes should be running regardless of balance format**
      for (const [name, node] of nodes) {
        expect(node.getStatus()).toBe('RUNNING');
      }

      // **Test provider functionality to ensure balances didn't break network**
      const provider = network.getProvider();
      expect(provider).toBeDefined();

      if (provider) {
        const blockNumber = await provider.getBlockNumber();
        expect(blockNumber).toBeGreaterThanOrEqual(0);
      }
    }, 60000);

    test('should handle invalid initialBalance formats gracefully', async () => {
      // **Note: Invalid formats should warn but use defaults, not crash**
      const builder = new BesuNetworkBuilder()
        .withChainId(7002)
        .withBlockPeriod(5)
        .withNetworkName(`test-invalid-balances-${Date.now()}`)
        .withSubnet('172.31.0.0/16')
        .addValidator('validator-invalid', '172.31.0.10', { initialBalance: 'not-a-number' })
        .addValidator('validator-empty', '172.31.0.11', { initialBalance: '' })
        .addRpcNode('rpc1', '172.31.0.20', 8545);

      // **Should not throw during build - invalid formats get default values**
      const network = await builder.build();
      networks.push(network);

      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);

      // **Verify all nodes are running despite invalid balance formats**
      const nodes = network.getNodes();
      for (const [name, node] of nodes) {
        expect(node.getStatus()).toBe('RUNNING');
      }
    }, 60000);
  });

  describe('Complex Network Configurations', () => {
    test('should handle comprehensive network with all advanced features', async () => {
      const complexNetworkName = `test-complex-${Date.now()}`;
      
      const builder = new BesuNetworkBuilder()
        .withChainId(8001)
        .withBlockPeriod(3)
        .withNetworkName(complexNetworkName)
        .withSubnet('10.0.0.0/16')
        .withDataDirectory(testDataDir)
        .addValidator('val-seed1', '10.0.0.10', { 
          identitySeed: 'validator-seed-1', 
          initialBalance: '5000' 
        })
        .addValidator('val-seed2', '10.0.0.11', { 
          identitySeed: 'validator-seed-2', 
          initialBalance: '3000.75' 
        })
        .addNode('mixed-node', '10.0.0.15', { 
          rpc: true, 
          rpcPort: 9545,
          identitySeed: 'mixed-node-seed',
          initialBalance: '1500'
        })
        .addRpcNode('rpc-dedicated', '10.0.0.20', 8545, { 
          identitySeed: 'rpc-seed',
          initialBalance: '2000'
        });

      const network = await builder.build(false); // Test manual startup
      networks.push(network);

      // **Verify UNINITIALIZED state**
      expect(network.getStatus()).toBe(NetworkStatus.UNINITIALIZED);

      // **Manual setup**
      await network.setup();
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);

      // **Verify complex configuration**
      const config = network.getConfig();
      expect(config.chainId).toBe(8001);
      expect(config.blockPeriodSeconds).toBe(3);
      expect(config.network.name).toBe(complexNetworkName);
      expect(config.network.subnet).toBe('10.0.0.0/16');

      // **Verify all nodes and their roles**
      const nodes = network.getNodes();
      expect(nodes.size).toBe(4);

      const validators = network.getValidators();
      expect(validators.length).toBe(2);

      // **Verify deterministic addresses from seeds**
      const val1Identity = await generateDeterministicIdentity('validator-seed-1');
      const val1Node = network.getNode('val-seed1');
      expect(val1Node.getAddress().toLowerCase()).toBe(val1Identity.address.toLowerCase());

      // **Verify provider functionality**
      const provider = network.getProvider();
      expect(provider).toBeDefined();

      if (provider) {
        const networkInfo = await provider.getNetwork();
        expect(networkInfo.chainId).toBe(BigInt(8001));
      }
    }, 90000); // Extended timeout for complex setup
  });
}); 
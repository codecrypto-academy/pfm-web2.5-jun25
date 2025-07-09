import {
  createTestNetwork,
  ConfigurationValidationError,
  NetworkStatus,
  DEFAULTS,
  ethers
} from '../../index';
import type { Network } from '../../index';

describe('E2E: Basic Network Creation Tests', () => {
  let testNetwork: Network | null = null;

  afterEach(async () => {
    // Cleanup: Teardown any test network that might still exist
    if (testNetwork) {
      try {
        await testNetwork.teardown(true); // Full cleanup
      } catch (error) {
        // Network might already be torn down, which is fine
        console.warn('Cleanup warning:', error);
      } finally {
        testNetwork = null;
      }
    }
  });

  describe('Happy Path - Basic Network Creation', () => {
    test('should create and start a basic test network with createTestNetwork(1, 1)', async () => {
      // **Phase 1: Create the network**
      testNetwork = await createTestNetwork(1, 1);
      
      // **Phase 2: Verify network status**
      expect(testNetwork.getStatus()).toBe(NetworkStatus.RUNNING);
      
      // **Phase 3: Verify node counts**
      const nodes = testNetwork.getNodes();
      expect(nodes.size).toBe(2); // 1 validator + 1 RPC node
      
      // Verify we have exactly 1 validator
      const validators = testNetwork.getValidators();
      expect(validators.length).toBe(1);
      
      // Verify validator node exists and is running
      const validatorNode = testNetwork.getNode('validator-1');
      expect(validatorNode).toBeDefined();
      expect(validatorNode!.isValidator()).toBe(true);
      expect(validatorNode!.getStatus()).toBe('RUNNING');
      
      // Verify RPC node exists and is running
      const rpcNode = testNetwork.getNode('rpc-1');
      expect(rpcNode).toBeDefined();
      expect(rpcNode!.isValidator()).toBe(false);
      expect(rpcNode!.getStatus()).toBe('RUNNING');
      
      // **Phase 4: Verify RPC port assignment follows DEFAULTS.rpcPort + i pattern**
      const rpcNodeConfig = rpcNode!.getConfig();
      expect(rpcNodeConfig.rpcPort).toBe(DEFAULTS.rpcPort + 1); // 8545 + 1 = 8546
      
      // **Phase 5: Verify ethers.js functionality**
      const provider = testNetwork.getProvider();
      expect(provider).toBeDefined();
      
      if (provider) {
        // Should be able to connect and get basic blockchain information
        const blockNumber = await provider.getBlockNumber();
        expect(blockNumber).toBeGreaterThanOrEqual(0);
        
        // Should be able to get network information
        const network = await provider.getNetwork();
        expect(network.chainId).toBe(BigInt(1337)); // Default chainId used by createTestNetwork
        
        // Should be able to get block
        const block = await provider.getBlock('latest');
        expect(block).toBeDefined();
        expect(block!.number).toBeGreaterThanOrEqual(0);
      }
      
      // **Phase 6: Verify network configuration**
      const config = testNetwork.getConfig();
      expect(config.chainId).toBe(1337); // Default chainId
      expect(config.blockPeriodSeconds).toBe(DEFAULTS.blockPeriod); // Default block period
      expect(config.network.subnet).toBe(DEFAULTS.subnet); // Default subnet
      
      // **Phase 7: Verify teardown completes successfully**
      await testNetwork.teardown(true);
      expect(testNetwork.getStatus()).toBe(NetworkStatus.STOPPED);
      
      testNetwork = null; // Mark as cleaned up
    }, 60000); // 60 second timeout for Docker operations

    test('should handle multiple RPC nodes with unique ports', async () => {
      // Test with multiple RPC nodes to verify port assignment
      testNetwork = await createTestNetwork(1, 3); // 1 validator, 3 RPC nodes
      
      expect(testNetwork.getStatus()).toBe(NetworkStatus.RUNNING);
      
      // Verify all nodes exist
      const nodes = testNetwork.getNodes();
      expect(nodes.size).toBe(4); // 1 validator + 3 RPC nodes
      
      // Verify RPC port assignments are unique and follow pattern
      const rpcNode1 = testNetwork.getNode('rpc-1');
      const rpcNode2 = testNetwork.getNode('rpc-2');
      const rpcNode3 = testNetwork.getNode('rpc-3');
      
      expect(rpcNode1!.getConfig().rpcPort).toBe(DEFAULTS.rpcPort + 1); // 8546
      expect(rpcNode2!.getConfig().rpcPort).toBe(DEFAULTS.rpcPort + 2); // 8547
      expect(rpcNode3!.getConfig().rpcPort).toBe(DEFAULTS.rpcPort + 3); // 8548
      
      // Verify all RPC nodes are running
      expect(rpcNode1!.getStatus()).toBe('RUNNING');
      expect(rpcNode2!.getStatus()).toBe('RUNNING');
      expect(rpcNode3!.getStatus()).toBe('RUNNING');
    }, 60000);
  });

  describe('Validation Errors', () => {
    test('should throw ConfigurationValidationError when validatorCount is 0', async () => {
      // **Expected: createTestNetwork(0, 1) should fail with validation error**
      await expect(createTestNetwork(0, 1))
        .rejects
        .toThrow(ConfigurationValidationError);
    });

    test('should throw ConfigurationValidationError when both counts are 0', async () => {
      // **Expected: createTestNetwork(0, 0) should fail with validation error**
      await expect(createTestNetwork(0, 0))
        .rejects
        .toThrow(ConfigurationValidationError);
    });

    test('should allow networks with only validators (no RPC nodes)', async () => {
      // **This should work: validators can serve RPC requests too**
      testNetwork = await createTestNetwork(2, 0); // 2 validators, 0 RPC nodes
      
      expect(testNetwork.getStatus()).toBe(NetworkStatus.RUNNING);
      
      // Should have 2 nodes, both validators
      const nodes = testNetwork.getNodes();
      expect(nodes.size).toBe(2);
      
      const validators = testNetwork.getValidators();
      expect(validators.length).toBe(2);
      
      // Should still be able to get a provider (from validator nodes)
      const provider = testNetwork.getProvider();
      expect(provider).toBeDefined();
    }, 60000);
  });

  describe('Network Functionality', () => {
    test('should support basic blockchain operations', async () => {
      testNetwork = await createTestNetwork(1, 1);
      
      const provider = testNetwork.getProvider();
      expect(provider).toBeDefined();
      
      if (provider) {
        // Test basic read operations
        const blockNumber = await provider.getBlockNumber();
        const block = await provider.getBlock('latest');
        const gasPrice = await provider.getFeeData();
        
        expect(blockNumber).toBeGreaterThanOrEqual(0);
        expect(block).toBeDefined();
        expect(gasPrice).toBeDefined();
        
        // Wait for a few blocks to be mined
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newBlockNumber = await provider.getBlockNumber();
        expect(newBlockNumber).toBeGreaterThanOrEqual(blockNumber);
      }
    }, 30000);
  });
}); 
import {
  BesuNetworkBuilder,
  Network,
  NetworkNotFoundError,
  NetworkStatus
} from '../../index';

describe('E2E: Network Persistence and Adoption', () => {
  const testNetworkName = `test-persistence-${Date.now()}`;
  const testChainId = 1000 + Math.floor(Math.random() * 1000); // Random chainId to avoid conflicts
  const testSubnet = '172.25.0.0/16';

  /**
   * Helper function to create a network with standard configuration
   */
  const createTestNetwork = async (networkName: string): Promise<Network> => {
    const builder = new BesuNetworkBuilder()
      .withChainId(testChainId)
      .withBlockPeriod(5)
      .withNetworkName(networkName)
      .withSubnet(testSubnet)
      .addValidator('validator1', '172.25.0.10')
      .addRpcNode('rpc1', '172.25.0.20', 8545);

    return await builder.build(true); // Auto-start
  };

  /**
   * Helper function to verify network properties match expected values
   */
  const verifyNetworkProperties = (network: Network, expectedChainId: number, expectedSubnet: string): void => {
    const config = network.getConfig();
    
    expect(config.chainId).toBe(expectedChainId);
    expect(config.network.subnet).toBe(expectedSubnet);
    expect(network.getStatus()).toBe(NetworkStatus.RUNNING);
    
    // Verify nodes
    const nodes = network.getNodes();
    expect(nodes.size).toBe(2);
    expect(nodes.has('validator1')).toBe(true);
    expect(nodes.has('rpc1')).toBe(true);
    
    // Verify validators
    const validators = network.getValidators();
    expect(validators.length).toBe(1);
    expect(validators[0].getName()).toBe('validator1');
  };

  afterEach(async () => {
    // Cleanup: Remove any test networks that might still exist
    try {
      const cleanupBuilder = new BesuNetworkBuilder()
        .withChainId(testChainId)
        .withBlockPeriod(5)
        .withNetworkName(testNetworkName);
      
      const network = await cleanupBuilder.build(false); // Don't auto-start
      await network.teardown(true); // Full cleanup
    } catch (error) {
      // Network might not exist, which is fine
    }
  });

  describe('Network Persistence and Adoption', () => {
    test('should persist network data and allow adoption after teardown(false)', async () => {
      // **Phase 1: Create network and teardown with persistence**
      let originalNetwork: Network;
      
      try {
        originalNetwork = await createTestNetwork(testNetworkName);
        
        // Verify original network is running
        expect(originalNetwork.getStatus()).toBe(NetworkStatus.RUNNING);
        
        // Get original network properties
        const originalConfig = originalNetwork.getConfig();
        const originalNodes = originalNetwork.getNodes();
        const originalValidators = originalNetwork.getValidators();
        
        // Teardown with persistence (removeData = false)
        await originalNetwork.teardown(false);
        
        // Verify network is stopped but data should persist
        expect(originalNetwork.getStatus()).toBe(NetworkStatus.STOPPED);
        
        // **Phase 2: Create new NetworkBuilder and adopt existing network**
        const adoptionBuilder = new BesuNetworkBuilder()
          .withChainId(originalConfig.chainId)
          .withBlockPeriod(originalConfig.blockPeriodSeconds)
          .withNetworkName(testNetworkName);
          // Note: NOT specifying subnet or node details - should be adopted

        const adoptedNetwork = await adoptionBuilder.build(true);

        // **Verification: Adopted network should match original**
        verifyNetworkProperties(adoptedNetwork, testChainId, testSubnet);
        
        // Verify adopted network's properties match original
        const adoptedConfig = adoptedNetwork.getConfig();
        expect(adoptedConfig.chainId).toBe(originalConfig.chainId);
        expect(adoptedConfig.blockPeriodSeconds).toBe(originalConfig.blockPeriodSeconds);
        expect(adoptedConfig.network.name).toBe(originalConfig.network.name);
        expect(adoptedConfig.network.subnet).toBe(originalConfig.network.subnet);
        
        // Verify nodes configuration matches
        const adoptedNodes = adoptedNetwork.getNodes();
        expect(adoptedNodes.size).toBe(originalNodes.size);
        
        for (const [nodeName, originalNode] of originalNodes) {
          expect(adoptedNodes.has(nodeName)).toBe(true);
          const adoptedNode = adoptedNodes.get(nodeName)!;
          expect(adoptedNode.getName()).toBe(originalNode.getName());
          expect(adoptedNode.getConfig().ip).toBe(originalNode.getConfig().ip);
          expect(adoptedNode.isValidator()).toBe(originalNode.isValidator());
        }
        
        // Verify validators match
        const adoptedValidators = adoptedNetwork.getValidators();
        expect(adoptedValidators.length).toBe(originalValidators.length);
        expect(adoptedValidators[0].getName()).toBe(originalValidators[0].getName());
        
        // Verify network is functional (can get provider)
        const provider = adoptedNetwork.getProvider();
        expect(provider).toBeDefined();
        
        // Final cleanup
        await adoptedNetwork.teardown(true);
        
      } catch (error) {
        // Ensure cleanup happens even if test fails
        try {
          if (originalNetwork!) {
            await originalNetwork.teardown(true);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    }, 60000); // 60 second timeout for Docker operations

    test('should fail adoption when network was fully cleaned up with teardown(true)', async () => {
      const networkName = `${testNetworkName}-cleanup`;
      let network: Network;
      
      try {
        // **Phase 1: Create network and teardown with full cleanup**
        network = await createTestNetwork(networkName);
        
        // Verify network is running
        expect(network.getStatus()).toBe(NetworkStatus.RUNNING);
        
        // Teardown with full cleanup (removeData = true)
        await network.teardown(true);
        
        // **Phase 2: Attempt to adopt the cleaned up network**
        const adoptionBuilder = new BesuNetworkBuilder()
          .withChainId(testChainId)
          .withBlockPeriod(5)
          .withNetworkName(networkName);
          // Not specifying subnet - should try to adopt

        // **Expected: Adoption should fail with NetworkNotFoundError**
        await expect(adoptionBuilder.build(true))
          .rejects
          .toThrow(NetworkNotFoundError);
          
      } catch (error) {
        // If the test threw NetworkNotFoundError as expected, that's fine
        if (!(error instanceof NetworkNotFoundError)) {
          // Ensure cleanup happens if test fails unexpectedly
          try {
            if (network!) {
              await network.teardown(true);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          throw error;
        }
      }
    }, 30000); // 30 second timeout

    test('should adopt existing network and rebuild Docker resources successfully', async () => {
      const networkName = `${testNetworkName}-rebuild`;
      let originalNetwork: Network;
      
      try {
        // **Phase 1: Create network**
        originalNetwork = await createTestNetwork(networkName);
        
        // Store original network metadata
        const originalDataDir = originalNetwork.getDataDirectory();
        const originalDockerNetworkName = originalNetwork.getDockerNetworkName();
        
        // Teardown but keep data
        await originalNetwork.teardown(false);
        
        // **Phase 2: Adopt and verify Docker resources are rebuilt**
        const adoptionBuilder = new BesuNetworkBuilder()
          .withChainId(testChainId)
          .withBlockPeriod(5)
          .withNetworkName(networkName);

        const adoptedNetwork = await adoptionBuilder.build(true);
        
        // **Verification: Docker resources should be rebuilt**
        expect(adoptedNetwork.getStatus()).toBe(NetworkStatus.RUNNING);
        expect(adoptedNetwork.getDockerNetworkName()).toBe(originalDockerNetworkName);
        expect(adoptedNetwork.getDataDirectory()).toBe(originalDataDir);
        
        // All nodes should be running
        const nodes = adoptedNetwork.getNodes();
        for (const [_, node] of nodes) {
          expect(node.getStatus()).toBe('RUNNING');
        }
        
        // Network should be functional
        const provider = adoptedNetwork.getProvider();
        expect(provider).toBeDefined();
        
        // Should be able to interact with the network
        if (provider) {
          const blockNumber = await provider.getBlockNumber();
          expect(blockNumber).toBeGreaterThanOrEqual(0);
        }
        
        // Final cleanup
        await adoptedNetwork.teardown(true);
        
      } catch (error) {
        // Ensure cleanup happens even if test fails
        try {
          if (originalNetwork!) {
            await originalNetwork.teardown(true);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    }, 60000); // 60 second timeout for Docker operations
  });
}); 
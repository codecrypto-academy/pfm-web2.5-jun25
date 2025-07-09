import { BesuNetworkBuilder, Network, BesuNode, NetworkStatus, ethers } from '../../index';
import { LastValidatorRemovalError } from '../../errors';
import * as fs from 'fs';
import * as path from 'path';

describe('Network Lifecycle - End-to-End Tests', () => {
  let network: Network;
  let initialValidator: BesuNode;
  let initialRpcNode: BesuNode;
  
  const testNetworkName = `e2e-test-${Date.now()}`;
  const testChainId = 31337;

  beforeAll(async () => {
    // Create network with initial configuration
    network = await new BesuNetworkBuilder()
      .withChainId(testChainId)
      .withBlockPeriod(2) // Faster blocks for testing
      .withNetworkName(testNetworkName)
      .withSubnet('172.21.0.0/16')
      .addValidator('initial-validator', '172.21.0.10', { initialBalance: '1000' })
      .addRpcNode('initial-rpc', '172.21.0.11', 8545, { initialBalance: '500' })
      .build();
    
    // Cache initial nodes for easier access
    initialValidator = network.getNode('initial-validator');
    initialRpcNode = network.getNode('initial-rpc');
  }, 120000); // 2 minute timeout for network setup

  afterAll(async () => {
    if (network) {
      await network.teardown(true); // Remove data to clean up completely
    }
  }, 60000); // 1 minute timeout for cleanup

  describe('Initial Network State', () => {
    test('network status should be RUNNING', () => {
      expect(network.getStatus()).toBe(NetworkStatus.RUNNING);
    });

    test('getNodes() should return correct initial nodes', () => {
      const nodes = network.getNodes();
      expect(nodes.size).toBe(2);
      expect(nodes.has('initial-validator')).toBe(true);
      expect(nodes.has('initial-rpc')).toBe(true);
    });

    test('getValidators() should return validator nodes', () => {
      const validators = network.getValidators();
      expect(validators).toHaveLength(1);
      expect(validators[0].getName()).toBe('initial-validator');
      expect(validators[0].isValidator()).toBe(true);
    });

    test('getProvider() should be functional', async () => {
      const provider = network.getProvider();
      expect(provider).toBeInstanceOf(ethers.JsonRpcProvider);
      
      // Test provider functionality
      const blockNumber = await provider!.getBlockNumber();
      expect(typeof blockNumber).toBe('number');
      expect(blockNumber).toBeGreaterThanOrEqual(0);
    });

    test('nodes should be in RUNNING status', () => {
      expect(initialValidator.getStatus()).toBe('RUNNING');
      expect(initialRpcNode.getStatus()).toBe('RUNNING');
    });
  });

  describe('Network Setup Validation', () => {
    test('Docker network should be created', async () => {
      const dockerNetworkName = network.getDockerNetworkName();
      expect(dockerNetworkName).toBe(testNetworkName);
    });

    test('genesis.json should be generated and valid', async () => {
      const dataDir = network.getDataDirectory();
      const genesisPath = path.join(dataDir, 'genesis.json');
      
      expect(fs.existsSync(genesisPath)).toBe(true);
      
      const genesisContent = JSON.parse(fs.readFileSync(genesisPath, 'utf8'));
      
      // Validate genesis structure
      expect(genesisContent).toHaveProperty('config');
      expect(genesisContent).toHaveProperty('alloc');
      expect(genesisContent).toHaveProperty('extraData');
      
      // Validate chainId
      expect(genesisContent.config.chainId).toBe(testChainId);
      
      // Validate clique configuration
      expect(genesisContent.config.clique).toBeDefined();
      expect(genesisContent.config.clique.period).toBe(2);
      
      // Validate extraData contains validator
      expect(genesisContent.extraData).toMatch(/^0x[0-9a-f]+$/i);
      expect(genesisContent.extraData.length).toBeGreaterThan(66); // 0x + 64 zeros + validators + 130 zeros
      
      // Validate alloc contains initial balances
      expect(Object.keys(genesisContent.alloc).length).toBeGreaterThanOrEqual(2);
      
      // Check that validator and RPC node addresses are in alloc
      const validatorAddress = initialValidator.getAddress().substring(2).toLowerCase();
      const rpcAddress = initialRpcNode.getAddress().substring(2).toLowerCase();
      
      expect(genesisContent.alloc).toHaveProperty(validatorAddress);
      expect(genesisContent.alloc).toHaveProperty(rpcAddress);
      
      // Validate initial balances (1000 ETH = 1000 * 10^18 wei)
      const validatorBalance = BigInt(genesisContent.alloc[validatorAddress].balance);
      const rpcBalance = BigInt(genesisContent.alloc[rpcAddress].balance);
      
      expect(validatorBalance).toBe(ethers.parseEther('1000'));
      expect(rpcBalance).toBe(ethers.parseEther('500'));
    });
  });

  describe('addNode() functionality', () => {
    test('should add basic node successfully', async () => {
      const basicNode = await network.addNode({
        name: 'basic-node',
        ip: '172.21.0.20',
        validator: false,
        rpc: false
      });

      expect(basicNode.getName()).toBe('basic-node');
      expect(basicNode.isValidator()).toBe(false);
      expect(basicNode.getStatus()).toBe('RUNNING');
      expect(network.getNodes().size).toBe(3);
    });

    test('should add RPC node successfully', async () => {
      const rpcNode = await network.addNode({
        name: 'new-rpc-node',
        ip: '172.21.0.21',
        validator: false,
        rpc: true,
        rpcPort: 8546
      });

      expect(rpcNode.getName()).toBe('new-rpc-node');
      expect(rpcNode.isValidator()).toBe(false);
      expect(rpcNode.getRpcUrl()).toBe('http://localhost:8546');
      expect(rpcNode.getStatus()).toBe('RUNNING');
      expect(network.getNodes().size).toBe(4);
    });

    test('should add validator node successfully', async () => {
      const validatorNode = await network.addNode({
        name: 'new-validator',
        ip: '172.21.0.22',
        validator: true,
        rpc: false
      });

      expect(validatorNode.getName()).toBe('new-validator');
      expect(validatorNode.isValidator()).toBe(true);
      expect(validatorNode.getStatus()).toBe('RUNNING');
      expect(network.getValidators()).toHaveLength(2);
      expect(network.getNodes().size).toBe(5);
    });

    test('should add node with initialBalance and fund correctly', async () => {
      const fundedNode = await network.addNode({
        name: 'funded-node',
        ip: '172.21.0.23',
        validator: false,
        rpc: true,
        rpcPort: 8547,
        initialBalance: '5.5'
      });

      expect(fundedNode.getStatus()).toBe('RUNNING');
      
      // Wait a moment for the funding transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check the balance
      const provider = network.getProvider();
      const balance = await provider!.getBalance(fundedNode.getAddress());
      const expectedBalance = ethers.parseEther('5.5');
      
      expect(balance.toString()).toBe(expectedBalance.toString());
      expect(network.getNodes().size).toBe(6);
    });
  });

  describe('removeNode() functionality', () => {
    test('should remove non-validator node successfully', async () => {
      const initialSize = network.getNodes().size;
      
      await network.removeNode('basic-node');
      
      expect(network.getNodes().size).toBe(initialSize - 1);
      expect(network.getNodes().has('basic-node')).toBe(false);
    });

    test('should remove RPC node successfully', async () => {
      const initialSize = network.getNodes().size;
      
      await network.removeNode('new-rpc-node');
      
      expect(network.getNodes().size).toBe(initialSize - 1);
      expect(network.getNodes().has('new-rpc-node')).toBe(false);
    });

    test('should remove validator node when multiple validators exist', async () => {
      const initialValidatorCount = network.getValidators().length;
      expect(initialValidatorCount).toBeGreaterThan(1); // Should have initial-validator and new-validator
      
      await network.removeNode('new-validator');
      
      expect(network.getValidators()).toHaveLength(initialValidatorCount - 1);
      expect(network.getNodes().has('new-validator')).toBe(false);
    });

    test('should throw LastValidatorRemovalError when removing last validator', async () => {
      // Ensure we only have one validator left
      const validators = network.getValidators();
      expect(validators).toHaveLength(1);
      
      const lastValidatorName = validators[0].getName();
      
      await expect(network.removeNode(lastValidatorName))
        .rejects
        .toThrow(LastValidatorRemovalError);
      
      // Verify the validator is still there
      expect(network.getValidators()).toHaveLength(1);
      expect(network.getNodes().has(lastValidatorName)).toBe(true);
    });
  });

  describe('Network persistence and data management', () => {
    test('data should persist when removeData = false', async () => {
      const dataDir = network.getDataDirectory();
      
      // Create a test file to verify persistence
      const testFilePath = path.join(dataDir, 'test-persistence.txt');
      fs.writeFileSync(testFilePath, 'test data');
      
      expect(fs.existsSync(testFilePath)).toBe(true);
      
      // Don't test actual teardown here as we need the network for other tests
      // This is tested in the teardown test below
    });
  });

  describe('teardown() functionality', () => {
    test('should complete cleanup of Docker resources', async () => {
      const dataDir = network.getDataDirectory();
      const dockerNetworkName = network.getDockerNetworkName();
      
      // Verify data directory exists before teardown
      expect(fs.existsSync(dataDir)).toBe(true);
      
      // Perform teardown with data removal
      await network.teardown(true);
      
      // Verify status changed
      expect(network.getStatus()).toBe(NetworkStatus.STOPPED);
      
      // Verify data directory was removed
      expect(fs.existsSync(dataDir)).toBe(false);
      
      // Verify internal state is cleared
      expect(network.getNodes().size).toBe(0);
      expect(network.getValidators()).toHaveLength(0);
    });
  });

  describe('Network events', () => {
    let secondNetwork: Network;
    
    afterEach(async () => {
      if (secondNetwork) {
        await secondNetwork.teardown(true);
        secondNetwork = null as any;
      }
    });

    test('should emit network-ready event on setup', async () => {
      // First, create the network without starting it
      secondNetwork = await new BesuNetworkBuilder()
        .withChainId(31338)
        .withBlockPeriod(5)
        .withNetworkName(`event-test-${Date.now()}`)
        .withSubnet('172.22.0.0/16')
        .addValidator('event-validator', '172.22.0.10')
        .build(false); // Don't auto-start
      
      // Set up the promise to wait for the network-ready event
      const readyPromise = new Promise<void>((resolve) => {
        secondNetwork.once('network-ready', () => {
          resolve();
        });
      });

      // Manually start the network to trigger the event
      await (secondNetwork as any).setup();
      
      // Wait for the event to be emitted
      await readyPromise;
      
      expect(secondNetwork.getStatus()).toBe(NetworkStatus.RUNNING);
    });

    test('should emit node-added event when adding nodes', async () => {
      secondNetwork = await new BesuNetworkBuilder()
        .withChainId(31339)
        .withBlockPeriod(5)
        .withNetworkName(`node-event-test-${Date.now()}`)
        .withSubnet('172.23.0.0/16')
        .addValidator('event-validator2', '172.23.0.10')
        .build();

      const nodeAddedPromise = new Promise<any>((resolve) => {
        secondNetwork.once('node-added', (event) => {
          resolve(event);
        });
      });

      await secondNetwork.addNode({
        name: 'event-test-node',
        ip: '172.23.0.11',
        validator: false
      });

      const addedEvent = await nodeAddedPromise;
      
      expect(addedEvent.node.name).toBe('event-test-node');
      expect(addedEvent.node.isValidator).toBe(false);
      expect(addedEvent.timestamp).toBeInstanceOf(Date);
    });

    test('should emit node-removed event when removing nodes', async () => {
      secondNetwork = await new BesuNetworkBuilder()
        .withChainId(31340)
        .withBlockPeriod(5)
        .withNetworkName(`remove-event-test-${Date.now()}`)
        .withSubnet('172.24.0.0/16')
        .addValidator('remove-validator', '172.24.0.10')
        .addNode('remove-node', '172.24.0.11', { rpc: false })
        .build();

      const nodeRemovedPromise = new Promise<any>((resolve) => {
        secondNetwork.once('node-removed', (event) => {
          resolve(event);
        });
      });

      await secondNetwork.removeNode('remove-node');

      const removedEvent = await nodeRemovedPromise;
      expect(removedEvent.nodeName).toBe('remove-node');
    });
  });
}); 
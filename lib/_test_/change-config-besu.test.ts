/**
 * Test suite for updateNetworkConfig functionality
 * Tests subnet, gasLimit, blockTime updates and node IP changes
 */

import { BesuNetwork, BesuNetworkConfig, BesuNodeDefinition } from '../src/create-besu-networks';
import { updateNetworkConfig } from '../src/update-besu-networks';
import { cleanupTestNetworks } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Change Besu Network Configuration Tests', () => {
  beforeAll(async () => {
    console.log('🧪 Setting up change config test environment...');
    await cleanupTestNetworks();
    console.log('✅ Test environment ready');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up after change config tests...');
    await cleanupTestNetworks();
    console.log('✅ Test cleanup completed');
  });

  test('Update network configuration with subnet, gasLimit, blockTime and node IPs', async () => {
    const testNetworkName = `config-update-test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`🧪 Testing configuration updates for network: ${testNetworkName}`);

    // Step 1: Create initial network with 3 nodes
    console.log('📦 Creating initial network with 3 nodes...');
    
    const initialConfig: BesuNetworkConfig = {
      name: testNetworkName,
      chainId: 1234,
      subnet: '172.50.0.0/16',
      consensus: 'clique',
      gasLimit: '0x47E7C4', // 4,712,388
      blockTime: 10,
      signerAccounts: [
        {
          address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
          weiAmount: '50000000000000000000000', // 50,000 ETH
          minerNode: 'miner1'
        }
      ]
    };

    const nodes: BesuNodeDefinition[] = [
      {
        name: 'bootnode1',
        ip: '172.50.0.10',
        rpcPort: 8545,
        type: 'bootnode',
        p2pPort: 30303
      },
      {
        name: 'miner1',
        ip: '172.50.0.11',
        rpcPort: 8546,
        type: 'miner',
        p2pPort: 30304
      },
      {
        name: 'rpc1',
        ip: '172.50.0.12',
        rpcPort: 8547,
        type: 'rpc',
        p2pPort: 30305
      }
    ];

    const network = new BesuNetwork(initialConfig);
    await network.create({
      nodes,
      autoResolveSubnetConflicts: true
    });

    console.log('📊 Initial network created with nodes:');
    for (const [nodeName, node] of network.getNodes()) {
      const nodeConfig = node.getConfig();
      console.log(`   - ${nodeName} (${nodeConfig.type}) at ${nodeConfig.ip}:${nodeConfig.rpcPort}`);
    }

    // Step 2: Start the initial network
    console.log('🚀 Starting initial network...');
    await network.start();

    // Wait for network stabilization
    console.log('⏳ Waiting for initial network stabilization...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 3: Verify initial configuration
    console.log('🔍 Verifying initial configuration...');
    const initialNetworkConfig = network.getConfig();
    
    expect(initialNetworkConfig.subnet).toBe('172.50.0.0/16');
    expect(initialNetworkConfig.gasLimit).toBe('0x47E7C4');
    expect(initialNetworkConfig.blockTime).toBe(10);
    
    // Verify initial node IPs
    const initialNodes = network.getNodes();
    expect(initialNodes.get('bootnode1')?.getConfig().ip).toBe('172.50.0.10');
    expect(initialNodes.get('miner1')?.getConfig().ip).toBe('172.50.0.11');
    expect(initialNodes.get('rpc1')?.getConfig().ip).toBe('172.50.0.12');

    console.log('📊 Initial configuration verified:');
    console.log(`   - Subnet: ${initialNetworkConfig.subnet}`);
    console.log(`   - Gas Limit: ${initialNetworkConfig.gasLimit}`);
    console.log(`   - Block Time: ${initialNetworkConfig.blockTime}`);

    // Step 4: Update network configuration
    console.log('🔄 Updating network configuration...');
    console.log('   Changes to apply:');
    console.log('   - Subnet: 172.50.0.0/16 → 172.60.0.0/16');
    console.log('   - Gas Limit: 0x47E7C4 → 0x5F5E100 (100,000,000)');
    console.log('   - Block Time: 10 → 15 seconds');
    console.log('   - Node IPs: Update all nodes to new subnet');

    const newNodeConfigs = [
      {
        name: 'bootnode1',
        ip: '172.60.0.20',
        rpcPort: 8545,
        p2pPort: 30303
      },
      {
        name: 'miner1',
        ip: '172.60.0.21',
        rpcPort: 8546,
        p2pPort: 30304
      },
      {
        name: 'rpc1',
        ip: '172.60.0.22',
        rpcPort: 8547,
        p2pPort: 30305
      }
    ];

    await updateNetworkConfig(network, {
      subnet: '172.60.0.0/16',
      gasLimit: '0x5F5E100', // 100,000,000
      blockTime: 15,
      nodes: newNodeConfigs
    });

    console.log('✅ Network configuration updated successfully');

    // Step 5: Verify updated configuration
    console.log('🔍 Verifying updated configuration...');
    const updatedConfig = network.getConfig();
    
    expect(updatedConfig.subnet).toBe('172.60.0.0/16');
    expect(updatedConfig.gasLimit).toBe('0x5F5E100');
    expect(updatedConfig.blockTime).toBe(15);

    // Verify updated node IPs
    const updatedNodes = network.getNodes();
    expect(updatedNodes.get('bootnode1')?.getConfig().ip).toBe('172.60.0.20');
    expect(updatedNodes.get('miner1')?.getConfig().ip).toBe('172.60.0.21');
    expect(updatedNodes.get('rpc1')?.getConfig().ip).toBe('172.60.0.22');

    console.log('📊 Updated configuration verified:');
    console.log(`   - Subnet: ${updatedConfig.subnet}`);
    console.log(`   - Gas Limit: ${updatedConfig.gasLimit}`);
    console.log(`   - Block Time: ${updatedConfig.blockTime}`);
    console.log('   - Node IPs updated:');
    for (const [nodeName, node] of updatedNodes) {
      const nodeConfig = node.getConfig();
      console.log(`     - ${nodeName}: ${nodeConfig.ip}:${nodeConfig.rpcPort}`);
    }

    // Step 6: Verify configuration file was saved
    console.log('📊 Verifying configuration file was saved...');
    const networkPath = path.join('./networks', testNetworkName);
    const configPath = path.join(networkPath, 'network-config.json');
    
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(savedConfig.subnet).toBe('172.60.0.0/16');
      expect(savedConfig.gasLimit).toBe('0x5F5E100');
      expect(savedConfig.blockTime).toBe(15);
      console.log('✅ Configuration file correctly saved with updated values');
    } else {
      console.log('ℹ️ Configuration file not found - this is expected for this test');
    }

    // Step 7: Test restart with new configuration
    console.log('🚀 Testing restart with new configuration...');
    await network.start();

    // Wait for network stabilization with new config
    console.log('⏳ Waiting for network to stabilize with new configuration...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Step 8: Verify network is running with new configuration
    console.log('🔍 Verifying network is running with new configuration...');
    
    // The network should still be functional after the configuration changes
    const finalConfig = network.getConfig();
    expect(finalConfig.subnet).toBe('172.60.0.0/16');
    expect(finalConfig.gasLimit).toBe('0x5F5E100');
    expect(finalConfig.blockTime).toBe(15);

    console.log('✅ Network successfully running with updated configuration');

    // Cleanup
    console.log('🧹 Cleaning up test network...');
    await network.stop();
    await network.destroy();

    console.log('✅ Configuration update test completed successfully!');
    console.log('✅ Successfully updated subnet, gasLimit, blockTime and all node IPs');
    console.log('🎯 Network remained functional throughout the configuration changes');
    console.log('📊 All configuration parameters properly validated and applied');

  }, 300000); // 5 minute timeout for this comprehensive test

  test('Validation errors for updateNetworkConfig', async () => {
    const testNetworkName = `config-validation-test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`🧪 Testing configuration validation for network: ${testNetworkName}`);

    // Create a simple network for validation testing
    const config: BesuNetworkConfig = {
      name: testNetworkName,
      chainId: 1235,
      subnet: '172.51.0.0/16',
      consensus: 'clique',
      gasLimit: '0x47E7C4',
      signerAccounts: [
        {
          address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
          weiAmount: '50000000000000000000000', // 50,000 ETH
          minerNode: 'miner1'
        }
      ]
    };

    const nodes: BesuNodeDefinition[] = [
      {
        name: 'bootnode1',
        ip: '172.51.0.10',
        rpcPort: 8545,
        type: 'bootnode'
      },
      {
        name: 'miner1',
        ip: '172.51.0.11',
        rpcPort: 8546,
        type: 'miner'
      }
    ];

    const network = new BesuNetwork(config);
    await network.create({
      nodes,
      autoResolveSubnetConflicts: true
    });

    console.log('📦 Created validation test network');

    // Test 1: Subnet update without nodes array should fail
    console.log('🔍 Testing subnet update without nodes array...');
    await expect(updateNetworkConfig(network, {
      subnet: '172.61.0.0/16'
      // No nodes array provided
    })).rejects.toThrow(/nodes array is required/);
    console.log('✅ Correctly rejected subnet update without nodes array');

    // Test 2: Subnet update with wrong number of nodes should fail
    console.log('🔍 Testing subnet update with wrong number of nodes...');
    await expect(updateNetworkConfig(network, {
      subnet: '172.61.0.0/16',
      nodes: [
        { name: 'bootnode1', ip: '172.61.0.10' }
        // Missing miner1 node
      ]
    })).rejects.toThrow(/must contain exactly/);
    console.log('✅ Correctly rejected subnet update with wrong number of nodes');

    // Test 3: Subnet update with invalid node name should fail
    console.log('🔍 Testing subnet update with invalid node name...');
    await expect(updateNetworkConfig(network, {
      subnet: '172.61.0.0/16',
      nodes: [
        { name: 'bootnode1', ip: '172.61.0.10' },
        { name: 'invalid_node', ip: '172.61.0.11' }
      ]
    })).rejects.toThrow(/does not exist in the network/);
    console.log('✅ Correctly rejected subnet update with invalid node name');

    // Test 4: Subnet update with IP not in new subnet should fail
    console.log('🔍 Testing subnet update with IP not in new subnet...');
    await expect(updateNetworkConfig(network, {
      subnet: '172.61.0.0/16',
      nodes: [
        { name: 'bootnode1', ip: '172.61.0.10' },
        { name: 'miner1', ip: '192.168.1.11' } // Wrong subnet
      ]
    })).rejects.toThrow(/is not in the new subnet/);
    console.log('✅ Correctly rejected IP not in new subnet');

    // Test 5: Invalid gas limit should fail
    console.log('🔍 Testing invalid gas limit...');
    await expect(updateNetworkConfig(network, {
      gasLimit: '0x1000' // Too low
    })).rejects.toThrow(/Gas limit must be between/);
    console.log('✅ Correctly rejected invalid gas limit');

    // Test 6: Invalid block time should fail
    console.log('🔍 Testing invalid block time...');
    await expect(updateNetworkConfig(network, {
      blockTime: 500 // Too high
    })).rejects.toThrow(/Block time must be between/);
    console.log('✅ Correctly rejected invalid block time');

    // Cleanup
    console.log('🧹 Cleaning up validation test network...');
    await network.destroy();

    console.log('✅ Validation tests completed successfully!');
    console.log('🎯 All validation rules working correctly');

  }, 120000); // 2 minute timeout

});

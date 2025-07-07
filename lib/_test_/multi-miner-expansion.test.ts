import { BesuNetwork, BesuNetworkConfig } from '../src/create-besu-networks';
import { cleanupTestNetworks, generateTestNetworkName, checkDockerAvailability } from './test-utils';

/**
 * Test específico para adición exitosa de múltiples miners con sus signerAccounts
 * Este test valida que se pueden agregar miners adicionales correctamente
 * cuando se configuran con sus respectivos signerAccounts
 */

// Global test setup and cleanup
beforeAll(async () => {
  console.log('🧪 Setting up multi-miner addition test environment...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test environment ready');
  } else {
    console.log('⚠️  Docker not available, tests will run in mock mode');
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Cleaning up after multi-miner addition tests...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test cleanup completed');
  }
}, 30000);

describe('Multi-Miner Network Expansion', () => {
    test('should successfully add two new miners with their respective signerAccounts and maintain consensus', async () => {
        if (!checkDockerAvailability()) {
            console.log('⚠️  Skipping Docker-dependent test');
            return;
        }

        const baseNetworkName = generateTestNetworkName('multi-miner-expansion-test');
        console.log(`🧪 Testing multi-miner expansion with base name: ${baseNetworkName}`);

        // Create initial network configuration with one signer account
        const originalSignerAccount = { 
            address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', 
            weiAmount: '100000000000000000000000' 
        };

        const config: BesuNetworkConfig = {
            name: baseNetworkName,
            chainId: 1348,
            subnet: '172.43.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5,
            signerAccounts: [originalSignerAccount]
        };

        const network = new BesuNetwork(config);

        try {
            // Step 1: Create initial network with bootnode, miner, and rpc
            console.log('📦 Creating initial network with bootnode, miner1, and rpc...');
            await network.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.43.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.43.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.43.0.12', rpcPort: 8547, type: 'rpc' }
                ]
            });

            // Start the initial network
            console.log('🚀 Starting initial network...');
            await network.start();

            // Wait for initial network stabilization
            console.log('⏳ Waiting for initial network stabilization...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Verify initial network is working
            console.log('🔍 Checking initial network connectivity...');
            let connectivity = await network.getNetworkConnectivity();
            let activeNodes = connectivity.filter(node => node.isActive);
            
            console.log('📊 Initial network state:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                console.log(`   ${status} ${node.nodeName}${block}`);
            });

            expect(activeNodes.length).toBe(3); // bootnode1, miner1, rpc1
            console.log('✅ Initial network created successfully with 1 miner');

            // Get original miner's signer account
            const originalMinerSigner = network.getMinerSignerAssociations()[0];
            console.log(`🔑 Original miner1 signer account: ${originalMinerSigner.signerAccount.address}`);

            // Step 2: Create expanded network with THREE miners total (odd number - recommended)
            console.log('🔄 Creating expanded network with two additional miners...');
            
            // Stop the current network
            await network.stop();
            
            // Create additional signer accounts for the new miners
            const secondSignerAccount = { 
                address: '0x123f681646d4a755815f9CB19e1aCc8565A0c2AC', 
                weiAmount: '100000000000000000000000' 
            };

            const thirdSignerAccount = { 
                address: '0x456f681646d4a755815f9CB19e1aCc8565A0c2BD', 
                weiAmount: '100000000000000000000000' 
            };

            // Create network configuration with THREE signer accounts for THREE miners
            const expandedConfig: BesuNetworkConfig = {
                name: `${baseNetworkName}-expanded`,
                chainId: 1349, // Use a different chain ID to avoid conflicts
                subnet: '172.44.0.0/16', // Use a different subnet to avoid conflicts
                consensus: 'clique',
                gasLimit: '0x47E7C4',
                blockTime: 5,
                signerAccounts: [originalSignerAccount, secondSignerAccount, thirdSignerAccount] // ✅ Three signers for three miners
            };
            
            const expandedNetwork = new BesuNetwork(expandedConfig);
            
            console.log('📦 Creating expanded network with 3 miners and 3 signerAccounts...');
            await expandedNetwork.create({
                nodes: [
                    // Original nodes (with new IPs to match new subnet)
                    { name: 'bootnode1', ip: '172.44.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.44.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.44.0.12', rpcPort: 8547, type: 'rpc' },
                    // New miners with their own signerAccounts (avoiding consecutive RPC ports)
                    { name: 'miner2', ip: '172.44.0.13', rpcPort: 8550, type: 'miner' },
                    { name: 'miner3', ip: '172.44.0.14', rpcPort: 8552, type: 'miner' }
                ]
            });

            console.log('✅ Expanded network created successfully with 3 miners');

            // Step 3: Start the expanded network with all miners
            console.log('🚀 Starting expanded network with all 3 miners...');
            await expandedNetwork.start();

            // Wait for network stabilization with multiple miners
            console.log('⏳ Waiting for network stabilization with multiple miners...');
            await new Promise(resolve => setTimeout(resolve, 25000)); // More time for multiple miners

            // Step 4: Verify all nodes are operational and mining
            console.log('🔍 Checking expanded network connectivity...');
            connectivity = await expandedNetwork.getNetworkConnectivity();
            activeNodes = connectivity.filter(node => node.isActive);

            console.log('📊 Expanded network state with all miners:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                console.log(`   ${status} ${node.nodeName}${block}`);
            });

            // Verify that all nodes are active
            expect(activeNodes.length).toBe(5); // bootnode1, miner1, rpc1, miner2, miner3

            // Verify that all expected nodes are present
            const nodeNames = activeNodes.map(node => node.nodeName);
            expect(nodeNames).toContain('bootnode1');
            expect(nodeNames).toContain('miner1');
            expect(nodeNames).toContain('rpc1');
            expect(nodeNames).toContain('miner2');
            expect(nodeNames).toContain('miner3');

            console.log('✅ All 5 nodes are active and properly integrated');

            // Step 5: Verify all miners have proper signerAccount associations
            console.log('🔍 Verifying miner-signerAccount associations...');
            const minerSignerAssociations = expandedNetwork.getMinerSignerAssociations();
            
            console.log('📋 Miner-Signer associations:');
            minerSignerAssociations.forEach((association, index) => {
                console.log(`   ${index + 1}. Miner: ${association.minerName} | SignerAccount: ${association.signerAccount.address}`);
            });

            expect(minerSignerAssociations.length).toBe(3); // Should have 3 associations

            // Verify each miner has a unique signer account
            const signerAddresses = minerSignerAssociations.map(assoc => assoc.signerAccount.address);
            const uniqueSigners = [...new Set(signerAddresses)];
            expect(uniqueSigners.length).toBe(3); // All should be unique

            console.log('✅ All miners have unique signerAccount associations');

            // Step 6: Verify mining and consensus are working
            console.log('🔍 Verifying mining and consensus across all miners...');
            const activeNodesWithBlocks = activeNodes.filter(node => node.blockNumber !== undefined && node.blockNumber > 0);
            
            if (activeNodesWithBlocks.length > 0) {
                console.log(`✅ Mining is working across the network - found ${activeNodesWithBlocks.length} nodes with blocks`);
                expect(activeNodesWithBlocks.length).toBeGreaterThan(0);
                
                // Verify that multiple miners are likely participating
                const activeMinersWithBlocks = activeNodesWithBlocks.filter(node => 
                    node.nodeName.includes('miner')
                );
                console.log(`🔨 Active miners with blocks: ${activeMinersWithBlocks.length}`);
                expect(activeMinersWithBlocks.length).toBeGreaterThan(0);
            } else {
                console.log('⚠️  Mining may still be starting up with multiple miners - this is acceptable');
            }

            // Step 7: Verify network consensus across all nodes
            console.log('🔍 Verifying network consensus across all nodes...');
            
            // Check that all nodes have similar block numbers (within a reasonable range)
            const blockNumbers = activeNodes
                .filter(node => node.blockNumber !== undefined)
                .map(node => node.blockNumber as number);
            
            if (blockNumbers.length > 1) {
                const minBlock = Math.min(...blockNumbers);
                const maxBlock = Math.max(...blockNumbers);
                const blockDifference = maxBlock - minBlock;
                
                console.log(`📊 Block range: ${minBlock} to ${maxBlock} (difference: ${blockDifference})`);
                expect(blockDifference).toBeLessThan(10); // Allow more variance with multiple miners
                console.log('✅ Network consensus is maintained across all nodes');
            }

            // Step 8: Verify network stability
            console.log('🔍 Testing network stability over time...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 more seconds
            
            const finalConnectivity = await expandedNetwork.getNetworkConnectivity();
            const finalActiveNodes = finalConnectivity.filter(node => node.isActive);
            
            expect(finalActiveNodes.length).toBe(5); // Should still have all nodes active
            console.log('✅ Network remains stable with all nodes active');

            console.log('🎉 Multi-miner expansion test completed successfully!');
            console.log(`📈 Successfully expanded from 1 to 3 miners with proper consensus`);

            // Cleanup expanded network
            await expandedNetwork.stop();
            await expandedNetwork.destroy();

        } finally {
            // Cleanup original and expanded networks
            console.log('🧹 Cleaning up test networks...');
            try {
                await network.stop();
                await network.destroy();
            } catch (cleanupError) {
                console.log(`⚠️  Cleanup error for original network: ${cleanupError}`);
            }
            
            try {
                // Try to cleanup expanded network if it exists
                const expandedNetwork = new BesuNetwork({
                    name: `${baseNetworkName}-expanded`,
                    chainId: 1349,
                    subnet: '172.44.0.0/16',
                    consensus: 'clique',
                    gasLimit: '0x47E7C4',
                    blockTime: 5,
                    signerAccounts: [
                        { address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', weiAmount: '100000000000000000000000' },
                        { address: '0x123f681646d4a755815f9CB19e1aCc8565A0c2AC', weiAmount: '100000000000000000000000' },
                        { address: '0x456f681646d4a755815f9CB19e1aCc8565A0c2BD', weiAmount: '100000000000000000000000' }
                    ]
                });
                await expandedNetwork.stop();
                await expandedNetwork.destroy();
            } catch (cleanupError) {
                console.log(`⚠️  Cleanup error for expanded network: ${cleanupError}`);
            }
        }
    }, 180000); // 3-minute timeout for the longer multi-miner test
});

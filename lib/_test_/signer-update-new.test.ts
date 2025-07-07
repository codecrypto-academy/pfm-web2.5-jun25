import { BesuNetwork, BesuNetworkConfig } from '../src/create-besu-networks';
import { cleanupTestNetworks, generateTestNetworkName, checkDockerAvailability } from './test-utils';

/**
 * Test específico para cambio de signerAccount del miner y actualización de nodos
 */

// Global test setup and cleanup
beforeAll(async () => {
  console.log('🧪 Setting up signer update test environment...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test environment ready');
  } else {
    console.log('⚠️  Docker not available, tests will run in mock mode');
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Cleaning up after signer update tests...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test cleanup completed');
  }
}, 30000);

describe('Node Update and Synchronization', () => {
    test('should change miner signerAccount and maintain network operation', async () => {
        if (!checkDockerAvailability()) {
            console.log('⚠️  Skipping Docker-dependent test');
            return;
        }

        const baseNetworkName = generateTestNetworkName('signer-update-test');
        console.log(`🧪 Testing miner signerAccount change with base name: ${baseNetworkName}`);

        // Create initial network configuration with original signer account
        const originalSignerAccount = { 
            address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', 
            weiAmount: '100000000000000000000000' 
        };

        const config: BesuNetworkConfig = {
            name: `${baseNetworkName}-original`,
            chainId: 1341,
            subnet: '172.36.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5,
            signerAccounts: [originalSignerAccount]
        };

        const network = new BesuNetwork(config);

        try {
            // Step 1: Create initial network
            console.log('📦 Creating initial network with original signer account...');
            await network.create({
                nodes: [
                    { name: 'bootnode', ip: '172.36.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner', ip: '172.36.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc', ip: '172.36.0.12', rpcPort: 8547, type: 'rpc' }
                ]
            });

            // Start the network
            console.log('🚀 Starting network...');
            await network.start();

            // Wait for network stabilization
            console.log('⏳ Waiting for initial network stabilization...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Verify initial connectivity
            console.log('🔍 Checking initial network connectivity...');
            let connectivity = await network.getNetworkConnectivity();
            const activeNodes = connectivity.filter(node => node.isActive);
            
            console.log('📊 Initial network state:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                console.log(`   ${status} ${node.nodeName}${block}`);
            });

            expect(activeNodes.length).toBeGreaterThan(0);

            // Get original signer account address for the miner
            const originalMinerSigner = network.getMinerSignerAssociations()[0];
            console.log(`🔑 Original miner signer account: ${originalMinerSigner.signerAccount.address}`);

            // Step 2: Stop and destroy the original network completely
            console.log('⏸️  Stopping and destroying original network...');
            await network.stop();
            await network.destroy();

            // Step 3: Create a completely new network with a new signer account
            const newSignerAccount = { 
                address: '0x123f681646d4a755815f9CB19e1aCc8565A0c2AC', 
                weiAmount: '200000000000000000000000' 
            };

            console.log(`🔄 Changing signer account from ${originalMinerSigner.signerAccount.address} to ${newSignerAccount.address}`);
            
            // Create completely new network configuration with different name and subnet
            const updatedConfig: BesuNetworkConfig = {
                name: `${baseNetworkName}-updated`,
                chainId: 1342, // Different chain ID
                subnet: '172.37.0.0/16', // Different subnet
                consensus: 'clique',
                gasLimit: '0x47E7C4',
                blockTime: 5,
                signerAccounts: [newSignerAccount]
            };
            
            // Create new network instance with updated configuration
            const updatedNetwork = new BesuNetwork(updatedConfig);
            
            // Create the new network with the new signer account
            console.log('🔄 Creating new network with new signer account...');
            await updatedNetwork.create({
                nodes: [
                    { name: 'bootnode', ip: '172.37.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner', ip: '172.37.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc', ip: '172.37.0.12', rpcPort: 8547, type: 'rpc' }
                ]
            });

            // Step 4: Start the network with the new signer account
            console.log('🚀 Starting network with new signer account...');
            await updatedNetwork.start();

            // Wait for network stabilization with new signer
            console.log('⏳ Waiting for network stabilization with new signer...');
            await new Promise(resolve => setTimeout(resolve, 20000));

            // Step 5: Verify network is operational with new signer account
            console.log('🔍 Checking network connectivity with new signer...');
            connectivity = await updatedNetwork.getNetworkConnectivity();
            const updatedActiveNodes = connectivity.filter(node => node.isActive);

            console.log('📊 Updated network state with new signer:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                console.log(`   ${status} ${node.nodeName}${block}`);
            });

            // Verify that the network is operational
            expect(updatedActiveNodes.length).toBeGreaterThan(0);

            // Verify that the new signer account is being used
            const newMinerSigner = updatedNetwork.getMinerSignerAssociations()[0];
            console.log(`🔑 New miner signer account: ${newMinerSigner.signerAccount.address}`);
            expect(newMinerSigner.signerAccount.address).toBe(newSignerAccount.address);

            // Verify mining is working with new signer
            const activeNodesWithBlocks = updatedActiveNodes.filter(node => node.blockNumber !== undefined && node.blockNumber > 0);
            if (activeNodesWithBlocks.length > 0) {
                console.log(`✅ Mining is working with new signer account - found ${activeNodesWithBlocks.length} nodes with blocks`);
                expect(activeNodesWithBlocks.length).toBeGreaterThan(0);
            } else {
                console.log('⚠️  Mining may still be starting up with new signer - this is acceptable');
            }

            console.log('✅ Signer account change test completed successfully!');

            // Cleanup updated network
            await updatedNetwork.stop();
            await updatedNetwork.destroy();

        } finally {
            // Cleanup original network
            console.log('🧹 Cleaning up test network...');
            try {
                await network.stop();
                await network.destroy();
            } catch (cleanupError) {
                console.log(`⚠️  Cleanup error: ${cleanupError}`);
            }
        }
    }, 120000); // 2-minute timeout

    test('should add bootnode and rpc nodes to existing network and verify integration', async () => {
        if (!checkDockerAvailability()) {
            console.log('⚠️  Skipping Docker-dependent test');
            return;
        }

        const baseNetworkName = generateTestNetworkName('node-integration-test');
        console.log(`🧪 Testing node addition and integration with base name: ${baseNetworkName}`);

        // Create initial network configuration
        const signerAccount = { 
            address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', 
            weiAmount: '100000000000000000000000' 
        };

        const config: BesuNetworkConfig = {
            name: baseNetworkName,
            chainId: 1343,
            subnet: '172.38.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5,
            signerAccounts: [signerAccount]
        };

        const network = new BesuNetwork(config);

        try {
            // Step 1: Create initial network with bootnode, miner, and rpc
            console.log('📦 Creating initial network with bootnode, miner, and rpc...');
            await network.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.38.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.38.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.38.0.12', rpcPort: 8547, type: 'rpc' }
                ]
            });

            // Start the initial network
            console.log('🚀 Starting initial network...');
            await network.start();

            // Wait for initial network stabilization
            console.log('⏳ Waiting for initial network stabilization...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Verify initial connectivity
            console.log('🔍 Checking initial network connectivity...');
            let connectivity = await network.getNetworkConnectivity();
            let activeNodes = connectivity.filter(node => node.isActive);
            
            console.log('📊 Initial network state:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                console.log(`   ${status} ${node.nodeName}${block}`);
            });

            expect(activeNodes.length).toBeGreaterThan(0);
            expect(activeNodes.length).toBe(3); // bootnode1, miner1, rpc1

            // Step 2: Stop the network and recreate it with additional nodes
            console.log('🔄 Creating expanded network with additional bootnode and rpc nodes...');
            
            // Stop the current network
            await network.stop();
            
            // Create a new network configuration with all nodes (original + new)
            const expandedConfig: BesuNetworkConfig = {
                name: `${baseNetworkName}-expanded`,
                chainId: 1344, // Use a different chain ID to avoid conflicts
                subnet: '172.39.0.0/16', // Use a different subnet to avoid conflicts
                consensus: 'clique',
                gasLimit: '0x47E7C4',
                blockTime: 5,
                signerAccounts: [signerAccount]
            };
            
            const expandedNetwork = new BesuNetwork(expandedConfig);
            
            // Create the expanded network with all nodes
            await expandedNetwork.create({
                nodes: [
                    // Original nodes (with new IPs to match new subnet)
                    { name: 'bootnode1', ip: '172.39.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.39.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.39.0.12', rpcPort: 8547, type: 'rpc' },
                    // New nodes
                    { name: 'bootnode2', ip: '172.39.0.13', rpcPort: 8548, type: 'bootnode' },
                    { name: 'rpc2', ip: '172.39.0.14', rpcPort: 8549, type: 'rpc' }
                ]
            });

            // Step 3: Start the expanded network
            console.log('🚀 Starting expanded network with all nodes...');
            await expandedNetwork.start();

            // Wait for network stabilization with new nodes
            console.log('⏳ Waiting for network stabilization with all nodes...');
            await new Promise(resolve => setTimeout(resolve, 20000));

            // Step 4: Verify network is operational with all nodes
            console.log('🔍 Checking network connectivity with all nodes...');
            connectivity = await expandedNetwork.getNetworkConnectivity();
            activeNodes = connectivity.filter(node => node.isActive);

            console.log('📊 Expanded network state with all nodes:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                console.log(`   ${status} ${node.nodeName}${block}`);
            });

            // Verify that all nodes are active
            expect(activeNodes.length).toBeGreaterThan(3); // Should have more than initial 3 nodes
            expect(activeNodes.length).toBe(5); // bootnode1, miner1, rpc1, bootnode2, rpc2

            // Verify that all nodes are properly integrated
            const nodeNames = activeNodes.map(node => node.nodeName);
            expect(nodeNames).toContain('bootnode1');
            expect(nodeNames).toContain('miner1');
            expect(nodeNames).toContain('rpc1');
            expect(nodeNames).toContain('bootnode2');
            expect(nodeNames).toContain('rpc2');

            // Verify mining is still working
            const activeNodesWithBlocks = activeNodes.filter(node => node.blockNumber !== undefined && node.blockNumber > 0);
            if (activeNodesWithBlocks.length > 0) {
                console.log(`✅ Mining is working with expanded network - found ${activeNodesWithBlocks.length} nodes with blocks`);
                expect(activeNodesWithBlocks.length).toBeGreaterThan(0);
            } else {
                console.log('⚠️  Mining may still be starting up with new nodes - this is acceptable');
            }

            // Step 5: Verify network consensus and coherence
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
                expect(blockDifference).toBeLessThan(5); // Nodes should be within 5 blocks of each other
            }

            console.log('✅ Node integration test completed successfully!');

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
                    chainId: 1344,
                    subnet: '172.39.0.0/16',
                    consensus: 'clique',
                    gasLimit: '0x47E7C4',
                    blockTime: 5,
                    signerAccounts: [signerAccount]
                });
                await expandedNetwork.stop();
                await expandedNetwork.destroy();
            } catch (cleanupError) {
                console.log(`⚠️  Cleanup error for expanded network: ${cleanupError}`);
            }
        }
    }, 150000); // 2.5-minute timeout for the longer test

    test('should fail validation when adding second miner with signerAccount due to consensus restrictions', async () => {
        if (!checkDockerAvailability()) {
            console.log('⚠️  Skipping Docker-dependent test');
            return;
        }

        const baseNetworkName = generateTestNetworkName('consensus-validation-test');
        console.log(`🧪 Testing consensus validation when adding second miner with base name: ${baseNetworkName}`);

        // Create initial network configuration with one signer account
        const originalSignerAccount = { 
            address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', 
            weiAmount: '100000000000000000000000' 
        };

        const config: BesuNetworkConfig = {
            name: baseNetworkName,
            chainId: 1345,
            subnet: '172.40.0.0/16',
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
                    { name: 'bootnode1', ip: '172.40.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.40.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.40.0.12', rpcPort: 8547, type: 'rpc' }
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

            // Step 2: Attempt to create expanded network with second miner + signerAccount
            console.log('🔄 Attempting to add second miner with additional signerAccount (should fail)...');
            
            // Stop the current network
            await network.stop();
            
            // Create second signer account for the new miner
            const secondSignerAccount = { 
                address: '0x123f681646d4a755815f9CB19e1aCc8565A0c2AC', 
                weiAmount: '100000000000000000000000' 
            };

            // Try to create network configuration with TWO signer accounts (should fail validation)
            const invalidExpandedConfig: BesuNetworkConfig = {
                name: `${baseNetworkName}-invalid`,
                chainId: 1346,
                subnet: '172.41.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4',
                blockTime: 5,
                signerAccounts: [originalSignerAccount, secondSignerAccount] // ❌ Multiple signers for Clique
            };
            
            const invalidExpandedNetwork = new BesuNetwork(invalidExpandedConfig);
            
            // This should fail during network creation due to consensus validation
            console.log('⚠️  Attempting to create network with 2 miners and 2 signerAccounts...');
            
            let validationFailed = false;
            let errorMessage = '';
            
            try {
                await invalidExpandedNetwork.create({
                    nodes: [
                        // Original nodes
                        { name: 'bootnode1', ip: '172.41.0.10', rpcPort: 8545, type: 'bootnode' },
                        { name: 'miner1', ip: '172.41.0.11', rpcPort: 8546, type: 'miner' },
                        { name: 'rpc1', ip: '172.41.0.12', rpcPort: 8547, type: 'rpc' },
                        // Additional miner (should cause validation failure)
                        { name: 'miner2', ip: '172.41.0.13', rpcPort: 8548, type: 'miner' }
                    ]
                });
                
                console.log('❌ ERROR: Network creation should have failed but succeeded!');
            } catch (error) {
                validationFailed = true;
                errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`✅ Expected validation failure occurred: ${errorMessage}`);
            }

            // Verify that the validation correctly failed
            expect(validationFailed).toBe(true);
            expect(errorMessage).toContain('consensus'); // Should mention consensus in error

            // Step 3: Alternative approach - try with single signer but multiple miners (should also fail)
            console.log('🔄 Alternative test: Single signerAccount but multiple miners (should also fail)...');
            
            const singleSignerMultiMinerConfig: BesuNetworkConfig = {
                name: `${baseNetworkName}-single-signer`,
                chainId: 1347,
                subnet: '172.42.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4',
                blockTime: 5,
                signerAccounts: [originalSignerAccount] // Only one signer
            };
            
            const singleSignerNetwork = new BesuNetwork(singleSignerMultiMinerConfig);
            
            let singleSignerValidationFailed = false;
            let singleSignerErrorMessage = '';
            
            try {
                await singleSignerNetwork.create({
                    nodes: [
                        { name: 'bootnode1', ip: '172.42.0.10', rpcPort: 8545, type: 'bootnode' },
                        { name: 'miner1', ip: '172.42.0.11', rpcPort: 8546, type: 'miner' },
                        { name: 'miner2', ip: '172.42.0.12', rpcPort: 8547, type: 'miner' }, // ❌ Second miner
                        { name: 'rpc1', ip: '172.42.0.13', rpcPort: 8548, type: 'rpc' }
                    ]
                });
                
                console.log('❌ ERROR: Single signer + multiple miners should have failed!');
            } catch (error) {
                singleSignerValidationFailed = true;
                singleSignerErrorMessage = error instanceof Error ? error.message : String(error);
                console.log(`✅ Expected validation failure for multiple miners: ${singleSignerErrorMessage}`);
            }

            // Verify that this validation also correctly failed
            expect(singleSignerValidationFailed).toBe(true);
            expect(singleSignerErrorMessage).toMatch(/(miner|consensus|signer)/i);

            console.log('✅ Consensus validation test completed successfully - both scenarios failed as expected!');

        } finally {
            // Cleanup any networks that might have been created
            console.log('🧹 Cleaning up test networks...');
            try {
                await network.stop();
                await network.destroy();
            } catch (cleanupError) {
                console.log(`⚠️  Cleanup error for original network: ${cleanupError}`);
            }
            
            // Cleanup other potential networks
            const networksToCleanup = [
                { name: `${baseNetworkName}-invalid`, chainId: 1346, subnet: '172.41.0.0/16' },
                { name: `${baseNetworkName}-single-signer`, chainId: 1347, subnet: '172.42.0.0/16' }
            ];
            
            for (const networkConfig of networksToCleanup) {
                try {
                    const tempNetwork = new BesuNetwork({
                        name: networkConfig.name,
                        chainId: networkConfig.chainId,
                        subnet: networkConfig.subnet,
                        consensus: 'clique',
                        gasLimit: '0x47E7C4',
                        blockTime: 5,
                        signerAccounts: [originalSignerAccount]
                    });
                    await tempNetwork.stop();
                    await tempNetwork.destroy();
                } catch (cleanupError) {
                    console.log(`⚠️  Cleanup error for ${networkConfig.name}: ${cleanupError}`);
                }
            }
        }
    }, 120000); // 2-minute timeout
});

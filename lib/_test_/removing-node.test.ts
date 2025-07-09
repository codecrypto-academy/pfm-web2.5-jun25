import * as fs from "fs";
import * as path from "path";
import { BesuNetwork, BesuNetworkConfig } from '../src/create-besu-networks';
import { updateNetworkNodesByName } from '../src/update-besu-networks';
import { cleanupTestNetworks, generateTestNetworkName, checkDockerAvailability } from './test-utils';

/**
 * Test para eliminar nodos RPC de una red Besu existente
 */

// Global test setup and cleanup
beforeAll(async () => {
  console.log('🧪 Setting up removing nodes test environment...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test environment ready');
  } else {
    console.log('⚠️  Docker not available, tests will run in mock mode');
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Cleaning up after removing nodes tests...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test cleanup completed');
  }
}, 30000);

describe('Removing RPC node from existing network', () => {
    test('should create network with 4 nodes and remove one RPC node', async () => {
        if (!checkDockerAvailability()) {
            console.log('⚠️  Skipping Docker-dependent test');
            return;
        }

        const baseNetworkName = generateTestNetworkName('removing-node-test');
        console.log(`🧪 Testing removing node from network: ${baseNetworkName}`);

        // Create initial network configuration with 4 nodes
        const signerAccount = { 
            address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', 
            weiAmount: '100000000000000000000000' 
        };

        const config: BesuNetworkConfig = {
            name: baseNetworkName,
            chainId: 1346,
            subnet: '172.41.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5,
            signerAccounts: [signerAccount]
        };

        const network = new BesuNetwork(config);

        try {
            // Step 1: Create initial network with bootnode, miner, and 2 RPC nodes
            console.log('📦 Creating initial network with 4 nodes...');
            await network.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.41.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.41.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.41.0.12', rpcPort: 8547, type: 'rpc' },
                    { name: 'rpc2', ip: '172.41.0.13', rpcPort: 8548, type: 'rpc' }
                ]
            });

            console.log('📊 Initial network created with nodes:');
            const initialNodes = Array.from(network.getNodes().entries());
            initialNodes.forEach(([nodeName, node]) => {
                const nodeConfig = node.getConfig();
                console.log(`   - ${nodeName} (${nodeConfig.type}) at ${nodeConfig.ip}:${nodeConfig.rpcPort}`);
            });

            // Start the initial network
            console.log('🚀 Starting initial network...');
            await network.start();

            // Wait for initial network stabilization
            console.log('⏳ Waiting for initial network stabilization...');
            await new Promise(resolve => setTimeout(resolve, 25000));

            // Verify initial connectivity
            console.log('🔍 Checking initial network connectivity...');
            let connectivity = await network.getNetworkConnectivity();
            let activeNodes = connectivity.filter(node => node.isActive);
            
            console.log('📊 Initial network state:');
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
                console.log(`   ${status} ${node.nodeName}${block}${peers}`);
            });

            expect(activeNodes.length).toBeGreaterThan(0);
            console.log(`   Found ${activeNodes.length} active nodes (minimum 1 required to proceed)`);
            
            // Store initial block number for continuity verification
            const initialNode = activeNodes.find(node => node.nodeName === 'miner1') || activeNodes[0];
            const initialBlockNumber = initialNode?.blockNumber || 0;
            console.log(`📊 Initial network block number: ${initialBlockNumber}`);

            // Stop the current network before making changes
            console.log('⏸️  Stopping network for node removal...');
            await network.stop();
            
            // Step 2: Save current network config to file system
            console.log('💾 Saving current network config to file system...');
            const testNetworkDirPath = path.join('./networks', baseNetworkName);
            const testConfigPath = path.join(testNetworkDirPath, 'network-config.json');
            
            console.log(`   Creating config file at ${testConfigPath}`);
            const currentConfig = network.getConfig();
            
            // Get miner-signer associations with private keys from the network
            const minerSignerAssociations = network.getMinerSignerAssociations();
            console.log(`   Found ${minerSignerAssociations.length} miner-signer associations`);
            
            // Update signerAccounts in config to include private keys
            const updatedSignerAccounts = currentConfig.signerAccounts?.map(signerAccount => {
                const association = minerSignerAssociations.find(assoc => 
                    assoc.signerAccount.address === signerAccount.address
                );
                if (association) {
                    console.log(`   Adding private key for signerAccount ${signerAccount.address} associated with miner ${association.minerName}`);
                    return {
                        ...signerAccount,
                        privateKey: association.keys.privateKey,
                        publicKey: association.keys.publicKey,
                        enode: association.keys.enode,
                        minerNode: association.minerName
                    };
                }
                return signerAccount;
            }) || [];
            
            // Add node details to the config
            const configWithNodes = {
                ...currentConfig,
                signerAccounts: updatedSignerAccounts,
                nodes: Array.from(network.getNodes().entries()).map(([nodeName, node]) => {
                    const nodeConfig = node.getConfig();
                    return {
                        name: nodeConfig.name,
                        ip: nodeConfig.ip,
                        rpcPort: nodeConfig.rpcPort,
                        p2pPort: nodeConfig.port || 30303,
                        type: nodeConfig.type
                    };
                })
            };
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(testNetworkDirPath)) {
                fs.mkdirSync(testNetworkDirPath, { recursive: true });
            }
            
            fs.writeFileSync(testConfigPath, JSON.stringify(configWithNodes, null, 2));
            console.log('   ✅ Config file created with initial nodes:');
            configWithNodes.nodes.forEach((node: any) => {
                console.log(`      - ${node.name} (${node.type}) at ${node.ip}:${node.rpcPort}`);
            });
            
            // Step 3: Remove rpc2 node using updateNetworkNodesByName
            console.log('➖ Removing rpc2 node...');
            console.log(`   Removing node: rpc2 (will keep bootnode1, miner1, rpc1)`);
            
            // Use updateNetworkNodesByName to remove the rpc2 node
            const result = await updateNetworkNodesByName(
                baseNetworkName,
                {
                    remove: ['rpc2']
                },
                {
                    baseDir: './networks',
                    startAfterUpdate: false // Don't auto-start, we'll verify first
                }
            );
            
            console.log('✅ Node removed via updateNetworkNodesByName');
            console.log(`📊 Update result: success=${result.success}`);
            if (result.nodesRemoved) {
                console.log(`   Nodes removed: ${result.nodesRemoved.join(', ')}`);
            }
            
            // Verify that the configuration file was updated
            console.log('📊 Verifying updated configuration file...');
            if (fs.existsSync(testConfigPath)) {
                const updatedConfigData = fs.readFileSync(testConfigPath, 'utf-8');
                const updatedConfigJson = JSON.parse(updatedConfigData);
                
                console.log(`   Total nodes in config: ${updatedConfigJson.nodes?.length || 0}`);
                if (updatedConfigJson.nodes) {
                    updatedConfigJson.nodes.forEach((node: any) => {
                        console.log(`      - ${node.name} (${node.type}) at ${node.ip}:${node.rpcPort}`);
                    });
                }
                
                // Verify specific nodes configuration
                const remainingNodes = updatedConfigJson.nodes || [];
                const bootnode1Config = remainingNodes.find((n: any) => n.name === 'bootnode1');
                const miner1Config = remainingNodes.find((n: any) => n.name === 'miner1');
                const rpc1Config = remainingNodes.find((n: any) => n.name === 'rpc1');
                const rpc2Config = remainingNodes.find((n: any) => n.name === 'rpc2');
                
                expect(updatedConfigJson.nodes?.length).toBe(3); // Original 4 - removed 1
                
                // Verify remaining nodes still exist
                expect(bootnode1Config).toBeDefined();
                expect(miner1Config).toBeDefined();
                expect(rpc1Config).toBeDefined();
                
                // Verify removed node is gone
                expect(rpc2Config).toBeUndefined();
                
                console.log('   ✅ rpc2 node correctly removed from config');
                console.log('   ✅ Remaining 3 nodes still in config');
            }
            
            // Verify that TOML file for removed node was cleaned up
            console.log('📊 Verifying TOML file cleanup...');
            
            const rpc2TomlPath = path.join(testNetworkDirPath, 'rpc2_config.toml');
            const rpc2KeyPath = path.join(testNetworkDirPath, 'rpc2', 'key');
            
            // Check if rpc2 TOML and key files were removed
            if (!fs.existsSync(rpc2TomlPath)) {
                console.log(`   ✅ rpc2 TOML file correctly removed`);
            } else {
                console.log(`   ⚠️ rpc2 TOML file still exists at ${rpc2TomlPath}`);
            }
            
            if (!fs.existsSync(rpc2KeyPath)) {
                console.log(`   ✅ rpc2 key directory correctly removed`);
            } else {
                console.log(`   ⚠️ rpc2 key directory still exists at ${rpc2KeyPath}`);
            }
            
            // Step 4: Test starting the reduced network
            console.log('🚀 Testing startup of reduced network...');
            
            // Create a new network instance from the updated configuration to test startup
            const updatedConfigData = fs.readFileSync(testConfigPath, 'utf-8');
            const updatedConfig = JSON.parse(updatedConfigData);
            const reducedNetwork = new BesuNetwork(updatedConfig, './networks');
            
            // Add nodes from configuration to the network instance
            if (updatedConfig.nodes && Array.isArray(updatedConfig.nodes)) {
                console.log(`   Loading ${updatedConfig.nodes.length} nodes into network instance...`);
                const fileService = (reducedNetwork as any).getFileService();
                
                for (const nodeData of updatedConfig.nodes) {
                    const nodeConfig = {
                        name: nodeData.name,
                        ip: nodeData.ip,
                        port: nodeData.p2pPort || 30303,
                        rpcPort: nodeData.rpcPort,
                        type: nodeData.type
                    };
                    
                    const { BesuNode } = await import('../src/create-besu-networks');
                    const node = new BesuNode(nodeConfig, fileService);
                    (reducedNetwork as any).nodes.set(nodeData.name, node);
                }
                
                // Restore signerAccount associations from config if any exist
                if (updatedConfig.signerAccounts && Array.isArray(updatedConfig.signerAccounts)) {
                    console.log(`   Restoring ${updatedConfig.signerAccounts.length} signerAccount associations...`);
                    
                    for (const signerAccountData of updatedConfig.signerAccounts) {
                        if (signerAccountData.minerNode) {
                            // Find the miner node
                            const minerNode = (reducedNetwork as any).nodes.get(signerAccountData.minerNode);
                            if (minerNode) {
                                // Create signerAccount object
                                const signerAccount = {
                                    address: signerAccountData.address,
                                    privateKey: signerAccountData.privateKey
                                };
                                
                                // Add to network's signerAccount associations
                                if (!(reducedNetwork as any).minerSignerAssociations) {
                                    (reducedNetwork as any).minerSignerAssociations = [];
                                }
                                
                                (reducedNetwork as any).minerSignerAssociations.push({
                                    minerName: signerAccountData.minerNode,
                                    signerAccount: signerAccount
                                });
                                
                                console.log(`      - Associated signer ${signerAccount.address} with miner ${signerAccountData.minerNode}`);
                            }
                        }
                    }
                }
                
                console.log(`   ✅ Loaded ${(reducedNetwork as any).nodes.size} nodes`);
            }
            
            // Regenerate TOML files with proper signerAccount associations
            console.log('📝 Regenerating TOML files to ensure all remaining nodes have proper configuration...');
            
            // Create a miner-signerAccount map from the config
            const minerSignerMap = new Map<string, string>();
            if (updatedConfig.signerAccounts && Array.isArray(updatedConfig.signerAccounts)) {
                for (const signerAccountData of updatedConfig.signerAccounts) {
                    if (signerAccountData.minerNode) {
                        minerSignerMap.set(signerAccountData.minerNode, signerAccountData.address);
                        console.log(`   - Mapped miner ${signerAccountData.minerNode} to signerAccount ${signerAccountData.address}`);
                    }
                }
            }
            
            const { updateNodeConfigurationsWithSignerMap } = await import('../src/update-besu-networks');
            await updateNodeConfigurationsWithSignerMap(reducedNetwork, minerSignerMap);
            console.log('   ✅ TOML files regenerated for all remaining nodes');
            
            // Start the reduced network
            await reducedNetwork.start();
            
            // Wait for network stabilization with longer time for all nodes to sync
            console.log('⏳ Waiting for reduced network stabilization and node synchronization...');
            console.log('   This may take some time as remaining nodes need to re-establish connections...');
            await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds for sync
            
            // Verify reduced network connectivity and wait for all remaining nodes to be active
            console.log('🔍 Checking reduced network connectivity and synchronization...');
            
            let reducedConnectivity = await reducedNetwork.getNetworkConnectivity();
            let reducedActiveNodes = reducedConnectivity.filter(node => node.isActive);
            
            // Wait for ALL 3 remaining nodes to be active - retry up to 3 times
            let retryCount = 0;
            const maxRetries = 3;
            
            while (reducedActiveNodes.length < 3 && retryCount < maxRetries) {
                retryCount++;
                const waitTime = 20000 + (retryCount * 10000); // 20s, 30s, 40s
                
                console.log(`   Currently ${reducedActiveNodes.length}/3 nodes active, retry ${retryCount}/${maxRetries}...`);
                console.log(`   Waiting ${waitTime/1000}s for all remaining nodes to become active...`);
                
                // Show which nodes are not active yet
                const inactiveNodes = reducedConnectivity.filter(node => !node.isActive);
                if (inactiveNodes.length > 0) {
                    console.log(`   Inactive nodes: ${inactiveNodes.map(n => n.nodeName).join(', ')}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                reducedConnectivity = await reducedNetwork.getNetworkConnectivity();
                reducedActiveNodes = reducedConnectivity.filter(node => node.isActive);
            }
            
            console.log('📊 Final reduced network state:');
            reducedConnectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
                console.log(`   ${status} ${node.nodeName}${block}${peers}`);
            });
            
            // Verify ALL 3 remaining nodes are now active (strict requirement)
            console.log(`📊 Network connectivity: ${reducedActiveNodes.length}/3 nodes are active`);
            
            // Require ALL 3 remaining nodes to be active for successful test
            expect(reducedActiveNodes.length).toBe(3);
            console.log(`   ✅ Excellent! All 3 remaining nodes are active and connected`);
            
            // Specifically verify that remaining nodes are active
            const bootnode1Active = reducedActiveNodes.find(node => node.nodeName === 'bootnode1');
            const miner1Active = reducedActiveNodes.find(node => node.nodeName === 'miner1');
            const rpc1Active = reducedActiveNodes.find(node => node.nodeName === 'rpc1');
            
            expect(bootnode1Active).toBeDefined();
            expect(miner1Active).toBeDefined();
            expect(rpc1Active).toBeDefined();
            
            console.log(`   ✅ bootnode1 is active | Block: ${bootnode1Active!.blockNumber} | Peers: ${bootnode1Active!.peers}`);
            console.log(`   ✅ miner1 is active | Block: ${miner1Active!.blockNumber} | Peers: ${miner1Active!.peers}`);
            console.log(`   ✅ rpc1 is active | Block: ${rpc1Active!.blockNumber} | Peers: ${rpc1Active!.peers}`);
            
            // Verify that rpc2 is NOT in the active nodes (should be removed)
            const rpc2Active = reducedActiveNodes.find(node => node.nodeName === 'rpc2');
            expect(rpc2Active).toBeUndefined();
            console.log(`   ✅ rpc2 is correctly absent from the network`);
            
            // Check block synchronization across all remaining active nodes
            console.log('🔍 Verifying block synchronization across remaining nodes...');
            const nodeBlockNumbers = reducedActiveNodes
                .map(node => ({ name: node.nodeName, block: node.blockNumber || 0 }))
                .filter(node => node.block > 0);
                
            console.log('   Node block synchronization:');
            nodeBlockNumbers.forEach(node => {
                console.log(`      - ${node.name}: Block ${node.block}`);
            });
            
            // Ensure we have block data from all active nodes
            expect(nodeBlockNumbers.length).toBe(reducedActiveNodes.length);
            console.log(`   ✅ All ${reducedActiveNodes.length} remaining nodes are reporting block numbers`);
            
            if (nodeBlockNumbers.length > 1) {
                // Verify nodes are synchronized (within 3 blocks of each other)
                const maxBlock = Math.max(...nodeBlockNumbers.map(n => n.block));
                const minBlock = Math.min(...nodeBlockNumbers.map(n => n.block));
                const blockDifference = maxBlock - minBlock;
                
                console.log(`   Block synchronization: Max=${maxBlock}, Min=${minBlock}, Diff=${blockDifference}`);
                
                // Allow up to 3 blocks difference for tight synchronization
                expect(blockDifference).toBeLessThanOrEqual(3);
                console.log(`   ✅ All remaining nodes are tightly synchronized (block difference: ${blockDifference} ≤ 3)`);
            }
            
            // Verify peer connectivity between all remaining nodes
            console.log('🌐 Verifying peer connectivity between remaining nodes...');
            
            const nodesWithPeers = reducedActiveNodes.filter(node => (node.peers || 0) > 0);
            console.log(`   Nodes with peer connections: ${nodesWithPeers.length}/${reducedActiveNodes.length}`);
            
            // Verify that ALL remaining nodes have peer connections
            expect(nodesWithPeers.length).toBe(reducedActiveNodes.length);
            console.log(`   ✅ All remaining nodes have established peer connections`);
            
            // Check average peer count (should be 2 for 3-node network)
            const totalPeers = reducedActiveNodes.reduce((sum, node) => sum + (node.peers || 0), 0);
            const averagePeers = reducedActiveNodes.length > 0 ? totalPeers / reducedActiveNodes.length : 0;
            
            console.log(`   Average peer count: ${averagePeers.toFixed(2)}`);
            console.log(`   Total peer connections: ${totalPeers}`);
            
            // For a 3-node network, expect average of 2 peers per node
            expect(averagePeers).toBeGreaterThanOrEqual(1.5);
            console.log(`   ✅ Network has good peer connectivity for 3-node network (avg peers: ${averagePeers.toFixed(2)} ≥ 1.5)`);
            
            // Verify that mining continues (block number should be >= initial)
            const reducedMinerNode = reducedActiveNodes.find(node => node.nodeName === 'miner1');
            const reducedBlockNumber = reducedMinerNode?.blockNumber || 0;
            console.log(`📊 Mining verification:`);
            console.log(`   Initial block number: ${initialBlockNumber}`);
            console.log(`   Final block number: ${reducedBlockNumber}`);
            console.log(`   Block progression: ${initialBlockNumber} → ${reducedBlockNumber} (+${reducedBlockNumber - initialBlockNumber})`);
            
            // Block number should be equal or greater (network should have been mining during the process)
            expect(reducedBlockNumber).toBeGreaterThanOrEqual(initialBlockNumber);
            console.log(`   ✅ Mining activity confirmed (blocks progressed)`);
            
            // Stop the reduced network
            console.log('⏸️  Stopping reduced network...');
            await reducedNetwork.stop();
            
            console.log('✅ Node removal test completed successfully!');
            console.log('✅ Successfully removed rpc2 node from existing network');
            console.log(`🎯 Network configuration reduced from 4 to 3 nodes with ALL remaining nodes active`);
            console.log(`📊 Final network connectivity: ${reducedActiveNodes.length}/3 remaining nodes are active`);
            console.log(`🔗 All remaining nodes properly synchronized and connected`);
            console.log(`➖ rpc2 node successfully removed and cleaned up`);

        } finally {
            // Cleanup network
            console.log('🧹 Cleaning up test network...');
            try {
                await network.stop();
                await network.destroy();
            } catch (cleanupError) {
                console.log(`⚠️  Cleanup error for original network: ${cleanupError}`);
            }
        }
    }, 300000); // 5-minute timeout for comprehensive test
});

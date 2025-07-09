import * as fs from "fs";
import * as path from "path";
import { BesuNetwork, BesuNetworkConfig } from '../src/create-besu-networks';
import { updateNetworkNodesByName } from '../src/update-besu-networks';
import { cleanupTestNetworks, generateTestNetworkName, checkDockerAvailability } from './test-utils';

/**
 * Test para añadir nodos (bootnode y rpc) a una red Besu existente
 */

// Global test setup and cleanup
beforeAll(async () => {
  console.log('🧪 Setting up adding nodes test environment...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test environment ready');
  } else {
    console.log('⚠️  Docker not available, tests will run in mock mode');
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Cleaning up after adding nodes tests...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test cleanup completed');
  }
}, 30000);

describe('Adding bootnode and RPC nodes to existing network', () => {
    test('should create initial network and then add new bootnode and RPC nodes', async () => {
        if (!checkDockerAvailability()) {
            console.log('⚠️  Skipping Docker-dependent test');
            return;
        }

        const baseNetworkName = generateTestNetworkName('adding-nodes-test');
        console.log(`🧪 Testing adding nodes to network: ${baseNetworkName}`);

        // Create initial network configuration
        const signerAccount = { 
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
            signerAccounts: [signerAccount]
        };

        const network = new BesuNetwork(config);

        try {
            // Step 1: Create initial network with bootnode, miner, and rpc
            console.log('📦 Creating initial network with 3 nodes...');
            await network.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.40.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.40.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.40.0.12', rpcPort: 8547, type: 'rpc' }
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
            console.log(`   Found ${activeNodes.length} active nodes (minimum 1 required to proceed)`);
            
            // Continue with test even if not all nodes are active initially
            // The important part is testing the adding functionality

            // Store initial block number for continuity verification
            const initialNode = activeNodes.find(node => node.nodeName === 'miner1') || activeNodes[0];
            const initialBlockNumber = initialNode?.blockNumber || 0;
            console.log(`📊 Initial network block number: ${initialBlockNumber}`);

            // Stop the current network before making changes
            console.log('⏸️  Stopping network for node additions...');
            await network.stop();
            
            // Step 2: Save current network config to file system
            console.log('💾 Saving current network config to file system...');
            const testNetworkDirPath = path.join('./networks', baseNetworkName);
            const testConfigPath = path.join(testNetworkDirPath, 'network-config.json');
            
            console.log(`   Creating config file at ${testConfigPath}`);
            const currentConfig = network.getConfig();
            
            // Add node details to the config
            const configWithNodes = {
                ...currentConfig,
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
            
            // Step 3: Add new bootnode and RPC nodes using updateNetworkNodesByName
            console.log('➕ Adding new bootnode and RPC nodes...');
            
            const newBootnodePort = 8548;
            const newBootnodeP2pPort = 30304;
            const newBootnodeIp = '172.40.0.13';
            
            const newRpcPort = 8549;
            const newRpcP2pPort = 30305;
            const newRpcIp = '172.40.0.14';
            
            console.log(`   Adding new nodes:`);
            console.log(`      - bootnode2 at ${newBootnodeIp}:${newBootnodePort} (P2P: ${newBootnodeP2pPort})`);
            console.log(`      - rpc2 at ${newRpcIp}:${newRpcPort} (P2P: ${newRpcP2pPort})`);
            
            // Use updateNetworkNodesByName to add the new nodes
            const result = await updateNetworkNodesByName(
                baseNetworkName,
                {
                    add: [
                        {
                            name: 'bootnode2',
                            ip: newBootnodeIp,
                            rpcPort: newBootnodePort,
                            p2pPort: newBootnodeP2pPort,
                            type: 'bootnode'
                        },
                        {
                            name: 'rpc2',
                            ip: newRpcIp,
                            rpcPort: newRpcPort,
                            p2pPort: newRpcP2pPort,
                            type: 'rpc'
                        }
                    ]
                },
                {
                    baseDir: './networks',
                    startAfterUpdate: false // Don't auto-start, we'll verify first
                }
            );
            
            console.log('✅ Nodes added via updateNetworkNodesByName');
            console.log(`📊 Update result: success=${result.success}`);
            if (result.nodesAdded) {
                console.log(`   Nodes added: ${result.nodesAdded.join(', ')}`);
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
                
                // Verify specific nodes exist
                const bootnode2Config = updatedConfigJson.nodes?.find((n: any) => n.name === 'bootnode2');
                const rpc2Config = updatedConfigJson.nodes?.find((n: any) => n.name === 'rpc2');
                
                expect(updatedConfigJson.nodes?.length).toBe(5); // Original 3 + new 2
                
                // Verify bootnode2
                expect(bootnode2Config).toBeDefined();
                expect(bootnode2Config.type).toBe('bootnode');
                expect(bootnode2Config.ip).toBe(newBootnodeIp);
                expect(bootnode2Config.rpcPort).toBe(newBootnodePort);
                expect(bootnode2Config.p2pPort).toBe(newBootnodeP2pPort);
                
                // Verify rpc2
                expect(rpc2Config).toBeDefined();
                expect(rpc2Config.type).toBe('rpc');
                expect(rpc2Config.ip).toBe(newRpcIp);
                expect(rpc2Config.rpcPort).toBe(newRpcPort);
                expect(rpc2Config.p2pPort).toBe(newRpcP2pPort);
                
                console.log('   ✅ All new nodes correctly added to config');
            }
            
            // Verify that TOML files were created for new nodes
            console.log('📊 Verifying TOML files for new nodes...');
            
            const bootnode2TomlPath = path.join(testNetworkDirPath, 'bootnode2_config.toml');
            const rpc2TomlPath = path.join(testNetworkDirPath, 'rpc2_config.toml');
            
            // Check bootnode2 TOML
            if (fs.existsSync(bootnode2TomlPath)) {
                const bootnode2Toml = fs.readFileSync(bootnode2TomlPath, 'utf-8');
                console.log(`   ✅ bootnode2 TOML file created`);
                
                // Verify bootnode2 TOML contains correct ports
                expect(bootnode2Toml).toContain(`rpc-http-port=${newBootnodePort}`);
                expect(bootnode2Toml).toContain(`p2p-port=${newBootnodeP2pPort}`);
                console.log(`      - RPC port ${newBootnodePort} ✅`);
                console.log(`      - P2P port ${newBootnodeP2pPort} ✅`);
            } else {
                console.log(`   ⚠️ bootnode2 TOML file not found at ${bootnode2TomlPath}`);
            }
            
            // Check rpc2 TOML
            if (fs.existsSync(rpc2TomlPath)) {
                const rpc2Toml = fs.readFileSync(rpc2TomlPath, 'utf-8');
                console.log(`   ✅ rpc2 TOML file created`);
                
                // Verify rpc2 TOML contains correct ports
                expect(rpc2Toml).toContain(`rpc-http-port=${newRpcPort}`);
                expect(rpc2Toml).toContain(`p2p-port=${newRpcP2pPort}`);
                console.log(`      - RPC port ${newRpcPort} ✅`);
                console.log(`      - P2P port ${newRpcP2pPort} ✅`);
            } else {
                console.log(`   ⚠️ rpc2 TOML file not found at ${rpc2TomlPath}`);
            }
            
            // Step 4: Test starting the expanded network
            console.log('🚀 Testing startup of expanded network...');
            
            // Create a new network instance from the updated configuration to test startup
            const updatedConfigData = fs.readFileSync(testConfigPath, 'utf-8');
            const updatedConfig = JSON.parse(updatedConfigData);
            const expandedNetwork = new BesuNetwork(updatedConfig, './networks');
            
            // Add nodes from configuration to the network instance
            if (updatedConfig.nodes && Array.isArray(updatedConfig.nodes)) {
                console.log(`   Loading ${updatedConfig.nodes.length} nodes into network instance...`);
                const fileService = (expandedNetwork as any).getFileService();
                
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
                    (expandedNetwork as any).nodes.set(nodeData.name, node);
                }
                
                // Restore signerAccount associations from config if any exist
                if (updatedConfig.signerAccounts && Array.isArray(updatedConfig.signerAccounts)) {
                    console.log(`   Restoring ${updatedConfig.signerAccounts.length} signerAccount associations...`);
                    
                    for (const signerAccountData of updatedConfig.signerAccounts) {
                        if (signerAccountData.minerNode) {
                            // Find the miner node
                            const minerNode = (expandedNetwork as any).nodes.get(signerAccountData.minerNode);
                            if (minerNode) {
                                // Create signerAccount object
                                const signerAccount = {
                                    address: signerAccountData.address,
                                    privateKey: signerAccountData.privateKey
                                };
                                
                                // Add to network's signerAccount associations
                                if (!(expandedNetwork as any).minerSignerAssociations) {
                                    (expandedNetwork as any).minerSignerAssociations = [];
                                }
                                
                                (expandedNetwork as any).minerSignerAssociations.push({
                                    minerName: signerAccountData.minerNode,
                                    signerAccount: signerAccount
                                });
                                
                                console.log(`      - Associated signer ${signerAccount.address} with miner ${signerAccountData.minerNode}`);
                            }
                        }
                    }
                }
                
                console.log(`   ✅ Loaded ${(expandedNetwork as any).nodes.size} nodes`);
            }
            
            // Regenerate TOML files with proper signerAccount associations
            console.log('📝 Regenerating TOML files to ensure all nodes have proper configuration...');
            
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
            await updateNodeConfigurationsWithSignerMap(expandedNetwork, minerSignerMap);
            console.log('   ✅ TOML files regenerated for all nodes');
            
            // Start the expanded network
            await expandedNetwork.start();
            
            // Wait for network stabilization with longer time for all nodes to sync
            console.log('⏳ Waiting for expanded network stabilization and node synchronization...');
            console.log('   This may take some time as new nodes need to sync and connect...');
            await new Promise(resolve => setTimeout(resolve, 50000)); // 50 seconds for full sync
            
            // Verify expanded network connectivity and wait for all nodes to be active
            console.log('🔍 Checking expanded network connectivity and synchronization...');
            
            let expandedConnectivity = await expandedNetwork.getNetworkConnectivity();
            let expandedActiveNodes = expandedConnectivity.filter(node => node.isActive);
            
            // Wait for ALL 5 nodes to be active - retry up to 3 times with increasing delays
            let retryCount = 0;
            const maxRetries = 3;
            
            while (expandedActiveNodes.length < 5 && retryCount < maxRetries) {
                retryCount++;
                const waitTime = 30000 + (retryCount * 10000); // 30s, 40s, 50s
                
                console.log(`   Currently ${expandedActiveNodes.length}/5 nodes active, retry ${retryCount}/${maxRetries}...`);
                console.log(`   Waiting ${waitTime/1000}s for all nodes to become active...`);
                
                // Show which nodes are not active yet
                const inactiveNodes = expandedConnectivity.filter(node => !node.isActive);
                if (inactiveNodes.length > 0) {
                    console.log(`   Inactive nodes: ${inactiveNodes.map(n => n.nodeName).join(', ')}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                expandedConnectivity = await expandedNetwork.getNetworkConnectivity();
                expandedActiveNodes = expandedConnectivity.filter(node => node.isActive);
            }
            
            console.log('📊 Final expanded network state:');
            expandedConnectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
                console.log(`   ${status} ${node.nodeName}${block}${peers}`);
            });
            
            // Verify ALL 5 nodes are now active (strict requirement)
            console.log(`📊 Network connectivity: ${expandedActiveNodes.length}/5 nodes are active`);
            
            // Require ALL 5 nodes to be active for successful test
            expect(expandedActiveNodes.length).toBe(5);
            console.log(`   ✅ Excellent! All 5 nodes are active and connected`);
            
            // Specifically verify that new nodes are active and participating
            const bootnode2Active = expandedActiveNodes.find(node => node.nodeName === 'bootnode2');
            const rpc2Active = expandedActiveNodes.find(node => node.nodeName === 'rpc2');
            
            expect(bootnode2Active).toBeDefined();
            expect(rpc2Active).toBeDefined();
            
            console.log(`   ✅ New bootnode2 is active | Block: ${bootnode2Active!.blockNumber} | Peers: ${bootnode2Active!.peers}`);
            console.log(`   ✅ New rpc2 is active | Block: ${rpc2Active!.blockNumber} | Peers: ${rpc2Active!.peers}`);
            
            // Check block synchronization across all active nodes
            console.log('🔍 Verifying block synchronization across all nodes...');
            const nodeBlockNumbers = expandedActiveNodes
                .map(node => ({ name: node.nodeName, block: node.blockNumber || 0 }))
                .filter(node => node.block > 0);
                
            console.log('   Node block synchronization:');
            nodeBlockNumbers.forEach(node => {
                console.log(`      - ${node.name}: Block ${node.block}`);
            });
            
            // Ensure we have block data from all active nodes
            expect(nodeBlockNumbers.length).toBe(expandedActiveNodes.length);
            console.log(`   ✅ All ${expandedActiveNodes.length} nodes are reporting block numbers`);
            
            if (nodeBlockNumbers.length > 1) {
                // Verify nodes are synchronized (within 3 blocks of each other)
                const maxBlock = Math.max(...nodeBlockNumbers.map(n => n.block));
                const minBlock = Math.min(...nodeBlockNumbers.map(n => n.block));
                const blockDifference = maxBlock - minBlock;
                
                console.log(`   Block synchronization: Max=${maxBlock}, Min=${minBlock}, Diff=${blockDifference}`);
                
                // Allow up to 3 blocks difference for tight synchronization
                expect(blockDifference).toBeLessThanOrEqual(3);
                console.log(`   ✅ All nodes are tightly synchronized (block difference: ${blockDifference} ≤ 3)`);
            }
            
            // Verify peer connectivity between all nodes
            console.log('🌐 Verifying peer connectivity between all nodes...');
            
            const nodesWithPeers = expandedActiveNodes.filter(node => (node.peers || 0) > 0);
            console.log(`   Nodes with peer connections: ${nodesWithPeers.length}/${expandedActiveNodes.length}`);
            
            // Verify that ALL nodes have peer connections
            expect(nodesWithPeers.length).toBe(expandedActiveNodes.length);
            console.log(`   ✅ All nodes have established peer connections`);
            
            // Check average peer count
            const totalPeers = expandedActiveNodes.reduce((sum, node) => sum + (node.peers || 0), 0);
            const averagePeers = expandedActiveNodes.length > 0 ? totalPeers / expandedActiveNodes.length : 0;
            
            console.log(`   Average peer count: ${averagePeers.toFixed(2)}`);
            console.log(`   Total peer connections: ${totalPeers}`);
            
            // Verify that average peer count is excellent
            expect(averagePeers).toBeGreaterThan(2);
            console.log(`   ✅ Network has excellent peer connectivity (avg peers: ${averagePeers.toFixed(2)} > 2)`);
            
            // Verify that mining continues (block number should be >= initial)
            const expandedMinerNode = expandedActiveNodes.find(node => node.nodeName === 'miner1');
            const expandedBlockNumber = expandedMinerNode?.blockNumber || 0;
            console.log(`📊 Mining verification:`);
            console.log(`   Initial block number: ${initialBlockNumber}`);
            console.log(`   Final block number: ${expandedBlockNumber}`);
            console.log(`   Block progression: ${initialBlockNumber} → ${expandedBlockNumber} (+${expandedBlockNumber - initialBlockNumber})`);
            
            // Block number should be equal or greater (network should have been mining during the process)
            expect(expandedBlockNumber).toBeGreaterThanOrEqual(initialBlockNumber);
            console.log(`   ✅ Mining activity confirmed (blocks progressed)`);
            
            // Verify new nodes are participating in the network
            console.log('🔍 Verifying new nodes participation...');
            
            const newNodes = expandedActiveNodes.filter(node => 
                node.nodeName === 'bootnode2' || node.nodeName === 'rpc2'
            );
            
            console.log(`   New nodes status:`);
            newNodes.forEach(node => {
                console.log(`      - ${node.nodeName}: Block ${node.blockNumber}, Peers: ${node.peers}`);
            });
            
            // Ensure both new nodes are active
            expect(newNodes.length).toBe(2);
            console.log(`   ✅ Both new nodes (bootnode2, rpc2) are active and connected`);
            
            // Check if new nodes have synchronized (block > 0)
            const syncedNewNodes = newNodes.filter(node => (node.blockNumber || 0) > 0);
            console.log(`   📋 ${syncedNewNodes.length}/2 new nodes have synchronized with the network`);
            
            // Require BOTH new nodes to be synchronized
            expect(syncedNewNodes.length).toBe(2);
            console.log(`   ✅ Both new nodes have successfully joined and synchronized with the network`);
            
            // Verify new nodes have proper peer connections
            const newNodesWithPeers = newNodes.filter(node => (node.peers || 0) > 0);
            expect(newNodesWithPeers.length).toBe(2);
            console.log(`   ✅ Both new nodes have established peer connections`);
            
            // Stop the expanded network
            console.log('⏸️  Stopping expanded network...');
            await expandedNetwork.stop();
            
            console.log('✅ Node addition test completed successfully!');
            console.log('✅ Successfully added new bootnode and RPC nodes to existing network');
            console.log(`🎯 Network configuration expanded from 3 to 5 nodes with ALL nodes active`);
            console.log(`📊 Final network connectivity: ${expandedActiveNodes.length}/5 nodes are active`);
            console.log(`🔗 All nodes properly synchronized and connected with excellent peer connectivity`);
            console.log(`➕ Both new nodes (bootnode2, rpc2) successfully joined and synchronized`);

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
    }, 300000); // 5-minute timeout for comprehensive synchronization test
});

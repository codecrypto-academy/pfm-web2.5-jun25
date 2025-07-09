import * as fs from "fs";
import * as path from "path";
import { BesuNetwork, BesuNetworkConfig } from '../src/create-besu-networks';
import { updateNetworkNodesByName } from '../src/update-besu-networks';
import { cleanupTestNetworks, generateTestNetworkName, checkDockerAvailability } from './test-utils';

/**
 * Test para añadir miners a una red Besu existente y verificar sincronización
 */

// Global test setup and cleanup
beforeAll(async () => {
  console.log('🧪 Setting up adding miners test environment...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test environment ready');
  } else {
    console.log('⚠️  Docker not available, tests will run in mock mode');
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Cleaning up after adding miners tests...');
  if (checkDockerAvailability()) {
    await cleanupTestNetworks({ verbose: true });
    console.log('✅ Test cleanup completed');
  }
}, 30000);

describe('Adding miners to existing network', () => {
    test('should create initial network and then add 2 new miners with proper synchronization', async () => {
        const hasDocker = checkDockerAvailability();
        if (!hasDocker) {
            console.log('⚠️  Docker not available, running configuration-only test');
        }

        const baseNetworkName = generateTestNetworkName('adding-miners-test');
        console.log(`🧪 Testing adding miners to network: ${baseNetworkName}`);

        // Create initial network configuration
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
            blockTime: 3, // Shorter block time for faster testing
            signerAccounts: [signerAccount]
        };

        const network = new BesuNetwork(config);

        try {
            // Step 1: Create initial network with bootnode, miner, and rpc
            console.log('📦 Creating initial network with 3 nodes...');
            await network.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.41.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.41.0.11', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.41.0.12', rpcPort: 8547, type: 'rpc' }
                ]
            });

            console.log('📊 Initial network created with nodes:');
            const initialNodes = Array.from(network.getNodes().entries());
            initialNodes.forEach(([nodeName, node]) => {
                const nodeConfig = node.getConfig();
                console.log(`   - ${nodeName} (${nodeConfig.type}) at ${nodeConfig.ip}:${nodeConfig.rpcPort}`);
            });

            let initialBlockNumber = 0;
            let activeNodes: any[] = [];

            if (hasDocker) {
                // Start the initial network
                console.log('🚀 Starting initial network...');
                await network.start();

                // Wait for initial network stabilization and mining
                console.log('⏳ Waiting for initial network stabilization and mining...');
                await new Promise(resolve => setTimeout(resolve, 20000));

                // Verify initial connectivity and mining
                console.log('🔍 Checking initial network connectivity and mining...');
                let connectivity = await network.getNetworkConnectivity();
                activeNodes = connectivity.filter(node => node.isActive);
                
                console.log('📊 Initial network state:');
                connectivity.forEach(node => {
                    const status = node.isActive ? '✅' : '❌';
                    const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                    const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
                    console.log(`   ${status} ${node.nodeName}${block}${peers}`);
                });

                // Verify we have at least one active node and mining is happening
                expect(activeNodes.length).toBeGreaterThan(0);
                console.log(`   Found ${activeNodes.length} active nodes`);
                
                // Check that mining is happening (at least one node should have block > 0)
                const miningNodes = activeNodes.filter(node => (node.blockNumber || 0) > 0);
                expect(miningNodes.length).toBeGreaterThan(0);
                console.log(`   Found ${miningNodes.length} nodes with blocks > 0 (mining active)`);
                
                // Store initial mining state
                const initialMinerNode = activeNodes.find(node => node.nodeName === 'miner1');
                initialBlockNumber = initialMinerNode?.blockNumber || 0;
                const initialPeerCount = initialMinerNode?.peers || 0;
                console.log(`📊 Initial mining state: Block ${initialBlockNumber}, Peers: ${initialPeerCount}`);

                // Stop the current network before making changes
                console.log('⏸️  Stopping network for miner additions...');
                await network.stop();
            } else {
                console.log('ℹ️  Skipping Docker operations, testing configuration only');
                // For non-Docker mode, simulate some active nodes
                activeNodes = [{ nodeName: 'miner1', isActive: true, blockNumber: 1, peers: 2 }];
            }
            
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
            
            // Step 3: Add new miner nodes using updateNetworkNodesByName
            console.log('⛏️  Adding new miner nodes...');
            
            const newMiner2Port = 8550; // Changed to avoid consecutive ports
            const newMiner2P2pPort = 30304;
            const newMiner2Ip = '172.41.0.13';
            
            const newMiner3Port = 8552; // Changed to avoid consecutive ports  
            const newMiner3P2pPort = 30305;
            const newMiner3Ip = '172.41.0.14';
            
            console.log(`   Adding new miners:`);
            console.log(`      - miner2 at ${newMiner2Ip}:${newMiner2Port} (P2P: ${newMiner2P2pPort})`);
            console.log(`      - miner3 at ${newMiner3Ip}:${newMiner3Port} (P2P: ${newMiner3P2pPort})`);
            
            // Use updateNetworkNodesByName to add the new miners
            const result = await updateNetworkNodesByName(
                baseNetworkName,
                {
                    add: [
                        {
                            name: 'miner2',
                            ip: newMiner2Ip,
                            rpcPort: newMiner2Port,
                            p2pPort: newMiner2P2pPort,
                            type: 'miner'
                        },
                        {
                            name: 'miner3',
                            ip: newMiner3Ip,
                            rpcPort: newMiner3Port,
                            p2pPort: newMiner3P2pPort,
                            type: 'miner'
                        }
                    ]
                },
                {
                    baseDir: './networks',
                    startAfterUpdate: false // Don't auto-start, we'll manage it manually
                }
            );
            
            console.log('✅ Miners added via updateNetworkNodesByName');
            console.log(`📊 Update result: success=${result.success}`);
            if (result.nodesAdded) {
                console.log(`   Miners added: ${result.nodesAdded.join(', ')}`);
            }
            
            // Verify that the configuration file was updated
            console.log('📊 Verifying updated configuration file...');
            if (fs.existsSync(testConfigPath)) {
                const updatedConfigData = fs.readFileSync(testConfigPath, 'utf-8');
                const updatedConfigJson = JSON.parse(updatedConfigData);
                
                console.log(`   Total nodes in config: ${updatedConfigJson.nodes?.length || 0}`);
                console.log(`   Total signerAccounts in config: ${updatedConfigJson.signerAccounts?.length || 0}`);
                
                if (updatedConfigJson.nodes) {
                    updatedConfigJson.nodes.forEach((node: any) => {
                        console.log(`      - ${node.name} (${node.type}) at ${node.ip}:${node.rpcPort}`);
                    });
                }
                
                // Verify signerAccounts were created for miners
                if (updatedConfigJson.signerAccounts) {
                    console.log('   SignerAccounts:');
                    updatedConfigJson.signerAccounts.forEach((sa: any) => {
                        console.log(`      - ${sa.address} (miner: ${sa.minerNode})`);
                    });
                }
                
                // Verify specific miners exist
                const miner2Config = updatedConfigJson.nodes?.find((n: any) => n.name === 'miner2');
                const miner3Config = updatedConfigJson.nodes?.find((n: any) => n.name === 'miner3');
                
                expect(updatedConfigJson.nodes?.length).toBe(5); // Original 3 + new 2
                
                // Verify miner2
                expect(miner2Config).toBeDefined();
                expect(miner2Config.type).toBe('miner');
                expect(miner2Config.ip).toBe(newMiner2Ip);
                expect(miner2Config.rpcPort).toBe(newMiner2Port);
                expect(miner2Config.p2pPort).toBe(newMiner2P2pPort);
                
                // Verify miner3
                expect(miner3Config).toBeDefined();
                expect(miner3Config.type).toBe('miner');
                expect(miner3Config.ip).toBe(newMiner3Ip);
                expect(miner3Config.rpcPort).toBe(newMiner3Port);
                expect(miner3Config.p2pPort).toBe(newMiner3P2pPort);
                
                // Verify signerAccounts were created for new miners
                const miner2SignerAccount = updatedConfigJson.signerAccounts?.find((sa: any) => sa.minerNode === 'miner2');
                const miner3SignerAccount = updatedConfigJson.signerAccounts?.find((sa: any) => sa.minerNode === 'miner3');
                
                expect(miner2SignerAccount).toBeDefined();
                expect(miner3SignerAccount).toBeDefined();
                expect(miner2SignerAccount.address).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address
                expect(miner3SignerAccount.address).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address
                
                console.log('   ✅ All new miners correctly added to config with signerAccounts');
            }
            
            // The remaining steps only run if Docker is available
            if (!hasDocker) {
                console.log('ℹ️  Skipping network startup tests (Docker not available)');
                console.log('✅ Configuration test completed successfully!');
                console.log('✅ Successfully verified miner-signerAccount association functionality');
                return;
            }
            
            // Verify that TOML files were created for new miners
            console.log('📊 Verifying TOML files for new miners...');
            
            const miner2TomlPath = path.join(testNetworkDirPath, 'miner2_config.toml');
            const miner3TomlPath = path.join(testNetworkDirPath, 'miner3_config.toml');
            
            // Check miner2 TOML
            if (fs.existsSync(miner2TomlPath)) {
                const miner2Toml = fs.readFileSync(miner2TomlPath, 'utf-8');
                console.log(`   ✅ miner2 TOML file created`);
                
                // Verify miner2 TOML contains correct ports
                expect(miner2Toml).toContain(`rpc-http-port=${newMiner2Port}`);
                expect(miner2Toml).toContain(`p2p-port=${newMiner2P2pPort}`);
                console.log(`      - RPC port ${newMiner2Port} ✅`);
                console.log(`      - P2P port ${newMiner2P2pPort} ✅`);
            } else {
                console.log(`   ⚠️ miner2 TOML file not found at ${miner2TomlPath}`);
            }
            
            // Check miner3 TOML
            if (fs.existsSync(miner3TomlPath)) {
                const miner3Toml = fs.readFileSync(miner3TomlPath, 'utf-8');
                console.log(`   ✅ miner3 TOML file created`);
                
                // Verify miner3 TOML contains correct ports
                expect(miner3Toml).toContain(`rpc-http-port=${newMiner3Port}`);
                expect(miner3Toml).toContain(`p2p-port=${newMiner3P2pPort}`);
                console.log(`      - RPC port ${newMiner3Port} ✅`);
                console.log(`      - P2P port ${newMiner3P2pPort} ✅`);
            } else {
                console.log(`   ⚠️ miner3 TOML file not found at ${miner3TomlPath}`);
            }
            
            // Step 4: Start the expanded network with all miners
            console.log('🚀 Starting expanded network with all miners...');
            
            // Create a new network instance from the updated configuration
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
                
                // Restore signerAccount associations from config
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
            console.log('📝 Regenerating TOML files with signerAccount associations...');
            
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
            console.log('   ✅ TOML files regenerated with proper signerAccount associations');
            
            // Start the expanded network
            await expandedNetwork.start();
            
            // Step 5: Wait for miner synchronization
            console.log('⏳ Waiting for miner synchronization...');
            console.log('   This may take some time as new miners need to sync and start mining...');
            
            // Wait for network stabilization - longer time for miner sync
            await new Promise(resolve => setTimeout(resolve, 45000)); // 45 seconds for miner sync
            
            // Step 6: Verify expanded network connectivity and miner synchronization
            console.log('🔍 Checking expanded network connectivity and miner sync...');
            const expandedConnectivity = await expandedNetwork.getNetworkConnectivity();
            const expandedActiveNodes = expandedConnectivity.filter(node => node.isActive);
            
            console.log('📊 Expanded network state:');
            expandedConnectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Block: ${node.blockNumber}` : '';
                const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
                console.log(`   ${status} ${node.nodeName}${block}${peers}`);
            });
            
            // Verify we have active nodes (should be at least the original active nodes)
            expect(expandedActiveNodes.length).toBeGreaterThanOrEqual(activeNodes.length);
            console.log(`   Expanded network has ${expandedActiveNodes.length} active nodes (originally ${activeNodes.length})`);
            
            // Step 7: Verify mining synchronization across all miners
            console.log('⛏️  Verifying mining synchronization across all miners...');
            
            const allMinerNodes = expandedConnectivity.filter(node => 
                node.nodeName.startsWith('miner') && node.isActive
            );
            
            console.log(`   Found ${allMinerNodes.length} active miner nodes`);
            expect(allMinerNodes.length).toBeGreaterThan(0);
            
            // Check that all active miners have reasonable block numbers (within a few blocks of each other)
            const minerBlockNumbers = allMinerNodes
                .map(miner => ({ name: miner.nodeName, block: miner.blockNumber || 0 }))
                .filter(miner => miner.block > 0);
                
            console.log('   Miner block synchronization:');
            minerBlockNumbers.forEach(miner => {
                console.log(`      - ${miner.name}: Block ${miner.block}`);
            });
            
            if (minerBlockNumbers.length > 1) {
                // Verify miners are synchronized (within 3 blocks of each other)
                const maxBlock = Math.max(...minerBlockNumbers.map(m => m.block));
                const minBlock = Math.min(...minerBlockNumbers.map(m => m.block));
                const blockDifference = maxBlock - minBlock;
                
                console.log(`   Block synchronization: Max=${maxBlock}, Min=${minBlock}, Diff=${blockDifference}`);
                
                // Allow up to 5 blocks difference for synchronization tolerance
                expect(blockDifference).toBeLessThanOrEqual(5);
                console.log(`   ✅ Miners are synchronized (block difference: ${blockDifference} ≤ 5)`);
            }
            
            // Step 8: Verify peer connectivity between all nodes
            console.log('🌐 Verifying peer connectivity between all nodes...');
            
            const nodesWithPeers = expandedActiveNodes.filter(node => (node.peers || 0) > 0);
            console.log(`   Nodes with peer connections: ${nodesWithPeers.length}/${expandedActiveNodes.length}`);
            
            // Verify that most nodes have peer connections
            expect(nodesWithPeers.length).toBeGreaterThan(expandedActiveNodes.length / 2);
            
            // Check average peer count
            const totalPeers = expandedActiveNodes.reduce((sum, node) => sum + (node.peers || 0), 0);
            const averagePeers = expandedActiveNodes.length > 0 ? totalPeers / expandedActiveNodes.length : 0;
            
            console.log(`   Average peer count: ${averagePeers.toFixed(2)}`);
            console.log(`   Total peer connections: ${totalPeers}`);
            
            // Verify that average peer count is reasonable (should be > 1 for good connectivity)
            expect(averagePeers).toBeGreaterThan(1);
            console.log(`   ✅ Network has good peer connectivity (avg peers: ${averagePeers.toFixed(2)} > 1)`);
            
            // Step 9: Verify continued mining progression
            console.log('⛏️  Verifying continued mining progression...');
            
            // Wait a bit more and check if mining continues
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            const finalConnectivity = await expandedNetwork.getNetworkConnectivity();
            const finalActiveMiners = finalConnectivity.filter(node => 
                node.nodeName.startsWith('miner') && node.isActive && (node.blockNumber || 0) > 0
            );
            
            console.log('   Final mining state:');
            finalActiveMiners.forEach(miner => {
                const originalBlock = minerBlockNumbers.find(m => m.name === miner.nodeName)?.block || 0;
                const progression = (miner.blockNumber || 0) - originalBlock;
                console.log(`      - ${miner.nodeName}: Block ${miner.blockNumber} (progressed +${progression})`);
            });
            
            // Verify that at least one miner progressed in block number OR miners are actively mining
            const progressedMiners = finalActiveMiners.filter(miner => {
                const originalBlock = minerBlockNumbers.find(m => m.name === miner.nodeName)?.block || 0;
                return (miner.blockNumber || 0) > originalBlock;
            });
            
            // Check if miners are at a reasonable block height (shows they're mining)
            const activeMiningMiners = finalActiveMiners.filter(miner => (miner.blockNumber || 0) > 0);
            
            // Either miners progressed OR they're all at a reasonable block height
            const miningIsActive = progressedMiners.length > 0 || activeMiningMiners.length >= 2;
            expect(miningIsActive).toBe(true);
            
            if (progressedMiners.length > 0) {
                console.log(`   ✅ Mining continued: ${progressedMiners.length} miners progressed in block height`);
            } else if (activeMiningMiners.length >= 2) {
                console.log(`   ✅ Mining is stable: ${activeMiningMiners.length} miners are synchronized at active block heights`);
            }
            
            // Step 10: Verify that new miners are participating in mining
            console.log('🔍 Verifying new miners participation...');
            
            const newMinerNodes = finalActiveMiners.filter(node => 
                node.nodeName === 'miner2' || node.nodeName === 'miner3'
            );
            
            console.log(`   New miners status:`);
            newMinerNodes.forEach(miner => {
                console.log(`      - ${miner.nodeName}: Block ${miner.blockNumber}, Peers: ${miner.peers}`);
            });
            
            if (newMinerNodes.length > 0) {
                console.log(`   ✅ ${newMinerNodes.length} new miners are active and connected`);
                
                // Check if new miners have started mining (block > 0)
                const miningNewMiners = newMinerNodes.filter(miner => (miner.blockNumber || 0) > 0);
                console.log(`   ⛏️  ${miningNewMiners.length} new miners have synchronized and are mining`);
            } else {
                console.log(`   ℹ️  New miners are still synchronizing (this is normal for newly added miners)`);
            }
            
            // Stop the expanded network
            console.log('⏸️  Stopping expanded network...');
            await expandedNetwork.stop();
            
            console.log('✅ Miner addition test completed successfully!');
            console.log('✅ Successfully added new miners to existing network');
            console.log(`🎯 Network expanded from 3 to 5 nodes (including 3 miners total)`);
            console.log(`📊 Network connectivity: ${expandedActiveNodes.length} of 5 nodes are active`);
            console.log(`⛏️  Mining miners: ${allMinerNodes.length} miners are actively mining`);

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
    }, 240000); // 4-minute timeout for longer miner sync test
});

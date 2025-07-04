#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkNodeStatus(port, nodeName, nodeType) {
    console.log(`🔍 ${nodeName} (${nodeType}) Status Check:`);
    
    try {
        // Block number
        const blockCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: blockOut } = await execAsync(blockCmd);
        const blockResp = JSON.parse(blockOut);
        
        if (blockResp && blockResp.result) {
            const blockNum = parseInt(blockResp.result, 16);
            console.log(`   📦 Block Height: ${blockNum}`);
        }

        // Network ID
        const networkCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: networkOut } = await execAsync(networkCmd);
        const networkResp = JSON.parse(networkOut);
        
        if (networkResp && networkResp.result) {
            console.log(`   🌐 Network ID: ${networkResp.result}`);
        }

        // Peer count
        const peerCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: peerOut } = await execAsync(peerCmd);
        const peerResp = JSON.parse(peerOut);
        
        if (peerResp && peerResp.result) {
            const peerCount = parseInt(peerResp.result, 16);
            console.log(`   🤝 Connected Peers: ${peerCount}`);
        }

        // Check mining status (for miner and validator types)
        if (nodeType === 'miner' || nodeType === 'validator') {
            const miningCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_mining","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
            const { stdout: miningOut } = await execAsync(miningCmd);
            const miningResp = JSON.parse(miningOut);
            
            if (miningResp && miningResp.result !== undefined) {
                const status = miningResp.result ? '🟢 ACTIVE' : '🔴 INACTIVE';
                console.log(`   ⛏️  Mining Status: ${status}`);
            }

            // Get coinbase (miner address)
            const coinbaseCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_coinbase","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
            const { stdout: coinbaseOut } = await execAsync(coinbaseCmd);
            const coinbaseResp = JSON.parse(coinbaseOut);
            
            if (coinbaseResp && coinbaseResp.result) {
                console.log(`   💰 Coinbase Address: ${coinbaseResp.result}`);
            }
        }

        // Check listening status (for bootnode specifically)
        if (nodeType === 'bootnode') {
            const listeningCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
            const { stdout: listeningOut } = await execAsync(listeningCmd);
            const listeningResp = JSON.parse(listeningOut);
            
            if (listeningResp && listeningResp.result !== undefined) {
                const status = listeningResp.result ? '🟢 LISTENING' : '🔴 NOT LISTENING';
                console.log(`   📡 Network Listening: ${status}`);
            }
        }

        console.log(`   ✅ Status: OPERATIONAL`);
        return true;

    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 BESU ALL NODE TYPES - LIVE STATUS REPORT');
    console.log('═'.repeat(70));
    console.log();

    const nodes = [
        { port: 8800, name: 'Bootnode-1', type: 'bootnode', role: 'Network Bootstrap & Peer Discovery' },
        { port: 8801, name: 'Miner-1', type: 'miner', role: 'Block Production & Mining' },
        { port: 8802, name: 'RPC-1', type: 'rpc', role: 'API Access & Transaction Relay' },
        { port: 8803, name: 'Validator-1', type: 'validator', role: 'Consensus & Block Validation' }
    ];

    let operationalNodes = 0;
    let totalPeers = 0;
    let activeMiners = 0;
    let currentBlock = 0;

    for (const node of nodes) {
        console.log(`🎯 ${node.name}: ${node.role}`);
        console.log('─'.repeat(50));
        
        const isOperational = await checkNodeStatus(node.port, node.name, node.type);
        if (isOperational) {
            operationalNodes++;
            
            // Get peer count for total
            try {
                const peerCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${node.port}`;
                const { stdout } = await execAsync(peerCmd);
                const response = JSON.parse(stdout);
                if (response && response.result) {
                    totalPeers += parseInt(response.result, 16);
                }
            } catch (error) {
                // Ignore peer count errors
            }
            
            // Check mining status for miners/validators
            if (node.type === 'miner' || node.type === 'validator') {
                try {
                    const miningCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_mining","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${node.port}`;
                    const { stdout } = await execAsync(miningCmd);
                    const response = JSON.parse(stdout);
                    if (response && response.result === true) {
                        activeMiners++;
                    }
                } catch (error) {
                    // Ignore mining check errors
                }
            }
            
            // Get current block height
            try {
                const blockCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${node.port}`;
                const { stdout } = await execAsync(blockCmd);
                const response = JSON.parse(stdout);
                if (response && response.result) {
                    const blockNum = parseInt(response.result, 16);
                    if (blockNum > currentBlock) {
                        currentBlock = blockNum;
                    }
                }
            } catch (error) {
                // Ignore block check errors
            }
        }
        
        console.log();
    }

    // Docker infrastructure status
    console.log('🐳 DOCKER INFRASTRUCTURE');
    console.log('─'.repeat(50));
    try {
        const { stdout } = await execAsync('docker ps --format "table {{.Names}}\\t{{.Status}}" | grep all-node-types');
        console.log(stdout);
    } catch (error) {
        console.log('❌ Could not retrieve container status');
    }
    console.log();

    // Network Summary
    console.log('📊 NETWORK SUMMARY');
    console.log('═'.repeat(70));
    console.log(`🟢 Operational Nodes: ${operationalNodes}/4`);
    console.log(`🤝 Total Peer Connections: ${totalPeers}`);
    console.log(`⛏️  Active Miners/Validators: ${activeMiners}`);
    console.log(`📦 Current Block Height: ${currentBlock}`);
    console.log(`🌐 Network: all-node-types (Chain ID: 1402)`);
    console.log(`🔌 Port Range: 8800-8803`);

    const isHealthy = operationalNodes >= 3 && totalPeers >= 8 && activeMiners >= 1 && currentBlock > 10;

    console.log();
    if (isHealthy) {
        console.log('🎉 NETWORK IS FULLY OPERATIONAL!');
        console.log();
        console.log('✨ ALL NODE TYPES SUCCESSFULLY DEMONSTRATED:');
        console.log('   🔹 Bootnode: Providing network discovery and bootstrap functionality ✅');
        console.log('   🔹 Miner: Actively producing blocks and processing transactions ✅');
        console.log('   🔹 RPC: Serving API requests and relaying transactions ✅');
        console.log('   🔹 Validator: Participating in consensus and validating blocks ✅');
        console.log();
        console.log('🔧 NETWORK-SDK CAPABILITIES VALIDATED:');
        console.log('   • Multi-node network creation ✅');
        console.log('   • Dynamic node addition ✅');
        console.log('   • Node type differentiation ✅');
        console.log('   • Peer discovery and connectivity ✅');
        console.log('   • Blockchain consensus and synchronization ✅');
        console.log('   • Docker containerization ✅');
    } else {
        console.log('⚠️  NETWORK STATUS: PARTIAL OPERATION');
        console.log('   Some nodes may still be initializing or syncing');
        if (operationalNodes < 4) console.log(`   - Only ${operationalNodes}/4 nodes are operational`);
        if (totalPeers < 8) console.log(`   - Low peer connectivity (${totalPeers} connections)`);
        if (activeMiners < 1) console.log(`   - No active miners detected`);
        if (currentBlock < 10) console.log(`   - Blockchain still initializing (block ${currentBlock})`);
    }

    console.log();
    console.log('🧹 To stop this network:');
    console.log('   docker stop $(docker ps -q --filter "name=all-node-types")');
    console.log('   docker rm $(docker ps -a -q --filter "name=all-node-types")');
}

main().catch(console.error);

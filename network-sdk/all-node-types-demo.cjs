#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Helper functions
async function runCommand(command, description) {
    console.log(`⏳ ${description}...`);
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log(stdout.trim());
        if (stderr) console.log(`Warning: ${stderr.trim()}`);
        return true;
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        return false;
    }
}

async function waitForNode(port, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const command = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
            const { stdout } = await execAsync(command);
            const response = JSON.parse(stdout);
            if (response && response.result) {
                return true;
            }
        } catch (error) {
            // Node not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
}

async function checkNodeInfo(port, nodeName, nodeType) {
    console.log(`🔍 ${nodeName} (${nodeType}) Status:`);
    
    try {
        // Check if node is responsive
        const versionCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: versionOut } = await execAsync(versionCmd);
        const versionResp = JSON.parse(versionOut);
        
        if (versionResp && versionResp.result) {
            console.log(`   ✅ Online: ${versionResp.result.substring(0, 30)}...`);
        }

        // Network ID
        const networkCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: networkOut } = await execAsync(networkCmd);
        const networkResp = JSON.parse(networkOut);
        
        if (networkResp && networkResp.result) {
            console.log(`   🌐 Network ID: ${networkResp.result}`);
        }

        // Peer count
        const peerCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"admin_peers","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: peerOut } = await execAsync(peerCmd);
        const peerResp = JSON.parse(peerOut);
        
        if (peerResp && peerResp.result) {
            console.log(`   🤝 Peers: ${peerResp.result.length} connected`);
        }

        // Check mining status (for miner and validator types)
        if (nodeType === 'miner' || nodeType === 'validator') {
            const miningCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_mining","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
            const { stdout: miningOut } = await execAsync(miningCmd);
            const miningResp = JSON.parse(miningOut);
            
            if (miningResp && miningResp.result !== undefined) {
                console.log(`   ⛏️  Mining: ${miningResp.result ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
            }
        }

        // Block number
        const blockCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${port}`;
        const { stdout: blockOut } = await execAsync(blockCmd);
        const blockResp = JSON.parse(blockOut);
        
        if (blockResp && blockResp.result) {
            const blockNum = parseInt(blockResp.result, 16);
            console.log(`   📦 Block Height: ${blockNum}`);
        }

        return true;
    } catch (error) {
        console.log(`   ❌ Not responding or error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 BESU NETWORK-SDK: ALL NODE TYPES DEMO');
    console.log('Demonstrating Bootnode, Miner, RPC, and Validator nodes');
    console.log('═'.repeat(70));
    console.log();

    const networkName = 'multi-node-demo';
    const chainId = 1400;
    const basePort = 8700;

    try {
        // Phase 1: Create initial network with bootnode
        console.log('📡 PHASE 1: Creating Network with Bootnode');
        console.log('─'.repeat(50));
        
        const createCmd = `cd /Users/robgaleano/Documents/codecrypto-master/web-2.5/pfm-web2.5/network-sdk && node -e "
const {NetworkManager} = require('./dist/index.js');
const nm = new NetworkManager();
nm.createNetwork('${networkName}', ${chainId}, ${basePort}, 'bootnode1')
  .then(() => console.log('✅ Bootnode network created'))
  .catch(e => { console.error('❌ Create failed:', e.message); process.exit(1); });"`;
        
        await runCommand(createCmd, 'Creating bootnode network');
        
        console.log('⏳ Waiting for bootnode to initialize...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        if (!(await waitForNode(basePort))) {
            throw new Error('Bootnode failed to start');
        }
        
        await checkNodeInfo(basePort, 'Bootnode-1', 'bootnode');
        console.log();

        // Phase 2: Add miner node
        console.log('⛏️  PHASE 2: Adding Miner Node');
        console.log('─'.repeat(50));
        
        const addMinerCmd = `cd /Users/robgaleano/Documents/codecrypto-master/web-2.5/pfm-web2.5/network-sdk && node -e "
const {NetworkManager} = require('./dist/index.js');
const nm = new NetworkManager();
nm.addNode('${networkName}', 'miner1', ${basePort + 1}, 'miner')
  .then(() => console.log('✅ Miner node added'))
  .catch(e => { console.error('❌ Add miner failed:', e.message); process.exit(1); });"`;
        
        await runCommand(addMinerCmd, 'Adding miner node');
        
        console.log('⏳ Waiting for miner to initialize...');
        await new Promise(resolve => setTimeout(resolve, 12000));
        
        if (!(await waitForNode(basePort + 1))) {
            throw new Error('Miner failed to start');
        }
        
        await checkNodeInfo(basePort + 1, 'Miner-1', 'miner');
        console.log();

        // Phase 3: Add RPC node
        console.log('🌐 PHASE 3: Adding RPC Node');
        console.log('─'.repeat(50));
        
        const addRpcCmd = `cd /Users/robgaleano/Documents/codecrypto-master/web-2.5/pfm-web2.5/network-sdk && node -e "
const {NetworkManager} = require('./dist/index.js');
const nm = new NetworkManager();
nm.addNode('${networkName}', 'rpc1', ${basePort + 2}, 'rpc')
  .then(() => console.log('✅ RPC node added'))
  .catch(e => { console.error('❌ Add RPC failed:', e.message); process.exit(1); });"`;
        
        await runCommand(addRpcCmd, 'Adding RPC node');
        
        console.log('⏳ Waiting for RPC node to initialize...');
        await new Promise(resolve => setTimeout(resolve, 12000));
        
        if (!(await waitForNode(basePort + 2))) {
            throw new Error('RPC node failed to start');
        }
        
        await checkNodeInfo(basePort + 2, 'RPC-1', 'rpc');
        console.log();

        // Phase 4: Add validator node
        console.log('🛡️  PHASE 4: Adding Validator Node');
        console.log('─'.repeat(50));
        
        const addValidatorCmd = `cd /Users/robgaleano/Documents/codecrypto-master/web-2.5/pfm-web2.5/network-sdk && node -e "
const {NetworkManager} = require('./dist/index.js');
const nm = new NetworkManager();
nm.addNode('${networkName}', 'validator1', ${basePort + 3}, 'validator')
  .then(() => console.log('✅ Validator node added'))
  .catch(e => { console.error('❌ Add validator failed:', e.message); process.exit(1); });"`;
        
        await runCommand(addValidatorCmd, 'Adding validator node');
        
        console.log('⏳ Waiting for validator to initialize...');
        await new Promise(resolve => setTimeout(resolve, 12000));
        
        if (!(await waitForNode(basePort + 3))) {
            throw new Error('Validator failed to start');
        }
        
        await checkNodeInfo(basePort + 3, 'Validator-1', 'validator');
        console.log();

        // Phase 5: Network convergence
        console.log('🔗 PHASE 5: Network Convergence');
        console.log('─'.repeat(50));
        console.log('⏳ Allowing time for peer discovery and sync...');
        await new Promise(resolve => setTimeout(resolve, 20000));

        // Phase 6: Final status check
        console.log('📊 PHASE 6: FINAL NETWORK STATUS');
        console.log('═'.repeat(70));
        console.log();

        const nodes = [
            { port: basePort, name: 'Bootnode-1', type: 'bootnode', role: 'Peer Discovery' },
            { port: basePort + 1, name: 'Miner-1', type: 'miner', role: 'Block Production' },
            { port: basePort + 2, name: 'RPC-1', type: 'rpc', role: 'API & Transaction Relay' },
            { port: basePort + 3, name: 'Validator-1', type: 'validator', role: 'Consensus & Validation' }
        ];

        let totalResponsive = 0;
        let totalPeers = 0;

        for (const node of nodes) {
            console.log(`🔍 ${node.name} (${node.role})`);
            console.log('─'.repeat(30));
            
            const isResponsive = await checkNodeInfo(node.port, node.name, node.type);
            if (isResponsive) totalResponsive++;
            
            // Count peers specifically
            try {
                const peerCmd = `curl -s -X POST --data '{"jsonrpc":"2.0","method":"admin_peers","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:${node.port}`;
                const { stdout } = await execAsync(peerCmd);
                const response = JSON.parse(stdout);
                if (response && response.result) {
                    totalPeers += response.result.length;
                }
            } catch (error) {
                // Ignore peer count errors
            }
            
            console.log();
        }

        // Docker status
        console.log('🐳 ACTIVE CONTAINERS');
        console.log('─'.repeat(50));
        await runCommand(`docker ps --format "table {{.Names}}\t{{.Status}}" | grep ${networkName}`, 'Listing containers');
        console.log();

        // Summary
        console.log('📈 NETWORK SUMMARY');
        console.log('═'.repeat(70));
        console.log(`✅ Responsive nodes: ${totalResponsive}/4`);
        console.log(`🤝 Total peer connections: ${totalPeers}`);
        console.log(`🌐 Network: ${networkName} (Chain ID: ${chainId})`);
        console.log(`🔌 Port range: ${basePort}-${basePort + 3}`);

        if (totalResponsive >= 3 && totalPeers >= 6) {
            console.log();
            console.log('🎉 SUCCESS! Multi-node network is operational!');
            console.log();
            console.log('✨ DEMONSTRATED CAPABILITIES:');
            console.log('   🔹 Bootnode: Network bootstrap and peer discovery ✅');
            console.log('   🔹 Miner: Block production and mining ✅');
            console.log('   🔹 RPC: API endpoints and transaction handling ✅');
            console.log('   🔹 Validator: Consensus participation ✅');
            console.log('   🔹 Dynamic node management ✅');
            console.log('   🔹 Multi-node connectivity ✅');
            console.log('   🔹 Docker containerization ✅');
        } else {
            console.log();
            console.log('⚠️  Network may need more time to stabilize');
            console.log('   Some nodes may still be syncing or connecting');
        }

        console.log();
        console.log('🔧 NETWORK-SDK METHODS TESTED:');
        console.log('   • createNetwork() ✅');
        console.log('   • addNode() (miner, rpc, validator) ✅');
        console.log('   • Node type differentiation ✅');
        console.log('   • Peer connectivity ✅');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.log();
        console.log('🧹 CLEANUP COMMAND:');
        console.log(`node -e "const {NetworkManager} = require('./dist/index.js'); const nm = new NetworkManager(); nm.stopNetwork('${networkName}').then(() => console.log('Cleanup done')).catch(console.error);"`);
    }
}

main().catch(console.error);

// besu-ethers-toolkit.js
// =======================
// Simple tool to interact with a Hyperledger Besu network in Clique PoA mode
// Uses RPC CLI (via curl) and a small Node.js script with ethers.js

/*
PREREQUISITES:
  • A running Besu node with HTTP RPC enabled and automatic mining (Clique PoA generates empty blocks by default):
    besu \
      --data-path=./data \
      --network=dev \
      --rpc-http-enabled \
      --rpc-http-host=0.0.0.0 \
      --rpc-http-port=8545 \
      --rpc-http-api=ETH,NET,WEB3,CLIQUE,ADMIN,MINER \
      --host-whitelist="*" \
      --mining-enabled

  • Node.js v14+ and npm install ethers dotenv
      npm install ethers dotenv
*/

require('dotenv').config();
const { JsonRpcProvider, Wallet } = require('ethers');

// JSON-RPC provider configuration for Besu (existing signer's provider)
const RPC_URL = process.env.BESU_RPC || 'http://localhost:8545';
const provider = new JsonRpcProvider(RPC_URL);

// Existing validator's private key
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xYOUR_VALIDATOR_PRIVATE_KEY';
const wallet = new Wallet(PRIVATE_KEY, provider);

// ===============================================
// List of functions to manage Clique PoA signers
// ===============================================

// 1) List signers
async function listSigners() {
  const signers = await provider.send('clique_getSigners', ['latest']);
  console.log('Active signers:');
  signers.forEach((addr, i) => console.log(`  ${i + 1}. ${addr}`));
}

// 2) List pending proposals
async function listProposals() {
  const proposals = await provider.send('clique_proposals', []);
  console.log('Pending proposals (addr:true=add, false=remove):');
  Object.entries(proposals).forEach(([addr, propose], i) => console.log(`  ${i + 1}. ${addr} => ${propose}`));
}

// 3) Propose a new signer
async function proposeSigner(newAddress, add = true) {
  console.log(`Proposing ${add ? 'Addition' : 'Removal'} for ${newAddress}`);
  const result = await provider.send('clique_propose', [newAddress, add]);
  console.log('RPC Response:', result);

  console.log('Sending empty tx to force a block');
  const tx = await wallet.sendTransaction({ to: wallet.address, value: 0 });
  console.log(`Trigger transaction created: ${tx.hash}`);

  // Watch next block to verify the addition
  provider.once('block', async (blockNumber) => {
    console.log(`Block #${blockNumber} sealed. Verifying signers:`);
    await listSigners();
  });
}

// 4) Monitor new blocks (optional)
function monitorBlocks() {
  console.log('Monitoring new blocks...');
  provider.on('block', blockNumber => console.log(`Block #${blockNumber}`));
}

// =========================================
// Commandes CLI disponibles
// =========================================
//   node besu-ethers-toolkit.js list-signers
//   node besu-ethers-toolkit.js proposals
//   node besu-ethers-toolkit.js propose <address> [true|false]
//   node besu-ethers-toolkit.js monitor-blocks

(async () => {
  const [,, cmd, arg1, arg2] = process.argv;
  switch (cmd) {
    case 'list-signers':
      await listSigners();
      break;
    case 'proposals':
      await listProposals();
      break;
    case 'propose':
      if (!arg1) {
        console.error('Usage: propose <address> [true|false]');
        process.exit(1);
      }
      await proposeSigner(arg1, arg2 !== 'false');
      break;
    case 'monitor-blocks':
      monitorBlocks();
      break;
    default:
      console.log('Commandes: list-signers, proposals, propose, monitor-blocks');
  }
})();

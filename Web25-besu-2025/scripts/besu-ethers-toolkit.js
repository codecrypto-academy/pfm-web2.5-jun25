// besu-ethers-toolkit.js
// =========================================
// Outil simple pour interagir avec un réseau Hyperledger Besu en mode Clique PoA
// Utilise le CLI RPC (via curl) et un petit script Node.js avec ethers.js

/*
PRÉREQUIS :
  • Un nœud Besu en cours d'exécution avec RPC HTTP activé et minage automatique (Clique PoA génère des blocs vides par défaut) :
    besu \
      --data-path=./data \
      --network=dev \
      --rpc-http-enabled \
      --rpc-http-host=0.0.0.0 \
      --rpc-http-port=8545 \
      --rpc-http-api=ETH,NET,WEB3,CLIQUE,ADMIN,MINER \
      --host-whitelist="*" \
      --mining-enabled

  • Node.js v14+ et npm install ethers dotenv
      npm install ethers dotenv
*/

require('dotenv').config();
const { JsonRpcProvider, Wallet } = require('ethers');

// Configuration du provider JSON-RPC vers Besu (Celui du signataire existant)
const RPC_URL = process.env.BESU_RPC || 'http://localhost:8545';
const provider = new JsonRpcProvider(RPC_URL);

// Clé privée du validateur existant
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xYOUR_VALIDATOR_PRIVATE_KEY';
const wallet = new Wallet(PRIVATE_KEY, provider);

// =========================================
// Fonctions utilitaires
// =========================================

// 1) Lister les signataires
async function listSigners() {
  const signers = await provider.send('clique_getSigners', ['latest']);
  console.log('Signers actifs :');
  signers.forEach((addr, i) => console.log(`  ${i + 1}. ${addr}`));
}

// 2) Lister les propositions en attente
async function listProposals() {
  const proposals = await provider.send('clique_proposals', []);
  console.log('Propositions en attente (addr:true=ajout, false=retire) :');
  Object.entries(proposals).forEach(([addr, propose], i) => console.log(`  ${i + 1}. ${addr} => ${propose}`));
}

// 3) Proposer un nouveau signataire
async function proposeSigner(newAddress, add = true) {
  console.log(`Proposition ${add ? 'd’Ajout' : 'de Retrait'} pour ${newAddress}`);
  const result = await provider.send('clique_propose', [newAddress, add]);
  console.log('Réponse RPC :', result);

  console.log('Envoi d\'une tx vide pour forcer un bloc');
  const tx = await wallet.sendTransaction({ to: wallet.address, value: 0 });
  console.log(`Transaction déclencheur créée: ${tx.hash}`);

  // Surveille le prochain bloc pour vérifier l'ajout
  provider.once('block', async (blockNumber) => {
    console.log(`Bloc #${blockNumber} scellé. Vérification des signataires:`);
    await listSigners();
  });
}

// 4) Surveiller les nouveaux blocs (optionnel)
function monitorBlocks() {
  console.log('Monitoring des nouveaux blocks...');
  provider.on('block', blockNumber => console.log(`Bloc #${blockNumber}`));
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

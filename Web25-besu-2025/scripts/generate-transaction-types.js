const { ethers } = require('ethers');

// Configuration
const RPC_URL = 'http://localhost:18555'; // Port RPC du réseau
const PRIVATE_KEY = '0x073f74047a47da5c1ea258cee2d92b20828178c1f1ba0197f8020bb35b60b96e'; // Clé privée du compte préfinancé

// Contrat simple pour les tests
const SIMPLE_CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061017c806100606000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063893d20e81461003b578063a6f9dae114610059575b600080fd5b610043610075565b60405161005091906100e7565b60405180910390f35b610073600480360381019061006e919061009e565b61009e565b005b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6100a781610075565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610115576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161010c9061012c565b60405180910390fd5b80600080819055505050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061014c82610121565b9050919050565b61015c81610141565b82525050565b60006020820190506101776000830184610153565b92915050565b600080fd5b61018b81610141565b811461019657600080fd5b50565b6000813590506101a881610182565b92915050565b6000602082840312156101c4576101c361017d565b5b60006101d284828501610199565b9150509291505056';

async function generateTransactions() {
  console.log('🚀 Generating different types of transactions...');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`📝 Using account: ${wallet.address}`);
    
    // Vérifier le solde du compte
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Account balance: ${balanceEth} ETH`);
    
    if (balance < ethers.parseEther('1')) {
      console.log('⚠️  Warning: Low balance detected. Adjusting transaction amounts...');
    }
    
    // Obtenir le nonce initial et vérifier les transactions en attente
    let nonce = await wallet.getNonce('pending'); // Utiliser 'pending' pour inclure les tx en attente
    console.log(`📊 Starting nonce: ${nonce}`);
    
    // Obtenir le prix de gaz suggéré et l'augmenter pour éviter les conflits
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * BigInt(12) / BigInt(10) : ethers.parseUnits('2', 'gwei'); // +20% ou 2 gwei minimum
    console.log(`⛽ Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    const transactions = [];
    let contractAddress = null;
    
    // 1. Déploiement de contrat simple
    console.log('\n🏗️  Deploying simple contract...');
    
    // Calculer le coût estimé du déploiement
    const deployGasLimit = BigInt(200000);
    const deployCost = deployGasLimit * gasPrice;
    
    console.log(`💸 Deploy cost estimate: ${ethers.formatEther(deployCost)} ETH`);
    
    if (balance < deployCost) {
      console.log('❌ Insufficient balance for contract deployment, skipping...');
    } else {
      const deployTx = {
        data: SIMPLE_CONTRACT_BYTECODE,
        gasLimit: deployGasLimit,
        gasPrice: gasPrice,
        nonce: nonce++
      };
      
      const deployResponse = await wallet.sendTransaction(deployTx);
      console.log(`✅ Contract deployment TX: ${deployResponse.hash}`);
      transactions.push({type: 'deploy', hash: deployResponse.hash});
      
      // Attendre la confirmation pour obtenir l'adresse du contrat
      console.log('⏳ Waiting for deployment confirmation...');
      const deployReceipt = await deployResponse.wait();
      contractAddress = deployReceipt.contractAddress;
      console.log(`📍 Contract deployed at: ${contractAddress}`);
    }
    
    // 2. Transfert simple (sans données)
    console.log('\n💸 Simple transfer...');
    
    // Utiliser un montant plus petit si le solde est faible
    const transferAmount = balance > ethers.parseEther('10') ? ethers.parseEther('0.1') : ethers.parseEther('0.001');
    const transferGasLimit = BigInt(21000);
    const transferCost = transferGasLimit * gasPrice + transferAmount;
    
    console.log(`💸 Transfer cost estimate: ${ethers.formatEther(transferCost)} ETH`);
    
    if (balance < transferCost) {
      console.log('❌ Insufficient balance for transfer, skipping...');
    } else {
      const transferTx = await wallet.sendTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: transferAmount,
        gasLimit: transferGasLimit,
        gasPrice: gasPrice,
        nonce: nonce++
      });
      console.log(`✅ Transfer TX: ${transferTx.hash}`);
      transactions.push({type: 'transfer', hash: transferTx.hash});
    }
    
    // 3. Interaction avec contrat (appel de fonction)
    if (contractAddress) {
      console.log('\n⚡ Contract interaction...');
      
      // Interface du contrat pour encoder l'appel
      const contractInterface = new ethers.Interface([
        'function changeOwner(address newOwner) public'
      ]);
      
      const callData = contractInterface.encodeFunctionData('changeOwner', [
        '0x9876543210987654321098765432109876543210'
      ]);
      
      const contractGasLimit = BigInt(100000);
      const contractCost = contractGasLimit * gasPrice;
      
      console.log(`💸 Contract call cost estimate: ${ethers.formatEther(contractCost)} ETH`);
      
      if (balance < contractCost) {
        console.log('❌ Insufficient balance for contract call, skipping...');
      } else {
        const contractCallTx = await wallet.sendTransaction({
          to: contractAddress,
          data: callData,
          gasLimit: contractGasLimit,
          gasPrice: gasPrice,
          nonce: nonce++
        });
        console.log(`✅ Contract call TX: ${contractCallTx.hash}`);
        transactions.push({type: 'contract', hash: contractCallTx.hash});
      }
    }
    
    // 4. Transfert avec données (transaction hybride)
    console.log('\n📦 Transfer with data...');
    
    const dataTransferAmount = balance > ethers.parseEther('5') ? ethers.parseEther('0.05') : ethers.parseEther('0.0001');
    const dataGasLimit = BigInt(30000);
    const dataCost = dataGasLimit * gasPrice + dataTransferAmount;
    
    console.log(`💸 Data transfer cost estimate: ${ethers.formatEther(dataCost)} ETH`);
    
    if (balance < dataCost) {
      console.log('❌ Insufficient balance for data transfer, skipping...');
    } else {
      const transferWithDataTx = await wallet.sendTransaction({
        to: '0x5555555555555555555555555555555555555555',
        value: dataTransferAmount,
        data: '0x1234567890abcdef',
        gasLimit: dataGasLimit,
        gasPrice: gasPrice,
        nonce: nonce++
      });
      console.log(`✅ Transfer with data TX: ${transferWithDataTx.hash}`);
      transactions.push({type: 'transfer', hash: transferWithDataTx.hash});
    }
    
    // 5. Déploiement d'un contrat plus complexe
    console.log('\n🏭 Deploying complex contract...');
    
    const complexGasLimit = BigInt(300000);
    const complexCost = complexGasLimit * gasPrice;
    
    console.log(`💸 Complex deploy cost estimate: ${ethers.formatEther(complexCost)} ETH`);
    
    if (balance < complexCost) {
      console.log('❌ Insufficient balance for complex contract deployment, skipping...');
    } else {
      const complexContractBytecode = '0x608060405234801561001057600080fd5b506040518060400160405280600e81526020017f48656c6c6f2c20576f726c642100000000000000000000000000000000000000008152506000908051906020019061005e929190610062565b5050610166565b82805461006e90610105565b90600052602060002090601f01602090048101928261009057600085556100d7565b82601f106100a957805160ff19168380011785556100d7565b828001600101855582156100d7579182015b828111156100d65782518255916020019190600101906100bb565b5b5090506100e491906100e8565b5090565b5b808211156101015760008160009055506001016100e9565b5090565b6000600282049050600182168061011d57607f821691505b60208210811415610131576101306101b8565b5b50919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b56fe';
      const complexDeployTx = await wallet.sendTransaction({
        data: complexContractBytecode,
        gasLimit: complexGasLimit,
        gasPrice: gasPrice,
        nonce: nonce++
      });
      console.log(`✅ Complex contract deployment TX: ${complexDeployTx.hash}`);
      transactions.push({type: 'deploy', hash: complexDeployTx.hash});
    }
    
    console.log('\n🎯 Summary of generated transactions:');
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.type.toUpperCase()}: ${tx.hash}`);
    });
    
    console.log('\n✨ All transactions sent! Check your network monitoring for the different icons.');
    console.log('🔍 You should see:');
    console.log('   📘 Blue Code2 icon for contract deployments');
    console.log('   🟣 Purple Zap icon for contract interactions');
    console.log('   🟢 Green Send icon for simple transfers');
    
  } catch (error) {
    console.error('❌ Error generating transactions:', error);
  }
}

// Fonction pour vérifier et nettoyer les transactions en attente
async function clearPendingTransactions() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('🧹 Checking for pending transactions...');
    
    const currentNonce = await wallet.getNonce('latest');
    const pendingNonce = await wallet.getNonce('pending');
    
    console.log(`📊 Current nonce: ${currentNonce}, Pending nonce: ${pendingNonce}`);
    
    if (pendingNonce > currentNonce) {
      console.log(`⚠️  Found ${pendingNonce - currentNonce} pending transactions`);
      console.log('💡 You may need to wait for them to be mined or restart the network');
      
      // Obtenir le prix de gaz actuel
      const feeData = await provider.getFeeData();
      const currentGasPrice = feeData.gasPrice ? feeData.gasPrice : ethers.parseUnits('1', 'gwei');
      
      console.log(`⛽ Current network gas price: ${ethers.formatUnits(currentGasPrice, 'gwei')} gwei`);
      console.log(`⛽ Suggested gas price for replacement: ${ethers.formatUnits(currentGasPrice * BigInt(12) / BigInt(10), 'gwei')} gwei`);
    } else {
      console.log('✅ No pending transactions found');
    }
    
  } catch (error) {
    console.error('❌ Error checking pending transactions:', error);
  }
}

// Fonction pour vérifier les blocs récents
async function checkRecentBlocks() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const latestBlock = await provider.getBlockNumber();
    
    console.log(`\n🔍 Checking last 5 blocks (from ${latestBlock-4} to ${latestBlock})...`);
    
    for (let i = Math.max(0, latestBlock - 4); i <= latestBlock; i++) {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions.length > 0) {
        console.log(`\n📦 Block #${i} (${block.transactions.length} transactions):`);
        
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx) {
            let type = 'transfer';
            if (!tx.to && tx.data && tx.data !== '0x') {
              type = 'deploy';
            } else if (tx.to && tx.data && tx.data !== '0x' && tx.data.length > 10) {
              type = 'contract';
            }
            
            console.log(`  ${type === 'deploy' ? '📘' : type === 'contract' ? '🟣' : '🟢'} ${type.toUpperCase()}: ${txHash.slice(0, 10)}...`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking blocks:', error);
  }
}

// Exécuter selon l'argument
async function main() {
  if (process.argv[2] === 'check') {
    await checkRecentBlocks();
  } else if (process.argv[2] === 'clear') {
    await clearPendingTransactions();
  } else {
    await generateTransactions();
  }
}

// Exécuter le script principal
main().catch(console.error);

#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration du réseau Besu
const BESU_RPC_URL = 'http://localhost:18555';
const PRIVATE_KEY = '0x073f74047a47da5c1ea258cee2d92b20828178c1f1ba0197f8020bb35b60b96e'; // Clé du compte préfinancé

// Contrat simple pour tester les transactions avec gas
const SIMPLE_CONTRACT = `
pragma solidity ^0.8.0;

contract GasConsumer {
    mapping(address => uint256) public balances;
    uint256[] public numbers;
    
    function store(uint256 _number) public {
        numbers.push(_number);
        balances[msg.sender] += _number;
    }
    
    function storeBatch(uint256[] memory _numbers) public {
        for(uint i = 0; i < _numbers.length; i++) {
            numbers.push(_numbers[i]);
            balances[msg.sender] += _numbers[i];
        }
    }
    
    function expensiveLoop(uint256 iterations) public {
        for(uint i = 0; i < iterations; i++) {
            numbers.push(i);
        }
    }
}
`;

async function generateTransactions() {
    console.log('🚀 Génération de transactions avec gas...');
    
    const provider = new ethers.JsonRpcProvider(BESU_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('📍 Compte utilisé:', wallet.address);
    
    // Obtenir le nonce en incluant les transactions en attente
    let nonce = await wallet.getNonce('pending');
    console.log(`📊 Nonce de départ: ${nonce}`);
    
    // Obtenir le prix de gaz suggéré et l'augmenter
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * BigInt(12) / BigInt(10) : ethers.parseUnits('2', 'gwei');
    console.log(`⛽ Prix du gaz utilisé: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    try {
        // 1. Transaction simple (peu de gas)
        console.log('\n💸 1. Transfer simple...');
        const tx1 = await wallet.sendTransaction({
            to: '0x55AbE2d61ef95A1766Fb868a224Aef00744e4BaA',
            value: ethers.parseEther('0.1'),
            gasLimit: 21000,
            gasPrice: gasPrice,
            nonce: nonce++
        });
        console.log(`✅ TX Hash: ${tx1.hash}`);
        await tx1.wait();
        
        // 2. Transaction avec plus de gas (données plus importantes)
        console.log('\n🔧 2. Transaction avec données...');
        const largeData = '0x' + '1234567890abcdef'.repeat(50); // Données plus importantes
        const tx2 = await wallet.sendTransaction({
            to: '0x55AbE2d61ef95A1766Fb868a224Aef00744e4BaA',
            value: ethers.parseEther('0.05'),
            data: largeData,
            gasLimit: 100000,
            gasPrice: gasPrice,
            nonce: nonce++
        });
        console.log(`✅ TX Hash: ${tx2.hash}`);
        await tx2.wait();
        
        // 3. Plusieurs transactions rapides avec gas variables
        console.log('\n⚡ 3. Batch de transactions avec gas variables...');
        const promises = [];
        for(let i = 0; i < 5; i++) {
            const gasAmount = 30000 + (i * 20000); // 30K, 50K, 70K, 90K, 110K
            const data = '0x' + 'deadbeef'.repeat(i + 1); // Données de taille croissante
            const tx = wallet.sendTransaction({
                to: '0x55AbE2d61ef95A1766Fb868a224Aef00744e4BaA',
                value: ethers.parseEther('0.01'),
                data: data,
                gasLimit: gasAmount,
                gasPrice: gasPrice,
                nonce: nonce++
            });
            promises.push(tx);
            console.log(`📋 TX ${i+1}: ${gasAmount} gas limit, nonce: ${nonce-1}`);
        }
        
        const batchTxs = await Promise.all(promises);
        console.log(`✅ ${batchTxs.length} transactions envoyées`);
        
        // Attendre toutes les transactions et afficher le gas utilisé
        for(const tx of batchTxs) {
            const receipt = await tx.wait();
            console.log(`✅ Confirmé: ${tx.hash.slice(0, 10)}... - Gas utilisé: ${receipt.gasUsed}`);
        }
        
        console.log('\n🎉 Toutes les transactions sont minées !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

async function deployContract() {
    console.log('\n📜 Déploiement de contrat...');
    
    const provider = new ethers.JsonRpcProvider(BESU_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Obtenir le nonce et le prix de gaz appropriés
    const nonce = await wallet.getNonce('pending');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * BigInt(12) / BigInt(10) : ethers.parseUnits('2', 'gwei');
    
    console.log(`📊 Nonce: ${nonce}, Prix gaz: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    // Bytecode d'un contrat simple
    const contractBytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80636057361d1461004657806367e404ce14610062578063b3de648b14610080575b600080fd5b610060600480360381019061005b9190610094565b6100b1565b005b61006a6100bb565b60405161007791906100d0565b60405180910390f35b610098600480360381019061009391906100eb565b6100c1565b005b6000813590506100a981610103565b92915050565b8060008190555050565b60005481565b60005b818110156100eb576001600080828254019250508190555080806100e790610118565b9150506100c4565b5050565b6000813590506100fe81610103565b92915050565b61010c81610161565b811461011757600080fd5b50565b600061012582610161565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036101575761015661016b565b5b600182019050919050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fdfea2646970667358221220c89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc564736f6c63430008110033";
    
    try {
        const tx = await wallet.sendTransaction({
            data: contractBytecode,
            gasLimit: 1000000, // Gas élevé pour déploiement
            gasPrice: gasPrice,
            nonce: nonce
        });
        
        console.log(`✅ Déploiement TX: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`📍 Contrat déployé à: ${receipt.contractAddress}`);
        console.log(`⛽ Gas utilisé: ${receipt.gasUsed}`);
        
    } catch (error) {
        console.error('❌ Erreur déploiement:', error.message);
    }
}

async function checkRecentBlocks() {
    console.log('\n📊 Vérification des blocs récents...');
    
    const provider = new ethers.JsonRpcProvider(BESU_RPC_URL);
    
    try {
        const latestBlockNumber = await provider.getBlockNumber();
        console.log(`📍 Dernier bloc: ${latestBlockNumber}`);
        
        // Vérifier les 5 derniers blocs
        for(let i = Math.max(0, latestBlockNumber - 4); i <= latestBlockNumber; i++) {
            const block = await provider.getBlock(i, true);
            if(block) {
                const gasDisplay = Number(block.gasUsed) > 1000000 
                    ? `${(Number(block.gasUsed) / 1000000).toFixed(2)}M`
                    : Number(block.gasUsed) > 1000
                        ? `${(Number(block.gasUsed) / 1000).toFixed(1)}K`
                        : Number(block.gasUsed).toString();
                
                console.log(`🧱 Bloc ${i}: ${block.transactions.length} TX, Gas: ${gasDisplay}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification blocs:', error.message);
    }
}

async function checkPendingTransactions() {
    console.log('\n🧹 Vérification des transactions en attente...');
    
    const provider = new ethers.JsonRpcProvider(BESU_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    try {
        const currentNonce = await wallet.getNonce('latest');
        const pendingNonce = await wallet.getNonce('pending');
        
        console.log(`📊 Nonce actuel: ${currentNonce}, Nonce en attente: ${pendingNonce}`);
        
        if (pendingNonce > currentNonce) {
            console.log(`⚠️  ${pendingNonce - currentNonce} transaction(s) en attente détectée(s)`);
            
            const feeData = await provider.getFeeData();
            const currentGasPrice = feeData.gasPrice ? feeData.gasPrice : ethers.parseUnits('1', 'gwei');
            
            console.log(`⛽ Prix gaz réseau: ${ethers.formatUnits(currentGasPrice, 'gwei')} gwei`);
            console.log(`⛽ Prix recommandé: ${ethers.formatUnits(currentGasPrice * BigInt(12) / BigInt(10), 'gwei')} gwei`);
        } else {
            console.log('✅ Aucune transaction en attente');
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification transactions:', error.message);
    }
}

// Script principal
async function main() {
    console.log('🔥 GÉNÉRATEUR DE TRANSACTIONS AVEC GAS');
    console.log('=====================================');
    
    const args = process.argv.slice(2);
    
    if (args.includes('--contract')) {
        await deployContract();
    } else if (args.includes('--check')) {
        await checkRecentBlocks();
    } else if (args.includes('--pending')) {
        await checkPendingTransactions();
    } else {
        // Vérifier d'abord les transactions en attente
        await checkPendingTransactions();
        await generateTransactions();
    }
    
    // Toujours vérifier les blocs après génération
    if (!args.includes('--check')) {
        await checkRecentBlocks();
    }
    
    if (args.includes('--continuous')) {
        console.log('\n🔄 Mode continu activé - Nouvelles transactions toutes les 10s...');
        setInterval(async () => {
            await generateTransactions();
            await checkRecentBlocks();
        }, 10000);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { generateTransactions, deployContract, checkRecentBlocks, checkPendingTransactions };

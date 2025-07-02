#!/usr/bin/env node

/**
 * Real Transaction Script for Besu Network - VERSIÓN CORREGIDA
 * Este script usa una cuenta que SÍ tiene fondos pre-asignados en genesis.json
 */

const { ethers } = require('ethers');

// Configuración CORREGIDA - usando node0 que tiene fondos
const CONFIG = {
    rpcUrl: 'http://localhost:8545',
    chainId: 1337, // From genesis.json
    // ✅ CORREGIDO: Usando clave privada de node0 que SÍ tiene fondos
    privateKey: '0x186253e5170e3d1c4e2b55fb5bb1ea8b00efacf8c41c9a81de7c73d56f65e88a',
    // ✅ CORREGIDO: Dirección correspondiente a la clave privada de node0
    fromAddress: '0x39ff8ba4e087e5319a2330fc7bc4d0e3479bc581',
    toAddress: '0xb65fd00b7d314593ffb435354aa3cf7a7f31b17d',
    amount: '1.0' // ETH to send
};

async function main() {
    console.log('🚀 Starting FIXED real transaction test with ethers.js...');
    console.log('=' .repeat(60));
    
    try {
        // Create provider
        const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
        
        // Test connection
        console.log('📡 Testing RPC connection...');
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected! Current block: ${blockNumber}`);
        
        // Create wallet
        const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
        console.log(`📝 Wallet address: ${wallet.address}`);
        
        // Verificar que la dirección del wallet coincide con fromAddress
        if (wallet.address.toLowerCase() !== CONFIG.fromAddress.toLowerCase()) {
            throw new Error(`❌ MISMATCH: Wallet address (${wallet.address}) doesn't match fromAddress (${CONFIG.fromAddress})`);
        }
        console.log('✅ Address verification passed!');
        
        // Check initial balances
        console.log('\n💰 Checking initial balances...');
        const fromBalance = await provider.getBalance(CONFIG.fromAddress);
        const toBalance = await provider.getBalance(CONFIG.toAddress);
        
        console.log(`From (${CONFIG.fromAddress}): ${ethers.formatEther(fromBalance)} ETH`);
        console.log(`To   (${CONFIG.toAddress}): ${ethers.formatEther(toBalance)} ETH`);
        
        // Verificar que hay fondos suficientes
        const requiredAmount = ethers.parseEther(CONFIG.amount);
        const gasEstimate = 21000n;
        const gasPrice = ethers.parseUnits('10', 'gwei');
        const totalRequired = requiredAmount + (gasEstimate * gasPrice);
        
        if (fromBalance < totalRequired) {
            throw new Error(`❌ Insufficient funds! Required: ${ethers.formatEther(totalRequired)} ETH, Available: ${ethers.formatEther(fromBalance)} ETH`);
        }
        console.log('✅ Sufficient funds available!');
        
        // Prepare transaction
        console.log('\n📋 Preparing transaction...');
        const tx = {
            to: CONFIG.toAddress,
            value: requiredAmount,
            gasLimit: gasEstimate,
            gasPrice: gasPrice
        };
        
        console.log(`Amount: ${CONFIG.amount} ETH`);
        console.log(`Gas Limit: ${tx.gasLimit}`);
        console.log(`Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
        console.log(`Total cost: ${ethers.formatEther(totalRequired)} ETH`);
        
        // Estimate gas
        console.log('\n⛽ Estimating gas...');
        const estimatedGas = await wallet.estimateGas(tx);
        console.log(`✅ Estimated gas: ${estimatedGas}`);
        
        // Send transaction
        console.log('\n🔄 Sending transaction...');
        const txResponse = await wallet.sendTransaction(tx);
        console.log(`✅ Transaction sent! Hash: ${txResponse.hash}`);
        
        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...');
        const receipt = await txResponse.wait();
        
        console.log('\n🎉 Transaction confirmed!');
        console.log(`Block number: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed}`);
        console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        
        // Check final balances
        console.log('\n💰 Checking final balances...');
        const newFromBalance = await provider.getBalance(CONFIG.fromAddress);
        const newToBalance = await provider.getBalance(CONFIG.toAddress);
        
        console.log(`From (${CONFIG.fromAddress}): ${ethers.formatEther(newFromBalance)} ETH`);
        console.log(`To   (${CONFIG.toAddress}): ${ethers.formatEther(newToBalance)} ETH`);
        
        // Calculate changes
        const fromChange = fromBalance - newFromBalance;
        const toChange = newToBalance - toBalance;
        
        console.log('\n📊 Balance changes:');
        console.log(`From: -${ethers.formatEther(fromChange)} ETH`);
        console.log(`To:   +${ethers.formatEther(toChange)} ETH`);
        console.log(`Gas cost: ${ethers.formatEther(fromChange - requiredAmount)} ETH`);
        
        console.log('\n✅ FIXED transaction test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'NETWORK_ERROR') {
            console.log('\n💡 Make sure Besu is running on http://localhost:8545');
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log('\n💡 Insufficient funds in the sender account');
        } else if (error.code === 'NONCE_EXPIRED') {
            console.log('\n💡 Nonce issue - try again');
        }
        
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, CONFIG };
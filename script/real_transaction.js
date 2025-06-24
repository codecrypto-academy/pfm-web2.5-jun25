#!/usr/bin/env node

/**
 * Real Transaction Script for Besu Network
 * This script demonstrates how to send real signed transactions to the Besu network
 * using ethers.js library
 */

const { ethers } = require('ethers');

// Configuration
const CONFIG = {
    rpcUrl: 'http://localhost:8545',
    chainId: 1337, // From genesis.json
    privateKey: '0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63',
    fromAddress: '0xfe3b557e8fb62b89f4916b721be55ceb828dbd73',
    toAddress: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
    amount: '1.0' // ETH to send
};

async function main() {
    console.log('🚀 Starting real transaction test with ethers.js...');
    console.log('=' .repeat(50));
    
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
        
        // Check initial balances
        console.log('\n💰 Checking initial balances...');
        const fromBalance = await provider.getBalance(CONFIG.fromAddress);
        const toBalance = await provider.getBalance(CONFIG.toAddress);
        
        console.log(`From (${CONFIG.fromAddress}): ${ethers.formatEther(fromBalance)} ETH`);
        console.log(`To   (${CONFIG.toAddress}): ${ethers.formatEther(toBalance)} ETH`);
        
        // Prepare transaction
        console.log('\n📋 Preparing transaction...');
        const tx = {
            to: CONFIG.toAddress,
            value: ethers.parseEther(CONFIG.amount),
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('10', 'gwei')
        };
        
        console.log(`Amount: ${CONFIG.amount} ETH`);
        console.log(`Gas Limit: ${tx.gasLimit}`);
        console.log(`Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
        
        // Estimate gas
        console.log('\n⛽ Estimating gas...');
        const estimatedGas = await wallet.estimateGas(tx);
        console.log(`Estimated gas: ${estimatedGas}`);
        
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
        
        console.log('\n✅ Real transaction test completed successfully!');
        
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
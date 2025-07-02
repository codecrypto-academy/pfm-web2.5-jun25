#!/usr/bin/env node

/**
 * Real Transaction Script for Besu Network - VERSIÓN QUE FUNCIONA
 * Este script usa la ÚNICA cuenta que realmente tiene fondos: 0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
 */

const { ethers } = require('ethers');

// Configuración usando la ÚNICA cuenta con fondos reales
const CONFIG = {
    rpcUrl: 'http://localhost:8545',
    chainId: 1337,
    // ⚠️ NOTA: Esta es una clave privada de ejemplo/desarrollo
    // En producción, NUNCA hardcodees claves privadas
    privateKey: 'fe3b557e8fb62b89f4916b721be55ceb828dbd73', // Necesitamos encontrar la clave real
    fromAddress: '0xfe3b557e8fb62b89f4916b721be55ceb828dbd73', // La ÚNICA con fondos
    toAddress: '0x39ff8ba4e087e5319a2330fc7bc4d0e3479bc581', // node0
    amount: '1.0' // ETH to send
};

// Claves privadas comunes de desarrollo (para testing)
const DEVELOPMENT_KEYS = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Account 0
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Account 1
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Account 2
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // Account 3
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // Account 4
    '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // Account 5
    '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // Account 6
    '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // Account 7
    '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', // Account 8
    '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6'  // Account 9
];

async function findWorkingKey() {
    console.log('🔍 Buscando clave privada que corresponda a la cuenta con fondos...');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const targetAddress = CONFIG.fromAddress.toLowerCase();
    
    // Probar claves de desarrollo comunes
    for (let i = 0; i < DEVELOPMENT_KEYS.length; i++) {
        try {
            const wallet = new ethers.Wallet(DEVELOPMENT_KEYS[i]);
            if (wallet.address.toLowerCase() === targetAddress) {
                console.log(`✅ ¡Encontrada! Clave ${i}: ${DEVELOPMENT_KEYS[i]}`);
                return DEVELOPMENT_KEYS[i];
            }
        } catch (error) {
            // Ignorar errores de claves inválidas
        }
    }
    
    console.log('❌ No se encontró la clave privada correspondiente');
    return null;
}

async function main() {
    console.log('🚀 Starting WORKING real transaction test...');
    console.log('=' .repeat(60));
    
    try {
        // Create provider
        const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
        
        // Test connection
        console.log('📡 Testing RPC connection...');
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected! Current block: ${blockNumber}`);
        
        // Verificar balance de la cuenta objetivo
        console.log('\n💰 Checking target account balance...');
        const targetBalance = await provider.getBalance(CONFIG.fromAddress);
        console.log(`Target account (${CONFIG.fromAddress}): ${ethers.formatEther(targetBalance)} ETH`);
        
        if (targetBalance === 0n) {
            throw new Error('❌ Target account has no funds!');
        }
        
        // Buscar clave privada
        const workingKey = await findWorkingKey();
        if (!workingKey) {
            console.log('\n💡 SOLUCIÓN ALTERNATIVA:');
            console.log('1. La cuenta 0xfe3b557e8fb62b89f4916b721be55ceb828dbd73 tiene fondos');
            console.log('2. Pero no tenemos su clave privada');
            console.log('3. Opciones:');
            console.log('   a) Buscar la clave en los archivos de configuración de Besu');
            console.log('   b) Usar una cuenta de desarrollo conocida');
            console.log('   c) Transferir fondos desde esta cuenta a una cuenta conocida');
            
            // Mostrar cómo transferir fondos usando Besu CLI
            console.log('\n🔧 Para transferir fondos usando Besu CLI:');
            console.log('besu --rpc-http-enabled --rpc-http-host=0.0.0.0 --rpc-http-port=8545 \\');
            console.log('     --data-path=./data/node0 \\');
            console.log('     --genesis-file=./config/genesis.json');
            
            return;
        }
        
        // Usar la clave encontrada
        const wallet = new ethers.Wallet(workingKey, provider);
        console.log(`📝 Using wallet: ${wallet.address}`);
        
        // Verificar balance
        const fromBalance = await provider.getBalance(wallet.address);
        const toBalance = await provider.getBalance(CONFIG.toAddress);
        
        console.log(`\nFrom (${wallet.address}): ${ethers.formatEther(fromBalance)} ETH`);
        console.log(`To   (${CONFIG.toAddress}): ${ethers.formatEther(toBalance)} ETH`);
        
        // Preparar transacción
        const tx = {
            to: CONFIG.toAddress,
            value: ethers.parseEther(CONFIG.amount),
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('10', 'gwei')
        };
        
        console.log('\n📋 Transaction details:');
        console.log(`Amount: ${CONFIG.amount} ETH`);
        console.log(`Gas Limit: ${tx.gasLimit}`);
        console.log(`Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
        
        // Estimar gas
        console.log('\n⛽ Estimating gas...');
        const estimatedGas = await wallet.estimateGas(tx);
        console.log(`✅ Estimated gas: ${estimatedGas}`);
        
        // Enviar transacción
        console.log('\n🔄 Sending transaction...');
        const txResponse = await wallet.sendTransaction(tx);
        console.log(`✅ Transaction sent! Hash: ${txResponse.hash}`);
        
        // Esperar confirmación
        console.log('⏳ Waiting for confirmation...');
        const receipt = await txResponse.wait();
        
        console.log('\n🎉 Transaction confirmed!');
        console.log(`Block: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed}`);
        console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        
        console.log('\n✅ Transaction completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'NETWORK_ERROR') {
            console.log('\n💡 Make sure Besu is running on http://localhost:8545');
        }
        
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, CONFIG };
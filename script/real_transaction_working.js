#!/usr/bin/env node

/**
 * Real Transaction Script for Besu Network - VERSIÓN QUE FUNCIONA
 * Este script usa la ÚNICA cuenta que realmente tiene fondos: 0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
 */

const { ethers } = require('ethers');

const fs = require('fs');
const path = require('path');

// Configuración usando claves extraídas de archivos generados
const CONFIG = {
    rpcUrl: 'http://localhost:8545',
    chainId: 1337,
    toAddress: '0x39ff8ba4e087e5319a2330fc7bc4d0e3479bc581', // node0
    amount: '1.0', // ETH to send
    dataDir: './data', // Directorio donde están los archivos de nodos
    configDir: './config' // Directorio donde está genesis.json
};

/**
 * Extrae las cuentas desde los archivos generados por el script
 * Lee las claves privadas y direcciones de los directorios de nodos
 */
function extractAccountsFromFiles() {
    const accounts = [];
    
    try {
        // Buscar archivos de nodos en el directorio data
        const dataPath = path.resolve(__dirname, CONFIG.dataDir);
        
        if (!fs.existsSync(dataPath)) {
            console.log(`❌ Directorio de datos no encontrado: ${dataPath}`);
            return [];
        }
        
        // Leer directorios de nodos (node0, node1, etc.)
        const nodeDirectories = fs.readdirSync(dataPath)
            .filter(dir => dir.startsWith('node'))
            .sort();
        
        for (const nodeDir of nodeDirectories) {
            const nodePath = path.join(dataPath, nodeDir);
            const keyFile = path.join(nodePath, 'key');
            const addressFile = path.join(nodePath, 'address');
            
            if (fs.existsSync(keyFile) && fs.existsSync(addressFile)) {
                 let privateKey = fs.readFileSync(keyFile, 'utf8').trim();
                 // Asegurar que la clave privada tenga el prefijo 0x
                 if (!privateKey.startsWith('0x')) {
                     privateKey = '0x' + privateKey;
                 }
                 const address = fs.readFileSync(addressFile, 'utf8').trim().toLowerCase();
                
                accounts.push({
                    nodeDir: nodeDir,
                    address: address,
                    privateKey: privateKey
                });
            }
        }
        
        console.log(`✅ Extraídas ${accounts.length} cuentas desde archivos de nodos`);
        return accounts;
        
    } catch (error) {
        console.error('❌ Error extrayendo cuentas desde archivos:', error.message);
        return [];
    }
}

async function findAccountWithFunds() {
    console.log('🔍 Buscando cuenta con fondos desde archivos de nodos...');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const accounts = extractAccountsFromFiles();
    
    if (accounts.length === 0) {
        console.log('❌ No se pudieron extraer cuentas desde archivos');
        return null;
    }
    
    // Verificar balance de cada cuenta extraída
    for (const account of accounts) {
        try {
            const balance = await provider.getBalance(account.address);
            console.log(`${account.nodeDir} (${account.address}): ${ethers.formatEther(balance)} ETH`);
            
            if (balance > 0n) {
                console.log(`✅ ¡Encontrada cuenta con fondos! Nodo: ${account.nodeDir}`);
                return account;
            }
        } catch (error) {
            console.log(`❌ Error verificando ${account.nodeDir}:`, error.message);
        }
    }
    
    console.log('❌ Ninguna cuenta extraída desde archivos tiene fondos');
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
        
        // Buscar cuenta con fondos desde el mnemonic del proyecto
        console.log('\n💰 Buscando cuenta con fondos...');
        const fundedAccount = await findAccountWithFunds();
        
        if (!fundedAccount) {
            console.log('\n💡 INFORMACIÓN:');
            console.log('1. No se encontraron cuentas con fondos en los archivos de nodos');
            console.log('2. Asegúrate de que la red Besu esté ejecutándose con el genesis correcto');
            console.log('3. Ejecuta primero el script.sh para generar los nodos y sus claves');
            
            // Mostrar todas las cuentas extraídas para referencia
            console.log('\n📋 Cuentas extraídas desde archivos:');
            const allAccounts = extractAccountsFromFiles();
            allAccounts.forEach(account => {
                console.log(`  ${account.nodeDir}: ${account.address}`);
            });
            
            return;
        }
        
        // Usar la cuenta encontrada
        const wallet = new ethers.Wallet(fundedAccount.privateKey, provider);
        console.log(`📝 Usando cuenta ${fundedAccount.nodeDir}: ${wallet.address}`);
        
        // Verificar balances actuales
        const fromBalance = await provider.getBalance(wallet.address);
        const toBalance = await provider.getBalance(CONFIG.toAddress);
        
        console.log(`\n💰 Balances actuales:`);
        console.log(`From (${wallet.address}): ${ethers.formatEther(fromBalance)} ETH`);
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
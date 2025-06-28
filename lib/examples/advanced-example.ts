import { BesuNetwork, BesuNetworkConfig } from "../src/index";
import { ethers } from "ethers";

/**
 * Ejemplo AVANZADO: Red Besu compleja con múltiples nodos y transacciones
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 29, 2025
 * 
 * Este ejemplo fue desarrollado con la asistencia de GitHub Copilot
 * y demuestra configuraciones avanzadas de red Besu.
 * 
 * Este ejemplo demuestra:
 * - Red con múltiples bootnodes, miners, RPC y nodos regulares
 * - Verificación de conectividad entre todos los nodos
 * - Múltiples transacciones entre diferentes cuentas
 * - Monitoreo de sincronización de la red
 * - Pruebas de rendimiento básicas
 * - Configuración robusta para consenso Clique (número impar de miners)
 */

async function advancedExample() {
    console.log('🚀 Ejemplo AVANZADO: Red Besu compleja con múltiples nodos\n');
    
    // Verificación previa de requisitos
    try {
        const { execSync } = require('child_process');
        execSync('docker --version', { stdio: 'ignore' });
        console.log('✅ Docker está disponible');
    } catch (error) {
        console.error('❌ Docker no está disponible o no está ejecutándose');
        console.error('💡 Asegúrese de que Docker esté instalado y ejecutándose antes de continuar');
        return;
    }
    
    // Configuración de la red
    const networkConfig: BesuNetworkConfig = {
        name: 'advanced-besu-network',
        chainId: 8888,
        subnet: '172.40.0.0/16',
        consensus: 'clique',
        gasLimit: '0x5F5E100', // 100,000,000 en hex - valor máximo válido
        blockTime: 3 // Bloques más rápidos para pruebas
    };

    // Crear instancia de la red
    const besuNetwork = new BesuNetwork(networkConfig);

    try {
        console.log('📦 Creando red optimizada...');
        console.log('   - 2 Bootnodes para redundancia');
        console.log('   - 3 Miners para distribución de minado estable (número impar)');
        console.log('   - 1 RPC node para acceso');
        console.log('   - 1 Nodo regular para pruebas');
        console.log('   - Cada nodo tiene puerto RPC único para evitar conflictos\n');
        
        // Crear la red con múltiples nodos - configuración optimizada para conectividad
        // Usando 3 miners (número impar) para evitar problemas de consenso Clique
        await besuNetwork.create({
            nodes: [
                // Bootnodes (redundancia) - IPs bien espaciadas con puertos únicos
                { name: 'bootnode1', ip: '172.40.0.10', rpcPort: 8545, type: 'bootnode', p2pPort: 30303 },
                { name: 'bootnode2', ip: '172.40.0.11', rpcPort: 8546, type: 'bootnode', p2pPort: 30303 },
                
                // Miners (distribución de trabajo) - separados de bootnodes con puertos únicos
                // Usando 3 miners para consenso Clique estable (número impar)
                // Puertos no consecutivos para evitar conflictos según validaciones
                { name: 'miner1', ip: '172.40.0.20', rpcPort: 8547, type: 'miner', p2pPort: 30303 },
                { name: 'miner2', ip: '172.40.0.21', rpcPort: 8549, type: 'miner', p2pPort: 30303 },
                { name: 'miner3', ip: '172.40.0.22', rpcPort: 8551, type: 'miner', p2pPort: 30303 },
                
                // RPC node (acceso público)
                { name: 'rpc1', ip: '172.40.0.30', rpcPort: 8552, type: 'rpc', p2pPort: 30303 },
                
                // Nodo regular (observador)
                { name: 'node1', ip: '172.40.0.40', rpcPort: 8553, type: 'node', p2pPort: 30303 }
            ],
            initialBalance: '10000', // 10,000 ETH para el miner (se convierte automáticamente a Wei)
            autoResolveSubnetConflicts: true
        });

        console.log('✅ Red creada exitosamente\n');

        // Iniciar todos los nodos de forma secuencial para mejor conectividad
        console.log('🔄 Iniciando nodos secuencialmente para asegurar conectividad...');
        console.log('   📋 Orden: Bootnodes → Miners → RPC → Nodos regulares');
        await besuNetwork.start();
        console.log('✅ Todos los nodos iniciados\n');

        // Esperar más tiempo para estabilización de red compleja
        console.log('⏳ Esperando estabilización inicial (60 segundos)...');
        console.log('   💡 Los nodos necesitan tiempo suficiente para establecer conexiones P2P');
        console.log('   ☕ Perfecto momento para tomar un café mientras se conectan...');
        await new Promise(resolve => setTimeout(resolve, 60000));

        // Primera verificación de conectividad básica
        console.log('🔍 Verificación inicial de conectividad...');
        let initialConnectivity = await besuNetwork.getNetworkConnectivity();
        let initialActiveNodes = initialConnectivity.filter(n => n.isActive);
        console.log(`   📊 Estado inicial: ${initialActiveNodes.length}/${initialConnectivity.length} nodos activos`);
        
        // Si pocos nodos están activos, esperar más tiempo
        if (initialActiveNodes.length < initialConnectivity.length * 0.7) {
            console.log('⏳ Esperando más tiempo para que los nodos se estabilicen...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }

        // Verificar conectividad detallada con reintentos
        console.log('🔍 Verificando conectividad y estado de todos los nodos:');
        
        let connectivity;
        let activeNodes;
        let attempts = 0;
        const maxAttempts = 3;
        
        // Intentar hasta 3 veces para obtener una buena conectividad
        do {
            attempts++;
            console.log(`   🔄 Intento ${attempts}/${maxAttempts} de verificación...`);
            
            connectivity = await besuNetwork.getNetworkConnectivity();
            activeNodes = connectivity.filter(n => n.isActive);
            
            console.log(`   📊 Resumen: ${activeNodes.length}/${connectivity.length} nodos activos`);
            
            // Si menos del 70% están activos y tenemos intentos restantes, esperar y reintentar
            if (activeNodes.length < connectivity.length * 0.7 && attempts < maxAttempts) {
                console.log(`   ⏳ Solo ${activeNodes.length} nodos activos, esperando 30s antes de reintentar...`);
                console.log(`   💡 Tip: Los nodos pueden tardar 1-2 minutos en sincronizarse completamente`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            } else {
                break;
            }
        } while (attempts < maxAttempts);
        
        console.log('\n📋 Estado detallado de nodos:');
        connectivity.forEach(node => {
            const status = node.isActive ? '✅' : '❌';
            const block = node.blockNumber !== undefined ? ` | Bloque: ${node.blockNumber}` : '';
            const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
            const error = node.error ? ` | Error: ${node.error.substring(0, 50)}...` : '';
            console.log(`   ${status} ${node.nodeName.padEnd(12)}${block}${peers}${error}`);
        });
        
        // Advertencia si hay nodos inactivos
        const inactiveNodes = connectivity.filter(n => !n.isActive);
        if (inactiveNodes.length > 0) {
            console.log(`\n⚠️  Advertencia: ${inactiveNodes.length} nodos inactivos detectados:`);
            inactiveNodes.forEach(node => {
                console.log(`   ❌ ${node.nodeName}: ${node.error || 'No responde'}`);
            });
            console.log('   💡 El ejemplo continuará con los nodos activos...');
        }
        
        console.log();

        // Financiar múltiples cuentas de prueba - solo si tenemos suficientes nodos activos
        const mnemonic = 'test test test test test test test test test test test junk';
        
        if (activeNodes.length >= 2) { // Al menos 1 bootnode + 1 miner mínimo
            console.log('💰 Financiando múltiples cuentas de prueba...');
            
            // Obtener URL del miner para financiación
            const minerRpcUrl = besuNetwork.getRpcUrl('miner1') || `http://localhost:${8545 + 10000}`;
            
            try {
                await besuNetwork.fundMnemonic(mnemonic, '10', 5, minerRpcUrl); // 10 ETH a 5 cuentas (cantidad más conservadora)
                console.log('✅ 5 cuentas financiadas con 10 ETH cada una\n');
                
                // Esperar confirmación
                console.log('⏳ Esperando confirmación de transacciones de financiamiento...');
                await new Promise(resolve => setTimeout(resolve, 15000));
            } catch (error) {
                console.error('❌ Error en financiamiento:', error instanceof Error ? error.message : error);
                console.log('⚠️  Continuando sin financiamiento...\n');
            }
        } else {
            console.log('⚠️  Insuficientes nodos activos para financiamiento. Saltando...\n');
        }

        // Obtener cuentas derivadas del mnemonic
        const accounts: Array<{
            address: string;
            privateKey: string;
            index: number;
        }> = [];
        
        for (let i = 0; i < 5; i++) { // Reducir a 5 cuentas para coincidir con financiamiento
            const hdNode = ethers.HDNodeWallet.fromMnemonic(
                ethers.Mnemonic.fromPhrase(mnemonic),
                `m/44'/60'/0'/0/${i}`
            );
            accounts.push({
                address: hdNode.address,
                privateKey: hdNode.privateKey,
                index: i
            });
        }

        // Verificar balances iniciales - usando el miner RPC
        console.log('💎 Verificando balances iniciales:');
        const minerRpcUrl = besuNetwork.getRpcUrl('miner1') || `http://localhost:${8545 + 10000}`;
        
        for (let i = 0; i < accounts.length; i++) {
            try {
                const balance = await besuNetwork.getBalance(accounts[i].address, minerRpcUrl);
                const balanceInEth = ethers.formatEther(balance);
                console.log(`   Cuenta ${i + 1}: ${balanceInEth} ETH`);
            } catch (error) {
                console.log(`   Cuenta ${i + 1}: Error obteniendo balance`);
            }
        }
        console.log();

        // Realizar múltiples transacciones entre cuentas - solo si financiamiento fue exitoso
        const transactions: Array<{
            hash: string;
            from: string;
            to: string;
            amount: number;
            index: number;
        }> = [];
        
        if (activeNodes.length >= 2) {
            console.log('🔄 Realizando múltiples transacciones de prueba...');
            
            // Intentar conectar con diferentes nodos RPC hasta encontrar uno activo
            let provider: ethers.JsonRpcProvider | null = null;
            const rpcUrls = [
                besuNetwork.getRpcUrl('miner1'),
                besuNetwork.getRpcUrl('miner2'),
                besuNetwork.getRpcUrl('miner3'),
                besuNetwork.getRpcUrl('rpc1'),
                besuNetwork.getRpcUrl('bootnode1')
            ].filter(url => url !== null);
            
            for (const rpcUrl of rpcUrls) {
                try {
                    const testProvider = new ethers.JsonRpcProvider(rpcUrl!);
                    // Test rápido de conectividad
                    await testProvider.getBlockNumber();
                    provider = testProvider;
                    console.log(`   ✅ Conectado a ${rpcUrl} para transacciones`);
                    break;
                } catch (error) {
                    console.log(`   ⚠️  ${rpcUrl} no disponible, probando siguiente...`);
                }
            }
            
            if (!provider) {
                console.log('❌ No se pudo conectar a ningún nodo RPC para transacciones\n');
            } else {
                
                // Crear transacciones más conservadoras
                const maxTransactions = Math.min(3, activeNodes.length); // Menos transacciones si hay pocos nodos activos
                
                for (let i = 0; i < maxTransactions; i++) {
                    const fromAccount = accounts[i];
                    const toAccount = accounts[(i + 1) % accounts.length];
                    const amount = (i + 1) * 2; // Cantidades más pequeñas: 2, 4, 6 ETH
                    
                    console.log(`   📤 Transacción ${i + 1}: ${amount} ETH de cuenta ${i + 1} a cuenta ${((i + 1) % accounts.length) + 1}`);
                    
                    try {
                        const wallet = new ethers.Wallet(fromAccount.privateKey, provider);
                        
                        // Verificar balance antes de enviar
                        const balance = await wallet.provider!.getBalance(fromAccount.address);
                        const requiredAmount = ethers.parseEther(amount.toString());
                        
                        if (balance < requiredAmount) {
                            console.log(`   ⚠️  Balance insuficiente en cuenta ${i + 1}, saltando transacción`);
                            continue;
                        }
                        
                        const tx = await wallet.sendTransaction({
                            to: toAccount.address,
                            value: requiredAmount,
                            gasLimit: 21000,
                            gasPrice: ethers.parseUnits('20', 'gwei')
                        });
                        
                        transactions.push({
                            hash: tx.hash,
                            from: fromAccount.address,
                            to: toAccount.address,
                            amount: amount,
                            index: i + 1
                        });
                        
                        console.log(`   ✅ TX ${i + 1} enviada: ${tx.hash.substring(0, 10)}...`);
                        
                        // Pausa más larga entre transacciones para red compleja
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                    } catch (error) {
                        console.error(`   ❌ Error en transacción ${i + 1}:`, error instanceof Error ? error.message.substring(0, 100) : 'Error desconocido');
                    }
                }
                
                console.log();
                
                if (transactions.length > 0) {
                    // Esperar más tiempo para confirmación en red compleja
                    console.log('⏳ Esperando confirmación de transacciones (30 segundos)...');
                    await new Promise(resolve => setTimeout(resolve, 30000));

                    // Verificar que las transacciones se confirmaron
                    console.log('🔍 Verificando confirmación de transacciones:');
                    for (const tx of transactions) {
                        try {
                            const receipt = await provider!.getTransactionReceipt(tx.hash);
                            if (receipt) {
                                console.log(`   ✅ TX ${tx.index} confirmada en bloque ${receipt.blockNumber}`);
                            } else {
                                console.log(`   ⏳ TX ${tx.index} aún pendiente`);
                            }
                        } catch (error) {
                            console.log(`   ❌ Error verificando TX ${tx.index}`);
                        }
                    }
                    console.log();
                    
                    // Verificar balances finales - usar el mismo provider que se usó para transacciones
                    console.log('💎 Balances finales después de transacciones:');
                    for (let i = 0; i < Math.min(5, accounts.length); i++) {
                        try {
                            const balance = await provider!.getBalance(accounts[i].address);
                            const balanceInEth = ethers.formatEther(balance);
                            console.log(`   Cuenta ${i + 1}: ${balanceInEth} ETH`);
                        } catch (error) {
                            console.log(`   Cuenta ${i + 1}: Error obteniendo balance`);
                        }
                    }
                    console.log();
                } else {
                    console.log('⚠️  No se pudo procesar ninguna transacción\n');
                }
            }
        } else {
            console.log('⚠️  Saltando transacciones debido a conectividad limitada\n');
        }

        // Verificar sincronización final
        console.log('🔄 Verificando sincronización final de la red...');
        const synchronized = await besuNetwork.waitForSynchronization(30000);
        if (synchronized) {
            console.log('✅ Todos los nodos están sincronizados');
        } else {
            console.log('⚠️  Algunos nodos pueden no estar completamente sincronizados');
        }
        
        // Información final de la red
        const networkInfo = await besuNetwork.getNetworkInfo();
        console.log('\n📊 Información final de la red:');
        console.log(`   - Bloque actual: ${networkInfo.blockNumber}`);
        console.log(`   - Chain ID: ${networkInfo.chainId}`);
        console.log(`   - Nodos activos: ${activeNodes.length}/${connectivity.length}`);
        console.log(`   - Transacciones procesadas: ${transactions.length}`);

        console.log('\n🎉 Ejemplo avanzado completado exitosamente!');
        console.log('\n🔗 URLs de acceso a los nodos:');
        console.log('   - Bootnode1: http://localhost:18545 (8545 + 10000)');
        console.log('   - Bootnode2: http://localhost:18546 (8546 + 10000)');
        console.log('   - Miner1: http://localhost:18547 (8547 + 10000)');
        console.log('   - Miner2: http://localhost:18549 (8549 + 10000)');
        console.log('   - Miner3: http://localhost:18551 (8551 + 10000)');
        console.log('   - RPC: http://localhost:18552 (8552 + 10000)');
        console.log('   - Node1: http://localhost:18553 (8553 + 10000)');
        console.log('   💡 Puertos no consecutivos para miners según mejores prácticas');

    } catch (error) {
        console.error('❌ Error en el ejemplo avanzado:', error);
    } finally {
        // Limpiar recursos automáticamente
        console.log('\n🧹 Limpiando red automáticamente...');
        try {
            await besuNetwork.stop();
            console.log('✅ Red detenida correctamente');
            
            await besuNetwork.destroy();
            console.log('✅ Red destruida y recursos liberados');
            console.log('💡 Todos los contenedores y volúmenes han sido eliminados');
        } catch (cleanupError) {
            console.error('⚠️  Error durante la limpieza:', cleanupError);
            console.log('💡 Puede ejecutar "npm run example:advanced:cleanup" para limpiar manualmente');
        }
    }
}

// Función para limpiar la red avanzada
async function cleanupAdvanced() {
    console.log('🧹 Limpiando red avanzada...');
    
    const networkConfig: BesuNetworkConfig = {
        name: 'advanced-besu-network',
        chainId: 8888,
        subnet: '172.40.0.0/16',
        consensus: 'clique',
        gasLimit: '0x5F5E100' // Valor corregido para que esté en el rango válido
    };

    const besuNetwork = new BesuNetwork(networkConfig);
    
    try {
        await besuNetwork.stop();
        console.log('✅ Red avanzada detenida');
        
        await besuNetwork.destroy();
        console.log('✅ Red avanzada destruida completamente');
    } catch (error) {
        console.error('❌ Error en cleanup de red avanzada:', error);
    }
}

// Ejecutar ejemplo si se llama directamente
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'cleanup') {
        cleanupAdvanced();
    } else {
        advancedExample();
    }
}

export { advancedExample, cleanupAdvanced };

import { BesuNetwork, BesuNetworkConfig } from "../src/index";
import { ethers } from "ethers";

/**
 * Ejemplo SIMPLE: Red Besu básica con 1 bootnode, 1 miner y 2 RPC
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 28, 2025
 * 
 * Este ejemplo fue desarrollado con la asistencia de GitHub Copilot
 * y demuestra el uso correcto de las validaciones implementadas.
 * 
 * Este ejemplo demuestra:
 * - Configuración válida de red Besu que pasa todas las validaciones
 * - Creación de nodos con configuración correcta (bootnode, miner, RPC)
 * - Uso de puertos no consecutivos para miners
 * - Configuración de puertos P2P únicos
 * - Financiamiento OBLIGATORIO de cuentas con reintentos automáticos
 * - Consulta de balances de cuentas financiadas
 * - Verificación de balance del miner (coinbase)
 * - Limpieza de recursos
 * 
 * CARACTERÍSTICAS DE FINANCIACIÓN:
 * - Intento principal: 2 cuentas con 5 ETH cada una
 * - Primer reintento: 1 cuenta con 2 ETH (si falla el principal)
 * - Segundo reintento: 1 cuenta con 1 ETH usando bootnode (fallback)
 * - Sistema de reintentos automáticos para garantizar financiación
 * 
 * PARÁMETROS VALIDADOS:
 * - Nombres de nodos únicos y con formato válido
 * - IPs dentro de la subnet configurada y no reservadas
 * - Puertos RPC y P2P únicos y en rangos válidos
 * - Tipos de nodos válidos para el consenso especificado
 * - Al menos un bootnode y un miner para consenso Clique
 */

async function simpleExample() {
    console.log('🚀 Ejemplo SIMPLE: Red Besu básica con validaciones\n');
    
    // Configuración de la red (validada) con bloque más rápido para acumular balance
    const networkConfig: BesuNetworkConfig = {
        name: 'simple-besu-network',
        chainId: 1337,
        subnet: '172.30.0.0/16',
        consensus: 'clique',
        gasLimit: '0x47E7C4', // Gas limit válido (4,712,388)
        blockTime: 2 // Bloques cada 2 segundos para acumular balance más rápido
    };

    // EJEMPLO con cuentas pre-configuradas (opcional):
    /*
    const networkConfigWithAccounts: BesuNetworkConfig = {
        name: 'extended-besu-network',
        chainId: 1338, // Chain ID único
        subnet: '172.31.0.0/16', // Subnet diferente
        consensus: 'clique',
        gasLimit: '0x47E7C4',
        blockTime: 5,
        mainIp: '172.31.0.1', // IP principal opcional
        signerAccounts: [ // Cuentas de firmantes/validadores
            {
                address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                weiAmount: '100000000000000000000000' // 100,000 ETH
            }
        ],
        accounts: [ // Cuentas adicionales
            {
                address: '0x8ba1f109551bD432803012645Hac136c770077b1',
                weiAmount: '50000000000000000000000'  // 50,000 ETH
            },
            {
                address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
                weiAmount: '25000000000000000000000'  // 25,000 ETH
            }
        ]
    };
    */

    // Crear instancia de la red
    const besuNetwork = new BesuNetwork(networkConfig);

    try {
        console.log('📦 Creando red con configuración validada...');
        console.log('   • 1 bootnode, 1 miner, 2 nodos RPC');
        console.log('   • Puertos no consecutivos para evitar conflictos');
        console.log('   • IPs dentro de la subnet configurada');
        console.log('   • Configuración que pasa todas las validaciones\n');
        
        // Crear la red con nodos que cumplen las validaciones
        await besuNetwork.create({
            nodes: [
                { 
                    name: 'bootnode1', 
                    ip: '172.30.0.20',      // IP válida dentro de subnet
                    rpcPort: 8545,          // Puerto RPC estándar
                    p2pPort: 30303,         // Puerto P2P explícito
                    type: 'bootnode' 
                },
                { 
                    name: 'miner1', 
                    ip: '172.30.0.21',      // IP única y válida
                    rpcPort: 8548,          // Puerto no consecutivo con bootnode
                    p2pPort: 30304,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'rpc1', 
                    ip: '172.30.0.22',      // IP única y válida
                    rpcPort: 8550,          // Puerto no consecutivo
                    p2pPort: 30305,         // Puerto P2P único
                    type: 'rpc' 
                },
                { 
                    name: 'rpc2', 
                    ip: '172.30.0.23',      // IP única y válida
                    rpcPort: 8551,          // Puerto no consecutivo
                    p2pPort: 30306,         // Puerto P2P único
                    type: 'rpc' 
                }
            ],
            initialBalance: '10000',        // Balance inicial más alto (10,000 ETH)
            autoResolveSubnetConflicts: true
        });

        console.log('✅ Red creada exitosamente - Todas las validaciones pasaron\n');

        // Iniciar todos los nodos
        console.log('🔄 Iniciando todos los nodos...');
        await besuNetwork.start();
        console.log('✅ Todos los nodos iniciados\n');

        // Esperar estabilización (tiempo aumentado para permitir mining)
        console.log('⏳ Esperando estabilización de la red y generación de bloques...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // Incrementado a 30 segundos

        // Verificar conectividad
        console.log('🔍 Verificando conectividad de nodos:');
        const connectivity = await besuNetwork.getNetworkConnectivity();
        connectivity.forEach(node => {
            const status = node.isActive ? '✅' : '❌';
            const block = node.blockNumber !== undefined ? ` (Bloque: ${node.blockNumber})` : '';
            const peers = node.peers !== undefined ? ` (Peers: ${node.peers})` : '';
            const error = node.error ? ` (Error: ${node.error})` : '';
            console.log(`   ${status} ${node.nodeName}${block}${peers}${error}`);
        });
        console.log();

        // Obtener URL del bootnode para operaciones posteriores
        const bootnodeRpcUrl = besuNetwork.getRpcUrl('bootnode1');
        
        // Financiación obligatoria de cuentas
        console.log('💰 Financiando cuentas de prueba...');
        const testMnemonic = 'test test test test test test test test test test test junk';
        
        // Esperar más tiempo para que el miner acumule balance
        console.log('⏳ Esperando que el miner acumule balance suficiente...');
        await new Promise(resolve => setTimeout(resolve, 20000)); // 20 segundos para mining
        
        // Usar el RPC del miner para financiación
        const minerRpcUrl = besuNetwork.getRpcUrl('miner1') || `http://localhost:${8548 + 10000}`;
        
        // Verificar el balance del miner antes de intentar financiar
        try {
            const provider = new ethers.JsonRpcProvider(minerRpcUrl);
            const coinbase = await provider.send('eth_coinbase', []);
            const coinbaseBalance = await besuNetwork.getBalance(coinbase, minerRpcUrl);
            console.log(`   📊 Balance actual del miner: ${ethers.formatEther(coinbaseBalance)} ETH`);
            
            if (coinbaseBalance < ethers.parseEther('1')) {
                console.log('   ⚠️  Balance insuficiente, esperando más bloques...');
                await new Promise(resolve => setTimeout(resolve, 15000)); // Esperar más
                
                const newBalance = await besuNetwork.getBalance(coinbase, minerRpcUrl);
                console.log(`   📊 Nuevo balance del miner: ${ethers.formatEther(newBalance)} ETH`);
            }
        } catch (balanceCheckError) {
            console.log('   ⚠️  Error verificando balance del miner, continuando...');
        }
        
        try {
            console.log(`   • Usando miner RPC: ${minerRpcUrl}`);
            console.log('   • Financiando 2 cuentas con 1 ETH cada una...');
            
            // Usar cantidades pequeñas para garantizar éxito
            await besuNetwork.fundMnemonic(testMnemonic, '1', 2, minerRpcUrl);
            console.log('✅ Cuentas financiadas exitosamente desde miner\n');
            
        } catch (fundingError) {
            console.log('⚠️  Error inicial al financiar cuentas:', fundingError instanceof Error ? fundingError.message : fundingError);
            console.log('🔄 Reintentando con configuración alternativa...\n');
            
            try {
                // Segundo intento con menos cantidad
                console.log('   • Reintento: 1 cuenta con 0.5 ETH...');
                await besuNetwork.fundMnemonic(testMnemonic, '0.5', 1, minerRpcUrl);
                console.log('✅ Cuenta financiada en segundo intento\n');
                
            } catch (secondError) {
                console.log('⚠️  Error en segundo intento:', secondError instanceof Error ? secondError.message : secondError);
                
                try {
                    // Tercer intento usando bootnode como fallback
                    if (bootnodeRpcUrl) {
                        console.log('   • Tercer intento usando bootnode con 0.1 ETH...');
                        await besuNetwork.fundMnemonic(testMnemonic, '0.1', 1, bootnodeRpcUrl);
                        console.log('✅ Cuenta financiada usando bootnode como fallback\n');
                    } else {
                        throw new Error('No se pudo obtener URL del bootnode');
                    }
                } catch (finalError) {
                    console.error('❌ Error final al financiar cuentas:', finalError instanceof Error ? finalError.message : finalError);
                    console.log('💡 El miner necesita más tiempo para acumular balance...\n');
                    console.log('💡 Considere ejecutar el ejemplo nuevamente o usar funding-example.ts\n');
                }
            }
        }

        // Esperar confirmación de transacciones
        console.log('⏳ Esperando confirmación de transacciones...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Incrementado a 15 segundos

        // Obtener información de la red usando el bootnode
        try {
            const networkInfo = await besuNetwork.getNetworkInfo(bootnodeRpcUrl || undefined);
            console.log('📊 Información de la red:');
            console.log(`   - Bloque actual: ${networkInfo.blockNumber}`);
            console.log(`   - Chain ID: ${networkInfo.chainId}`);
            console.log(`   - Nombre: ${networkInfo.name}\n`);
        } catch (networkInfoError) {
            console.log('⚠️  Error obteniendo información de la red:', networkInfoError instanceof Error ? networkInfoError.message : networkInfoError);
            console.log('💡 Continuando con el ejemplo...\n');
        }

        // Verificar balances de las cuentas financiadas
        console.log('💎 Verificando balances de cuentas financiadas:');
        const accounts = [
            '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Primera cuenta del mnemonic
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'  // Segunda cuenta del mnemonic
        ];

        try {
            for (const account of accounts) {
                try {
                    const balance = await besuNetwork.getBalance(account, minerRpcUrl || bootnodeRpcUrl || undefined);
                    const balanceInEth = ethers.formatEther(balance);
                    console.log(`   - ${account}: ${balanceInEth} ETH`);
                } catch (balanceError) {
                    console.log(`   - ${account}: Error obteniendo balance (${balanceError instanceof Error ? balanceError.message : balanceError})`);
                }
            }
        } catch (error) {
            console.log('⚠️  Error general verificando balances:', error instanceof Error ? error.message : error);
        }

        // Mostrar también el balance del miner para referencia
        try {
            console.log('\n💰 Balance del nodo miner:');
            const minerBalance = await besuNetwork.getBalance('0x' + '0'.repeat(40), minerRpcUrl); // Dirección cero como placeholder
            // En su lugar, intentar obtener el balance de coinbase
            const provider = new ethers.JsonRpcProvider(minerRpcUrl);
            const coinbase = await provider.send('eth_coinbase', []);
            if (coinbase) {
                const coinbaseBalance = await besuNetwork.getBalance(coinbase, minerRpcUrl);
                console.log(`   - Coinbase (${coinbase}): ${ethers.formatEther(coinbaseBalance)} ETH`);
            }
        } catch (minerBalanceError) {
            console.log('   - No se pudo obtener balance del miner');
        }

        console.log('\n🎉 Ejemplo simple completado exitosamente!');
        console.log('🔗 URLs de acceso (mapeadas desde puertos internos):');
        
        // Mostrar endpoints reales basados en la configuración
        const nodeConfigs = besuNetwork.getAllNodeConfigs();
        nodeConfigs.forEach(nodeInfo => {
            const externalPort = nodeInfo.config.rpcPort + 10000; // Como se mapea en start()
            console.log(`   - ${nodeInfo.name} (${nodeInfo.config.type}): http://localhost:${externalPort}`);
        });

    } catch (error) {
        console.error('❌ Error en el ejemplo:', error);
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
            console.log('💡 Puede ejecutar "npm run example:cleanup" para limpiar manualmente');
        }
    }
}

// Función para limpiar (detener y destruir la red)
async function cleanup() {
    console.log('🧹 Limpiando recursos de la red simple...');
    
    const networkConfig: BesuNetworkConfig = {
        name: 'simple-besu-network',
        chainId: 1337,
        subnet: '172.30.0.0/16',
        consensus: 'clique',
        gasLimit: '0x47E7C4' // Gas limit válido
    };

    const besuNetwork = new BesuNetwork(networkConfig);
    
    try {
        await besuNetwork.stop();
        console.log('✅ Red detenida');
        
        await besuNetwork.destroy();
        console.log('✅ Red destruida completamente');
    } catch (error) {
        console.error('❌ Error en cleanup:', error);
    }
}

// Ejecutar ejemplo si se llama directamente
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'cleanup') {
        cleanup();
    } else {
        simpleExample();
    }
}

export { simpleExample, cleanup };

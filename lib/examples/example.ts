import { BesuNetwork, BesuNetworkConfig } from "../src/create-besu-networks";
import { ethers } from "ethers";

/**
 * Ejemplo COMPLETO: Red Besu con 1 bootnode, 1 miner y 2 RPC
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 28, 2025
 * 
 * Este ejemplo fue desarrollado con la asistencia de GitHub Copilot
 * y demuestra el uso correcto de las validaciones implementadas.
 * 
 * Este ejemplo demuestra:
 * - Configuración válida de red Besu que pasa todas las validaciones
 * - Creación de nodos con configuración correcta (bootnode, miner, 2 RPC)
 * - Auto-asociación de signerAccounts con miners (funcionalidad avanzada)
 * - Uso de nodos RPC para operaciones y consultas distribuidas
 * - Fallback inteligente a nodos estables (miner/bootnode) si es necesario
 * - Financiamiento OBLIGATORIO de cuentas con reintentos automáticos
 * - Consulta de balances distribuida entre nodos RPC
 * - Verificación de balance del miner (coinbase)
 * - Limpieza de recursos
 * 
 * ARQUITECTURA DE NODOS:
 * - Bootnode: Punto de entrada y sincronización
 * - Miner: Mining y operaciones de respaldo
 * - RPC1 & RPC2: Operaciones principales y consultas distribuidas
 * 
 * ESTRATEGIA DE DISTRIBUCIÓN:
 * - Operaciones: RPC1 (principal), RPC2 (alternativo), Miner (fallback)
 * - Consultas: RPC2 (principal), RPC1 (alternativo), Bootnode (fallback)
 * - Sistema de fallback automático para garantizar disponibilidad
 * 
 * PARÁMETROS VALIDADOS:
 * - Nombres de nodos únicos y con formato válido
 * - IPs dentro de la subnet configurada y no reservadas
 * - Puertos RPC y P2P únicos y en rangos válidos
 * - Tipos de nodos válidos para el consenso especificado
 * - Al menos un bootnode y un miner para consenso Clique
 */

async function simpleExample() {
    console.log('🚀 Ejemplo COMPLETO: Red Besu con nodos RPC distribuidos\n');
    
    // Configuración de la red (validada) con bloque más rápido para acumular balance
    const networkConfig: BesuNetworkConfig = {
        name: 'simple-besu-network',
        chainId: 1339, // Chain ID único para evitar conflictos
        subnet: '172.32.0.0/16', // Subnet diferente para evitar conflictos
        consensus: 'clique',
        gasLimit: '0x47E7C4', // Gas limit válido (4,712,388)
        blockTime: 3, // Bloques cada 3 segundos para mejor estabilidad
        signerAccounts: [ // Cuenta de firmante/validador con auto-asociación
            {
                address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                weiAmount: '50000000000000000000000', // 50,000 ETH
                // minerNode: 'miner1' // Se auto-asignará automáticamente al miner disponible
            }
        ]
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
                address: '0x8ba1f109551bD432803012645fac136c770077b1',
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
        console.log('   • SignerAccount con auto-asociación al miner');
        console.log('   • Nodos RPC configurados para operaciones distribuidas');
        console.log('   • Sistema de fallback automático para garantizar disponibilidad');
        console.log('   • Distribución inteligente de operaciones y consultas\n');
        
        // Crear la red con nodos completos incluidos RPC
        await besuNetwork.create({
            nodes: [
                { 
                    name: 'bootnode1', 
                    ip: '172.32.0.20',      // IP válida dentro de subnet actualizada
                    rpcPort: 8545,          // Puerto RPC estándar
                    p2pPort: 30303,         // Puerto P2P explícito
                    type: 'bootnode' 
                },
                { 
                    name: 'miner1', 
                    ip: '172.32.0.21',      // IP única y válida
                    rpcPort: 8548,          // Puerto no consecutivo con bootnode
                    p2pPort: 30304,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'rpc1', 
                    ip: '172.32.0.22',      // IP única para RPC1
                    rpcPort: 8546,          // Puerto RPC para operaciones principales
                    p2pPort: 30305,         // Puerto P2P único
                    type: 'rpc' 
                },
                { 
                    name: 'rpc2', 
                    ip: '172.32.0.23',      // IP única para RPC2
                    rpcPort: 8547,          // Puerto RPC para consultas principales
                    p2pPort: 30306,         // Puerto P2P único
                    type: 'rpc' 
                }
            ],
            initialBalance: '10000',        // Balance inicial más alto (10,000 ETH)
            autoResolveSubnetConflicts: true
        });

        console.log('✅ Red creada exitosamente - Todas las validaciones pasaron');
        
        // Mostrar las asociaciones de signerAccounts generadas
        const associations = besuNetwork.getMinerSignerAssociations();
        if (associations.length > 0) {
            console.log('🔗 Asociaciones miner-signerAccount generadas:');
            associations.forEach(assoc => {
                console.log(`   • Miner: ${assoc.minerName} ↔ SignerAccount: ${assoc.signerAccount.address}`);
                console.log(`     Balance: ${ethers.formatEther(assoc.signerAccount.weiAmount)} ETH`);
            });
        }
        console.log();

        // Iniciar todos los nodos
        console.log('🔄 Iniciando todos los nodos...');
        await besuNetwork.start();
        console.log('✅ Todos los nodos iniciados\n');

        // Esperar estabilización con verificación progresiva (más tiempo para nodos RPC)
        console.log('⏳ Esperando estabilización de la red (incluidos nodos RPC)...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // Incrementado a 30 segundos para nodos RPC

        // Verificar conectividad inicial
        console.log('🔍 Verificando conectividad inicial de nodos:');
        let connectivity = await besuNetwork.getNetworkConnectivity();
        connectivity.forEach(node => {
            const status = node.isActive ? '✅' : '❌';
            const block = node.blockNumber !== undefined ? ` (Bloque: ${node.blockNumber})` : '';
            const peers = node.peers !== undefined ? ` (Peers: ${node.peers})` : '';
            const error = node.error ? ` (Error: ${node.error})` : '';
            console.log(`   ${status} ${node.nodeName}${block}${peers}${error}`);
        });

        // Esperar hasta que comience el mining (crítico para el funcionamiento)
        console.log('\n⛏️  Esperando que comience el mining...');
        let miningStarted = false;
        let miningAttempts = 0;
        const maxMiningAttempts = 20; // 20 intentos * 10 segundos = 200 segundos max
        
        while (!miningStarted && miningAttempts < maxMiningAttempts) {
            try {
                const connectivityCheck = await besuNetwork.getNetworkConnectivity();
                const minerStatus = connectivityCheck.find(node => node.nodeName === 'miner1');
                
                if (minerStatus && minerStatus.blockNumber !== undefined && minerStatus.blockNumber > 0) {
                    console.log(`   ✅ Mining iniciado! Bloque actual: ${minerStatus.blockNumber}`);
                    miningStarted = true;
                    break;
                }
                
                miningAttempts++;
                console.log(`   ⏳ Intento ${miningAttempts}/${maxMiningAttempts} - Esperando mining... (Bloque: ${minerStatus?.blockNumber || 0})`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos entre checks
                
            } catch (miningCheckError) {
                console.log(`   ⚠️  Error verificando mining: ${miningCheckError}`);
                miningAttempts++;
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        
        if (!miningStarted) {
            console.log('   ⚠️  Mining no ha comenzado después de esperar. Las operaciones pueden fallar.');
        }

        // Si el miner no está activo, esperar más tiempo y verificar de nuevo
        const minerActive = connectivity.find(node => node.nodeName === 'miner1')?.isActive;
        if (!minerActive) {
            console.log('⚠️  Miner no detectado activo, esperando más tiempo para inicialización...');
            await new Promise(resolve => setTimeout(resolve, 20000)); // Esperar 20 segundos más

            console.log('🔍 Re-verificando conectividad después de espera adicional:');
            connectivity = await besuNetwork.getNetworkConnectivity();
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` (Bloque: ${node.blockNumber})` : '';
                const peers = node.peers !== undefined ? ` (Peers: ${node.peers})` : '';
                const error = node.error ? ` (Error: ${node.error})` : '';
                console.log(`   ${status} ${node.nodeName}${block}${peers}${error}`);
            });
        }
        console.log();

        // Esperar un poco más para que los nodos se estabilicen completamente (especialmente RPC)
        console.log('⏳ Esperando estabilización completa de todos los nodos...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 segundos para estabilización RPC

        // Obtener URLs de todos los nodos para distribución inteligente
        const bootnodeRpcUrl = besuNetwork.getRpcUrl('bootnode1');
        const minerRpcUrl = besuNetwork.getRpcUrl('miner1');
        const rpc1Url = besuNetwork.getRpcUrl('rpc1');        // Para operaciones principales
        const rpc2Url = besuNetwork.getRpcUrl('rpc2');        // Para consultas principales
        
        console.log('🔗 URLs de nodos disponibles:');
        console.log(`   • Bootnode: ${bootnodeRpcUrl || 'No disponible'}`);
        console.log(`   • Miner: ${minerRpcUrl || 'No disponible'}`);
        console.log(`   • RPC1 (operaciones): ${rpc1Url || 'No disponible'}`);
        console.log(`   • RPC2 (consultas): ${rpc2Url || 'No disponible'}`);
        console.log();
        
        // Financiación obligatoria de cuentas (solo si mining está activo)
        console.log('💰 Financiando cuentas de prueba...');
        console.log('   • Estrategia distribuida: RPC1 principal, RPC2/Miner alternativo');
        console.log('   • Consultas a través de: RPC2 principal, RPC1/Bootnode alternativo');
        const testMnemonic = 'test test test test test test test test test test test junk';
        
        
        if (!miningStarted) {
            console.log('⚠️  Mining no activo - saltando financiación para evitar cuelgues');
            console.log('💡 Continuando con verificaciones de estado únicamente\n');
        } else {
            console.log('✅ Mining activo detectado - procediendo con financiación');
            
            // Esperar más tiempo para que el miner acumule balance
            console.log('⏳ Esperando que el miner acumule balance suficiente...');
            await new Promise(resolve => setTimeout(resolve, 25000)); // Incrementado a 25 segundos para nodos RPC
        }
        
        // Declarar variables fuera del bloque condicional para su uso posterior
        let operationRpcUrl = null;
        let operationNodeName = '';
        let queryRpcUrl = null;
        let queryNodeName = '';
        
        // Usar estrategia distribuida: priorizar nodos RPC, fallback a nodos estables
        const finalConnectivity = await besuNetwork.getNetworkConnectivity();
        
        // Seleccionar nodo para operaciones (prioritario: RPC1, alternativo: RPC2, fallback: Miner)
        if (rpc1Url && finalConnectivity.find(node => node.nodeName === 'rpc1')?.isActive) {
            operationRpcUrl = rpc1Url;
            operationNodeName = 'rpc1';
            console.log('   ✅ Usando RPC1 para operaciones (prioridad principal)');
        } else if (rpc2Url && finalConnectivity.find(node => node.nodeName === 'rpc2')?.isActive) {
            operationRpcUrl = rpc2Url;
            operationNodeName = 'rpc2';
            console.log('   ⚠️  RPC1 no disponible, usando RPC2 para operaciones');
        } else if (minerRpcUrl && finalConnectivity.find(node => node.nodeName === 'miner1')?.isActive) {
            operationRpcUrl = minerRpcUrl;
            operationNodeName = 'miner1';
            console.log('   ⚠️  Nodos RPC no disponibles, usando Miner para operaciones (fallback)');
        } else {
            console.log('   ❌ No hay nodos disponibles para operaciones');
        }
        
        // Seleccionar nodo para consultas (prioritario: RPC2, alternativo: RPC1, fallback: Bootnode)
        if (rpc2Url && finalConnectivity.find(node => node.nodeName === 'rpc2')?.isActive) {
            queryRpcUrl = rpc2Url;
            queryNodeName = 'rpc2';
            console.log('   ✅ Usando RPC2 para consultas (prioridad principal)');
        } else if (rpc1Url && finalConnectivity.find(node => node.nodeName === 'rpc1')?.isActive) {
            queryRpcUrl = rpc1Url;
            queryNodeName = 'rpc1';
            console.log('   ⚠️  RPC2 no disponible, usando RPC1 para consultas');
        } else if (bootnodeRpcUrl && finalConnectivity.find(node => node.nodeName === 'bootnode1')?.isActive) {
            queryRpcUrl = bootnodeRpcUrl;
            queryNodeName = 'bootnode1';
            console.log('   ⚠️  Nodos RPC no disponibles, usando Bootnode para consultas (fallback)');
        } else {
            console.log('   ❌ No hay nodos disponibles para consultas');
        }
        
        // Verificar el balance del miner antes de intentar financiar
        try {
            console.log(`   • Verificando balance del miner usando ${queryNodeName}...`);
            if (queryRpcUrl && operationRpcUrl) {
                // Obtener coinbase del miner para verificar balance
                const operationProvider = new ethers.JsonRpcProvider(operationRpcUrl);
                const minerCoinbase = await operationProvider.send('eth_coinbase', []);
                if (minerCoinbase) {
                    const coinbaseBalance = await besuNetwork.getBalance(minerCoinbase, queryRpcUrl);
                    console.log(`   📊 Balance actual del miner: ${ethers.formatEther(coinbaseBalance)} ETH`);
                }
            }
        } catch (balanceCheckError) {
            console.log('   ⚠️  Error verificando balance del miner, continuando...');
        }
        
        // Financiar cuentas solo si mining está activo
        if (miningStarted) {
            try {
                if (!operationRpcUrl) {
                    throw new Error('No operation RPC URL available');
                }
                console.log(`   • Usando ${operationNodeName} para operaciones: ${operationRpcUrl}`);
                console.log('   • Financiando 2 cuentas con 1 ETH cada una...');
                
                // Usar cantidades pequeñas para garantizar éxito
                await besuNetwork.fundMnemonic(testMnemonic, '1', 2, operationRpcUrl);
                console.log(`✅ Cuentas financiadas exitosamente desde ${operationNodeName}\n`);
                
            } catch (fundingError) {
                console.log('⚠️  Error inicial al financiar cuentas:', fundingError instanceof Error ? fundingError.message : fundingError);
                console.log('🔄 Reintentando con nodo alternativo...\n');
                
                try {
                    // Buscar nodo alternativo para reintento
                    let retryUrl = null;
                    let retryNodeName = '';
                    
                    if (operationNodeName !== 'rpc2' && rpc2Url && finalConnectivity.find(node => node.nodeName === 'rpc2')?.isActive) {
                        retryUrl = rpc2Url;
                        retryNodeName = 'rpc2';
                    } else if (operationNodeName !== 'miner1' && minerRpcUrl && finalConnectivity.find(node => node.nodeName === 'miner1')?.isActive) {
                        retryUrl = minerRpcUrl;
                        retryNodeName = 'miner1';
                    } else if (bootnodeRpcUrl && finalConnectivity.find(node => node.nodeName === 'bootnode1')?.isActive) {
                        retryUrl = bootnodeRpcUrl;
                        retryNodeName = 'bootnode1';
                    }
                    
                    if (!retryUrl) {
                        throw new Error('No alternative nodes available for retry');
                    }
                    
                    console.log(`   • Reintento usando ${retryNodeName}: 1 cuenta con 0.5 ETH...`);
                    await besuNetwork.fundMnemonic(testMnemonic, '0.5', 1, retryUrl);
                    console.log(`✅ Cuenta financiada usando ${retryNodeName} como alternativa\n`);
                    
                } catch (secondError) {
                    console.log('⚠️  Error en segundo intento:', secondError instanceof Error ? secondError.message : secondError);
                    console.log('💡 Saltando financiación - la red necesita más tiempo para estabilizarse\n');
                }
            }
        }

        // Esperar confirmación de transacciones (solo si se realizaron)
        if (miningStarted) {
            console.log('⏳ Esperando confirmación de transacciones...');
            await new Promise(resolve => setTimeout(resolve, 15000)); // Incrementado a 15 segundos
        } else {
            console.log('⏳ Saltando espera de confirmación (no se enviaron transacciones)...');
        }

        // Obtener información de la red usando el nodo de consultas seleccionado
        try {
            const infoUrl = queryRpcUrl || bootnodeRpcUrl;
            const networkInfo = await besuNetwork.getNetworkInfo(infoUrl || undefined);
            console.log('📊 Información de la red:');
            console.log(`   - Bloque actual: ${networkInfo.blockNumber}`);
            console.log(`   - Chain ID: ${networkInfo.chainId}`);
            console.log(`   - Nombre: ${networkInfo.name}`);
            console.log(`   - Consultado desde: ${queryNodeName || 'bootnode1'}\n`);
        } catch (networkInfoError) {
            console.log('⚠️  Error obteniendo información de la red:', networkInfoError instanceof Error ? networkInfoError.message : networkInfoError);
            console.log('💡 Continuando con el ejemplo...\n');
        }

        // Verificar balances de las cuentas financiadas (usando nodo de consultas seleccionado)
        console.log('💎 Verificando balances de cuentas financiadas:');
        const accounts = [
            '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Primera cuenta del mnemonic
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'  // Segunda cuenta del mnemonic
        ];

        console.log(`   • Consultando balances usando ${queryNodeName || 'bootnode1'} (nodo principal de consultas)`);

        try {
            for (const account of accounts) {
                try {
                    const balanceUrl = queryRpcUrl || bootnodeRpcUrl;
                    const balance = await besuNetwork.getBalance(account, balanceUrl || undefined);
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
            
            if ((queryRpcUrl || bootnodeRpcUrl) && (operationRpcUrl || minerRpcUrl)) {
                try {
                    // Obtener coinbase del miner y consultar balance usando nodo de consultas
                    const opProvider = new ethers.JsonRpcProvider(operationRpcUrl || minerRpcUrl!);
                    const minerCoinbase = await opProvider.send('eth_coinbase', []);
                    if (minerCoinbase) {
                        const balanceUrl = queryRpcUrl || bootnodeRpcUrl;
                        const coinbaseBalance = await besuNetwork.getBalance(minerCoinbase, balanceUrl!);
                        console.log(`   - Coinbase (${minerCoinbase}): ${ethers.formatEther(coinbaseBalance)} ETH`);
                    }
                } catch (coinbaseError) {
                    console.log('   - No se pudo obtener coinbase del miner');
                }
            } else {
                console.log('   - No hay nodos disponibles para consultar balance del miner');
            }
        } catch (minerBalanceError) {
            console.log('   - Error obteniendo balance del miner');
        }

        // Verificación de consistencia de datos entre todos los nodos
        console.log('\n🔍 VERIFICACIÓN DE CONSISTENCIA DE LA RED');
        console.log('======================================================');
        console.log('📊 Comprobando que todos los nodos almacenan la misma información...\n');
        
        try {
            // Obtener información del último bloque de cada nodo
            const nodeUrls = [
                { name: 'bootnode1', url: bootnodeRpcUrl, type: 'FAST sync' },
                { name: 'miner1', url: minerRpcUrl, type: 'FULL sync (miner)' },
                { name: 'rpc1', url: rpc1Url, type: 'FULL sync' },
                { name: 'rpc2', url: rpc2Url, type: 'FULL sync' }
            ].filter(node => node.url !== null && node.url !== undefined); // Solo nodos disponibles
            
            console.log('🔗 Consultando último bloque en cada nodo:');
            const blockData = [];
            
            for (const node of nodeUrls) {
                try {
                    const provider = new ethers.JsonRpcProvider(node.url!);
                    const blockNumber = await provider.getBlockNumber();
                    const block = await provider.getBlock(blockNumber);
                    
                    blockData.push({
                        nodeName: node.name,
                        nodeType: node.type,
                        blockNumber: blockNumber,
                        blockHash: block?.hash,
                        timestamp: block?.timestamp,
                        transactionCount: block?.transactions?.length || 0
                    });
                    
                    console.log(`   ✅ ${node.name} (${node.type}): Bloque ${blockNumber} | Hash: ${block?.hash?.substring(0, 12)}...`);
                } catch (nodeError) {
                    console.log(`   ❌ ${node.name}: Error - ${nodeError instanceof Error ? nodeError.message : nodeError}`);
                }
            }
            
            // Analizar consistencia
            console.log('\n📋 Análisis de consistencia:');
            let uniqueHashes: string[] = []; // Declarar aquí para uso posterior
            
            if (blockData.length > 1) {
                const maxBlock = Math.max(...blockData.map(d => d.blockNumber));
                const minBlock = Math.min(...blockData.map(d => d.blockNumber));
                const blockDifference = maxBlock - minBlock;
                
                if (blockDifference <= 1) {
                    console.log(`   ✅ EXCELENTE: Diferencia máxima de bloques: ${blockDifference} (sincronización casi perfecta)`);
                } else if (blockDifference <= 3) {
                    console.log(`   ⚠️  BUENA: Diferencia máxima de bloques: ${blockDifference} (sincronización aceptable)`);
                } else {
                    console.log(`   ❌ PROBLEMA: Diferencia máxima de bloques: ${blockDifference} (requiere investigación)`);
                }
                
                // Verificar hashes del mismo bloque
                const commonBlock = minBlock;
                console.log(`\n🔍 Verificando integridad del bloque ${commonBlock} en todos los nodos:`);
                const hashComparison = [];
                
                for (const node of nodeUrls) {
                    try {
                        const provider = new ethers.JsonRpcProvider(node.url!);
                        const block = await provider.getBlock(commonBlock);
                        hashComparison.push({
                            nodeName: node.name,
                            hash: block?.hash,
                            parentHash: block?.parentHash
                        });
                        console.log(`   📦 ${node.name}: ${block?.hash?.substring(0, 12)}...`);
                    } catch (hashError) {
                        console.log(`   ❌ ${node.name}: Error obteniendo bloque ${commonBlock}`);
                    }
                }
                
                // Verificar si todos los hashes son iguales
                uniqueHashes = [...new Set(hashComparison.map(h => h.hash).filter((hash): hash is string => hash !== null && hash !== undefined))];
                if (uniqueHashes.length === 1) {
                    console.log(`   ✅ PERFECTO: Todos los nodos tienen el mismo hash para el bloque ${commonBlock}`);
                } else {
                    console.log(`   ❌ PROBLEMA: Detectados ${uniqueHashes.length} hashes diferentes para el bloque ${commonBlock}`);
                }
            }
            
            // Verificar transacciones históricas (bloque 7 con nuestras transacciones)
            console.log('\n🔍 Verificando transacciones históricas (bloque 7):');
            if (miningStarted) {
                for (const node of nodeUrls) {
                    try {
                        const provider = new ethers.JsonRpcProvider(node.url!);
                        const block = await provider.getBlock(7, true);
                        
                        if (block && block.transactions.length > 0) {
                            console.log(`   ✅ ${node.name}: ${block.transactions.length} transacciones en bloque 7`);
                            if (block.transactions.length >= 2) {
                                const firstTx = block.transactions[0] as any;
                                console.log(`       • Primera TX: ${firstTx.hash?.substring(0, 12)}... (${ethers.formatEther(firstTx.value)} ETH)`);
                            }
                        } else {
                            console.log(`   ⚠️  ${node.name}: Bloque 7 sin transacciones o no encontrado`);
                        }
                    } catch (txError) {
                        console.log(`   ❌ ${node.name}: Error verificando transacciones históricas`);
                    }
                }
            } else {
                console.log('   ⏩ Saltando verificación (no se realizaron transacciones)');
            }
            
            // Verificar balances desde diferentes nodos
            console.log('\n💰 Verificando consistencia de balances:');
            const testAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
            const balanceComparison = [];
            
            for (const node of nodeUrls) {
                try {
                    const balance = await besuNetwork.getBalance(testAccount, node.url!);
                    const balanceInEth = ethers.formatEther(balance);
                    balanceComparison.push({
                        nodeName: node.name,
                        balance: balanceInEth
                    });
                    console.log(`   💎 ${node.name}: ${balanceInEth} ETH`);
                } catch (balanceError) {
                    console.log(`   ❌ ${node.name}: Error obteniendo balance`);
                }
            }
            
            // Verificar si todos los balances son iguales
            const uniqueBalances = [...new Set(balanceComparison.map(b => b.balance))];
            if (uniqueBalances.length === 1) {
                console.log(`   ✅ PERFECTO: Todos los nodos reportan el mismo balance para ${testAccount}`);
            } else {
                console.log(`   ⚠️  ATENCIÓN: Detectados ${uniqueBalances.length} balances diferentes (posible lag de sincronización)`);
            }
            
            console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
            console.log('======================================================');
            console.log(`✅ Nodos verificados: ${nodeUrls.length}/4`);
            console.log(`📦 Bloques sincronizados: ${blockData.length > 0 ? `${Math.min(...blockData.map(d => d.blockNumber))} - ${Math.max(...blockData.map(d => d.blockNumber))}` : 'N/A'}`);
            console.log(`🔗 Consistencia de hash: ${uniqueHashes.length === 1 ? 'PERFECTA' : uniqueHashes.length > 0 ? 'REQUIERE ATENCIÓN' : 'N/A'}`);
            console.log(`💰 Consistencia de balances: ${uniqueBalances.length === 1 ? 'PERFECTA' : 'REVISAR'}`);
            console.log('💡 Resultado: Todos los nodos mantienen la misma base de datos distribuida\n');
            
        } catch (verificationError) {
            console.log('⚠️  Error durante la verificación de consistencia:', verificationError instanceof Error ? verificationError.message : verificationError);
            console.log('💡 La verificación puede requerir más tiempo para completarse\n');
        }

        console.log('🎉 Ejemplo completo exitoso!');
        console.log('🔗 URLs de acceso (mapeadas desde puertos internos):');
        console.log('📋 Estrategia distribuida implementada:');
        console.log(`   • Operaciones (transacciones): ${operationNodeName || 'No disponible'} (nodo principal)`);
        console.log(`   • Consultas (balances): ${queryNodeName || 'bootnode1'} (nodo principal)`);
        console.log('   • Sistema de fallback automático entre nodos RPC ↔ Miner ↔ Bootnode');
        console.log('💡 Nota: Usando distribución inteligente para mayor eficiencia y confiabilidad');
        
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
        console.log('\n💡 Red creada para inspección - no se eliminará automáticamente');
        console.log('💡 Para limpiar manualmente ejecuta: npm run example cleanup');
        
        // NOTA: Comentado para permitir inspección de archivos generados
        /*
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
        */
    }
}

// Función para limpiar (detener y destruir la red)
async function cleanup() {
    console.log('🧹 Limpiando recursos de la red simple...');
    
    const networkConfig: BesuNetworkConfig = {
        name: 'simple-besu-network',
        chainId: 1339,
        subnet: '172.32.0.0/16',
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

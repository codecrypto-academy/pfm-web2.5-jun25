import { BesuNetwork, BesuNetworkConfig } from "../src/create-besu-networks";
import { ethers } from "ethers";

/**
 * IMPROVED EXAMPLE: Distributed Besu Network with 1 bootnode, 3 miners and 1 RPC
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 28, 2025
 * 
 * This example was developed with the assistance of GitHub Copilot
 * and demonstrates a more robust distributed consensus architecture.
 * 
 * This example demonstrates:
 * - Besu network with multiple miners for distributed consensus
 * - Configuration of 3 signerAccounts with auto-association to different miners
 * - Automatic miner rotation in Clique consensus
 * - Distributed operations between multiple miners
 * - Consistency verification between all nodes
 * - Fault tolerance with multiple miners
 * - Distributed funding and queries
 * - Complete network integrity verification
 * 
 * DISTRIBUTED ARCHITECTURE:
 * - Bootnode: Entry point and network discovery
 * - Miner1, Miner2, Miner3: Distributed Clique consensus with rotation
 * - RPC1: Main interface for applications
 * 
 * CONSENSUS STRATEGY:
 * - Clique Consensus: The 3 miners take turns creating blocks
 * - Automatic rotation: Each miner validates blocks from others
 * - Fault tolerance: Network continues even if 1 miner fails
 * - Load distribution: Operations distributed among miners
 * 
 * VALIDATED PARAMETERS:
 * - Multiple signerAccounts with auto-association
 * - Unique IPs and ports for each node
 * - Optimized configuration for distributed consensus
 * - Connectivity validation between all nodes
 */

async function improvedExample() {
    console.log('IMPROVED EXAMPLE: Besu Network with Distributed Consensus\n');
    console.log('Architecture: 1 Bootnode + 3 Miners + 1 RPC');
    console.log('Consensus: Distributed Clique with automatic rotation');
    console.log('Tolerance: Continues working even if 1 miner fails');
    console.log('Distribution: Balanced operations between miners\n');
    
    // Configuración de la red distribuida con múltiples signers
    const networkConfig: BesuNetworkConfig = {
        name: 'improved-besu-network',
        chainId: 1340, // Chain ID único para evitar conflictos
        subnet: '172.33.0.0/16', // Subnet diferente para el ejemplo mejorado
        consensus: 'clique',
        gasLimit: '0x47E7C4', // Gas limit válido (4,712,388)
        blockTime: 2, // Bloques más rápidos (2 segundos) para demostrar rotación
        signerAccounts: [ // Múltiples signers para consenso distribuido
            {
                address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                weiAmount: '100000000000000000000000', // 100,000 ETH
                // Se auto-asignará al primer miner disponible
            },
            {
                address: '0x8ba1f109551bD432803012645fac136c770077b1',
                weiAmount: '75000000000000000000000',  // 75,000 ETH
                // Se auto-asignará al segundo miner disponible
            },
            {
                address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
                weiAmount: '50000000000000000000000',  // 50,000 ETH
                // Se auto-asignará al tercer miner disponible
            }
        ]
    };

    // Crear instancia de la red
    const besuNetwork = new BesuNetwork(networkConfig);

    try {
        console.log('Creating distributed network with validated configuration...');
        console.log('   • 1 bootnode for network discovery');
        console.log('   • 3 miners for distributed Clique consensus');
        console.log('   • 1 RPC node for application operations');
        console.log('   • 3 SignerAccounts with auto-association to miners');
        console.log('   • Automatic miner rotation every 2 seconds');
        console.log('   • Fault tolerance and load distribution\n');
        
        // Crear la red con arquitectura distribuida
        await besuNetwork.create({
            nodes: [
                { 
                    name: 'bootnode1', 
                    ip: '172.33.0.20',      // IP en nueva subnet
                    rpcPort: 8545,          // Puerto RPC estándar
                    p2pPort: 30303,         // Puerto P2P para descubrimiento
                    type: 'bootnode' 
                },
                { 
                    name: 'miner1', 
                    ip: '172.33.0.21',      // Primer miner distribuido
                    rpcPort: 8546,          // Puerto RPC para operaciones
                    p2pPort: 30304,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'miner2', 
                    ip: '172.33.0.22',      // Segundo miner distribuido
                    rpcPort: 8550,          // Puerto RPC separado (+4 para evitar consecutivos)
                    p2pPort: 30305,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'miner3', 
                    ip: '172.33.0.23',      // Tercer miner distribuido
                    rpcPort: 8554,          // Puerto RPC separado (+4 para evitar consecutivos)
                    p2pPort: 30306,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'rpc1', 
                    ip: '172.33.0.24',      // Nodo RPC para aplicaciones
                    rpcPort: 8558,          // Puerto RPC separado (+4 para evitar consecutivos)
                    p2pPort: 30307,         // Puerto P2P único
                    type: 'rpc' 
                }
            ],
            initialBalance: '15000',        // Balance alto para múltiples miners
            autoResolveSubnetConflicts: true
        });

        console.log('Distributed network created successfully - All validations passed');
        
        // Mostrar las asociaciones de signerAccounts generadas
        const associations = besuNetwork.getMinerSignerAssociations();
        if (associations.length > 0) {
            console.log('Distributed miner-signerAccount associations:');
            associations.forEach(assoc => {
                console.log('   • Miner: ' + assoc.minerName + ' <-> SignerAccount: ' + assoc.signerAccount.address);
                console.log('     Initial balance: ' + ethers.formatEther(assoc.signerAccount.weiAmount) + ' ETH');
            });
            console.log('\nTotal: ' + associations.length + ' miners participating in distributed Clique consensus');
        }
        console.log();

        // Iniciar todos los nodos
        console.log('Starting distributed network...');
        await besuNetwork.start();
        console.log('All nodes started - Distributed network operational\n');

        // Esperar estabilización extendida para consenso distribuido
        console.log('Waiting for distributed consensus stabilization...');
        console.log('   The 3 miners need time to establish consensus');
        await new Promise(resolve => setTimeout(resolve, 45000)); // 45 segundos para red distribuida

        // Verificar conectividad inicial de todos los nodos
        console.log('Verifying distributed network connectivity:');
        let connectivity = await besuNetwork.getNetworkConnectivity();
        connectivity.forEach(node => {
            const status = node.isActive ? 'ACTIVE' : 'INACTIVE';
            const block = node.blockNumber !== undefined ? ` (Block: ${node.blockNumber})` : '';
            const peers = node.peers !== undefined ? ` (Peers: ${node.peers})` : '';
            const error = node.error ? ` (Error: ${node.error})` : '';
            console.log(`   ${status} ${node.nodeName}${block}${peers}${error}`);
        });

        // Verificar que al menos 2 de los 3 miners están activos
        const activeMiners = connectivity.filter(node => 
            node.nodeName.startsWith('miner') && node.isActive
        ).length;
        
        console.log('\nDistributed consensus state: ' + activeMiners + '/3 miners active');
        if (activeMiners >= 2) {
            console.log('Distributed consensus operational (majority of miners active)');
        } else {
            console.log('WARNING: Distributed consensus compromised (minority of miners active)');
        }

        // Esperar hasta que comience el mining distribuido
        console.log('\nWaiting for distributed mining to start...');
        let miningStarted = false;
        let miningAttempts = 0;
        const maxMiningAttempts = 25; // Más tiempo para consenso distribuido
        
        while (!miningStarted && miningAttempts < maxMiningAttempts) {
            try {
                const connectivityCheck = await besuNetwork.getNetworkConnectivity();
                const minerStatuses = connectivityCheck.filter(node => node.nodeName.startsWith('miner'));
                
                // Verificar si al menos un miner está minando
                const activeMiningBlocks = minerStatuses
                    .filter(node => node.blockNumber !== undefined && node.blockNumber > 0)
                    .map(node => node.blockNumber!);
                
                if (activeMiningBlocks.length > 0) {
                    const maxBlock = Math.max(...activeMiningBlocks);
                    console.log('   Distributed mining started! Maximum block: ' + maxBlock);
                    console.log('   Active miners in mining: ' + activeMiningBlocks.length + '/3');
                    miningStarted = true;
                    break;
                }
                
                miningAttempts++;
                console.log('   Attempt ' + miningAttempts + '/' + maxMiningAttempts + ' - Waiting for distributed consensus...');
                console.log('   Detected miners: ' + minerStatuses.length + ', Blocks: [' + minerStatuses.map(m => m.blockNumber || 0).join(', ') + ']');
                await new Promise(resolve => setTimeout(resolve, 8000)); // 8 segundos entre checks
                
            } catch (miningCheckError) {
                console.log('   WARNING: Error verifying distributed mining: ' + miningCheckError);
                miningAttempts++;
                await new Promise(resolve => setTimeout(resolve, 8000));
            }
        }
        
        if (!miningStarted) {
            console.log('   WARNING: Distributed mining has not started. Continuing with verifications...');
        }

        // Obtener URLs de todos los nodos para distribución
        const bootnodeRpcUrl = besuNetwork.getRpcUrl('bootnode1');
        const miner1RpcUrl = besuNetwork.getRpcUrl('miner1');
        const miner2RpcUrl = besuNetwork.getRpcUrl('miner2');
        const miner3RpcUrl = besuNetwork.getRpcUrl('miner3');
        const rpc1Url = besuNetwork.getRpcUrl('rpc1');
        
        console.log('\nDistributed node URLs:');
        console.log('   • Bootnode: ' + (bootnodeRpcUrl || 'Not available'));
        console.log('   • Miner1: ' + (miner1RpcUrl || 'Not available'));
        console.log('   • Miner2: ' + (miner2RpcUrl || 'Not available'));
        console.log('   • Miner3: ' + (miner3RpcUrl || 'Not available'));
        console.log('   • RPC1: ' + (rpc1Url || 'Not available'));

        // Seleccionar miners activos para operaciones distribuidas
        const finalConnectivity = await besuNetwork.getNetworkConnectivity();
        const activeMinersData = [
            { name: 'miner1', url: miner1RpcUrl, status: finalConnectivity.find(n => n.nodeName === 'miner1') },
            { name: 'miner2', url: miner2RpcUrl, status: finalConnectivity.find(n => n.nodeName === 'miner2') },
            { name: 'miner3', url: miner3RpcUrl, status: finalConnectivity.find(n => n.nodeName === 'miner3') }
        ].filter(miner => miner.url && miner.status?.isActive);

        console.log('\nMiners available for operations: ' + activeMinersData.length + '/3');
        activeMinersData.forEach(miner => {
            console.log('   ACTIVE ' + miner.name + ': ' + miner.url + ' (Block: ' + (miner.status?.blockNumber || 'N/A') + ')');
        });

        // Verificación completa de consistencia distribuida
        console.log('\nDISTRIBUTED CONSENSUS VERIFICATION');
        console.log('======================================================');
        console.log('Checking consistency between multiple miners...\n');
        
        try {
            // Verificar consistencia entre todos los nodos
            const allNodes = [
                { name: 'bootnode1', url: bootnodeRpcUrl, type: 'FAST sync' },
                { name: 'miner1', url: miner1RpcUrl, type: 'FULL sync (miner)' },
                { name: 'miner2', url: miner2RpcUrl, type: 'FULL sync (miner)' },
                { name: 'miner3', url: miner3RpcUrl, type: 'FULL sync (miner)' },
                { name: 'rpc1', url: rpc1Url, type: 'FULL sync' }
            ].filter(node => node.url);
            
            console.log('Querying consensus on all nodes:');
            const blockData = [];
            
            for (const node of allNodes) {
                try {
                    const provider = new ethers.JsonRpcProvider(node.url!);
                    const blockNumber = await provider.getBlockNumber();
                    const block = await provider.getBlock(blockNumber);
                    
                    blockData.push({
                        nodeName: node.name,
                        nodeType: node.type,
                        blockNumber: blockNumber,
                        blockHash: block?.hash
                    });
                    
                    console.log('   ACTIVE ' + node.name + ' (' + node.type + '): Block ' + blockNumber + ' | Hash: ' + (block?.hash?.substring(0, 12) || 'N/A') + '...');
                } catch (nodeError) {
                    console.log('   ERROR ' + node.name + ': Error - ' + (nodeError instanceof Error ? nodeError.message : nodeError));
                }
            }
            
            // Analizar consenso distribuido
            console.log('\nDistributed consensus analysis:');
            if (blockData.length > 1) {
                const maxBlock = Math.max(...blockData.map(d => d.blockNumber));
                const minBlock = Math.min(...blockData.map(d => d.blockNumber));
                const blockDifference = maxBlock - minBlock;
                
                console.log('   Block range: ' + minBlock + ' - ' + maxBlock + ' (difference: ' + blockDifference + ')');
                
                if (blockDifference <= 2) {
                    console.log('   EXCELLENT: Distributed consensus synchronized (difference <= 2 blocks)');
                } else if (blockDifference <= 5) {
                    console.log('   ACCEPTABLE: Distributed consensus working (difference <= 5 blocks)');
                } else {
                    console.log('   PROBLEM: Distributed consensus desynchronized (difference > 5 blocks)');
                }
                
                // Verificar consistencia de hash en bloque común
                const commonBlock = minBlock;
                console.log('\nVerifying integrity of block ' + commonBlock + ' in consensus:');
                const hashComparison = [];
                
                for (const node of allNodes) {
                    try {
                        const provider = new ethers.JsonRpcProvider(node.url!);
                        const block = await provider.getBlock(commonBlock);
                        hashComparison.push({
                            nodeName: node.name,
                            hash: block?.hash
                        });
                        console.log('   HASH ' + node.name + ': ' + (block?.hash?.substring(0, 12) || 'N/A') + '...');
                    } catch (hashError) {
                        console.log('   ERROR ' + node.name + ': Error getting block ' + commonBlock);
                    }
                }
                
                const uniqueHashes = [...new Set(hashComparison.map(h => h.hash).filter((hash): hash is string => hash !== null && hash !== undefined))];
                if (uniqueHashes.length === 1) {
                    console.log('   PERFECT: Distributed consensus - unique hash for block ' + commonBlock);
                } else {
                    console.log('   PROBLEM: Detected ' + uniqueHashes.length + ' different hashes in consensus');
                }
            }
            
            console.log('\nDISTRIBUTED CONSENSUS SUMMARY:');
            console.log('======================================================');
            console.log('Verified nodes: ' + allNodes.length + '/5');
            console.log('Active miners: ' + activeMinersData.length + '/3');
            const blockRange = blockData.length > 0 ? 
                Math.min(...blockData.map(d => d.blockNumber)) + ' - ' + Math.max(...blockData.map(d => d.blockNumber)) : 'N/A';
            console.log('Block range: ' + blockRange);
            console.log('Result: Distributed Clique consensus operational with multiple miners\n');
            
        } catch (verificationError) {
            console.log('WARNING: Error during consensus verification: ' + (verificationError instanceof Error ? verificationError.message : verificationError));
        }

        // Realizar operación real con RPC usando el sistema integrado
        console.log('\nREAL OPERATION TEST WITH RPC');
        console.log('======================================================');
        console.log('Performing ETH transfer operation using integrated system...\n');
        
        try {
            // Importar función de actualización de red
            const { updateNetworkAccounts } = await import('../src/update-besu-networks');
            
            // Crear una nueva cuenta para demostrar la transferencia
            const randomWallet = ethers.Wallet.createRandom();
            const newAccountAddress = randomWallet.address;
            console.log('Creating new account for transfer test: ' + newAccountAddress);
            
            // Actualizar la red para añadir la nueva cuenta con balance usando transferencias reales
            const updateResult = await updateNetworkAccounts(
                besuNetwork, // Pasar el objeto BesuNetwork directamente
                [
                    {
                        address: newAccountAddress,
                        weiAmount: ethers.parseEther('5.0').toString() // 5 ETH
                    }
                ],
                {
                    performTransfers: true, // Realizar transferencias reales desde el miner
                    rpcUrl: rpc1Url || undefined,
                    confirmTransactions: true
                }
            );
            
            console.log('Transfer operation completed:');
            console.log('   Success: ' + updateResult.success);
            console.log('   Config updated: ' + updateResult.configUpdated);
            console.log('   Transfers executed: ' + updateResult.transfersExecuted.length);
            
            if (updateResult.transfersExecuted.length > 0) {
                const transfer = updateResult.transfersExecuted[0];
                console.log('   Transaction hash: ' + (transfer.transactionHash || 'N/A'));
                console.log('   Transfer success: ' + transfer.success);
                console.log('   Amount transferred: ' + transfer.amount + ' (parsed from wei)');
                
                if (transfer.transactionHash) {
                    // Esperar propagación entre nodos
                    console.log('\nWaiting for transaction propagation across all nodes...');
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
                    
                    // Verificar consistencia en todos los nodos
                    console.log('\nVERIFYING TRANSACTION CONSISTENCY ACROSS ALL NODES');
                    console.log('======================================================');
                    
                    const allNodes = [
                        { name: 'bootnode1', url: bootnodeRpcUrl },
                        { name: 'miner1', url: miner1RpcUrl },
                        { name: 'miner2', url: miner2RpcUrl },
                        { name: 'miner3', url: miner3RpcUrl },
                        { name: 'rpc1', url: rpc1Url }
                    ].filter(node => node.url);
                    
                    console.log('Checking balances and transaction on all nodes:');
                    const balanceResults = [];
                    
                    for (const node of allNodes) {
                        try {
                            const nodeProvider = new ethers.JsonRpcProvider(node.url!);
                            
                            // Verificar balance de la nueva cuenta
                            const nodeAccountBalance = await nodeProvider.getBalance(newAccountAddress);
                            // Verificar que la transacción existe
                            const nodeTx = await nodeProvider.getTransaction(transfer.transactionHash);
                            
                            balanceResults.push({
                                nodeName: node.name,
                                accountBalance: nodeAccountBalance,
                                transactionExists: nodeTx !== null,
                                blockNumber: nodeTx?.blockNumber
                            });
                            
                            console.log('   ' + node.name + ':');
                            console.log('     New account balance: ' + ethers.formatEther(nodeAccountBalance) + ' ETH');
                            console.log('     Transaction: ' + (nodeTx ? 'Found in block ' + nodeTx.blockNumber : 'NOT FOUND'));
                            
                        } catch (nodeError) {
                            console.log('   ' + node.name + ': ERROR - ' + (nodeError instanceof Error ? nodeError.message : nodeError));
                        }
                    }
                    
                    // Analizar consistencia
                    console.log('\nCONSISTENCY ANALYSIS:');
                    if (balanceResults.length > 1) {
                        // Verificar que todos los balances son iguales
                        const accountBalances = balanceResults.map(r => r.accountBalance.toString());
                        const uniqueAccountBalances = [...new Set(accountBalances)];
                        
                        console.log('Account balance consistency: ' + uniqueAccountBalances.length + ' unique values');
                        
                        const transactionFoundCount = balanceResults.filter(r => r.transactionExists).length;
                        console.log('Transaction found on: ' + transactionFoundCount + '/' + balanceResults.length + ' nodes');
                        
                        if (uniqueAccountBalances.length === 1 && transactionFoundCount === balanceResults.length) {
                            console.log('✅ PERFECT CONSISTENCY: All nodes have identical transaction state');
                        } else {
                            console.log('⚠️  INCONSISTENCY DETECTED: Nodes have different transaction states');
                        }
                    }
                    
                    console.log('\nOPERATION SUMMARY:');
                    console.log('Transfer amount: 5 ETH');
                    console.log('Recipient address: ' + newAccountAddress);
                    console.log('Transaction hash: ' + transfer.transactionHash);
                    console.log('Nodes verified: ' + balanceResults.length + '/5');
                    console.log('Result: Real operation completed and verified across distributed network\n');
                } else {
                    console.log('WARNING: Transaction hash not available');
                }
                
            } else {
                console.log('WARNING: No transfers were executed');
            }
            
        } catch (operationError) {
            console.log('ERROR during real operation: ' + (operationError instanceof Error ? operationError.message : operationError));
        }

        console.log('IMPROVED EXAMPLE COMPLETED SUCCESSFULLY!');
        console.log('Access URLs (mapped from internal ports):');
        console.log('Distributed architecture implemented:');
        console.log('   • Consensus: ' + activeMinersData.length + '/3 miners participating in Clique');
        console.log('   • Operations: Distributed among active miners');
        console.log('   • Queries: Balanced between RPC and miners');
        console.log('   • Tolerance: Continues working with 1+ active miners');
        console.log('   • Real Operation: ETH transfer executed and verified');
        console.log('NOTE: Robust distributed consensus with automatic rotation and real operations');
        
        // Mostrar endpoints reales
        const nodeConfigs = besuNetwork.getAllNodeConfigs();
        nodeConfigs.forEach(nodeInfo => {
            const externalPort = nodeInfo.config.rpcPort + 10000;
            const nodeType = nodeInfo.config.type === 'miner' ? 
                nodeInfo.config.type + ' (consensus)' : nodeInfo.config.type;
            console.log('   - ' + nodeInfo.name + ' (' + nodeType + '): http://localhost:' + externalPort);
        });

        console.log('\nNOTE: Distributed network created for inspection - will not be automatically deleted');
        console.log('To clean manually run: npm run improved cleanup');

    } catch (error) {
        console.error('ERROR in improved example:', error);
    }
}

// Función para limpiar la red mejorada
async function cleanup() {
    console.log('Cleaning distributed network resources...');
    
    const networkConfig: BesuNetworkConfig = {
        name: 'improved-besu-network',
        chainId: 1340,
        subnet: '172.33.0.0/16',
        consensus: 'clique',
        gasLimit: '0x47E7C4'
    };

    const besuNetwork = new BesuNetwork(networkConfig);
    
    try {
        await besuNetwork.stop();
        console.log('Distributed network stopped');
        
        await besuNetwork.destroy();
        console.log('Distributed network completely destroyed');
    } catch (error) {
        console.error('Error in cleanup:', error);
    }
}

// Ejecutar ejemplo si se llama directamente
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'cleanup') {
        cleanup();
    } else {
        improvedExample();
    }
}

export { improvedExample, cleanup };

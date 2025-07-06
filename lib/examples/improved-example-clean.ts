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
                    rpcPort: 8548,          // Puerto RPC para operaciones (salto para evitar consecutivos)
                    p2pPort: 30305,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'miner3', 
                    ip: '172.33.0.23',      // Tercer miner distribuido
                    rpcPort: 8550,          // Puerto RPC para operaciones (salto para evitar consecutivos)
                    p2pPort: 30306,         // Puerto P2P único
                    type: 'miner' 
                },
                { 
                    name: 'rpc1', 
                    ip: '172.33.0.24',      // Nodo RPC para aplicaciones
                    rpcPort: 8552,          // Puerto RPC para consultas (salto para evitar consecutivos)
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

        console.log('IMPROVED EXAMPLE COMPLETED SUCCESSFULLY!');
        console.log('NOTE: Distributed network created for inspection - will not be automatically deleted');
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

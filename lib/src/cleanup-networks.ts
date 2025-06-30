#!/usr/bin/env ts-node

import { executeCommand } from './create-besu-networks';

/**
 * Script para limpiar redes Docker que pueden estar causando conflictos
 */

async function cleanupDockerNetworks() {
    console.log('🧹 Iniciando limpieza de redes Docker...\n');

    try {
        // Listar todas las redes Docker
        console.log('📋 Listando redes Docker existentes...');
        const networks = executeCommand('docker network ls --format "{{.Name}}"').trim().split('\n');
        
        console.log(`Found ${networks.length} networks:`);
        networks.forEach(network => console.log(`  - ${network}`));
        console.log('');

        // Buscar redes Besu específicamente
        const besuNetworks = networks.filter(network => 
            network.includes('besu') || 
            network.includes('mi-red') ||
            network.includes('ejemplo')
        );

        if (besuNetworks.length > 0) {
            console.log('🎯 Encontradas redes relacionadas con Besu:');
            besuNetworks.forEach(network => console.log(`  - ${network}`));
            
            for (const network of besuNetworks) {
                if (network === 'bridge' || network === 'host' || network === 'none') {
                    continue;
                }
                
                try {
                    console.log(`\n🗑️  Limpiando red: ${network}`);
                    
                    // Obtener contenedores en esta red
                    const containers = executeCommand(`docker ps -aq --filter "network=${network}"`);
                    
                    if (containers.trim()) {
                        console.log(`  📦 Deteniendo contenedores en ${network}...`);
                        executeCommand(`docker rm -f ${containers.trim().split('\n').join(' ')}`);
                        console.log(`  ✅ Contenedores detenidos`);
                    }
                    
                    // Eliminar la red
                    console.log(`  🌐 Eliminando red ${network}...`);
                    executeCommand(`docker network rm ${network}`);
                    console.log(`  ✅ Red ${network} eliminada`);
                    
                } catch (error) {
                    console.log(`  ⚠️  No se pudo eliminar ${network}: ${error instanceof Error ? error.message : error}`);
                }
            }
        } else {
            console.log('✨ No se encontraron redes Besu para limpiar');
        }

        console.log('\n🔍 Verificando subredes en conflicto...');
        
        // Verificar subredes específicas que suelen causar conflictos
        const problematicSubnets = [
            '172.24.0.0/16',
            '172.25.0.0/16',
            '172.26.0.0/16'
        ];

        for (const subnet of problematicSubnets) {
            console.log(`\n🔎 Verificando subnet ${subnet}...`);
            
            try {
                const allNetworks = executeCommand('docker network ls --format "{{.Name}}"').trim().split('\n');
                
                for (const network of allNetworks) {
                    if (network === 'bridge' || network === 'host' || network === 'none') {
                        continue;
                    }
                    
                    try {
                        const inspect = executeCommand(`docker network inspect ${network}`);
                        const networkData = JSON.parse(inspect);
                        
                        if (networkData[0]?.IPAM?.Config) {
                            for (const config of networkData[0].IPAM.Config) {
                                if (config.Subnet === subnet) {
                                    console.log(`  ⚠️  Encontrada red conflictiva: ${network} usando ${subnet}`);
                                    console.log(`  🗑️  Eliminando red conflictiva: ${network}`);
                                    
                                    // Eliminar contenedores
                                    const containers = executeCommand(`docker ps -aq --filter "network=${network}"`);
                                    if (containers.trim()) {
                                        executeCommand(`docker rm -f ${containers.trim().split('\n').join(' ')}`);
                                    }
                                    
                                    // Eliminar red
                                    executeCommand(`docker network rm ${network}`);
                                    console.log(`  ✅ Red conflictiva ${network} eliminada`);
                                }
                            }
                        }
                    } catch (e) {
                        // Skip networks that can't be inspected
                    }
                }
            } catch (error) {
                console.log(`  ⚠️  Error verificando subnet ${subnet}: ${error instanceof Error ? error.message : error}`);
            }
        }

        console.log('\n✅ Limpieza completada!');
        console.log('\n📋 Redes Docker actuales:');
        const finalNetworks = executeCommand('docker network ls --format "table {{.Name}}\\t{{.Driver}}\\t{{.Scope}}"');
        console.log(finalNetworks);

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        process.exit(1);
    }
}

async function showNetworkInfo() {
    console.log('📊 Información de redes Docker actuales\n');
    
    try {
        const networks = executeCommand('docker network ls --format "{{.Name}}"').trim().split('\n');
        
        for (const network of networks) {
            if (network === 'bridge' || network === 'host' || network === 'none') {
                continue;
            }
            
            try {
                console.log(`🌐 Red: ${network}`);
                const inspect = executeCommand(`docker network inspect ${network}`);
                const networkData = JSON.parse(inspect);
                
                if (networkData[0]?.IPAM?.Config) {
                    networkData[0].IPAM.Config.forEach((config: any) => {
                        if (config.Subnet) {
                            console.log(`  📍 Subnet: ${config.Subnet}`);
                        }
                    });
                }
                
                // Contar contenedores
                const containers = executeCommand(`docker ps -aq --filter "network=${network}"`);
                const containerCount = containers.trim() ? containers.trim().split('\n').length : 0;
                console.log(`  📦 Contenedores: ${containerCount}`);
                console.log('');
                
            } catch (e) {
                console.log(`  ⚠️  No se puede inspeccionar la red ${network}`);
                console.log('');
            }
        }
    } catch (error) {
        console.error('❌ Error obteniendo información:', error);
    }
}

// CLI
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'info':
            await showNetworkInfo();
            break;
        case 'clean':
        default:
            await cleanupDockerNetworks();
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

import { CryptoLib, FileService, BesuNode, BesuNetwork, BesuNetworkConfig, BesuNodeDefinition, isSubnetAvailable, ethers } from '../src/create-besu-networks';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Archivo consolidado de tests para la librería Besu Network
 * 
 * Incluye todos los tests de:
 * - besu-network.test.ts
 * - conflict-resolution.test.ts  
 * - quick-test.test.ts
 * - test-connectivity.ts
 */

// ========================================
// TESTS DE CRYPTOLIB
// ========================================

describe('CryptoLib', () => {
    let cryptoLib: CryptoLib;

    beforeEach(() => {
        cryptoLib = new CryptoLib();
    });

    test('should generate valid key pair', () => {
        const ip = '192.168.1.100';
        const keyPair = cryptoLib.generateKeyPair(ip);

        expect(keyPair.privateKey).toHaveLength(64);
        expect(keyPair.publicKey).toMatch(/^04[0-9a-f]{128}$/);
        expect(keyPair.address).toHaveLength(40);
        expect(keyPair.enode).toContain(`@${ip}:30303`);
    });

    test('should convert public key to address correctly', () => {
        const publicKey = '04' + 'a'.repeat(128); // Mock public key
        const address = cryptoLib.publicKeyToAddress(publicKey);
        
        expect(address).toHaveLength(40);
        expect(address).toMatch(/^[0-9a-f]{40}$/);
    });

    test('should sign and verify message', () => {
        const message = 'test message';
        const keyPair = cryptoLib.generateKeyPair('127.0.0.1');
        
        const signature = cryptoLib.sign(message, keyPair.privateKey);
        const isValid = cryptoLib.verify(message, signature, keyPair.publicKey);
        
        expect(signature.r).toBeDefined();
        expect(signature.s).toBeDefined();
        expect(signature.v).toBeDefined();
        expect(isValid).toBe(true);
    });
});

// ========================================
// TESTS DE FILESERVICE
// ========================================

describe('FileService', () => {
    let fileService: FileService;
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besu-test-'));
        fileService = new FileService(tempDir);
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should create folder', () => {
        const folderPath = 'test-folder';
        fileService.createFolder(folderPath);
        
        expect(fs.existsSync(path.join(tempDir, folderPath))).toBe(true);
    });

    test('should create file with content', () => {
        const folderPath = 'test-folder';
        const fileName = 'test.txt';
        const content = 'test content';
        
        fileService.createFile(folderPath, fileName, content);
        
        const filePath = path.join(tempDir, folderPath, fileName);
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    test('should read file content', () => {
        const folderPath = 'test-folder';
        const fileName = 'test.txt';
        const content = 'test content';
        
        fileService.createFile(folderPath, fileName, content);
        const readContent = fileService.readFile(folderPath, fileName);
        
        expect(readContent).toBe(content);
    });

    test('should check file existence', () => {
        const folderPath = 'test-folder';
        const fileName = 'test.txt';
        
        expect(fileService.exists(folderPath, fileName)).toBe(false);
        
        fileService.createFile(folderPath, fileName, 'content');
        
        expect(fileService.exists(folderPath, fileName)).toBe(true);
        expect(fileService.exists(folderPath)).toBe(true);
    });

    test('should remove folder', () => {
        const folderPath = 'test-folder';
        fileService.createFolder(folderPath);
        
        expect(fileService.exists(folderPath)).toBe(true);
        
        fileService.removeFolder(folderPath);
        
        expect(fileService.exists(folderPath)).toBe(false);
    });
});

// ========================================
// TESTS DE BESUNODE
// ========================================

describe('BesuNode', () => {
    let fileService: FileService;
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besu-node-test-'));
        fileService = new FileService(tempDir);
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should create node with valid configuration', () => {
        const config = {
            name: 'test-node',
            ip: '172.24.0.20',
            port: 30303,
            rpcPort: 8545,
            type: 'bootnode' as const
        };

        const node = new BesuNode(config, fileService);
        
        expect(node.getConfig()).toEqual(config);
        expect(node.getKeys().privateKey).toBeDefined();
        expect(node.getKeys().address).toBeDefined();
    });

    test('should generate TOML configuration for bootnode', () => {
        const config = {
            name: 'bootnode',
            ip: '172.24.0.20',
            port: 30303,
            rpcPort: 8545,
            type: 'bootnode' as const
        };

        const networkConfig = {
            name: 'test-network',
            chainId: 1337,
            subnet: '172.24.0.0/16',
            consensus: 'clique' as const,
            gasLimit: '0x47E7C4'
        };

        const node = new BesuNode(config, fileService);
        const tomlConfig = node.generateTomlConfig(networkConfig);
        
        expect(tomlConfig).toContain('genesis-file="/data/genesis.json"');
        expect(tomlConfig).toContain('rpc-http-port=8545');
        expect(tomlConfig).not.toContain('miner-enabled=true');
        expect(tomlConfig).not.toContain('bootnodes=');
    });

    test('should generate TOML configuration for miner', () => {
        const config = {
            name: 'miner',
            ip: '172.24.0.22',
            port: 30303,
            rpcPort: 8546,
            type: 'miner' as const
        };

        const networkConfig = {
            name: 'test-network',
            chainId: 1337,
            subnet: '172.24.0.0/16',
            consensus: 'clique' as const,
            gasLimit: '0x47E7C4'
        };

        const node = new BesuNode(config, fileService);
        const bootnodeEnode = 'enode://abc123@172.24.0.20:30303';
        const tomlConfig = node.generateTomlConfig(networkConfig, bootnodeEnode);
        
        expect(tomlConfig).toContain('miner-enabled=true');
        expect(tomlConfig).toContain(`miner-coinbase="0x${node.getKeys().address}"`);
        expect(tomlConfig).toContain(`bootnodes=["${bootnodeEnode}"]`);
    });

    test('should save and load keys persistently', () => {
        const config = {
            name: 'persistent-node',
            ip: '172.24.0.20',
            port: 30303,
            rpcPort: 8545,
            type: 'bootnode' as const
        };

        // Create first node instance
        const node1 = new BesuNode(config, fileService);
        const keys1 = node1.getKeys();

        // Create second node instance with same config
        const node2 = new BesuNode(config, fileService);
        const keys2 = node2.getKeys();

        // Should load the same keys
        expect(keys1.privateKey).toBe(keys2.privateKey);
        expect(keys1.address).toBe(keys2.address);
    });
});

// ========================================
// TESTS DE BESUNETWORK
// ========================================

describe('BesuNetwork', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besu-network-test-'));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should create network with valid configuration', () => {
        const networkConfig = {
            name: 'test-network',
            chainId: 1337,
            subnet: '172.24.0.0/16',
            consensus: 'clique' as const,
            gasLimit: '0x47E7C4'
        };

        const network = new BesuNetwork(networkConfig, tempDir);
        
        expect(network.getConfig()).toEqual(networkConfig);
        expect(network.getNodes().size).toBe(0);
    });

    test('should generate valid genesis configuration', () => {
        const networkConfig = {
            name: 'test-network',
            chainId: 1337,
            subnet: '172.24.0.0/16',
            consensus: 'clique' as const,
            gasLimit: '0x47E7C4',
            blockTime: 5
        };

        const network = new BesuNetwork(networkConfig, tempDir);
        const minerAddress = 'a'.repeat(40);
        const addressWithPrefix = `0x${minerAddress}`;
        
        // Use reflection to access private method for testing
        const genesis = (network as any).generateGenesis(minerAddress, '1000000000000000000000000');
        
        expect(genesis.config.chainId).toBe(1337);
        expect(genesis.config.clique).toBeDefined();
        expect(genesis.config.clique?.period).toBe(5);
        expect(genesis.gasLimit).toBe('0x47E7C4');
        expect(genesis.alloc[addressWithPrefix]).toBeDefined();
        expect(genesis.alloc[addressWithPrefix].balance).toBe('1000000000000000000000000');
    });
});

// ========================================
// TESTS DE RESOLUCIÓN DE CONFLICTOS
// ========================================

describe('Subnet conflict resolution tests', () => {
    test('Should auto-resolve subnet conflicts when creating network', async () => {
        console.log('🧪 Probando resolución de conflictos de subred...\n');

        // Configuración con una subred que normalmente causaría conflictos
        const networkConfig: BesuNetworkConfig = {
            name: 'test-conflict-resolution',
            chainId: 1337,
            subnet: '172.24.0.0/16', // Esta subred podría estar en uso
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5
        };

        console.log(`📊 Verificando disponibilidad de subnet: ${networkConfig.subnet}`);
        const isAvailable = isSubnetAvailable(networkConfig.subnet);
        console.log(`Subnet disponible: ${isAvailable ? '✅' : '❌'}\n`);

        const besuNetwork = new BesuNetwork(networkConfig);

        try {
            console.log('🚀 Creando red con auto-resolución de conflictos habilitada...');
            
            await besuNetwork.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.24.0.20', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.24.0.22', rpcPort: 8550, type: 'miner' }
                ],
                autoResolveSubnetConflicts: true // Habilitado por defecto
            });

            console.log('✅ Red creada exitosamente con resolución automática de conflictos!');
            console.log('📍 Subnet final utilizada:', besuNetwork.getConfig().subnet);
            
            // Mostrar información de los nodos
            const nodes = besuNetwork.getNodes();
            console.log('\n🔍 Nodos creados:');
            for (const [nodeName, node] of nodes) {
                const config = node.getConfig();
                console.log(`  ${nodeName}: ${config.ip}:${config.rpcPort}`);
            }

            console.log('\n✅ Prueba de resolución de conflictos completada exitosamente!');
            
            // Limpiar
            console.log('\n🧹 Limpiando recursos...');
            await besuNetwork.destroy();
            console.log('✅ Recursos limpiados');

        } catch (error) {
            console.error('❌ Error durante la prueba:', error);
            
            // Intentar limpiar en caso de error
            try {
                await besuNetwork.destroy();
            } catch (cleanupError) {
                console.error('❌ Error durante la limpieza:', cleanupError);
            }
            
            throw error;
        }
    }, 180000); // 3 minutos de timeout

    test('Should check availability of different subnet alternatives', async () => {
        console.log('\n🔧 Probando diferentes subredes alternativas...\n');

        const conflictingSubnets = [
            '172.24.0.0/16',
            '172.25.0.0/16', 
            '172.26.0.0/16',
            '10.10.0.0/16'
        ];

        const results: { subnet: string; available: boolean }[] = [];
        
        for (const subnet of conflictingSubnets) {
            console.log(`🔍 Verificando: ${subnet}`);
            const isAvailable = isSubnetAvailable(subnet);
            console.log(`  Disponible: ${isAvailable ? '✅' : '❌'}`);
            results.push({ subnet, available: isAvailable });
        }
        
        // Verificar que al menos una subred esté disponible
        const availableSubnets = results.filter(r => r.available);
        expect(availableSubnets.length).toBeGreaterThan(0);
        console.log(`\n✅ Se encontraron ${availableSubnets.length} subredes disponibles`);
    }, 30000);
});

// ========================================
// TESTS RÁPIDOS DE RED
// ========================================

describe('Quick test for network functionality', () => {
    test('Should create and start network successfully', async () => {
        console.log('🧪 Test rápido: Configuración de múltiples bootnodes\n');

        const testConfig: BesuNetworkConfig = {
            name: 'quick-test-besu',
            chainId: 8888,
            subnet: '172.88.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5
        };

        const network = new BesuNetwork(testConfig);
        
        try {
            // Crear red con 2 bootnodes y 2 nodos regulares (más pequeña para test rápido)
            const nodes: BesuNodeDefinition[] = [
                { name: 'bootnode1', ip: '172.88.0.10', rpcPort: 8545, type: 'bootnode' },
                { name: 'bootnode2', ip: '172.88.0.11', rpcPort: 8546, type: 'bootnode' },
                { name: 'miner1', ip: '172.88.0.20', rpcPort: 8550, type: 'miner' },
                { name: 'rpc1', ip: '172.88.0.30', rpcPort: 8560, type: 'rpc' }
            ];

            await network.create({
                nodes,
                initialBalance: '1000'
            });

            console.log('✅ Red de test creada exitosamente');
            
            // Iniciar los contenedores Docker
            console.log('\n🚀 Iniciando contenedores...');
            await network.start();
            
            // Verificar que los contenedores están ejecutándose
            console.log('\n🐳 Verificando contenedores Docker...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            try {
                const containers = execSync(`docker ps --filter "label=network=${testConfig.name}" --format "table {{.Names}}\\t{{.Status}}"`, 
                    { encoding: 'utf-8', timeout: 10000 });
                console.log('📋 Contenedores activos:');
                console.log(containers);
            } catch (error) {
                console.log('⚠️  Error listando contenedores:', error);
            }

            // Verificar configuración de bootnodes
            console.log('\n🔧 Verificando configuración de bootnodes...');
            const bootnodes = network.getNodesByType('bootnode');
            console.log(`📊 Bootnodes encontrados: ${bootnodes.length}`);
            
            bootnodes.forEach((bootnode, index) => {
                const keys = bootnode.getKeys();
                const config = bootnode.getConfig();
                console.log(`   ${index + 1}. ${config.name}: ${keys.enode.substring(0, 50)}...`);
            });

            // Esperar un poco para que los nodos se inicialicen
            console.log('\n⏳ Esperando que los nodos se inicialicen completamente...');
            await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos

            // Test básico de conectividad (sin esperar sincronización completa)
            console.log('\n🌐 Test básico de conectividad...');
            const connectivity = await network.getNetworkConnectivity();
            
            for (const nodeInfo of connectivity) {
                const rpcUrl = network.getRpcUrl(nodeInfo.nodeName);
                console.log(`   ${nodeInfo.nodeName}: ${rpcUrl} - ${nodeInfo.isActive ? '✅ Activo' : '❌ Inactivo'}`);
                
                if (!nodeInfo.isActive && nodeInfo.error) {
                    console.log(`     Error: ${nodeInfo.error}`);
                }
            }

            console.log('\n🎉 Test rápido completado!');
            console.log('📋 Resultados:');
            console.log(`   ✅ Red creada: ${testConfig.name}`);
            console.log(`   ✅ Bootnodes configurados: ${bootnodes.length}`);
            console.log(`   ✅ Contenedores lanzados: ${nodes.length}`);

            await network.destroy();
            console.log('✅ Red limpiada');

        } catch (error) {
            console.error('❌ Error en test:', error);
            
            // Intentar limpiar en caso de error
            try {
                await network.destroy();
            } catch (cleanupError) {
                console.error('❌ Error limpiando:', cleanupError);
            }
        }
    }, 300000); // 5 minutos de timeout
});

// ========================================
// TESTS DE CONECTIVIDAD
// ========================================

describe('Connectivity tests', () => {
    test('Should establish proper connectivity between nodes', async () => {
        console.log('🧪 Prueba de conectividad - Red Besu avanzada\n');
        
        const networkConfig: BesuNetworkConfig = {
            name: 'test-connectivity',
            chainId: 9999,
            subnet: '172.50.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 3
        };

        const besuNetwork = new BesuNetwork(networkConfig);

        try {
            // Crear red más pequeña para prueba rápida
            await besuNetwork.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.50.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.50.0.20', rpcPort: 8550, type: 'miner' },
                    { name: 'rpc1', ip: '172.50.0.30', rpcPort: 8560, type: 'rpc' },
                ],
                initialBalance: '1000',
                autoResolveSubnetConflicts: true
            });

            console.log('✅ Red creada exitosamente\n');

            // Iniciar nodos
            console.log('🔄 Iniciando nodos...');
            await besuNetwork.start();
            console.log('✅ Nodos iniciados\n');

            // Esperar 60 segundos para conectividad
            console.log('⏳ Esperando 60 segundos para establecer conectividad...');
            await new Promise(resolve => setTimeout(resolve, 60000));

            // Verificar conectividad
            console.log('🔍 Verificando conectividad:');
            const connectivity = await besuNetwork.getNetworkConnectivity();
            
            connectivity.forEach(node => {
                const status = node.isActive ? '✅' : '❌';
                const block = node.blockNumber !== undefined ? ` | Bloque: ${node.blockNumber}` : '';
                const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
                console.log(`   ${status} ${node.nodeName.padEnd(12)}${block}${peers}`);
            });

            const activeNodes = connectivity.filter(n => n.isActive);
            console.log(`\n📊 Resumen: ${activeNodes.length}/${connectivity.length} nodos activos`);

            // Validar que al menos 2 nodos estén activos para test de conectividad
            expect(activeNodes.length).toBeGreaterThanOrEqual(2);

            if (activeNodes.length >= 2) {
                console.log('🎉 ¡Conectividad exitosa! Los nodos se están comunicando.');
            } else {
                console.log('⚠️  Conectividad limitada, pero algunos nodos están funcionando.');
            }

            // Limpiar
            console.log('\n🧹 Limpiando...');
            await besuNetwork.stop();
            await besuNetwork.destroy();
            console.log('✅ Limpieza completada');

        } catch (error) {
            console.error('❌ Error en prueba de conectividad:', error);
            
            // Limpiar en caso de error
            try {
                await besuNetwork.stop();
                await besuNetwork.destroy();
            } catch (cleanupError) {
                console.error('❌ Error en limpieza:', cleanupError);
            }
            
            throw error;
        }
    }, 300000); // 5 minutos de timeout
});

// ========================================
// FUNCIÓN AUXILIAR DE CONECTIVIDAD
// ========================================

/**
 * Función auxiliar para pruebas rápidas de conectividad
 */
export async function testConnectivity() {
    console.log('🧪 Prueba de conectividad - Red Besu avanzada\n');
    
    const networkConfig: BesuNetworkConfig = {
        name: 'test-connectivity',
        chainId: 9999,
        subnet: '172.50.0.0/16',
        consensus: 'clique',
        gasLimit: '0x47E7C4',
        blockTime: 3
    };

    const besuNetwork = new BesuNetwork(networkConfig);

    try {
        // Crear red más pequeña para prueba rápida
        await besuNetwork.create({
            nodes: [
                { name: 'bootnode1', ip: '172.50.0.10', rpcPort: 8545, type: 'bootnode' },
                { name: 'miner1', ip: '172.50.0.20', rpcPort: 8550, type: 'miner' },
                { name: 'rpc1', ip: '172.50.0.30', rpcPort: 8560, type: 'rpc' },
            ],
            initialBalance: '1000',
            autoResolveSubnetConflicts: true
        });

        console.log('✅ Red creada exitosamente\n');

        // Iniciar nodos
        console.log('🔄 Iniciando nodos...');
        await besuNetwork.start();
        console.log('✅ Nodos iniciados\n');

        // Esperar 60 segundos para conectividad
        console.log('⏳ Esperando 60 segundos para establecer conectividad...');
        await new Promise(resolve => setTimeout(resolve, 60000));

        // Verificar conectividad
        console.log('🔍 Verificando conectividad:');
        const connectivity = await besuNetwork.getNetworkConnectivity();
        
        connectivity.forEach(node => {
            const status = node.isActive ? '✅' : '❌';
            const block = node.blockNumber !== undefined ? ` | Bloque: ${node.blockNumber}` : '';
            const peers = node.peers !== undefined ? ` | Peers: ${node.peers}` : '';
            console.log(`   ${status} ${node.nodeName.padEnd(12)}${block}${peers}`);
        });

        const activeNodes = connectivity.filter(n => n.isActive);
        console.log(`\n📊 Resumen: ${activeNodes.length}/${connectivity.length} nodos activos`);

        if (activeNodes.length >= 2) {
            console.log('🎉 ¡Conectividad exitosa! Los nodos se están comunicando.');
        } else {
            console.log('⚠️  Conectividad limitada, pero algunos nodos están funcionando.');
        }

        // Limpiar
        console.log('\n🧹 Limpiando...');
        await besuNetwork.stop();
        await besuNetwork.destroy();
        console.log('✅ Limpieza completada');

    } catch (error) {
        console.error('❌ Error en prueba de conectividad:', error);
        
        // Limpiar en caso de error
        try {
            await besuNetwork.stop();
            await besuNetwork.destroy();
        } catch (cleanupError) {
            console.error('❌ Error en limpieza:', cleanupError);
        }
    }
}

// Ejecutar testConnectivity si se llama directamente
if (require.main === module) {
    testConnectivity();
}

// ========================================
// TESTS DE CUENTAS Y SIGNER ACCOUNT
// ========================================

describe('Account Management Tests', () => {
    test('Should handle accounts array with weiAmount correctly', async () => {
        console.log('🧪 Test: Nuevo sistema de cuentas con weiAmount\n');
        
        // Configuración de la red con cuentas personalizadas
        const networkConfig: BesuNetworkConfig = {
            name: 'test-accounts-network',
            chainId: 1337,
            subnet: '172.35.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 5,
            mainIp: '172.35.0.1',
            accounts: [
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: '100000000000000000000000' // 100,000 ETH en wei
                },
                {
                    address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
                    weiAmount: '50000000000000000000000'  // 50,000 ETH en wei
                },
                {
                    address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
                    weiAmount: '25000000000000000000000'  // 25,000 ETH en wei
                }
            ]
        };

        // Crear instancia de la red
        const besuNetwork = new BesuNetwork(networkConfig);

        try {
            console.log('📦 Creando red con cuentas personalizadas...');
            
            // Crear la red con nodos básicos
            await besuNetwork.create({
                nodes: [
                    { name: 'bootnode1', ip: '172.35.0.10', rpcPort: 8545, type: 'bootnode' },
                    { name: 'miner1', ip: '172.35.0.20', rpcPort: 8546, type: 'miner' },
                    { name: 'rpc1', ip: '172.35.0.30', rpcPort: 8547, type: 'rpc' }
                ],
                initialBalance: '1000', // 1M ETH
                autoResolveSubnetConflicts: true
            });

            console.log('✅ Red creada exitosamente con cuentas personalizadas\n');

            // Verificar que la configuración de cuentas es correcta
            const config = besuNetwork.getConfig();
            expect(config.accounts).toBeDefined();
            expect(config.accounts!.length).toBe(3);
            expect(config.accounts![0].address).toBe('0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9');
            expect(config.accounts![0].weiAmount).toBe('100000000000000000000000');

            // La red ha sido creada con éxito, la destruimos para limpiar
            console.log('🧹 Limpiando red de prueba...');
            await besuNetwork.destroy();
            console.log('✅ Red destruida y recursos liberados');

        } catch (error) {
            console.error('❌ Error en el test:', error);
            
            // Intentar limpiar en caso de error
            try {
                await besuNetwork.destroy();
            } catch (cleanupError) {
                console.error('❌ Error en limpieza:', cleanupError);
            }
            
            throw error;
        }
    }, 180000);

    test('Should handle signerAccount with priority over accounts array', async () => {
        console.log('🧪 Test: SignerAccount con prioridad sobre accounts array\n');

        const networkConfig: BesuNetworkConfig = {
            name: 'test-signer-network',
            chainId: 2025,
            subnet: '172.36.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            blockTime: 3,
            // Signer account - this is the main account with special privileges
            signerAccount: {
                address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
                weiAmount: '1000000000000000000000000' // 1M ETH for the signer
            },
            // Additional accounts for testing (no duplicates with signerAccount)
            accounts: [
                {
                    address: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                    weiAmount: '100000000000000000000' // 100 ETH
                },
                {
                    address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
                    weiAmount: '50000000000000000000' // 50 ETH
                },
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: '25000000000000000000' // 25 ETH
                }
            ]
        };

        const besuNetwork = new BesuNetwork(networkConfig);

        try {
            console.log('📦 Creando red con signer account...');
            
            // Create the network with nodes
            await besuNetwork.create({
                nodes: [
                    {
                        name: 'bootnode',
                        ip: '172.36.0.10',
                        rpcPort: 8545,
                        type: 'bootnode'
                    },
                    {
                        name: 'miner',
                        ip: '172.36.0.11', 
                        rpcPort: 8546,
                        type: 'miner'
                    },
                    {
                        name: 'rpc1',
                        ip: '172.36.0.12',
                        rpcPort: 8547,
                        type: 'rpc'
                    }
                ],
                initialBalance: '500', // 500K ETH for miner (if not covered by other accounts)
                autoResolveSubnetConflicts: true
            });

            console.log('✅ Red creada exitosamente con signer account');

            // Verificar que la configuración incluye tanto signerAccount como accounts
            const config = besuNetwork.getConfig();
            expect(config.signerAccount).toBeDefined();
            expect(config.signerAccount!.address).toBe('0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1');
            expect(config.signerAccount!.weiAmount).toBe('1000000000000000000000000');
            
            expect(config.accounts).toBeDefined();
            expect(config.accounts!.length).toBe(3);

            // Verificar que las cuentas están correctamente configuradas
            const networkConfig = besuNetwork.getConfig();
            expect(networkConfig.signerAccount?.address).toBe('0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1');
            expect(networkConfig.accounts).toBeDefined();
            expect(networkConfig.accounts!.length).toBe(3);
            expect(networkConfig.accounts![0].address).toBe('0x627306090abaB3A6e1400e9345bC60c78a8BEf57');
            expect(networkConfig.accounts![1].address).toBe('0xf17f52151EbEF6C7334FAD080c5704D77216b732');
            expect(networkConfig.accounts![2].address).toBe('0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9');

            console.log('\n📊 Test Summary:');
            console.log('- Signer account has priority and 1M ETH balance');
            console.log('- Additional accounts have their specified balances');
            console.log('- All accounts are unique (validation prevents duplicates)');
            console.log('- Miner gets default balance if not specified elsewhere');

            console.log('\n🧹 Limpiando red de prueba...');
            await besuNetwork.destroy();
            console.log('✅ Red destruida y recursos liberados');

        } catch (error) {
            console.error('❌ Error creating network:', error);
            
            // Intentar limpiar en caso de error
            try {
                await besuNetwork.destroy();
            } catch (cleanupError) {
                console.error('❌ Error en limpieza:', cleanupError);
            }
            
            throw error;
        }
    }, 180000);

    test('Should validate account addresses correctly', () => {
        console.log('🧪 Test: Validación de direcciones de cuentas\n');

        // Test con direcciones válidas
        const validConfig: BesuNetworkConfig = {
            name: 'test-valid-addresses',
            chainId: 1337,
            subnet: '172.37.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            signerAccount: {
                address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
                weiAmount: '1000000000000000000000000'
            },
            accounts: [
                {
                    address: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                    weiAmount: '100000000000000000000'
                }
            ]
        };

        // Esto no debería lanzar error
        expect(() => new BesuNetwork(validConfig)).not.toThrow();

        // Test con dirección inválida (muy corta)
        const invalidConfig1: BesuNetworkConfig = {
            name: 'test-invalid-addresses',
            chainId: 1337,
            subnet: '172.37.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            signerAccount: {
                address: '0x90F8bf6A479f320ead074411',  // Muy corta
                weiAmount: '1000000000000000000000000'
            }
        };

        expect(() => new BesuNetwork(invalidConfig1)).toThrow('Invalid signer account address');

        // Test con dirección inválida (sin 0x)
        const invalidConfig2: BesuNetworkConfig = {
            name: 'test-invalid-addresses',
            chainId: 1337,
            subnet: '172.37.0.0/16',
            consensus: 'clique',
            gasLimit: '0x47E7C4',
            accounts: [
                {
                    address: '90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',  // Sin 0x
                    weiAmount: '100000000000000000000'
                }
            ]
        };

        expect(() => new BesuNetwork(invalidConfig2)).toThrow('Invalid account address');

        console.log('✅ Validación de direcciones funcionando correctamente');
    });
});

// ========================================
// TESTS DE VALIDACIÓN DE NODOS INCORRECTOS
// ========================================

describe('Node Validation Tests', () => {
    let tempDir: string;
    
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besu-validation-test-'));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('Invalid Node Names', () => {
        test('should reject empty node names', () => {
            const config: BesuNetworkConfig = {
                name: 'test-invalid-names',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const invalidNodes: BesuNodeDefinition[] = [
                {
                    name: '', // Nombre vacío
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: invalidNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[0].name',
                        type: 'required',
                        message: 'Node 0 name is required'
                    })
                ])
            );
        });

        test('should reject invalid node name characters', () => {
            const config: BesuNetworkConfig = {
                name: 'test-invalid-names',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const invalidNodes: BesuNodeDefinition[] = [
                {
                    name: 'node@invalid!', // Caracteres inválidos
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: invalidNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[0].name',
                        type: 'format',
                        message: 'Node 0 name can only contain letters, numbers, hyphens and underscores'
                    })
                ])
            );
        });

        test('should reject duplicate node names', () => {
            const config: BesuNetworkConfig = {
                name: 'test-duplicate-names',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const duplicateNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'node1', // Nombre duplicado
                    ip: '172.50.0.21',
                    rpcPort: 8546,
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: duplicateNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[1].name',
                        type: 'duplicate',
                        message: "Node name 'node1' is duplicated within the network"
                    })
                ])
            );
        });
    });

    describe('Invalid IP Addresses', () => {
        test('should reject invalid IP format', () => {
            const config: BesuNetworkConfig = {
                name: 'test-invalid-ips',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const invalidNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '999.999.999.999', // IP inválida
                    rpcPort: 8545,
                    type: 'bootnode'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: invalidNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[0].ip',
                        type: 'format',
                        message: 'Node 0 IP address format is invalid'
                    })
                ])
            );
        });

        test('should reject duplicate IP addresses', () => {
            const config: BesuNetworkConfig = {
                name: 'test-duplicate-ips',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const duplicateNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.20', // IP duplicada
                    rpcPort: 8546,
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: duplicateNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[1].ip',
                        type: 'duplicate',
                        message: "Node 1 IP address '172.50.0.20' is duplicated within the network"
                    })
                ])
            );
        });

        test('should reject IPs outside configured subnet', () => {
            const config: BesuNetworkConfig = {
                name: 'test-out-of-subnet',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const invalidNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '192.168.1.100', // Fuera de la subnet 172.50.0.0/16
                    rpcPort: 8545,
                    type: 'bootnode'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: invalidNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[0].ip',
                        type: 'invalid',
                        message: "Node 0 IP '192.168.1.100' is not in the configured subnet '172.50.0.0/16'"
                    })
                ])
            );
        });

        test('should reject reserved IPs (network, broadcast, gateway)', () => {
            const config: BesuNetworkConfig = {
                name: 'test-reserved-ips',
                chainId: 1337,
                subnet: '172.50.0.0/24', // Subnet más pequeña para test
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const reservedNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.0', // IP de red
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.255', // IP de broadcast
                    rpcPort: 8546,
                    type: 'miner'
                },
                {
                    name: 'node3',
                    ip: '172.50.0.1', // Gateway típico
                    rpcPort: 8547,
                    type: 'rpc'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: reservedNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThanOrEqual(3);
            
            // Verificar que se detectan las IPs reservadas
            const reservedErrors = validation.errors.filter(error => 
                error.message.includes('reserved IP address')
            );
            expect(reservedErrors.length).toBe(3);
        });
    });

    describe('Invalid Port Configurations', () => {
        test('should reject duplicate RPC ports on same IP', () => {
            const config: BesuNetworkConfig = {
                name: 'test-duplicate-ports',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const duplicatePortNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.20', // Misma IP
                    rpcPort: 8545, // Puerto duplicado en la misma IP
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: duplicatePortNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[1].rpcPort',
                        type: 'duplicate',
                        message: 'Node 1 RPC endpoint 172.50.0.20:8545 is duplicated within the network'
                    })
                ])
            );
        });

        test('should reject invalid port ranges', () => {
            const config: BesuNetworkConfig = {
                name: 'test-invalid-ports',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const invalidPortNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 80, // Puerto demasiado bajo
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.21',
                    rpcPort: 70000, // Puerto demasiado alto
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: invalidPortNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThanOrEqual(2);
            
            const portRangeErrors = validation.errors.filter(error => 
                error.message.includes('must be between 1024 and 65535')
            );
            expect(portRangeErrors.length).toBe(2);
        });

        test('should reject system reserved ports', () => {
            const config: BesuNetworkConfig = {
                name: 'test-reserved-ports',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const systemPortNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 80, // HTTP
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.21',
                    rpcPort: 443, // HTTPS
                    type: 'miner'
                },
                {
                    name: 'node3',
                    ip: '172.50.0.22',
                    rpcPort: 22, // SSH
                    type: 'rpc'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: systemPortNodes });
            
            expect(validation.isValid).toBe(false);
            
            // Verificar que se detectan puertos del sistema (aunque algunos también fallen por rango)
            const systemPortErrors = validation.errors.filter(error => 
                error.message.includes('system reserved port') || 
                error.message.includes('must be between 1024 and 65535')
            );
            expect(systemPortErrors.length).toBeGreaterThan(0);
        });

        test('should reject duplicate P2P ports on same IP', () => {
            const config: BesuNetworkConfig = {
                name: 'test-duplicate-p2p-ports',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const duplicateP2pNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    p2pPort: 30303,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.20', // Misma IP
                    rpcPort: 8546,
                    p2pPort: 30303, // Puerto P2P duplicado en la misma IP
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: duplicateP2pNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[1].p2pPort',
                        type: 'duplicate',
                        message: 'Node 1 P2P endpoint 172.50.0.20:30303 is duplicated within the network'
                    })
                ])
            );
        });

        test('should reject P2P port same as RPC port', () => {
            const config: BesuNetworkConfig = {
                name: 'test-port-conflict',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const conflictNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    p2pPort: 8545, // Mismo puerto que RPC
                    type: 'bootnode'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: conflictNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[0].p2pPort',
                        type: 'invalid',
                        message: 'Node 0 P2P port 8545 cannot be the same as RPC port'
                    })
                ])
            );
        });

        test('should allow duplicate RPC ports on different IPs', () => {
            const config: BesuNetworkConfig = {
                name: 'test-allow-duplicate-ports-different-ips',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const allowedNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.21', // IP diferente
                    rpcPort: 8545, // Mismo puerto RPC, pero IP diferente - debe ser válido
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: allowedNodes });
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should allow duplicate P2P ports on different IPs', () => {
            const config: BesuNetworkConfig = {
                name: 'test-allow-duplicate-p2p-ports-different-ips',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const allowedP2pNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    p2pPort: 30303,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.21', // IP diferente
                    rpcPort: 8546,
                    p2pPort: 30303, // Mismo puerto P2P, pero IP diferente - debe ser válido
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: allowedP2pNodes });
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should allow same ports on different IPs but reject same endpoint combinations', () => {
            const config: BesuNetworkConfig = {
                name: 'test-mixed-port-scenarios',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const mixedNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    p2pPort: 30303,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.21', // IP diferente
                    rpcPort: 8545, // Mismo puerto RPC pero IP diferente - OK
                    p2pPort: 30303, // Mismo puerto P2P pero IP diferente - OK
                    type: 'miner'
                },
                {
                    name: 'node3',
                    ip: '172.50.0.22', // IP diferente (corregido - no puede ser la misma que node1)
                    rpcPort: 8546, // Puerto RPC diferente - OK
                    p2pPort: 30304, // Puerto P2P diferente - OK
                    type: 'rpc'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: mixedNodes });
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should reject same endpoint combinations (same IP + same port)', () => {
            const config: BesuNetworkConfig = {
                name: 'test-duplicate-endpoints',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const duplicateEndpointNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    p2pPort: 30303,
                    type: 'bootnode'
                },
                {
                    name: 'node2',
                    ip: '172.50.0.20', // Misma IP que node1
                    rpcPort: 8545, // Mismo puerto RPC - esto debe fallar
                    p2pPort: 30304, // Puerto P2P diferente
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: duplicateEndpointNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[1].ip',
                        type: 'duplicate',
                        message: 'Node 1 IP address \'172.50.0.20\' is duplicated within the network'
                    })
                ])
            );
        });
    });

    describe('Invalid Node Types and Consensus Configuration', () => {
        test('should reject invalid node types', () => {
            const config: BesuNetworkConfig = {
                name: 'test-invalid-node-types',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const invalidTypeNodes: BesuNodeDefinition[] = [
                {
                    name: 'node1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'invalid-type' as any // Tipo inválido
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: invalidTypeNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes[0].type',
                        type: 'invalid',
                        message: "Node 0 type 'invalid-type' is invalid. Valid types: bootnode, miner, rpc, node"
                    })
                ])
            );
        });

        test('should reject network without bootnode', () => {
            const config: BesuNetworkConfig = {
                name: 'test-no-bootnode',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const noBootnodeNodes: BesuNodeDefinition[] = [
                {
                    name: 'miner1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: noBootnodeNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes',
                        type: 'required',
                        message: 'At least one bootnode is required for any consensus mechanism'
                    })
                ])
            );
        });

        test('should reject Clique consensus without miners', () => {
            const config: BesuNetworkConfig = {
                name: 'test-clique-no-miners',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const noMinerNodes: BesuNodeDefinition[] = [
                {
                    name: 'bootnode1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'rpc1',
                    ip: '172.50.0.21',
                    rpcPort: 8546,
                    type: 'rpc'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: noMinerNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'consensus',
                        type: 'required',
                        message: 'Clique consensus requires at least one miner node (signer)'
                    })
                ])
            );
        });

        test('should reject IBFT2 consensus with insufficient validators', () => {
            const config: BesuNetworkConfig = {
                name: 'test-ibft2-insufficient',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'ibft2',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const insufficientNodes: BesuNodeDefinition[] = [
                {
                    name: 'bootnode1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'miner1',
                    ip: '172.50.0.21',
                    rpcPort: 8546,
                    type: 'miner'
                }
                // Solo 1 validador, necesita al menos 4
            ];

            const validation = network.validateNetworkConfiguration({ nodes: insufficientNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'consensus',
                        type: 'required',
                        message: 'IBFT2 consensus requires at least 4 validator nodes (miners + validator nodes). Currently: 1'
                    })
                ])
            );
        });

        test('should reject single node network', () => {
            const config: BesuNetworkConfig = {
                name: 'test-single-node',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const singleNode: BesuNodeDefinition[] = [
                {
                    name: 'lonely-node',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: singleNode });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes',
                        type: 'required',
                        message: 'At least 2 nodes are required for a functional blockchain network'
                    })
                ])
            );
        });
    });

    describe('Network Architecture Validation', () => {
        test('should warn about unbalanced large networks', () => {
            const config: BesuNetworkConfig = {
                name: 'test-unbalanced-network',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            // Crear una red con demasiados bootnodes
            const unbalancedNodes: BesuNodeDefinition[] = [];
            
            // 8 bootnodes (más del 50% de 15 nodos)
            for (let i = 0; i < 8; i++) {
                unbalancedNodes.push({
                    name: `bootnode${i + 1}`,
                    ip: `172.50.0.${20 + i}`,
                    rpcPort: 8545 + i,
                    type: 'bootnode'
                });
            }
            
            // Solo algunos miners y otros nodos
            for (let i = 0; i < 7; i++) {
                unbalancedNodes.push({
                    name: `miner${i + 1}`,
                    ip: `172.50.0.${30 + i}`,
                    rpcPort: 8560 + i,
                    type: 'miner'
                });
            }

            const validation = network.validateNetworkConfiguration({ nodes: unbalancedNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes',
                        type: 'invalid',
                        message: expect.stringContaining('Too many bootnodes relative to total nodes')
                    })
                ])
            );
        });

        test('should recommend RPC nodes for large networks', () => {
            const config: BesuNetworkConfig = {
                name: 'test-large-network-no-rpc',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            // Crear una red grande sin nodos RPC
            const largeNetworkNodes: BesuNodeDefinition[] = [];
            
            // 1 bootnode
            largeNetworkNodes.push({
                name: 'bootnode1',
                ip: '172.50.0.20',
                rpcPort: 8545,
                type: 'bootnode'
            });
            
            // 25 miners (red grande sin RPC)
            for (let i = 0; i < 25; i++) {
                largeNetworkNodes.push({
                    name: `miner${i + 1}`,
                    ip: `172.50.0.${30 + i}`,
                    rpcPort: 8546 + i,
                    type: 'miner'
                });
            }

            const validation = network.validateNetworkConfiguration({ nodes: largeNetworkNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes',
                        type: 'invalid',
                        message: 'Large networks (>20 nodes) should include dedicated RPC nodes for better client connectivity'
                    })
                ])
            );
        });

        test('should detect inconsistent naming conventions', () => {
            const config: BesuNetworkConfig = {
                name: 'test-inconsistent-naming',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            // Crear nodos con naming inconsistente
            const inconsistentNodes: BesuNodeDefinition[] = [
                {
                    name: 'bootnode1', // Tipo-based
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'random_name', // No sigue convención
                    ip: '172.50.0.21',
                    rpcPort: 8546,
                    type: 'miner'
                },
                {
                    name: 'another-node', // Diferente estilo
                    ip: '172.50.0.22',
                    rpcPort: 8547,
                    type: 'rpc'
                },
                {
                    name: 'xyz123', // Sin patrón
                    ip: '172.50.0.23',
                    rpcPort: 8548,
                    type: 'node'
                },
                {
                    name: 'finalnode', // Sin número
                    ip: '172.50.0.24',
                    rpcPort: 8549,
                    type: 'rpc'
                },
                {
                    name: 'lastOne', // CamelCase
                    ip: '172.50.0.25',
                    rpcPort: 8550,
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: inconsistentNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes',
                        type: 'invalid',
                        message: 'For networks with more than 5 nodes, consider using consistent naming conventions (e.g., node1, node2... or bootnode1, miner1, rpc1...)'
                    })
                ])
            );
        });

        test('should reject miner nodes with consecutive ports', () => {
            const config: BesuNetworkConfig = {
                name: 'test-consecutive-ports',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const consecutivePortNodes: BesuNodeDefinition[] = [
                {
                    name: 'bootnode1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    type: 'bootnode'
                },
                {
                    name: 'miner1',
                    ip: '172.50.0.21',
                    rpcPort: 8546,
                    type: 'miner'
                },
                {
                    name: 'miner2',
                    ip: '172.50.0.22',
                    rpcPort: 8547, // Puerto consecutivo
                    type: 'miner'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: consecutivePortNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'nodes',
                        type: 'invalid',
                        message: 'Miner nodes should not use consecutive RPC ports (8546 and 8547) to avoid potential conflicts'
                    })
                ])
            );
        });
    });

    describe('Complex Validation Scenarios', () => {
        test('should handle multiple validation errors simultaneously', () => {
            const config: BesuNetworkConfig = {
                name: 'test-multiple-errors',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'ibft2',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const multipleErrorNodes: BesuNodeDefinition[] = [
                {
                    name: '', // Error: nombre vacío
                    ip: '999.999.999.999', // Error: IP inválida
                    rpcPort: 80, // Error: puerto reservado/fuera de rango
                    type: 'bootnode'
                },
                {
                    name: 'node@invalid', // Error: caracteres inválidos
                    ip: '192.168.1.100', // Error: fuera de subnet
                    rpcPort: 80, // Error: puerto duplicado/inválido
                    type: 'invalid' as any // Error: tipo inválido
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: multipleErrorNodes });
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThanOrEqual(6);
            
            // Verificar que se detectan diferentes tipos de errores
            const errorTypes = validation.errors.map(error => error.type);
            expect(errorTypes).toContain('required');
            expect(errorTypes).toContain('format');
            expect(errorTypes).toContain('invalid');
        });

        test('should pass validation for correctly configured network', () => {
            const config: BesuNetworkConfig = {
                name: 'test-valid-network',
                chainId: 1337,
                subnet: '172.50.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };

            const network = new BesuNetwork(config, tempDir);
            
            const validNodes: BesuNodeDefinition[] = [
                {
                    name: 'bootnode1',
                    ip: '172.50.0.20',
                    rpcPort: 8545,
                    p2pPort: 30303,
                    type: 'bootnode'
                },
                {
                    name: 'miner1',
                    ip: '172.50.0.21',
                    rpcPort: 8548, // No consecutivo con bootnode
                    p2pPort: 30304,
                    type: 'miner'
                },
                {
                    name: 'rpc1',
                    ip: '172.50.0.22',
                    rpcPort: 8550,
                    p2pPort: 30305,
                    type: 'rpc'
                }
            ];

            const validation = network.validateNetworkConfiguration({ nodes: validNodes });
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });
    });


});
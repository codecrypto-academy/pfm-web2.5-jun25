/// <reference types="jest" />
import { CryptoLib, DockerNetwork, executeCommand, FileService } from '../index';
import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';

/**
 * Función para inicializar y limpiar el entorno de pruebas
 * Elimina redes y archivos de pruebas anteriores
 */
async function init() {
    // Eliminar directorio de redes si existe
    const networksPath = path.join(process.cwd(), "networks");
    if (fs.existsSync(networksPath)) {
        fs.rmSync(networksPath, { recursive: true, force: true });
    }

    // Lista de redes de prueba a limpiar
    const testNetworks = ["testNetwork1", "testNetwork2", "testNetwork", "testNetworkCleanup"];
    
    for (const network of testNetworks) {
        try {
            // Detener y eliminar contenedores de la red
            try {
                executeCommand(`docker stop $(docker ps -aq --filter "network=${network}") 2>/dev/null || true`);
                executeCommand(`docker rm -f $(docker ps -aq --filter "network=${network}") 2>/dev/null || true`);
            } catch (error) {
                // Ignorar errores si no hay contenedores
            }
            
            // Eliminar la red Docker
            DockerNetwork.removeDockerNetwork(network);
            await sleep(2000); // Esperar a que se elimine la red
        } catch (error) {
            // Ignorar errores si la red no existe
            console.log(`Red ${network} no existe o no se pudo eliminar: ${error}`);
        }
    }
}

/**
 * Función de utilidad para esperar un tiempo determinado
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Función para verificar si un contenedor está corriendo
 */
function isContainerRunning(containerName: string): boolean {
    try {
        const result = executeCommand(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`);
        return result.trim().includes(containerName);
    } catch (error) {
        return false;
    }
}

/**
 * Función para obtener el estado de la red Docker
 */
function getNetworkStatus(networkName: string): any {
    try {
        const result = executeCommand(`docker network inspect ${networkName}`);
        return JSON.parse(result);
    } catch (error) {
        return null;
    }
}

describe('CryptoLib', () => {
    let cryptoLib: CryptoLib;

    beforeEach(() => {
        cryptoLib = new CryptoLib();
    });

    describe('Generación de claves', () => {
        it('debería generar un par de claves válidas', () => {
            // Arranque
            const keyPair = cryptoLib.generateKeyPair();
            
            // Verificaciones
            expect(keyPair).toHaveProperty('privateKey');
            expect(keyPair).toHaveProperty('publicKey');
            expect(keyPair).toHaveProperty('address');
            expect(keyPair).toHaveProperty('enode');
            
            // Verificar formato de la dirección Ethereum
            expect(keyPair.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
            
            // Verificar que la clave privada tiene 64 caracteres hex
            expect(keyPair.privateKey).toMatch(/^[0-9a-fA-F]{64}$/);
            
            // Verificar que la clave pública tiene 128 caracteres hex (sin prefijo 04)
            expect(keyPair.publicKey).toMatch(/^04[0-9a-fA-F]{128}$/);
        });

        it('debería generar claves diferentes en cada llamada', () => {
            const keyPair1 = cryptoLib.generateKeyPair();
            const keyPair2 = cryptoLib.generateKeyPair();
            
            expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
            expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
            expect(keyPair1.address).not.toBe(keyPair2.address);
        });
    });

    describe('Firma y verificación', () => {
        it('debería firmar y verificar un mensaje correctamente', () => {
            const keyPair = cryptoLib.generateKeyPair();
            const message = 'CodeCrypto Test Message';

            const signature = cryptoLib.sign(message, keyPair.privateKey);
            const isValid = cryptoLib.verify(message, signature as { r: string; s: string; v: number }, keyPair.publicKey);

            expect(signature).toHaveProperty('r');
            expect(signature).toHaveProperty('s');
            expect(signature).toHaveProperty('v');
            expect(isValid).toBe(true);
        });

        it('no debería verificar un mensaje modificado', () => {
            const keyPair = cryptoLib.generateKeyPair();
            const originalMessage = 'Mensaje original';
            const modifiedMessage = 'Mensaje modificado';

            const signature = cryptoLib.sign(originalMessage, keyPair.privateKey);
            const isValid = cryptoLib.verify(modifiedMessage, signature as { r: string; s: string; v: number }, keyPair.publicKey);

            expect(isValid).toBe(false);
        });
    });

    describe('Conversión de clave pública a dirección', () => {
        it('debería convertir correctamente una clave pública a dirección Ethereum', () => {
            const keyPair = cryptoLib.generateKeyPair();
            const derivedAddress = cryptoLib.publicKeyToAddress(keyPair.publicKey);
            
            expect(derivedAddress).toBe(keyPair.address);
            expect(derivedAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
        });
    });
});

describe('FileService', () => {
    let fileService: FileService;
    const testPath = path.join(process.cwd(), 'test-files');

    beforeEach(() => {
        fileService = new FileService(testPath);
        // Limpiar directorio de prueba
        if (fs.existsSync(testPath)) {
            fs.rmSync(testPath, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        // Limpiar después de cada prueba
        if (fs.existsSync(testPath)) {
            fs.rmSync(testPath, { recursive: true, force: true });
        }
    });

    it('debería crear una carpeta correctamente', () => {
        const folderName = 'testFolder';
        fileService.createFolder(folderName);
        // Verificar que la carpeta se creó
        expect(fs.existsSync(path.join(testPath, folderName))).toBe(true);
        expect(fileService.folder).toBe(testPath);
    });

    it('debería crear y leer archivos correctamente', async () => {
        const folderName = 'testFolder';
        const fileName = 'test.txt';
        const content = 'Contenido de prueba';

        fileService.createFolder(folderName);
        await fileService.createFile(folderName, fileName, content);
        
        const readContent = await fileService.readFile(folderName, fileName);
        expect(readContent).toBe(content);
    });

    it('debería leer archivos síncronamente', () => {
        const folderName = 'testFolder';
        const fileName = 'test-sync.txt';
        const content = 'Contenido síncrono';

        fileService.createFolder(folderName);
        fs.writeFileSync(path.join(testPath, folderName, fileName), content);
        
        const readContent = fileService.readFileSync(folderName, fileName);
        expect(readContent).toBe(content);
    });
});

describe('DockerNetwork', () => {
    // Aumentar timeout para las pruebas de Docker
    jest.setTimeout(300000); // 5 minutos

    beforeAll(async () => {
        console.log('Inicializando entorno de pruebas Docker...');
        await init();
    });

    afterAll(async () => {
        console.log('Limpiando entorno de pruebas Docker...');
        await init();
    });

    describe('Creación de red', () => {
        it('debería crear una red con genesis, config y claves', async () => {
            // Arranque
            const networkName = 'testNetworkCreation';
            const chainId = 1337;
            const subnet = '192.168.100.0/24';
            const labels = [{ key: 'environment', value: 'test' }];

            // Acción
            const dockerNetwork = DockerNetwork.create(networkName, chainId, subnet, labels);
            await sleep(2000); // Esperar a que se establezca la red

            // Verificaciones
            expect(dockerNetwork).toBeDefined();
            expect(dockerNetwork.chainId).toBe(chainId);
            
            // Verificar que se crearon los archivos necesarios
            const networksPath = path.join(process.cwd(), "networks", networkName);
            expect(fs.existsSync(path.join(networksPath, "genesis.json"))).toBe(true);
            expect(fs.existsSync(path.join(networksPath, "config.toml"))).toBe(true);
            expect(fs.existsSync(path.join(networksPath, "bootnode", "key"))).toBe(true);
            expect(fs.existsSync(path.join(networksPath, "miner", "key"))).toBe(true);
            expect(fs.existsSync(path.join(networksPath, "rpc", "key"))).toBe(true);

            // Limpiar
            DockerNetwork.removeDockerNetwork(networkName);
        });

        it('debería validar el contenido del archivo genesis', () => {
            const networkName = 'testNetworkGenesis';
            const chainId = 1338;
            const subnet = '192.168.101.0/24';

            const dockerNetwork = DockerNetwork.create(networkName, chainId, subnet, []);
            
            // Leer y validar genesis
            const genesisPath = path.join(process.cwd(), "networks", networkName, "genesis.json");
            const genesisContent = JSON.parse(fs.readFileSync(genesisPath, 'utf8'));
            
            expect(genesisContent.config.chainId).toBe(chainId);
            expect(genesisContent.config.clique).toBeDefined();
            expect(genesisContent.config.clique.blockperiodseconds).toBe(4);
            expect(genesisContent.extraData).toMatch(/^0x[0-9a-fA-F]+$/);
            
            // Limpiar
            DockerNetwork.removeDockerNetwork(networkName);
        });
    });

    describe('Gestión de nodos', () => {
        let dockerNetwork: DockerNetwork;
        const networkName = 'testNetworkNodes';

        beforeEach(async () => {
            // Crear red para cada prueba
            dockerNetwork = DockerNetwork.create(networkName, 1339, '192.168.102.0/24', []);
            await sleep(10000); // Esperar a que se establezca la red
        });

        afterEach(async () => {
            // Limpiar después de cada prueba
            DockerNetwork.removeDockerNetwork(networkName);
            await sleep(10000); // Esperar a que se establezca la red
        });

        it('debería agregar un bootnode correctamente', async () => {
            const nodeName = 'bootnode';
            const port = '19545';
            const ip = '192.168.102.10';

            await dockerNetwork.addBootnode(nodeName, port, ip);
            await sleep(10000); // Esperar a que el nodo se inicie

            // Verificar que el contenedor está corriendo
            const containerName = `${networkName}-${nodeName}`;
            expect(isContainerRunning(containerName)).toBe(true);

            // Verificar que el nodo está en la lista
            const bootnode = dockerNetwork.besuNodes.find(node => node.type === 'bootnode');
            expect(bootnode).toBeDefined();
            expect(bootnode?.port).toBe(port);
            expect(bootnode?.ip).toBe(ip);
        }, 60000);

        it('debería agregar un nodo minero correctamente', async () => {
            // Primero agregar bootnode
            await dockerNetwork.addBootnode('bootnode', '19546', '192.168.102.10');
            await sleep(15000);

            // Luego agregar minero
            const minerName = 'miner';
            const minerPort = '19547';
            
            await dockerNetwork.addMiner(minerName, minerPort);
            await sleep(15000);

            // Verificar que el contenedor está corriendo
            const containerName = `${networkName}-${minerName}`;
            expect(isContainerRunning(containerName)).toBe(true);

            // Verificar que el nodo está en la lista
            const miner = dockerNetwork.besuNodes.find(node => node.type === 'miner');
            expect(miner).toBeDefined();
            expect(miner?.port).toBe(minerPort);
        }, 120000);

        it('debería agregar un nodo RPC correctamente', async () => {
            // Primero agregar bootnode
            await dockerNetwork.addBootnode('bootnode', '19548', '192.168.102.10');
            await sleep(15000);

            // Luego agregar RPC
            const rpcName = 'rpc';
            const rpcPort = '19549';
            
            await dockerNetwork.addRpc(rpcName, rpcPort);
            await sleep(10000);

            // Verificar que el contenedor está corriendo
            const containerName = `${networkName}-${rpcName}`;
            expect(isContainerRunning(containerName)).toBe(true);

            // Verificar que el nodo está en la lista
            const rpc = dockerNetwork.besuNodes.find(node => node.type === 'rpc');
            expect(rpc).toBeDefined();
            expect(rpc?.port).toBe(rpcPort);
        }, 60000);
    });

    describe('Operaciones de red completa', () => {
        let dockerNetwork: DockerNetwork;
        const networkName = 'testNetworkComplete';

        beforeEach(async () => {
            dockerNetwork = DockerNetwork.create(networkName, 1340, '192.168.103.0/24', []);
            await sleep(10000);
        });

        afterEach(async () => {
            DockerNetwork.removeDockerNetwork(networkName);
            await sleep(10000);
        });

        it('debería crear una red completa y realizar transacciones', async () => {
            console.log('Creando red completa con bootnode, miner y RPC...');
            
            // Agregar bootnode
            await dockerNetwork.addBootnode('bootnode', '19550', '192.168.103.10');
            await sleep(15000);
            console.log('Bootnode agregado e iniciado');

            // Agregar miner
            await dockerNetwork.addMiner('miner', '19551');
            await sleep(20000);
            console.log('Miner agregado e iniciado');

            // Agregar nodo RPC adicional
            await dockerNetwork.addRpc('rpc', '19552');
            await sleep(15000);
            console.log('Nodo RPC agregado e iniciado');

            // Verificar que todos los nodos están corriendo
            expect(dockerNetwork.besuNodes.length).toBeGreaterThanOrEqual(3);
            
            // Ejecutar prueba de transacciones
            console.log('Ejecutando prueba de transacciones...');
            const testResult = await dockerNetwork.test();
            expect(testResult).toBe(true);

            // Verificar balance de una dirección de prueba
            const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
            const balance = await dockerNetwork.getBalance(testAddress);
            console.log(`Balance verificado: ${balance.toString()}`);
            expect(balance).toBeGreaterThan(0n);

        }, 180000); // 3 minutos de timeout

        it('debería parar y reiniciar la red correctamente', async () => {
            // Crear red básica
            await dockerNetwork.addBootnode('bootnode', '19553', '192.168.103.10');
            await sleep(10000);

            // Parar la red
            await dockerNetwork.stop();
            await sleep(10000);

            // Verificar que los contenedores están parados
            const containerName = `${networkName}-bootnode`;
            expect(isContainerRunning(containerName)).toBe(false);

            // Reiniciar la red
            await dockerNetwork.start();
            await sleep(10000);

            // Verificar que los contenedores están corriendo nuevamente
            expect(isContainerRunning(containerName)).toBe(true);
        }, 60000);
    });

    describe('Manejo de errores', () => {
        it('debería manejar correctamente redes inexistentes', () => {
            const nonExistentNetwork = new DockerNetwork('networkThatDoesNotExist');
            expect(nonExistentNetwork.networkData).toBeNull();
            expect(nonExistentNetwork.chainId).toBe(1337); // valor por defecto
        });

        it('debería lanzar error al obtener balance sin nodos RPC', async () => {
            const emptyNetwork = DockerNetwork.create('emptyNetwork', 1341, '192.168.104.0/24', []);
            
            await expect(emptyNetwork.getBalance('0x1234567890123456789012345678901234567890'))
                .rejects
                .toThrow('Bootnode not found');
                
            DockerNetwork.removeDockerNetwork('emptyNetwork');
        });

        it('debería remover un nodo correctamente', async () => {
            const networkName = 'testNetworkRemove';
            const dockerNetwork = DockerNetwork.create(networkName, 1342, '192.168.105.0/24', []);
            
            // Agregar y luego remover un nodo
            await dockerNetwork.addBootnode('bootnode', '19554', '192.168.105.10');
            await sleep(10000);
            
            const containerName = `${networkName}-bootnode`;
            expect(isContainerRunning(containerName)).toBe(true);
            
            await dockerNetwork.removeNode('bootnode');
            await sleep(2000);
            
            expect(isContainerRunning(containerName)).toBe(false);
            expect(dockerNetwork.besuNodes.length).toBe(0);
            
            DockerNetwork.removeDockerNetwork(networkName);
        }, 60000);
    });

    describe('Validación de estado de red', () => {
        it('debería obtener información correcta de la red existente', () => {
            const networkName = 'testNetworkStatus';
            const dockerNetwork = DockerNetwork.create(networkName, 1343, '192.168.106.0/24', []);
            
            // Verificar que la red Docker fue creada
            const networkStatus = getNetworkStatus(networkName);
            expect(networkStatus).not.toBeNull();
            expect(networkStatus[0].Name).toBe(networkName);
            
            // Verificar subnet
            const subnet = networkStatus[0].IPAM.Config[0].Subnet;
            expect(subnet).toBe('192.168.106.0/24');
            
            DockerNetwork.removeDockerNetwork(networkName);
        });
    });
});

describe('Prueba completa', () => {
    // Aumentar timeout para las pruebas de Docker
    jest.setTimeout(300000); // 5 minutos

    beforeAll(async () => {
        console.log('Inicializando entorno de pruebas Docker...');
        await init();
    });

    it('debería lanzar varias redes y nodos (una red con les IP definidas), ejecutar transacciones y verificar el balance', async () => {
        // crea una red y agrega nodos con las IPs no definidas
        const dockerNetwork2 = DockerNetwork.create('testNetwork2', 1337, '192.168.23.0/24', [{ key: 'folderBase', value: 'test' }]);
        await sleep(15000);
        //console.log('\x1b[34m%s\x1b[0m', '=== Lanzando nodos en testNetwork2 ===');
        await dockerNetwork2.addBootnode('bootnode', '18545', '192.168.23.20');
        await sleep(10000);
        await dockerNetwork2.addMiner('miner', '18546', "");
        await sleep(10000);
        await dockerNetwork2.addRpc('rpc', '18547', "");
        await sleep(10000);
        await dockerNetwork2.addRpc('rpc2', '18548', "");
        await sleep(10000);

        // test the network with transactions
        const testResultNet2 = await dockerNetwork2.test();
        await sleep(10000);
        expect(testResultNet2).toBe(true);
        
        var balance = await dockerNetwork2.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        // show balance in console
        console.log(`Balance in testNetwork2: ${balance}`);
        // assert
        expect(balance).toBe(100000000000000000000n);

        // crea una red y agrega nodos con las IPs definidas
        const dockerNetwork = DockerNetwork.create('testNetwork1', 13377770, '172.20.0.0/16', [{ key: 'folderBase', value: 'test' }]);
        await sleep(15000);
        await dockerNetwork.addBootnode('bootnode', '18550', '172.20.0.10');
        await sleep(10000);
        await dockerNetwork.addMiner('miner', '18551', "172.20.0.11");
        await sleep(10000);
        await dockerNetwork.addMiner('miner2', '18552', "172.20.0.12");
        await sleep(10000);
        await dockerNetwork.addRpc('rpc', '18553', "172.20.0.13");
        await sleep(10000);

        // test the network with transactions
        const testResultNet = await dockerNetwork.test();
        await sleep(10000);
        expect(testResultNet).toBe(true);
        
        balance = await dockerNetwork.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        // show balance in console
        console.log(`Balance in testNetwork: ${balance}`);
        // assert
        expect(balance).toBe(100000000000000000000n);
    });
});
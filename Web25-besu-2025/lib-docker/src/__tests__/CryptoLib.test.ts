/// <reference types="jest" />
import { CryptoLib, DockerNetwork, executeCommand, FileService } from '../index';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function init() {
    fs.rmSync(path.join(process.cwd(), "networks"), { recursive: true, force: true });
    ["testNetwork1", "testNetwork2", "testNetwork"].forEach((network) => {
        try {
            DockerNetwork.removeDockerNetwork(network);
        } catch (error) {
            // Ignore errors if network doesn't exist
        }
    });
}

describe('CryptoLib', () => {
    let cryptoLib: CryptoLib;

    beforeEach(() => {
        cryptoLib = new CryptoLib();
    });

    describe('generateKeyPair', () => {
        it('should generate valid key pair', () => {
            // act
            const keyPair = cryptoLib.generateKeyPair();
            // assert
            expect(keyPair).toHaveProperty('privateKey');
            expect(keyPair).toHaveProperty('publicKey');
            expect(keyPair).toHaveProperty('address');
            expect(keyPair.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        });
    });

    describe('sign and verify', () => {
        it('should sign and verify message correctly', () => {
            const keyPair = cryptoLib.generateKeyPair();
            const message = 'CodeCrypto';

            const signature = cryptoLib.sign(message, keyPair.privateKey);

            const isValid = cryptoLib.verify(message, signature as { r: string; s: string; v: number }, keyPair.publicKey);

            expect(isValid).toBe(true);
        });
    });

    describe('FileService', () => {
        it('should create a folder', async () => {
            const fileService = new FileService('test');
            await fileService.createFolder('testFolder');
            expect(fileService.folder).toBe('test');
        });
    });

    describe('create', () => {
        it('create network, genesis, config, keys', () => {
            // arrange
            init();
            // act
            const dockerNetwork = DockerNetwork.create('testNetwork2', 1337, '192.168.23.0/24', [{ key: 'folderBase', value: 'test' }]);
            // assert
            expect(dockerNetwork).toBeDefined();
        });
    });
    jest.setTimeout(160000); // Set timeout to 60 seconds
    describe('addNode', () => {
        it('add node to network', async () => {
            // arrange
            init();
            /*const dockerNetwork = DockerNetwork.create('testNetwork1', 1337, '172.20.0.0/16', [{ key: 'folderBase', value: 'test' }]);
            dockerNetwork.addBootnode('bootnode', '18545', '172.20.0.10');
            dockerNetwork.addMiner('miner', '18546',"172.20.0.11");
            dockerNetwork.addRpc('rpc', '18547',"172.20.0.12");
            dockerNetwork.addRpc('rpc2', '18548',"172.20.0.13");*/
            // act
            
            const dockerNetwork2 = DockerNetwork.create('testNetwork2', 1338, '192.168.23.0/24', [{ key: 'folderBase', value: 'test' }]);
            dockerNetwork2.addNode('bootnode', '18545', '192.168.23.20');
            dockerNetwork2.addMiner('miner', '18546',"");
            dockerNetwork2.addNode('rpc', '18547',"");
            dockerNetwork2.addNode('rpc2', '18548',"");
            // act
            const promise2 = new Promise((resolve, reject) => {
                setTimeout(async () => {
                    await dockerNetwork2.test();
                    resolve(true);
                }, 10000);
            });
            await promise2;
            
            const balance = await dockerNetwork2.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
            // show balance in console
            console.log(`Balance: ${balance}`);
            // assert
            expect(balance).toBe(100000000000000000000n);
        });
    });

    describe('getBalance', () => {
        it('get balance', async () => {
            const dockerNetwork = new DockerNetwork("testNetwork2");
            const containers = await dockerNetwork.containers;
            console.log(dockerNetwork.networkData);
            const j = executeCommand(`docker inspect $(docker ps -q --filter "network=testNetwork2")`)
            fs.writeFileSync("test.json", j);
            console.log(dockerNetwork.containers);
        });
    });
}); 
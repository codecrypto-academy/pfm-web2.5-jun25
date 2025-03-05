import { ec as EC } from 'elliptic';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import fs from 'fs';
import path from 'path';


import { execSync } from 'child_process';

export function executeCommand(command: string): string {
    try {
        return execSync(command, { encoding: 'utf-8' });
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Command execution failed: ${error.message}`);
        }
        throw error;
    }
}


export interface DockerNetwork {
    name: string;
    subnet: string;
    label: string;
}
export interface KeyValue {
    key: string;
    value: string;
}

export class DockerNetwork {
    private _networkData: any;
    private _name: string;
    private _fileService: FileService;
    
    constructor(name: string) {

        // Get network metadata from docker inspect
        const networkData = JSON.parse(executeCommand(`docker network inspect ${name}`))
        console.log(networkData);
        this._networkData = networkData;
        //this._containers = JSON.parse(executeCommand(`docker inspect \$(docker ps -q --filter "network=${name}")`))
        //console.log(this._containers);

       
        this._name = name;
        this._fileService = new FileService(path.join(process.cwd(), "networks"));
        // accceso al docker inspect
    }
   
    get fileService(): FileService {
        return this._fileService;
    }
    get networkData(): any {
        return this._networkData;
    }
    get containers(): any[] {
        // return this._containers;
        return []
    }
    static create(name: string, chainId: number, subnet: string, label: KeyValue[]) {
        const fileService = new FileService(path.join(process.cwd(), "networks"));
        // create folder
        fileService.createFolder(name);
        // create docker network
        label.push({ key: "folderBase", value: path.join(process.cwd(), "networks") });
        label.push({ key: "folder", value: path.join(process.cwd(), "networks", name) });
        const dockerNetwork = DockerNetwork.createDockerNetwork(name, subnet, label);
        // create folder
        const bootnodeKeys = createKeys(fileService, name, subnet, "bootnode");
        const minerKeys = createKeys(fileService, name, subnet, "miner");
        const rpcKeys = createKeys(fileService, name, subnet, "rpc");
        const nodeKeys = createKeys(fileService, name, subnet, "node");
        // genesis
        const genesis = createGenesis(chainId, minerKeys.address);
        fileService.createFile(name, "genesis.json", JSON.stringify(genesis, null, 2));


        const config = createConfig(bootnodeKeys.enode);
        fileService.createFile(name, "config.toml", config);

        // createNode(fileService, name, "bootnode", "19544");
        // createNode(fileService, name, "miner", "9545");
        // createNode(fileService, name, "rpc", "9546");
        // createNode(fileService, name, "node", "9547");

        return new DockerNetwork(name);

        function createConfig(bootnode: string) {
            return `genesis-file="/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
# JSON-RPC

bootnodes=["${bootnode}"]
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]            
`
        }
        function createGenesis(chainId: number, address: string) {
            const cleanAddress = address.replace("0x", "");
            return {
                "config": {
                    "chainId": chainId,
                    "londonBlock": 0,
                    "clique": {
                        "blockperiodseconds": 4,
                        "epochlength": 30000,
                        "createemptyblocks": true
                    }
                },
                "extraData": `0x0000000000000000000000000000000000000000000000000000000000000000${cleanAddress}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
                "gasLimit": "0x1000000",
                "difficulty": "0x1",
                "alloc": {
                    [`0x${cleanAddress}`]: {
                        "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
                    }
                }
            }
        }

        function    createKeys(fileService: FileService, name: string, subnet: string, nodo: string) {
            const cryptoLib = new CryptoLib();
            const keys = cryptoLib.generateKeyPair();
            fileService.createFolder(`${name}/${nodo}`);
            fileService.createFile(`${name}/${nodo}`, "key", keys.privateKey);
            fileService.createFile(`${name}/${nodo}`, "address", keys.address);
            fileService.createFile(`${name}/${nodo}`, "publicKey", keys.publicKey);
            var ip = `${subnet.split('/')[0]
                .split('.').slice(0, -1).join('.')}.20`;
            var enode = `enode://${keys.publicKey.slice(2)}@${ip}:30303`
            fileService.createFile(`${name}/bootnode`, "enode", `enode://${keys.publicKey.slice(2)}@${ip}:30303`);
            keys.enode = enode as string;
            return keys;
        }
    }
    static createDockerNetwork(name: string, subnet: string, label: KeyValue[]): DockerNetwork {
        // create docker network
        var labelString = label.map(l => `${l.key}=${l.value}`).join(',');
        try {
            executeCommand(`docker network create ${name} --subnet ${subnet} --label ${labelString}`);
        } catch (error) {
            throw new Error(`Failed to create docker network: ${error}`);
        }

        return new DockerNetwork(name);
    }
    static removeDockerNetwork(name: string) {
        // remove folder
        fs.rmSync(path.join(process.cwd(), "networks", name), { recursive: true, force: true });
        // remove docker network
        try {
            executeCommand(`docker rm -f $(docker ps -aq --filter "network=${name}")`);
        } catch (error) {
        }
        try {
            executeCommand(`docker network rm ${name}`);
        } catch (error) {
        }
    }
    addNode(
        nodeName: string,
        port: string,
        ip: string
    ) {
        try {
            executeCommand(`docker rm -f ${this._name}-${nodeName}`);
        } catch (error) {
            console.log(`Error removing node: ${error}`);
        }
        executeCommand(`docker run -d \
        --name ${this._name}-${nodeName}  \
        --label nodo=${nodeName} \
        ${ip ? `--ip ${ip}` : ""} \
        --label network=${this._name} \
        --label port=${port} \
        -p ${port}:8545 \
        --network ${this._name} \
        -v ${this._fileService.folder}/${this._name}:/data \
        hyperledger/besu:latest \
        --config-file=/data/config.toml \
        --data-path=/data/${nodeName}/data \
        --node-private-key-file=/data/${nodeName}/key
        `);
    }

    async addBootnode(bootnode: string) {

        // add bootnode to network
    }
    async addMiner(miner: string) {
        // add miner to network
    }
    async addRpc(rpc: string) {
        // add rpc to network
    }

    async removeNode(node: string) {
        // remove node from network
        try {
            executeCommand(`docker rm -f ${this._name}-${node}`);
        } catch (error) {
            console.log(`Error removing node: ${error}`);
        }
    }
    async start() {
        // start bootnode
        // start miner
        // start rpc
    }
    async stop() {
        // stop bootnode
        // stop miner
        // stop rpc
    }
    async getBalance(address: string) {
        // get balance
        const provider = new ethers.JsonRpcProvider('http://localhost:18546');
        const balance = await provider.getBalance(address);
        return balance;
    }
    async   test() {

        const provider = new ethers.JsonRpcProvider('http://localhost:18546');
        const minerPrivateKey = await this._fileService.readFile(this._name, "miner/key");
        console.log(minerPrivateKey);
        const wallet = new ethers.Wallet(minerPrivateKey as string, provider);
        const mnemonic = "test test test test test test test test test test test junk";
        const addresses = [];
        for (let i = 0; i < 10; i++) {
            // Derive the complete path at once
            const fullPath = `m/44'/60'/0'/0/${i}`;
            const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", fullPath);
            addresses.push(wallet.address);
            console.log(`Address ${i}: ${wallet.address} ${wallet.privateKey}`);
        }
        console.log("\nTransferring 100 ETH to each address...");
        for (const address of addresses.slice(0, 2)) {
            try {
                const tx = await wallet.sendTransaction({
                    to: address,
                    value: ethers.parseEther("100")
                });
                console.log(`Sent 100 ETH to ${address}`);
                console.log(`Transaction hash: ${tx.hash}`);
                await tx.wait(); // Wait for transaction to be mined
            } catch (error) {
                console.error(`Error sending to ${address}:`, error);
            }
        }

        return true;
    }
}
export class CryptoLib {
    private ec: EC;

    constructor() {
        this.ec = new EC('secp256k1');
    }
    /**
     * Genera un nuevo par de claves
     * @returns {Object} Par de claves pública y privada
     */
    generateKeyPair() {
        const keyPair = this.ec.genKeyPair();
        return {
            privateKey: keyPair.getPrivate('hex'),
            publicKey: keyPair.getPublic('hex'),
            address: this.publicKeyToAddress(keyPair.getPublic('hex')),
            enode: ""
        };
    }
    /**
     * Firma un mensaje con una clave privada
     */
    sign(message: string, privateKey: string) {
        const keyPair = this.ec.keyFromPrivate(privateKey);
        const msgHash = keccak256(message);
        const signature = keyPair.sign(msgHash);

        return {
            r: signature.r.toString('hex'),
            s: signature.s.toString('hex'),
            v: signature.recoveryParam
        };
    }
    /**
     * Verifica una firma
     */
    verify(message: string, signature: { r: string, s: string, v: number }, publicKey: string) {
        const keyPair = this.ec.keyFromPublic(publicKey, 'hex');
        const msgHash = keccak256(message);

        return keyPair.verify(msgHash, {
            r: signature.r,
            s: signature.s
        });
    }
    /**
     * Convierte una clave pública a una dirección Ethereum
     */
    publicKeyToAddress(publicKey: string): string {
        // Remove '04' prefix if present since it indicates uncompressed public key format
        const pubKey = publicKey.startsWith('04') ? publicKey.slice(2) : publicKey;

        // Convert hex public key string to Buffer
        const pubKeyBuffer = Buffer.from(pubKey, 'hex');

        // Hash the public key using Keccak-256
        const addressBuffer = keccak256(pubKeyBuffer);

        // Take last 20 bytes (40 hex chars) to get Ethereum address
        const address = addressBuffer.slice(-20);

        // Add '0x' prefix and convert to checksum address using ethers
        return ethers.getAddress('0x' + Buffer.from(address).toString('hex'));
    }
}
export class FileService {
    private path: string;
    constructor(path: string) {
        this.path = path;
    }
    async createFolder(folder: string) {
        // create folder
        fs.mkdirSync(path.join(this.path, folder), { recursive: true });
        return folder;
    }
    async readFile(folder: string, file: string) {
        // read file
        return fs.readFileSync(path.join(this.path, folder, file), 'utf8');
    }
    async createFile(folder: string, file: string, content: string) {
        // create file
        fs.writeFileSync(path.join(this.path, folder, file), content);
        return file;
    }
    get folder(): string {
        return this.path;
    }
}

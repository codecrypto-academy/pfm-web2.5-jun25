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

export interface DockerNetworkInterface {
    name: string;
    subnet: string;
    label: string;
}

export interface KeyValue {
    key: string;
    value: string;
}

export type typeNode = 'bootnode' | 'miner' | 'rpc' | 'node';

export interface BesuNode {
    name: string;
    ip: string;
    port: string;
    type: typeNode;
}

export interface KeyPair {
    privateKey: string;
    publicKey: string;
    address: string;
    enode: string;
}

export class DockerNetwork {
    private _networkData: any;
    private _name: string;
    private _fileService: FileService;
    private _containers: any[] = [];
    private _besuNodes: BesuNode[] = [];
    private _chainId: number;
    
    constructor(name: string) {
        this._name = name;
        this._fileService = new FileService(path.join(process.cwd(), "networks"));
        
        try {
            // Get network metadata from docker inspect
            const networkData = JSON.parse(executeCommand(`docker network inspect ${name}`));
            console.log("\x1b[33m%s\x1b[0m", `Network data:`);
            console.log(networkData);
            this._networkData = networkData;

            // Read chain ID from genesis file if it exists
            try {
                const genesisContent = this._fileService.readFileSync(name, "genesis.json");
                const genesis = JSON.parse(genesisContent);
                this._chainId = genesis.config.chainId;
            } catch (error) {
                console.log(`Could not read genesis file: ${error}`);
                this._chainId = 1337; // default
            }

            // Populate existing nodes from docker containers
            this._populateExistingNodes();
        } catch (error) {
            console.log(`Network ${name} may not exist yet: ${error}`);
            this._networkData = null;
            this._chainId = 1337;
        }
    }

    private _populateExistingNodes() {
        try {
            const containersJson = executeCommand(`docker inspect $(docker ps -aq --filter "network=${this._name}")`);
            const containers = JSON.parse(containersJson);
            
            for (const container of containers) {
                const labels = container.Config.Labels;
                if (labels && labels.network === this._name) {
                    let nodeType: typeNode | undefined;
                    for (const possibleType of ['bootnode', 'miner', 'rpc', 'node'] as typeNode[]) {
                        if (labels.nodo && labels.nodo.startsWith(possibleType)) {
                            nodeType = possibleType;
                            break;
                        }
                    }
                    if (!nodeType) continue;
                    //const nodeType = labels.nodo as 'bootnode' | 'miner' | 'rpc' | 'node';
                    const port = labels.port;
                    const networkSettings = container.NetworkSettings.Networks[this._name];
                    const ip = networkSettings ? networkSettings.IPAddress : '';
                    
                    this._besuNodes.push({
                        name: container.Name.replace('/', ''),
                        ip: ip,
                        port: port,
                        type: nodeType
                    });
                }
            }
        } catch (error) {
            console.log(`No existing containers found for network ${this._name}: ${error}`);
        }
    }
   
    get fileService(): FileService {
        return this._fileService;
    }
    
    get networkData(): any {
        return this._networkData;
    }
    
    get containers(): any[] {
        return this._containers;
    }
    
    get besuNodes(): BesuNode[] {
        return this._besuNodes;
    }

    get chainId(): number {
        return this._chainId;
    }

    static create(name: string, chainId: number, subnet: string, label: KeyValue[]) {
        const fileService = new FileService(path.join(process.cwd(), "networks"));
        
        // create folder
        fileService.createFolder(name);
        
        // create docker network
        label.push({ key: "folderBase", value: path.join(process.cwd(), "networks") });
        label.push({ key: "folder", value: path.join(process.cwd(), "networks", name) });
        const dockerNetwork = DockerNetwork.createDockerNetwork(name, subnet, label);
        
        // Generate keys for different node types
        const bootnodeKeys = createKeys(fileService, name, subnet, "bootnode");
        const minerKeys = createKeys(fileService, name, subnet, "miner");
        const rpcKeys = createKeys(fileService, name, subnet, "rpc");
        const nodeKeys = createKeys(fileService, name, subnet, "node");
        
        // Create genesis with miner as initial signatory
        const genesis = createGenesis(chainId, minerKeys.address);
        fileService.createFile(name, "genesis.json", JSON.stringify(genesis, null, 2));

        // Create config with bootnode enode
        const config = createConfig(bootnodeKeys.enode);
        fileService.createFile(name, "config.toml", config);

        // Create config for fullnode with bootnode enode
        const configFullNode = createConfigFullNode (bootnodeKeys.enode);
        fileService.createFile(name, "config-fullnode.toml", configFullNode);

        const dockerNetworkInstance = new DockerNetwork(name);
        dockerNetworkInstance._chainId = chainId;
        return dockerNetworkInstance;

        function createConfig(bootnode: string) {
            return `genesis-file="/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true

# Bootnodes
bootnodes=["${bootnode}"]

# JSON-RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN","TRACE","DEBUG","TXPOOL","PERM"]
host-allowlist=["*"]

# Mining (will be enabled only for miner nodes)
miner-enabled=false
miner-coinbase="0x0000000000000000000000000000000000000000"
`;
        }

        function createConfigFullNode(bootnode: string) {
            return `genesis-file="/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true

# Bootnodes
bootnodes=["${bootnode}"]
`
        }

        function createGenesis(chainId: number, address: string) {
            const cleanAddress = address.replace("0x", "");
            return {
                "config": {
                    "chainId": chainId,
                    "homesteadBlock": 0,
                    "eip150Block": 0,
                    "eip155Block": 0,
                    "eip158Block": 0,
                    "byzantiumBlock": 0,
                    "constantinopleBlock": 0,
                    "petersburgBlock": 0,
                    "istanbulBlock": 0,
                    "berlinBlock": 0,
                    "londonBlock": 0,
                    "clique": {
                        "blockperiodseconds": 4,
                        "epochlength": 30000,
                        "createemptyblocks": true
                    }
                },
                "extraData": `0x0000000000000000000000000000000000000000000000000000000000000000${cleanAddress}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
                "gasLimit": "0x47b760",
                "difficulty": "0x1",
                "alloc": {
                    [`0x${cleanAddress}`]: {
                        "balance": "0x2000000000000000000000000000000000000000000000000000000000000"
                    }
                }
            };
        }

    }
    

    static createDockerNetwork(name: string, subnet: string, label: KeyValue[]): DockerNetwork {
        const labelString = label.map(l => `${l.key}=${l.value}`).join(',');
        console.log(`Creating docker network ${name} with subnet ${subnet} and labels ${labelString}`);
        
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
        // remove containers from docker network
        try {
            executeCommand(`docker rm -f $(docker ps -aq --filter "network=${name}")`);
        } catch (error) {
            console.log(`Error removing containers from network: ${error}`);
        }
        // remove docker network
        try {
            executeCommand(`docker network rm ${name}`);
        } catch (error) {
            console.log(`Error removing network: ${error}`);
        }
    }

    private async addNode(
        nodeName: string,
        nodeType: typeNode,
        port: string,
        ip?: string
    ): Promise<void> {
        // Remove existing container if it exists
        try {
            executeCommand(`docker rm -f ${this._name}-${nodeName}`);
        } catch (error) {
            console.log(`Container ${this._name}-${nodeName} doesn't exist or couldn't be removed: ${error}`);
        }

        if (nodeName !== nodeType) {
            // Create repository node if it doesn't exist
            const nodeDir = path.join(this._fileService.folder, this._name, nodeName);
            if (!fs.existsSync(nodeDir)) {
                // Create the directory for the node
                fs.mkdirSync(nodeDir, { recursive: true });
                // Create keys for the node
                const subnet = this._networkData?.[0]?.IPAM?.Config?.[0]?.Subnet || "";
                createKeys(this._fileService, this._name, subnet, nodeName);
            }
        }

        // Auto-assign IP if not provided
        /*if (!ip) {
            const networkInfo = this._networkData?.[0];
            if (networkInfo && networkInfo.IPAM && networkInfo.IPAM.Config) {
                const subnet = networkInfo.IPAM.Config[0].Subnet;
                const baseIP = subnet.split('/')[0].split('.').slice(0, -1).join('.');
                switch (nodeType) {
                    case 'bootnode':
                        ip = `${baseIP}.10`;
                        break;
                    case 'miner':
                        ip = `${baseIP}.11`;
                        break;
                    case 'rpc':
                        ip = `${baseIP}.12`;
                        break;
                }
            }
        }*/

        try {
            let dockerCommand: string;
            
            if (nodeType === "bootnode") {
                if (ip) {
                    // change ip in enode file
                    var default_ip = `${ip.split('.').slice(0, -1).join('.')}.10`;

                    if (default_ip !== ip) {
                        //console.log(`Cambiar IP en el enode por ${ip}`);
                        const bootnodeEnode = await this._fileService.readFile(this._name, "bootnode/enode");
                        const updatedEnode = bootnodeEnode.replace(/@([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):30303/, `@${ip}:30303`);
                        await this._fileService.createFile(this._name, "bootnode/enode", updatedEnode);

                        const configToml = await this._fileService.readFile(this._name, "config.toml");
                        const updatedConfigToml = configToml.replace(/@([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):30303/, `@${ip}:30303`);
                        await this._fileService.createFile(this._name, "config.toml", updatedConfigToml);
                        
                        const configFullnodeToml = await this._fileService.readFile(this._name, "config-fullnode.toml");
                        const updatedConfigFullnodeToml = configFullnodeToml.replace(/@([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):30303/, `@${ip}:30303`);
                        await this._fileService.createFile(this._name, "config-fullnode.toml", updatedConfigFullnodeToml);
                    }
                }
                
                dockerCommand = `docker run -d \
                    --name ${this._name}-${nodeName} \
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
                    --node-private-key-file=/data/${nodeName}/key \
                    --genesis-file=/data/genesis.json`;
            } else if (nodeType === "miner") {
                // Read miner address for coinbase
                const minerAddress = await this._fileService.readFile(this._name, "miner/address");
                
                dockerCommand = `docker run -d \
                    --name ${this._name}-${nodeName} \
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
                    --node-private-key-file=/data/${nodeName}/key \
                    --genesis-file=/data/genesis.json \
                    --miner-enabled=true \
                    --miner-coinbase=${minerAddress.trim()}`;
            } else if (nodeType === "rpc") {
                // RPC node
                dockerCommand = `docker run -d \
                    --name ${this._name}-${nodeName} \
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
                    --genesis-file=/data/genesis.json`;
            } else {
                // Full node
                dockerCommand = `docker run -d \
                    --name ${this._name}-${nodeName} \
                    --label nodo=${nodeName} \
                    ${ip ? `--ip ${ip}` : ""} \
                    --label network=${this._name} \
                    --network ${this._name} \
                    -v ${this._fileService.folder}/${this._name}:/data \
                    hyperledger/besu:latest \
                    --config-file=/data/config-fullnode.toml \
                    --data-path=/data/${nodeName}/data \
                    --genesis-file=/data/genesis.json`;
            }

            console.log('\x1b[34m%s\x1b[0m', `Executing command: ${dockerCommand}`);
            executeCommand(dockerCommand);
            console.log(`Node ${nodeType} added to network ${this._name}`);

            // Add node to nodes list
            this._besuNodes.push({
                name: `${this._name}-${nodeName}`,
                ip: ip || '',
                port: port,
                type: nodeType
            });

            // Wait a bit for the node to start
            await this._sleep(5000);

        } catch (error) {
            throw new Error(`Error adding ${nodeType} node: ${error}`);
        }
    }

    async addBootnode(name: string, port: string, ip: string): Promise<void> {
        await this.addNode(name, 'bootnode', port, ip);
    }

    async addMiner(name: string, port: string, ip?: string): Promise<void> {
        await this.addNode(name, 'miner', port, ip);
        
        // Wait for miner to be ready
        await this._sleep(10000);
        
        // Add the miner as a signatory in Clique consensus via bootnode
        try {
            const bootnodePort = this._besuNodes.find(node => node.type === 'bootnode')?.port;
            if (!bootnodePort) {
                throw new Error('Bootnode not found - cannot propose miner');
            }

            const provider = new ethers.JsonRpcProvider(`http://localhost:${bootnodePort}`);
            
            // Get miner address
            let minerAddress = await this._fileService.readFile(this._name, "miner/address");
            minerAddress = minerAddress.trim();
            if (!minerAddress.startsWith("0x")) {
                minerAddress = "0x" + minerAddress;
            }

            // Propose the miner as a signatory
            const result = await provider.send("clique_propose", [minerAddress, true]);
            console.log(`Miner ${minerAddress} proposed as signatory:`, result);
            
        } catch (error) {
            console.error("Error adding miner to Clique consensus:", error);
        }
    }

    async addRpc(name: string, port: string, ip?: string): Promise<void> {
        await this.addNode(name, 'rpc', port, ip);
    }

    async addFullNodeRpc(name: string, port: string, ip?: string): Promise<void> {
        await this.addNode(name, 'node', port, ip);
    }


    async removeNode(nodeName: string): Promise<void> {
        const containerName = `${this._name}-${nodeName}`;
        
        try {
            executeCommand(`docker rm -f ${containerName}`);
            console.log(`Node ${nodeName} removed from network ${this._name}`);
            
            // Remove node from nodes list
            this._besuNodes = this._besuNodes.filter(node => node.name !== containerName);
        } catch (error) {
            throw new Error(`Error removing node ${nodeName}: ${error}`);
        }
    }

    async start(): Promise<void> {
        for (const besuNode of this._besuNodes) {
            try {
                executeCommand(`docker start ${besuNode.name}`);
                console.log(`Started ${besuNode.name}`);
            } catch (error) {
                console.log(`Error starting container ${besuNode.name}: ${error}`);
            }
        }
    }

    async stop(): Promise<void> {
        for (const besuNode of this._besuNodes) {
            try {
                executeCommand(`docker stop ${besuNode.name}`);
                console.log(`Stopped ${besuNode.name}`);
            } catch (error) {
                console.log(`Error stopping besu node ${besuNode.name}: ${error}`);
            }
        }
    }

    async getBalance(address: string): Promise<bigint> {
        //const rpcNode = this._besuNodes.find(node => node.type === 'bootnode' || node.type === 'rpc');
        const bootnodePort = this._besuNodes.find(node => node.type === 'bootnode')?.port;
        if (!bootnodePort) {
            throw new Error('Bootnode not found');
        }

        const provider = new ethers.JsonRpcProvider(`http://localhost:${bootnodePort}`);
        const balance = await provider.getBalance(address);
        return balance;
    }

    async test(): Promise<boolean> {
        //const rpcNode = this._besuNodes.find(node => node.type === 'bootnode' || node.type === 'rpc');
        const bootnodePort = this._besuNodes.find(node => node.type === 'bootnode')?.port;
        if (!bootnodePort) {
            throw new Error('Bootnode not found');
        }

        const provider = new ethers.JsonRpcProvider(`http://localhost:${bootnodePort}`);

        // Get miner private key
        let minerPrivateKey = await this._fileService.readFile(this._name, "miner/key");
        minerPrivateKey = minerPrivateKey.trim();
        if (!minerPrivateKey.startsWith("0x")) {
            minerPrivateKey = "0x" + minerPrivateKey;
        }
        
        const wallet = new ethers.Wallet(minerPrivateKey, provider);
        console.log(`Miner wallet address: ${wallet.address}`);

        // Generate test addresses from mnemonic
        const mnemonic = "test test test test test test test test test test test junk";
        const addresses = [];
        
        for (let i = 0; i < 10; i++) {
            const fullPath = `m/44'/60'/0'/0/${i}`;
            const testWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", fullPath);
            addresses.push(testWallet.address);
            console.log(`Address ${i}: ${testWallet.address}`);
        }

        console.log("\nTransferring 100 ETH to test addresses...");
        
        // Transfer to first 2 addresses
        for (const address of addresses.slice(0, 2)) {
            try {
                const tx = await wallet.sendTransaction({
                    to: address,
                    value: ethers.parseEther("100")
                });
                
                console.log(`Sent 100 ETH to ${address}`);
                console.log(`Transaction hash: ${tx.hash}`);
                
                await tx.wait(); // Wait for transaction to be mined
                console.log(`Transaction confirmed for ${address}`);
                
            } catch (error) {
                console.error(`Error sending to ${address}:`, error);
            }
        }

        return true;
    }

    private async _sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export class CryptoLib {
    private ec: EC;

    constructor() {
        this.ec = new EC('secp256k1');
    }

    generateKeyPair(): KeyPair {
        const keyPair = this.ec.genKeyPair();
        const privateKey = keyPair.getPrivate('hex');
        const publicKey = keyPair.getPublic('hex');
        const address = this.publicKeyToAddress(publicKey);
        
        return {
            privateKey,
            publicKey,
            address,
            enode: ""
        };
    }

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

    verify(message: string, signature: { r: string, s: string, v: number }, publicKey: string): boolean {
        const keyPair = this.ec.keyFromPublic(publicKey, 'hex');
        const msgHash = keccak256(message);

        return keyPair.verify(msgHash, {
            r: signature.r,
            s: signature.s
        });
    }

    publicKeyToAddress(publicKey: string): string {
        // Remove '04' prefix if present
        const pubKey = publicKey.startsWith('04') ? publicKey.slice(2) : publicKey;
        
        // Convert hex public key string to Buffer
        const pubKeyBuffer = Buffer.from(pubKey, 'hex');
        
        // Hash the public key using Keccak-256
        const addressBuffer = keccak256(pubKeyBuffer);
        
        // Take last 20 bytes to get Ethereum address
        const address = addressBuffer.slice(-20);
        
        // Add '0x' prefix and convert to checksum address
        return ethers.getAddress('0x' + Buffer.from(address).toString('hex'));
    }
}

export class FileService {
    private path: string;
    
    constructor(path: string) {
        this.path = path;
    }

    createFolder(folder: string): string {
        fs.mkdirSync(path.join(this.path, folder), { recursive: true });
        return folder;
    }

    async readFile(folder: string, file: string): Promise<string> {
        return fs.readFileSync(path.join(this.path, folder, file), 'utf8');
    }

    readFileSync(folder: string, file: string): string {
        return fs.readFileSync(path.join(this.path, folder, file), 'utf8');
    }

    async createFile(folder: string, file: string, content: string): Promise<string> {
        fs.writeFileSync(path.join(this.path, folder, file), content);
        return file;
    }

    get folder(): string {
        return this.path;
    }
    
}

// --- Utility function to create node keys and files ---
export function createKeys(fileService: FileService, name: string, subnet: string, nodeType: string): KeyPair {
    const cryptoLib = new CryptoLib();
    const keys = cryptoLib.generateKeyPair();
    fileService.createFolder(`${name}/${nodeType}`);
    fileService.createFile(`${name}/${nodeType}`, "key", keys.privateKey);
    fileService.createFile(`${name}/${nodeType}`, "address", keys.address);
    fileService.createFile(`${name}/${nodeType}`, "publicKey", keys.publicKey);
    // Calculate default IP based on subnet and node type
    const baseIP = subnet.split('/')[0].split('.').slice(0, -1).join('.');
    var defaultIP = `${subnet.split('/')[0]
        .split('.').slice(0, -1).join('.')}.10`;
    const enode = `enode://${keys.publicKey.slice(2)}@${defaultIP}:30303`;
    // Only save enode for bootnode
    if (nodeType === 'bootnode') {
        fileService.createFile(`${name}/${nodeType}`, "enode", enode);
    }
    return {
        ...keys,
        enode: enode
    };
}


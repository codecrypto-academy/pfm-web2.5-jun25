"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = exports.CryptoLib = exports.DockerNetwork = void 0;
exports.executeCommand = executeCommand;
exports.createKeys = createKeys;
const elliptic_1 = require("elliptic");
const ethers_1 = require("ethers");
const buffer_1 = require("buffer");
const keccak256_1 = __importDefault(require("keccak256"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const rootDir = path_1.default.resolve();
function executeCommand(command) {
    try {
        return (0, child_process_1.execSync)(command, { encoding: 'utf-8' });
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Command execution failed: ${error.message}`);
        }
        throw error;
    }
}
class DockerNetwork {
    static BASE_PATH = path_1.default.resolve(rootDir, "networks");
    _networkData;
    _name;
    _fileService;
    _containers = [];
    _besuNodes = [];
    _chainId;
    constructor(name) {
        this._name = name;
        this._fileService = new FileService(DockerNetwork.BASE_PATH);
        try {
            // Get network metadata from docker inspect
            const networkData = JSON.parse(executeCommand(`docker network inspect ${name}`));
            //console.log("\x1b[33m%s\x1b[0m", `Network data:`);
            //console.log(networkData);
            this._networkData = networkData;
            // Read chain ID from genesis file if it exists
            try {
                const genesisContent = this._fileService.readFileSync(name, "genesis.json");
                const genesis = JSON.parse(genesisContent);
                this._chainId = genesis.config.chainId;
            }
            catch (error) {
                //console.log(`Could not read genesis file: ${error}`);
                this._chainId = 1337; // default
            }
            // Populate existing nodes from docker containers
            this._populateExistingNodes();
        }
        catch (error) {
            console.log(`Network ${name} may not exist yet: ${error}`);
            this._networkData = null;
            this._chainId = 1337;
        }
    }
    _populateExistingNodes() {
        try {
            // Get container IDs first
            const containerIds = executeCommand(`docker ps -aq --filter "network=${this._name}"`).trim();
            // Only proceed if there are containers
            if (!containerIds) {
                return;
            }
            // CORRECTION: split IDs and inspect each container individually
            const containerIdList = containerIds.split('\n').filter(Boolean);
            if (containerIdList.length === 0)
                return;
            for (const containerId of containerIdList) {
                const containerJson = executeCommand(`docker inspect ${containerId}`);
                const containers = JSON.parse(containerJson);
                for (const container of containers) {
                    const labels = container.Config.Labels;
                    if (labels && labels.network === this._name) {
                        let nodeType;
                        for (const possibleType of ['bootnode', 'miner', 'rpc', 'node']) {
                            if (labels.nodo && labels.nodo.startsWith(possibleType)) {
                                nodeType = possibleType;
                                break;
                            }
                        }
                        if (!nodeType)
                            continue;
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
            }
        }
        catch (error) {
            console.log(`No existing containers found for network ${this._name}: ${error}`);
        }
    }
    get fileService() {
        return this._fileService;
    }
    get networkData() {
        return this._networkData;
    }
    get containers() {
        return this._containers;
    }
    get besuNodes() {
        return this._besuNodes;
    }
    get chainId() {
        return this._chainId;
    }
    static create(name, chainId, subnet, label, signerAddress = '', prefundedAddresses = [], values = []) {
        const fileService = new FileService(DockerNetwork.BASE_PATH);
        // create folder
        if (!fs_1.default.existsSync(DockerNetwork.BASE_PATH)) {
            fileService.createFolder(name);
        }
        // create docker network
        label.push({ key: "folderBase", value: path_1.default.join(process.cwd(), "networks") });
        label.push({ key: "folder", value: path_1.default.join(process.cwd(), "networks", name) });
        const dockerNetwork = DockerNetwork.createDockerNetwork(name, subnet, label);
        // Generate keys for different node types
        const bootnodeKeys = createKeys(fileService, name, subnet, "bootnode");
        var minerKeys;
        if (signerAddress !== '')
            minerKeys = createKeys(fileService, name, subnet, "miner", signerAddress);
        else
            minerKeys = createKeys(fileService, name, subnet, "miner");
        const validatorAddress = minerKeys.address;
        const rpcKeys = createKeys(fileService, name, subnet, "rpc");
        const nodeKeys = createKeys(fileService, name, subnet, "node");
        // Create genesis with miner as initial signatory and prefunded addresses
        const genesis = createGenesis(chainId, validatorAddress, prefundedAddresses, values);
        fileService.createFile(name, "genesis.json", JSON.stringify(genesis, null, 2));
        // Create config with bootnode enode
        const config = createConfig(bootnodeKeys.enode);
        fileService.createFile(name, "config.toml", config);
        // Create config for fullnode with bootnode enode
        const configFullNode = createConfigFullNode(bootnodeKeys.enode);
        fileService.createFile(name, "config-fullnode.toml", configFullNode);
        const dockerNetworkInstance = new DockerNetwork(name);
        dockerNetworkInstance._chainId = chainId;
        return dockerNetworkInstance;
        function createConfig(bootnode) {
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
rpc-http-api=["ETH","NET","CLIQUE","ADMIN","MINER","TRACE","DEBUG","TXPOOL","PERM"]
host-allowlist=["*"]

# Mining (will be enabled only for miner nodes)
miner-enabled=false
miner-coinbase="0x0000000000000000000000000000000000000000"
`;
        }
        function createConfigFullNode(bootnode) {
            return `genesis-file="/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true

# Bootnodes
bootnodes=["${bootnode}"]
`;
        }
        function createGenesis(chainId, address, prefunded = [], values = []) {
            const validatorAddress = address.replace("0x", "");
            const alloc = {};
            // Add miner address
            alloc[`0x${validatorAddress}`] = {
                "balance": "0x2000000000000000000000000000000000000000000000000000000000000"
            };
            // Add prefunded addresses
            for (let i = 0; i < prefunded.length; i++) {
                const addr = prefunded[i].replace("0x", "");
                let value = values[i] !== undefined ? values[i] : "0x1000000000000000000000000000000000000000000000000000000000000";
                // Conversion ETH -> wei if string
                if (typeof value === "string" && !value.startsWith("0x")) {
                    // Use ethers for conversion ETH -> wei
                    value = BigInt(ethers_1.ethers.parseEther(value).toString());
                }
                if (typeof value === "bigint")
                    value = "0x" + value.toString(16);
                alloc[`0x${addr}`] = { balance: value };
            }
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
                "extraData": `0x0000000000000000000000000000000000000000000000000000000000000000${validatorAddress}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
                "gasLimit": "0x47b760",
                "difficulty": "0x1",
                "alloc": alloc
            };
        }
    }
    static createDockerNetwork(name, subnet, label) {
        const labelString = label.map(l => `${l.key}=${l.value}`).join(',');
        console.log(`Creating docker network ${name} with subnet ${subnet} and labels ${labelString}`);
        try {
            executeCommand(`docker network create ${name} --subnet ${subnet} --label ${labelString}`);
        }
        catch (error) {
            throw new Error(`Failed to create docker network: ${error}`);
        }
        return new DockerNetwork(name);
    }
    static async removeDockerNetwork(name) {
        const networkPath = path_1.default.join(DockerNetwork.BASE_PATH, name);
        // remove folder
        if (fs_1.default.existsSync(networkPath)) {
            fs_1.default.rmSync(networkPath, { recursive: true, force: true });
        }
        // remove containers from docker network
        try {
            executeCommand(`docker rm -f $(docker ps -aq --filter "network=${name}") 2>/dev/null || true`);
            // Wait for containers to be removed
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        catch (error) {
            console.log(`Error removing containers from network: ${error}`);
        }
        // remove docker network
        try {
            executeCommand(`docker network rm ${name} 2>/dev/null || true`);
            // Wait for network to be removed
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        catch (error) {
            console.log(`Error removing network: ${error}`);
        }
    }
    async addNode(nodeName, nodeType, port, ip) {
        // Remove existing container if it exists
        try {
            executeCommand(`docker rm -f ${this._name}-${nodeName} 2>/dev/null || true`);
        }
        catch (error) {
            console.log(`Container ${this._name}-${nodeName} doesn't exist or couldn't be removed: ${error}`);
        }
        // --- PATCH: logique de nommage cohérente pour les mineurs ---
        let nodeDirName = nodeName;
        if (nodeType === 'miner') {
            // Récupère tous les ports des mineurs existants + celui en cours de création
            const allMinerPorts = this._besuNodes
                .filter(n => n.type === 'miner')
                .map(n => parseInt(n.port));
            allMinerPorts.push(parseInt(port));
            const lowestPort = Math.min(...allMinerPorts);
            // Si c'est le premier mineur (plus petit port), dossier = "miner", sinon "miner{port}"
            nodeDirName = parseInt(port) === lowestPort ? "miner" : `miner${port}`;
        }
        // Crée le dossier du noeud si besoin
        const nodeDir = path_1.default.join(this._fileService.folder, this._name, nodeDirName);
        if (!fs_1.default.existsSync(nodeDir)) {
            fs_1.default.mkdirSync(nodeDir, { recursive: true });
            const subnet = this._networkData?.[0]?.IPAM?.Config?.[0]?.Subnet || "";
            createKeys(this._fileService, this._name, subnet, nodeDirName);
        }
        try {
            let dockerCommand;
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
            }
            else if (nodeType === "miner") {
                // Read miner address for coinbase
                const minerAddress = await this._fileService.readFile(this._name, `${nodeDirName}/address`);
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
                    --data-path=/data/${nodeDirName}/data \
                    --node-private-key-file=/data/${nodeDirName}/key \
                    --genesis-file=/data/genesis.json \
                    --miner-enabled=true \
                    --miner-coinbase=${minerAddress.trim()}`;
            }
            else if (nodeType === "rpc") {
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
            }
            else {
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
            //console.log('\x1b[34m%s\x1b[0m', `Executing command: ${dockerCommand}`);
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
        }
        catch (error) {
            throw new Error(`Error adding ${nodeType} node: ${error}`);
        }
    }
    async addBootnode(name, port, ip) {
        await this.addNode(name, 'bootnode', port, ip);
    }
    async addMiner(name, port, ip) {
        await this.addNode(name, 'miner', port, ip);
        // Wait longer for miner to be ready and synced
        await this._sleep(7500);
        // Add miner as a signatory in Clique consensus
        try {
            // Get existing miner nodes (excluding the new one)
            const existingMiners = this._besuNodes.filter(node => node.type === 'miner' && node.port !== port);
            // If there are no existing miners, the new miner is automatically a signer (from genesis)
            if (existingMiners.length === 0) {
                console.log('First miner - no proposals needed');
                return;
            }
            // Get the address of the new miner
            let newMinerAddress = await this._fileService.readFile(this._name, `${name}/address`);
            newMinerAddress = newMinerAddress.trim();
            if (!newMinerAddress.startsWith("0x")) {
                newMinerAddress = "0x" + newMinerAddress;
            }
            // Check current signers before proposals
            const provider = new ethers_1.ethers.JsonRpcProvider(`http://localhost:${existingMiners[0].port}`);
            const currentSigners = await provider.send("clique_getSigners", []);
            console.log('Current signers before proposals:', currentSigners);
            // Each existing miner needs to propose the new miner
            for (const existingMiner of existingMiners) {
                try {
                    const minerProvider = new ethers_1.ethers.JsonRpcProvider(`http://localhost:${existingMiner.port}`);
                    // Get the existing miner's address
                    // If the node has the lowest port, it's the first miner (folder "miner")
                    const allMinerPorts = existingMiners.map(m => parseInt(m.port));
                    const lowestPort = Math.min(...allMinerPorts);
                    const minerDirName = parseInt(existingMiner.port) === lowestPort ? "miner" : `miner${existingMiner.port}`;
                    let proposerAddress = await this._fileService.readFile(this._name, `${minerDirName}/address`);
                    proposerAddress = proposerAddress.trim();
                    if (!proposerAddress.startsWith("0x")) {
                        proposerAddress = "0x" + proposerAddress;
                    }
                    // Check if the proposer is actually a signer
                    const isSigner = await minerProvider.send("clique_getSigners", [])
                        .then(signers => signers.includes(proposerAddress.toLowerCase()));
                    if (!isSigner) {
                        console.log(`Warning: ${proposerAddress} (${minerDirName}) is not a signer, skipping proposal`);
                        continue;
                    }
                    // Propose the new miner as a signatory
                    const result = await minerProvider.send("clique_propose", [newMinerAddress, true]);
                    console.log(`Miner ${proposerAddress} (${minerDirName}) proposed new miner ${newMinerAddress}:`, result);
                    // Wait between proposals
                    await this._sleep(2000);
                }
                catch (error) {
                    console.error(`Error with miner ${existingMiner.port} proposing new miner:`, error);
                }
            }
            // Wait for proposals to be processed
            await this._sleep(5000);
            // Check if the new miner was added successfully
            const updatedSigners = await provider.send("clique_getSigners", []);
            console.log('Current signers after proposals:', updatedSigners);
            if (updatedSigners.includes(newMinerAddress.toLowerCase())) {
                console.log(`Success: ${newMinerAddress} is now a signer`);
            }
            else {
                console.log(`Warning: ${newMinerAddress} is not yet a signer. May need more votes.`);
            }
        }
        catch (error) {
            console.error("Error adding miner to Clique consensus:", error);
        }
    }
    async addRpc(name, port, ip) {
        await this.addNode(name, 'rpc', port, ip);
    }
    async addFullNode(name, port, ip) {
        await this.addNode(name, 'node', port, ip);
    }
    async removeNode(nodeName) {
        const containerName = `${this._name}-${nodeName}`;
        try {
            executeCommand(`docker rm -f ${containerName} 2>/dev/null || true`);
            console.log(`Node ${nodeName} removed from network ${this._name}`);
            // Remove node from nodes list
            this._besuNodes = this._besuNodes.filter(node => node.name !== containerName);
        }
        catch (error) {
            throw new Error(`Error removing node ${nodeName}: ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    async start() {
        for (const besuNode of this._besuNodes) {
            try {
                executeCommand(`docker start ${besuNode.name}`);
                console.log(`Started ${besuNode.name}`);
            }
            catch (error) {
                console.log(`Error starting container ${besuNode.name}: ${error}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
    }
    async stop() {
        for (const besuNode of this._besuNodes) {
            try {
                executeCommand(`docker stop ${besuNode.name}`);
                console.log(`Stopped ${besuNode.name}`);
            }
            catch (error) {
                console.log(`Error stopping besu node ${besuNode.name}: ${error}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    async getBalance(address) {
        const bootnodePort = this._besuNodes.find(node => node.type === 'bootnode')?.port;
        if (!bootnodePort) {
            throw new Error('Bootnode not found');
        }
        const provider = new ethers_1.ethers.JsonRpcProvider(`http://localhost:${bootnodePort}`);
        const balance = await provider.getBalance(address);
        return balance;
    }
    async test() {
        const bootnodePort = this._besuNodes.find(node => node.type === 'bootnode')?.port;
        if (!bootnodePort) {
            throw new Error('Bootnode not found');
        }
        const provider = new ethers_1.ethers.JsonRpcProvider(`http://localhost:${bootnodePort}`);
        // Get miner private key
        let minerPrivateKey = await this._fileService.readFile(this._name, "miner/key");
        minerPrivateKey = minerPrivateKey.trim();
        if (!minerPrivateKey.startsWith("0x")) {
            minerPrivateKey = "0x" + minerPrivateKey;
        }
        const wallet = new ethers_1.ethers.Wallet(minerPrivateKey, provider);
        console.log(`Miner wallet address: ${wallet.address}`);
        // Generate test addresses from mnemonic
        const mnemonic = "test test test test test test test test test test test junk";
        const addresses = [];
        for (let i = 0; i < 10; i++) {
            const fullPath = `m/44'/60'/0'/0/${i}`;
            const testWallet = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic, "", fullPath);
            addresses.push(testWallet.address);
            console.log(`Address ${i}: ${testWallet.address}`);
        }
        console.log("\nTransferring 100 ETH to test addresses...");
        // Transfer to first 2 addresses
        for (const address of addresses.slice(0, 2)) {
            try {
                const tx = await wallet.sendTransaction({
                    to: address,
                    value: ethers_1.ethers.parseEther("100")
                });
                console.log(`Sent 100 ETH to ${address}`);
                console.log(`Transaction hash: ${tx.hash}`);
                await tx.wait(); // Wait for transaction to be mined
                console.log(`Transaction confirmed for ${address}`);
            }
            catch (error) {
                console.error(`Error sending to ${address}:`, error);
            }
        }
        return true;
    }
    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.DockerNetwork = DockerNetwork;
class CryptoLib {
    ec;
    constructor() {
        this.ec = new elliptic_1.ec('secp256k1');
    }
    // Generate a new random key pair
    generateKeyPair() {
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
    /*// Generate a key pair from a deterministic seed
    generateKeyPairFromSeed(seed: string): KeyPair {
        // Create a deterministic seed using keccak256
        const seedHash = keccak256(Buffer.from(seed, 'utf8'));
        
        // Generate key pair from the seed hash
        const keyPair = this.ec.keyFromPrivate(seedHash);
        const privateKey = keyPair.getPrivate('hex');
        const publicKey = keyPair.getPublic('hex');
        const address = this.publicKeyToAddress(publicKey);
        
        return {
            privateKey,
            publicKey,
            address,
            enode: ""
        };
    }*/
    sign(message, privateKey) {
        const keyPair = this.ec.keyFromPrivate(privateKey);
        const msgHash = (0, keccak256_1.default)(message);
        const signature = keyPair.sign(msgHash);
        return {
            r: signature.r.toString('hex'),
            s: signature.s.toString('hex'),
            v: signature.recoveryParam
        };
    }
    verify(message, signature, publicKey) {
        const keyPair = this.ec.keyFromPublic(publicKey, 'hex');
        const msgHash = (0, keccak256_1.default)(message);
        return keyPair.verify(msgHash, {
            r: signature.r,
            s: signature.s
        });
    }
    publicKeyToAddress(publicKey) {
        // Remove '04' prefix if present
        const pubKey = publicKey.startsWith('04') ? publicKey.slice(2) : publicKey;
        // Convert hex public key string to Buffer
        const pubKeyBuffer = buffer_1.Buffer.from(pubKey, 'hex');
        // Hash the public key using Keccak-256
        const addressBuffer = (0, keccak256_1.default)(pubKeyBuffer);
        // Take last 20 bytes to get Ethereum address
        const address = addressBuffer.slice(-20);
        // Add '0x' prefix and convert to checksum address
        return ethers_1.ethers.getAddress('0x' + buffer_1.Buffer.from(address).toString('hex'));
    }
}
exports.CryptoLib = CryptoLib;
class FileService {
    path;
    constructor(path) {
        this.path = path;
    }
    createFolder(folder) {
        fs_1.default.mkdirSync(path_1.default.join(this.path, folder), { recursive: true });
    }
    async readFile(folder, file) {
        return fs_1.default.readFileSync(path_1.default.join(this.path, folder, file), 'utf8');
    }
    readFileSync(folder, file) {
        return fs_1.default.readFileSync(path_1.default.join(this.path, folder, file), 'utf8');
    }
    async createFile(folder, file, content) {
        fs_1.default.writeFileSync(path_1.default.join(this.path, folder, file), content);
        return file;
    }
    get folder() {
        return this.path;
    }
}
exports.FileService = FileService;
// --- Utility function to create node keys and files ---
function createKeys(fileService, name, subnet, nodeType, signerAddress = '') {
    const cryptoLib = new CryptoLib();
    var keys;
    if (signerAddress !== '') {
        // Search in Keypair directory if signerAddress exists
        const baseDir = path_1.default.join(fileService.folder, "Keypair");
        console.log(`Searching for existing keys in ${baseDir} for address ${signerAddress}`);
        if (fs_1.default.existsSync(baseDir)) {
            const subdirs = fs_1.default.readdirSync(baseDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            let found = false;
            for (const dir of subdirs) {
                const addressPath = path_1.default.join(baseDir, dir, 'address');
                if (fs_1.default.existsSync(addressPath)) {
                    const addr = fs_1.default.readFileSync(addressPath, 'utf8').trim();
                    if (addr.toLowerCase() === signerAddress.toLowerCase()) {
                        // Load keys from the directory
                        const privPath = path_1.default.join(baseDir, dir, 'key');
                        const pubPath = path_1.default.join(baseDir, dir, 'publicKey');
                        if (fs_1.default.existsSync(privPath) && fs_1.default.existsSync(pubPath)) {
                            keys = {
                                privateKey: fs_1.default.readFileSync(privPath, 'utf8').trim(),
                                publicKey: fs_1.default.readFileSync(pubPath, 'utf8').trim(),
                                address: addr,
                                enode: ''
                            };
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
        if (!keys) {
            keys = cryptoLib.generateKeyPair();
        }
    }
    else
        keys = cryptoLib.generateKeyPair();
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

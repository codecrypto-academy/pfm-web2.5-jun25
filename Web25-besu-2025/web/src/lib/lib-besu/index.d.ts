export declare function executeCommand(command: string): string;
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
export declare class DockerNetwork {
    private static readonly BASE_PATH;
    private _networkData;
    private _name;
    private _fileService;
    private _containers;
    private _besuNodes;
    private _chainId;
    constructor(name: string);
    private _populateExistingNodes;
    get fileService(): FileService;
    get networkData(): any;
    get containers(): any[];
    get besuNodes(): BesuNode[];
    get chainId(): number;
    static create(name: string, chainId: number, subnet: string, label: KeyValue[], signerAddress?: string, prefundedAddresses?: string[], values?: (string | bigint)[]): DockerNetwork;
    static createDockerNetwork(name: string, subnet: string, label: KeyValue[]): DockerNetwork;
    static removeDockerNetwork(name: string): Promise<void>;
    private addNode;
    addBootnode(name: string, port: string, ip: string): Promise<void>;
    addMiner(name: string, port: string, ip?: string): Promise<void>;
    addRpc(name: string, port: string, ip?: string): Promise<void>;
    addFullNode(name: string, port: string, ip?: string): Promise<void>;
    removeNode(nodeName: string): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getBalance(address: string): Promise<bigint>;
    test(): Promise<boolean>;
    private _sleep;
}
export declare class CryptoLib {
    private ec;
    constructor();
    generateKeyPair(): KeyPair;
    sign(message: string, privateKey: string): {
        r: string;
        s: string;
        v: number | null;
    };
    verify(message: string, signature: {
        r: string;
        s: string;
        v: number;
    }, publicKey: string): boolean;
    publicKeyToAddress(publicKey: string): string;
}
export declare class FileService {
    private path;
    constructor(path: string);
    createFolder(folder: string): string;
    readFile(folder: string, file: string): Promise<string>;
    readFileSync(folder: string, file: string): string;
    createFile(folder: string, file: string, content: string): Promise<string>;
    get folder(): string;
}
export declare function createKeys(fileService: FileService, name: string, subnet: string, nodeType: string, signerAddress?: string): KeyPair;

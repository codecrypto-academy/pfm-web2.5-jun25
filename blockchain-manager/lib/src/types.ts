export enum BesuNodeType {
    MINER = "MINER",
    RPC = "RPC",
    BOOTNODE = "BOOTNODE"
}


export interface BesuNodeConfig {
    name: string;
    network: {
        name: string;
        ip: string;
    }
    hostPort: number;
    type: BesuNodeType;
    options?: {
        minerEnabled?: boolean;
        minerCoinbase?: string;
        minGasPrice?: number;
        bootnodes?: string;
    }

}

export interface NodeIdentityFiles {
    privateKeyFile: string;
    publicKeyFile: string;
    addressFile: string;
    enodeFile: string;
}


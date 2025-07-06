export interface BesuNodeConfig {
    name: string;
    network: {
        name: string;
        ip: string;
    }
    hostPort: number;
}

export interface NodeIdentityFiles {
    privateKeyFile: string;
    publicKeyFile: string;
    addressFile: string;
    enodeFile: string;
}
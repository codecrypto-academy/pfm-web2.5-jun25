import fs from "fs";
import path from "path";
import { P2P_PORT, RPC_PORT } from "../constants";

interface BesuNodeConfig {
    genesisPath?: string;
    p2pPort?: number;
    rpcPort?: number;
    corsOrigins?: string[];
    rpcApis?: string[];
    hostAllowlist?: string[];
}


export function generateBesuNodeConfigFile(config?: BesuNodeConfig): string {
    const {
        p2pPort = P2P_PORT,
        rpcPort = RPC_PORT,
        corsOrigins = ["*"],
        rpcApis = ["ETH", "NET", "CLIQUE"],
        hostAllowlist = ["*"],
        genesisPath = "/data/genesis.json"
    } = config ?? {};

    return `genesis-file="${genesisPath}"
p2p-host="0.0.0.0"
p2p-port=${p2pPort}
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${rpcPort}
rpc-http-cors-origins=${JSON.stringify(corsOrigins)}
rpc-http-api=${JSON.stringify(rpcApis)}
host-allowlist=${JSON.stringify(hostAllowlist)}`;
}

export function createBesuNodeConfigFile(dataPath: string, config?: BesuNodeConfig) {

    const configToml = generateBesuNodeConfigFile(config);
    try {
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
        fs.writeFileSync(path.join(dataPath, "config.toml"), configToml);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to create configuration file: ${error.message}`);
        }
        throw new Error(`Failed to create configuration file`);
    }
}
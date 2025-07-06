import Docker from "dockerode";
import { ensureNetworkExists } from "./services/createNetwork";
import { BesuNodeConfig, createNode } from "./services/createNode";
import { PROJECT_LABEL } from "./constants";


const docker = new Docker();

(async () => {
    const networkId = await ensureNetworkExists(docker, { name: "besu-network", subnet: "172.25.0.0/16", gateway: "172.25.0.1" });

    const nodeConfig: BesuNodeConfig = {
        name: "besu-network-bootnode",
        network: "besu-network",
        ip: "172.25.0.2",
        image: "hyperledger/besu:latest",
        hostPort: 8888,
        containerPort: 8545,
        dataPath: "/path/to/networks/besu-network",
        configFile: "/data/config.toml",
        privateKeyFile: "/data/bootnode/key.priv",
        genesisFile: "/data/genesis.json",
        labels: {
            "nodo": "bootnode",
            "network": "besu-network",
            "project": PROJECT_LABEL,
        }
    };

    const containerId = await createNode(docker, nodeConfig);
    
})();



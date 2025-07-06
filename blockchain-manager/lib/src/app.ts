import Docker from "dockerode";
import {
    BOOTNODE_IP,
    BOOTNODE_NAME,
    BOOTNODE_PORT,
    MINERNODE_IP,
    MINERNODE_NAME,
    MINERNODE_PORT,
    NETWORK_GATEWAY,
    NETWORK_NAME,
    NETWORK_SUBNET
} from "./constants";
import { createBesuNode } from "./services/createNode";
import { ensureNetworkExists } from "./services/ensureNetworkExists";
import { BesuNodeConfig } from "./types";
import { createNodeIdentityFiles } from "./services/createNodeIdentityFiles";

const docker = new Docker();

(async () => {
    const networkId = await ensureNetworkExists(docker, { name: NETWORK_NAME, subnet: NETWORK_SUBNET, gateway: NETWORK_GATEWAY });

    const bootnodeConfig: BesuNodeConfig = {
        name: BOOTNODE_NAME,
        network: {
            name: NETWORK_NAME,
            ip: BOOTNODE_IP
        },
        hostPort: BOOTNODE_PORT,
    };
    const bootnodeIdentityFiles = createNodeIdentityFiles(bootnodeConfig);

    const minernodeConfig: BesuNodeConfig = {
        name: MINERNODE_NAME,
        network: {
            name: NETWORK_NAME,
            ip: MINERNODE_IP
        },
        hostPort: MINERNODE_PORT,
    };
    const minernodeIdentityFiles = createNodeIdentityFiles(minernodeConfig);

    const containerId = await createBesuNode(docker, bootnodeConfig, bootnodeIdentityFiles);

})();



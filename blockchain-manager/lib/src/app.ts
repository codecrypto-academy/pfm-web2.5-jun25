import Docker from "dockerode";
import fs from "fs";
import {
    PROJECT_LABEL,
    NETWORK_NAME,
    NETWORK_SUBNET,
    NETWORK_GATEWAY,
    BOOTNODE_IP,
    BOOTNODE_NAME,
    BOOTNODE_PORT
} from "./constants";
import { ensureNetworkExists } from "./services/ensureNetworkExists";
import { BesuNodeConfig, createBesuNode } from "./services/createNode";

const docker = new Docker();

(async () => {
    const networkId = await ensureNetworkExists(docker, { name: NETWORK_NAME, subnet: NETWORK_SUBNET, gateway: NETWORK_GATEWAY });

    const nodeConfig: BesuNodeConfig = {
        name: BOOTNODE_NAME,
        network: {
            name: NETWORK_NAME,
            ip: BOOTNODE_IP
        },
        hostPort: Number(BOOTNODE_PORT),
    };



    const containerId = await createBesuNode(docker, nodeConfig);

})();



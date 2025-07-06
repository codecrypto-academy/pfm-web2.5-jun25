import Docker from "dockerode";
import { PROJECT_LABEL } from "../constants";

export async function ensureNetworkExists(docker: Docker, networkConfig: { name: string; subnet: string; gateway: string }) {
    const networkPayload = {
        "Name": networkConfig.name,
        "Driver": "bridge",
        "CheckDuplicate": true,
        "IPAM": {
            "Driver": "default",
            "Config": [
                {
                    "Subnet": networkConfig.subnet,
                    "Gateway": networkConfig.gateway
                }
            ]
        },
        "Labels": {
            "project": PROJECT_LABEL,
        }
    }

    try {
        const networkFinder = await docker.listNetworks({
            filters: {
                name: [networkConfig.name]
            }
        });
        if (networkFinder.length > 0) {
            return networkFinder[0].Id;
        }

        const network = await docker.createNetwork(networkPayload);
        return network.id;
    } catch (error) {
        throw error;
    }
}
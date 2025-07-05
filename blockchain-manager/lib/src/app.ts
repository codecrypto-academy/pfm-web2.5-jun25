import Docker from "dockerode";


const PROJECT_LABEL = 'besu-blockchain';

const docker = new Docker();


async function ensureNetworkExists(docker: Docker, networkConfig: { name: string; subnet: string; gateway: string }) {
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
        const network = await docker.listNetworks({
            filters: {
                name: [networkConfig.name]
            }
        });
        if (network.length > 0) {
            return network[0].Id;
        }

        const response = await docker.createNetwork(networkPayload);
        return response.id;
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        }
        throw error;
    }
}


(async () => {
    await ensureNetworkExists(docker, { name: "besu-network", subnet: "172.25.0.0/16", gateway: "172.25.0.1" });
})();


export {
    PROJECT_LABEL,
    ensureNetworkExists,
}
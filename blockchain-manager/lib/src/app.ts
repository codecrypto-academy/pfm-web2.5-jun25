import Docker from "dockerode";


const docker = new Docker();

const createNetworkPayload = {
    "Name": "besu-network",
    "Driver": "bridge",
    "CheckDuplicate": true,
    "IPAM": {
        "Driver": "default",
        "Config": [
            {
                "Subnet": "172.25.0.0/16",
                "Gateway": "172.25.0.1"
            }
        ]
    },
    "Labels": {
        "project": "besu-blockchain",
        "environment": "development"
    }
}

// Step 1: Create the network if it doesn't exist
docker.listNetworks({
    filters: {
        name: [createNetworkPayload.Name]
    }
}, (err, networks) => {
    if (err) {
        console.error(err);
    } else {
        if (networks?.length) {
            console.log('Network already exists');
            return;
        }
        console.log('Creating network', createNetworkPayload.Name);

        docker.createNetwork(createNetworkPayload, (err, network) => {
            if (err) {
                console.error(err);
            } else {
                console.log('network created', network);
            }
        });
    }
});

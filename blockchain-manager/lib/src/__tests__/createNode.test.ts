import Docker from "dockerode";
import { BesuNodeConfig, createNode } from "../services/createNode";
import { PROJECT_LABEL } from "../constants";


const CONTAINER_ID = "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567";



describe('createNode', () => {

    const nodeConfigStub: BesuNodeConfig = {
        name: "besu-network-mocknode",
        network: "besu-mocknetwork",
        ip: "172.25.0.2",
        image: "hyperledger/besu:latest",
        hostPort: 8888,
        containerPort: 8545,
        dataPath: "/path/to/networks/besu-mocknetwork",
        configFile: "/data/config.toml",
        privateKeyFile: "/data/mocknode/key.priv",
        genesisFile: "/data/genesis.json",
        labels: {
            "nodo": "mocknode",
            "network": "besu-mocknetwork"
        }
    };

    it('should create a node container successfully', async () => {


        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockResolvedValue(undefined)
        } as Partial<Docker.Container> as Docker.Container;

        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        const containerId = await createNode(docker, nodeConfigStub);

        expect(containerId).toBe(CONTAINER_ID);

        expect(docker.createContainer).toHaveBeenCalledWith({
            Image: nodeConfigStub.image,
            name: nodeConfigStub.name,
            Cmd: [
                `--config-file=${nodeConfigStub.configFile}`,
                `--data-path=${nodeConfigStub.dataPath}`,
                `--node-private-key-file=${nodeConfigStub.privateKeyFile}`,
                `--genesis-file=${nodeConfigStub.genesisFile}`
            ],
            Labels: {
                ...nodeConfigStub.labels,
                "project": PROJECT_LABEL
            },
            HostConfig: {
                PortBindings: {
                    [`${nodeConfigStub.containerPort}/tcp`]: [{
                        HostPort: nodeConfigStub.hostPort.toString()
                    }]
                },
                Binds: [`${nodeConfigStub.dataPath}:/data`]
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [nodeConfigStub.network]: {
                        IPAMConfig: {
                            IPv4Address: nodeConfigStub.ip
                        }
                    }
                }
            }
        });
        expect(mockContainer.start).toHaveBeenCalled();


    });

    it('should throw error when createContainer fails', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'createContainer').mockRejectedValue(new Error('Docker API error'));

        await expect(createNode(docker, nodeConfigStub)).rejects.toThrow('Docker API error');
    });

    it('should throw error when container start fails', async () => {
        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockRejectedValue(new Error('Container start failed'))
        } as Partial<Docker.Container> as Docker.Container;

        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        await expect(createNode(docker, nodeConfigStub)).rejects.toThrow('Container start failed');
    });
});


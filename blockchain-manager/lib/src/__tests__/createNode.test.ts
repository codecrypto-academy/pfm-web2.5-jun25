import Docker from "dockerode";
import { PROJECT_LABEL } from "../constants";
import { createBesuNode } from "../services/createBesuNode";
import { BesuNodeConfig } from "../types";

const CONTAINER_ID = "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567";

describe('createNode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const nodeConfigStub: BesuNodeConfig = {
        name: "mocknode",
        network: {
            name: "mocknetwork",
            ip: "127.0.0.1"
        },
        hostPort: 8888,
    };
    const nodeIdentityPath = `${process.cwd()}/${nodeConfigStub.network.name}`;
    const nodeIdentityFilesStub = {
        privateKeyFile: `${nodeIdentityPath}/privateKey`,
        publicKeyFile: `${nodeIdentityPath}/publicKey`,
        addressFile: `${nodeIdentityPath}/address`,
        enodeFile: `${nodeIdentityPath}/enode`,
    }
    

    it('should create a node container successfully', async () => {
        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockResolvedValue(undefined)
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        const containerId = await createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub);

        expect(containerId).toBe(CONTAINER_ID);
        expect(docker.createContainer).toHaveBeenCalledWith({
            Image: "hyperledger/besu:latest",
            name: nodeConfigStub.name,
            Cmd: [
                `--config-file=/data/config.toml`,
                `--data-path=${nodeIdentityPath}`,
                `--node-private-key-file=${nodeIdentityFilesStub.privateKeyFile}`,
                `--genesis-file=/data/genesis.json`
            ],
            Labels: {
                "node": nodeConfigStub.name,
                "network": nodeConfigStub.network.name,
                "project": PROJECT_LABEL,
            },
            HostConfig: {
                PortBindings: {
                    ['8545/tcp']: [{ HostPort: nodeConfigStub.hostPort.toString() }]
                },
                Binds: [`${nodeIdentityPath}:/data`]
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [nodeConfigStub.network.name]: {
                        IPAMConfig: {
                            IPv4Address: nodeConfigStub.network.ip
                        }
                    }
                }
            }
        });
        expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should remove the container if already exists before create a new one', async () => {
        const docker = new Docker();
        const existingContainerInfo = { Id: CONTAINER_ID, State: 'running' } as Docker.ContainerInfo;
        const mockExistingContainer = {
            start: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined)
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'listContainers').mockResolvedValue([existingContainerInfo]);
        jest.spyOn(docker, 'getContainer').mockReturnValue(mockExistingContainer);
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockExistingContainer);

        await createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub);

        expect(docker.getContainer).toHaveBeenCalledWith(CONTAINER_ID);
        expect(mockExistingContainer.remove).toHaveBeenCalledWith({ force: true });
        expect(mockExistingContainer.start).toHaveBeenCalled();
    })

    it('should throw error when createContainer fails', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'createContainer').mockRejectedValue(new Error('Docker API error'));

        await expect(createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub)).rejects.toThrow('Docker API error');
    });

    it('should throw error when container start fails', async () => {
        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockRejectedValue(new Error('Container start failed'))
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        await expect(createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub)).rejects.toThrow('Container start failed');
    });
});


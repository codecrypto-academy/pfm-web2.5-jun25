import Docker from "dockerode";
import { ensureNetworkExists } from "../services/ensureNetworkExists";
import { PROJECT_LABEL } from "../constants";


const NETWORK_ID = "22be93d5babb089c5aab8dbc369042fad48ff791584ca2da2100db837a1c7c30";

describe('ensureNetworkExists', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    const networkConfigStub = { name: "besu-network", subnet: "172.25.0.0/16", gateway: "172.25.0.1" };

    it('should create a network when it does not exist', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'listNetworks').mockResolvedValue([]);
        jest.spyOn(docker, 'createNetwork').mockResolvedValue({
            id: NETWORK_ID,
        } as Partial<Docker.Network> as Docker.Network);

        const networkId = await ensureNetworkExists(docker, networkConfigStub);

        expect(networkId).toBe(NETWORK_ID);
        expect(docker.listNetworks).toHaveBeenCalledWith({
            filters: { name: [networkConfigStub.name] }
        });
        expect(docker.createNetwork).toHaveBeenCalledWith({
            "Name": networkConfigStub.name,
            "Driver": "bridge",
            "CheckDuplicate": true,
            "IPAM": {
                "Driver": "default",
                "Config": [
                    {
                        "Subnet": networkConfigStub.subnet,
                        "Gateway": networkConfigStub.gateway
                    }
                ]
            },
            "Labels": {
                "project": PROJECT_LABEL,
            }
        });
    });

    it('should return the network id when the network already exists', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'listNetworks').mockResolvedValue([
            {
                Name: networkConfigStub.name,
                Id: NETWORK_ID
            } as Partial<Docker.NetworkInspectInfo> as Docker.NetworkInspectInfo
        ]);
        jest.spyOn(docker, 'createNetwork').mockResolvedValue({
            id: NETWORK_ID,
        } as Partial<Docker.Network> as Docker.Network);

        const networkId = await ensureNetworkExists(docker, networkConfigStub);

        expect(networkId).toBe(NETWORK_ID);
        expect(docker.listNetworks).toHaveBeenCalledWith({
            filters: { name: [networkConfigStub.name] }
        });
        expect(docker.createNetwork).not.toHaveBeenCalled();
    });

    it('should throw error when listNetworks fails', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'listNetworks').mockRejectedValue(new Error('Docker API error'));

        await expect(ensureNetworkExists(docker, networkConfigStub)).rejects.toThrow('Docker API error');
    });

    it('should throw error when createNetwork fails', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'listNetworks').mockResolvedValue([]);
        jest.spyOn(docker, 'createNetwork').mockRejectedValue(new Error('Docker API error'));

        await expect(ensureNetworkExists(docker, networkConfigStub)).rejects.toThrow('Docker API error');
    });
});
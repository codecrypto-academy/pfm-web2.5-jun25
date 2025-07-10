import { DockerManager } from '../src/DockerManager';
import Docker from 'dockerode';

jest.mock('dockerode');

const mockDocker = {
  createNetwork: jest.fn(),
  createContainer: jest.fn(),
  getContainer: jest.fn(),
  listNetworks: jest.fn(),
  getNetwork: jest.fn(),
  listContainers: jest.fn(),
  ping: jest.fn(),
};

const mockContainer = {
  id: 'mock-container-id',
  start: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
};

const mockNetwork = {
  remove: jest.fn(),
};

describe('DockerManager', () => {
  let manager: DockerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (Docker as unknown as jest.Mock).mockImplementation(() => mockDocker);
    manager = new DockerManager();
  });

  it('createDockerNetwork: should create a docker network and return its id', async () => {
    mockDocker.createNetwork.mockResolvedValue({ id: 'mock-network-id' });
    const config = { networkId: 'test', subnet: '172.28.0.0/16', gateway: '172.28.0.1' };
    const id = await manager.createDockerNetwork(config as any);
    expect(id).toBe('mock-network-id');
    expect(mockDocker.createNetwork).toHaveBeenCalled();
  });

  it('createDockerNetwork: should throw if docker network creation fails', async () => {
    mockDocker.createNetwork.mockRejectedValueOnce(new Error('fail'));
    const config = { networkId: 'fail', subnet: '172.28.0.0/16', gateway: '172.28.0.1' };
    await expect(manager.createDockerNetwork(config as any)).rejects.toThrow('fail');
  });

  it('createBesuContainer: should create and start a container', async () => {
    mockDocker.createContainer.mockResolvedValue({ ...mockContainer });
    mockContainer.start.mockResolvedValue(undefined);
    const networkConfig = { networkId: 'test', chainId: 123 };
    const nodeConfig = { id: 'node1', rpcPort: 8545, p2pPort: 30303, address: '0xabc', type: 'miner' };
    const info = await manager.createBesuContainer(networkConfig as any, nodeConfig as any, '/tmp/node');
    expect(info).toHaveProperty('containerId');
    expect(mockDocker.createContainer).toHaveBeenCalled();
    expect(mockContainer.start).toHaveBeenCalled();
  });

  it('removeContainer: should stop and remove a container', async () => {
    mockDocker.getContainer.mockReturnValue(mockContainer);
    mockContainer.stop.mockResolvedValue(undefined);
    mockContainer.remove.mockResolvedValue(undefined);
    await manager.removeContainer('mock-container-id');
    expect(mockDocker.getContainer).toHaveBeenCalledWith('mock-container-id');
    expect(mockContainer.stop).toHaveBeenCalled();
    expect(mockContainer.remove).toHaveBeenCalled();
  });

  it('removeDockerNetwork: should remove all matching networks', async () => {
    mockDocker.listNetworks.mockResolvedValue([{ Id: 'net1' }, { Id: 'net2' }]);
    mockDocker.getNetwork.mockReturnValue(mockNetwork);
    mockNetwork.remove.mockResolvedValue(undefined);
    await manager.removeDockerNetwork('test');
    expect(mockDocker.listNetworks).toHaveBeenCalled();
    expect(mockDocker.getNetwork).toHaveBeenCalledWith('net1');
    expect(mockDocker.getNetwork).toHaveBeenCalledWith('net2');
    expect(mockNetwork.remove).toHaveBeenCalledTimes(2);
  });

  it('removeNodeFromNetwork: should remove all containers for a node', async () => {
    mockDocker.listContainers.mockResolvedValue([{ Id: 'c1', Names: ['/n1'] }, { Id: 'c2', Names: ['/n2'] }]);
    mockDocker.getContainer.mockReturnValue(mockContainer);
    mockContainer.stop.mockResolvedValue(undefined);
    mockContainer.remove.mockResolvedValue(undefined);
    await manager.removeNodeFromNetwork('net', 'node');
    expect(mockDocker.listContainers).toHaveBeenCalled();
    expect(mockDocker.getContainer).toHaveBeenCalledWith('c1');
    expect(mockDocker.getContainer).toHaveBeenCalledWith('c2');
    expect(mockContainer.stop).toHaveBeenCalledTimes(2);
    expect(mockContainer.remove).toHaveBeenCalledTimes(2);
  });

  it('findNetworkContainers: should return containers for a network', async () => {
    mockDocker.listContainers.mockResolvedValue([{ Id: 'c1' }]);
    const containers = await manager.findNetworkContainers('net');
    expect(containers).toEqual([{ Id: 'c1' }]);
    expect(mockDocker.listContainers).toHaveBeenCalled();
  });

  it('findNodeContainer: should return the first container for a node', async () => {
    mockDocker.listContainers.mockResolvedValue([{ Id: 'c1' }, { Id: 'c2' }]);
    const container = await manager.findNodeContainer('net', 'node');
    expect(container).toEqual({ Id: 'c1' });
  });

  it('isDockerAvailable: should return true if ping succeeds', async () => {
    mockDocker.ping.mockResolvedValue(undefined);
    await expect(manager.isDockerAvailable()).resolves.toBe(true);
  });

  it('isDockerAvailable: should return false if ping fails', async () => {
    mockDocker.ping.mockRejectedValue(new Error('fail'));
    await expect(manager.isDockerAvailable()).resolves.toBe(false);
  });

  it('addNodeToNetwork: should throw if network does not exist', async () => {
    mockDocker.listNetworks.mockResolvedValue([]);
    await expect(manager.addNodeToNetwork({ networkId: 'n' } as any, { id: 'id' } as any, '/tmp')).rejects.toThrow();
  });

  it('addNodeToNetwork: should throw if node already exists', async () => {
    mockDocker.listNetworks.mockResolvedValue([{}]);
    jest.spyOn(manager, 'findNodeContainer').mockResolvedValue({} as any);
    await expect(manager.addNodeToNetwork({ networkId: 'n' } as any, { id: 'id' } as any, '/tmp')).rejects.toThrow();
  });

  it('addNodeToNetwork: should create a new container if network and node are valid', async () => {
    mockDocker.listNetworks.mockResolvedValue([{}]);
    jest.spyOn(manager, 'findNodeContainer').mockResolvedValue(null);
    jest.spyOn(manager, 'createBesuContainer').mockResolvedValue({ id: 'id', containerId: 'cid', containerName: 'cname', status: 'running' });
    const result = await manager.addNodeToNetwork({ networkId: 'n' } as any, { id: 'id' } as any, '/tmp');
    expect(result).toHaveProperty('containerId');
  });

  it('networkExists: should return true if network exists', async () => {
    mockDocker.listNetworks.mockResolvedValue([{}]);
    await expect(manager.networkExists('n')).resolves.toBe(true);
  });

  it('networkExists: should return false if network does not exist', async () => {
    mockDocker.listNetworks.mockResolvedValue([]);
    await expect(manager.networkExists('n')).resolves.toBe(false);
  });
});

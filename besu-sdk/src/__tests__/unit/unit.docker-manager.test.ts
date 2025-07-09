import { DockerManager } from '../../services/DockerManager';
import {
  DockerOperationError,
  BesuImageNotFoundError,
  NetworkAlreadyExistsError,
  NetworkNotFoundError,
  ContainerStateTimeoutError,
  UnexpectedContainerStateError
} from '../../errors';
import { ContainerOptions } from '../../types';

// Mock the dockerode module
jest.mock('dockerode');
// @ts-ignore
import Docker from 'dockerode';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    child: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    }))
  }
}));

describe('DockerManager Unit Tests', () => {
  let dockerManager: DockerManager;
  let mockDockerClient: jest.Mocked<Docker>;
  let mockNetwork: jest.Mocked<Docker.Network>;
  let mockContainer: jest.Mocked<Docker.Container>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNetwork = {
      inspect: jest.fn(),
      remove: jest.fn()
    } as any;

    mockContainer = {
      inspect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn(),
      logs: jest.fn(),
      exec: jest.fn()
    } as any;

    mockDockerClient = {
      createNetwork: jest.fn(),
      getNetwork: jest.fn(() => mockNetwork),
      listNetworks: jest.fn(),
      listImages: jest.fn(),
      pull: jest.fn(),
      createContainer: jest.fn(() => mockContainer),
      listContainers: jest.fn()
    } as any;

    // Mock the Docker constructor
    (Docker as jest.MockedClass<typeof Docker>).mockImplementation(() => mockDockerClient);

    dockerManager = new DockerManager();
  });

  describe('getClient', () => {
    it('should return the Docker client instance', () => {
      const client = dockerManager.getClient();
      expect(client).toBe(mockDockerClient);
    });
  });

  describe('createNetwork', () => {
    const networkName = 'test-network';
    const subnet = '172.20.0.0/16';

    it('should create network with correct IPAM and labels (happy path)', async () => {
      // Mock network doesn't exist
      mockDockerClient.listNetworks.mockResolvedValue([]);
      mockDockerClient.createNetwork.mockResolvedValue(mockNetwork);

      const result = await dockerManager.createNetwork(networkName, subnet);

      expect(mockDockerClient.createNetwork).toHaveBeenCalledWith({
        Name: networkName,
        Driver: 'bridge',
        CheckDuplicate: true,
        IPAM: {
          Driver: 'default',
          Config: [{
            Subnet: subnet,
            Gateway: '172.20.0.1'
          }]
        },
        Labels: {
          'besu-sdk': 'true',
          'created-by': 'besu-sdk',
          'network-type': 'blockchain',
          'created-at': expect.any(String)
        }
      });
      expect(result).toBe(mockNetwork);
    });

    it('should throw NetworkAlreadyExistsError when network exists', async () => {
      // Mock network exists
      mockDockerClient.listNetworks.mockResolvedValue([
        { 
          Name: networkName, 
          Labels: { 'besu-sdk': 'true' },
          Id: 'mock-id',
          Created: new Date().toISOString(),
          Scope: 'local',
          Driver: 'bridge',
          EnableIPv6: false,
          IPAM: { Driver: 'default', Config: [] },
          Internal: false,
          Attachable: false,
          Ingress: false,
          ConfigFrom: { Network: '' },
          ConfigOnly: false,
          Containers: {},
          Options: {},
          Peers: []
        } as Docker.NetworkInspectInfo
      ]);

      await expect(dockerManager.createNetwork(networkName, subnet))
        .rejects.toThrow(NetworkAlreadyExistsError);

      expect(mockDockerClient.createNetwork).not.toHaveBeenCalled();
    });

    it('should throw DockerOperationError for other Docker API errors', async () => {
      mockDockerClient.listNetworks.mockResolvedValue([]);
      const dockerError = new Error('Docker daemon error');
      mockDockerClient.createNetwork.mockRejectedValue(dockerError);

      await expect(dockerManager.createNetwork(networkName, subnet))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('adoptNetwork', () => {
    const networkName = 'existing-network';

    it('should return DockerNetworkConfig with subnet/gateway (happy path)', async () => {
      const mockInspectResult = {
        Name: networkName,
        Id: 'network-id',
        IPAM: {
          Config: [{
            Subnet: '172.20.0.0/16',
            Gateway: '172.20.0.1'
          }]
        }
      };

      mockNetwork.inspect.mockResolvedValue(mockInspectResult as any);

      const result = await dockerManager.adoptNetwork(networkName);

      expect(mockDockerClient.getNetwork).toHaveBeenCalledWith(networkName);
      expect(mockNetwork.inspect).toHaveBeenCalled();
      expect(result).toEqual({
        network: mockNetwork,
        subnet: '172.20.0.0/16',
        gateway: '172.20.0.1'
      });
    });

    it('should handle networks without IPAM gateway by calculating default', async () => {
      const mockInspectResult = {
        Name: networkName,
        Id: 'network-id',
        IPAM: {
          Config: [{
            Subnet: '172.20.0.0/16'
            // No Gateway specified
          }]
        }
      };

      mockNetwork.inspect.mockResolvedValue(mockInspectResult as any);

      const result = await dockerManager.adoptNetwork(networkName);

      expect(result).toEqual({
        network: mockNetwork,
        subnet: '172.20.0.0/16',
        gateway: '172.20.0.1' // Should calculate default gateway
      });
    });

    it('should throw NetworkNotFoundError for 404 errors', async () => {
      const notFoundError = new Error('Not found') as any;
      notFoundError.statusCode = 404;
      mockNetwork.inspect.mockRejectedValue(notFoundError);

      await expect(dockerManager.adoptNetwork(networkName))
        .rejects.toThrow(NetworkNotFoundError);
    });

    it('should throw DockerOperationError for networks without IPAM', async () => {
      const mockInspectResult = {
        Name: networkName,
        Id: 'network-id'
        // No IPAM configuration
      };

      mockNetwork.inspect.mockResolvedValue(mockInspectResult as any);

      await expect(dockerManager.adoptNetwork(networkName))
        .rejects.toThrow(DockerOperationError);
    });

    it('should throw DockerOperationError for other Docker API errors', async () => {
      const dockerError = new Error('Docker daemon error');
      mockNetwork.inspect.mockRejectedValue(dockerError);

      await expect(dockerManager.adoptNetwork(networkName))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('removeNetwork', () => {
    const networkName = 'test-network';

    it('should call removeContainers and network.remove()', async () => {
      const mockInspectResult = { Name: networkName };
      mockNetwork.inspect.mockResolvedValue(mockInspectResult as any);
      mockNetwork.remove.mockResolvedValue(undefined);
      
      // Mock removeContainers behavior (listContainers + removeContainer for each)
      mockDockerClient.listContainers.mockResolvedValue([]);

      await dockerManager.removeNetwork(mockNetwork);

      expect(mockNetwork.inspect).toHaveBeenCalled();
      expect(mockDockerClient.listContainers).toHaveBeenCalled();
      expect(mockNetwork.remove).toHaveBeenCalled();
    });

    it('should ignore 404 errors (network not found)', async () => {
      const notFoundError = new Error('Not found') as any;
      notFoundError.statusCode = 404;
      mockNetwork.inspect.mockRejectedValue(notFoundError);

      // Should not throw
      await expect(dockerManager.removeNetwork(mockNetwork)).resolves.toBeUndefined();

      expect(mockNetwork.remove).not.toHaveBeenCalled();
    });

    it('should accept network name as string', async () => {
      const mockInspectResult = { Name: networkName };
      mockNetwork.inspect.mockResolvedValue(mockInspectResult as any);
      mockNetwork.remove.mockResolvedValue(undefined);
      mockDockerClient.listContainers.mockResolvedValue([]);

      await dockerManager.removeNetwork(networkName);

      expect(mockDockerClient.getNetwork).toHaveBeenCalledWith(networkName);
      expect(mockNetwork.remove).toHaveBeenCalled();
    });
  });

  describe('networkExists', () => {
    const networkName = 'test-network';

    it('should return true when network exists', async () => {
      mockDockerClient.listNetworks.mockResolvedValue([
        { 
          Name: networkName, 
          Labels: { 'besu-sdk': 'true' },
          Id: 'mock-id',
          Created: new Date().toISOString(),
          Scope: 'local',
          Driver: 'bridge',
          EnableIPv6: false,
          IPAM: { Driver: 'default', Config: [] },
          Internal: false,
          Attachable: false,
          Ingress: false,
          ConfigFrom: { Network: '' },
          ConfigOnly: false,
          Containers: {},
          Options: {},
          Peers: []
        } as Docker.NetworkInspectInfo
      ]);

      const result = await dockerManager.networkExists(networkName);

      expect(result).toBe(true);
      expect(mockDockerClient.listNetworks).toHaveBeenCalledWith({
        filters: { label: ['besu-sdk=true'] }
      });
    });

    it('should return false when network does not exist', async () => {
      mockDockerClient.listNetworks.mockResolvedValue([]);

      const result = await dockerManager.networkExists(networkName);

      expect(result).toBe(false);
    });
  });

  describe('pullImageIfNeeded', () => {
    const imageName = 'hyperledger/besu:latest';

    it('should check if image exists first and not pull if it exists', async () => {
      mockDockerClient.listImages.mockResolvedValue([
        { 
          RepoTags: [imageName],
          Id: 'mock-id',
          ParentId: '',
          Created: Date.now(),
          Size: 1000,
          VirtualSize: 1000,
          SharedSize: 0,
          RepoDigests: [],
          Containers: 0,
          Labels: {}
        } as Docker.ImageInfo
      ]);

      await dockerManager.pullImageIfNeeded(imageName);

      expect(mockDockerClient.listImages).toHaveBeenCalled();
      expect(mockDockerClient.pull).not.toHaveBeenCalled();
    });

    it('should call docker.pull() if image does not exist', async () => {
      mockDockerClient.listImages.mockResolvedValue([]);
      
      const mockStream: any = {
        pipe: jest.fn(),
        on: jest.fn((event: string, callback: Function) => {
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return mockStream;
        })
      };
      mockDockerClient.pull.mockResolvedValue(mockStream);

      await dockerManager.pullImageIfNeeded(imageName);

      expect(mockDockerClient.listImages).toHaveBeenCalled();
      expect(mockDockerClient.pull).toHaveBeenCalledWith(imageName);
    });

    it('should throw BesuImageNotFoundError on pull failure', async () => {
      mockDockerClient.listImages.mockResolvedValue([]);
      const pullError = new Error('Pull failed');
      mockDockerClient.pull.mockRejectedValue(pullError);

      await expect(dockerManager.pullImageIfNeeded(imageName))
        .rejects.toThrow(BesuImageNotFoundError);
    });
  });

  describe('createContainer', () => {
    const containerOptions: ContainerOptions = {
      name: 'test-container',
      image: 'hyperledger/besu:latest',
      env: ['ENV_VAR=value'],
      volumes: ['/host:/container'],
      networkMode: 'bridge',
      networks: {
        'test-network': {
          ipv4Address: '172.20.0.10'
        }
      },
      ports: {
        '8545/tcp': {
          hostPort: 8545
        }
      }
    };

    it('should translate ContainerOptions fully', async () => {
      mockDockerClient.createContainer.mockResolvedValue(mockContainer);

      const result = await dockerManager.createContainer(containerOptions);

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith({
        name: containerOptions.name,
        Image: containerOptions.image,
        Env: containerOptions.env,
        HostConfig: {
          Binds: containerOptions.volumes,
          NetworkMode: containerOptions.networkMode,
          PortBindings: {
            '8545/tcp': [{ HostPort: '8545' }]
          }
        },
        NetworkingConfig: {
          EndpointsConfig: containerOptions.networks
        },
        Labels: {
          'besu-sdk': 'true',
          'created-by': 'besu-sdk',
          'created-at': expect.any(String)
        }
      });
      expect(result).toBe(mockContainer);
    });

    it('should throw DockerOperationError on container creation failure', async () => {
      const dockerError = new Error('Container creation failed');
      mockDockerClient.createContainer.mockRejectedValue(dockerError);

      await expect(dockerManager.createContainer(containerOptions))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('startContainer', () => {
    it('should start container successfully (happy path)', async () => {
      mockContainer.start.mockResolvedValue(undefined);

      await dockerManager.startContainer(mockContainer);

      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should throw DockerOperationError on start failure', async () => {
      const startError = new Error('Start failed');
      mockContainer.start.mockRejectedValue(startError);

      await expect(dockerManager.startContainer(mockContainer))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('stopContainer', () => {
    it('should stop container successfully (happy path)', async () => {
      mockContainer.stop.mockResolvedValue(undefined);

      await dockerManager.stopContainer(mockContainer);

      expect(mockContainer.stop).toHaveBeenCalledWith({ t: 10 });
    });

    it('should ignore 304 errors (container already stopped)', async () => {
      const alreadyStoppedError = new Error('Container already stopped') as any;
      alreadyStoppedError.statusCode = 304;
      mockContainer.stop.mockRejectedValue(alreadyStoppedError);

      await expect(dockerManager.stopContainer(mockContainer)).resolves.toBeUndefined();
    });

    it('should throw DockerOperationError for other stop failures', async () => {
      const stopError = new Error('Stop failed');
      mockContainer.stop.mockRejectedValue(stopError);

      await expect(dockerManager.stopContainer(mockContainer))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('removeContainer', () => {
    it('should remove container successfully (happy path)', async () => {
      mockContainer.remove.mockResolvedValue(undefined);

      await dockerManager.removeContainer(mockContainer);

      expect(mockContainer.remove).toHaveBeenCalledWith({ force: false });
    });

    it('should ignore 404 errors (container not found)', async () => {
      const notFoundError = new Error('Container not found') as any;
      notFoundError.statusCode = 404;
      mockContainer.remove.mockRejectedValue(notFoundError);

      await expect(dockerManager.removeContainer(mockContainer)).resolves.toBeUndefined();
    });

    it('should support force removal', async () => {
      mockContainer.remove.mockResolvedValue(undefined);

      await dockerManager.removeContainer(mockContainer, true);

      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('should throw DockerOperationError for other removal failures', async () => {
      const removeError = new Error('Remove failed');
      mockContainer.remove.mockRejectedValue(removeError);

      await expect(dockerManager.removeContainer(mockContainer))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('getContainerState', () => {
    it('should return container state correctly', async () => {
      const mockInspectResult = {
        State: {
          Running: true,
          Paused: false,
          Restarting: false,
          Dead: false,
          Status: 'running'
        }
      };
      mockContainer.inspect.mockResolvedValue(mockInspectResult as any);

      const result = await dockerManager.getContainerState(mockContainer);

      expect(result).toEqual({
        running: true,
        paused: false,
        restarting: false,
        dead: false,
        status: 'running'
      });
    });

    it('should throw DockerOperationError on inspect failure', async () => {
      const inspectError = new Error('Inspect failed');
      mockContainer.inspect.mockRejectedValue(inspectError);

      await expect(dockerManager.getContainerState(mockContainer))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('waitForContainerState', () => {
    it('should timeout and throw ContainerStateTimeoutError', async () => {
      const mockInspectResult = {
        State: {
          Running: false,
          Paused: false,
          Restarting: false,
          Dead: false,
          Status: 'created'
        }
      };
      mockContainer.inspect.mockResolvedValue(mockInspectResult as any);

      // Access the private method through any casting
      const dockerManagerAny = dockerManager as any;
      
      await expect(
        dockerManagerAny.waitForContainerState(mockContainer, 'running', 100)
      ).rejects.toThrow(ContainerStateTimeoutError);
    }, 10000);

    it('should throw UnexpectedContainerStateError for dead state', async () => {
      const mockInspectResult = {
        State: {
          Running: false,
          Paused: false,
          Restarting: false,
          Dead: true,
          Status: 'dead'
        }
      };
      mockContainer.inspect.mockResolvedValue(mockInspectResult as any);

      const dockerManagerAny = dockerManager as any;
      
      await expect(
        dockerManagerAny.waitForContainerState(mockContainer, 'running', 1000)
      ).rejects.toThrow(UnexpectedContainerStateError);
    });
  });

  describe('getContainerLogs', () => {
    it('should correctly call dockerode methods and return logs', async () => {
      const mockLogStream = Buffer.from('test log output') as any;
      mockContainer.logs.mockResolvedValue(mockLogStream);

      const result = await dockerManager.getContainerLogs(mockContainer, { tail: 100 });

      expect(mockContainer.logs).toHaveBeenCalledWith({
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: 100
      });
      expect(result).toBe('test log output');
    });

    it('should handle success and failure correctly', async () => {
      const logsError = new Error('Logs failed');
      mockContainer.logs.mockRejectedValue(logsError);

      await expect(dockerManager.getContainerLogs(mockContainer))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('executeSystemCommand', () => {
    it('should correctly call dockerode methods for command execution', async () => {
      const mockExec = {
        start: jest.fn(),
        inspect: jest.fn().mockResolvedValue({ ExitCode: 0 }),
        modem: {},
        id: 'mock-exec-id',
        resize: jest.fn()
      } as any;
      mockContainer.exec.mockResolvedValue(mockExec);

      const mockStream: any = {
        on: jest.fn((event: string, callback: Function) => {
          if (event === 'data') {
            callback(Buffer.from('command output'));
          } else if (event === 'end') {
            setTimeout(callback, 0);
          }
          return mockStream;
        }),
        setEncoding: jest.fn()
      };
      mockExec.start.mockResolvedValue(mockStream);

      const result = await dockerManager.executeSystemCommand(mockContainer, ['echo', 'test']);

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['echo', 'test'],
        AttachStdout: true,
        AttachStderr: true
      });
      expect(mockExec.start).toHaveBeenCalledWith({ Detach: false, Tty: false });
      expect(result).toBe('command output');
    });

    it('should handle command execution failure', async () => {
      const execError = new Error('Exec failed');
      mockContainer.exec.mockRejectedValue(execError);

      await expect(dockerManager.executeSystemCommand(mockContainer, ['echo', 'test']))
        .rejects.toThrow(DockerOperationError);
    });
  });

  describe('listContainers', () => {
    it('should correctly filter by besu-sdk=true label and networkName', async () => {
      const mockContainers = [
        { 
          Names: ['/test-container'],
          Labels: { 'besu-sdk': 'true' },
          NetworkSettings: { Networks: { 'test-network': {} } },
          Id: 'container-id',
          Image: 'test-image',
          ImageID: 'image-id',
          Command: 'test-command',
          Created: Date.now(),
          Ports: [],
          SizeRw: 0,
          SizeRootFs: 0,
          State: 'running',
          Status: 'Up 1 minute',
          HostConfig: { NetworkMode: 'default' },
          Mounts: []
        } as any
      ];
      mockDockerClient.listContainers.mockResolvedValue(mockContainers);

      const result = await dockerManager.listContainers('test-network');

      expect(mockDockerClient.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: { label: ['besu-sdk=true'] }
      });
      expect(result).toEqual(mockContainers);
    });

    it('should list all besu-sdk containers when no networkName provided', async () => {
      const mockContainers = [
        { 
          Names: ['/test-container'],
          Labels: { 'besu-sdk': 'true' },
          Id: 'container-id',
          Image: 'test-image',
          ImageID: 'image-id',
          Command: 'test-command',
          Created: Date.now(),
          Ports: [],
          SizeRw: 0,
          SizeRootFs: 0,
          State: 'running',
          Status: 'Up 1 minute',
          HostConfig: { NetworkMode: 'default' },
          Mounts: [],
          NetworkSettings: { Networks: {} }
        } as Docker.ContainerInfo
      ];
      mockDockerClient.listContainers.mockResolvedValue(mockContainers);

      const result = await dockerManager.listContainers();

      expect(mockDockerClient.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: { label: ['besu-sdk=true'] }
      });
      expect(result).toEqual(mockContainers);
    });
  });

  describe('listNetworks', () => {
    it('should correctly filter by besu-sdk=true label', async () => {
      const mockNetworks = [
        { 
          Name: 'test-network', 
          Labels: { 'besu-sdk': 'true' },
          Id: 'mock-id',
          Created: new Date().toISOString(),
          Scope: 'local',
          Driver: 'bridge',
          EnableIPv6: false,
          IPAM: { Driver: 'default', Config: [] },
          Internal: false,
          Attachable: false,
          Ingress: false,
          ConfigFrom: { Network: '' },
          ConfigOnly: false,
          Containers: {},
          Options: {},
          Peers: []
        } as Docker.NetworkInspectInfo
      ];
      mockDockerClient.listNetworks.mockResolvedValue(mockNetworks);

      const result = await dockerManager.listNetworks();

      expect(mockDockerClient.listNetworks).toHaveBeenCalledWith({
        filters: { label: ['besu-sdk=true'] }
      });
      expect(result).toEqual(mockNetworks);
    });
  });

  describe('removeContainers', () => {
    it('should call listContainers and removeContainer for each item', async () => {
      const mockContainers = [
        { 
          Id: 'container1', 
          Names: ['/container1'],
          Image: 'test-image',
          ImageID: 'image-id',
          Command: 'test-command',
          Created: Date.now(),
          Ports: [],
          Labels: {},
          SizeRw: 0,
          SizeRootFs: 0,
          State: 'running',
          Status: 'Up 1 minute',
          HostConfig: { NetworkMode: 'default' },
          Mounts: [],
          NetworkSettings: { Networks: {} }
        } as Docker.ContainerInfo,
        { 
          Id: 'container2', 
          Names: ['/container2'],
          Image: 'test-image',
          ImageID: 'image-id',
          Command: 'test-command',
          Created: Date.now(),
          Ports: [],
          Labels: {},
          SizeRw: 0,
          SizeRootFs: 0,
          State: 'running',
          Status: 'Up 1 minute',
          HostConfig: { NetworkMode: 'default' },
          Mounts: [],
          NetworkSettings: { Networks: {} }
        } as Docker.ContainerInfo
      ];
      mockDockerClient.listContainers.mockResolvedValue(mockContainers);
      
      const mockContainerInstance = {
        stop: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined)
      };
      mockDockerClient.getContainer = jest.fn().mockReturnValue(mockContainerInstance);

      await dockerManager.removeContainers('test-network');

      expect(mockDockerClient.listContainers).toHaveBeenCalled();
      expect(mockDockerClient.getContainer).toHaveBeenCalledTimes(2);
      expect(mockContainerInstance.stop).toHaveBeenCalledTimes(2);
      expect(mockContainerInstance.remove).toHaveBeenCalledTimes(2);
    });

    it('should handle individual container removal errors gracefully', async () => {
      const mockContainers = [
        { 
          Id: 'container1', 
          Names: ['/container1'],
          Image: 'test-image',
          ImageID: 'image-id',
          Command: 'test-command',
          Created: Date.now(),
          Ports: [],
          Labels: {},
          SizeRw: 0,
          SizeRootFs: 0,
          State: 'running',
          Status: 'Up 1 minute',
          HostConfig: { NetworkMode: 'default' },
          Mounts: [],
          NetworkSettings: { Networks: {} }
        } as Docker.ContainerInfo
      ];
      mockDockerClient.listContainers.mockResolvedValue(mockContainers);
      
      const mockContainerInstance = {
        stop: jest.fn().mockRejectedValue(new Error('Stop failed')),
        remove: jest.fn().mockResolvedValue(undefined)
      };
      mockDockerClient.getContainer = jest.fn().mockReturnValue(mockContainerInstance);

      // Should not throw, just log errors
      await expect(dockerManager.removeContainers('test-network')).resolves.toBeUndefined();
    });
  });

  describe('removeAllNetworks', () => {
    it('should call listNetworks and removeNetwork for each item', async () => {
      const mockNetworks = [
        { 
          Name: 'network1', 
          Id: 'net1',
          Created: new Date().toISOString(),
          Scope: 'local',
          Driver: 'bridge',
          EnableIPv6: false,
          IPAM: { Driver: 'default', Config: [] },
          Internal: false,
          Attachable: false,
          Ingress: false,
          ConfigFrom: { Network: '' },
          ConfigOnly: false,
          Containers: {},
          Options: {},
          Labels: {},
          Peers: []
        } as Docker.NetworkInspectInfo,
        { 
          Name: 'network2', 
          Id: 'net2',
          Created: new Date().toISOString(),
          Scope: 'local',
          Driver: 'bridge',
          EnableIPv6: false,
          IPAM: { Driver: 'default', Config: [] },
          Internal: false,
          Attachable: false,
          Ingress: false,
          ConfigFrom: { Network: '' },
          ConfigOnly: false,
          Containers: {},
          Options: {},
          Labels: {},
          Peers: []
        } as Docker.NetworkInspectInfo
      ];
      mockDockerClient.listNetworks.mockResolvedValue(mockNetworks);
      
      const mockNetworkInstance = {
        inspect: jest.fn().mockResolvedValue({ Name: 'network1' }),
        remove: jest.fn().mockResolvedValue(undefined)
      };
      mockDockerClient.getNetwork = jest.fn().mockReturnValue(mockNetworkInstance);
      mockDockerClient.listContainers.mockResolvedValue([]);

      await dockerManager.removeAllNetworks();

      expect(mockDockerClient.listNetworks).toHaveBeenCalled();
      expect(mockDockerClient.getNetwork).toHaveBeenCalledTimes(2);
      expect(mockNetworkInstance.remove).toHaveBeenCalledTimes(2);
    });

    it('should handle individual network removal errors gracefully', async () => {
      const mockNetworks = [
        { 
          Name: 'network1', 
          Id: 'net1',
          Created: new Date().toISOString(),
          Scope: 'local',
          Driver: 'bridge',
          EnableIPv6: false,
          IPAM: { Driver: 'default', Config: [] },
          Internal: false,
          Attachable: false,
          Ingress: false,
          ConfigFrom: { Network: '' },
          ConfigOnly: false,
          Containers: {},
          Options: {},
          Labels: {},
          Peers: []
        } as Docker.NetworkInspectInfo
      ];
      mockDockerClient.listNetworks.mockResolvedValue(mockNetworks);
      
      const mockNetworkInstance = {
        inspect: jest.fn().mockRejectedValue(new Error('Inspect failed')),
        remove: jest.fn()
      };
      mockDockerClient.getNetwork = jest.fn().mockReturnValue(mockNetworkInstance);

      // Should not throw, just log errors
      await expect(dockerManager.removeAllNetworks()).resolves.toBeUndefined();
    });
  });

  describe('getGatewayIP', () => {
    it('should correctly calculate .1 gateway IP for various subnets', () => {
      const dockerManagerAny = dockerManager as any;
      
      expect(dockerManagerAny.getGatewayIP('172.20.0.0/16')).toBe('172.20.0.1');
      expect(dockerManagerAny.getGatewayIP('192.168.1.0/24')).toBe('192.168.1.1');
      expect(dockerManagerAny.getGatewayIP('10.0.0.0/8')).toBe('10.0.0.1');
      expect(dockerManagerAny.getGatewayIP('172.16.100.0/24')).toBe('172.16.100.1');
    });
  });
}); 
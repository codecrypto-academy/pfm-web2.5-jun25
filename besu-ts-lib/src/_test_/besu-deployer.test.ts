import { BesuDeployer } from '../besu-deployer';
import Docker from 'dockerode';

// Mock dockerode
jest.mock('dockerode');
const MockedDocker = Docker as jest.MockedClass<typeof Docker>;

describe('BesuDeployer', () => {
  let besuDeployer: BesuDeployer;
  let mockDockerInstance: jest.Mocked<Docker>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDockerInstance = {
      createNetwork: jest.fn(),
      createContainer: jest.fn(),
      getNetwork: jest.fn(),
      getContainer: jest.fn()
    } as any;
    
    MockedDocker.mockImplementation(() => mockDockerInstance);
    
    besuDeployer = new BesuDeployer({
      networkName: 'besu-network',
      subnet: '172.25.0.0/16',
      dataPath: './besu-network'
    });
  });

  it('should create besu network with correct parameters', async () => {
    // Arrange
    const mockNetwork = { id: 'network-123' };
    mockDockerInstance.createNetwork.mockResolvedValue(mockNetwork as any);

    // Act
    await besuDeployer['createBesuNetwork']();

    // Assert
    expect(mockDockerInstance.createNetwork).toHaveBeenCalledWith({
      Name: 'besu-network',
      CheckDuplicate: true,
      Driver: 'bridge',
      IPAM: {
        Driver: 'default',
        Config: [{ Subnet: '172.25.0.0/16' }]
      },
      Labels: {
        'network': 'besu-network',
        'type': 'besu'
      }
    });
  });

  it('should deploy a bootnode correctly', async () => {
    // Arrange
    const mockContainer = {
      id: 'container-123',
      start: jest.fn().mockResolvedValue(undefined)
    };
    mockDockerInstance.createContainer.mockResolvedValue(mockContainer as any);

    const nodeConfig = {
      name: 'bootnode',
      ip: '172.25.0.10',
      isBootnode: true
    };

    // Act
    const containerId = await besuDeployer['deployBesuNode'](nodeConfig);

    // Assert
    expect(containerId).toBe('container-123');
    expect(mockDockerInstance.createContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'bootnode',
        Image: 'hyperledger/besu:latest',
        Labels: expect.objectContaining({
          'network': 'besu-network',
          'node-type': 'bootnode'
        })
      })
    );
  });

  it('should deploy a miner node correctly', async () => {
    // Arrange
    const mockContainer = {
      id: 'container-456',
      start: jest.fn().mockResolvedValue(undefined)
    };
    mockDockerInstance.createContainer.mockResolvedValue(mockContainer as any);

    const nodeConfig = {
      name: 'miner-node',
      ip: '172.25.0.12',
      isMiner: true
    };

    // Act
    const containerId = await besuDeployer['deployBesuNode'](nodeConfig);

    // Assert
    expect(containerId).toBe('container-456');
    expect(mockDockerInstance.createContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'miner-node',
        Image: 'hyperledger/besu:latest',
        Labels: expect.objectContaining({
          'network': 'besu-network',
          'node-type': 'miner'
        })
      })
    );
  });
});
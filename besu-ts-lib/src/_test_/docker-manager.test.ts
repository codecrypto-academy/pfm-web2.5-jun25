import { DockerManager } from '../docker-manager';
import Docker from 'dockerode';

// Mock dockerode
jest.mock('dockerode');
const MockedDocker = Docker as jest.MockedClass<typeof Docker>;

describe('DockerManager', () => {
  let dockerManager: DockerManager;
  let mockDockerInstance: jest.Mocked<Docker>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDockerInstance = {
      createNetwork: jest.fn()
    } as any;
    
    MockedDocker.mockImplementation(() => mockDockerInstance);
    dockerManager = new DockerManager();
  });

  it('should create a network', async () => {
    // Arrange
    const mockNetwork = { id: 'network-123' };
    mockDockerInstance.createNetwork.mockResolvedValue(mockNetwork as any);

    // Act
    const result = await dockerManager.createNetwork({
      name: 'test-network',
      subnet: '172.20.0.0/16'
    });

    // Assert
    expect(result).toBe('network-123');
    expect(mockDockerInstance.createNetwork).toHaveBeenCalledWith({
      Name: 'test-network',
      CheckDuplicate: true,
      Driver: 'bridge',
      IPAM: {
        Driver: 'default',
        Config: [{ Subnet: '172.20.0.0/16' }]
      },
      Labels: {}
    });
  });
});
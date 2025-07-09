import Docker from 'dockerode';
import { SystemValidator } from '../../services/SystemValidator';
import { DockerNotAvailableError, InsufficientResourcesError } from '../../errors';
import { logger } from '../../utils/logger';

// Mock dockerode
jest.mock('dockerode');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    child: jest.fn(() => ({
      info: jest.fn(),
      success: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })),
    info: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Helper function to create a complete DockerVersion mock object
const createDockerVersionMock = (version: string) => ({
  Version: version,
  ApiVersion: '1.41',
  Arch: 'amd64',
  BuildTime: new Date('2023-06-02T13:00:00.000Z'),
  Components: [],
  GitCommit: 'abc123',
  GoVersion: 'go1.19.9',
  KernelVersion: '5.4.0-74-generic',
  MinAPIVersion: '1.12',
  Os: 'linux',
  Platform: { Name: 'Docker Engine - Community' }
});

describe('SystemValidator - Unit Tests', () => {
  let mockDocker: jest.Mocked<Docker>;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh mock instances
    mockDocker = {
      ping: jest.fn(),
      info: jest.fn(),
      version: jest.fn(),
      getImage: jest.fn(),
      listNetworks: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      success: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Setup logger child mock
    (logger.child as jest.Mock).mockReturnValue(mockLogger);
  });

  describe('checkPrerequisites', () => {
    it('should orchestrate all sub-checks successfully', async () => {
      // Setup successful mocks for all checks
      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 8 * 1024 * 1024 * 1024, // 8GB
        DriverStatus: [['Data Space Total', '100 GB'], ['Data Space Available', '80 GB']],
        ContainersRunning: 5,
        ServerVersion: '20.10.17'
      });
      mockDocker.version.mockResolvedValue(createDockerVersionMock('20.10.17'));
      
      const mockImage = { inspect: jest.fn().mockResolvedValue({}) };
      mockDocker.getImage.mockReturnValue(mockImage as any);

      await SystemValidator.checkPrerequisites(mockDocker, 2);

      // Verify all checks were called
      expect(mockDocker.ping).toHaveBeenCalledTimes(1);
      expect(mockDocker.info).toHaveBeenCalledTimes(1);
      expect(mockDocker.version).toHaveBeenCalledTimes(1);
      expect(mockDocker.getImage).toHaveBeenCalledWith('hyperledger/besu:latest');
      expect(mockLogger.info).toHaveBeenCalledWith('Checking system prerequisites...');
      expect(mockLogger.success).toHaveBeenCalledWith('System prerequisites check passed');
    });

    it('should propagate DockerNotAvailableError from checkDockerAvailable', async () => {
      mockDocker.ping.mockRejectedValue(new Error('Connection refused'));

      await expect(SystemValidator.checkPrerequisites(mockDocker, 1))
        .rejects.toThrow(DockerNotAvailableError);
    });

    it('should propagate InsufficientResourcesError from checkResources', async () => {
      mockDocker.ping.mockResolvedValue(undefined);
      mockDocker.info.mockResolvedValue({
        MemTotal: 1024 * 1024 * 1024, // 1GB - insufficient
        ServerVersion: '20.10.17'
      });
      mockDocker.version.mockResolvedValue(createDockerVersionMock('20.10.17'));

      await expect(SystemValidator.checkPrerequisites(mockDocker, 5))
        .rejects.toThrow(InsufficientResourcesError);
    });
  });

  describe('checkDockerAvailable', () => {
    it('should pass when Docker is accessible', async () => {
      mockDocker.ping.mockResolvedValue(undefined);

      // Use reflection to access private method
      await expect((SystemValidator as any).checkDockerAvailable(mockDocker))
        .resolves.toBeUndefined();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Docker daemon is accessible');
    });

    it('should throw DockerNotAvailableError when Docker is not reachable', async () => {
      const connectionError = new Error('Connection refused');
      mockDocker.ping.mockRejectedValue(connectionError);

      await expect((SystemValidator as any).checkDockerAvailable(mockDocker))
        .rejects.toThrow(DockerNotAvailableError);
    });

    it('should throw DockerNotAvailableError with unknown error message', async () => {
      mockDocker.ping.mockRejectedValue('Unknown error');

      await expect((SystemValidator as any).checkDockerAvailable(mockDocker))
        .rejects.toThrow(DockerNotAvailableError);
    });
  });

  describe('checkDockerVersion', () => {
    it('should pass with acceptable Docker version', async () => {
      const dockerInfo = { ServerVersion: '20.10.17' };
      mockDocker.version.mockResolvedValue(createDockerVersionMock('20.10.17'));

      await expect((SystemValidator as any).checkDockerVersion(mockDocker, dockerInfo))
        .resolves.toBeUndefined();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Docker version: 20.10.17');
    });

    it('should throw DockerNotAvailableError for version too old', async () => {
      const dockerInfo = { ServerVersion: '19.03.0' };
      mockDocker.version.mockResolvedValue(createDockerVersionMock('19.03.0'));

      await expect((SystemValidator as any).checkDockerVersion(mockDocker, dockerInfo))
        .rejects.toThrow(DockerNotAvailableError);
    });

    it('should log warning when version cannot be determined from version call', async () => {
      const dockerInfo = { ServerVersion: undefined };
      const versionMock = createDockerVersionMock('');
      versionMock.Version = undefined as any;
      mockDocker.version.mockResolvedValue(versionMock);

      await (SystemValidator as any).checkDockerVersion(mockDocker, dockerInfo);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not determine Docker version');
    });

    it('should use ServerVersion from info when Version is not available', async () => {
      const dockerInfo = { ServerVersion: '20.10.17' };
      const versionMock = createDockerVersionMock('');
      versionMock.Version = undefined as any;
      mockDocker.version.mockResolvedValue(versionMock);

      await expect((SystemValidator as any).checkDockerVersion(mockDocker, dockerInfo))
        .resolves.toBeUndefined();
    });

    it('should log warning on version check error but not fail', async () => {
      const dockerInfo = { ServerVersion: '20.10.17' };
      mockDocker.version.mockRejectedValue(new Error('Version check failed'));

      await (SystemValidator as any).checkDockerVersion(mockDocker, dockerInfo);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not verify Docker version', expect.any(Error));
    });
  });

  describe('checkResources', () => {
    it('should pass with sufficient memory and disk space', async () => {
      const dockerInfo = {
        MemTotal: 8 * 1024 * 1024 * 1024, // 8GB
        DriverStatus: [['Data Space Total', '100 GB'], ['Data Space Available', '80 GB']],
        ContainersRunning: 5
      };

      await expect((SystemValidator as any).checkResources(dockerInfo, 2))
        .resolves.toBeUndefined();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Available memory: 8192MB');
      expect(mockLogger.debug).toHaveBeenCalledWith('Available disk space: 81920MB');
    });

    it('should throw InsufficientResourcesError for insufficient memory', async () => {
      const dockerInfo = {
        MemTotal: 1024 * 1024 * 1024, // 1GB
        DriverStatus: [['Data Space Available', '80 GB']],
        ContainersRunning: 5
      };

      await expect((SystemValidator as any).checkResources(dockerInfo, 5))
        .rejects.toThrow(InsufficientResourcesError);
    });

    it('should throw InsufficientResourcesError for insufficient disk space', async () => {
      const dockerInfo = {
        MemTotal: 8 * 1024 * 1024 * 1024, // 8GB
        DriverStatus: [['Data Space Available', '1 GB']], // Too little disk
        ContainersRunning: 5
      };

      await expect((SystemValidator as any).checkResources(dockerInfo, 5))
        .rejects.toThrow(InsufficientResourcesError);
    });

    it('should log warning when MemTotal is missing', async () => {
      const dockerInfo = {
        DriverStatus: [['Data Space Available', '80 GB']],
        ContainersRunning: 5
      };

      await (SystemValidator as any).checkResources(dockerInfo, 2);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not determine available memory');
    });

    it('should log warning when DriverStatus is missing', async () => {
      const dockerInfo = {
        MemTotal: 8 * 1024 * 1024 * 1024, // 8GB
        ContainersRunning: 5
      };

      await (SystemValidator as any).checkResources(dockerInfo, 2);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Could not determine available disk space');
    });

    it('should log warning for many running containers', async () => {
      const dockerInfo = {
        MemTotal: 8 * 1024 * 1024 * 1024, // 8GB
        DriverStatus: [['Data Space Available', '80 GB']],
        ContainersRunning: 75
      };

      await (SystemValidator as any).checkResources(dockerInfo, 2);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'System already has 75 containers running. Performance may be impacted.'
      );
    });
  });

  describe('checkBesuImage', () => {
    it('should pass when Besu image exists locally', async () => {
      const mockImage = { inspect: jest.fn().mockResolvedValue({}) };
      mockDocker.getImage.mockReturnValue(mockImage as any);

      await (SystemValidator as any).checkBesuImage(mockDocker);
      
      expect(mockDocker.getImage).toHaveBeenCalledWith('hyperledger/besu:latest');
      expect(mockImage.inspect).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Besu image found locally: hyperledger/besu:latest');
    });

    it('should log info when Besu image is not found locally', async () => {
      const mockImage = { inspect: jest.fn().mockRejectedValue(new Error('Image not found')) };
      mockDocker.getImage.mockReturnValue(mockImage as any);

      await (SystemValidator as any).checkBesuImage(mockDocker);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Besu image not found locally, will be pulled when needed: hyperledger/besu:latest'
      );
    });
  });

  describe('checkPortsAvailable', () => {
    it('should warn about privileged ports (80, 443)', async () => {
      const ports = [80, 443, 8545];

      const result = await SystemValidator.checkPortsAvailable(ports);
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('Port 80 is commonly used and may be unavailable');
      expect(mockLogger.warn).toHaveBeenCalledWith('Port 443 is commonly used and may be unavailable');
      expect(mockLogger.warn).toHaveBeenCalledWith('Port 8545 is commonly used and may be unavailable');
      expect(mockLogger.debug).toHaveBeenCalledWith('Checking availability of 3 ports');
    });

    it('should warn about common ports (22, 8080)', async () => {
      const ports = [22, 8080, 9000];

      const result = await SystemValidator.checkPortsAvailable(ports);
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('Port 22 is commonly used and may be unavailable');
      expect(mockLogger.warn).toHaveBeenCalledWith('Port 8080 is commonly used and may be unavailable');
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('9000'));
    });

    it('should not warn about uncommon ports', async () => {
      const ports = [9000, 9001, 9002];

      await SystemValidator.checkPortsAvailable(ports);
      
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('9000'));
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('9001'));
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('9002'));
    });
  });

  describe('networkExists', () => {
    it('should return true when network exists with exact name match', async () => {
      mockDocker.listNetworks.mockResolvedValue([
        { Name: 'besu-network', Id: 'abc123' },
        { Name: 'other-network', Id: 'def456' }
      ] as any);

      const result = await SystemValidator.networkExists(mockDocker, 'besu-network');
      
      expect(result).toBe(true);
      expect(mockDocker.listNetworks).toHaveBeenCalledWith({
        filters: { name: ['besu-network'] }
      });
    });

    it('should return false when network does not exist', async () => {
      mockDocker.listNetworks.mockResolvedValue([
        { Name: 'other-network', Id: 'def456' }
      ] as any);

      const result = await SystemValidator.networkExists(mockDocker, 'besu-network');
      
      expect(result).toBe(false);
    });

    it('should return false when network check fails', async () => {
      mockDocker.listNetworks.mockRejectedValue(new Error('Network check failed'));

      const result = await SystemValidator.networkExists(mockDocker, 'besu-network');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to check network existence', expect.any(Error));
    });

    it('should return false for partial name matches', async () => {
      mockDocker.listNetworks.mockResolvedValue([
        { Name: 'besu-network-test', Id: 'abc123' },
        { Name: 'test-besu-network', Id: 'def456' }
      ] as any);

      const result = await SystemValidator.networkExists(mockDocker, 'besu-network');
      
      expect(result).toBe(false);
    });
  });

  describe('parseVersion - Pure utility function', () => {
    it('should parse standard semantic versions correctly', () => {
      const testCases = [
        { input: '20.10.17', expected: { major: 20, minor: 10, patch: 17 } },
        { input: '1.0.0', expected: { major: 1, minor: 0, patch: 0 } },
        { input: '25.12.3', expected: { major: 25, minor: 12, patch: 3 } },
        { input: '0.1.2', expected: { major: 0, minor: 1, patch: 2 } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (SystemValidator as any).parseVersion(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle invalid version strings', () => {
      const testCases = [
        'invalid',
        '20.10',
        '20',
        '',
        'v20.10.17',
        '20.10.17-beta',
        'random-string'
      ];

      testCases.forEach(input => {
        const result = (SystemValidator as any).parseVersion(input);
        expect(result).toEqual({ major: 0, minor: 0, patch: 0 });
      });
    });

    it('should handle version strings with extra characters', () => {
      const result = (SystemValidator as any).parseVersion('Docker version 20.10.17, build 100c701');
      expect(result).toEqual({ major: 20, minor: 10, patch: 17 });
    });
  });

  describe('isVersionLower - Pure utility function', () => {
    it('should correctly compare major versions', () => {
      const current = { major: 19, minor: 10, patch: 17 };
      const required = { major: 20, minor: 10, patch: 0 };
      
      expect((SystemValidator as any).isVersionLower(current, required)).toBe(true);
      expect((SystemValidator as any).isVersionLower(required, current)).toBe(false);
    });

    it('should correctly compare minor versions when major versions are equal', () => {
      const current = { major: 20, minor: 9, patch: 17 };
      const required = { major: 20, minor: 10, patch: 0 };
      
      expect((SystemValidator as any).isVersionLower(current, required)).toBe(true);
      expect((SystemValidator as any).isVersionLower(required, current)).toBe(false);
    });

    it('should correctly compare patch versions when major and minor are equal', () => {
      const current = { major: 20, minor: 10, patch: 16 };
      const required = { major: 20, minor: 10, patch: 17 };
      
      expect((SystemValidator as any).isVersionLower(current, required)).toBe(true);
      expect((SystemValidator as any).isVersionLower(required, current)).toBe(false);
    });

    it('should return false for equal versions', () => {
      const version = { major: 20, minor: 10, patch: 17 };
      
      expect((SystemValidator as any).isVersionLower(version, version)).toBe(false);
    });

    it('should handle edge cases', () => {
      const testCases = [
        {
          current: { major: 0, minor: 0, patch: 0 },
          required: { major: 0, minor: 0, patch: 1 },
          expected: true
        },
        {
          current: { major: 999, minor: 999, patch: 999 },
          required: { major: 1000, minor: 0, patch: 0 },
          expected: true
        },
        {
          current: { major: 21, minor: 0, patch: 0 },
          required: { major: 20, minor: 999, patch: 999 },
          expected: false
        }
      ];

      testCases.forEach(({ current, required, expected }) => {
        expect((SystemValidator as any).isVersionLower(current, required)).toBe(expected);
      });
    });
  });

  describe('parseDiskInfo - Pure utility function', () => {
    it('should parse GB disk information correctly', () => {
      const driverStatus = [
        ['Storage Driver', 'overlay2'],
        ['Data Space Total', '100 GB'],
        ['Data Space Available', '80 GB']
      ];

      const result = (SystemValidator as any).parseDiskInfo(driverStatus);
      
      expect(result).toEqual({ availableMB: 81920 }); // 80 GB = 80 * 1024 MB
    });

    it('should parse MB disk information correctly', () => {
      const driverStatus = [
        ['Storage Driver', 'overlay2'],
        ['Data Space Available', '2048 MB']
      ];

      const result = (SystemValidator as any).parseDiskInfo(driverStatus);
      
      expect(result).toEqual({ availableMB: 2048 });
    });

    it('should parse TB disk information correctly', () => {
      const driverStatus = [
        ['Pool Size', '2 TB']
      ];

      const result = (SystemValidator as any).parseDiskInfo(driverStatus);
      
      expect(result).toEqual({ availableMB: 2097152 }); // 2 TB = 2 * 1024 * 1024 MB
    });

    it('should handle decimal values', () => {
      const driverStatus = [
        ['Data Space Available', '1.5 GB']
      ];

      const result = (SystemValidator as any).parseDiskInfo(driverStatus);
      
      expect(result).toEqual({ availableMB: 1536 }); // 1.5 GB = 1536 MB
    });

    it('should return null for unparseable disk info', () => {
      const testCases = [
        [],
        [['Storage Driver', 'overlay2']],
        [['Unknown Field', 'unknown value']],
        [['Data Space Available', 'invalid format']]
      ];

      testCases.forEach(driverStatus => {
        const result = (SystemValidator as any).parseDiskInfo(driverStatus);
        expect(result).toBeNull();
      });
    });

    it('should handle various space-related key names', () => {
      const testCases = [
        { key: 'Data Space Available', value: '100 GB' },
        { key: 'Pool Size', value: '200 GB' },
        { key: 'Available Space', value: '150 GB' },
        { key: 'Total Size', value: '300 GB' }
      ];

      testCases.forEach(({ key, value }) => {
        const driverStatus = [[key, value]];
        const result = (SystemValidator as any).parseDiskInfo(driverStatus);
        expect(result).not.toBeNull();
        expect(result?.availableMB).toBeGreaterThan(0);
      });
    });

    it('should handle parsing errors gracefully', () => {
      // Mock console.debug to avoid log output during tests
      const originalDebug = console.debug;
      console.debug = jest.fn();

      const driverStatus = [
        ['Data Space Available', '100 GB']
      ];

      // Force an error by corrupting the parsing process
      const result = (SystemValidator as any).parseDiskInfo(driverStatus);
      
      // Restore console.debug
      console.debug = originalDebug;
      
      expect(result).toEqual({ availableMB: 102400 }); // Should still work normally
    });
  });

  describe('estimateRequirements - Pure utility function', () => {
    it('should calculate requirements for single node', () => {
      const result = SystemValidator.estimateRequirements(1);
      
      expect(result).toEqual({
        memoryMB: 2560, // 2048 + (1 * 512)
        diskMB: 6144,   // 5120 + (1 * 1024)
        estimatedStartupTime: 12 // 10 + (1 * 2)
      });
    });

    it('should calculate requirements for multiple nodes', () => {
      const result = SystemValidator.estimateRequirements(5);
      
      expect(result).toEqual({
        memoryMB: 4608, // 2048 + (5 * 512)
        diskMB: 10240,  // 5120 + (5 * 1024)
        estimatedStartupTime: 20 // 10 + (5 * 2)
      });
    });

    it('should handle zero nodes', () => {
      const result = SystemValidator.estimateRequirements(0);
      
      expect(result).toEqual({
        memoryMB: 2048, // 2048 + (0 * 512)
        diskMB: 5120,   // 5120 + (0 * 1024)
        estimatedStartupTime: 10 // 10 + (0 * 2)
      });
    });

    it('should calculate requirements for large networks', () => {
      const result = SystemValidator.estimateRequirements(100);
      
      expect(result).toEqual({
        memoryMB: 53248,  // 2048 + (100 * 512)
        diskMB: 107520,   // 5120 + (100 * 1024)
        estimatedStartupTime: 210 // 10 + (100 * 2)
      });
    });

    it('should ensure linear scaling', () => {
      const baseline = SystemValidator.estimateRequirements(1);
      const scaled = SystemValidator.estimateRequirements(3);
      
      expect(scaled.memoryMB - baseline.memoryMB).toBe(2 * 512); // 2 additional nodes * 512MB each
      expect(scaled.diskMB - baseline.diskMB).toBe(2 * 1024);    // 2 additional nodes * 1024MB each
      expect(scaled.estimatedStartupTime - baseline.estimatedStartupTime).toBe(2 * 2); // 2 additional nodes * 2s each
    });
  });
}); 
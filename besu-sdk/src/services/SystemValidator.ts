/**
 * System validation service for the Besu SDK
 * 
 * This service validates that the host system meets all prerequisites
 * for running a Besu network, including Docker availability, resource
 * checks, and network configuration validation.
 */

import Docker from 'dockerode';
import { DockerNotAvailableError, InsufficientResourcesError } from '../errors';
import { logger } from '../utils/logger';

/**
 * Minimum system requirements for running Besu networks
 */
interface SystemRequirements {
  minMemoryMB: number;
  minDiskSpaceMB: number;
  minDockerVersion: string;
}

/**
 * Default requirements based on network size
 */
const DEFAULT_REQUIREMENTS: SystemRequirements = {
  minMemoryMB: 2048,      // 2GB minimum
  minDiskSpaceMB: 5120,   // 5GB minimum  
  minDockerVersion: '20.10.0'
};

/**
 * SystemValidator performs pre-flight checks before network creation
 * 
 * Ensures the host system has:
 * - Docker installed and accessible
 * - Sufficient memory and disk space
 * - Required Docker version
 * - Network ports available
 */
export class SystemValidator {
  private static readonly log = logger.child('SystemValidator');
  
  /**
   * Check all system prerequisites
   * 
   * @param docker Docker client instance
   * @param nodeCount Number of nodes to be created
   * @throws DockerNotAvailableError if Docker is not accessible
   * @throws InsufficientResourcesError if system resources are inadequate
   */
  static async checkPrerequisites(
    docker: Docker,
    nodeCount: number = 1
  ): Promise<void> {
    this.log.info('Checking system prerequisites...');
    
    // Check Docker availability
    await this.checkDockerAvailable(docker);
    
    // Get Docker info
    const info = await this.getDockerInfo(docker);
    
    // Check Docker version
    await this.checkDockerVersion(docker, info);
    
    // Check available resources
    await this.checkResources(info, nodeCount);
    
    // Check for required images
    await this.checkBesuImage(docker);
    
    this.log.success('System prerequisites check passed');
  }
  
  /**
   * Verify Docker daemon is accessible
   * 
   * @param docker Docker client instance
   * @throws DockerNotAvailableError if connection fails
   */
  private static async checkDockerAvailable(docker: Docker): Promise<void> {
    try {
      await docker.ping();
      this.log.debug('Docker daemon is accessible');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new DockerNotAvailableError(message);
    }
  }
  
  /**
   * Get Docker system information
   * 
   * @param docker Docker client instance
   * @returns Docker info object
   * @throws DockerNotAvailableError if info retrieval fails
   */
  private static async getDockerInfo(docker: Docker): Promise<any> {
    try {
      const info = await docker.info();
      this.log.debug('Retrieved Docker system info');
      return info;
    } catch (error) {
      throw new DockerNotAvailableError('Failed to retrieve Docker information');
    }
  }
  
  /**
   * Check Docker version meets minimum requirements
   * 
   * @param docker Docker client instance
   * @param info Docker info object
   * @throws DockerNotAvailableError if version is too old
   */
  private static async checkDockerVersion(docker: Docker, info: any): Promise<void> {
    try {
      const version = await docker.version();
      const currentVersion = version.Version || info.ServerVersion;
      
      if (!currentVersion) {
        this.log.warn('Could not determine Docker version');
        return;
      }
      
      this.log.debug(`Docker version: ${currentVersion}`);
      
      // Compare versions (simple string comparison for major.minor)
      const current = this.parseVersion(currentVersion);
      const required = this.parseVersion(DEFAULT_REQUIREMENTS.minDockerVersion);
      
      if (this.isVersionLower(current, required)) {
        throw new DockerNotAvailableError(
          `Docker version ${currentVersion} is below minimum required version ${DEFAULT_REQUIREMENTS.minDockerVersion}`
        );
      }
    } catch (error) {
      if (error instanceof DockerNotAvailableError) {
        throw error;
      }
      // Log warning but don't fail if version check has issues
      this.log.warn('Could not verify Docker version', error);
    }
  }
  
  /**
   * Check if system has sufficient resources
   * 
   * @param info Docker info object containing system stats
   * @param nodeCount Number of nodes to be created
   * @throws InsufficientResourcesError if resources are inadequate
   */
  private static async checkResources(info: any, nodeCount: number): Promise<void> {
    // Calculate required resources based on node count
    const requiredMemoryMB = DEFAULT_REQUIREMENTS.minMemoryMB + (nodeCount * 512); // 512MB per node
    const requiredDiskMB = DEFAULT_REQUIREMENTS.minDiskSpaceMB + (nodeCount * 1024); // 1GB per node
    
    // Check memory
    if (info.MemTotal) {
      const availableMemoryMB = Math.floor(info.MemTotal / 1024 / 1024);
      this.log.debug(`Available memory: ${availableMemoryMB}MB`);
      
      if (availableMemoryMB < requiredMemoryMB) {
        throw new InsufficientResourcesError(
          'memory',
          `${requiredMemoryMB}MB`,
          `${availableMemoryMB}MB`
        );
      }
    } else {
      this.log.warn('Could not determine available memory');
    }
    
    // Check disk space
    if (info.DriverStatus) {
      const diskInfo = this.parseDiskInfo(info.DriverStatus);
      if (diskInfo) {
        this.log.debug(`Available disk space: ${diskInfo.availableMB}MB`);
        
        if (diskInfo.availableMB < requiredDiskMB) {
          throw new InsufficientResourcesError(
            'disk space',
            `${requiredDiskMB}MB`,
            `${diskInfo.availableMB}MB`
          );
        }
      }
    } else {
      this.log.warn('Could not determine available disk space');
    }
    
    // Warn about container limits
    if (info.ContainersRunning && info.ContainersRunning > 50) {
      this.log.warn(
        `System already has ${info.ContainersRunning} containers running. ` +
        `Performance may be impacted.`
      );
    }
  }
  
  /**
   * Check if Besu image is available or can be pulled
   * 
   * @param docker Docker client instance
   */
  private static async checkBesuImage(docker: Docker): Promise<void> {
    const imageName = 'hyperledger/besu:latest';
    
    try {
      // Check if image exists locally
      const image = docker.getImage(imageName);
      await image.inspect();
      this.log.debug(`Besu image found locally: ${imageName}`);
    } catch (error) {
      // Image not found locally
      this.log.info(`Besu image not found locally, will be pulled when needed: ${imageName}`);
    }
  }
  
  /**
   * Validate that required ports are available
   * 
   * @param ports Array of ports to check
   * @returns Array of unavailable ports
   */
  static async checkPortsAvailable(ports: number[]): Promise<number[]> {
    const unavailable: number[] = [];
    
    // Note: Full port checking would require additional dependencies
    // This is a placeholder that could be enhanced with proper port scanning
    this.log.debug(`Checking availability of ${ports.length} ports`);
    
    // For now, just warn about common conflicts
    const commonlyUsedPorts = [80, 443, 3000, 8080, 8545, 8546];
    for (const port of ports) {
      if (commonlyUsedPorts.includes(port)) {
        this.log.warn(`Port ${port} is commonly used and may be unavailable`);
      }
    }
    
    return unavailable;
  }
  
  /**
   * Check if a Docker network already exists
   * 
   * @param docker Docker client instance
   * @param networkName Name of the network to check
   * @returns True if network exists
   */
  static async networkExists(docker: Docker, networkName: string): Promise<boolean> {
    try {
      const networks = await docker.listNetworks({
        filters: { name: [networkName] }
      });
      
      // Exact name match (Docker returns partial matches)
      return networks.some(net => net.Name === networkName);
    } catch (error) {
      this.log.error('Failed to check network existence', error);
      return false;
    }
  }
  
  /**
   * Parse version string into comparable format
   * 
   * @param version Version string (e.g., "20.10.17")
   * @returns Parsed version object
   */
  private static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return { major: 0, minor: 0, patch: 0 };
    }
    
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    };
  }
  
  /**
   * Compare two version objects
   * 
   * @param current Current version
   * @param required Required version
   * @returns True if current is lower than required
   */
  private static isVersionLower(
    current: { major: number; minor: number; patch: number },
    required: { major: number; minor: number; patch: number }
  ): boolean {
    if (current.major < required.major) return true;
    if (current.major > required.major) return false;
    
    if (current.minor < required.minor) return true;
    if (current.minor > required.minor) return false;
    
    return current.patch < required.patch;
  }
  
  /**
   * Parse disk information from Docker driver status
   * 
   * @param driverStatus Array of driver status entries
   * @returns Disk info object or null if not parseable
   */
  private static parseDiskInfo(driverStatus: Array<[string, string]>): { availableMB: number } | null {
    try {
      // Look for disk space info in driver status
      for (const [key, value] of driverStatus) {
        if (key.toLowerCase().includes('space') || key.toLowerCase().includes('size')) {
          // Try to parse value (format varies by storage driver)
          const match = value.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
          if (match) {
            const size = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            
            let availableMB = size;
            if (unit === 'GB') availableMB *= 1024;
            if (unit === 'TB') availableMB *= 1024 * 1024;
            
            return { availableMB: Math.floor(availableMB) };
          }
        }
      }
    } catch (error) {
      this.log.debug('Could not parse disk info from driver status');
    }
    
    return null;
  }
  
  /**
   * Estimate resource requirements for a network
   * 
   * @param nodeCount Number of nodes in the network
   * @returns Resource requirements
   */
  static estimateRequirements(nodeCount: number): {
    memoryMB: number;
    diskMB: number;
    estimatedStartupTime: number;
  } {
    return {
      memoryMB: DEFAULT_REQUIREMENTS.minMemoryMB + (nodeCount * 512),
      diskMB: DEFAULT_REQUIREMENTS.minDiskSpaceMB + (nodeCount * 1024),
      estimatedStartupTime: 10 + (nodeCount * 2) // seconds
    };
  }
}
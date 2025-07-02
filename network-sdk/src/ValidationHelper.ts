import Docker from 'dockerode';
import { BesuNetworkConfig, NetworkInfo, ValidationOptions } from './types.js';
import { NetworkManagerHelper } from './NetworkManagerHelper.js';

/**
 * Validation utilities for NetworkManager
 */
export class ValidationHelper {
  
  /**
   * Validate network configuration with configurable options
   */
  static async validateConfig(
    config: Required<BesuNetworkConfig>,
    validationOptions: ValidationOptions,
    existingNetworks: Map<string, NetworkInfo>,
    docker: Docker
  ): Promise<void> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.networkId) {
      errors.push('Network ID is required');
    }
    
    // Basic format validation
    if (validationOptions.checkBasicFormat) {
      if (config.chainId <= 0 || !Number.isInteger(config.chainId)) {
        errors.push('Chain ID must be a positive integer');
      }
      if (!config.subnet.includes('/')) {
        errors.push('Subnet must be in CIDR format (e.g., 172.20.0.0/24)');
      }
    }
    
    // Check for existing network ID
    if (validationOptions.checkExistingNetworkId && existingNetworks.has(config.networkId)) {
      errors.push(`Network ${config.networkId} already exists`);
    }
    
    // Check for all potential conflicts with existing networks
    if (ValidationHelper.shouldPerformConflictChecks(validationOptions)) {
      const conflictErrors = ValidationHelper.checkForConflicts(config, validationOptions, existingNetworks);
      errors.push(...conflictErrors);
    }
    
    // Check for Docker network name conflicts
    if (validationOptions.checkDockerNetworkConflicts) {
      try {
        const dockerError = await ValidationHelper.checkDockerNetworkConflicts(config, docker);
        if (dockerError) {
          errors.push(dockerError);
        }
      } catch (error) {
        // Docker check errors are handled within the method
      }
    }
    
    // Run custom validator if provided
    if (validationOptions.customValidator) {
      try {
        const existingNetworksArray = Array.from(existingNetworks.values());
        await validationOptions.customValidator(config, existingNetworksArray);
      } catch (error) {
        errors.push(`Custom validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Handle errors and warnings based on configuration
    if (errors.length > 0) {
      if (validationOptions.warningsOnly) {
        console.warn('Validation warnings:', errors.join('; '));
        warnings.push(...errors);
      } else {
        const errorMessage = validationOptions.detailedErrors 
          ? `Validation failed:\n${errors.map(e => '  - ' + e).join('\n')}`
          : `Validation failed: ${errors.join('; ')}`;
        throw new Error(errorMessage);
      }
    }
    
    if (warnings.length > 0) {
      console.warn('Network configuration warnings:', warnings.join('; '));
    }
  }

  /**
   * Check if we should perform any conflict checks
   */
  static shouldPerformConflictChecks(validationOptions: ValidationOptions): boolean {
    return !!(validationOptions.checkChainIdConflicts ||
              validationOptions.checkSubnetOverlaps ||
              validationOptions.checkNameConflicts ||
              validationOptions.checkPortConflicts);
  }

  /**
   * Check for Docker network name conflicts
   */
  static async checkDockerNetworkConflicts(config: Required<BesuNetworkConfig>, docker: Docker): Promise<string | null> {
    try {
      const dockerNetworkName = `besu-${config.networkId}`;
      const existingDockerNetworks = await docker.listNetworks({
        filters: { name: [dockerNetworkName] }
      });
      
      if (existingDockerNetworks.length > 0) {
        return `Docker network '${dockerNetworkName}' already exists. ` +
               `Please choose a different network ID or clean up existing Docker resources.`;
      }
      return null;
    } catch (error) {
      // If we can't check Docker networks, we'll proceed and let the cleanup handle it
      console.warn('Could not check for existing Docker networks:', error);
      return null;
    }
  }

  /**
   * Check for conflicts with existing networks
   */
  static checkForConflicts(
    config: Required<BesuNetworkConfig>,
    validationOptions: ValidationOptions,
    existingNetworks: Map<string, NetworkInfo>
  ): string[] {
    const errors: string[] = [];
    const existingNetworksArray = Array.from(existingNetworks.values());
    
    for (const existing of existingNetworksArray) {
      // Skip the network we're potentially updating
      if (existing.networkId === config.networkId) continue;
      
      // 1. Chain ID conflict
      if (validationOptions.checkChainIdConflicts && existing.config.chainId === config.chainId) {
        errors.push(
          `Chain ID ${config.chainId} is already used by network '${existing.networkId}'. ` +
          `Each network must have a unique chain ID for proper blockchain operation.`
        );
      }
      
      // 2. Network name conflict (display name)
      if (validationOptions.checkNameConflicts && 
          existing.config.name && config.name && existing.config.name === config.name) {
        errors.push(
          `Network name '${config.name}' is already used by network '${existing.networkId}'. ` +
          `Please choose a different name.`
        );
      }
      
      // 3. Subnet overlap check
      if (validationOptions.checkSubnetOverlaps && 
          existing.config.subnet && NetworkManagerHelper.subnetsOverlap(existing.config.subnet, config.subnet)) {
        errors.push(
          `Subnet ${config.subnet} overlaps with existing network '${existing.networkId}' ` +
          `subnet ${existing.config.subnet}. Networks must use non-overlapping IP ranges.`
        );
      }
      
      // 4. Port conflicts - check if any nodes would have conflicting host ports
      if (validationOptions.checkPortConflicts) {
        const portErrors = ValidationHelper.checkPortConflicts(config, existing);
        errors.push(...portErrors);
      }
    }
    
    return errors;
  }

  /**
   * Check for port conflicts between networks
   */
  static checkPortConflicts(newConfig: Required<BesuNetworkConfig>, existingNetwork: NetworkInfo): string[] {
    const errors: string[] = [];
    
    // Get all ports that would be used by the new network
    const newNetworkPorts = NetworkManagerHelper.getNetworkPortRanges(newConfig);
    
    // Get all ports used by the existing network
    const existingPorts = NetworkManagerHelper.getNetworkPortRanges(existingNetwork.config);
    
    // Check for overlaps
    for (const newPortRange of newNetworkPorts) {
      for (const existingPortRange of existingPorts) {
        if (NetworkManagerHelper.portRangesOverlap(newPortRange, existingPortRange)) {
          errors.push(
            `Port conflict detected: Network '${newConfig.networkId}' would use ports ` +
            `${newPortRange.start}-${newPortRange.end} which overlap with existing network ` +
            `'${existingNetwork.networkId}' ports ${existingPortRange.start}-${existingPortRange.end}.`
          );
        }
      }
    }
    
    return errors;
  }
}

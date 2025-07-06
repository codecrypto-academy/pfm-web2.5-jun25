/**
 * Test utilities for robust Docker network management
 */

import { executeCommandSilent } from '../src/create-besu-networks';

export interface TestCleanupOptions {
  networkPrefix?: string;
  verbose?: boolean;
}

/**
 * Clean up Docker networks before/after tests to prevent conflicts
 */
export async function cleanupTestNetworks(options: TestCleanupOptions = {}): Promise<void> {
  const { networkPrefix = 'test-', verbose = false } = options;
  
  if (verbose) {
    console.log('🧹 Cleaning up test Docker networks...');
  }

  try {
    // List all networks
    const networks = executeCommandSilent('docker network ls --format "{{.Name}}"').trim().split('\n');
    
    // Filter test networks
    const testNetworks = networks.filter((network: string) => 
      network.includes(networkPrefix) ||
      network.includes('besu') ||
      network.includes('mi-red') ||
      network.includes('ejemplo') ||
      network.includes('conflict-resolution') ||
      network.includes('connectivity')
    );

    if (testNetworks.length > 0) {
      if (verbose) {
        console.log(`Found ${testNetworks.length} test networks to clean:`, testNetworks);
      }
      
      for (const network of testNetworks) {
        if (network === 'bridge' || network === 'host' || network === 'none') {
          continue;
        }
        
        try {
          // Stop and remove containers first
          try {
            const containers = executeCommandSilent(`docker ps -aq --filter "network=${network}"`);
            if (containers.trim()) {
              executeCommandSilent(`docker rm -f ${containers.trim().split('\n').join(' ')}`);
            }
          } catch (containerError) {
            // Containers might not exist, that's ok
          }
          
          // Remove the network
          executeCommandSilent(`docker network rm ${network}`);
          if (verbose) {
            console.log(`✅ Removed network: ${network}`);
          }
        } catch (error) {
          // Network might not exist, that's ok
          if (verbose && error instanceof Error && !error.message.includes('Resource not found')) {
            console.log(`⚠️  Could not remove ${network}: ${error.message}`);
          }
        }
      }
    } else if (verbose) {
      console.log('✨ No test networks found to clean');
    }
  } catch (error) {
    if (verbose && error instanceof Error && !error.message.includes('Resource not found')) {
      console.log(`⚠️  Error during cleanup: ${error.message}`);
    }
  }
}

/**
 * Ensure Docker is available and working
 */
export function checkDockerAvailability(): boolean {
  try {
    executeCommandSilent('docker version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a unique test network name to avoid conflicts
 */
export function generateTestNetworkName(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Wait for a condition with timeout and retries
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeoutMs: number = 30000,
  intervalMs: number = 1000,
  description?: string
): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    try {
      if (await condition()) {
        return true;
      }
    } catch (error) {
      // Condition check failed, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Timeout waiting for condition${description ? `: ${description}` : ''}`);
}

/**
 * Setup test environment with cleanup
 */
export async function setupTestEnvironment(options: TestCleanupOptions = {}): Promise<() => Promise<void>> {
  // Check Docker availability
  if (!checkDockerAvailability()) {
    throw new Error('Docker is not available. Please ensure Docker is installed and running.');
  }
  
  // Cleanup before test
  await cleanupTestNetworks(options);
  
  // Return cleanup function for after test
  return async () => {
    await cleanupTestNetworks(options);
  };
}

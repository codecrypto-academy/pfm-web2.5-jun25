import Docker from 'dockerode';
import { NetworkManagerHelper } from './NetworkManagerHelper.js';

/**
 * Docker cleanup utilities for NetworkManager
 */
export class DockerCleanupHelper {
  
  /**
   * Comprehensive cleanup of all Docker resources for a network
   */
  static async performNetworkCleanup(docker: Docker, networkId: string): Promise<void> {
    const networkName = `besu-${networkId}`;
    
    try {
      // Step 1: Remove all containers with matching names (from any network)
      console.info(`Step 1: Removing all containers matching pattern: ${networkName}-*`);
      const allContainers = await docker.listContainers({
        all: true,
        filters: {}
      });

      const matchingContainers = allContainers.filter(container => 
        container.Names.some(name => name.includes(networkName))
      );

      if (matchingContainers.length > 0) {
        console.info(`Found ${matchingContainers.length} containers to remove`);
        for (const containerInfo of matchingContainers) {
          try {
            const container = docker.getContainer(containerInfo.Id);
            console.info(`Forcefully removing container: ${containerInfo.Names[0]}`);
            
            // Kill and remove in one step
            await container.remove({ force: true, v: true });
            console.info(`Successfully removed: ${containerInfo.Names[0]}`);
          } catch (error) {
            console.warn(`Failed to remove ${containerInfo.Names[0]}:`, error);
          }
        }
        
        // Wait for containers to be fully removed
        await NetworkManagerHelper.waitForDockerCleanup();
      }

      // Step 2: Remove the network if it exists
      console.info(`Step 2: Removing network: ${networkName}`);
      const networks = await docker.listNetworks({
        filters: { name: [networkName] }
      });

      if (networks.length > 0) {
        for (const networkInfo of networks) {
          try {
            const network = docker.getNetwork(networkInfo.Id);
            console.info(`Removing network: ${networkInfo.Name}`);
            await network.remove();
            console.info(`Successfully removed network: ${networkInfo.Name}`);
          } catch (error) {
            console.warn(`Failed to remove network ${networkInfo.Name}:`, error);
          }
        }
        
        // Wait for network to be fully removed
        await NetworkManagerHelper.waitForDockerCleanup();
      }

      // Step 3: Prune unused networks to clean up any orphaned state
      console.info(`Step 3: Pruning unused Docker networks`);
      try {
        await docker.pruneNetworks();
        console.info(`Successfully pruned unused networks`);
      } catch (error) {
        console.warn(`Failed to prune networks:`, error);
      }

      console.info(`Comprehensive cleanup completed for: ${networkId}`);
      
    } catch (error) {
      console.error(`Comprehensive cleanup failed for ${networkId}:`, error);
      // Don't throw - we'll try to create anyway
    }
  }
}

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Network Manager for Besu operations
 * Provides TypeScript interface to shell scripts
 */
export class NetworkManager {
  private readonly scriptsPath: string;

  constructor(scriptsPath?: string) {
    // Default to scripts directory relative to project root
    this.scriptsPath = scriptsPath || path.join(process.cwd(), '..', 'scripts');
  }

  /**
   * Setup the network (creates Podman network, generates keys, configs)
   */
  async setup(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} setup`);
  }

  /**
   * Start the network
   */
  async start(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} start`);
  }

  /**
   * Stop the network
   */
  async stop(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} stop`);
  }

  /**
   * Restart the network
   */
  async restart(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} restart`);
  }

  /**
   * Get network status
   */
  async getStatus(): Promise<string> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    const { stdout } = await execAsync(`${scriptPath} status`);
    return stdout;
  }

  /**
   * Get network logs
   */
  async getLogs(container: string = 'all'): Promise<string> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    const { stdout } = await execAsync(`${scriptPath} logs ${container}`);
    return stdout;
  }

  /**
   * Test network connectivity
   */
  async test(): Promise<string> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    const { stdout } = await execAsync(`${scriptPath} test`);
    return stdout;
  }

  /**
   * Reset the network (destructive operation)
   */
  async reset(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} reset`);
  }
}

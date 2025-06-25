import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Network Manager for Besu operations
 * Provides TypeScript interface to shell scripts
 */
export class NetworkManager {
  private readonly scriptsPath: string;

  constructor(scriptsPath?: string) {
    // Default to bundled scripts in dist directory
    // Go up from dist/network/ to dist/scripts/
    this.scriptsPath = scriptsPath || path.join(__dirname, '..', 'scripts');
  }

  /**
   * Setup the network (creates Podman network, generates keys, configs)
   */
  async setup(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`NON_INTERACTIVE=true ${scriptPath} setup`, {
      cwd: this.scriptsPath
    });
  }

  /**
   * Start the network
   */
  async start(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`NON_INTERACTIVE=true ${scriptPath} start`, {
      cwd: this.scriptsPath
    });
  }

  /**
   * Stop the network
   */
  async stop(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} stop`, {
      cwd: this.scriptsPath
    });
  }

  /**
   * Restart the network
   */
  async restart(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} restart`, {
      cwd: this.scriptsPath
    });
  }

  /**
   * Get network status
   */
  async getStatus(): Promise<string> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    const { stdout } = await execAsync(`${scriptPath} status`, {
      cwd: this.scriptsPath
    });
    return stdout;
  }

  /**
   * Get network logs
   */
  async getLogs(container: string = 'all'): Promise<string> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    const { stdout } = await execAsync(`${scriptPath} logs ${container}`, {
      cwd: this.scriptsPath
    });
    return stdout;
  }

  /**
   * Test network connectivity
   */
  async test(): Promise<string> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    const { stdout } = await execAsync(`${scriptPath} test`, {
      cwd: this.scriptsPath
    });
    return stdout;
  }

  /**
   * Reset the network (destructive operation)
   */
  async reset(): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, 'besu-network.sh');
    await execAsync(`${scriptPath} reset`, {
      cwd: this.scriptsPath
    });
  }
}

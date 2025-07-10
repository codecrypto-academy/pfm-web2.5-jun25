import { NetworkService, DEFAULT_NETWORK_CONFIG } from '../index';
import { CryptoUtils } from '../utils/crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('NetworkService', () => {
  let networkService: NetworkService;
  const testMnemonic = 'test test test test test test test test test test test junk';
  const tempDir = path.join(__dirname, 'temp');

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  beforeEach(() => {
    networkService = new NetworkService(DEFAULT_NETWORK_CONFIG);
  });

  afterEach(async () => {
    // Limpiar archivos temporales
    const networkDir = path.join(process.cwd(), 'networks', DEFAULT_NETWORK_CONFIG.networkName);
    if (await fs.pathExists(networkDir)) {
      await fs.remove(networkDir);
    }
  });

  describe('Network Configuration', () => {
    it('should create network service with default config', () => {
      expect(networkService).toBeDefined();
    });

    it('should have correct default configuration', () => {
      expect(DEFAULT_NETWORK_CONFIG.chainId).toBe(13371337);
      expect(DEFAULT_NETWORK_CONFIG.networkName).toBe('besu-network');
      expect(DEFAULT_NETWORK_CONFIG.subnet).toBe('172.28.0.0/16');
      expect(DEFAULT_NETWORK_CONFIG.nodes).toHaveLength(3);
    });

    it('should have correct node types', () => {
      const nodeTypes = DEFAULT_NETWORK_CONFIG.nodes.map(node => node.type);
      expect(nodeTypes).toContain('bootnode');
      expect(nodeTypes).toContain('miner');
      expect(nodeTypes).toContain('rpc');
    });

    it('should have correct node configuration', () => {
      const bootnode = DEFAULT_NETWORK_CONFIG.nodes.find(n => n.type === 'bootnode');
      const miner = DEFAULT_NETWORK_CONFIG.nodes.find(n => n.type === 'miner');
      const rpc = DEFAULT_NETWORK_CONFIG.nodes.find(n => n.type === 'rpc');

      expect(bootnode).toBeDefined();
      expect(miner).toBeDefined();
      expect(rpc).toBeDefined();

      expect(bootnode?.port).toBe(30303);
      expect(miner?.rpcPort).toBe(8545);
      expect(rpc?.rpcPort).toBe(8546);
    });
  });

  describe('Account Generation', () => {
    it('should generate accounts from valid mnemonic', async () => {
      const result = await networkService.generateAccounts(testMnemonic, 5);

      expect(result.mnemonic).toBe(testMnemonic);
      expect(result.accounts).toHaveLength(5);
      expect(result.accountsFile).toBeDefined();

      result.accounts.forEach(account => {
        expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(account.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(account.balance).toBe('0');
      });
    });

    it('should throw error for invalid mnemonic', async () => {
      const invalidMnemonic = 'invalid mnemonic phrase';

      await expect(networkService.generateAccounts(invalidMnemonic)).rejects.toThrow('Mnemónico inválido');
    });

    it('should save addresses to file', async () => {
      const result = await networkService.generateAccounts(testMnemonic, 3);

      expect(await fs.pathExists(result.accountsFile)).toBe(true);
      
      const savedAddresses = await fs.readJson(result.accountsFile);
      expect(savedAddresses).toHaveLength(3);
      expect(savedAddresses).toEqual(result.accounts.map(acc => acc.address));
    });

    it('should use default count of 10', async () => {
      const result = await networkService.generateAccounts(testMnemonic);

      expect(result.accounts).toHaveLength(10);
    });
  });

  describe('Network Status', () => {
    it('should return network status structure', async () => {
      const status = await networkService.getNetworkStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('nodes');
      expect(status).toHaveProperty('totalNodes');
      expect(status).toHaveProperty('runningNodes');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(Array.isArray(status.nodes)).toBe(true);
      expect(typeof status.totalNodes).toBe('number');
      expect(typeof status.runningNodes).toBe('number');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup network resources', async () => {
      // Crear algunos archivos temporales para simular la red
      const networkDir = path.join(process.cwd(), 'networks', DEFAULT_NETWORK_CONFIG.networkName);
      await fs.ensureDir(networkDir);
      await fs.writeFile(path.join(networkDir, 'test.txt'), 'test');

      await networkService.cleanup();

      // Verificar que el directorio fue eliminado
      expect(await fs.pathExists(networkDir)).toBe(false);
    });
  });

  describe('Transfer Simulation', () => {
    it('should simulate transfer operations', async () => {
      // Crear archivo de cuentas temporal
      const accountsFile = path.join(tempDir, 'accounts.json');
      const addresses = CryptoUtils.generateDerivedAddresses(testMnemonic, 3);
      await CryptoUtils.saveAddressesToFile(addresses, accountsFile);

      // Simular operaciones de transferencia
      const transferConfig = {
        rpcUrl: 'http://localhost:8545',
        minerPrivateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        mnemonic: testMnemonic,
        accountsFile: accountsFile
      };

      // Verificar que la configuración es válida
      expect(transferConfig.rpcUrl).toBeDefined();
      expect(transferConfig.minerPrivateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(transferConfig.mnemonic).toBe(testMnemonic);
      expect(await fs.pathExists(transferConfig.accountsFile)).toBe(true);

      // Verificar que las direcciones se pueden cargar
      const loadedAddresses = await CryptoUtils.loadAddressesFromFile(accountsFile);
      expect(loadedAddresses).toEqual(addresses);
      expect(loadedAddresses).toHaveLength(3);
    });
  });
}); 
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileManager } from '../../services/FileManager';
import { FileSystemError } from '../../errors';

describe('FileManager E2E Tests', () => {
  let fileManager: FileManager;
  let tempDir: string;
  let testDir: string;

  beforeEach(async () => {
    fileManager = new FileManager();
    // Create unique temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filemanager-test-'));
    testDir = path.join(tempDir, 'test-workspace');
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('ensureDirectory', () => {
    test('creates new directory', async () => {
      const dirPath = path.join(testDir, 'new-dir');
      
      await fileManager.ensureDirectory(dirPath);
      
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('creates nested directories', async () => {
      const nestedPath = path.join(testDir, 'level1', 'level2', 'level3');
      
      await fileManager.ensureDirectory(nestedPath);
      
      const exists = await fs.access(nestedPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const stats = await fs.stat(nestedPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('does not error if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing-dir');
      
      // Create directory first
      await fs.mkdir(dirPath, { recursive: true });
      
      // Should not throw when called again
      await expect(fileManager.ensureDirectory(dirPath)).resolves.not.toThrow();
    });

    test('throws FileSystemError on permission issues', async () => {
      // Create a directory with restricted permissions (Unix-like systems)
      if (process.platform !== 'win32') {
        const restrictedDir = path.join(testDir, 'restricted');
        await fs.mkdir(restrictedDir, { mode: 0o444 }); // read-only
        
        const inaccessiblePath = path.join(restrictedDir, 'cannot-create');
        
        await expect(fileManager.ensureDirectory(inaccessiblePath))
          .rejects.toThrow(FileSystemError);
      }
    });
  });

  describe('writeFile', () => {
    test('writes content correctly', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      
      await fileManager.writeFile(filePath, content);
      
      const readContent = await fs.readFile(filePath, 'utf8');
      expect(readContent).toBe(content);
    });

    test('creates parent directories', async () => {
      const filePath = path.join(testDir, 'nested', 'deep', 'file.txt');
      const content = 'Nested content';
      
      await fileManager.writeFile(filePath, content);
      
      const readContent = await fs.readFile(filePath, 'utf8');
      expect(readContent).toBe(content);
      
      // Verify parent directories were created
      const parentExists = await fs.access(path.dirname(filePath)).then(() => true).catch(() => false);
      expect(parentExists).toBe(true);
    });

    test('overwrites existing file', async () => {
      const filePath = path.join(testDir, 'overwrite.txt');
      const originalContent = 'Original content';
      const newContent = 'New content';
      
      // Write original content
      await fileManager.writeFile(filePath, originalContent);
      
      // Overwrite with new content
      await fileManager.writeFile(filePath, newContent);
      
      const readContent = await fs.readFile(filePath, 'utf8');
      expect(readContent).toBe(newContent);
    });

    test('throws FileSystemError on invalid path', async () => {
      const invalidPath = path.join(testDir, '\0invalid', 'file.txt');
      
      await expect(fileManager.writeFile(invalidPath, 'content'))
        .rejects.toThrow(FileSystemError);
      
      await expect(fileManager.writeFile(invalidPath, 'content'))
        .rejects.toThrow('Path contains null bytes.');
    });
  });

  describe('writeJSON', () => {
    test('writes JSON with proper formatting', async () => {
      const filePath = path.join(testDir, 'data.json');
      const data = { name: 'test', value: 42, nested: { array: [1, 2, 3] } };
      
      await fileManager.writeJSON(filePath, data);
      
      const readContent = await fs.readFile(filePath, 'utf8');
      const expectedContent = JSON.stringify(data, null, 2);
      expect(readContent).toBe(expectedContent);
    });

    test('creates parent directories', async () => {
      const filePath = path.join(testDir, 'config', 'settings.json');
      const data = { setting: 'value' };
      
      await fileManager.writeJSON(filePath, data);
      
      const parsedData = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(parsedData).toEqual(data);
    });

    test('overwrites existing JSON file', async () => {
      const filePath = path.join(testDir, 'config.json');
      const originalData = { old: 'data' };
      const newData = { new: 'data', updated: true };
      
      await fileManager.writeJSON(filePath, originalData);
      await fileManager.writeJSON(filePath, newData);
      
      const parsedData = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(parsedData).toEqual(newData);
    });
  });

  describe('readFile', () => {
    test('reads content correctly', async () => {
      const filePath = path.join(testDir, 'read-test.txt');
      const content = 'Content to read';
      
      // Write file using fs directly
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');
      
      const readContent = await fileManager.readFile(filePath);
      expect(readContent).toBe(content);
    });

    test('throws FileSystemError if file not found', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      
      await expect(fileManager.readFile(nonExistentPath))
        .rejects.toThrow(FileSystemError);
    });

    test('throws FileSystemError on permission issues', async () => {
      if (process.platform !== 'win32') {
        const filePath = path.join(testDir, 'no-read.txt');
        
        // Create file and remove read permissions
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, 'content');
        await fs.chmod(filePath, 0o000); // no permissions
        
        await expect(fileManager.readFile(filePath))
          .rejects.toThrow(FileSystemError);
      }
    });
  });

  describe('readJSON', () => {
    test('reads and parses JSON correctly', async () => {
      const filePath = path.join(testDir, 'data.json');
      const data = { test: 'value', number: 123 };
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
      
      const readData = await fileManager.readJSON(filePath);
      expect(readData).toEqual(data);
    });

    test('throws FileSystemError on invalid JSON content', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      const invalidJson = '{ invalid json content';
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, invalidJson, 'utf8');
      
      await expect(fileManager.readJSON(filePath))
        .rejects.toThrow(FileSystemError);
    });

    test('throws FileSystemError if file not found', async () => {
      const nonExistentPath = path.join(testDir, 'missing.json');
      
      await expect(fileManager.readJSON(nonExistentPath))
        .rejects.toThrow(FileSystemError);
    });
  });

  describe('exists', () => {
    test('returns true for existing file', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'content');
      
      const exists = await fileManager.exists(filePath);
      expect(exists).toBe(true);
    });

    test('returns true for existing directory', async () => {
      const dirPath = path.join(testDir, 'exists-dir');
      
      await fs.mkdir(dirPath, { recursive: true });
      
      const exists = await fileManager.exists(dirPath);
      expect(exists).toBe(true);
    });

    test('returns false for non-existent path', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist');
      
      const exists = await fileManager.exists(nonExistentPath);
      expect(exists).toBe(false);
    });
  });

  describe('removeFile', () => {
    test('removes existing file', async () => {
      const filePath = path.join(testDir, 'to-remove.txt');
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'content');
      
      await fileManager.removeFile(filePath);
      
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    test('is idempotent (no error if file does not exist)', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      
      // Should not throw
      await expect(fileManager.removeFile(nonExistentPath))
        .resolves.not.toThrow();
    });

    test('throws FileSystemError on permission issues', async () => {
      if (process.platform !== 'win32') {
        const dirPath = path.join(testDir, 'protected');
        const filePath = path.join(dirPath, 'protected-file.txt');
        
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, 'content');
        await fs.chmod(dirPath, 0o444); // read-only directory
        
        await expect(fileManager.removeFile(filePath))
          .rejects.toThrow(FileSystemError);
      }
    });
  });

  describe('removeDirectory', () => {
    test('removes directory and all contents recursively', async () => {
      const dirPath = path.join(testDir, 'to-remove');
      const subDirPath = path.join(dirPath, 'subdir');
      const filePath = path.join(subDirPath, 'file.txt');
      
      await fs.mkdir(subDirPath, { recursive: true });
      await fs.writeFile(filePath, 'content');
      
      await fileManager.removeDirectory(dirPath);
      
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    test('is idempotent (no error if directory does not exist)', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist');
      
      // Should not throw
      await expect(fileManager.removeDirectory(nonExistentPath))
        .resolves.not.toThrow();
    });
  });

  describe('copyFile', () => {
    test('copies file correctly', async () => {
      const sourcePath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'copy', 'destination.txt');
      const content = 'Content to copy';
      
      await fs.mkdir(path.dirname(sourcePath), { recursive: true });
      await fs.writeFile(sourcePath, content);
      
      await fileManager.copyFile(sourcePath, destPath);
      
      const copiedContent = await fs.readFile(destPath, 'utf8');
      expect(copiedContent).toBe(content);
    });

    test('creates destination directory', async () => {
      const sourcePath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'deep', 'nested', 'destination.txt');
      const content = 'Content';
      
      await fs.mkdir(path.dirname(sourcePath), { recursive: true });
      await fs.writeFile(sourcePath, content);
      
      await fileManager.copyFile(sourcePath, destPath);
      
      const destDirExists = await fs.access(path.dirname(destPath)).then(() => true).catch(() => false);
      expect(destDirExists).toBe(true);
    });

    test('throws FileSystemError on source file not found', async () => {
      const sourcePath = path.join(testDir, 'missing-source.txt');
      const destPath = path.join(testDir, 'destination.txt');
      
      await expect(fileManager.copyFile(sourcePath, destPath))
        .rejects.toThrow(FileSystemError);
    });

    test('throws FileSystemError on destination errors', async () => {
      const sourcePath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, '\0invalid', 'destination.txt');
      
      await fs.mkdir(path.dirname(sourcePath), { recursive: true });
      await fs.writeFile(sourcePath, 'content');
      
      await expect(fileManager.copyFile(sourcePath, destPath))
        .rejects.toThrow(FileSystemError);
    });
  });

  describe('listFiles', () => {
    test('lists files correctly without recursion', async () => {
      const dirPath = path.join(testDir, 'list-test');
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'file1.txt'), 'content');
      await fs.writeFile(path.join(dirPath, 'file2.txt'), 'content');
      await fs.mkdir(path.join(dirPath, 'subdir'));
      await fs.writeFile(path.join(dirPath, 'subdir', 'file3.txt'), 'content');
      
      const files = await fileManager.listFiles(dirPath, false);
      
      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('file1.txt'))).toBe(true);
      expect(files.some(f => f.endsWith('file2.txt'))).toBe(true);
      expect(files.some(f => f.endsWith('file3.txt'))).toBe(false); // Should not include subdirectory files
    });

    test('handles recursion correctly', async () => {
      const dirPath = path.join(testDir, 'recursive-test');
      
      await fs.mkdir(path.join(dirPath, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(dirPath, 'file1.txt'), 'content');
      await fs.writeFile(path.join(dirPath, 'subdir', 'file2.txt'), 'content');
      
      const files = await fileManager.listFiles(dirPath, true);
      
      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('file1.txt'))).toBe(true);
      expect(files.some(f => f.endsWith('file2.txt'))).toBe(true);
    });

    test('throws FileSystemError on invalid directory', async () => {
      const invalidPath = path.join(testDir, 'does-not-exist');
      
      await expect(fileManager.listFiles(invalidPath))
        .rejects.toThrow(FileSystemError);
    });
  });

  describe('listDirectories', () => {
    test('lists directories correctly', async () => {
      const dirPath = path.join(testDir, 'dir-list-test');
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.mkdir(path.join(dirPath, 'dir1'));
      await fs.mkdir(path.join(dirPath, 'dir2'));
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content'); // Should be ignored
      
      const directories = await fileManager.listDirectories(dirPath);
      
      expect(directories).toHaveLength(2);
      expect(directories).toContain('dir1');
      expect(directories).toContain('dir2');
      expect(directories).not.toContain('file.txt');
    });

    test('throws FileSystemError on invalid directory', async () => {
      const invalidPath = path.join(testDir, 'does-not-exist');
      
      await expect(fileManager.listDirectories(invalidPath))
        .rejects.toThrow(FileSystemError);
    });
  });

  describe('createNetworkStructure', () => {
    test('creates standard directory layout', async () => {
      const networkPath = path.join(testDir, 'test-network');
      const nodeNames = ['validator1', 'rpc1', 'member1'];
      
      await fileManager.createNetworkStructure(networkPath, nodeNames);
      
      // Check main network directory
      const networkExists = await fs.access(networkPath).then(() => true).catch(() => false);
      expect(networkExists).toBe(true);
      
      // Check nodes directory
      const nodesPath = path.join(networkPath, 'nodes');
      const nodesExists = await fs.access(nodesPath).then(() => true).catch(() => false);
      expect(nodesExists).toBe(true);
      
      // Check individual node directories
      for (const nodeName of nodeNames) {
        const nodePath = path.join(nodesPath, nodeName);
        const nodeExists = await fs.access(nodePath).then(() => true).catch(() => false);
        expect(nodeExists).toBe(true);
      }
    });

    test('works with empty node list', async () => {
      const networkPath = path.join(testDir, 'empty-network');
      
      await fileManager.createNetworkStructure(networkPath, []);
      
      const networkExists = await fs.access(networkPath).then(() => true).catch(() => false);
      expect(networkExists).toBe(true);
      
      const nodesPath = path.join(networkPath, 'nodes');
      const nodesExists = await fs.access(nodesPath).then(() => true).catch(() => false);
      expect(nodesExists).toBe(true);
    });
  });

  describe('writeNodeKeys', () => {
    test('writes key, key.pub, and address files correctly', async () => {
      const nodePath = path.join(testDir, 'test-node');
      const privateKey = '0x123abc';
      const publicKey = '0x456def';
      const address = '0x789ghi';
      
      await fs.mkdir(nodePath, { recursive: true });
      
      await fileManager.writeNodeKeys(nodePath, privateKey, publicKey, address);
      
      // Check key file (should strip 0x prefix)
      const keyContent = await fs.readFile(path.join(nodePath, 'key'), 'utf8');
      expect(keyContent).toBe('123abc');
      
      // Check key.pub file (should strip 0x prefix)
      const pubKeyContent = await fs.readFile(path.join(nodePath, 'key.pub'), 'utf8');
      expect(pubKeyContent).toBe('456def');
      
      // Check address file (should strip 0x prefix)
      const addressContent = await fs.readFile(path.join(nodePath, 'address'), 'utf8');
      expect(addressContent).toBe('789ghi');
    });

    test('strips 0x prefix correctly', async () => {
      const nodePath = path.join(testDir, 'prefix-test-node');
      const privateKey = '0xabcdef123456';
      const publicKey = '0x987654fedcba';
      const address = '0x1234567890ab';
      
      await fs.mkdir(nodePath, { recursive: true });
      
      await fileManager.writeNodeKeys(nodePath, privateKey, publicKey, address);
      
      const keyContent = await fs.readFile(path.join(nodePath, 'key'), 'utf8');
      expect(keyContent).toBe('abcdef123456');
      expect(keyContent).not.toContain('0x');
    });

    test('handles keys without 0x prefix', async () => {
      const nodePath = path.join(testDir, 'no-prefix-node');
      const privateKey = 'abcdef123456';
      const publicKey = '987654fedcba';
      const address = '1234567890ab';
      
      await fs.mkdir(nodePath, { recursive: true });
      
      await fileManager.writeNodeKeys(nodePath, privateKey, publicKey, address);
      
      const keyContent = await fs.readFile(path.join(nodePath, 'key'), 'utf8');
      expect(keyContent).toBe('abcdef123456');
    });
  });

  describe('ensureBaseDataDirectory', () => {
    test('creates base directory if not exists', async () => {
      const baseDir = path.join(testDir, 'base-data');
      
      const result = await fileManager.ensureBaseDataDirectory(baseDir);
      
      expect(result).toBe(path.resolve(baseDir));
      
      const exists = await fs.access(baseDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('returns absolute path', async () => {
      const baseDir = path.join(testDir, 'relative-base');
      
      const result = await fileManager.ensureBaseDataDirectory(baseDir);
      
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe(path.resolve(baseDir));
    });

    test('uses default directory when no parameter provided', async () => {
      // We'll test this without actually creating in the default location
      // to avoid polluting the actual file system
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        const result = await fileManager.ensureBaseDataDirectory();
        expect(result).toBe(path.resolve('./besu-networks'));
        
        const exists = await fs.access(path.resolve('./besu-networks')).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
}); 
import fs from 'fs/promises';
import path from 'path';
import { generateKeys, createKeysAndEnode, validateArgs, writeFiles } from '../createKeys';

describe('createKeys.ts', () => {
  it('generateKeys should return valid keys and address', () => {
    const keys = generateKeys();
    expect(keys.privateKey).toMatch(/[0-9a-f]{64}/i);
    expect(keys.publicKey).toMatch(/[0-9a-f]{130}/i);
    expect(keys.address).toMatch(/[0-9a-f]{40}/i);
  });

  it('createKeysAndEnode should return keys and enode', () => {
    const result = createKeysAndEnode('127.0.0.1', '30303');
    expect(result.enode).toContain('@127.0.0.1:30303');
    expect(result.privateKey).toBeDefined();
    expect(result.publicKey).toBeDefined();
    expect(result.address).toBeDefined();
  });

  it('validateArgs should parse enode args', () => {
    const args = ['createKeysAndEnode', '127.0.0.1', '30303', '/tmp'];
    const result = validateArgs(args, 'createKeysAndEnode') as { enodeIP: string; enodePort: string; directory: string };
    expect(result.enodeIP).toBe('127.0.0.1');
    expect(result.enodePort).toBe('30303');
    expect(result.directory).toBe('/tmp');
  });

  it('validateArgs should parse keys args', () => {
    const args = ['createKeys', '/tmp'];
    const result = validateArgs(args, 'createKeys');
    // Type guard for directory
    if ('directory' in result) {
      expect(result.directory).toBe('/tmp');
    } else {
      throw new Error('Expected directory property');
    }
  });

  it('writeFiles should write files to disk', async () => {
    const tmpDir = path.join(__dirname, 'tmp');
    await writeFiles(tmpDir, { 'test.txt': 'hello' });
    const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf8');
    expect(content).toBe('hello');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});

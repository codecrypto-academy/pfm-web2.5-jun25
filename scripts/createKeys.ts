import pkg from 'elliptic';
const { ec: EC } = pkg;
import keccak256 from 'keccak256';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

// TypeScript interfaces for better type safety
interface CryptoKeys {
  privateKey: string;
  publicKey: string;
  address: string;
}

interface KeysWithEnode extends CryptoKeys {
  enode: string;
}

interface ValidatedArgsEnode {
  enodeIP: string;
  enodePort: string;
  directory: string;
}

interface ValidatedArgsKeys {
  directory: string;
}

type ValidatedArgs = ValidatedArgsEnode | ValidatedArgsKeys;
type Command = 'createKeysAndEnode' | 'createKeys';
type FileMap = Record<string, string>;

// Create EC instance once and reuse (optimization)
const ec = new EC('secp256k1');

/**
 * Generates cryptographic keys and address using modern arrow function
 */
const generateKeys = (): CryptoKeys => {
  // Generate key pair using secp256k1 (used by Ethereum and Besu)
  const keyPair = ec.genKeyPair();
  
  // Get private and public keys in hex format using destructuring approach
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex');

  // Generate Ethereum address from public key
  // Remove '04' prefix from uncompressed public key, hash with Keccak256, take last 20 bytes
  const publicKeyWithoutPrefix = publicKey.slice(2);
  const publicKeyBuffer = keccak256(Buffer.from(publicKeyWithoutPrefix, 'hex'));
  const address = publicKeyBuffer.toString('hex').slice(-40);

  return {
    privateKey,
    publicKey,
    address,
  };
};

/**
 * Creates keys and enode URL using arrow function and template literals
 */
const createKeysAndEnode = (ip: string, port: string): KeysWithEnode => {
  const keys = generateKeys();
  
  // Build enode URL using template literal (remove '04' prefix from public key)
  const enode = `enode://${keys.publicKey.slice(2)}@${ip}:${port}`;

  return {
    ...keys, // Spread operator for elegant object composition
    enode,
  };
};

/**
 * Creates basic cryptographic keys using arrow function
 */
const createKeys = (): CryptoKeys => generateKeys();

/**
 * Validates command line arguments with modern switch pattern and destructuring
 */
const validateArgs = (args: string[], command: Command): ValidatedArgs => {
  // Modern object with methods approach
  const validators = {
    createKeysAndEnode: (): ValidatedArgsEnode => {
      const [enodeIP, enodePort, directory] = args.slice(1); // Array destructuring
      
      if (!enodeIP) throw new Error('IP is required for creating the enode');
      if (!enodePort) throw new Error('Port is required for creating the enode');
      if (!directory) throw new Error('Directory is required for saving the keys and enode');
      
      return { enodeIP, enodePort, directory };
    },
    
    createKeys: (): ValidatedArgsKeys => {
      const [directory] = args.slice(1); // Array destructuring
      if (!directory) throw new Error('Directory is required for saving the keys');
      
      return { directory };
    }
  };

  return validators[command]();
};

/**
 * Writes files asynchronously using modern async/await and Promise.all
 */
const writeFiles = async (directory: string, files: FileMap): Promise<void> => {
  try {
    // Ensure directory exists using modern async approach
    await fs.mkdir(directory, { recursive: true });
    
    // Write all files concurrently using Promise.all and modern map with arrow functions
    const writePromises = Object.entries(files).map(([filename, content]) =>
      fs.writeFile(join(directory, filename), content, 'utf8')
    );
    
    await Promise.all(writePromises);
  } catch (error) {
    // Modern error handling with type guards
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to write files: ${message}`);
  }
};

/**
 * Displays usage information using modern template literals and arrow function
 */
const showUsage = (): void => {
  // Multi-line template literal with proper formatting
  const usage = `
🔑 Ethereum Key Generator

Usage:
  yarn dev createKeysAndEnode <enodeIP> <enodePort> <directory>
  yarn dev createKeys <directory>

Production:
  yarn build
  node dist/network/createKeys.js createKeysAndEnode <enodeIP> <enodePort> <directory>
  node dist/network/createKeys.js createKeys <directory>

Examples:
  yarn dev createKeysAndEnode 192.168.1.100 42007 ./keys
  yarn dev createKeys ./keys
  
  yarn createKeysAndEnode 10.0.0.1 42007 ./network-keys
  yarn createKeys ./my-keys
  `;
  
  console.log(usage);
};

/**
 * Command handlers using modern object literal with async arrow functions
 */
const commandHandlers = {
  createKeysAndEnode: async (args: string[]): Promise<void> => {
    const { enodeIP, enodePort, directory } = validateArgs(args, 'createKeysAndEnode') as ValidatedArgsEnode;
    const keys = createKeysAndEnode(enodeIP, enodePort);
    
    await writeFiles(directory, {
      key: keys.privateKey,
      pub: keys.publicKey,
      address: keys.address,
      enode: keys.enode
    });
    
    console.log('✅ Keys and enode created successfully');
    console.log(`📁 Files saved to: ${resolve(directory)}`);
    console.log(`🌐 Enode: ${keys.enode}`);
  },
  
  createKeys: async (args: string[]): Promise<void> => {
    const { directory } = validateArgs(args, 'createKeys') as ValidatedArgsKeys;
    const keys = createKeys();
    
    await writeFiles(directory, {
      key: keys.privateKey,
      pub: keys.publicKey,
      address: keys.address
    });
    
    console.log('✅ Keys created successfully');
    console.log(`📁 Files saved to: ${resolve(directory)}`);
    console.log(`💎 Address: 0x${keys.address}`);
  }
};

/**
 * Main function using modern async/await, optional chaining, and enhanced error handling
 */
const main = async (): Promise<void> => {
  try {
    const args = process.argv.slice(2);
    const command = args[0] as Command;

    // Early return pattern instead of nested conditions
    if (!command) {
      showUsage();
      process.exit(0);
    }

    // Modern object method lookup with optional chaining concept
    const handler = commandHandlers[command];
    
    if (!handler) {
      console.error(`❌ Unknown command: ${command}`);
      showUsage();
      process.exit(1);
    }

    // Execute handler with modern await
    await handler(args);
    
  } catch (error) {
    // Enhanced error handling with proper type checking
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Error: ${message}`);
    process.exit(1);
  }
};

// Modern self-executing async function with proper error handling
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
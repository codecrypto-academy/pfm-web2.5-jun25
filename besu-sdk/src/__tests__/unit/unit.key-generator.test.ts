import { ethers } from 'ethers';
import {
  generateNodeIdentity,
  generateMultipleIdentities,
  generateDeterministicIdentity,
  deriveAddressFromPrivateKey,
  validateNodeIdentity,
  formatPrivateKeyForBesu,
  addressFromEnode
} from '../../utils/key-generator';
import { logger } from '../../utils/logger';
import { NodeIdentity } from '../../types';
import {
  KeyGenerationError,
  InvalidPrivateKeyError,
  InvalidNodeIdentityError,
  InvalidEnodeUrlError,
  ConfigurationValidationError
} from '../../errors';

// Mock logger to control and verify warning calls
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Key Generator Utilities - E2E Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('generateNodeIdentity()', () => {
    it('should return valid NodeIdentity with correct formats and 0x prefixes', async () => {
      const identity = await generateNodeIdentity();

      // Verify structure
      expect(identity).toHaveProperty('address');
      expect(identity).toHaveProperty('publicKey');
      expect(identity).toHaveProperty('privateKey');

      // Verify formats
      expect(identity.address).toMatch(/^0x[0-9a-f]{40}$/);
      expect(identity.publicKey).toMatch(/^0x[0-9a-f]{130}$/);
      expect(identity.privateKey).toMatch(/^0x[0-9a-f]{64}$/);

      // Verify address is lowercase
      expect(identity.address).toBe(identity.address.toLowerCase());

      // Verify cryptographic consistency using ethers.js
      const wallet = new ethers.Wallet(identity.privateKey);
      expect(wallet.address.toLowerCase()).toBe(identity.address);
      expect(wallet.signingKey.publicKey).toBe(identity.publicKey);
    });

    it('should generate unique identities on multiple calls', async () => {
      const identity1 = await generateNodeIdentity();
      const identity2 = await generateNodeIdentity();

      // All components should be different
      expect(identity1.address).not.toBe(identity2.address);
      expect(identity1.publicKey).not.toBe(identity2.publicKey);
      expect(identity1.privateKey).not.toBe(identity2.privateKey);
    });

    it('should verify cryptographic consistency with ethers.js', async () => {
      const identity = await generateNodeIdentity();

      // Verify address derivation
      const derivedAddress = ethers.computeAddress(identity.publicKey);
      expect(derivedAddress.toLowerCase()).toBe(identity.address);

      // Verify key pair consistency
      const wallet = new ethers.Wallet(identity.privateKey);
      expect(wallet.signingKey.publicKey).toBe(identity.publicKey);
      expect(wallet.address.toLowerCase()).toBe(identity.address);
    });
  });

  describe('generateMultipleIdentities(count)', () => {
    it('should generate correct number of unique identities', async () => {
      const count = 5;
      const identities = await generateMultipleIdentities(count);

      expect(identities).toHaveLength(count);

      // Verify all identities are unique
      const addresses = identities.map(id => id.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(count);

      const privateKeys = identities.map(id => id.privateKey);
      const uniquePrivateKeys = new Set(privateKeys);
      expect(uniquePrivateKeys.size).toBe(count);
    });

    it('should generate valid identities in batch', async () => {
      const identities = await generateMultipleIdentities(3);

      identities.forEach(identity => {
        expect(identity.address).toMatch(/^0x[0-9a-f]{40}$/);
        expect(identity.publicKey).toMatch(/^0x[0-9a-f]{130}$/);
        expect(identity.privateKey).toMatch(/^0x[0-9a-f]{64}$/);

        // Verify cryptographic consistency
        const wallet = new ethers.Wallet(identity.privateKey);
        expect(wallet.address.toLowerCase()).toBe(identity.address);
      });
    });

    it('should throw ConfigurationValidationError for invalid count (0)', async () => {
      await expect(generateMultipleIdentities(0))
        .rejects
        .toThrow(ConfigurationValidationError);
    });

    it('should throw ConfigurationValidationError for negative count', async () => {
      await expect(generateMultipleIdentities(-1))
        .rejects
        .toThrow(ConfigurationValidationError);
    });

    it('should throw ConfigurationValidationError for float count', async () => {
      await expect(generateMultipleIdentities(2.5))
        .rejects
        .toThrow(ConfigurationValidationError);
    });
  });

  describe('generateDeterministicIdentity(seed)', () => {
    it('should produce identical output for same seed', async () => {
      const seed = 'test-seed-123';
      
      const identity1 = await generateDeterministicIdentity(seed);
      const identity2 = await generateDeterministicIdentity(seed);

      expect(identity1.address).toBe(identity2.address);
      expect(identity1.publicKey).toBe(identity2.publicKey);
      expect(identity1.privateKey).toBe(identity2.privateKey);
    });

    it('should produce different output for different seeds', async () => {
      const identity1 = await generateDeterministicIdentity('seed1');
      const identity2 = await generateDeterministicIdentity('seed2');

      expect(identity1.address).not.toBe(identity2.address);
      expect(identity1.publicKey).not.toBe(identity2.publicKey);
      expect(identity1.privateKey).not.toBe(identity2.privateKey);
    });

    it('should call logger.warn about production use', async () => {
      await generateDeterministicIdentity('test-seed');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Generating deterministic identity - DO NOT use in production!'
      );
    });

    it('should generate valid identity with correct formats', async () => {
      const identity = await generateDeterministicIdentity('test-seed');

      expect(identity.address).toMatch(/^0x[0-9a-f]{40}$/);
      expect(identity.publicKey).toMatch(/^0x[0-9a-f]{130}$/);
      expect(identity.privateKey).toMatch(/^0x[0-9a-f]{64}$/);

      // Verify cryptographic consistency
      const wallet = new ethers.Wallet(identity.privateKey);
      expect(wallet.address.toLowerCase()).toBe(identity.address);
      expect(wallet.signingKey.publicKey).toBe(identity.publicKey);
    });
  });

  describe('deriveAddressFromPrivateKey()', () => {
    it('should correctly derive address from private key with 0x prefix', () => {
      const wallet = ethers.Wallet.createRandom();
      const expectedAddress = wallet.address.toLowerCase();
      
      const derivedAddress = deriveAddressFromPrivateKey(wallet.privateKey);
      
      expect(derivedAddress).toBe(expectedAddress);
    });

    it('should correctly derive address from private key without 0x prefix', () => {
      const wallet = ethers.Wallet.createRandom();
      const privateKeyWithoutPrefix = wallet.privateKey.slice(2);
      const expectedAddress = wallet.address.toLowerCase();
      
      const derivedAddress = deriveAddressFromPrivateKey(privateKeyWithoutPrefix);
      
      expect(derivedAddress).toBe(expectedAddress);
    });

    it('should throw InvalidPrivateKeyError for invalid length', () => {
      const invalidKey = '0x123'; // Too short
      
      expect(() => deriveAddressFromPrivateKey(invalidKey))
        .toThrow(InvalidPrivateKeyError);
    });

    it('should throw InvalidPrivateKeyError for invalid hex characters', () => {
      const invalidKey = '0x' + 'g'.repeat(64); // Invalid hex
      
      expect(() => deriveAddressFromPrivateKey(invalidKey))
        .toThrow(InvalidPrivateKeyError);
    });

    it('should throw InvalidPrivateKeyError for empty string', () => {
      expect(() => deriveAddressFromPrivateKey(''))
        .toThrow(InvalidPrivateKeyError);
    });
  });

  describe('validateNodeIdentity()', () => {
    it('should return true for valid identity', () => {
      const wallet = ethers.Wallet.createRandom();
      const identity: NodeIdentity = {
        address: wallet.address.toLowerCase(),
        publicKey: wallet.signingKey.publicKey,
        privateKey: wallet.privateKey
      };

      const result = validateNodeIdentity(identity);
      expect(result).toBe(true);
    });

    it('should throw InvalidNodeIdentityError for invalid address format', () => {
      const wallet = ethers.Wallet.createRandom();
      const identity: NodeIdentity = {
        address: 'invalid-address',
        publicKey: wallet.signingKey.publicKey,
        privateKey: wallet.privateKey
      };

      expect(() => validateNodeIdentity(identity))
        .toThrow(InvalidNodeIdentityError);
    });

    it('should throw InvalidNodeIdentityError when private key does not match address', () => {
      const wallet1 = ethers.Wallet.createRandom();
      const wallet2 = ethers.Wallet.createRandom();
      
      const identity: NodeIdentity = {
        address: wallet1.address.toLowerCase(),
        publicKey: wallet1.signingKey.publicKey,
        privateKey: wallet2.privateKey // Wrong private key
      };

      expect(() => validateNodeIdentity(identity))
        .toThrow(InvalidNodeIdentityError);
    });

    it('should throw InvalidNodeIdentityError when public key does not match private key', () => {
      const wallet1 = ethers.Wallet.createRandom();
      const wallet2 = ethers.Wallet.createRandom();
      
      const identity: NodeIdentity = {
        address: wallet1.address.toLowerCase(),
        publicKey: wallet2.signingKey.publicKey, // Wrong public key
        privateKey: wallet1.privateKey
      };

      expect(() => validateNodeIdentity(identity))
        .toThrow(InvalidNodeIdentityError);
    });


  });

  describe('formatPrivateKeyForBesu()', () => {
    it('should correctly strip 0x prefix', () => {
      const privateKeyWithPrefix = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const expected = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const result = formatPrivateKeyForBesu(privateKeyWithPrefix);
      expect(result).toBe(expected);
    });

    it('should return unchanged string when no 0x prefix', () => {
      const privateKeyWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const result = formatPrivateKeyForBesu(privateKeyWithoutPrefix);
      expect(result).toBe(privateKeyWithoutPrefix);
    });

    it('should handle empty string', () => {
      const result = formatPrivateKeyForBesu('');
      expect(result).toBe('');
    });

    it('should handle string with only 0x', () => {
      const result = formatPrivateKeyForBesu('0x');
      expect(result).toBe('');
    });
  });

  describe('addressFromEnode()', () => {


    it('should throw InvalidEnodeUrlError for invalid format (missing enode://)', () => {
      const invalidUrl = 'http://1234567890abcdef@192.168.1.100:30303';
      
      expect(() => addressFromEnode(invalidUrl))
        .toThrow(InvalidEnodeUrlError);
    });

    it('should throw InvalidEnodeUrlError for invalid format (missing @ symbol)', () => {
      const publicKeyHex = 'a'.repeat(128);
      const invalidUrl = `enode://${publicKeyHex}192.168.1.100:30303`;
      
      expect(() => addressFromEnode(invalidUrl))
        .toThrow(InvalidEnodeUrlError);
    });

    it('should throw InvalidEnodeUrlError for invalid public key length', () => {
      const shortPublicKey = 'a'.repeat(64); // Too short
      const invalidUrl = `enode://${shortPublicKey}@192.168.1.100:30303`;
      
      expect(() => addressFromEnode(invalidUrl))
        .toThrow(InvalidEnodeUrlError);
    });

    it('should throw InvalidEnodeUrlError for invalid hex characters in public key', () => {
      const invalidPublicKey = 'g'.repeat(128); // Invalid hex
      const invalidUrl = `enode://${invalidPublicKey}@192.168.1.100:30303`;
      
      expect(() => addressFromEnode(invalidUrl))
        .toThrow(InvalidEnodeUrlError);
    });

    it('should throw InvalidEnodeUrlError for completely malformed URL', () => {
      const invalidUrl = 'not-an-enode-url';
      
      expect(() => addressFromEnode(invalidUrl))
        .toThrow(InvalidEnodeUrlError);
    });


  });

  describe('Integration Tests', () => {
    it('should create valid identity that passes all validation functions', async () => {
      const identity = await generateNodeIdentity();
      
      // Should pass validation
      expect(validateNodeIdentity(identity)).toBe(true);
      
      // Should correctly derive address from private key
      const derivedAddress = deriveAddressFromPrivateKey(identity.privateKey);
      expect(derivedAddress).toBe(identity.address);
      
      // Should format private key correctly for Besu
      const formattedKey = formatPrivateKeyForBesu(identity.privateKey);
      expect(formattedKey).toBe(identity.privateKey.slice(2));
    });

    it('should handle complete workflow with deterministic identity', async () => {
      const seed = 'integration-test-seed';
      
      // Generate deterministic identity
      const identity = await generateDeterministicIdentity(seed);
      
      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalled();
      
      // Should pass all validations
      expect(validateNodeIdentity(identity)).toBe(true);
      
      // Should be reproducible
      const identity2 = await generateDeterministicIdentity(seed);
      expect(identity2.address).toBe(identity.address);
      
      // Should work with all utility functions
      const derivedAddress = deriveAddressFromPrivateKey(identity.privateKey);
      expect(derivedAddress).toBe(identity.address);
      
      const formattedKey = formatPrivateKeyForBesu(identity.privateKey);
      expect(formattedKey).toBe(identity.privateKey.slice(2));
    });
  });
});
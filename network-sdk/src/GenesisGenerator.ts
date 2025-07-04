/**
 * Genesis file generator - keeps the working logic from web2.5-besu
 */
export interface GenesisConfig {
  chainId: number;
  validators: string[]; // List of validator addresses
}

export class GenesisGenerator {
  
  /**
   * Generate a simple genesis file based on working example
   */
  static generateGenesis(config: GenesisConfig): any {
    // Build extraData with validators
    let extraData = '0x' + '0'.repeat(64); // 32 bytes of zeros
    
    // Add validator addresses (remove 0x prefix)
    for (const validator of config.validators) {
      extraData += validator.startsWith('0x') ? validator.slice(2) : validator;
    }
    
    // Add 65 bytes of zeros for the seal
    extraData += '0'.repeat(130);
    
    const genesis = {
      config: {
        chainId: config.chainId,
        berlinBlock: 0,
        clique: {
          blockperiodseconds: 4,
          epochlength: 30000
        }
      },
      coinbase: '0x0000000000000000000000000000000000000000',
      difficulty: '0x1',
      extraData,
      gasLimit: '0xa00000',
      mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      nonce: '0x0',
      timestamp: '0x5c51a607',
      alloc: {
        // Add some pre-funded accounts for testing
        '0xaeeB85e5b9aD65E72F9924E68a164B85110d3df8': {
          balance: '0x200000000000000000000000000000000000000000000000000000000000000'
        }
      }
    };
    
    return genesis;
  }
}

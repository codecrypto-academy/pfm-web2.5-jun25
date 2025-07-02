import { BesuNetworkConfig, NodeCredentials } from './types.js';

/**
 * Generator for Besu genesis blocks with Clique consensus
 */
export class GenesisGenerator {
  
  /**
   * Generate genesis block configuration for Clique consensus
   */
  generateGenesis(config: BesuNetworkConfig, validators: NodeCredentials[] = []): any {
    const { chainId, genesis } = config;
    
    // Extract validator addresses for Clique consensus
    const validatorAddresses = validators.map(v => v.address.toLowerCase().replace('0x', ''));
    
    // Create the initial signers string for Clique
    // Format: concatenated addresses without 0x prefix + 65 zero bytes
    const initialSigners = validatorAddresses.join('') + '0'.repeat(130);
    
    const genesisBlock = {
      config: {
        chainId: chainId,
        homesteadBlock: 0,
        eip150Block: 0,
        eip155Block: 0,
        eip158Block: 0,
        byzantiumBlock: 0,
        constantinopleBlock: 0,
        petersburgBlock: 0,
        istanbulBlock: 0,
        berlinBlock: 0,
        londonBlock: 0,
        clique: {
          period: 5, // 5 second block time
          epoch: 30000 // Epoch length
        },
        ...genesis?.extraConfig
      },
      difficulty: genesis?.difficulty || '0x1',
      gasLimit: genesis?.gasLimit || '0x1fffffffffffff',
      extraData: `0x${'0'.repeat(64)}${initialSigners}`,
      alloc: this.generateInitialAllocations(validators)
    };
    
    return genesisBlock;
  }
  
  /**
   * Generate initial ETH allocations for validator accounts
   */
  private generateInitialAllocations(validators: NodeCredentials[]): Record<string, any> {
    const allocations: Record<string, any> = {};
    
    // Give each validator some initial ETH
    validators.forEach(validator => {
      const address = validator.address.toLowerCase().replace('0x', '');
      allocations[address] = {
        balance: '0x21e19e0c9bab2400000' // 10000 ETH in wei
      };
    });
    
    return allocations;
  }
  
  /**
   * Add a validator to existing genesis configuration
   */
  addValidatorToGenesis(genesis: any, validator: NodeCredentials): any {
    const address = validator.address.toLowerCase().replace('0x', '');
    
    // Add to allocations
    if (!genesis.alloc) {
      genesis.alloc = {};
    }
    genesis.alloc[address] = {
      balance: '0x21e19e0c9bab2400000' // 10000 ETH in wei
    };
    
    // Update extraData with new validator
    const currentExtraData = genesis.extraData || '0x' + '0'.repeat(64);
    const prefix = currentExtraData.slice(0, 66); // 0x + 64 chars
    const currentValidators = currentExtraData.slice(66, -130); // Remove prefix and suffix
    const suffix = currentExtraData.slice(-130); // Last 130 chars (65 zero bytes)
    
    const newValidators = currentValidators + address;
    genesis.extraData = prefix + newValidators + suffix;
    
    return genesis;
  }
}

import { GenesisGenerator } from '../src/GenesisGenerator';

describe('GenesisGenerator', () => {
  it('should be defined', () => {
    expect(GenesisGenerator).toBeDefined();
  });

  it('should generate a genesis object with expected properties', () => {
    const config = { chainId: 123, validators: ['0xabc123'] };
    const genesis = GenesisGenerator.generateGenesis(config);
    expect(genesis).toHaveProperty('config');
    expect(genesis).toHaveProperty('extraData');
    expect(genesis.config.chainId).toBe(123);
    expect(typeof genesis.extraData).toBe('string');
  });

  it('should include validator addresses in extraData', () => {
    const validator = '0xabc123';
    const config = { chainId: 1, validators: [validator] };
    const genesis = GenesisGenerator.generateGenesis(config);
    expect(genesis.extraData.includes(validator.replace('0x', ''))).toBe(true);
  });
});

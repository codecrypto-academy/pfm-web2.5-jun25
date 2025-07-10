import { NetworkStorage } from '../lib/storage';

describe('NetworkStorage', () => {
  it('should have static saveNetwork method', () => {
    expect(typeof NetworkStorage.saveNetwork).toBe('function');
  });
  it('should have static loadNetwork method', () => {
    expect(typeof NetworkStorage.loadNetwork).toBe('function');
  });
});

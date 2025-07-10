import { DatabaseStorage } from '../lib/databaseStorage';

describe('DatabaseStorage', () => {
  it('should have static saveNetwork method', () => {
    expect(typeof DatabaseStorage.saveNetwork).toBe('function');
  });
});

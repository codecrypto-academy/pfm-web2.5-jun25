import * as utils from '../lib/networkUtils';

describe('networkUtils', () => {
  it('should export parseSubnet', () => {
    expect(typeof utils.parseSubnet).toBe('function');
  });
  it('should export generateNodeIPs', () => {
    expect(typeof utils.generateNodeIPs).toBe('function');
  });
});

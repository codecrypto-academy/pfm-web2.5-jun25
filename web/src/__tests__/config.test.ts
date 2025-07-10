import { NETWORK_DEFAULTS, PORT_DEFAULTS } from '../lib/config';

describe('config', () => {
  it('NETWORK_DEFAULTS should be defined', () => {
    expect(NETWORK_DEFAULTS).toBeDefined();
  });
  it('PORT_DEFAULTS should be defined', () => {
    expect(PORT_DEFAULTS).toBeDefined();
  });
});

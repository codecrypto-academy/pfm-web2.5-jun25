import * as db from '../lib/database';

describe('database', () => {
  it('should export initDatabase', () => {
    expect(typeof db.initDatabase).toBe('function');
  });
  it('should export getPool', () => {
    expect(typeof db.getPool).toBe('function');
  });
  it('should export query', () => {
    expect(typeof db.query).toBe('function');
  });
  it('should export transaction', () => {
    expect(typeof db.transaction).toBe('function');
  });
  it('should export getClient', () => {
    expect(typeof db.getClient).toBe('function');
  });
  it('should export testConnection', () => {
    expect(typeof db.testConnection).toBe('function');
  });
  it('should export closeDatabase', () => {
    expect(typeof db.closeDatabase).toBe('function');
  });
  it('should export getDatabaseStats', () => {
    expect(typeof db.getDatabaseStats).toBe('function');
  });
  it('should export healthCheck', () => {
    expect(typeof db.healthCheck).toBe('function');
  });
});

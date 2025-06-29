import { TransactionService } from '../../src/services/TransactionService';
import { Logger } from '../../src/utils/Logger';

describe('TransactionService', () => {
  let logger: Logger;
  beforeEach(() => {
    logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() } as any;
  });

  it('should be defined', () => {
    expect(TransactionService).toBeDefined();
  });

  it('should get block number', async () => {
    const provider = { getBlockNumber: jest.fn().mockResolvedValue(42) };
    const svc = new TransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    const num = await svc.getBlockNumber();
    expect(num).toBe(42);
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should get balance', async () => {
    const provider = { getBalance: jest.fn().mockResolvedValue(1000) };
    const svc = new TransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    const bal = await svc.getBalance('0xabc');
    expect(bal).toBe('1000');
    expect(logger.debug).toHaveBeenCalled();
  });
});
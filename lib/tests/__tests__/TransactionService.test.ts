jest.resetModules();
jest.doMock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    Wallet: jest.fn()
  };
});

import { Logger } from '../../src/utils/Logger';
import { TransactionService } from '../../src/services/TransactionService';

describe('TransactionService', () => {
  class MockTransactionService extends TransactionService {
    private _mockWallet: any;
    setMockWallet(wallet: any) { this._mockWallet = wallet; }
    protected createWallet(privateKey: string) { return this._mockWallet; }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    const svc = new TransactionService('http://localhost', {} as any);
    expect(svc).toBeDefined();
  });

  it('should get block number', async () => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const provider = { getBlockNumber: jest.fn().mockResolvedValue(123) };
    const svc = new MockTransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    const block = await svc.getBlockNumber();
    expect(block).toBe(123);
    expect(logger.debug).toHaveBeenCalledWith('Número de bloque actual: 123');
  });

  it('should handle error in getBlockNumber', async () => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const provider = { getBlockNumber: jest.fn().mockRejectedValue(new Error('fail')) };
    const svc = new MockTransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    let caught = false;
    try {
      await svc.getBlockNumber();
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(Error);
      if (e instanceof Error) {
        expect(e.message).toMatch(/fail/);
      }
    }
    expect(caught).toBe(true);
    expect(logger.error).toHaveBeenCalledWith('Error al obtener el número de bloque:', expect.any(Error));
  });

  it('should get balance', async () => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const provider = { getBalance: jest.fn().mockResolvedValue(1000) };
    const svc = new MockTransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    const balance = await svc.getBalance('0xabc');
    expect(balance).toBe('1000');
    expect(logger.debug).toHaveBeenCalledWith('Saldo de 0xabc: 1000');
  });

  it('should handle error in getBalance', async () => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const provider = { getBalance: jest.fn().mockRejectedValue(new Error('fail')) };
    const svc = new MockTransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    let caught = false;
    try {
      await svc.getBalance('0xabc');
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(Error);
      if (e instanceof Error) {
        expect(e.message).toMatch(/fail/);
      }
    }
    expect(caught).toBe(true);
    expect(logger.error).toHaveBeenCalledWith('Error al obtener el saldo:', expect.any(Error));
  });

  it('should send transaction successfully', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    const txOptions = { from: '0xabc', to: '0xdef', value: 1 } as any;
    const txResponse = { hash: '0xhash', wait: jest.fn().mockResolvedValue({ blockNumber: 10, blockHash: '0xblock', index: 1, gasUsed: 21000, status: 1 }) };
    const wallet = { address: '0xabc', sendTransaction: jest.fn().mockResolvedValue(txResponse) };
    const svc = new MockTransactionService('http://localhost', logger);
    svc.setMockWallet(wallet);
    svc["provider"] = {} as any;
    const result = await svc.sendTransaction(txOptions, '0xprivkey');
    expect(wallet.sendTransaction).toHaveBeenCalled();
    expect(result.hash).toBe('0xhash');
    expect(result.blockNumber).toBe(10);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Transacción confirmada en el bloque 10'));
  });

  it('should throw error if wallet address does not match from', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    const txOptions = { from: '0xabc', to: '0xdef', value: 1 } as any;
    const wallet = { address: '0xother', sendTransaction: jest.fn() };
    const svc = new MockTransactionService('http://localhost', logger);
    svc.setMockWallet(wallet);
    svc["provider"] = {} as any;
    let caught = false;
    try {
      await svc.sendTransaction(txOptions, '0xprivkey');
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(Error);
      if (e instanceof Error) {
        expect(e.message).toMatch(/La dirección del monedero \(0xother\) no coincide con la dirección de origen \(0xabc\)/);
      }
    }
    expect(caught).toBe(true);
  });

  it('should handle error in sendTransaction', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    const txOptions = { from: '0xabc', to: '0xdef', value: 1 } as any;
    const wallet = { address: '0xabc', sendTransaction: jest.fn().mockRejectedValue(new Error('fail')) };
    const svc = new MockTransactionService('http://localhost', logger);
    svc.setMockWallet(wallet);
    svc["provider"] = {} as any;
    let caught = false;
    try {
      await svc.sendTransaction(txOptions, '0xprivkey');
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(Error);
      if (e instanceof Error) {
        expect(e.message).toMatch(/fail/);
      }
    }
    expect(caught).toBe(true);
    expect(logger.error).toHaveBeenCalledWith('Error al enviar la transacción:', expect.any(Error));
  });

  it('should estimate gas successfully', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    const provider = { estimateGas: jest.fn().mockResolvedValue(21000) };
    const svc = new TransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    const gas = await svc.estimateGas({ from: '0xabc', to: '0xdef', value: 1 } as any);
    expect(gas).toBe('21000');
    expect(logger.debug).toHaveBeenCalledWith('Gas estimado: 21000');
  });

  it('should handle error in estimateGas', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
    const provider = { estimateGas: jest.fn().mockRejectedValue(new Error('fail')) };
    const svc = new TransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    let caught = false;
    try {
      await svc.estimateGas({ from: '0xabc', to: '0xdef', value: 1 } as any);
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(Error);
      if (e instanceof Error) {
        expect(e.message).toMatch(/fail/);
      }
    }
    expect(caught).toBe(true);
    expect(logger.error).toHaveBeenCalledWith('Error al estimar el gas:', expect.any(Error));
  });

  it('should get peer count', async () => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const provider = { send: jest.fn().mockResolvedValue('5') };
    const svc = new TransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    const count = await svc.getPeerCount();
    expect(count).toBe(5);
    expect(logger.debug).toHaveBeenCalledWith('Número de peers: 5');
  });

  it('should handle error in getPeerCount', async () => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const provider = { send: jest.fn().mockRejectedValue(new Error('fail')) };
    const svc = new TransactionService('http://localhost', logger);
    svc["provider"] = provider as any;
    let caught = false;
    try {
      await svc.getPeerCount();
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(Error);
      if (e instanceof Error) {
        expect(e.message).toMatch(/fail/);
      }
    }
    expect(caught).toBe(true);
    expect(logger.error).toHaveBeenCalledWith('Error al obtener el número de peers:', expect.any(Error));
  });
});
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});
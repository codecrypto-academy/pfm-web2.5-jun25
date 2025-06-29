import { Logger, LogLevel } from '../../src/utils/Logger';

describe('Logger', () => {
  it('should construct Logger', () => {
    const logger = new Logger({ level: LogLevel.INFO });
    expect(logger).toBeDefined();
  });

  it('should log info and error', () => {
    const logFn = jest.fn();
    const logger = new Logger({ level: 0, logFunction: logFn, includeTimestamp: false, colorOutput: false });
    logger.info('info message');
    logger.error('error message');
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('info message'));
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('error message'));
  });

  it('should not throw when logging with an invalid level', () => {
    const logFn = jest.fn();
    const logger = new Logger({ level: 0 as LogLevel, logFunction: logFn, includeTimestamp: false, colorOutput: false });
    // Forzar un nivel inválido temporalmente
    (logger as any).level = 99;
    expect(() => logger.info('info message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
  });
});
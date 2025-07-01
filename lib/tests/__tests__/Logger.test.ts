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

  it('should log debug and warn', () => {
    const logFn = jest.fn();
    const logger = new Logger({ level: LogLevel.DEBUG, logFunction: logFn, includeTimestamp: false, colorOutput: false });
    logger.debug('debug message');
    logger.warn('warn message');
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('debug message'));
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('warn message'));
  });

  it('should set log level', () => {
    const logFn = jest.fn();
    const logger = new Logger({ level: LogLevel.INFO, logFunction: logFn, includeTimestamp: false, colorOutput: false });
    logger.setLevel(LogLevel.ERROR);
    logger.info('should not log');
    logger.error('should log');
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('should log'));
    expect(logFn).not.toHaveBeenCalledWith(expect.stringContaining('should not log'));
  });

  it('should log with additional arguments and errors', () => {
    const logFn = jest.fn();
    const logger = new Logger({ level: LogLevel.DEBUG, logFunction: logFn, includeTimestamp: false, colorOutput: false });
    const err = new Error('fail');
    logger.error('error with arg', err, { foo: 'bar' }, 123);
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('fail'));
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('foo'));
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('123'));
  });

  it('should log with color output', () => {
    const logFn = jest.fn();
    const logger = new Logger({ level: LogLevel.INFO, logFunction: logFn, includeTimestamp: false, colorOutput: true });
    logger.info('colored info');
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
  });
});
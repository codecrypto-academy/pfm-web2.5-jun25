/**
 * Niveles de log
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Opciones para el logger
 */
export interface LoggerOptions {
  /** Nivel mínimo de log */
  level?: LogLevel;
  /** Si se debe incluir la fecha en los logs */
  includeTimestamp?: boolean;
  /** Si se debe colorear la salida */
  colorOutput?: boolean;
  /** Función para escribir logs (por defecto console.log) */
  logFunction?: (message: string) => void;
}

/**
 * Clase para gestionar logs
 */
export class Logger {
  private level: LogLevel;
  private includeTimestamp: boolean;
  private colorOutput: boolean;
  private logFunction: (message: string) => void;

  // Códigos de color ANSI
  private static readonly COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
  };

  /**
   * Constructor
   * @param options Opciones del logger
   */
  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.colorOutput = options.colorOutput ?? true;
    this.logFunction = options.logFunction ?? console.log;
  }

  /**
   * Establece el nivel de log
   * @param level Nivel de log
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log de nivel debug
   * @param message Mensaje
   * @param args Argumentos adicionales
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log de nivel info
   * @param message Mensaje
   * @param args Argumentos adicionales
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log de nivel warn
   * @param message Mensaje
   * @param args Argumentos adicionales
   */
  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log de nivel error
   * @param message Mensaje
   * @param args Argumentos adicionales
   */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Función principal de log
   * @param level Nivel de log
   * @param message Mensaje
   * @param args Argumentos adicionales
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Comprobar si el nivel de log es suficiente
    if (level < this.level) {
      return;
    }

    // Construir el mensaje
    let logMessage = '';

    // Añadir timestamp si está habilitado
    if (this.includeTimestamp) {
      const timestamp = new Date().toISOString();
      logMessage += `[${timestamp}] `;
    }

    // Añadir el nivel de log
    const levelStr = LogLevel[level];
    if (this.colorOutput) {
      const color = this.getLevelColor(level);
      logMessage += `${color}[${levelStr}]${Logger.COLORS.reset} `;
    } else {
      logMessage += `[${levelStr}] `;
    }

    // Añadir el mensaje
    logMessage += message;

    // Añadir argumentos adicionales si existen
    if (args.length > 0) {
      for (const arg of args) {
        if (arg instanceof Error) {
          logMessage += ` ${arg.message}`;
          if (arg.stack && level === LogLevel.ERROR) {
            logMessage += `\n${arg.stack}`;
          }
        } else if (typeof arg === 'object') {
          try {
            logMessage += ` ${JSON.stringify(arg)}`;
          } catch (e) {
            logMessage += ` [Objeto no serializable]`;
          }
        } else {
          logMessage += ` ${arg}`;
        }
      }
    }

    // Escribir el log
    this.logFunction(logMessage);
  }

  /**
   * Obtiene el color para un nivel de log
   * @param level Nivel de log
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return Logger.COLORS.cyan;
      case LogLevel.INFO:
        return Logger.COLORS.green;
      case LogLevel.WARN:
        return Logger.COLORS.yellow;
      case LogLevel.ERROR:
        return Logger.COLORS.red;
      default:
        return Logger.COLORS.white;
    }
  }
}
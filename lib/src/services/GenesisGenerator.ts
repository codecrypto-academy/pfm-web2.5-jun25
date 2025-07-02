import { FileSystem } from '../utils/FileSystem';
import { GenesisOptions } from '../models/types';
import { Logger } from '../utils/Logger';

/**
 * Servicio para generar archivos génesis para redes Besu
 */
export class GenesisGenerator {
  private logger: Logger;
  private fs: FileSystem;

  /**
   * Constructor
   * @param logger Servicio de logging
   * @param fs Servicio de sistema de archivos
   */
  constructor(logger: Logger, fs: FileSystem) {
    this.logger = logger;
    this.fs = fs;
  }

  /**
   * Genera un archivo génesis para una red Besu
   * @param filePath Ruta del archivo génesis
   * @param options Opciones para la generación del génesis
   */
  public async generateGenesisFile(filePath: string, options: GenesisOptions): Promise<void> {
    this.logger.info(`Generando archivo génesis con protocolo ${options.consensusProtocol}`);

    // Crear el objeto génesis base
    const genesis: any = {
      config: {
        chainId: options.chainId,
        homesteadBlock: 0,
        eip150Block: 0,
        eip155Block: 0,
        eip158Block: 0,
        byzantiumBlock: 0,
        constantinopleBlock: 0,
        petersburgBlock: 0,
        istanbulBlock: 0,
        berlinBlock: 0,
        londonBlock: 0
      },
      nonce: '0x0',
      timestamp: '0x0',
      gasLimit: '0x1fffffffffffff',
      difficulty: '0x1',
      mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      coinbase: '0x0000000000000000000000000000000000000000',
      alloc: options.alloc || {},
      extraData: '0x'
    };

    // Configurar el protocolo de consenso
    switch (options.consensusProtocol) {
      case 'clique':
        this.configureCliqueGenesis(genesis, options);
        break;
      case 'ibft2':
        this.configureIbft2Genesis(genesis, options);
        break;
      case 'qbft':
        this.configureQbftGenesis(genesis, options);
        break;
      default:
        throw new Error(`Protocolo de consenso no soportado: ${options.consensusProtocol}`);
    }

    // Añadir opciones adicionales si existen
    if (options.additionalOptions) {
      for (const [key, value] of Object.entries(options.additionalOptions)) {
        genesis[key] = value;
      }
    }

    // Añadir cuentas pre-financiadas si no se han especificado
    if (!options.alloc || Object.keys(options.alloc).length === 0) {
      // Financiar las cuentas de los validadores
      const alloc: Record<string, { balance: string }> = {};
      for (const address of options.validatorAddresses) {
        // Las direcciones en alloc deben mantener el prefijo 0x y estar en minúsculas
        const cleanAddress = address.toLowerCase();
        alloc[cleanAddress] = { balance: '0x200000000000000000000000000000000' };
      }

      // Añadir algunas cuentas adicionales para pruebas
      alloc['0xfe3b557e8fb62b89f4916b721be55ceb828dbd73'] = { balance: '0x200000000000000000000000000000000' };
      alloc['0x627306090abaB3A6e1400e9345bC60c78a8BEf57'] = { balance: '0x200000000000000000000000000000000' };
      alloc['0xf17f52151EbEF6C7334FAD080c5704D77216b732'] = { balance: '0x200000000000000000000000000000000' };

      genesis.alloc = alloc;
    }

    // Escribir el archivo génesis
    await this.fs.writeFile(filePath, JSON.stringify(genesis, null, 2));
    this.logger.info(`Archivo génesis generado en: ${filePath}`);
  }

  /**
   * Configura el génesis para el protocolo Clique
   * @param genesis Objeto génesis
   * @param options Opciones para la generación del génesis
   */
  private configureCliqueGenesis(genesis: any, options: GenesisOptions): void {
    // Configurar Clique en el objeto config
    genesis.config.clique = {
      period: options.blockPeriod,
      epoch: 30000
    };

    // Crear el extraData para Clique
    // Format: 0x + 32 bytes (zeros) + validators addresses + 65 bytes (zeros)
    const prefix = '0x' + '0'.repeat(64);
    const suffix = '0'.repeat(130);
    // Asegurar que las direcciones estén en minúsculas y sin prefijo 0x
    const validators = options.validatorAddresses
      .map(addr => addr.toLowerCase().substring(2))
      .join('');
    genesis.extraData = prefix + validators + suffix;
    
    this.logger.info(`Configurando Clique con ${options.validatorAddresses.length} validadores`);
    this.logger.debug(`ExtraData generado: ${genesis.extraData}`);
  }

  /**
   * Configura el génesis para el protocolo IBFT2
   * @param genesis Objeto génesis
   * @param options Opciones para la generación del génesis
   */
  private configureIbft2Genesis(genesis: any, options: GenesisOptions): void {
    // Configurar IBFT2 en el objeto config
    genesis.config.ibft2 = {
      blockperiodseconds: options.blockPeriod,
      epochlength: 30000,
      requesttimeoutseconds: 10
    };

    // Crear el extraData para IBFT2
    // Format: 0x + RLP encoded validator addresses
    const rlpEncode = (validators: string[]): string => {
      // Implementación simplificada de RLP para direcciones de validadores
      // En una implementación real, se debería usar una biblioteca RLP completa
      const prefix = '0xf87ea00000000000000000000000000000000000000000000000000000000000000000f854';
      const suffix = '80c0';
      
      // Codificar cada dirección como un elemento RLP
      let encodedValidators = '';
      for (const validator of validators) {
        // Formato: 0x + dirección sin 0x
        encodedValidators += 'a0' + validator.substring(2);
      }
      
      return prefix + encodedValidators + suffix;
    };
    
    genesis.extraData = rlpEncode(options.validatorAddresses);
  }

  /**
   * Configura el génesis para el protocolo QBFT
   * @param genesis Objeto génesis
   * @param options Opciones para la generación del génesis
   */
  private configureQbftGenesis(genesis: any, options: GenesisOptions): void {
    // Configurar QBFT en el objeto config
    genesis.config.qbft = {
      blockperiodseconds: options.blockPeriod,
      epochlength: 30000,
      requesttimeoutseconds: 10
    };

    // Crear el extraData para QBFT (similar a IBFT2)
    // Format: 0x + RLP encoded validator addresses
    const rlpEncode = (validators: string[]): string => {
      // Implementación simplificada de RLP para direcciones de validadores
      // En una implementación real, se debería usar una biblioteca RLP completa
      const prefix = '0xf87ea00000000000000000000000000000000000000000000000000000000000000000f854';
      const suffix = '80c0';
      
      // Codificar cada dirección como un elemento RLP
      let encodedValidators = '';
      for (const validator of validators) {
        // Formato: 0x + dirección sin 0x
        encodedValidators += 'a0' + validator.substring(2);
      }
      
      return prefix + encodedValidators + suffix;
    };
    
    genesis.extraData = rlpEncode(options.validatorAddresses);
  }
}
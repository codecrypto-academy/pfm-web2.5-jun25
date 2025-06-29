import { TransactionOptions, TransactionResult } from '../models/types';
import { Logger } from '../utils/Logger';
import { ethers } from 'ethers';

/**
 * Servicio para gestionar transacciones en la red Besu
 */
export class TransactionService {
  private logger: Logger;
  private provider: ethers.JsonRpcProvider;

  /**
   * Constructor
   * @param rpcUrl URL del endpoint RPC
   * @param logger Servicio de logging
   */
  constructor(rpcUrl: string, logger: Logger) {
    this.logger = logger;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Obtiene el número de bloque actual
   */
  public async getBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      this.logger.debug(`Número de bloque actual: ${blockNumber}`);
      return blockNumber;
    } catch (error) {
      this.logger.error('Error al obtener el número de bloque:', error);
      throw error;
    }
  }

  /**
   * Obtiene el saldo de una dirección
   * @param address Dirección Ethereum
   */
  public async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      this.logger.debug(`Saldo de ${address}: ${ethers.formatEther(balance)} ETH`);
      return balance.toString();
    } catch (error) {
      this.logger.error(`Error al obtener el saldo de ${address}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el número de peers conectados
   */
  public async getPeerCount(): Promise<number> {
    try {
      const peerCount = await this.provider.send('net_peerCount', []);
      const count = parseInt(peerCount, 16);
      this.logger.debug(`Número de peers conectados: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('Error al obtener el número de peers:', error);
      throw error;
    }
  }

  /**
   * Envía una transacción
   * @param options Opciones de la transacción
   * @param privateKey Clave privada para firmar la transacción
   */
  public async sendTransaction(options: TransactionOptions, privateKey: string): Promise<TransactionResult> {
    try {
      this.logger.info(`Enviando transacción desde ${options.from} a ${options.to}`);

      // Crear un monedero con la clave privada
      const wallet = new ethers.Wallet(privateKey, this.provider);

      // Comprobar que la dirección del monedero coincide con la dirección de origen
      if (wallet.address.toLowerCase() !== options.from.toLowerCase()) {
        throw new Error(`La dirección del monedero (${wallet.address}) no coincide con la dirección de origen (${options.from})`);
      }

      // Preparar la transacción
      const tx: ethers.TransactionRequest = {
        to: options.to,
        value: options.value,
        data: options.data,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        nonce: options.nonce
      };

      // Enviar la transacción
      const txResponse = await wallet.sendTransaction(tx);
      this.logger.info(`Transacción enviada con hash: ${txResponse.hash}`);

      // Esperar a que la transacción se confirme
      const receipt = await txResponse.wait();
      this.logger.info(`Transacción confirmada en el bloque ${receipt?.blockNumber}`);

      // Crear el resultado
      const result: TransactionResult = {
        hash: txResponse.hash,
        blockNumber: receipt?.blockNumber,
        blockHash: receipt?.blockHash,
        transactionIndex: receipt?.index,
        from: options.from,
        to: options.to,
        value: options.value,
        gasUsed: receipt?.gasUsed?.toString(),
        status: receipt?.status ? Number(receipt.status) : undefined
      };

      return result;
    } catch (error) {
      this.logger.error('Error al enviar la transacción:', error);
      throw error;
    }
  }

  /**
   * Estima el gas necesario para una transacción
   * @param options Opciones de la transacción
   */
  public async estimateGas(options: TransactionOptions): Promise<string> {
    try {
      const tx: ethers.TransactionRequest = {
        from: options.from,
        to: options.to,
        value: options.value,
        data: options.data
      };

      const gasEstimate = await this.provider.estimateGas(tx);
      this.logger.debug(`Gas estimado: ${gasEstimate}`);
      return gasEstimate.toString();
    } catch (error) {
      this.logger.error('Error al estimar el gas:', error);
      throw error;
    }
  }

  /**
   * Realiza una llamada a un contrato (sin enviar una transacción)
   * @param options Opciones de la llamada
   */
  public async call(options: TransactionOptions): Promise<string> {
    try {
      const tx: ethers.TransactionRequest = {
        from: options.from,
        to: options.to,
        value: options.value,
        data: options.data,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice
      };

      const result = await this.provider.call(tx);
      this.logger.debug(`Resultado de la llamada: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Error al realizar la llamada:', error);
      throw error;
    }
  }

  /**
   * Despliega un contrato
   * @param bytecode Bytecode del contrato
   * @param abi ABI del contrato
   * @param privateKey Clave privada para firmar la transacción
   * @param constructorArgs Argumentos del constructor (opcional)
   */
  public async deployContract(
    bytecode: string,
    abi: any[],
    privateKey: string,
    constructorArgs: any[] = []
  ): Promise<{ address: string; transactionHash: string }> {
    try {
      this.logger.info('Desplegando contrato...');

      // Crear un monedero con la clave privada
      const wallet = new ethers.Wallet(privateKey, this.provider);

      // Crear la factory del contrato
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);

      // Desplegar el contrato
      const contract = await factory.deploy(...constructorArgs);
      this.logger.info(`Contrato desplegado con hash de transacción: ${contract.deploymentTransaction()?.hash}`);

      // Esperar a que el contrato se despliegue
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      this.logger.info(`Contrato desplegado en la dirección: ${address}`);

      return {
        address,
        transactionHash: contract.deploymentTransaction()?.hash || ''
      };
    } catch (error) {
      this.logger.error('Error al desplegar el contrato:', error);
      throw error;
    }
  }

  /**
   * Espera a que se genere un nuevo bloque
   * @param timeoutMs Tiempo máximo de espera en milisegundos
   */
  public async waitForNewBlock(timeoutMs: number = 30000): Promise<number> {
    try {
      const initialBlock = await this.getBlockNumber();
      this.logger.debug(`Esperando un nuevo bloque (bloque actual: ${initialBlock})...`);

      return new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.provider.removeAllListeners('block');
          reject(new Error(`Tiempo de espera agotado esperando un nuevo bloque (${timeoutMs}ms)`));
        }, timeoutMs);

        this.provider.on('block', (blockNumber: number) => {
          if (blockNumber > initialBlock) {
            clearTimeout(timeout);
            this.provider.removeAllListeners('block');
            this.logger.debug(`Nuevo bloque detectado: ${blockNumber}`);
            resolve(blockNumber);
          }
        });
      });
    } catch (error) {
      this.logger.error('Error al esperar un nuevo bloque:', error);
      throw error;
    }
  }
}
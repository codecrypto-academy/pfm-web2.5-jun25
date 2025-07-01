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
   * Método protegido para crear un monedero (Wallet)
   */
  protected createWallet(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.provider);
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
      this.logger.debug(`Saldo de ${address}: ${balance}`);
      return balance.toString();
    } catch (error) {
      this.logger.error('Error al obtener el saldo:', error);
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

      // Crear un monedero con la clave privada usando el método protegido
      const wallet = this.createWallet(privateKey);

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
   * Obtiene el número de peers conectados
   */
  public async getPeerCount(): Promise<number> {
    try {
      const peerCount = await this.provider.send('net_peerCount', []);
      this.logger.debug(`Número de peers: ${peerCount}`);
      return Number(peerCount);
    } catch (error) {
      this.logger.error('Error al obtener el número de peers:', error);
      throw error;
    }
  }
}
/**
 * Ejemplo de uso de la biblioteca para realizar transacciones en una red Besu
 */
import * as path from 'path';

import { BesuNetworkConfig, LogLevel, TransactionOptions, TransactionService, createBesuNetwork } from '../src';

/**
 * Función principal
 */
async function main() {
  try {
    // Configuración de la red
    const config: BesuNetworkConfig = {
      name: 'transaction-network',
      chainId: 1337,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      nodeCount: 3,
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      dataDir: path.join(__dirname, '../data')
    };

    // Crear la red Besu
    const besuNetwork = createBesuNetwork(config, LogLevel.DEBUG);

    // Inicializar la red (generar claves y archivo génesis)
    await besuNetwork.initialize();

    // Iniciar la red
    await besuNetwork.start();

    // Obtener el estado de la red
    const status = await besuNetwork.getStatus();
    console.log('Estado de la red:');
    console.log(JSON.stringify(status, null, 2));

    // Esperar a que la red esté lista
    console.log('\nEsperando a que la red esté lista...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Crear un servicio de transacciones
    const rpcUrl = `http://localhost:${config.baseRpcPort}`;
    const txService = new TransactionService(rpcUrl, besuNetwork['logger']);

    // Obtener información de la red
    const blockNumber = await txService.getBlockNumber();
    console.log(`\nNúmero de bloque actual: ${blockNumber}`);

    const peerCount = await txService.getPeerCount();
    console.log(`Número de peers conectados: ${peerCount}`);

    // Obtener las direcciones de los nodos
    if (config.nodes && config.nodes.length > 0) {
      const fromNode = config.nodes[0];
      const toNode = config.nodes[1];

      if (fromNode.validatorAddress && toNode.validatorAddress && fromNode.privateKey) {
        // Obtener saldos iniciales
        const fromBalance = await txService.getBalance(fromNode.validatorAddress);
        const toBalance = await txService.getBalance(toNode.validatorAddress);

        console.log(`\nSaldo inicial de ${fromNode.validatorAddress}: ${fromBalance} wei`);
        console.log(`Saldo inicial de ${toNode.validatorAddress}: ${toBalance} wei`);

        // Enviar una transacción
        console.log('\nEnviando transacción...');

        const txOptions: TransactionOptions = {
          from: "0x93bc4dC5B43180F4A6F5E3B90887F1902eD6485b",
          to: "0x8726b84d76A33d5ba1a37557b8c9489E4427Da30",
          value: '1000000000000000000' // 1 ETH
        };

        // Estimar el gas
        const gasEstimate = await txService.estimateGas(txOptions);
        console.log(`Gas estimado: ${gasEstimate}`);

        // Enviar la transacción
        const txResult = await txService.sendTransaction(txOptions, fromNode.privateKey);
        console.log('Transacción enviada:');
        console.log(JSON.stringify(txResult, null, 2));

        // Obtener saldos finales
        const fromBalanceAfter = await txService.getBalance(fromNode.validatorAddress);
        const toBalanceAfter = await txService.getBalance(toNode.validatorAddress);

        console.log(`\nSaldo final de ${fromNode.validatorAddress}: ${fromBalanceAfter} wei`);
        console.log(`Saldo final de ${toNode.validatorAddress}: ${toBalanceAfter} wei`);

        // Esperar a un nuevo bloque
        console.log('\nEsperando a un nuevo bloque...');
        let currentBlock = await txService.getBlockNumber();
        let newBlockNumber = currentBlock;
        while (newBlockNumber === currentBlock) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          newBlockNumber = await txService.getBlockNumber();
        }
        console.log(`Nuevo bloque detectado: ${newBlockNumber}`);
      }
    }

    // Detener la red
    console.log('\nDeteniendo la red Besu...');
    //await besuNetwork.stop();
    console.log('Red Besu detenida.');
  } catch (error) {
    console.error('Error:', error);

    // Intentar detener la red en caso de error
    try {
      const config: BesuNetworkConfig = {
        name: 'transaction-network',
        chainId: 1337,
        consensusProtocol: 'clique',
        blockPeriod: 5,
        nodeCount: 3,
        baseRpcPort: 8545,
        baseP2pPort: 30303,
        dataDir: path.join(__dirname, '../data')
      };

      const besuNetwork = createBesuNetwork(config);
      await besuNetwork.stop();
      console.log('Red Besu detenida.');
    } catch (stopError) {
      console.error('Error al detener la red:', stopError);
    }

    process.exit(1);
  }
}

// Ejecutar la función principal
main();
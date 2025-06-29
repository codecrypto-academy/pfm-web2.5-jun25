/**
 * Ejemplo de uso de la biblioteca para desplegar un contrato inteligente en una red Besu
 */
import * as path from 'path';
import { createBesuNetwork, BesuNetworkConfig, LogLevel, TransactionService } from '../src';

// ABI y bytecode de un contrato simple de almacenamiento
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "retrieve",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "num",
        "type": "uint256"
      }
    ],
    "name": "store",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Bytecode del contrato de almacenamiento
const CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea2646970667358221220322c78243e61b783558509c9cc22cb8493dde6925aa5e89a08cdf6e22f279ef164736f6c63430008120033';

/**
 * Función principal
 */
async function main() {
  try {
    // Configuración de la red
    const config: BesuNetworkConfig = {
      name: 'contract-network',
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

    // Desplegar el contrato
    if (config.nodes && config.nodes.length > 0) {
      const deployerNode = config.nodes[0];

      if (deployerNode.validatorAddress && deployerNode.privateKey) {
        console.log(`\nDesplegando contrato desde ${deployerNode.validatorAddress}...`);

        // Desplegar el contrato
        const deployResult = await txService.deployContract(
          CONTRACT_BYTECODE,
          CONTRACT_ABI,
          deployerNode.privateKey
        );

        console.log('Contrato desplegado:');
        console.log(JSON.stringify(deployResult, null, 2));

        // Interactuar con el contrato
        console.log('\nInteractuando con el contrato...');

        // Crear una instancia del contrato usando ethers.js
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(deployerNode.privateKey, provider);
        const contract = new ethers.Contract(deployResult.address, CONTRACT_ABI, wallet);

        // Llamar a la función store
        console.log('Almacenando el valor 42...');
        const storeTx = await contract.store(42);
        await storeTx.wait();
        console.log(`Transacción completada: ${storeTx.hash}`);

        // Llamar a la función retrieve
        const value = await contract.retrieve();
        console.log(`Valor recuperado: ${value}`);
      }
    }

    // Detener la red
    console.log('\nDeteniendo la red Besu...');
    await besuNetwork.stop();
    console.log('Red Besu detenida.');
  } catch (error) {
    console.error('Error:', error);

    // Intentar detener la red en caso de error
    try {
      const config: BesuNetworkConfig = {
        name: 'contract-network',
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
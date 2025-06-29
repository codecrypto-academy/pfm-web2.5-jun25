# Biblioteca TypeScript para Redes Besu

Esta biblioteca proporciona una forma sencilla de crear, gestionar y interactuar con redes Hyperledger Besu para desarrollo y pruebas.

## Características

- Creación y gestión de redes Besu con Docker
- Soporte para diferentes protocolos de consenso (Clique, IBFT2, QBFT)
- Generación de claves y archivos génesis
- Gestión de transacciones y contratos inteligentes
- API sencilla y completa
- Ejemplos de uso

## Requisitos previos

- Node.js (v14 o superior)
- Docker
- TypeScript

## Instalación

```bash
npm install
```

## Compilación

```bash
npm run build
```

## Uso básico

```typescript
import { createBesuNetwork, BesuNetworkConfig } from './dist';

// Configuración de la red
const config: BesuNetworkConfig = {
  name: 'mi-red-besu',
  chainId: 1337,
  consensusProtocol: 'clique',
  blockPeriod: 5,
  nodeCount: 3,
  baseRpcPort: 8545,
  baseP2pPort: 30303,
  dataDir: './data'
};

// Crear y gestionar la red
async function main() {
  // Crear la red Besu
  const besuNetwork = createBesuNetwork(config);

  // Inicializar la red (generar claves y archivo génesis)
  await besuNetwork.initialize();

  // Iniciar la red
  await besuNetwork.start();

  // Obtener el estado de la red
  const status = await besuNetwork.getStatus();
  console.log('Estado de la red:', status);

  // Detener la red cuando sea necesario
  await besuNetwork.stop();
}

main().catch(console.error);
```

## Ejemplos

La biblioteca incluye varios ejemplos en el directorio `examples/`:

- `simple-network.ts`: Creación de una red Besu simple
- `transactions.ts`: Envío de transacciones entre nodos
- `deploy-contract.ts`: Despliegue e interacción con contratos inteligentes

Para ejecutar un ejemplo:

```bash
npx ts-node examples/simple-network.ts
```

## Estructura de la biblioteca

- `src/models/`: Definiciones de tipos e interfaces
- `src/services/`: Servicios principales (BesuNetworkManager, DockerService, etc.)
- `src/utils/`: Utilidades (FileSystem, Logger, etc.)
- `examples/`: Ejemplos de uso

## Servicios principales

### BesuNetworkManager

Gestiona el ciclo de vida completo de una red Besu:

- `initialize()`: Inicializa la red (genera claves y archivo génesis)
- `start()`: Inicia la red
- `stop()`: Detiene la red
- `getStatus()`: Obtiene el estado actual de la red

### TransactionService

Proporciona funciones para interactuar con la red Besu:

- `getBlockNumber()`: Obtiene el número de bloque actual
- `getBalance(address)`: Obtiene el saldo de una dirección
- `sendTransaction(options, privateKey)`: Envía una transacción
- `deployContract(bytecode, abi, privateKey)`: Despliega un contrato inteligente

## Configuración

### BesuNetworkConfig

```typescript
interface BesuNetworkConfig {
  name: string;              // Nombre de la red
  chainId: number;           // ID de la cadena
  consensusProtocol: 'clique' | 'ibft2' | 'qbft';  // Protocolo de consenso
  blockPeriod: number;       // Tiempo de bloque en segundos
  nodeCount: number;         // Número de nodos
  baseRpcPort: number;       // Puerto RPC base
  baseP2pPort: number;       // Puerto P2P base
  dataDir: string;           // Directorio de datos
  nodes?: BesuNodeConfig[];  // Configuración de nodos (opcional)
  additionalOptions?: Record<string, string>;  // Opciones adicionales
}
```

## Licencia

MIT
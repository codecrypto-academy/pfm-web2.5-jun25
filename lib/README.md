# Besu Network Library

**Author:** Javier Ruiz-Canela López  
**Email:** jrcanelalopez@gmail.com  
**Date:** June 28, 2025

_This library was developed with the assistance of GitHub Copilot._

---

Una librería TypeScript flexible para crear y gestionar redes Besu (Hyperledger Besu) de manera programática usando Docker con soporte para cualquier cantidad y tipo de nodos.

## Características

- ✅ **Flexibilidad total**: Crea redes con cualquier cantidad de nodos de cualquier tipo
- ✅ **Múltiples tipos de nodos**: bootnode, miner, RPC, validator/observer
- ✅ **API flexible**: Define topologías exactas o usa métodos de conveniencia
- ✅ **Gestión dinámica**: Agrega/remueve nodos en tiempo real
- ✅ **Resolución automática de conflictos**: Manejo inteligente de subredes Docker
- ✅ **Generación automática**: Claves criptográficas, génesis y configuraciones
- ✅ **Gestión completa de Docker**: Contenedores, redes y volúmenes
- ✅ **Financiación automática**: Cuentas desde mnemonic con distribución ETH
- ✅ **Utilidades integradas**: Balance, información de red, monitoreo
- ✅ **TypeScript completo**: Tipado fuerte y IntelliSense

## Instalación

```bash
npm install
```

## Dependencias

Asegúrate de tener Docker instalado y ejecutándose en tu sistema.

## Uso Básico

### Método 1: API Flexible (Recomendado)

```typescript
import {
  BesuNetwork,
  BesuNetworkConfig,
  BesuNodeDefinition,
} from "./src/index";

// Configurar la red
const networkConfig: BesuNetworkConfig = {
  name: "mi-red-besu",
  chainId: 1337,
  subnet: "172.24.0.0/16",
  consensus: "clique",
  gasLimit: "0x1fffffffffffff",
  blockTime: 5,
};

const besuNetwork = new BesuNetwork(networkConfig);

// Definir cualquier cantidad y tipo de nodos
const nodes: BesuNodeDefinition[] = [
  { name: "bootnode", ip: "172.24.0.20", rpcPort: 8545, type: "bootnode" },
  { name: "miner1", ip: "172.24.0.21", rpcPort: 8546, type: "miner" },
  { name: "miner2", ip: "172.24.0.22", rpcPort: 8547, type: "miner" },
  { name: "rpc1", ip: "172.24.0.23", rpcPort: 8548, type: "rpc" },
  { name: "rpc2", ip: "172.24.0.24", rpcPort: 8549, type: "rpc" },
  { name: "observer", ip: "172.24.0.25", rpcPort: 8550, type: "node" },
];

// Crear la red con flexibilidad total
await besuNetwork.create({
  nodes: nodes,
  initialBalance: "5000000000000000000000000", // 5M ETH
  autoResolveSubnetConflicts: true,
});

// Iniciar la red
await besuNetwork.start();
```

### Configuración Avanzada con Nuevos Parámetros

```typescript
// Configuración extendida con cuentas predefinidas
const extendedNetworkConfig: BesuNetworkConfig = {
  name: "mi-red-extendida",
  chainId: 1337,
  subnet: "172.24.0.0/16",
  consensus: "clique",
  gasLimit: "0x1fffffffffffff",
  blockTime: 5,
  mainIp: "172.24.0.1", // IP principal de la red
  accounts: [
    // Lista de cuentas con balance inicial
    {
      address: "0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9",
      weiAmount: "100000000000000000000000", // 100,000 ETH en wei
    },
    {
      address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
      weiAmount: "50000000000000000000000", // 50,000 ETH en wei
    },
    {
      address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
      weiAmount: "25000000000000000000000", // 25,000 ETH en wei
    },
  ],
};

// Estas cuentas serán automáticamente financiadas en el génesis con los balances especificados
```

### Configuración con Cuenta Firmante (Signer Account)

```typescript
// Configuración con cuenta firmante principal
const signerNetworkConfig: BesuNetworkConfig = {
  name: "mi-red-signer",
  chainId: 2025,
  subnet: "172.25.0.0/16",
  consensus: "clique",
  gasLimit: "0x1fffffffffffff",
  blockTime: 3,
  signerAccount: {
    // Cuenta principal del firmante (tiene prioridad)
    address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    weiAmount: "1000000000000000000000000", // 1,000,000 ETH en wei
  },
  accounts: [
    // Cuentas adicionales
    {
      address: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
      weiAmount: "100000000000000000000", // 100 ETH en wei
    },
    {
      address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
      weiAmount: "50000000000000000000", // 50 ETH en wei
    },
    // Si esta dirección fuera igual a signerAccount, se ignoraría este balance
    {
      address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
      weiAmount: "25000000000000000000", // 25 ETH en wei
    },
  ],
};

// El signerAccount siempre tiene prioridad sobre las cuentas en el array accounts
// mainIp se usa para generar IPs automáticamente para nodos
const besuExtended = new BesuNetwork(extendedNetworkConfig);
```

### Método 2: Métodos de Conveniencia

```typescript
// Red simple (1 bootnode + 1 miner)
await besuNetwork.createSimpleNetwork();

// Red multi-miner (1 bootnode + N miners + M RPC)
await besuNetwork.createMultiMinerNetwork({
  minerCount: 3,
  rpcNodeCount: 2,
});

// Red escalable automática (distribución automática)
await besuNetwork.createScalableNetwork({
  totalNodes: 10,
  minerPercentage: 30, // 30% miners
  rpcPercentage: 40, // 40% RPC nodes
});

// Red personalizada con configuración específica
await besuNetwork.createCustomNetwork({
  bootnodes: 2,
  miners: 3,
  rpcNodes: 4,
  validators: 2,
});
```

## API Reference

### BesuNodeDefinition (Nueva API Flexible)

```typescript
interface BesuNodeDefinition {
  name: string; // Nombre único del nodo
  ip: string; // Dirección IP del nodo
  rpcPort: number; // Puerto RPC del nodo
  type: "bootnode" | "miner" | "rpc" | "node"; // Tipo de nodo
  p2pPort?: number; // Puerto P2P (por defecto: 30303)
}
```

### BesuNetworkCreateOptions (Nueva API)

```typescript
interface BesuNetworkCreateOptions {
  nodes: BesuNodeDefinition[]; // Lista de nodos a crear
  initialBalance?: string; // Balance inicial (wei)
  autoResolveSubnetConflicts?: boolean; // Resolver conflictos automáticamente
  minerAddress?: string; // Dirección específica del miner principal
}
```

### BesuNetworkConfig

```typescript
interface BesuNetworkConfig {
  name: string; // Nombre de la red
  chainId: number; // ID de la cadena
  subnet: string; // Subred Docker (ej: '172.24.0.0/16')
  consensus: "clique" | "ibft2" | "qbft"; // Algoritmo de consenso
  gasLimit: string; // Límite de gas (en hex)
  blockTime?: number; // Tiempo entre bloques en segundos
  mainIp?: string; // IP principal de la red (opcional)
  signerAccount?: { address: string; weiAmount: string }; // Cuenta principal del firmante (con balance inicial en wei)
  accounts?: Array<{ address: string; weiAmount: string }>; // Lista de cuentas con balance inicial (en wei)
}
```

**Nota importante sobre las cuentas:**

- `signerAccount`: Es la cuenta principal con privilegios especiales. Su balance tiene prioridad sobre cualquier configuración en `accounts`.
- `accounts`: Array de cuentas adicionales. Si una dirección aparece tanto en `signerAccount` como en `accounts`, se usa el balance de `signerAccount`.
- Todas las direcciones deben ser válidas (formato 0x + 40 caracteres hexadecimales).

### BesuNodeConfig

```typescript
interface BesuNodeConfig {
  name: string; // Nombre del nodo
  ip: string; // IP del nodo
  port: number; // Puerto P2P
  rpcPort: number; // Puerto RPC
  type: "bootnode" | "miner" | "rpc" | "node"; // Tipo de nodo
}
```

### Métodos Principales

#### `BesuNetwork.create(options)` - **Método Principal Flexible**

Crea la estructura de red con cualquier cantidad y tipo de nodos.

```typescript
// Nueva API flexible
await besuNetwork.create({
  nodes: [
    { name: "bootnode", ip: "172.24.0.20", rpcPort: 8545, type: "bootnode" },
    { name: "miner1", ip: "172.24.0.21", rpcPort: 8546, type: "miner" },
    { name: "miner2", ip: "172.24.0.22", rpcPort: 8547, type: "miner" },
    { name: "rpc1", ip: "172.24.0.23", rpcPort: 8548, type: "rpc" },
    // ... cualquier cantidad de nodos
  ],
  initialBalance: "5000000000000000000000000",
  autoResolveSubnetConflicts: true,
});

// API legacy (compatible)
await besuNetwork.create({
  bootnodeIp: string,
  minerIp: string,
  rpcNodes: Array<{ ip: string; port: number }>,
  initialBalance: string,
  autoResolveSubnetConflicts: boolean,
});
```

#### Métodos de Conveniencia

```typescript
// Red simple (bootnode + miner)
await besuNetwork.createSimpleNetwork({
  bootnodeIp: string,
  minerIp: string,
  initialBalance: string,
  autoResolveSubnetConflicts: boolean,
});

// Red multi-miner
await besuNetwork.createMultiMinerNetwork({
  minerCount: number,
  rpcNodeCount: number,
  baseIp: string,
  initialBalance: string,
  autoResolveSubnetConflicts: boolean,
});

// Red escalable automática
await besuNetwork.createScalableNetwork({
  totalNodes: number,
  minerPercentage: number, // % de nodos que serán miners
  rpcPercentage: number, // % de nodos que serán RPC
  baseIp: string,
  initialBalance: string,
  autoResolveSubnetConflicts: boolean,
});

// Red personalizada
await besuNetwork.createCustomNetwork({
  bootnodes: number,
  miners: number,
  rpcNodes: number,
  validators: number, // Nodos tipo 'node'
  baseIp: string,
  initialBalance: string,
  autoResolveSubnetConflicts: boolean,
});
```

#### Gestión Dinámica de Nodos

```typescript
// Agregar nodo dinámicamente
await besuNetwork.addNode({
  name: "nuevo-rpc",
  ip: "172.24.0.30",
  rpcPort: 8555,
  type: "rpc",
});

// Remover nodo
await besuNetwork.removeNode("nuevo-rpc");
```

#### `BesuNetwork.start(besuImage?)`

Inicia todos los contenedores Docker de la red.

```typescript
await besuNetwork.start("hyperledger/besu:latest");
```

#### `BesuNetwork.stop()`

Detiene todos los contenedores de la red.

```typescript
await besuNetwork.stop();
```

#### `BesuNetwork.destroy()`

Elimina completamente la red (contenedores, red Docker y archivos).

```typescript
await besuNetwork.destroy();
```

#### `BesuNetwork.fundMnemonic(mnemonic, amount, count?, rpcUrl?)`

Transfiere fondos a cuentas derivadas de un mnemonic.

```typescript
await besuNetwork.fundMnemonic(
  "test test test test test test test test test test test junk",
  "1", // 1 ETH por cuenta
  10 // 10 cuentas
);
```

## 💰 Financiación de Cuentas Mejorada

La biblioteca incluye una función `fundMnemonic()` completamente rediseñada que proporciona financiación robusta y segura de cuentas:

### Características Principales

- ✅ **Verificación Automática de Balances**: Verifica el balance del miner antes de proceder
- ✅ **Cálculo Inteligente de Gas**: Estima automáticamente los costos de gas y verifica disponibilidad
- ✅ **Gas Price Dinámico**: Obtiene el precio de gas óptimo de la red en tiempo real
- ✅ **Detección de Duplicados**: Evita financiar cuentas que ya tienen balance suficiente
- ✅ **Confirmación de Transacciones**: Espera confirmación de cada transacción antes de continuar
- ✅ **Manejo Robusto de Errores**: Captura y maneja graciosamente errores específicos
- ✅ **Prevención de Conflictos de Nonce**: Pausas estratégicas entre transacciones

### Ejemplo de Uso

```typescript
// Financiar 3 cuentas con 5 ETH cada una
await besuNetwork.fundMnemonic(
  "test test test test test test test test test test test junk",
  "5", // 5 ETH por cuenta
  3, // 3 cuentas
  rpcUrl // RPC endpoint
);
```

### Salida de Ejemplo

```
Funding 3 accounts from mnemonic...
Miner balance: 2000.0 ETH
Required for funding: 15.0 ETH
Estimated gas costs: 0.00126 ETH
Using gas price: 20.0 gwei
✅ Funded account 1: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 - TX: 0x123...
   ✅ Transaction confirmed for account 1
✅ Funded account 2: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 - TX: 0x456...
   ✅ Transaction confirmed for account 2
⏭️  Account 3: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC already has balance (10.0 ETH), skipping
```

### Validaciones Implementadas

1. **Balance Insuficiente**: Verifica que el miner tenga fondos suficientes para todas las transacciones
2. **Estimación de Gas**: Calcula automáticamente los costos de gas con margen de seguridad
3. **Red Activa**: Verifica que la red esté respondiendo antes de proceder
4. **Cuentas Duplicadas**: Evita financiar cuentas que ya tienen balance > 0.1 ETH

### Manejo de Errores

La función maneja específicamente:

- Errores de fondos insuficientes (para inmediatamente)
- Errores de conectividad de red (reintentos automáticos)
- Errores de gas fees (ajuste automático)
- Errores de nonce (pausas entre transacciones)

#### Métodos de Información y Gestión

```typescript
// Getters y utilidades
getNodes(): Map<string, BesuNode>                    // Todos los nodos
getNodeByName(name: string): BesuNode | undefined    // Nodo específico
getNodesByType(type: string): BesuNode[]             // Nodos por tipo
getAllNodeConfigs(): Array<{...}>                   // Configuraciones completas

// Información de red
getNetworkInfo(rpcUrl?: string): Promise<any>        // Info de blockchain
getBalance(address: string, rpcUrl?: string): Promise<bigint> // Balance de cuenta
```

## Clases Utilitarias

### CryptoLib

Utilidades criptográficas para generar claves y firmar mensajes.

```typescript
const crypto = new CryptoLib();
const keyPair = crypto.generateKeyPair("192.168.1.100");
```

### FileService

Gestión de archivos y directorios.

```typescript
const fileService = new FileService("./mi-directorio");
fileService.createFile("ruta", "archivo.txt", "contenido");
```

### DockerNetworkManager

Gestión de redes y contenedores Docker.

```typescript
const docker = new DockerNetworkManager("mi-red");
docker.createNetwork("172.24.0.0/16");
```

## Scripts

```bash
# Compilar TypeScript
npm run build

# Ejecutar tests consolidados (ubicados en _test_/besu.test.ts)
npm run test
npm run test:watch
npm run test:coverage

# Nota: Todos los tests están ahora en un solo archivo consolidado
# que incluye tests unitarios, de integración, resolución de conflictos y conectividad

# Compilar en modo watch
npm run build:watch

# Limpiar archivos compilados
npm run clean

# Limpiar redes Docker conflictivas
npm run cleanup-networks

# Ver información de redes Docker
npm run networks:info
```

# Ejemplos de uso (ubicados en examples/)

```bash
npm run example # Ejemplo básico legacy
npm run example:flexible # Ejemplos de flexibilidad total
npm run example:simple # Ejemplo simple
npm run demo # Demo rápido de flexibilidad
npm run demo:multibootnode # Demo múltiples bootnodes
```

## Tests

Los tests incluyen ejemplos completos de uso del `signerAccount` y del sistema de cuentas:

```bash
npm test # Ejecutar todos los tests (incluye tests de signerAccount y accounts)
npm run test:watch # Ejecutar tests en modo watch
npm run test:coverage # Ejecutar tests con cobertura
```

## Resolución de Problemas

### Error: "Pool overlaps with other one on this address space"

Este error ocurre cuando hay conflictos de subred Docker. La librería incluye resolución automática de conflictos:

```typescript
// Auto-resolución habilitada por defecto
await besuNetwork.create({
  bootnodeIp: "172.24.0.20",
  minerIp: "172.24.0.22",
  autoResolveSubnetConflicts: true, // Por defecto
});
```

También puedes limpiar manualmente las redes conflictivas:

```bash
# Limpiar todas las redes Besu
npm run cleanup-networks

# Ver información de redes actuales
npm run networks:info
```

## Ejemplos de Uso

### Ejemplo 1: Red Totalmente Personalizada

```typescript
const nodes: BesuNodeDefinition[] = [
  // Bootnodes redundantes
  { name: "bootnode1", ip: "172.24.0.10", rpcPort: 8545, type: "bootnode" },
  { name: "bootnode2", ip: "172.24.0.11", rpcPort: 8546, type: "bootnode" },

  // Cluster de miners
  { name: "miner-alpha", ip: "172.24.0.20", rpcPort: 8550, type: "miner" },
  { name: "miner-beta", ip: "172.24.0.21", rpcPort: 8551, type: "miner" },
  { name: "miner-gamma", ip: "172.24.0.22", rpcPort: 8552, type: "miner" },

  // RPC especializados
  { name: "rpc-frontend", ip: "172.24.0.30", rpcPort: 8560, type: "rpc" },
  { name: "rpc-backend", ip: "172.24.0.31", rpcPort: 8561, type: "rpc" },
  { name: "rpc-analytics", ip: "172.24.0.32", rpcPort: 8562, type: "rpc" },

  // Observadores
  { name: "observer1", ip: "172.24.0.40", rpcPort: 8570, type: "node" },
  { name: "observer2", ip: "172.24.0.41", rpcPort: 8571, type: "node" },
];

await besuNetwork.create({ nodes });
```

### Ejemplo 2: Red de Desarrollo Rápida

```typescript
// Crear 15 nodos automáticamente con distribución inteligente
await besuNetwork.createScalableNetwork({
  totalNodes: 15,
  minerPercentage: 25, // ~4 miners
  rpcPercentage: 35, // ~5 RPC endpoints
  baseIp: "172.25.0",
});
```

### Ejemplo 3: Alta Disponibilidad

```typescript
// Red robusta para producción
await besuNetwork.createMultiMinerNetwork({
  minerCount: 5, // 5 miners para redundancia
  rpcNodeCount: 6, // 6 RPC para balanceo de carga
  initialBalance: "10000000000000000000000000", // 10M ETH
});
```

### Ejemplo 4: Gestión Dinámica

```typescript
// Empezar simple
await besuNetwork.createSimpleNetwork();

// Escalar dinámicamente
await besuNetwork.addNode({
  name: "rpc-extra",
  ip: "172.24.0.50",
  rpcPort: 8580,
  type: "rpc",
});

// Optimizar recursos
await besuNetwork.removeNode("rpc-extra");
```

## Arquitectura

La librería está estructurada en varias clases principales:

1. **BesuNetwork**: Clase principal que orquesta toda la red
2. **BesuNode**: Representa un nodo individual de la red
3. **DockerNetworkManager**: Gestiona la infraestructura Docker
4. **FileService**: Maneja archivos y configuraciones
5. **CryptoLib**: Utilidades criptográficas

## Puertos

Por defecto, los puertos RPC externos se mapean sumando 10000 al puerto interno:

- Puerto interno 8545 → Puerto externo 18545
- Puerto interno 8546 → Puerto externo 18546
- Puerto interno 8547 → Puerto externo 18547

## Requisitos

- Node.js 18+
- Docker
- npm o yarn

## Licencia

MIT

## Estructura del Proyecto

```
lib/
├── src/
│   ├── index.ts               # Librería principal
│   └── cleanup-networks.ts    # Utilidad de limpieza Docker
├── examples/                  # Todos los ejemplos de uso
│   ├── example.ts             # Ejemplo básico
│   ├── simple-example.ts      # Ejemplo simple
│   ├── flexible-examples.ts   # Ejemplos de flexibilidad
│   ├── demo-flexibility.ts    # Demo rápido
│   └── multi-bootnode-example.ts # Ejemplo múltiples bootnodes
├── _test_/                    # Todos los archivos de test
│   ├── besu-network.test.ts   # Tests unitarios
│   ├── test-multi-bootnode.ts # Test múltiples bootnodes
│   └── test-conflict-resolution.ts # Test resolución conflictos
├── networks/                  # Redes generadas (temporal)
├── dist/                      # Código compilado
└── coverage/                  # Reportes de cobertura
```

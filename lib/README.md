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
} from "./src/create-besu-networks";

// Configurar la red
const networkConfig: BesuNetworkConfig = {
  name: "mi-red-besu",
  chainId: 1337,
  subnet: "172.24.0.0/16",
  consensus: "clique",
  gasLimit: "0x1fffffffffffff",
  blockTime: 5,
  signerAccounts: [
    {
      address: "0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9",
      weiAmount: "50000000000000000000000", // 50,000 ETH
      minerNode: "miner1",
    },
  ],
};

const besuNetwork = new BesuNetwork(networkConfig);

// Definir cualquier cantidad y tipo de nodos
const nodes: BesuNodeDefinition[] = [
  {
    name: "bootnode",
    ip: "172.24.0.20",
    rpcPort: 8545,
    p2pPort: 30303,
    type: "bootnode",
  },
  {
    name: "miner1",
    ip: "172.24.0.21",
    rpcPort: 8546,
    p2pPort: 30304,
    type: "miner",
  },
  {
    name: "miner2",
    ip: "172.24.0.22",
    rpcPort: 8547,
    p2pPort: 30305,
    type: "miner",
  },
  {
    name: "rpc1",
    ip: "172.24.0.23",
    rpcPort: 8548,
    p2pPort: 30306,
    type: "rpc",
  },
  {
    name: "rpc2",
    ip: "172.24.0.24",
    rpcPort: 8549,
    p2pPort: 30307,
    type: "rpc",
  },
  {
    name: "observer",
    ip: "172.24.0.25",
    rpcPort: 8550,
    p2pPort: 30308,
    type: "node",
  },
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

### Configuración Avanzada con signerAccounts

```typescript
// Configuración con cuentas firmantes para consenso PoA
const advancedNetworkConfig: BesuNetworkConfig = {
  name: "mi-red-avanzada",
  chainId: 1338,
  subnet: "172.25.0.0/16",
  consensus: "clique",
  gasLimit: "0x47E7C4",
  blockTime: 3,
  signerAccounts: [
    {
      address: "0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9",
      weiAmount: "100000000000000000000000", // 100,000 ETH
      minerNode: "miner1",
    },
    {
      address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
      weiAmount: "50000000000000000000000", // 50,000 ETH
      minerNode: "miner2",
    },
  ],
  accounts: [
    {
      address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
      weiAmount: "25000000000000000000000", // 25,000 ETH
    },
  ],
};

const besuAdvanced = new BesuNetwork(advancedNetworkConfig);
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

### SignerAccount

```typescript
interface SignerAccount {
  address: string;
  weiAmount: string;
  minerNode?: string; // Nombre del nodo miner asociado (opcional)
}
```

### BesuNetworkCreateOptions (Nueva API)

```typescript
interface BesuNetworkCreateOptions {
  nodes: BesuNodeDefinition[]; // Lista de nodos a crear
  initialBalance?: string; // Balance inicial (wei)
  autoResolveSubnetConflicts?: boolean; // Resolver conflictos automáticamente
  autoGenerateSignerAccounts?: boolean; // Generar cuentas firmantes automáticamente (por defecto: true)
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
  signerAccounts?: SignerAccount[]; // Lista de cuentas firmantes/validadores (para consenso PoA/IBFT2)
  accounts?: Array<{ address: string; weiAmount: string }>; // Lista de cuentas con balance inicial (en wei)
}
```

**Nota importante sobre las cuentas:**

- `signerAccounts`: Lista de cuentas firmantes con privilegios especiales para consenso PoA. Cada cuenta puede asociarse a un nodo miner específico.
- `accounts`: Array de cuentas adicionales con balance inicial.
- `autoGenerateSignerAccounts`: Si está habilitado (por defecto), se generan automáticamente claves criptográficas para las cuentas firmantes.
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

#### `updateNetworkConfig(network, updates)` - **Nueva Funcionalidad**

Actualiza la configuración de una red existente sin afectar el genesis.

```typescript
import { updateNetworkConfig } from "./src/update-besu-networks";

// Actualizar configuración de red existente
await updateNetworkConfig(network, {
  subnet: "172.60.0.0/16", // Nueva subnet
  gasLimit: "0x5F5E100", // Nuevo gas limit
  blockTime: 15, // Nuevo block time
  nodes: [
    // Actualizar IPs de nodos
    { name: "bootnode1", ip: "172.60.0.20" },
    { name: "miner1", ip: "172.60.0.21" },
    { name: "rpc1", ip: "172.60.0.22" },
  ],
});
```

**Características de updateNetworkConfig:**

- ✅ **Actualización de subnet**: Requiere especificar nuevas IPs para todos los nodos
- ✅ **Validación robusta**: Verifica que las IPs estén en la nueva subnet
- ✅ **Recreación de red Docker**: Automáticamente recrea la infraestructura
- ✅ **Preservación de genesis**: No modifica la configuración del blockchain existente

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
getNetworkConnectivity(): Promise<Array<{...}>>     // Estado de conectividad de nodos

// Gestión dinámica de nodos (nuevas funcionalidades)
addNode(nodeConfig: BesuNodeDefinition): Promise<void>     // Agregar nodo dinámicamente
removeNode(nodeName: string): Promise<void>                // Remover nodo existente
updateNode(nodeName: string, updates: {...}): Promise<void> // Actualizar propiedades de nodo

// Gestión de signerAccounts
getMinerSignerAssociations(): Array<{...}>          // Asociaciones miner-signerAccount
updateSignerAccounts(signerAccounts: SignerAccount[]): Promise<void> // Actualizar cuentas firmantes
```

### Gestión de Cuentas de Red

#### Actualizar Cuentas sin Modificar Genesis

Puedes modificar las cuentas de una red existente sin tocar el archivo genesis:

```typescript
// Método 1: Usando instancia de red existente
const network = new BesuNetwork(config);
await network.updateNetworkAccounts({
  signerAccount: {
    address: "0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9",
    weiAmount: "5000000000000000000000", // 5000 ETH en wei
  },
  accounts: [
    {
      address: "0x8ba1f109551bD432803012645Hac136c22C501e5",
      weiAmount: "1000000000000000000000", // 1000 ETH en wei
    },
    {
      address: "0x617F2E2fD72FD9D5503197092aC168c91465E7f2",
      weiAmount: "2000000000000000000000", // 2000 ETH en wei
    },
  ],
});

// Método 2: Usando método estático por nombre de red
await BesuNetwork.updateNetworkAccountsByName(
  "mi-red-besu",
  {
    signerAccount: {
      address: "0x9fbD1EbdD54E8CE1776B2BE9aEF1dfB10C5b6DDA",
      weiAmount: "10000000000000000000000", // 10000 ETH en wei
    },
    accounts: [
      {
        address: "0x23B608675a2B2fB1890d3ABBd85c5775c51f9641",
        weiAmount: "3000000000000000000000", // 3000 ETH en wei
      },
    ],
  },
  "./networks" // Directorio base donde están las redes
);
```

#### Características de la Gestión de Cuentas

- ✅ **Sin modificar genesis**: El archivo genesis permanece intacto
- ✅ **Configuración interna**: Solo actualiza la configuración interna de la red
- ✅ **Persistencia**: La configuración se guarda en `network-config.json`
- ✅ **Validación automática**: Direcciones Ethereum válidas (formato 0x...)
- ✅ **Validación de cantidades**: Cantidades wei válidas y rangos razonables
- ✅ **Detección de duplicados**: Previene direcciones duplicadas
- ✅ **Formato flexible**: Soporta tanto wei como ETH (usar conversion helpers)

#### Validaciones Aplicadas

El método `updateNetworkAccountsByName` aplica las mismas validaciones que durante la creación de la red:

- **Direcciones**: Formato hexadecimal válido (0x seguido de 40 caracteres hex)
- **Cantidades Wei**: Números positivos válidos
- **Rangos razonables**: Entre 1 wei y 10^30 wei
- **Duplicados**: No se permiten direcciones duplicadas

```typescript
// Ejemplo que muestra manejo de errores de validación
try {
  await BesuNetwork.updateNetworkAccountsByName("mi-red", {
    signerAccount: {
      address: "direccion-invalida", // ❌ Formato inválido
      weiAmount: "-1000", // ❌ Cantidad negativa
    },
  });
} catch (error) {
  console.log("Errores de validación:", error.message);
  // Salida: Validation failed:
  // signerAccount.address: Signer account address must be a valid Ethereum address (0x...)
  // signerAccount.weiAmount: Signer account wei amount must be a valid positive number
}
```

#### Helper para Conversión ETH a Wei

```typescript
function ethToWei(ethAmount: string): string {
  // Usar ethers para conversión precisa
  return ethers.parseEther(ethAmount).toString();
}

// Uso del helper
await network.updateNetworkAccounts({
  signerAccount: {
    address: "0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9",
    weiAmount: ethToWei("1000"), // 1000 ETH convertido a wei
  },
});
```

## Tests de Validación

Todos los tests de validación para las funciones de actualización de cuentas están incluidos en `_test_/besu.test.ts` dentro de la sección "Account Management Tests". Los tests incluyen:

- ✅ Validación de formato de direcciones inválidas
- ✅ Validación de cantidades wei negativas
- ✅ Validación de formatos de wei inválidos
- ✅ Detección de direcciones duplicadas
- ✅ Validación de cantidades fuera de rangos razonables
- ✅ Validación tanto para método de instancia como estático
- ✅ Test del helper de conversión ETH a Wei

```bash
# Ejecutar todos los tests de validación de cuentas
npm test -- --testNamePattern="Account Management Tests"

# Ejecutar tests específicos de validación
npm test -- --testNamePattern="Should validate updateNetworkAccountsByName"
```

## 🧪 Ejecución de Tests

### ⚠️ **Importante: Tests Individuales Obligatorios**

**Todos los tests de esta librería deben ejecutarse de forma individual, nunca en paralelo.** Esto es necesario porque:

- Los tests crean y destruyen redes Docker reales
- Requieren puertos específicos y recursos exclusivos
- Pueden generar conflictos de red si se ejecutan simultáneamente
- Necesitan tiempo para limpiar contenedores Docker entre ejecuciones

### Comandos para Ejecutar Tests Individuales

````bash
# ❌ NO ejecutar todos los tests juntos (puede causar conflictos)
npm test

# ⚠️ **Problema Conocido**: El archivo `update-existing-nodes.test.ts` puede fallar al ejecutar `npm test` completo debido a conflictos de compilación TypeScript, pero funciona correctamente cuando se ejecuta individualmente:

```bash
# ❌ Puede fallar al ejecutar todos los tests
npm test

# ✅ Funciona correctamente cuando se ejecuta individualmente
npm test _test_/update-existing-nodes.test.ts
````

# ✅ Ejecutar tests específicos individualmente

npm test -- --testNamePattern="Basic Network Creation"
npm test -- --testNamePattern="should create a simple Besu network"
npm test -- --testNamePattern="Node Update and Synchronization"
npm test -- --testNamePattern="Account Management Tests"
npm test -- --testNamePattern="Change Besu Network Configuration Tests"

# ✅ Ejecutar por archivo de test específico

npm test _test_/create-besu-networks.test.ts
npm test _test_/update-existing-nodes.test.ts
npm test _test_/adding-miners.test.ts
npm test _test_/adding-bootnode-rpc.test.ts
npm test _test_/removing-node.test.ts
npm test _test_/change-config-besu.test.ts
npm test _test_/toml-update.test.ts

# ✅ Ejecutar un test específico por nombre completo

npm test -- --testNamePattern="should add nodes to existing network and validate integration"
npm test -- --testNamePattern="should update signerAccounts and regenerate TOML files"
npm test -- --testNamePattern="Update network configuration with subnet, gasLimit, blockTime and node IPs"

````

### Tests Disponibles

Esta librería incluye tests comprehensivos que validan diferentes aspectos de la funcionalidad de redes Besu:

#### Tests Principales (`_test_/create-besu-networks.test.ts`)

**Propósito**: Validar funciones básicas de creación de redes, gestión de cuentas y validaciones.

```bash
# Test básico de creación de red
npm test -- --testNamePattern="should create a simple Besu network"

# Test de gestión de cuentas
npm test -- --testNamePattern="Account Management Tests"

# Test de validaciones de nodos
npm test -- --testNamePattern="Node Validation Tests"
```

#### Tests de Actualización de Configuración (`_test_/change-config-besu.test.ts`)

**Propósito**: Validar la funcionalidad de `updateNetworkConfig` para cambios de subnet, gasLimit, blockTime y nodos.

```bash
# Test de actualización completa de configuración
npm test -- --testNamePattern="Update network configuration with subnet, gasLimit, blockTime and node IPs"

# Test de validaciones de actualización
npm test -- --testNamePattern="Validation errors for updateNetworkConfig"
```

**¿Qué valida?**

- ✅ Cambio de subnet con actualización de IPs de todos los nodos
- ✅ Actualización de gasLimit y blockTime
- ✅ Validación de que los nodos existen en la red
- ✅ Validación de que las IPs están en la nueva subnet
- ❌ Detectar errores cuando falta el array de nodos para cambio de subnet

#### Tests de Actualización de Nodos Existentes (`_test_/update-existing-nodes.test.ts`)

**Propósito**: Validar funcionalidad de actualización de propiedades de nodos existentes.

```bash
# Ejecutar tests de actualización de nodos
npm test _test_/update-existing-nodes.test.ts
````

#### Tests de Actualización de Nodos (`_test_/signer-update-new.test.ts`)

**Propósito**: Validar la capacidad de agregar nuevos nodos a redes existentes y las validaciones de consenso Clique.

```bash
# Test de integración de nodos (agregar bootnode, miner y rpc)
npm test -- --testNamePattern="should successfully add nodes to existing network"

# Test de validación de consenso (debe fallar al agregar segundo miner con signerAccount propio)
npm test -- --testNamePattern="should fail validation when adding second miner with its own signerAccount"
```

**¿Qué valida?**

- ✅ Agregar nodos bootnode, miner y RPC a una red existente
- ✅ Verificar que la red se mantiene estable después de agregar nodos
- ❌ Detectar y fallar correctamente cuando se intenta agregar un segundo miner con su propio signerAccount (violación de consenso Clique)

#### Tests de Expansión Multi-Miner (`_test_/multi-miner-expansion.test.ts`)

**Propósito**: Validar que se puede expandir exitosamente una red con múltiples miners cuando se configuran correctamente.

```bash
# Test de expansión exitosa con múltiples miners (3 miners, cada uno con su signerAccount)
npm test -- --testNamePattern="Multi-Miner Network Expansion"

# Ejecutar el archivo completo de tests de expansión multi-miner
npm test _test_/multi-miner-expansion.test.ts
```

#### Tests de Actualización de Nodos Existentes (`_test_/update-existing-nodes.test.ts`)

**Propósito**: Validar funcionalidad de actualización de nodos existentes, incluyendo signerAccounts y validaciones de consenso.

⚠️ **Nota Importante**: Este test puede fallar cuando se ejecuta `npm test` completo debido a conflictos de compilación TypeScript, pero funciona perfectamente cuando se ejecuta individualmente.

```bash
# ✅ Ejecutar individualmente (recomendado)
npm test _test_/update-existing-nodes.test.ts

# ✅ Ejecutar tests específicos de este archivo
npm test -- --testNamePattern="should update signerAccounts and regenerate TOML files"
npm test -- --testNamePattern="should validate signerAccounts format and duplicates"
npm test -- --testNamePattern="should validate miner-signerAccount count mismatch"
```

**¿Qué valida?**

- ✅ Actualización de signerAccounts en redes existentes
- ✅ Regeneración de archivos TOML después de actualizaciones
- ✅ Validación de formato de direcciones Ethereum
- ✅ Detección de direcciones duplicadas
- ✅ Validación de correspondencia entre miners y signerAccounts
- ✅ Persistencia de configuración en archivos JSON

**¿Qué valida?**

- ✅ Crear una red inicial con 1 miner
- ✅ Expandir la red a 3 miners con signerAccounts únicos
- ✅ Verificar que todos los miners tienen asociaciones correctas miner-signerAccount
- ✅ Confirmar que el consenso Clique funciona correctamente con múltiples miners
- ✅ Validar la sincronización y estabilidad de la red expandida

### Resumen de Validaciones

| Test                           | Tipo       | Resultado Esperado | Tiempo Aprox. |
| ------------------------------ | ---------- | ------------------ | ------------- |
| Basic Network Creation         | Funcional  | ✅ PASS            | 30-60s        |
| Account Management             | Validación | ✅ PASS            | 15-30s        |
| Node Integration               | Funcional  | ✅ PASS            | 90-120s       |
| Consensus Validation (Failure) | Validación | ❌ FAIL (esperado) | 90-120s       |
| Multi-Miner Expansion          | Funcional  | ✅ PASS            | 120-180s      |

### Tiempos de Ejecución Esperados

- **Tests básicos**: 30-60 segundos
- **Tests de actualización de nodos**: 1.5-2.5 minutos
- **Tests de integración completa**: 2-3 minutos

### Troubleshooting

Si encuentras errores al ejecutar tests:

```bash
# Limpiar contenedores Docker antes de ejecutar tests
docker container prune -f
docker network prune -f

# Verificar que Docker esté ejecutándose
docker ps

# Ejecutar test específico con más información de debug
npm test -- --testNamePattern="nombre-del-test" --verbose
```

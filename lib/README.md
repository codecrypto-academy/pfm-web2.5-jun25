# Besu Network Library

Una librería TypeScript para crear y gestionar redes privadas de Hyperledger Besu usando Docker.

## Características

- 🐳 **Gestión de Docker**: Creación y gestión automática de contenedores Besu
- 🔐 **Criptografía**: Generación de claves, direcciones y wallets derivadas
- 🌐 **Redes Clique PoA**: Configuración automática del protocolo Clique
- 💰 **Transferencias**: Realización de transacciones entre direcciones
- 🧪 **Tests**: Suite completa de tests para validar funcionalidad
- 📦 **TypeScript**: Tipado completo para mejor desarrollo

## Instalación

```bash
npm install
```

## Uso

### Configuración básica

```typescript
import { createNetworkService, CryptoUtils } from 'besu-network-lib';

// Crear servicio de red con configuración por defecto
const networkService = createNetworkService();

// Inicializar la red
await networkService.initializeNetwork();
```

### Generación de cuentas

```typescript
// Generar cuentas derivadas de un mnemónico
const mnemonic = 'test test test test test test test test test test test junk';
const result = await networkService.generateAccounts(mnemonic, 10);

console.log('Cuentas generadas:', result.accounts);
console.log('Archivo de cuentas:', result.accountsFile);
```

### Realizar transferencias

```typescript
// Realizar transferencias en la red
const results = await networkService.performTransfers(
  'http://localhost:8545',
  '0x1234567890abcdef...', // Clave privada del minero
  mnemonic,
  'accounts.json'
);

console.log('Resultados de transferencias:', results);
```

### Utilidades de criptografía

```typescript
// Generar par de claves
const keyPair = CryptoUtils.generateKeyPair();

// Generar direcciones derivadas
const addresses = CryptoUtils.generateDerivedAddresses(mnemonic, 5);

// Validar direcciones
const isValid = CryptoUtils.isValidAddress('0x1234...');

// Guardar direcciones en archivo
await CryptoUtils.saveAddressesToFile(addresses, 'accounts.json');
```

### Estado de la red

```typescript
// Obtener estado de la red
const status = await networkService.getNetworkStatus();

console.log('Red ejecutándose:', status.isRunning);
console.log('Nodos activos:', status.runningNodes);
console.log('Total de nodos:', status.totalNodes);
```

### Limpieza

```typescript
// Limpiar recursos de la red
await networkService.cleanup();
```

## Configuración

### Configuración por defecto

```typescript
import { DEFAULT_NETWORK_CONFIG } from 'besu-network-lib';

const config = {
  ...DEFAULT_NETWORK_CONFIG,
  networkName: 'mi-red-personalizada',
  chainId: 12345
};
```

### Configuración personalizada

```typescript
import { NetworkService } from 'besu-network-lib';

const customConfig = {
  chainId: 13371337,
  networkName: 'besu-network',
  subnet: '172.28.0.0/16',
  nodes: [
    {
      name: 'bootnode',
      type: 'bootnode',
      port: 30303,
      ip: '172.28.0.2'
    },
    {
      name: 'miner-node',
      type: 'miner',
      port: 30303,
      rpcPort: 8545,
      ip: '172.28.0.3'
    },
    {
      name: 'rpc-node8545',
      type: 'rpc',
      port: 30303,
      rpcPort: 8546,
      ip: '172.28.0.4'
    }
  ],
  genesisConfig: {
    chainId: 13371337,
    gasLimit: '0x1fffffffffffff',
    difficulty: '0x1',
    blockPeriodSeconds: 4,
    epochLength: 30000,
    alloc: {}
  }
};

const networkService = new NetworkService(customConfig);
```

## Tests

### Ejecutar tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:coverage
```

### Tests incluidos

- **CryptoUtils**: Tests para utilidades de criptografía
- **NetworkService**: Tests para gestión de red (con mocks)
- **Validación**: Tests para validación de direcciones y mnemónicos
- **Integración**: Tests para flujos completos

## Estructura del proyecto

```
lib/
├── src/
│   ├── types/           # Definiciones de tipos TypeScript
│   ├── utils/           # Utilidades (criptografía, etc.)
│   ├── services/        # Servicios principales
│   ├── test/           # Tests
│   └── index.ts        # Punto de entrada principal
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Requisitos

- Node.js >= 18.0.0
- Docker
- TypeScript

## Dependencias principales

- **ethers**: Interacción con blockchain
- **dockerode**: API de Docker
- **fs-extra**: Operaciones de archivos
- **elliptic**: Criptografía
- **keccak256**: Hashing

## Scripts disponibles

```bash
npm run build          # Compilar TypeScript
npm run dev           # Compilar en modo watch
npm run test          # Ejecutar tests
npm run test:watch    # Tests en modo watch
npm run test:coverage # Tests con cobertura
npm run clean         # Limpiar archivos compilados
npm run lint          # Linting
```

## Ejemplo completo

```typescript
import { createNetworkService, CryptoUtils } from 'besu-network-lib';

async function main() {
  try {
    // 1. Crear servicio de red
    const networkService = createNetworkService();
    
    // 2. Inicializar red
    console.log('🚀 Inicializando red...');
    await networkService.initializeNetwork();
    
    // 3. Generar cuentas
    console.log('📝 Generando cuentas...');
    const mnemonic = CryptoUtils.generateMnemonic();
    const accounts = await networkService.generateAccounts(mnemonic, 10);
    
    // 4. Realizar transferencias
    console.log('💰 Realizando transferencias...');
    const results = await networkService.performTransfers(
      'http://localhost:8545',
      '0x1234567890abcdef...',
      mnemonic,
      accounts.accountsFile
    );
    
    // 5. Verificar estado
    const status = await networkService.getNetworkStatus();
    console.log('✅ Red funcionando:', status.isRunning);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
```

## Contribuir

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

MIT 
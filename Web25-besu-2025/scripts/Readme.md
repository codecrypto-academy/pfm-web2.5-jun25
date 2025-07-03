# Herramientas y Scripts de Automatización para Redes Hyperledger Besu

## Descripción Técnica

Este directorio contiene un conjunto completo de herramientas de automatización para la creación, gestión y monitorización de redes Hyperledger Besu. Los scripts facilitan la administración de redes blockchain privadas y la interacción con la infraestructura.

## Componentes del Sistema

### 1. Scripts de Gestión de Red

#### besu-ethers-toolkit.js
```javascript
// Herramienta para interactuar con la red Besu
class BesuToolkit {
  constructor(config) {
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  async getBalance(address) {
    return this.provider.getBalance(address);
  }

  async deployContract(abi, bytecode, ...args) {
    const factory = new ethers.ContractFactory(abi, bytecode, this.wallet);
    return factory.deploy(...args);
  }
}
```

### 2. Utilidades de Red

#### Gestión de MongoDB
```bash
# Configuración de MongoDB
./mongodb-docker-setup.sh
```

Características:
- Configuración automatizada de MongoDB
- Creación de usuarios y bases de datos
- Configuración de autenticación
- Persistencia de datos

#### Gestión de Claves
```bash
# Generación de claves
./generate-keys.sh [nombre-nodo]
```

Funcionalidades:
- Generación de claves secp256k1
- Gestión de claves privadas
- Exportación de claves públicas
- Derivación de direcciones Ethereum

### 3. Herramientas de Monitorización

#### Estado de Red
```typescript
interface NetworkStatus {
  bootnode: {
    enode: string;
    peers: number;
  };
  validators: {
    active: number;
    total: number;
  };
  blocks: {
    height: number;
    pending: number;
  };
}
```

#### Métricas de Rendimiento
- TPS (Transacciones por segundo)
- Tiempo de bloque
- Uso de recursos
- Estado de sincronización

### 4. Scripts de Mantenimiento

#### Backup y Restauración
```bash
# Backup de red
./backup-network.sh [nombre-red]

# Restauración
./restore-network.sh [nombre-red] [backup-file]
```

#### Limpieza y Reset
```bash
# Limpieza de datos
./cleanup.sh [nombre-red]

# Reset completo
./reset-network.sh [nombre-red]
```

## Uso de los Scripts

### 1. Creación de Red
```bash
# Crear nueva red
./create-network.sh \
  --name mi-red \
  --nodes 4 \
  --subnet "172.16.239.0/24"
```

### 2. Gestión de Nodos
```bash
# Añadir nodo
./add-node.sh \
  --network mi-red \
  --type validator \
  --port 30303

# Eliminar nodo
./remove-node.sh \
  --network mi-red \
  --node-id validator1
```

### 3. Monitorización
```bash
# Ver estado de red
./network-status.sh mi-red

# Ver logs de nodo
./node-logs.sh mi-red validator1
```

## Solución de Problemas

### 1. Problemas Comunes
- Error de conexión a MongoDB
- Fallo en la sincronización de nodos
- Problemas de consenso
- Errores de Docker

### 2. Logs y Diagnóstico
```bash
# Ver logs detallados
./debug-logs.sh [nombre-red]

# Verificar conectividad
./check-connectivity.sh [nombre-red]
```

## Seguridad

### 1. Gestión de Claves
- Almacenamiento seguro de claves
- Rotación periódica
- Backups cifrados

### 2. Acceso y Autenticación
- Control de acceso basado en roles
- Autenticación de nodos
- Firewalls y reglas de red

## Referencias

- [Documentación Besu](https://besu.hyperledger.org/)
- [Docker Documentation](https://docs.docker.com/)
- [MongoDB Manual](https://www.mongodb.com/docs/)
### 5. Scripts Principales

#### Script besu_network.ps1
Este script PowerShell automatiza:
- Creación de una red Docker dedicada con rango de IP personalizado
- Generación de claves (privada, pública, enode, dirección) para cada nodo usando `index.mjs`
- Creación del archivo `genesis.json` con configuración Clique (Proof of Authority)

```powershell
# Desde el directorio scripts
./besu_network.ps1
```

Asegúrese de que Docker esté instalado y ejecutándose.

#### Script index.mjs

Este script Node.js proporciona utilidades para la gestión de nodos y la interacción con la red Besu:

```javascript
// Comandos disponibles
const commands = {
  'create-keys': 'Genera par de claves, dirección Ethereum y enode para un nodo',
  'network-info': 'Muestra información de red vía JSON-RPC',
  'balance': 'Consulta el saldo de una dirección',
  'transfer': 'Realiza transferencia entre cuentas'
};

// Ejemplos de uso
```

##### Ejemplos de Uso

```bash
# Generar claves para un nodo
node index.mjs create-keys <ip>

# Obtener información de red
node index.mjs network-info [url]

# Consultar saldo
node index.mjs balance <address>

# Realizar transferencia
node index.mjs transfer <fromPrivate> <to> <amount>
```

Reemplace `<ip>`, `<address>`, `<fromPrivate>`, `<to>`, `<amount>` con los valores correspondientes.

---
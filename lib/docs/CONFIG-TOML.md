# Configuración TOML para Nodos Besu con Consenso Clique

Esta guía explica cómo usar archivos `config.toml` para configurar nodos Besu con consenso Clique que se conectan al bootnode.

## ¿Qué es config.toml?

El archivo `config.toml` es un archivo de configuración en formato TOML que permite definir todas las opciones de un nodo Besu de manera organizada y legible, en lugar de usar múltiples parámetros de línea de comandos.

## Ventajas de usar config.toml

- **Configuración más limpia**: Evita comandos Docker largos con muchos parámetros
- **Fácil mantenimiento**: Los archivos de configuración son más fáciles de editar y versionar
- **Reutilización**: La misma configuración puede usarse en diferentes entornos
- **Organización**: Agrupa opciones relacionadas de manera lógica
- **Documentación**: Permite añadir comentarios explicativos

## Estructura del archivo config.toml

### Configuración básica para un nodo

```toml
# Configuración del Nodo Besu
# Generado automáticamente

# Configuración de datos
data-path="/data"
genesis-file="/genesis.json"

# Configuración de red
network-id=1337
p2p-enabled=true
p2p-host="0.0.0.0"
p2p-port=30303
max-peers=25
discovery-enabled=true

# Configuración de bootnode
bootnodes=["enode://abc123...@172.18.0.2:30303"]

# Configuración RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH", "NET", "WEB3", "ADMIN", "DEBUG"]

# Configuración de minería
miner-enabled=true
miner-coinbase="0x..."
miner-stratum-enabled=false

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

# Configuración de logging
logging="INFO"
```

### Configuración para bootnode

El bootnode no necesita la sección `bootnodes` ya que es el primer nodo de la red:

```toml
# Configuración del Bootnode Besu
# Generado automáticamente

# Configuración de datos
data-path="/data"
genesis-file="/genesis.json"

# Configuración de red
network-id=1337
p2p-enabled=true
p2p-host="0.0.0.0"
p2p-port=30303
max-peers=25
discovery-enabled=true

# Configuración RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH", "NET", "WEB3", "ADMIN", "DEBUG"]

# Configuración de minería
miner-enabled=true
miner-coinbase="0x..."
miner-stratum-enabled=false

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

# Configuración de logging
logging="INFO"
```

## Uso con el ConfigGenerator

### Generar archivos config.toml automáticamente

```typescript
import { createBesuNetwork } from 'besu-network-manager';

const networkConfig: BesuNetworkConfig = {
  name: 'mi-red-besu',
  chainId: 1337,
  consensusProtocol: 'clique',
  blockPeriod: 15,
  nodeCount: 4,
  baseRpcPort: 8545,
  baseP2pPort: 30303,
  dataDir: './data/mi-red-besu'
};

const networkManager = createBesuNetwork(networkConfig);

// Inicializar la red
await networkManager.initialize();

// Generar archivos config.toml para Clique
await networkManager.generateConfigFiles();

// O generar con un bootnode específico
const bootnodeEnode = 'enode://abc123...@172.18.0.2:30303';
await networkManager.generateConfigFiles(bootnodeEnode);
```



## Uso con Docker

### Comando Docker con config.toml

```bash
# Iniciar nodo usando archivo config.toml
docker run -d \
  --name besu-node-1 \
  --network besu-network \
  -v /ruta/al/nodo/data:/data \
  -v /ruta/al/genesis.json:/genesis.json \
  -v /ruta/al/config.toml:/config.toml \
  -p 8545:8545 \
  -p 30303:30303 \
  hyperledger/besu:latest \
  --config-file=/config.toml
```

### Docker Compose con config.toml

```yaml
version: '3.8'
services:
  besu-bootnode:
    image: hyperledger/besu:latest
    container_name: besu-bootnode
    command: ["--config-file=/config.toml"]
    volumes:
      - ./data/node-0:/data
      - ./genesis.json:/genesis.json
      - ./data/node-0/config.toml:/config.toml
    ports:
      - "8545:8545"
      - "30303:30303"
    networks:
      - besu-network

  besu-node-1:
    image: hyperledger/besu:latest
    container_name: besu-node-1
    command: ["--config-file=/config.toml"]
    volumes:
      - ./data/node-1:/data
      - ./genesis.json:/genesis.json
      - ./data/node-1/config.toml:/config.toml
    ports:
      - "8546:8545"
      - "30304:30303"
    networks:
      - besu-network
    depends_on:
      - besu-bootnode

networks:
  besu-network:
    driver: bridge
```

## Opciones de configuración importantes

### Configuración de red
- `network-id`: ID de la red blockchain
- `p2p-host`: Dirección IP para conexiones P2P
- `p2p-port`: Puerto para conexiones P2P
- `bootnode`: Lista de nodos bootnode para conectarse

### Configuración RPC
- `rpc-http-enabled`: Habilitar API HTTP
- `rpc-http-host`: Dirección IP para API HTTP
- `rpc-http-port`: Puerto para API HTTP
- `rpc-http-api`: APIs habilitadas

### Configuración de minería
- `miner-enabled`: Habilitar minería/validación
- `miner-coinbase`: Dirección para recibir recompensas

### Configuración de sincronización
- `sync-mode`: Modo de sincronización (FULL, FAST, SNAP)

## Personalización

Puedes añadir configuraciones adicionales directamente en el archivo config.toml:

```toml
# Configuración personalizada para métricas
metrics-enabled=true
metrics-host="0.0.0.0"
metrics-port=9545

# Configuración de pruning
pruning-enabled=true
pruning-blocks-retained=1024

# Configuración específica para Clique
# El período de bloque se define en el genesis, no aquí
```

## Ubicación de archivos

Los archivos `config.toml` se generan en el directorio de datos de cada nodo:

```
data/
├── node-0/
│   ├── config.toml    # Configuración del bootnode
│   ├── key            # Clave privada del nodo
│   ├── key.pub        # Clave pública del nodo
│   └── address        # Dirección del nodo
├── node-1/
│   ├── config.toml    # Configuración del nodo 1
│   ├── key
│   ├── key.pub
│   └── address
└── genesis.json       # Archivo genesis compartido
```

## Troubleshooting

### Problemas comunes

1. **Nodo no se conecta al bootnode**
   - Verificar que el enode del bootnode sea correcto
   - Asegurar que los puertos estén abiertos
   - Verificar la configuración de red Docker

2. **Error de permisos en archivos**
   - Verificar permisos de lectura en config.toml
   - Asegurar que el directorio de datos sea accesible

3. **Configuración no aplicada**
   - Verificar que se use `--config-file=/config.toml`
   - Comprobar sintaxis TOML
   - Revisar logs de Besu para errores de configuración

### Validación de configuración

Puedes validar la configuración antes de iniciar el nodo:

```bash
# Validar sintaxis TOML
docker run --rm \
  -v /ruta/al/config.toml:/config.toml \
  hyperledger/besu:latest \
  --config-file=/config.toml \
  --help
```

## Referencias

- [Documentación oficial de Besu](https://besu.hyperledger.org/)
- [Formato TOML](https://toml.io/)
- [Opciones de configuración de Besu](https://besu.hyperledger.org/en/stable/Reference/CLI/CLI-Syntax/)
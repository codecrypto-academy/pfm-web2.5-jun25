# Nivel 1 - Script de Despliegue Besu

Script bash automatizado para desplegar múltiples nodos Hyperledger Besu con protocolo Clique (PoA).

## Características

- ✅ Despliegue automático de 3 nodos Besu
- ✅ Configuración de protocolo Clique (Proof of Authority)
- ✅ Red Docker personalizada
- ✅ Génesis block customizado
- ✅ Generación automática de claves de validadores
- ✅ Configuración de bootnodes
- ✅ Transacciones de prueba
- ✅ Logging detallado
- ✅ Manejo robusto de errores
- ✅ Cleanup automático de recursos

## Requisitos

- Docker instalado y funcionando
- curl (para testing)
- jq (para parsing JSON)
- Bash 4.0+

### Instalación de dependencias (Ubuntu/WSL)

```bash
sudo apt update
sudo apt install -y curl jq docker.io
sudo usermod -aG docker $USER
# Reiniciar sesión o ejecutar: newgrp docker
```

## Uso

### Iniciar la red

```bash
./script.sh start
```

### Detener la red

```bash
./script.sh stop
```

### Ver estado

```bash
./script.sh status
```

## Configuración

El script utiliza las siguientes configuraciones por defecto:

- **Chain ID**: 1337
- **Número de nodos**: 3
- **Puerto RPC base**: 8545 (8545, 8546, 8547)
- **Puerto P2P base**: 30303 (30303, 30304, 30305)
- **Protocolo**: Clique con bloques cada 15 segundos
- **Red Docker**: `besu-network`

## Estructura de archivos generados

```
script/
├── script.sh
├── README.md
├── data/           # Datos de los nodos (generado)
│   ├── node0/
│   ├── node1/
│   └── node2/
└── config/         # Configuración (generado)
    └── genesis.json
```

## Endpoints RPC

Una vez iniciada la red, los nodos estarán disponibles en:

- **Nodo 0**: http://localhost:8545
- **Nodo 1**: http://localhost:8546
- **Nodo 2**: http://localhost:8547

## Ejemplos de uso

### Consultar número de bloque

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

### Consultar peers conectados

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
  http://localhost:8545
```

### Ver información de la red

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[],"id":1}' \
  http://localhost:8545
```

## Troubleshooting

### Error: "Cannot connect to Docker daemon"

```bash
# Verificar que Docker esté corriendo
sudo systemctl start docker

# Verificar permisos
sudo usermod -aG docker $USER
newgrp docker
```

### Error: "Port already in use"

```bash
# Detener la red existente
./script.sh stop

# O verificar procesos usando los puertos
sudo netstat -tulpn | grep :8545
```

### Error: "jq: command not found"

```bash
# Instalar jq
sudo apt install jq
```

### Logs de los nodos

```bash
# Ver logs de un nodo específico
docker logs besu-node0
docker logs besu-node1
docker logs besu-node2

# Seguir logs en tiempo real
docker logs -f besu-node0
```

## Características técnicas

- **Protocolo de consenso**: Clique (PoA)
- **Tiempo de bloque**: 15 segundos
- **APIs habilitadas**: ETH, NET, CLIQUE
- **CORS**: Habilitado para todos los orígenes
- **Minería**: Habilitada en todos los nodos
- **Bootnodes**: Configuración automática
- **Persistencia**: Datos almacenados en volúmenes Docker

## Seguridad

⚠️ **IMPORTANTE**: Este script está diseñado para desarrollo y testing. NO usar en producción:

- Las claves privadas están hardcodeadas
- CORS está abierto a todos los orígenes
- No hay autenticación en las APIs
- Los puertos están expuestos públicamente

## Próximos pasos

Este script forma la base para los siguientes niveles:

- **Nivel 2**: Librería TypeScript para gestión programática
- **Nivel 3**: API REST con NextJS
- **Nivel 4**: Frontend web para gestión visual
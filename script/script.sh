#!/bin/bash

# Salir si ocurre un error
set -e

# Ir al directorio donde está el script, para asegurar rutas válidas
cd "$(dirname "$0")"
WORKDIR="$(pwd)"

echo "==== VERIFICANDO DOCKER ===="

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
  echo "Docker no está instalado o no está disponible en el PATH. Abortando."
  exit 1
fi

echo "==== LIMPIANDO CONFIGURACIÓN PREVIA ===="

# Eliminar contenedores antiguos con la etiqueta personalizada
docker rm -f $(docker ps -aq --filter "label=network=besu-network") 2>/dev/null || true

# Eliminar red de Docker si existe
docker network rm besu-network 2>/dev/null || true

# Eliminar directorio de configuración anterior
rm -rf "$WORKDIR/networks/besu-network"

echo "==== CREANDO ESTRUCTURA Y RED ===="

# Crear red de Docker con subnet específica
docker network create besu-network \
  --subnet "172.28.0.0/16" \
  --label network=besu-network

# Crear directorios para nodos
mkdir -p "$WORKDIR/networks/besu-network"/{bootnode,miner-node,rpc-node8545}

# Crear claves para nodos (usando rutas absolutas)
node "$WORKDIR/createPrivatePublicKeys.mjs" createKeys "$WORKDIR/networks/besu-network/miner-node"
node "$WORKDIR/createPrivatePublicKeys.mjs" createKeys "$WORKDIR/networks/besu-network/rpc-node8545"
node "$WORKDIR/createPrivatePublicKeys.mjs" createKeysAndEnode 172.28.0.2 30303 "$WORKDIR/networks/besu-network/bootnode"

# Guardar mnemonic que será usado para derivar las cuentas
MNEMONIC="test test test test test test test test test test test junk"

# Generar accounts.json con las 10 direcciones derivadas
node "$WORKDIR/generateAccounts.mjs" "$MNEMONIC"

# Leer las cuentas desde accounts.json
ACCOUNTS=$(cat accounts.json | jq -r '.[]')

# Obtener la dirección del minero
MINER_ADDRESS=$(cat "$WORKDIR/networks/besu-network/miner-node/address")

# Generar sección "alloc" dinámicamente
ALLOC_ENTRIES="\"$MINER_ADDRESS\": {\"balance\": \"0x200000000000000000000000000000000000000000000000000000000000000\"},"
for addr in $ACCOUNTS; do
  ALLOC_ENTRIES+="\"$addr\": {\"balance\": \"0x200000000000000000000000000000000000000000000000000000000000000\"},"
done
# Eliminar coma final
ALLOC_ENTRIES="${ALLOC_ENTRIES%,}"

echo "==== CREANDO ARCHIVO GENESIS (CLIQUE PoA) ===="

cat > "$WORKDIR/networks/besu-network/genesis.json" << EOF
{
  "config": {
    "chainId": 13371337,
    "londonBlock": 0,
    "clique": {
      "blockperiodseconds": 4,
      "epochlength": 30000,
      "createemptyblocks": true
    }
  },
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000$(cat "$WORKDIR/networks/besu-network/miner-node/address")0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "alloc": {
    $ALLOC_ENTRIES
  }
}
EOF


echo "==== CREANDO CONFIG.TOML PARA NODOS ===="

# Config general para nodos (miner, rpc)
cat > "$WORKDIR/networks/besu-network/config.toml" << EOF
genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
bootnodes=["$(cat "$WORKDIR/networks/besu-network/bootnode/enode")"]
discovery-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
EOF

# Config exclusiva para el bootnode (sin bootnodes definidos)
cat > "$WORKDIR/networks/besu-network/bootnode-config.toml" << EOF
genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
discovery-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
EOF

echo "==== INICIANDO NODOS DOCKER ===="

# Bootnode
docker run -d \
  --name bootnode \
  --label network=besu-network \
  --network besu-network \
  --ip 172.28.0.2 \
  -v "$WORKDIR/networks/besu-network:/data" \
  hyperledger/besu:latest \
  --config-file=/data/bootnode-config.toml \
  --data-path=/data/bootnode/data \
  --node-private-key-file=/data/bootnode/key

# Nodo minero
docker run -d \
  --name miner-node \
  --label network=besu-network \
  --network besu-network \
  --ip 172.28.0.3 \
  -v "$WORKDIR/networks/besu-network:/data" \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/miner-node/data \
  --node-private-key-file=/data/miner-node/key

# Nodo RPC (expuesto al exterior en el puerto 8545)
docker run -d \
  --name rpc-node8545 \
  --label network=besu-network \
  --network besu-network \
  --ip 172.28.0.4 \
  -p 8545:8545 \
  -v "$WORKDIR/networks/besu-network:/data" \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/rpc-node8545/data \
  --node-private-key-file=/data/rpc-node8545/key

echo "==== ESPERANDO INICIALIZACIÓN DE NODOS (15 segundos) ===="
sleep 15

echo "==== REALIZANDO TRANSACCIÓN DE PRUEBA ===="

# Ejecutar script de transferencia desde el nodo minero a las cuentas generadas por el mnemonic
node "$WORKDIR/transfer.js" http://localhost:8545 0x$(cat "$WORKDIR/networks/besu-network/miner-node/key") "$MNEMONIC"

#!/bin/bash

# Usage: ./deploy.sh [NUM_ADDITIONAL_NODES]
# Example: ./deploy.sh 5  (esto creará 3 nodos base + 5 nodos adicionales = 8 total)
# Example: ./deploy.sh    (esto creará solo los 3 nodos base)

set -e

# Validar que el argumento sea un número si se proporciona
if [ $# -gt 0 ]; then
  if ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "Error: El argumento debe ser un número entero positivo"
    echo "Uso: $0 [NUM_NODOS_ADICIONALES]"
    exit 1
  fi
  ADDITIONAL_NODES=$1
else
  ADDITIONAL_NODES=0
fi

TOTAL_NODES=$((3 + ADDITIONAL_NODES))
NETWORK_NAME="besu-network"
NETWORK_DIR="networks/$NETWORK_NAME"
SUBNET="172.25.0.0/16"
BOOTNODE_IP="172.25.0.10"
RPC_NODE_IP="172.25.0.11"
MINER_NODE_IP="172.25.0.12"

echo "Desplegando red con $TOTAL_NODES nodos (3 base + $ADDITIONAL_NODES adicionales)..."
echo "Limpiando red Docker y cualquier base de datos previa..."
docker ps -aq --filter "label=network=$NETWORK_NAME" | xargs docker rm -f 2>/dev/null || true
docker network rm $NETWORK_NAME 2>/dev/null || true
rm -rf $NETWORK_DIR
find . -type d -name "data" -exec rm -rf {} + 2>/dev/null || true

echo "Creando red Docker..."
docker network create --subnet=$SUBNET --label network=$NETWORK_NAME --label type=besu $NETWORK_NAME

echo "Verificando Node.js y dependencias..."
if ! command -v node &> /dev/null; then
  echo "Node.js no está instalado. Instálalo antes de continuar."
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install elliptic ethers keccak256 node-fetch
fi

# Crear directorio para la red
mkdir ./besu-network

# Crear directorio para cada nodo
mkdir ./besu-network/bootnode
mkdir ./besu-network/rpc-node
mkdir ./besu-network/miner-node

# Crear directorios para nodos adicionales
for i in $(seq 1 $ADDITIONAL_NODES); do
  mkdir ./besu-network/node-$i
done

# Crear par de llaves para nodos base
node ./index.mjs createKeys "./besu-network/miner-node"
node ./index.mjs createKeys "./besu-network/rpc-node"

# Crear llaves para nodos adicionales
for i in $(seq 1 $ADDITIONAL_NODES); do
  node ./index.mjs createKeys "./besu-network/node-$i"
done

# Crear llaves y enode para el bootnode
node ./index.mjs createKeysAndEnode "$BOOTNODE_IP" "30303" "./besu-network/bootnode"

# Construir extraData para el archivo génesis (incluir todos los nodos como validadores)
EXTRA_DATA="0x0000000000000000000000000000000000000000000000000000000000000000"
EXTRA_DATA+="$(cat ./besu-network/miner-node/address)"

# Agregar direcciones de nodos adicionales como validadores
for i in $(seq 1 $ADDITIONAL_NODES); do
  EXTRA_DATA+="$(cat ./besu-network/node-$i/address)"
done

EXTRA_DATA+="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

# Crear archivo génesis
cat > ./besu-network/genesis.json << EOF
{
    "config": {
        "chainId": 246700,
        "londonBlock": 0,
        "clique": {
            "blockperiodseconds": 4,
            "epochlenght": 30000,
            "createemptyblocks": true  
        }
    },
    "extraData": "$EXTRA_DATA",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "alloc": {
        "0x$(cat ./besu-network/miner-node/address)": {
            "balance": "0x20000000000000000000000000000000000000000000000000000000000"
        }
    }
}
EOF

# Crear archivo config.toml base
cat > ./besu-network/config.toml << EOF
genesis-file="/data/genesis.json"

p2p-host="0.0.0.0"
p2p-port="30303"
p2p-enabled=true

bootnodes=[
"$(cat ./besu-network/bootnode/enode)"
]

discovery-enabled=true

rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
EOF

# Crear archivo bootnode-config.toml
cat > ./besu-network/bootnode-config.toml << EOF
genesis-file="/data/genesis.json"

p2p-host="0.0.0.0"
p2p-port="30303"
p2p-enabled=true

discovery-enabled=true

rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
EOF

# Levantar contenedor de bootnode primero
echo "Levantando bootnode..."
docker run -d --name bootnode --label network=$NETWORK_NAME --network $NETWORK_NAME --ip $BOOTNODE_IP \
-v ./besu-network/:/data hyperledger/besu:latest \
--config-file=/data/bootnode-config.toml \
--data-path=/data/bootnode/data \
--node-private-key-file=/data/bootnode/key

sleep 5

# Levantar contenedor de nodo minero
echo "Levantando nodo minero..."
docker run -d --name miner-node --label network=$NETWORK_NAME --network $NETWORK_NAME --ip $MINER_NODE_IP \
-v ./besu-network:/data hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/miner-node/data \
--node-private-key-file=/data/miner-node/key \
--miner-enabled=true \
--miner-coinbase=0x$(cat ./besu-network/miner-node/address)

# Levantar contenedor para nodo RPC
echo "Levantando nodo RPC..."
docker run -d --name rpc-node --label network=$NETWORK_NAME --network $NETWORK_NAME --ip $RPC_NODE_IP \
-p 1002:8545 \
-v ./besu-network/:/data hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/rpc-node/data \
--node-private-key-file=/data/rpc-node/key

sleep 5

# Levantar nodos adicionales
if [ $ADDITIONAL_NODES -gt 0 ]; then
  for i in $(seq 1 $ADDITIONAL_NODES); do
    NODE_IP="172.25.0.$((12+i))"
    echo "Levantando nodo adicional $i en IP $NODE_IP..."
    
    docker run -d --name node-$i --label network=$NETWORK_NAME --network $NETWORK_NAME --ip $NODE_IP \
    -v ./besu-network/:/data hyperledger/besu:latest \
    --config-file=/data/config.toml \
    --data-path=/data/node-$i/data \
    --node-private-key-file=/data/node-$i/key \
    --miner-enabled=true \
    --miner-coinbase=0x$(cat ./besu-network/node-$i/address)
    
    sleep 2
  done
else
  echo "No se levantan nodos adicionales (solo 3 nodos base)"
fi

echo "Esperando que el nodo RPC esté listo..."
until curl -s http://localhost:1002 > /dev/null; do
  echo "Esperando a que RPC exponga el endpoint en 1002..."
  sleep 2
done

# Realizar transacción de prueba
FROM_PRIV_KEY=$(cat ./besu-network/miner-node/key)
TO_ADDRESS="0x$(cat ./besu-network/bootnode/address)"

echo "Enviando 0.01 ETH desde nodo minero a bootnode..."
node index.mjs transfer $FROM_PRIV_KEY $TO_ADDRESS 0.01 http://localhost:1002
sleep 2

echo "Verificando balance..."
node index.mjs balance $TO_ADDRESS http://localhost:1002

echo ""
echo "=== RED DESPLEGADA EXITOSAMENTE ==="
echo "Nodos totales: $TOTAL_NODES"
echo "Nodos base: 3 (bootnode + RPC + miner)"
echo "Nodos adicionales: $ADDITIONAL_NODES"
echo ""
echo "Bootnode: $BOOTNODE_IP"
echo "Nodo RPC: $RPC_NODE_IP:1002"
echo "Nodo Minero: $MINER_NODE_IP"
if [ $ADDITIONAL_NODES -gt 0 ]; then
  echo "Nodos adicionales:"
  for i in $(seq 1 $ADDITIONAL_NODES); do
    echo "  - node-$i: 172.25.0.$((12+i))"
  done
fi
echo "==================================="
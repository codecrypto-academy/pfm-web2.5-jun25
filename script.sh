#!/bin/bash

# Usage: ./deploy.sh <NUM_NODES>
# Example: ./deploy.sh 3

set -e

NODES=${1:-2}
NETWORK_NAME="besu-network"
NETWORK_DIR="networks/$NETWORK_NAME"
SUBNET="172.25.0.0/16"
BOOTNODE_IP="172.25.0.10"

echo "Limpiando red Docker y cualquier base de datos previa..."
docker ps -aq --filter "label=network=$NETWORK_NAME" | xargs docker rm -f 2>/dev/null || true
docker network rm $NETWORK_NAME 2>/dev/null || true
rm -rf $NETWORK_DIR
find . -type d -name "data" -exec rm -rf {} + 2>/dev/null || true

echo "Creando estructura del proyecto y red Docker..."
mkdir -p $NETWORK_DIR
docker network create --subnet=$SUBNET --label network=$NETWORK_NAME --label type=besu $NETWORK_NAME

echo "Verificando Node.js y dependencias..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado. Instálalo antes de continuar."
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install elliptic ethers keccak256
fi

# Crear directorio para la red (En directorio actual)
mkdir ./besu-network

# Crear directorio para cada nodo.
mkdir ./besu-network/miner-node
mkdir ./besu-network/rpc-node
mkdir ./besu-network/bootnode

# Crear par de llaves para cada nodo
node ./index.mjs createKeys "./besu-network/miner-node"
node ./index.mjs createKeys "./besu-network/rpc-node"

# Crear llaves y enode para el bootnode
node ./createPrivatePublicKeys.mjs createKeysAndEnode "172.25.0.10" "30303" "./besu-network/bootnode"



# Crear archivo génesis
touch ./besu-network/genesis.json
echo '{
    "config": {
        "chainId": 246700,
        "londonBlock": 0,
        "clique": {
            "blockperiodseconds": 4,
            "epochlenght": 30000,
            "createemptyblocks": true  
        }
    },
    "extraData": "'"0x0000000000000000000000000000000000000000000000000000000000000000$(cat ./besu-network/miner-node/address)0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"'",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "alloc": {
        "'"0x$(cat ./besu-network/miner-node/address)"'": {
            "balance": "0x20000000000000000000000000000000000000000000000000000000000"
        }
    }
}' > ./besu-network/genesis.json

# Crear archivo config.toml
touch ./besu-network/config.toml
echo '
genesis-file="/data/genesis.json"

p2p-host="0.0.0.0"
p2p-port="30303"
p2p-enabled=true

bootnodes=[
"'"$(cat ./besu-network/bootnode/enode)"'"
]

discovery-enabled=true

rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]

' > ./besu-network/config.toml

# Crear archivo bootnode-config.toml
touch ./besu-network/bootnode-config.toml

echo '
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

' > ./besu-network/bootnode-config.toml

# Levantar contenedor de nodo minero
docker run -d --name miner-node --label besu-network --network besu-network --ip 172.25.0.3 \
-v ./besu-network:/data hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/miner-node/data \
--node-private-key-file=/data/miner-node/key

sleep 5

# Levantar contenedor de bootnode
docker run -d --name bootnode --label besu-network --network besu-network --ip 172.25.0.10 \
-v ./besu-network/:/data hyperledger/besu:latest \
--config-file=/data/bootnode-config.toml \
--data-path=/data/bootnode/data \
--node-private-key-file=/data/bootnode/key

# Levantar contenedor para nodo RPC
docker run -d --name rpc-node --label besu-network --network besu-network --ip 172.25.0.4 \
-p 1002:8545 \
-v ./besu-network/:/data hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/rpc-node/data \
--node-private-key-file=/data/rpc-node/key

echo "Esperando que nodo1 esté listo..."
until curl -s http://localhost:1002 > /dev/null; do
  echo "⌛ Esperando a que rpc exponga el RPC en 1002..."
  sleep 2
done

FROM_PRIV_KEY=$(cat ./besu-network/miner-node/key)
TO_ADDRESS="0x$(cat ./besu-network/bootnode/address)"

echo "💸 Enviando 0.01 ETH desde nodo1 a la cuenta dummy..."
node index.mjs transfer $FROM_PRIV_KEY $TO_ADDRESS 0.01 http://localhost:1002
sleep 2

echo "💰 Verificando balance..."
node index.mjs balance $TO_ADDRESS http://localhost:1002
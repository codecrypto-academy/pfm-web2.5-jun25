# Script para Linux que crear una red de Hyperledger Besu con un nodo bootnode y dos nodos adicionales.

# Verifica que Docker esté instalado y en ejecución
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# borrar todo
cd ..
rm -rf networks
docker rm -f $(docker ps -aq --filter "label=network=besu-network") 2>/dev/null || true
docker network rm besu-network 2>/dev/null || true

# configuración de la red
NETWORK="172.20.0.0/16"
BOOTNODE_IP="172.20.0.10"
NODE1_IP="172.20.0.11"
NODE2_IP="172.20.0.12"

# crear directorio para la red
mkdir -p networks/besu-network

# crear la red de Docker
docker network create besu-network \
  --subnet $NETWORK \
  --label network=besu-network \
  --label type=besu

# generar las claves privadas y públicas para el bootnode
cd networks/besu-network
mkdir -p bootnode
mkdir -p nodo1
mkdir -p nodo2
cd bootnode
node ../../../scripts/index.mjs create-keys $BOOTNODE_IP
cd ../nodo1
node ../../../scripts/index.mjs create-keys $NODE1_IP
cd ../nodo2
node ../../../scripts/index.mjs create-keys $NODE2_IP
cd ../..
# Crear dos cuentas prefunded para el alloc
mkdir -p account1
mkdir -p account2
cd account1
node ../../../scripts/index.mjs create-keys 192.168.1.101
cd ../account2
node ../../../scripts/index.mjs create-keys 192.168.1.102
cd ../..

# crear el archivo genesis.json con la configuración de Clique PoA
cat > networks/besu-network/genesis.json << EOF
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
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000$(cat networks/besu-network/bootnode/address)0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "alloc": {
    "$(cat networks/besu-network/bootnode/address)": {
      "balance": "0x20000000000000000000000000000000000000000000"
    },
    "$(cat networks/besu-network/nodo1/address)": {
      "balance": "0x10000000000000000000000000000000000000000000"
    },
    "6243A64dd2E56F164E1f08e99433A7DEC132AB4E": {
      "balance": "0x10000000000000000000000000000000000000000000"
    }
  }
}
EOF

# crear el archivo de configuración config.toml para el bootnode
cat > networks/besu-network/config.toml << EOF
genesis-file="/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true

# BootNode
bootnodes=["$(cat networks/besu-network/bootnode/enode)"]
# Node discovery
discovery-enabled=true

# JSON-RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]            
EOF

# Iniciar el nodo bootnode
docker run -d \
  --name besu-network-bootnode \
  --label nodo=bootnode \
  --label network=besu-network \
  --ip ${BOOTNODE_IP} \
  --network besu-network \
  -p 9090:8545 \
  -v $(pwd)/networks/besu-network:/data \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/bootnode/data \
  --node-private-key-file=/data/bootnode/key.priv \
  --genesis-file=/data/genesis.json

# Esperar a que el bootnode esté lanzado
until [ "$(docker inspect --format='{{.State.Health.Status}}' besu-network-bootnode 2>/dev/null)" = "healthy" ]; do
    echo "Waiting for bootnode to be healthy..."
    sleep 5
done

docker run -d \
  --name besu-network-nodo1 \
  --label nodo=nodo1 \
  --label network=besu-network \
  --ip ${NODE1_IP} \
  --network besu-network \
  -p 9091:8545 \
  -v $(pwd)/networks/besu-network:/data \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/nodo1/data

# Esperar a que el nodo1 esté lanzado
until [ "$(docker inspect --format='{{.State.Health.Status}}' besu-network-nodo1 2>/dev/null)" = "healthy" ]; do
    echo "Waiting for nodo1 to be healthy..."
    sleep 5
done

docker run -d \
  --name besu-network-nodo2 \
  --label nodo=nodo2 \
  --label network=besu-network \
  --ip ${NODE2_IP} \
  --network besu-network \
  -p 9092:8545 \
  -v $(pwd)/networks/besu-network:/data \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/nodo2/data

# Esperar a que el nodo2 esté lanzado
until [ "$(docker inspect --format='{{.State.Health.Status}}' besu-network-nodo2 2>/dev/null)" = "healthy" ]; do
    echo "Waiting for nodo2 to be healthy..."
    sleep 5
done

# DST=$(cat address)
# PRIVATE_KEY=$(cat networks/besu-network/bootnode/key.priv)

# create keys in tests dir for tests
cd scripts
rm -rf tests
mkdir tests
cd tests
node ../index.mjs create-keys 192.168.1.100
cd ..

# check balance (bootnode)
node index.mjs balance $(cat ../networks/besu-network/bootnode/address)

# transfer 10000 to 0x$(cat address)
node index.mjs transfer $(cat ../networks/besu-network/bootnode/key.priv) 0x$(cat tests/address) 10000

# check balance of the test account
node index.mjs balance 0x$(cat tests/address)


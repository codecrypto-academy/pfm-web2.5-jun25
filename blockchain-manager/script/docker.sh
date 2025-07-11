# borrar todo
rm -rf networks
docker rm -f $(docker ps -aq --filter "label=network=besu-network") 2>/dev/null || true
docker network rm besu-network 2>/dev/null || true

# Set network configuration
NETWORK="172.24.0.0/16"
BOOTNODE_IP="172.24.0.20"
MINER_IP="172.24.0.21"
CHAIN_ID=20190606

# crear directorio
mkdir -p networks/besu-network

# crear network in docker 
docker network create besu-network \
  --subnet $NETWORK \
  --label network=besu-network \
  --label type=besu

echo "➡️ Network created"

# crear clave privada bootnode
# Generate private key public key and address and 
cd networks/besu-network
mkdir -p bootnode
cd bootnode
node ../../../blockchain-utilities.mjs create-keys $BOOTNODE_IP
cd ../../..

echo "➡️ Bootnode files created"

# Get bootnode public key for enode URL
BOOTNODE_PUBLIC_KEY=$(cat networks/besu-network/bootnode/key.pub)
# Remove the "04" prefix from public key for enode format
BOOTNODE_PUBLIC_KEY_ENODE=${BOOTNODE_PUBLIC_KEY#04}
BOOTNODE_ENODE="enode://${BOOTNODE_PUBLIC_KEY_ENODE}@${BOOTNODE_IP}:30303"

echo "➡️ Bootnode enode: ${BOOTNODE_ENODE}"

# Verify enode format
if [[ ! "$BOOTNODE_ENODE" =~ ^enode://[a-fA-F0-9]{128}@[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:[0-9]+$ ]]; then
    echo "❌ Error: Invalid enode format"
    exit 1
fi

# crear clave privada para nodo miner
cd networks/besu-network
mkdir -p miner
cd miner
node ../../../blockchain-utilities.mjs create-keys ${MINER_IP}
cd ../../..

echo "➡️ Miner files created"

# Generate extraData for Clique PoA - CORRECTED VERSION
generate_extra_data() {
    local miner_address=$1
    
    # Remove 0x prefix if present
    miner_address=${miner_address#0x}
    
    # 32 bytes of vanity data (64 hex chars)
    local vanity_data="0000000000000000000000000000000000000000000000000000000000000000"
    
    # Use the miner address as validator (20 bytes = 40 hex chars)
    local validator="${miner_address}"
    
    # Calculate remaining zeros to complete 234 chars (117 bytes total)
    local total_length=$((${#vanity_data} + ${#validator}))
    local remaining_zeros=$((234 - total_length))
    
    # Generate remaining zeros
    local zeros=""
    for ((i=0; i<remaining_zeros; i++)); do
        zeros="${zeros}0"
    done
    
    echo "0x${vanity_data}${validator}${zeros}"
}

# Generate extraData
EXTRA_DATA=$(generate_extra_data "$(cat networks/besu-network/miner/address)")

# Create genesis.json with Clique PoA configuration
echo '{
  "config": {
    "chainId": '$CHAIN_ID',
    "londonBlock": 0,
    "clique": {
              "blockperiodseconds": 4,
              "epochlength": 30000,
              "createemptyblocks": true
    }
  },
  "extraData": "'$EXTRA_DATA'",
  "gasLimit": "0xa00000",
  "difficulty": "0x1",
  "alloc": {
    "'$(cat networks/besu-network/bootnode/address)'": {
      "balance": "0xad78ebc5ac6200000"
    },
    "'$(cat networks/besu-network/miner/address)'": {
      "balance": "0xad78ebc5ac6200000"
    }
  }
}' > networks/besu-network/genesis.json

echo "➡️ Genesis file created"

# Create config.toml for Besu node configuration
cat > networks/besu-network/config.toml << EOF
genesis-file="/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
# JSON-RPC

rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE"]
host-allowlist=["*"]            
EOF

echo "➡️ Config.toml file created"

# Create Besu node
docker run -d \
  --name besu-network-bootnode \
  --label nodo=bootnode \
  --label network=besu-network \
  --ip ${BOOTNODE_IP} \
  --network besu-network \
  -p 8888:8545 \
  -v $(pwd)/networks/besu-network:/data \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/bootnode/data \
  --node-private-key-file=/data/bootnode/key.priv \
  --genesis-file=/data/genesis.json >/dev/null || true

echo "➡️ Bootnode node created"

# Create miner node
docker run -d \
  --name besu-network-miner \
  --label nodo=miner \
  --label network=besu-network \
  --ip ${MINER_IP} \
  --network besu-network \
  -p 8889:8545 \
  -v $(pwd)/networks/besu-network:/data \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/miner/data \
  --node-private-key-file=/data/miner/key.priv \
  --genesis-file=/data/genesis.json \
  --miner-enabled=true \
  --miner-coinbase="$(cat networks/besu-network/miner/address)" \
  --min-gas-price=0 \
  --bootnodes="${BOOTNODE_ENODE}" >/dev/null || true

echo "➡️ Miner node created"

# Create RPC nodes
for port in 8545 8546 8547 8548; do
    mkdir -p networks/besu-network/rpc${port}
    
    docker run -d \
      --name besu-network-rpc${port} \
      --label nodo=rpc \
      --label network=besu-network \
      --ip 172.24.0.$((22 + port - 8545)) \
      --network besu-network \
      -p ${port}:8545 \
      -v $(pwd)/networks/besu-network:/data \
      hyperledger/besu:latest \
      --config-file=/data/config.toml \
      --data-path=/data/rpc${port}/data \
      --genesis-file=/data/genesis.json \
      --bootnodes="${BOOTNODE_ENODE}" >/dev/null || true
    
    echo "➡️ RPC node on port ${port} created"
done

# Check if all nodes are running
echo "Checking node status..."
if [ "$(docker ps -q --filter "name=besu-network-bootnode")" ]; then
  echo "✅ Bootnode is running"
else
  echo "❌ Bootnode is not running"
fi

if [ "$(docker ps -q --filter "name=besu-network-miner")" ]; then
  echo "✅ Miner is running"
else
  echo "❌ Miner is not running"
fi

for port in 8545 8546 8547 8548; do
    if [ "$(docker ps -q --filter "name=besu-network-rpc${port}")" ]; then
      echo "✅ RPC node on port ${port} is running"
    else
      echo "❌ RPC node on port ${port} is not running"
    fi
done



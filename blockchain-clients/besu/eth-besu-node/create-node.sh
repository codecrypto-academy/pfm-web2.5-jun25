###########################################################
# clean up
###########################################################

# delete networks folder
rm -rf networks
# remove docker containers
docker rm -f $(docker ps -aq --filter "label=network=besu-network") >/dev/null 2>/dev/null || true
# remove docker networks
docker network rm besu-network >/dev/null 2>/dev/null || true

###########################################################
# setup 
###########################################################
NETWORK="172.24.0.0/16"
BOOTNODE_IP="172.24.0.20"
BESU_NETWORK="networks/besu-network"
BOOTNODE_DIR="$BESU_NETWORK/bootnode"
CHAIN_ID="7402"

mkdir -p $BOOTNODE_DIR

# create docker network
docker network create besu-network --subnet $NETWORK --label network=besu-network --label type=besu-network >/dev/null 2>/dev/null || true

# create bootnode files keys, address and enode
if ! npx node ./utils/create-bootnode-files.js --bootnode_dir $BOOTNODE_DIR --bootnode_ip $BOOTNODE_IP ; then
  echo "Failed to create bootnode files"

  # clean up
  rm -rf networks
  docker rm -f $(docker ps -aq --filter "label=network=besu-network") 2>/dev/null || true
  docker network rm besu-network 2>/dev/null || true

  exit 1
fi

echo "Bootnode files created"

# create genesis file
cat > $BESU_NETWORK/genesis.json << EOF
{
  "config": {
    "chainId": $CHAIN_ID,
    "londonBlock": 0,
    "clique": {
      "blockperiodseconds": 4,
      "epochlength": 30000,
      "createemptyblocks": true
    }
  },
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000$(cat $BOOTNODE_DIR/address)0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0xa00000",
  "difficulty": "0x1",
  "alloc": {
    "$(cat $BOOTNODE_DIR/address)": {
      "balance": "0xad78ebc5ac6200000"
    }
  }
}
EOF

echo "Genesis file created"

# create config.toml file
cat > $BESU_NETWORK/config.toml << EOF
genesis-file="/data/genesis.json" # Path to the custom genesis file

# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true

# JSON-RPC (como acceder al nodo)
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN","TRACE","DEBUG","TXPOOL","PERM"]

host-allowlist=["*"]
EOF

echo "Config.toml file created"

###########################################################
# create node 
###########################################################
docker run -d \
--name besu-network-bootnode \
--label nodo=bootnode \
--label network=besu-network \
--ip ${BOOTNODE_IP} \
--network besu-network \
-p 8546:8545 \
-v ${PWD}/${BESU_NETWORK}:/data \
hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/bootnode/data \
--node-private-key-file=/data/bootnode/key.priv >/dev/null 2>/dev/null || true

# check if the node is running
if [ "$(docker ps -q --filter "name=besu-network-bootnode")" ]; then
  echo "Bootnode is running"
else
  echo "Bootnode is not running"
  exit 1
fi

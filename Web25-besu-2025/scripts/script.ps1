# Script for Windows to create a Besu network with a bootnode and two nodes 

# Ensure Docker is running
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is not installed or not running. Please install Docker and start it." -ForegroundColor Red
    exit 1
}

# delete networks
cd ..
if (Test-Path networks) {
  Remove-Item -Path networks -Recurse -Force
}
# true is for ignore error
docker ps -aq --filter "label=network=besu-network" | ForEach-Object { docker rm -f $_ } *> $null
docker network rm -f besu-network *> $null

# Set network configuration
$NETWORK="172.20.0.0/16"
$BOOTNODE_IP="172.20.0.10"
$NODE1_IP="172.20.0.11"
$NODE2_IP="172.20.0.12"

# make network dir
mkdir -p networks/besu-network

# create network in docker 
docker network create besu-network `
  --subnet $NETWORK `
  --label network=besu-network `
  --label type=besu

# create address enode private key and public key
cd networks/besu-network
mkdir -p bootnode
mkdir -p nodo1
mkdir -p nodo2
cd bootnode
node ../../../scripts/index.mjs create-keys ${BOOTNODE_IP}
cd ../nodo1
node ../../../scripts/index.mjs create-keys ${NODE1_IP}
cd ../nodo2
node ../../../scripts/index.mjs create-keys ${NODE2_IP}
cd ../../..


# Create genesis.json with Clique PoA configuration
@"
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
    }
  }
}
"@ | Set-Content -Path "networks/besu-network/genesis.json"

# Create config.toml for Besu node configuration
@"
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
"@ | Set-Content -Path "networks/besu-network/config.toml"

# launch besu node
docker run -d `
  --name besu-network-bootnode `
  --label nodo=bootnode `
  --label network=besu-network `
  --ip $BOOTNODE_IP `
  --network besu-network `
  -p 9090:8545 `
  -v ${PWD}/networks/besu-network:/data `
  hyperledger/besu:latest `
  --config-file=/data/config.toml `
  --genesis-file=/data/genesis.json `
  --data-path=/data/bootnode/data `
  --node-private-key-file=/data/bootnode/key.priv

# wait for bootnode to be ready
while (-not (docker inspect --format='{{.State.Health.Status}}' besu-network-bootnode 2>&1 | Select-String "healthy")) {
  Write-Host "Waiting for bootnode to be healthy..." -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

docker run -d `
  --name besu-network-nodo1 `
  --label nodo=nodo1 `
  --label network=besu-network `
  --ip $NODE1_IP `
  --network besu-network `
  -p 9091:8545 `
  -v ${PWD}/networks/besu-network:/data `
  hyperledger/besu:latest `
  --config-file=/data/config.toml `
  --data-path=/data/nodo1/data

# wait for nodo1 to be ready
while (-not (docker inspect --format='{{.State.Health.Status}}' besu-network-nodo1 2>&1 | Select-String "healthy")) {
  Write-Host "Waiting for nodo1 to be healthy..." -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

docker run -d `
  --name besu-network-nodo2 `
  --label nodo=nodo2 `
  --label network=besu-network `
  --ip $NODE2_IP `
  --network besu-network `
  -p 9092:8545 `
  -v ${PWD}/networks/besu-network:/data `
  hyperledger/besu:latest `
  --config-file=/data/config.toml `
  --data-path=/data/nodo2/data

# wait for nodo2 to be ready
while (-not (docker inspect --format='{{.State.Health.Status}}' besu-network-nodo2 2>&1 | Select-String "healthy")) {
  Write-Host "Waiting for nodo2 to be healthy..." -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

# create keys in tests dir for tests
cd scripts
if (Test-Path tests) {
  Remove-Item -Path tests -Recurse -Force
}
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

# show the number of current block from node 1
(Invoke-WebRequest -Uri http://localhost:9091 -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -Headers @{ "Content-Type" = "application/json" }).Content | ConvertFrom-Json | Select-Object -ExpandProperty result

# check balance of the test account from the node 1
[System.Numerics.BigInteger]::Parse(((Invoke-WebRequest -Uri http://localhost:9091 -Method POST -Body ("{`"jsonrpc`":`"2.0`",`"method`":`"eth_getBalance`",`"params`":[`"" + (Get-Content tests\address).Trim() + "`",`"latest`"],`"id`":1}") -Headers @{ "Content-Type" = "application/json" }).Content | ConvertFrom-Json | Select-Object -ExpandProperty result).TrimStart("0x"), [System.Globalization.NumberStyles]::HexNumber) / [math]::Pow(10,18)

# show info from node 2
Invoke-WebRequest -Uri http://localhost:9092 -Method POST -Body '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[],"id":1}' -Headers @{ "Content-Type" = "application/json" }
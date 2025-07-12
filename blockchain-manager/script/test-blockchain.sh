#!/bin/bash

echo "🏁 Starting blockchain test sesion..."
echo ""
echo ""

echo "➡️ Creating blockchain..."
./create-blockchain.sh

echo ""
echo "➡️ Validating blockchain..."
sleep 2
echo "⏰ Waiting one minute for the nodes to sync..."
sleep 60
echo ""

# Check if all nodes are running
echo "➡️ Checking node status..."
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



echo "➡️ Network Status"
echo "🖥️ RPC Node Port ::8545::"
node blockchain-utilities.mjs network-info http://localhost:8545
node blockchain-utilities.mjs network-status http://localhost:8545

echo ""
echo "➡️ Checking nodes syncronization..."
node blockchain-utilities.mjs block-number http://localhost:8545
node blockchain-utilities.mjs block-number http://localhost:8546
node blockchain-utilities.mjs block-number http://localhost:8547
node blockchain-utilities.mjs block-number http://localhost:8548
node blockchain-utilities.mjs block-number http://localhost:8545
node blockchain-utilities.mjs block-number http://localhost:8546
node blockchain-utilities.mjs block-number http://localhost:8547
node blockchain-utilities.mjs block-number http://localhost:8548


miner_address=$(cat networks/besu-network/miner/address)
miner_balance=$(node blockchain-utilities.mjs balance $miner_address)
echo $miner_balance

miner_private_key=$(cat networks/besu-network/miner/key.priv)
address_to_fund=$(node blockchain-utilities.mjs create-address)

echo "➡️ Funding address $address_to_fund from miner..."
echo "🖥️ RPC Node Port ::8545::"
echo ""
node blockchain-utilities.mjs transfer $miner_private_key $address_to_fund 80 http://localhost:8545

echo ""
echo "_____________________________________________________________________________________________"
echo ""

echo "➡️ Transfer to several accounts..."
echo "🖥️ RPC Node Port ::8547::"
echo ""
node blockchain-utilities.mjs transfer-funds http://localhost:8547

echo ""
echo "🖥️ RPC Node Port ::8546::"
node blockchain-utilities.mjs show-accounts http://localhost:8546

echo "➡️ Transfer again to several accounts"
echo "🖥️ RPC Node Port ::8545::"
echo ""
node blockchain-utilities.mjs transfer-funds http://localhost:8545

echo ""
echo "🖥️ RPC Node Port ::8548::"
node blockchain-utilities.mjs show-accounts http://localhost:8548

sleep 10

echo ""
echo ""
echo "🏁 Test finish. Cleaning up..."
rm -rf networks
docker rm -f $(docker ps -aq --filter "label=network=besu-network") >/dev/null 2>/dev/null || true
docker network rm besu-network >/dev/null 2>/dev/null || true
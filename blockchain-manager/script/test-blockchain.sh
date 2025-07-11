#!/bin/bash


echo "➡️ Creating blockchain..."
./docker.sh > /dev/null



echo "➡️ Validating blockchain..."
echo "⏰ Waiting one minute for the nodes to sync..."
sleep 60

info_output=$(node blockchain-utilities.mjs network-info http://localhost:8545)
status_output=$(node blockchain-utilities.mjs network-status http://localhost:8545)

echo "Network Info Output:"
echo $info_output
echo ""
echo "Network Status Output:"
echo $status_output
echo ""

miner_address=$(cat networks/besu-network/miner/address)
miner_balance=$(node blockchain-utilities.mjs balance $miner_address)
echo $miner_balance

miner_private_key=$(cat networks/besu-network/miner/key.priv)
address_to_fund=$(node blockchain-utilities.mjs create-address)

echo "Funding address $address_to_fund from miner..."
echo ""

node blockchain-utilities.mjs transfer $miner_private_key $address_to_fund 20
echo "============================================================"
echo "Checking transfer to several accounts..."
echo ""
node blockchain-utilities.mjs transfer-funds



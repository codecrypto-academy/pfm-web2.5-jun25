#!/bin/bash

# 🚀 Quick Test - Basic Network Operations
echo "🧪 Quick Test: Creating network and managing nodes"
echo "=================================================="

BASE_URL="http://localhost:3000"
NETWORK_ID="besu-demo-network"

echo "📝 Using network ID: $NETWORK_ID"
echo ""

# 1. Create a network
echo "1️⃣ Creating network..."
curl -X POST $BASE_URL/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "'$NETWORK_ID'",
    "chainId": 1337,
    "nodeCount": 2,
    "subnet": "172.25.0.0/24",
    "baseRpcPort": 9000,
    "baseP2pPort": 31000
  }' | jq .

echo ""
echo "2️⃣ Getting network details..."
curl -s $BASE_URL/api/networks/$NETWORK_ID | jq .

echo ""
echo "3️⃣ Adding a custom RPC node..."
curl -X POST $BASE_URL/api/networks/$NETWORK_ID/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "nodeIdPrefix": "api"
  }' | jq .

echo ""
echo "4️⃣ Listing all nodes..."
curl -s $BASE_URL/api/networks/$NETWORK_ID/nodes | jq .

echo ""
echo "5️⃣ Checking network status..."
curl -s $BASE_URL/api/networks/$NETWORK_ID/status | jq .

echo ""
echo "🧹 Cleaning up..."
curl -X DELETE $BASE_URL/api/networks/$NETWORK_ID | jq .

echo ""
echo "✅ Quick test completed!"

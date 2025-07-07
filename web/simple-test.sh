#!/bin/bash

echo "🚀 Simple Network Test - Create network + Add RPC node"
echo "===================================================="

BASE_URL="http://localhost:3000"
NETWORK_ID="demo-network-$(date +%s)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${BLUE}1. Creating network with 1 bootnode + 2 miners...${NC}"
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "'$NETWORK_ID'",
    "chainId": 1337,
    "nodeCount": 3,
    "subnet": "172.25.0.0/24",
    "gateway": "172.25.0.1",
    "baseRpcPort": 8545,
    "baseP2pPort": 30303,
    "bootnodeCount": 1,
    "minerCount": 2
  }')

echo "Network creation response:"
echo "$CREATE_RESPONSE" | jq .

# Check if creation was successful
if echo "$CREATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Network created successfully!${NC}"
    
    echo -e "\n${BLUE}2. Adding 1 RPC node to existing network...${NC}"
    ADD_NODE_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks/$NETWORK_ID/nodes \
      -H "Content-Type: application/json" \
      -d '{
        "type": "rpc",
        "nodeIdPrefix": "rpc"
      }')
    
    echo "Add RPC node response:"
    echo "$ADD_NODE_RESPONSE" | jq .
    
    if echo "$ADD_NODE_RESPONSE" | jq -e '.success' > /dev/null; then
        echo -e "${GREEN}✅ RPC node added successfully!${NC}"
        
        echo -e "\n${BLUE}3. Final network status:${NC}"
        curl -s $BASE_URL/api/networks/$NETWORK_ID/nodes | jq .
        
        echo -e "\n${GREEN}🎉 Test completed! Network ID: $NETWORK_ID${NC}"
    else
        echo -e "${RED}❌ Failed to add RPC node${NC}"
    fi
else
    echo -e "${RED}❌ Failed to create network${NC}"
fi

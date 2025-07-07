#!/bin/bash

echo "🧪 Testing Besu Network Management API"
echo "======================================"

BASE_URL="http://localhost:3000"
NETWORK_ID="test-network-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Check if server is running
echo -e "\n${BLUE}1. Checking if development server is running...${NC}"
if curl -s $BASE_URL > /dev/null 2>&1; then
    print_status 0 "Server is running"
else
    print_status 1 "Server is not running"
    print_warning "Please start the development server with: yarn dev"
    exit 1
fi

# Test 2: Clean up any existing test networks
echo -e "\n${BLUE}2. Cleaning up any existing test networks...${NC}"
EXISTING_NETWORKS=$(curl -s $BASE_URL/api/networks)
if echo "$EXISTING_NETWORKS" | jq -e '.success' > /dev/null 2>&1; then
    # Extract network IDs that start with "test-network"
    TEST_NETWORKS=$(echo "$EXISTING_NETWORKS" | jq -r '.networks[]? | select(.networkId | startswith("test-network")) | .networkId')
    
    if [ ! -z "$TEST_NETWORKS" ]; then
        echo "Found existing test networks to clean up:"
        for NET_ID in $TEST_NETWORKS; do
            echo "  - Deleting network: $NET_ID"
            DELETE_OLD=$(curl -s -X DELETE $BASE_URL/api/networks/$NET_ID)
            if echo "$DELETE_OLD" | jq -e '.success' > /dev/null 2>&1; then
                echo "    ✅ Deleted successfully"
            else
                echo "    ⚠️  Failed to delete (may not exist)"
            fi
        done
    else
        print_status 0 "No existing test networks found"
    fi
else
    print_warning "Could not check for existing networks"
fi

# Test 3: Check for Docker network conflicts
echo -e "\n${BLUE}3. Checking for Docker network conflicts...${NC}"
DOCKER_NETWORKS=$(docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" 2>/dev/null || echo "Docker not available")
if echo "$DOCKER_NETWORKS" | grep -q "172.25.0.0" 2>/dev/null; then
    print_warning "Subnet 172.25.0.0/24 may be in use, using alternative subnet"
    TEST_SUBNET="172.27.0.0/24"
    TEST_GATEWAY="172.27.0.1"
else
    TEST_SUBNET="172.25.0.0/24"
    TEST_GATEWAY="172.25.0.1"
fi
print_status 0 "Using subnet: $TEST_SUBNET"

# Test 4: List networks (should be clean now)
echo -e "\n${BLUE}4. Listing current networks...${NC}"
NETWORKS_RESPONSE=$(curl -s $BASE_URL/api/networks)
echo "$NETWORKS_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $NETWORKS_RESPONSE"

# Test 5: Create a new network with custom parameters
echo -e "\n${BLUE}5. Creating a test network with custom parameters...${NC}"
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "'$NETWORK_ID'",
    "chainId": 12345,
    "nodeCount": 3,
    "subnet": "'$TEST_SUBNET'",
    "gateway": "'$TEST_GATEWAY'",
    "baseRpcPort": 9000,
    "baseP2pPort": 31000,
    "bootnodeCount": 1,
    "minerCount": 2
  }')

echo "$CREATE_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $CREATE_RESPONSE"

# Check if network creation was successful
if echo "$CREATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_status 0 "Network created successfully"
else
    print_status 1 "Network creation failed"
    exit 1
fi

# Test 6: Get network details
echo -e "\n${BLUE}6. Getting network details...${NC}"
NETWORK_DETAILS=$(curl -s $BASE_URL/api/networks/$NETWORK_ID)
echo "$NETWORK_DETAILS" | jq . 2>/dev/null || echo "Raw response: $NETWORK_DETAILS"

# Test 7: List nodes in the network
echo -e "\n${BLUE}7. Listing nodes in the network...${NC}"
NODES_RESPONSE=$(curl -s $BASE_URL/api/networks/$NETWORK_ID/nodes)
echo "$NODES_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $NODES_RESPONSE"

# Test 8: Add a new node to the network with custom ports
echo -e "\n${BLUE}8. Adding a new RPC node with custom ports...${NC}"
ADD_NODE_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks/$NETWORK_ID/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500
  }')

echo "$ADD_NODE_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $ADD_NODE_RESPONSE"

# Extract node ID for testing
NODE_ID=""
if echo "$ADD_NODE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    NODE_ID=$(echo "$ADD_NODE_RESPONSE" | jq -r '.node.id')
    print_status 0 "Node added successfully (ID: $NODE_ID)"
else
    print_status 1 "Node addition failed"
fi

# Test 9: Add another node with auto-assigned ports
echo -e "\n${BLUE}9. Adding another node with auto-assigned ports...${NC}"
ADD_NODE2_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks/$NETWORK_ID/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "miner"
  }')

echo "$ADD_NODE2_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $ADD_NODE2_RESPONSE"

# Test 10: Get specific node details (if we have a node ID)
if [ ! -z "$NODE_ID" ]; then
    echo -e "\n${BLUE}10. Getting specific node details...${NC}"
    NODE_DETAILS=$(curl -s $BASE_URL/api/networks/$NETWORK_ID/nodes/$NODE_ID)
    echo "$NODE_DETAILS" | jq . 2>/dev/null || echo "Raw response: $NODE_DETAILS"
fi

# Test 11: List all networks again to see our new network
echo -e "\n${BLUE}11. Listing all networks (should include our new network)...${NC}"
FINAL_NETWORKS=$(curl -s $BASE_URL/api/networks)
echo "$FINAL_NETWORKS" | jq . 2>/dev/null || echo "Raw response: $FINAL_NETWORKS"

# Test 12: Try to create a network with the same ID (should fail)
echo -e "\n${BLUE}12. Testing duplicate network creation (should fail)...${NC}"
DUPLICATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "'$NETWORK_ID'",
    "chainId": 12345,
    "nodeCount": 2
  }')

echo "$DUPLICATE_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $DUPLICATE_RESPONSE"

if echo "$DUPLICATE_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_status 0 "Duplicate network properly rejected"
else
    print_status 1 "Duplicate network should have been rejected"
fi

# Test 13: Test error cases - invalid node type
echo -e "\n${BLUE}13. Testing invalid node type (should fail)...${NC}"
INVALID_NODE_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks/$NETWORK_ID/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invalid-type"
  }')

echo "$INVALID_NODE_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $INVALID_NODE_RESPONSE"

# Test 14: Test port conflict
echo -e "\n${BLUE}14. Testing port conflict (should fail)...${NC}"
CONFLICT_RESPONSE=$(curl -s -X POST $BASE_URL/api/networks/$NETWORK_ID/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500
  }')

echo "$CONFLICT_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $CONFLICT_RESPONSE"

if echo "$CONFLICT_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_status 0 "Port conflict properly detected and rejected"
else
    print_status 1 "Port conflict should have been detected"
fi

# Test 15: Clean up - remove a node (if we have node ID)
if [ ! -z "$NODE_ID" ]; then
    echo -e "\n${BLUE}15. Removing the node we added...${NC}"
    REMOVE_NODE_RESPONSE=$(curl -s -X DELETE $BASE_URL/api/networks/$NETWORK_ID/nodes/$NODE_ID)
    echo "$REMOVE_NODE_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $REMOVE_NODE_RESPONSE"
fi

# Test 16: Clean up - delete the network
echo -e "\n${BLUE}16. Cleaning up - deleting the test network...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE $BASE_URL/api/networks/$NETWORK_ID)
echo "$DELETE_RESPONSE" | jq . 2>/dev/null || echo "Raw response: $DELETE_RESPONSE"

if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    print_status 0 "Network deleted successfully"
else
    print_status 1 "Network deletion failed"
fi

# Test 17: Verify network is deleted
echo -e "\n${BLUE}17. Verifying network was deleted...${NC}"
VERIFY_DELETE=$(curl -s $BASE_URL/api/networks/$NETWORK_ID)
echo "$VERIFY_DELETE" | jq . 2>/dev/null || echo "Raw response: $VERIFY_DELETE"

if echo "$VERIFY_DELETE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_status 0 "Network properly deleted (404 expected)"
else
    print_status 1 "Network should not exist after deletion"
fi

echo -e "\n${GREEN}🎉 API Testing Complete!${NC}"
echo -e "${BLUE}Summary: Tested network creation, node management, error handling, and cleanup${NC}"

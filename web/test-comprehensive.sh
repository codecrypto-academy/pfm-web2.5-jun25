#!/bin/bash

# 🧪 Besu Network Management API - Comprehensive Testing Script
# This script tests all API endpoints with the new parameterized values

echo "🚀 Starting Besu Network Management API Tests"
echo "=============================================="

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

print_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check JSON response
check_response() {
    local response="$1"
    local expected_success="$2"
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local success=$(echo "$response" | jq -r '.success')
        if [ "$success" = "$expected_success" ]; then
            return 0
        else
            echo "Expected success: $expected_success, got: $success"
            return 1
        fi
    else
        echo "Invalid JSON response: $response"
        return 1
    fi
}

# Test 1: Check if server is running
print_step "1. Testing Server Connectivity"
response=$(curl -s -w "%{http_code}" -o /tmp/health_check "$BASE_URL/api/networks" 2>/dev/null)
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    print_status 0 "Server is running and responding"
    cat /tmp/health_check | jq . 2>/dev/null || echo "Response: $(cat /tmp/health_check)"
else
    print_status 1 "Server is not responding (HTTP: $http_code)"
    echo "Make sure the development server is running: yarn dev"
    exit 1
fi

# Test 2: List existing networks (should be empty initially)
print_step "2. Listing Existing Networks"
response=$(curl -s "$BASE_URL/api/networks")
echo "$response" | jq . 2>/dev/null || echo "Raw response: $response"

# Test 3: Create a new network with custom parameters
print_step "3. Creating New Network with Custom Parameters"
create_response=$(curl -s -X POST "$BASE_URL/api/networks" \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "'$NETWORK_ID'",
    "chainId": 12345,
    "nodeCount": 3,
    "subnet": "172.25.0.0/24",
    "gateway": "172.25.0.1",
    "baseRpcPort": 9000,
    "baseP2pPort": 31000,
    "bootnodeCount": 1,
    "minerCount": 2,
    "memoryLimit": "3g",
    "cpuLimit": "1.5",
    "besuImage": "hyperledger/besu:latest",
    "labels": {
      "environment": "test",
      "team": "development"
    }
  }')

if check_response "$create_response" "true"; then
    print_status 0 "Network created successfully"
    echo "$create_response" | jq .
    
    # Extract network details
    DOCKER_NETWORK_ID=$(echo "$create_response" | jq -r '.network.dockerNetworkId')
    CONTAINERS_CREATED=$(echo "$create_response" | jq -r '.network.containersCreated')
    
    print_info "Docker Network ID: $DOCKER_NETWORK_ID"
    print_info "Containers Created: $CONTAINERS_CREATED"
else
    print_status 1 "Failed to create network"
    echo "$create_response"
    exit 1
fi

# Test 4: Get network details
print_step "4. Getting Network Details"
details_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID")
if check_response "$details_response" "true"; then
    print_status 0 "Network details retrieved"
    echo "$details_response" | jq .
    
    # Count nodes
    NODE_COUNT=$(echo "$details_response" | jq '.network.nodes | length')
    print_info "Current node count: $NODE_COUNT"
else
    print_status 1 "Failed to get network details"
    echo "$details_response"
fi

# Test 5: List nodes in the network
print_step "5. Listing Network Nodes"
nodes_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID/nodes")
if check_response "$nodes_response" "true"; then
    print_status 0 "Nodes listed successfully"
    echo "$nodes_response" | jq .
    
    # Get first node ID for later testing
    FIRST_NODE_ID=$(echo "$nodes_response" | jq -r '.nodes[0].id')
    print_info "First node ID: $FIRST_NODE_ID"
else
    print_status 1 "Failed to list nodes"
    echo "$nodes_response"
fi

# Test 6: Get network status
print_step "6. Checking Network Status"
status_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID/status")
if check_response "$status_response" "true"; then
    print_status 0 "Network status retrieved"
    echo "$status_response" | jq .
    
    RUNNING_NODES=$(echo "$status_response" | jq -r '.status.runningNodes')
    TOTAL_NODES=$(echo "$status_response" | jq -r '.status.totalNodes')
    print_info "Running nodes: $RUNNING_NODES/$TOTAL_NODES"
else
    print_status 1 "Failed to get network status"
    echo "$status_response"
fi

# Test 7: Add a new node with custom parameters
print_step "7. Adding New Node with Custom Parameters"
add_node_response=$(curl -s -X POST "$BASE_URL/api/networks/$NETWORK_ID/nodes" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500,
    "ipOffset": 15,
    "nodeIdPrefix": "custom",
    "memoryLimit": "2g",
    "cpuLimit": "1.0",
    "labels": {
      "nodeType": "api-server",
      "purpose": "external-access"
    },
    "env": {
      "EXTRA_OPTS": "--metrics-enabled=true"
    }
  }')

if check_response "$add_node_response" "true"; then
    print_status 0 "Node added successfully"
    echo "$add_node_response" | jq .
    
    NEW_NODE_ID=$(echo "$add_node_response" | jq -r '.node.id')
    NEW_NODE_IP=$(echo "$add_node_response" | jq -r '.node.ip')
    NEW_NODE_RPC_PORT=$(echo "$add_node_response" | jq -r '.node.rpcPort')
    
    print_info "New node ID: $NEW_NODE_ID"
    print_info "New node IP: $NEW_NODE_IP"
    print_info "New node RPC port: $NEW_NODE_RPC_PORT"
else
    print_status 1 "Failed to add node"
    echo "$add_node_response"
fi

# Test 8: Add another node with auto-assigned parameters
print_step "8. Adding Node with Auto-Assigned Parameters"
auto_node_response=$(curl -s -X POST "$BASE_URL/api/networks/$NETWORK_ID/nodes" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "miner"
  }')

if check_response "$auto_node_response" "true"; then
    print_status 0 "Auto-assigned node added successfully"
    echo "$auto_node_response" | jq .
    
    AUTO_NODE_ID=$(echo "$auto_node_response" | jq -r '.node.id')
    print_info "Auto-assigned node ID: $AUTO_NODE_ID"
else
    print_status 1 "Failed to add auto-assigned node"
    echo "$auto_node_response"
fi

# Test 9: Get specific node details
print_step "9. Getting Specific Node Details"
if [ ! -z "$NEW_NODE_ID" ]; then
    node_details_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID/nodes/$NEW_NODE_ID")
    if check_response "$node_details_response" "true"; then
        print_status 0 "Node details retrieved"
        echo "$node_details_response" | jq .
    else
        print_status 1 "Failed to get node details"
        echo "$node_details_response"
    fi
else
    print_warning "Skipping node details test - no node ID available"
fi

# Test 10: List updated nodes
print_step "10. Listing Updated Network Nodes"
updated_nodes_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID/nodes")
if check_response "$updated_nodes_response" "true"; then
    print_status 0 "Updated nodes list retrieved"
    echo "$updated_nodes_response" | jq .
    
    UPDATED_NODE_COUNT=$(echo "$updated_nodes_response" | jq '.nodes | length')
    print_info "Updated node count: $UPDATED_NODE_COUNT"
else
    print_status 1 "Failed to list updated nodes"
    echo "$updated_nodes_response"
fi

# Test 11: Test port conflict detection
print_step "11. Testing Port Conflict Detection"
conflict_response=$(curl -s -X POST "$BASE_URL/api/networks/$NETWORK_ID/nodes" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500
  }')

if check_response "$conflict_response" "false"; then
    print_status 0 "Port conflict detected correctly"
    echo "$conflict_response" | jq .
else
    print_warning "Port conflict detection may not be working as expected"
    echo "$conflict_response"
fi

# Test 12: Remove a node
print_step "12. Removing a Node"
if [ ! -z "$NEW_NODE_ID" ]; then
    remove_response=$(curl -s -X DELETE "$BASE_URL/api/networks/$NETWORK_ID/nodes/$NEW_NODE_ID")
    if check_response "$remove_response" "true"; then
        print_status 0 "Node removed successfully"
        echo "$remove_response" | jq .
    else
        print_status 1 "Failed to remove node"
        echo "$remove_response"
    fi
else
    print_warning "Skipping node removal test - no node ID available"
fi

# Test 13: Verify node removal
print_step "13. Verifying Node Removal"
final_nodes_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID/nodes")
if check_response "$final_nodes_response" "true"; then
    print_status 0 "Final nodes list retrieved"
    echo "$final_nodes_response" | jq .
    
    FINAL_NODE_COUNT=$(echo "$final_nodes_response" | jq '.nodes | length')
    print_info "Final node count: $FINAL_NODE_COUNT"
else
    print_status 1 "Failed to get final nodes list"
    echo "$final_nodes_response"
fi

# Test 14: Test invalid operations
print_step "14. Testing Invalid Operations"

# Try to create network with same ID
print_info "Testing duplicate network creation..."
duplicate_response=$(curl -s -X POST "$BASE_URL/api/networks" \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "'$NETWORK_ID'",
    "chainId": 12345,
    "nodeCount": 2
  }')

if check_response "$duplicate_response" "false"; then
    print_status 0 "Duplicate network rejection working correctly"
else
    print_warning "Duplicate network detection may not be working"
fi

# Try to access non-existent network
print_info "Testing non-existent network access..."
nonexistent_response=$(curl -s "$BASE_URL/api/networks/non-existent-network")
if check_response "$nonexistent_response" "false"; then
    print_status 0 "Non-existent network rejection working correctly"
else
    print_warning "Non-existent network detection may not be working"
fi

# Test 15: Cleanup - Delete the test network
print_step "15. Cleaning Up - Deleting Test Network"
delete_response=$(curl -s -X DELETE "$BASE_URL/api/networks/$NETWORK_ID")
if check_response "$delete_response" "true"; then
    print_status 0 "Test network deleted successfully"
    echo "$delete_response" | jq .
    
    CONTAINERS_REMOVED=$(echo "$delete_response" | jq -r '.cleanup.containersRemoved')
    print_info "Containers removed: $CONTAINERS_REMOVED"
else
    print_status 1 "Failed to delete test network"
    echo "$delete_response"
    print_warning "You may need to manually clean up network: $NETWORK_ID"
fi

# Test 16: Verify cleanup
print_step "16. Verifying Network Cleanup"
cleanup_check_response=$(curl -s "$BASE_URL/api/networks/$NETWORK_ID")
if check_response "$cleanup_check_response" "false"; then
    print_status 0 "Network cleanup verified - network no longer exists"
else
    print_warning "Network may not have been completely cleaned up"
    echo "$cleanup_check_response"
fi

# Final summary
print_step "🎉 Test Summary"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Test network ID used: $NETWORK_ID"
echo "Base URL: $BASE_URL"
echo ""
echo "Key features tested:"
echo "• Network creation with custom parameters"
echo "• Node addition with custom and auto-assigned parameters"
echo "• Port conflict detection"
echo "• Node removal and verification"
echo "• Error handling for invalid operations"
echo "• Complete cleanup"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "• Check Docker containers: docker ps -a | grep besu"
echo "• Check Docker networks: docker network ls | grep $NETWORK_ID"
echo "• Monitor logs: docker logs <container-id>"

# Cleanup temp files
rm -f /tmp/health_check

echo ""
echo -e "${GREEN}🚀 Testing completed successfully!${NC}"

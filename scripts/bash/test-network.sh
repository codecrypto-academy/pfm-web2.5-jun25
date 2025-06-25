#!/bin/bash

# Test suite for Besu network

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_DETAILS=()

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    echo -n "🧪 Testing: $test_name... "
    
    # Capture test output for debugging if needed
    local test_output
    if test_output=$($test_function 2>&1); then
        echo "✅ PASS"
        ((TESTS_PASSED++))
        TEST_DETAILS+=("✅ $test_name")
    else
        echo "❌ FAIL"
        ((TESTS_FAILED++))
        TEST_DETAILS+=("❌ $test_name")
        # Store error details for debugging (commented out to avoid clutter)
        # TEST_DETAILS+=("   Error: $test_output")
    fi
}

# Individual test functions
test_prerequisites() {
    command_exists podman && \
    command_exists node && \
    command_exists curl
}

test_podman_machine() {
    [[ "$(uname)" != "Darwin" ]] || podman machine list | grep -q "running"
}

test_network_exists() {
    network_exists "$NETWORK_NAME"
}

test_containers_running() {
    local containers
    containers=$(podman ps --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null | wc -l)
    [[ $containers -eq 3 ]]
}

test_rpc_connectivity() {
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "http://localhost:$RPC_EXTERNAL_PORT" | \
        jq -e '.result' >/dev/null
}

test_chain_id() {
    local response
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
        "http://localhost:$RPC_EXTERNAL_PORT")
    
    local chain_id
    chain_id=$(echo "$response" | jq -r '.result')
    [[ "$chain_id" == "$CHAIN_ID" ]]
}

test_mining_active() {
    local block1
    block1=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "http://localhost:$RPC_EXTERNAL_PORT" | \
        jq -r '.result')
    
    # Wait for at least one block cycle (block time + buffer)
    sleep $((BLOCK_PERIOD + 2))
    
    local block2
    block2=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "http://localhost:$RPC_EXTERNAL_PORT" | \
        jq -r '.result')
    
    # Convert hex to decimal and compare (handle both hex and decimal responses)
    local block1_dec block2_dec
    if [[ "$block1" =~ ^0x ]]; then
        block1_dec=$((block1))
        block2_dec=$((block2))
    else
        block1_dec=$block1
        block2_dec=$block2
    fi
    
    [[ $block2_dec -gt $block1_dec ]]
}

test_miner_balance() {
    local miner_address
    miner_address=$(cat "$NETWORK_DIR/miner-node/address" 2>/dev/null)
    
    [[ -n "$miner_address" ]] || return 1
    
    local balance
    balance=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0x$miner_address\",\"latest\"],\"id\":1}" \
        "http://localhost:$RPC_EXTERNAL_PORT" | \
        jq -r '.result')
    
    # Check if balance exists and is not 0x0
    [[ -n "$balance" ]] && [[ "$balance" != "0x0" ]] && [[ "$balance" != "null" ]]
}

test_peer_connectivity() {
    local peer_count
    peer_count=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
        "http://localhost:$RPC_EXTERNAL_PORT" | \
        jq -r '.result')
    
    # Should have at least 1 peer (bootnode or other nodes)
    [[ $((peer_count)) -gt 0 ]]
}

# Main test runner
main() {
    log_info "Running comprehensive Besu network tests"
    echo ""
    
    # Basic prerequisite tests
    echo "📋 Prerequisites Tests:"
    run_test "Command line tools available" test_prerequisites
    run_test "Podman machine running" test_podman_machine
    echo ""
    
    # Network infrastructure tests
    echo "🌐 Network Infrastructure Tests:"
    run_test "Podman network exists" test_network_exists
    run_test "All containers running" test_containers_running
    echo ""
    
    # RPC and connectivity tests
    echo "🔗 RPC and Connectivity Tests:"
    run_test "RPC endpoint responding" test_rpc_connectivity
    run_test "Correct chain ID" test_chain_id
    run_test "Peer connectivity" test_peer_connectivity
    echo ""
    
    # Blockchain functionality tests
    echo "⛏️  Blockchain Functionality Tests:"
    run_test "Mining is active" test_mining_active
    run_test "Miner has balance" test_miner_balance
    echo ""
    
    # Display results
    echo "📊 Test Results Summary:"
    echo "===================="
    
    for detail in "${TEST_DETAILS[@]}"; do
        echo "  $detail"
    done
    
    echo ""
    echo "✅ Tests Passed: $TESTS_PASSED"
    echo "❌ Tests Failed: $TESTS_FAILED"
    echo "📈 Success Rate: $(( (TESTS_PASSED * 100) / (TESTS_PASSED + TESTS_FAILED) ))%"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All tests passed! 🎉"
        echo ""
        echo "🚀 Your Besu network is fully operational!"
        echo "   RPC Endpoint: http://localhost:$RPC_EXTERNAL_PORT"
        echo "   Chain ID: $CHAIN_ID"
        echo "   Block Time: ${BLOCK_PERIOD}s"
        return 0
    else
        log_error "Some tests failed. Check the network status."
        echo ""
        echo "💡 Troubleshooting tips:"
        echo "   1. Check network status: ./besu-network.sh status"
        echo "   2. View container logs: ./besu-network.sh logs"
        echo "   3. Restart network: ./besu-network.sh restart"
        echo "   4. Reset if corrupted: ./besu-network.sh reset"
        return 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

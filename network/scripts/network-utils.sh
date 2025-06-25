#!/bin/bash

# Network status and management utilities

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Main function
main() {
    local command="${1:-status}"
    
    case "$command" in
        "status")
            show_network_status
            ;;
        "logs")
            show_logs "${2:-all}"
            ;;
        "test")
            test_network_connectivity
            ;;
        "reset")
            reset_network
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# Show network status
show_network_status() {
    log_info "Besu Network Status"
    
    # Check Podman availability
    if ! command_exists podman; then
        log_error "Podman is not available"
        return 1
    fi
    
    # Check if network exists
    if network_exists "$NETWORK_NAME"; then
        echo "✅ Network '$NETWORK_NAME' exists"
    else
        echo "❌ Network '$NETWORK_NAME' does not exist"
        return 1
    fi
    
    # Show container status
    echo ""
    echo "Container Status:"
    local containers
    containers=$(podman ps -a --filter "label=network=$NETWORK_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true)
    
    if [[ -n "$containers" ]]; then
        echo "$containers"
    else
        echo "  No containers found for network: $NETWORK_NAME"
        return 1
    fi
    
    # Check RPC connectivity
    echo ""
    echo "RPC Connectivity:"
    local rpc_url="http://localhost:$RPC_EXTERNAL_PORT"
    
    if command_exists curl; then
        if curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$rpc_url" >/dev/null 2>&1; then
            
            # Get current block number
            local block_response
            block_response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                "$rpc_url")
            
            local block_number
            block_number=$(echo "$block_response" | jq -r '.result // "N/A"' 2>/dev/null || echo "N/A")
            
            if [[ "$block_number" != "N/A" && "$block_number" != "null" ]]; then
                local decimal_block
                decimal_block=$((block_number))
                echo "  ✅ RPC responding at $rpc_url"
                echo "  📊 Current block: $decimal_block (hex: $block_number)"
                
                # Get network info
                local network_info
                network_info=$(curl -s -X POST \
                    -H "Content-Type: application/json" \
                    -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
                    "$rpc_url" | jq -r '.result // "N/A"' 2>/dev/null || echo "N/A")
                
                if [[ "$network_info" != "N/A" ]]; then
                    echo "  🌐 Chain ID: $network_info"
                fi
            else
                echo "  ⚠️  RPC responding but returned invalid block number"
            fi
        else
            echo "  ❌ RPC not responding at $rpc_url"
        fi
    else
        echo "  ⚠️  curl not available - cannot test RPC connectivity"
    fi
    
    # Show network details
    echo ""
    echo "Network Details:"
    podman network inspect "$NETWORK_NAME" 2>/dev/null | \
        jq -r '.[0] | "  Subnet: \(.subnets[0].subnet)\n  Gateway: \(.subnets[0].gateway)"' 2>/dev/null || {
        echo "  Could not retrieve network details"
    }
}

# Show container logs
show_logs() {
    local container="${1:-all}"
    local lines="${2:-50}"
    
    if [[ "$container" == "all" ]]; then
        local containers
        containers=$(podman ps --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null || true)
        
        if [[ -z "$containers" ]]; then
            log_error "No running containers found for network: $NETWORK_NAME"
            return 1
        fi
        
        for container_id in $containers; do
            local container_name
            container_name=$(podman inspect "$container_id" --format '{{.Name}}' 2>/dev/null || echo "unknown")
            
            echo "==================== Logs for $container_name ===================="
            podman logs --tail "$lines" "$container_id" 2>&1 || true
            echo ""
        done
    else
        if ! container_exists "$container"; then
            log_error "Container '$container' does not exist"
            return 1
        fi
        
        echo "==================== Logs for $container ===================="
        podman logs --tail "$lines" "$container" 2>&1 || true
    fi
}

# Test network connectivity
test_network_connectivity() {
    log_info "Testing network connectivity"
    
    local rpc_url="http://localhost:$RPC_EXTERNAL_PORT"
    
    if ! command_exists curl; then
        log_error "curl is required for network testing"
        return 1
    fi
    
    # Test basic connectivity
    echo "🔗 Testing RPC connectivity..."
    if ! curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$rpc_url" >/dev/null; then
        log_error "RPC connectivity test failed"
        return 1
    fi
    
    echo "✅ RPC connectivity: OK"
    
    # Test various RPC methods
    echo ""
    echo "🧪 Testing RPC methods..."
    
    local methods=(
        "eth_blockNumber:Get current block number"
        "net_version:Get network/chain ID"
        "eth_gasPrice:Get current gas price"
        "net_peerCount:Get peer count"
    )
    
    for method_info in "${methods[@]}"; do
        local method="${method_info%:*}"
        local description="${method_info#*:}"
        
        echo -n "  Testing $method ($description)... "
        
        local response
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":[],\"id\":1}" \
            "$rpc_url")
        
        if echo "$response" | jq -e '.result' >/dev/null 2>&1; then
            local result
            result=$(echo "$response" | jq -r '.result')
            echo "✅ Result: $result"
        else
            echo "❌ Failed"
        fi
    done
    
    echo ""
    log_success "Network connectivity tests completed"
}

# Reset entire network
reset_network() {
    log_warning "This will completely reset the Besu network"
    echo "This action will:"
    echo "  - Stop all containers"
    echo "  - Remove all containers"
    echo "  - Remove the network"
    echo "  - Delete all blockchain data and keys"
    echo ""
    
    read -p "Are you sure you want to continue? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Reset cancelled"
        return 0
    fi
    
    log_info "Resetting network..."
    
    # Stop containers
    "$SCRIPT_DIR/stop-network.sh" --force
    
    # Remove network
    if network_exists "$NETWORK_NAME"; then
        log_info "Removing network: $NETWORK_NAME"
        podman network rm "$NETWORK_NAME" 2>/dev/null || true
    fi
    
    # Remove data directory
    if [[ -d "$NETWORK_DIR" ]]; then
        log_info "Removing data directory: $NETWORK_DIR"
        rm -rf "$NETWORK_DIR"
    fi
    
    log_success "Network reset completed"
    log_info "To recreate the network, run:"
    log_info "  ./scripts/setup-network.sh"
    log_info "  ./scripts/generate-keys.sh"
    log_info "  ./scripts/generate-config.sh"
    log_info "  ./scripts/start-network.sh"
}

# Show usage information
show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show network and container status"
    echo "  logs [container]    Show container logs (default: all containers)"
    echo "  test                Test network connectivity and RPC methods"
    echo "  reset               Reset entire network (destructive!)"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Show full network status"
    echo "  $0 logs             # Show logs for all containers"
    echo "  $0 logs rpc-node    # Show logs for specific container"
    echo "  $0 test             # Test network connectivity"
    echo "  $0 reset            # Reset entire network"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

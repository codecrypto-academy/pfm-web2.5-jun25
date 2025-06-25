#!/bin/bash

# Start Besu network containers with Podman

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Main function
main() {
    log_info "Starting Besu network containers"
    
    # Validate prerequisites
    check_podman
    validate_config
    check_prerequisites
    
    # Start containers in proper order
    start_bootnode
    start_miner_node
    start_rpc_node
    
    # Wait for all containers to be ready
    wait_for_network_ready
    
    log_success "Besu network started successfully"
    display_network_info
}

# Check if all required files exist
check_prerequisites() {
    local required_files=(
        "$NETWORK_DIR/genesis.json"
        "$NETWORK_DIR/config.toml"
        "$NETWORK_DIR/bootnode-config.toml"
        "$NETWORK_DIR/bootnode/key"
        "$NETWORK_DIR/miner-node/key"
        "$NETWORK_DIR/rpc-node/key"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            log_info "Run setup scripts first:"
            log_info "  ./bash/setup-network.sh"
            log_info "  ./bash/generate-keys.sh"
            log_info "  ./bash/generate-config.sh"
            exit 1
        fi
    done
    
    # Check if network exists
    if ! network_exists "$NETWORK_NAME"; then
        log_error "Network '$NETWORK_NAME' does not exist"
        log_info "Run ./bash/setup-network.sh first"
        exit 1
    fi
    
    log_success "All prerequisites verified"
}

# Start bootnode container
start_bootnode() {
    local container_name="bootnode"
    
    log_info "Starting bootnode container..."
    
    # Remove existing container if it exists
    if container_exists "$container_name"; then
        log_info "Removing existing bootnode container..."
        podman rm -f "$container_name" >/dev/null 2>&1 || true
    fi
    
    # Get absolute path for volume mounting
    local network_abs_path
    network_abs_path="$(cd "$NETWORK_DIR" && pwd)"
    
    if ! podman run -d \
        --name "$container_name" \
        --label "network=$NETWORK_NAME" \
        --label "role=bootnode" \
        --network "$NETWORK_NAME" \
        --ip "$BOOTNODE_IP" \
        --volume "${network_abs_path}:/data:Z" \
        --restart unless-stopped \
        "$BESU_IMAGE" \
        --config-file="/data/bootnode-config.toml" \
        --data-path="/data/bootnode/data" \
        --node-private-key-file="/data/bootnode/key"; then
        
        log_error "Failed to start bootnode container"
        exit 1
    fi
    
    # Wait for container to be ready
    if ! wait_for_container "$container_name" 30; then
        log_error "Bootnode container failed to start properly"
        podman logs "$container_name" 2>/dev/null || true
        exit 1
    fi
    
    log_success "Bootnode container started (IP: $BOOTNODE_IP)"
}

# Start miner node container
start_miner_node() {
    local container_name="miner-node"
    
    log_info "Starting miner node container..."
    
    # Remove existing container if it exists
    if container_exists "$container_name"; then
        log_info "Removing existing miner-node container..."
        podman rm -f "$container_name" >/dev/null 2>&1 || true
    fi
    
    # Get absolute path for volume mounting
    local network_abs_path
    network_abs_path="$(cd "$NETWORK_DIR" && pwd)"
    
    if ! podman run -d \
        --name "$container_name" \
        --label "network=$NETWORK_NAME" \
        --label "role=miner" \
        --network "$NETWORK_NAME" \
        --ip "$MINER_NODE_IP" \
        --volume "${network_abs_path}:/data:Z" \
        --restart unless-stopped \
        "$BESU_IMAGE" \
        --config-file="/data/config.toml" \
        --data-path="/data/miner-node/data" \
        --node-private-key-file="/data/miner-node/key" \
        --miner-enabled=true \
        --miner-coinbase="0x$(cat "$NETWORK_DIR/miner-node/address")"; then
        
        log_error "Failed to start miner node container"
        exit 1
    fi
    
    # Wait for container to be ready
    if ! wait_for_container "$container_name" 30; then
        log_error "Miner node container failed to start properly"
        podman logs "$container_name" 2>/dev/null || true
        exit 1
    fi
    
    log_success "Miner node container started (IP: $MINER_NODE_IP)"
}

# Start RPC node container
start_rpc_node() {
    local container_name="rpc-node"
    
    log_info "Starting RPC node container..."
    
    # Remove existing container if it exists
    if container_exists "$container_name"; then
        log_info "Removing existing rpc-node container..."
        podman rm -f "$container_name" >/dev/null 2>&1 || true
    fi
    
    # Get absolute path for volume mounting
    local network_abs_path
    network_abs_path="$(cd "$NETWORK_DIR" && pwd)"
    
    if ! podman run -d \
        --name "$container_name" \
        --label "network=$NETWORK_NAME" \
        --label "role=rpc" \
        --network "$NETWORK_NAME" \
        --ip "$RPC_NODE_IP" \
        --publish "${RPC_EXTERNAL_PORT}:${RPC_PORT}" \
        --volume "${network_abs_path}:/data:Z" \
        --restart unless-stopped \
        "$BESU_IMAGE" \
        --config-file="/data/config.toml" \
        --data-path="/data/rpc-node/data" \
        --node-private-key-file="/data/rpc-node/key"; then
        
        log_error "Failed to start RPC node container"
        exit 1
    fi
    
    # Wait for container to be ready
    if ! wait_for_container "$container_name" 30; then
        log_error "RPC node container failed to start properly"
        podman logs "$container_name" 2>/dev/null || true
        exit 1
    fi
    
    log_success "RPC node container started (IP: $RPC_NODE_IP, Port: $RPC_EXTERNAL_PORT)"
}

# Wait for network to be fully ready
wait_for_network_ready() {
    log_info "Waiting for network to be fully operational..."
    
    # Wait a bit for initial startup
    sleep 5
    
    # Check RPC endpoint is responding
    local rpc_url="http://localhost:$RPC_EXTERNAL_PORT"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$rpc_url" >/dev/null 2>&1; then
            
            log_success "Network is operational and RPC is responding"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for RPC to respond..."
        sleep 2
        ((attempt++))
    done
    
    log_warning "RPC endpoint may not be fully ready yet, but containers are running"
    log_info "You can check manually with: curl -X POST -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' $rpc_url"
}

# Display network information
display_network_info() {
    log_info "Besu Network Information:"
    echo "  Network Name: $NETWORK_NAME"
    echo "  Chain ID: $CHAIN_ID"
    echo "  RPC Endpoint: http://localhost:$RPC_EXTERNAL_PORT"
    echo ""
    echo "  Containers:"
    echo "    - Bootnode:   $BOOTNODE_IP:$P2P_PORT"
    echo "    - Miner Node: $MINER_NODE_IP:$P2P_PORT"
    echo "    - RPC Node:   $RPC_NODE_IP:$P2P_PORT (exposed on localhost:$RPC_EXTERNAL_PORT)"
    echo ""
    echo "  Useful commands:"
    echo "    - Check status: podman ps --filter label=network=$NETWORK_NAME"
    echo "    - View logs:    podman logs <container-name>"
    echo "    - Stop network: ./bash/stop-network.sh"
    echo ""
    
    # Show current block number if RPC is ready
    local rpc_url="http://localhost:$RPC_EXTERNAL_PORT"
    if command_exists curl; then
        local block_number
        block_number=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$rpc_url" | \
            jq -r '.result // "N/A"' 2>/dev/null || echo "N/A")
        
        if [[ "$block_number" != "N/A" && "$block_number" != "null" ]]; then
            local decimal_block
            decimal_block=$((block_number))
            echo "  Current block number: $decimal_block (hex: $block_number)"
        fi
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

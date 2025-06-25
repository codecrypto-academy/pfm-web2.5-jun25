#!/bin/bash

# Generate keys for all nodes in the Besu network

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Main function
main() {
    log_info "Starting key generation for Besu network nodes"
    
    # Validate prerequisites
    check_node
    validate_config
    
    # Create network directory structure
    safe_mkdir "$NETWORK_DIR"
    safe_mkdir "$NETWORK_DIR/miner-node"
    safe_mkdir "$NETWORK_DIR/rpc-node"
    safe_mkdir "$NETWORK_DIR/bootnode"
    
    # Change to project root to run createKeys.ts and make paths absolute
    local project_root
    project_root="$(cd "$SCRIPT_DIR/.." && pwd)"
    cd "$project_root"
    
    # Convert NETWORK_DIR to absolute path from the network directory (not scripts)
    if [[ "$NETWORK_DIR" == ./* ]]; then
        NETWORK_DIR="$SCRIPT_DIR/../${NETWORK_DIR#./}"
    fi
    
    # Generate keys for each node
    generate_node_keys "miner-node"
    generate_node_keys "rpc-node"
    
    # Generate keys and enode for bootnode
    generate_bootnode_keys
    
    log_success "All keys generated successfully"
}

# Generate keys for a regular node
generate_node_keys() {
    local node_name="$1"
    local node_dir="$NETWORK_DIR/$node_name"
    
    log_info "Generating keys for $node_name..."
    
    if ! yarn dev createKeys "$node_dir"; then
        log_error "Failed to generate keys for $node_name"
        exit 1
    fi
    
    # Verify key files were created
    local key_files=("key" "pub" "address")
    for file in "${key_files[@]}"; do
        if [[ ! -f "$node_dir/$file" ]]; then
            log_error "Key file not found: $node_dir/$file"
            exit 1
        fi
    done
    
    log_success "Keys generated for $node_name"
}

# Generate keys and enode for bootnode
generate_bootnode_keys() {
    local bootnode_dir="$NETWORK_DIR/bootnode"
    
    log_info "Generating keys and enode for bootnode..."
    
    if ! yarn dev createKeysAndEnode "$BOOTNODE_IP" "$P2P_PORT" "$bootnode_dir"; then
        log_error "Failed to generate keys and enode for bootnode"
        exit 1
    fi
    
    # Verify all files were created
    local required_files=("key" "pub" "address" "enode")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$bootnode_dir/$file" ]]; then
            log_error "Required file not found: $bootnode_dir/$file"
            exit 1
        fi
    done
    
    # Display the generated enode for verification
    local enode_url
    enode_url=$(cat "$bootnode_dir/enode")
    log_info "Generated enode URL: $enode_url"
    
    log_success "Keys and enode generated for bootnode"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

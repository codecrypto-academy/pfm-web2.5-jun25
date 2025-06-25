#!/bin/bash

# Generate genesis block and configuration files for Besu network

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Main function
main() {
    log_info "Generating genesis block and configuration files"
    
    # Validate prerequisites
    validate_config
    
    # Check if required key files exist
    check_key_files
    
    # Generate genesis block
    generate_genesis_block
    
    # Generate configuration files
    generate_bootnode_config
    generate_node_config
    
    log_success "Genesis block and configuration files generated successfully"
}

# Check if all required key files exist
check_key_files() {
    local required_files=(
        "$NETWORK_DIR/miner-node/address"
        "$NETWORK_DIR/bootnode/enode"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required key file not found: $file"
            log_info "Run generate-keys.sh first to create the necessary keys"
            exit 1
        fi
    done
    
    log_success "All required key files found"
}

# Generate genesis block configuration
generate_genesis_block() {
    local genesis_file="$NETWORK_DIR/genesis.json"
    local miner_address
    
    log_info "Generating genesis block configuration..."
    
    # Read miner address (remove any whitespace/newlines)
    miner_address=$(tr -d '[:space:]' < "$NETWORK_DIR/miner-node/address")
    
    # Validate address format
    if [[ ! "$miner_address" =~ ^[0-9a-fA-F]{40}$ ]]; then
        log_error "Invalid miner address format: $miner_address"
        exit 1
    fi
    
    # Create genesis.json with proper formatting
    cat > "$genesis_file" << EOF
{
    "config": {
        "chainId": ${CHAIN_ID},
        "londonBlock": 0,
        "clique": {
            "blockperiodseconds": ${BLOCK_PERIOD},
            "epochlength": ${EPOCH_LENGTH},
            "createemptyblocks": true
        }
    },
    "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000${miner_address}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "alloc": {
        "0x${miner_address}": {
            "balance": "0x20000000000000000000000000000000000000000000000000000000000"
        }
    }
}
EOF
    
    # Validate JSON syntax
    if ! jq empty "$genesis_file" 2>/dev/null; then
        log_error "Generated genesis.json has invalid JSON syntax"
        exit 1
    fi
    
    log_success "Genesis block configuration created: $genesis_file"
}

# Generate bootnode configuration
generate_bootnode_config() {
    local config_file="$NETWORK_DIR/bootnode-config.toml"
    
    log_info "Generating bootnode configuration..."
    
    cat > "$config_file" << EOF
# Bootnode Configuration for Besu Network

# Genesis configuration
genesis-file="/data/genesis.json"

# Network settings
p2p-host="0.0.0.0"
p2p-port=${P2P_PORT}
p2p-enabled=true
discovery-enabled=true

# RPC settings
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${RPC_PORT}
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN", "ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]

# Logging
logging="${LOG_LEVEL}"
EOF
    
    log_success "Bootnode configuration created: $config_file"
}

# Generate regular node configuration
generate_node_config() {
    local config_file="$NETWORK_DIR/config.toml"
    local enode_url
    
    log_info "Generating node configuration..."
    
    # Read enode URL (remove any whitespace/newlines)
    enode_url=$(tr -d '[:space:]' < "$NETWORK_DIR/bootnode/enode")
    
    # Validate enode format
    if [[ ! "$enode_url" =~ ^enode://[0-9a-fA-F]{128}@[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$ ]]; then
        log_error "Invalid enode URL format: $enode_url"
        exit 1
    fi
    
    cat > "$config_file" << EOF
# Node Configuration for Besu Network

# Genesis configuration
genesis-file="/data/genesis.json"

# Network settings
p2p-host="0.0.0.0"
p2p-port=${P2P_PORT}
p2p-enabled=true
discovery-enabled=true

# Bootnode configuration
bootnodes=["${enode_url}"]

# RPC settings
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${RPC_PORT}
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN", "ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]

# Mining settings (for miner node)
miner-enabled=false
miner-coinbase="0x0000000000000000000000000000000000000000"

# Logging
logging="${LOG_LEVEL}"
EOF
    
    log_success "Node configuration created: $config_file"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

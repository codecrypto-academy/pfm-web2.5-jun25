#!/bin/bash

set -e

NETWORK_NAME="besu-network"
CHAIN_ID=1337
NODE_COUNT=3
BASE_PORT=8545
P2P_BASE_PORT=30303
DATA_DIR="./data"
CONFIG_DIR="./config"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
    log "ERROR: $1"
    cleanup
    exit 1
}

cleanup() {
    log "Cleaning up resources..."
    docker network rm $NETWORK_NAME 2>/dev/null || true
    docker rm -f $(docker ps -aq --filter "name=besu-node") 2>/dev/null || true
    # Don't remove data and config directories during cleanup
    rm -rf $DATA_DIR $CONFIG_DIR
}

generate_keys() {
    log "Generating validator keys..."
    mkdir -p $CONFIG_DIR
    
    for i in $(seq 0 $((NODE_COUNT-1))); do
        mkdir -p $DATA_DIR/node$i
        
        # Only generate keys if they don't exist
        if [ ! -f "$DATA_DIR/node$i/key" ] || [ ! -f "$DATA_DIR/node$i/address" ]; then
            log "Generating keys for node $i..."
            
            # Generate private key first
            docker run --rm -v "$(pwd)/$DATA_DIR/node$i:/data" \
                hyperledger/besu:latest \
                --data-path=/data \
                public-key export --to=/data/key.pub || error_exit "Failed to generate public key for node$i"
            
            # Generate address
            docker run --rm -v "$(pwd)/$DATA_DIR/node$i:/data" \
                hyperledger/besu:latest \
                --data-path=/data \
                public-key export-address --to=/data/address || error_exit "Failed to generate address for node$i"
        else
            log "Keys already exist for node $i, skipping generation"
        fi
    done
}

generate_genesis() {
    log "Generating genesis block..."
    
    # Read validator addresses and concatenate them
    VALIDATOR_ADDRESSES=""
    for i in $(seq 0 $((NODE_COUNT-1))); do
        if [ -f "$DATA_DIR/node$i/address" ]; then
            ADDRESS=$(cat "$DATA_DIR/node$i/address" | sed 's/0x//')
            VALIDATOR_ADDRESSES="${VALIDATOR_ADDRESSES}${ADDRESS}"
        fi
    done
    
    # Create extraData with proper format for Clique
    # 32 bytes of zeros + validator addresses + 65 bytes of zeros
    EXTRA_DATA="0x0000000000000000000000000000000000000000000000000000000000000000${VALIDATOR_ADDRESSES}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    
    mkdir -p $CONFIG_DIR
    
    # Create genesis.json with proper formatting
    cat > $CONFIG_DIR/genesis.json << 'EOF'
{
  "config": {
    "chainId": 1337,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "nonce": "0x0",
  "timestamp": "0x0",
EOF
    
    # Add extraData
    echo "  \"extraData\": \"$EXTRA_DATA\"," >> $CONFIG_DIR/genesis.json
    
    # Add remaining fields
    cat >> $CONFIG_DIR/genesis.json << 'EOF'
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "coinbase": "0x0000000000000000000000000000000000000000",
  "alloc": {
    "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73": {
      "balance": "0xad78ebc5ac6200000"
    },
EOF
    
    # Add validator addresses with funds
    for i in $(seq 0 $((NODE_COUNT-1))); do
        if [ -f "$DATA_DIR/node$i/address" ]; then
            ADDRESS=$(cat "$DATA_DIR/node$i/address")
            if [ $i -eq $((NODE_COUNT-1)) ]; then
                # Last entry without comma
                echo "    \"$ADDRESS\": {" >> $CONFIG_DIR/genesis.json
                echo "      \"balance\": \"0xad78ebc5ac6200000\"" >> $CONFIG_DIR/genesis.json
                echo "    }" >> $CONFIG_DIR/genesis.json
            else
                # Entry with comma
                echo "    \"$ADDRESS\": {" >> $CONFIG_DIR/genesis.json
                echo "      \"balance\": \"0xad78ebc5ac6200000\"" >> $CONFIG_DIR/genesis.json
                echo "    }," >> $CONFIG_DIR/genesis.json
            fi
        fi
    done
    
    # Close the JSON
    cat >> $CONFIG_DIR/genesis.json << 'EOF'
  }
}
EOF
}

create_network() {
    log "Creating Docker network: $NETWORK_NAME"
    
    # Check if network already exists
    if docker network ls | grep -q "$NETWORK_NAME"; then
        log "Network $NETWORK_NAME already exists, removing it first..."
        docker network rm $NETWORK_NAME 2>/dev/null || true
    fi
    
    docker network create $NETWORK_NAME || error_exit "Failed to create Docker network"
}

start_nodes() {
    log "Starting Besu nodes..."
    
    # First, start node 0 as the bootnode
    NODE_NAME="besu-node0"
    RPC_PORT=$BASE_PORT
    P2P_PORT=$P2P_BASE_PORT
    
    log "Starting bootnode (node 0) on ports RPC:$RPC_PORT P2P:$P2P_PORT"
    
    # Get the address for node 0 to use as coinbase
    NODE0_ADDRESS=$(cat "$DATA_DIR/node0/address" 2>/dev/null || echo "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73")
    
    docker run -d \
            --name $NODE_NAME \
            --network $NETWORK_NAME \
            -p $RPC_PORT:8545 \
            -p $P2P_PORT:30303 \
            -v "$(pwd)/$DATA_DIR/node0:/data" \
            -v "$(pwd)/$CONFIG_DIR:/config" \
            hyperledger/besu:latest \
            --data-path=/data \
            --genesis-file=/config/genesis.json \
            --network-id=$CHAIN_ID \
            --rpc-http-enabled \
            --rpc-http-host=0.0.0.0 \
            --rpc-http-port=8545 \
            --rpc-http-cors-origins="*" \
            --rpc-http-api=ETH,NET,CLIQUE,WEB3,ADMIN \
            --host-allowlist="*" \
            --p2p-port=30303 \
            --p2p-host=0.0.0.0 \
            --p2p-enabled=true \
            --discovery-enabled=true \
            --max-peers=25 \
            --sync-mode=FULL \
            --miner-enabled \
            --miner-coinbase=$NODE0_ADDRESS \
            --node-private-key-file=/data/key \
            --logging=INFO || error_exit "Failed to start bootnode (node 0)"
    
    # Wait for bootnode to start and get its enode
    sleep 10
    log "Getting bootnode enode..."
    
    # Get the enode of the bootnode from logs and IP address
    BOOTNODE_ENODE=""
    RETRIES=10
    while [ $RETRIES -gt 0 ] && [ -z "$BOOTNODE_ENODE" ]; do
        # Get the IP address of the bootnode container
        BOOTNODE_IP=$(docker inspect besu-node0 --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "")
        
        if [ -n "$BOOTNODE_IP" ]; then
            # Extract enode from container logs and replace IP
            BOOTNODE_ENODE=$(docker logs besu-node0 2>&1 | grep "Enode URL" | tail -1 | grep -o 'enode://[^@]*@[^:]*:30303' | sed "s/@[^:]*:/@$BOOTNODE_IP:/g" || echo "")
        fi
        
        if [ -z "$BOOTNODE_ENODE" ]; then
            log "Waiting for bootnode enode... ($RETRIES retries left)"
            sleep 3
            RETRIES=$((RETRIES-1))
        fi
    done
    
    if [ -z "$BOOTNODE_ENODE" ]; then
        log "Warning: Could not get bootnode enode, nodes may not connect properly"
        BOOTNODES=""
    else
        log "Bootnode enode: $BOOTNODE_ENODE"
        BOOTNODES="--bootnodes=$BOOTNODE_ENODE"
    fi
    
    # Now start the remaining nodes with bootnode configuration
    for i in $(seq 1 $((NODE_COUNT-1))); do
        NODE_NAME="besu-node$i"
        RPC_PORT=$((BASE_PORT + i))
        P2P_PORT=$((P2P_BASE_PORT + i))
        
        log "Starting node $i on ports RPC:$RPC_PORT P2P:$P2P_PORT with bootnode"
        
        # Get the address for this node to use as coinbase
        NODE_ADDRESS=$(cat "$DATA_DIR/node$i/address" 2>/dev/null || echo "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73")
        
        docker run -d \
                --name $NODE_NAME \
                --network $NETWORK_NAME \
                -p $RPC_PORT:8545 \
                -p $P2P_PORT:30303 \
                -v "$(pwd)/$DATA_DIR/node$i:/data" \
                -v "$(pwd)/$CONFIG_DIR:/config" \
                hyperledger/besu:latest \
                --data-path=/data \
                --genesis-file=/config/genesis.json \
                --network-id=$CHAIN_ID \
                --rpc-http-enabled \
                --rpc-http-host=0.0.0.0 \
                --rpc-http-port=8545 \
                --rpc-http-cors-origins="*" \
                --rpc-http-api=ETH,NET,CLIQUE,WEB3,ADMIN \
                --host-allowlist="*" \
                --p2p-port=30303 \
                --p2p-host=0.0.0.0 \
                --p2p-enabled=true \
                --discovery-enabled=true \
                --max-peers=25 \
                --sync-mode=FULL \
                --miner-enabled \
                --miner-coinbase=$NODE_ADDRESS \
                --logging=INFO \
                $BOOTNODES || error_exit "Failed to start node $i"
        
        sleep 5
    done
}

wait_for_nodes() {
    log "Waiting for nodes to be ready..."
    
    for i in $(seq 0 $((NODE_COUNT-1))); do
        RETRIES=30
        
        while [ $RETRIES -gt 0 ]; do
            # Check if container is running and healthy
            if docker ps --filter "name=besu-node$i" --filter "status=running" --format "{{.Names}}" | grep -q "besu-node$i"; then
                # Wait a bit more for RPC to be fully ready
                sleep 3
                log "Node $i is ready (container running)"
                break
            fi
            
            RETRIES=$((RETRIES-1))
            if [ $RETRIES -eq 0 ]; then
                log "Node $i logs:"
                docker logs besu-node$i 2>&1 | tail -20
                error_exit "Node $i failed to start properly after 60 seconds"
            fi
            
            log "Waiting for node $i... ($RETRIES retries left)"
            sleep 2
        done
    done
    
    # Additional wait to ensure RPC is fully ready
    log "Nodes started, waiting for RPC services to be fully ready..."
    sleep 5
}

test_network() {
    log "Testing basic network connectivity..."
    
    # Test RPC endpoint
    log "Testing RPC endpoint on port $BASE_PORT..."
    
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:$BASE_PORT)
    
    if echo "$RESPONSE" | grep -q '"result"'; then
        BLOCK_NUMBER=$(echo "$RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        log "✅ RPC endpoint responding! Current block: $BLOCK_NUMBER"
        log "✅ Network is ready for testing"
    else
        log "❌ RPC endpoint not responding: $RESPONSE"
        exit 1
    fi
}



show_status() {
    log "Network Status:"
    echo "====================================="
    echo "Network Name: $NETWORK_NAME"
    echo "Chain ID: $CHAIN_ID"
    echo "Number of Nodes: $NODE_COUNT"
    echo "RPC Endpoints:"
    
    for i in $(seq 0 $((NODE_COUNT-1))); do
        RPC_PORT=$((BASE_PORT + i))
        echo "  Node $i: http://localhost:$RPC_PORT"
    done
    
    echo "====================================="
    echo "To stop the network, run: $0 stop"
}

stop_network() {
    log "Stopping Besu network..."
    cleanup
    log "Network stopped successfully"
}

main() {
    case "${1:-start}" in
        "start")
            log "Starting Besu network deployment..."
            cleanup
            generate_keys
            generate_genesis
            create_network
            start_nodes
            wait_for_nodes
            test_network
            show_status
            log "✅ Network deployment completed successfully!"
            log "ℹ️ To run comprehensive tests, use: bash test_transactions.sh"
            log "ℹ️ To run real transactions, use: node real_transaction.js"
            log "Besu network deployed successfully!"
            log "Network is running. Use './script/script.sh stop' to stop it."
            
            # Check if we should keep the script running
            if [ "${2:-}" = "--daemon" ] || [ "${2:-}" = "-d" ]; then
                log "Running in daemon mode - script will exit but network will continue running"
                log "Use './script/script.sh stop' to stop the network"
            else
                log "Running in interactive mode - Press Ctrl+C to stop the network"
                log "Tip: Use './script/script.sh start --daemon' to run in background"
                
                # Keep the script running to prevent cleanup
                while true; do
                    sleep 30
                    # Check if nodes are still running
                    if ! docker ps --filter "name=besu-node" --format "table {{.Names}}" | grep -q besu-node; then
                        log "No nodes running, exiting..."
                        break
                    fi
                done
            fi
            ;;
        "stop")
            stop_network
            ;;
        "status")
            show_status
            ;;
        *)
            echo "Usage: $0 {start|stop|status}"
            echo "  start         - Deploy and start the Besu network (interactive mode)"
            echo "  start --daemon - Deploy and start the network in daemon mode"
            echo "  start -d      - Same as --daemon (short form)"
            echo "  stop          - Stop and cleanup the network"
            echo "  status        - Show network status"
            echo ""
            echo "Interactive mode: Script stays running until Ctrl+C"
            echo "Daemon mode: Script exits after deployment, network continues running"
            exit 1
            ;;
    esac
}

# Remove problematic trap that causes premature cleanup
# trap 'if [ $? -ne 0 ]; then cleanup; fi' EXIT
main "$@"
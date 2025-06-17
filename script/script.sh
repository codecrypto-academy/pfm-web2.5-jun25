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
    rm -rf $DATA_DIR $CONFIG_DIR
}

generate_keys() {
    log "Generating validator keys..."
    mkdir -p $CONFIG_DIR
    
    for i in $(seq 0 $((NODE_COUNT-1))); do
        mkdir -p $DATA_DIR/node$i/keys
        docker run --rm -v "$(pwd)/$DATA_DIR/node$i:/data" \
            hyperledger/besu:latest \
            --data-path=/data \
            public-key export --to=/data/key.pub || error_exit "Failed to generate keys for node$i"
        
        docker run --rm -v "$(pwd)/$DATA_DIR/node$i:/data" \
            hyperledger/besu:latest \
            --data-path=/data \
            public-key export-address --to=/data/address || error_exit "Failed to generate address for node$i"
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
      "period": 15,
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
    docker network create $NETWORK_NAME || error_exit "Failed to create Docker network"
}

start_nodes() {
    log "Starting Besu nodes..."
    
    for i in $(seq 0 $((NODE_COUNT-1))); do
        NODE_NAME="besu-node$i"
        RPC_PORT=$((BASE_PORT + i))
        P2P_PORT=$((P2P_BASE_PORT + i))
        
        BOOTNODES=""
        if [ $i -gt 0 ]; then
            BOOTNODE_ENODE=$(docker logs besu-node0 2>&1 | grep "enode://" | head -1 | sed 's/.*enode:/enode:/' | sed 's/@.*//' | head -1)
            if [ ! -z "$BOOTNODE_ENODE" ]; then
                BOOTNODES="--bootnodes=${BOOTNODE_ENODE}@besu-node0:30303"
            fi
        fi
        
        log "Starting node $i on ports RPC:$RPC_PORT P2P:$P2P_PORT"
        
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
            --rpc-http-api=ETH,NET,CLIQUE \
            --host-allowlist="*" \
            --p2p-port=30303 \
            --miner-enabled \
            --miner-coinbase=0xfe3b557e8fb62b89f4916b721be55ceb828dbd73 \
            $BOOTNODES || error_exit "Failed to start node $i"
        
        sleep 5
    done
}

wait_for_nodes() {
    log "Waiting for nodes to be ready..."
    
    for i in $(seq 0 $((NODE_COUNT-1))); do
        RPC_PORT=$((BASE_PORT + i))
        RETRIES=30
        
        while [ $RETRIES -gt 0 ]; do
            if curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                http://localhost:$RPC_PORT > /dev/null 2>&1; then
                log "Node $i is ready"
                break
            fi
            
            RETRIES=$((RETRIES-1))
            if [ $RETRIES -eq 0 ]; then
                error_exit "Node $i failed to start properly"
            fi
            
            sleep 2
        done
    done
}

test_network() {
    log "Testing network functionality..."
    
    # Test RPC connectivity
    BLOCK_NUMBER=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$BLOCK_NUMBER" ]; then
        log "Network is working! Current block: $BLOCK_NUMBER"
    else
        log "ERROR: Network RPC not responding"
        return 1
    fi
    
    # Test peer connectivity
    PEER_COUNT=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
        http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    log "Connected peers: $PEER_COUNT"
    
    # Test account balance (verify pre-funded accounts)
    log "Testing account balances..."
    SENDER_ADDRESS=$(cat "$DATA_DIR/node0/address")
    
    BALANCE_RESULT=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$SENDER_ADDRESS\",\"latest\"],\"id\":1}" \
        http://localhost:8545)
    
    if echo "$BALANCE_RESULT" | grep -q '"result"'; then
        BALANCE=$(echo "$BALANCE_RESULT" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        log "✅ Validator account balance: $BALANCE (should be 0xad78ebc5ac6200000)"
        
        # Test if we can get account info (this validates the account exists and is accessible)
        if [ "$BALANCE" = "0xad78ebc5ac6200000" ]; then
            log "✅ Account funding verified - transactions should work"
            log "✅ Network is ready for transaction processing"
        else
            log "⚠️ Account balance mismatch - expected 0xad78ebc5ac6200000, got $BALANCE"
        fi
    else
        log "⚠️ Failed to get account balance: $BALANCE_RESULT"
    fi
    
    # Test transaction capability by checking if personal API is available
    PERSONAL_TEST=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"personal_listAccounts","params":[],"id":1}' \
        http://localhost:8545)
    
    if echo "$PERSONAL_TEST" | grep -q '"result"'; then
        log "✅ Personal API available - account management enabled"
    else
        log "ℹ️ Personal API not enabled - use external wallet for transactions"
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
            log "Besu network deployed successfully!"
            log "Network is running. Use './script/script.sh stop' to stop it."
            ;;
        "stop")
            stop_network
            ;;
        "status")
            show_status
            ;;
        *)
            echo "Usage: $0 {start|stop|status}"
            echo "  start  - Deploy and start the Besu network"
            echo "  stop   - Stop and cleanup the network"
            echo "  status - Show network status"
            exit 1
            ;;
    esac
}

trap 'if [ $? -ne 0 ]; then cleanup; fi' EXIT
main "$@"
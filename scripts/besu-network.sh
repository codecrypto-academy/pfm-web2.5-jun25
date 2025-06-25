#!/bin/bash

# Main orchestrator script for Besu network management

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/config/network.conf"

# Main function
main() {
    local command="${1:-help}"
    
    case "$command" in
        "setup")
            setup_complete_network
            ;;
        "start")
            start_network_safe
            ;;
        "stop")
            "$SCRIPT_DIR/bash/stop-network.sh" "${@:2}"
            ;;
        "restart")
            restart_network
            ;;
        "status")
            "$SCRIPT_DIR/bash/network-utils.sh" status
            ;;
        "logs")
            "$SCRIPT_DIR/bash/network-utils.sh" logs "${2:-all}"
            ;;
        "test")
            "$SCRIPT_DIR/bash/test-network.sh"
            ;;
        "reset")
            "$SCRIPT_DIR/bash/network-utils.sh" reset
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Complete network setup from scratch
setup_complete_network() {
    log_info "Setting up complete Besu network from scratch"
    
    # Check prerequisites
    check_podman
    check_node
    
    # Run all setup steps
    "$SCRIPT_DIR/bash/setup-network.sh" || {
        log_error "Network setup failed"
        exit 1
    }
    
    "$SCRIPT_DIR/bash/generate-keys.sh" || {
        log_error "Key generation failed"
        exit 1
    }
    
    "$SCRIPT_DIR/bash/generate-config.sh" || {
        log_error "Configuration generation failed"
        exit 1
    }
    
    log_success "Complete network setup finished"
    log_info "To start the network, run: $0 start"
}

# Start network with safety checks
start_network_safe() {
    # Check if network is already running
    local running_containers
    running_containers=$(podman ps --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null | wc -l || echo "0")
    
    if [[ $running_containers -gt 0 ]]; then
        log_warning "Network appears to be already running ($running_containers containers)"
        log_info "Current status:"
        "$SCRIPT_DIR/bash/network-utils.sh" status
        
        # Check if we're in non-interactive mode (for SDK usage)
        if [[ "${NON_INTERACTIVE:-false}" == "true" || ! -t 0 ]]; then
            log_info "Non-interactive mode: Network is already running, nothing to do"
            return 0
        fi
        
        echo ""
        read -p "Do you want to restart the network? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restart_network
        else
            log_info "Network start cancelled"
        fi
        return 0
    fi

    # Start the network
    "$SCRIPT_DIR/bash/start-network.sh" || {
        log_error "Failed to start network"
        exit 1
    }
}

# Restart network
restart_network() {
    log_info "Restarting Besu network"
    
    # Stop existing containers
    "$SCRIPT_DIR/bash/stop-network.sh" || {
        log_warning "Stop script failed, continuing with start..."
    }
    
    # Wait a moment for cleanup
    sleep 2
    
    # Start network
    "$SCRIPT_DIR/bash/start-network.sh" || {
        log_error "Failed to restart network"
        exit 1
    }
    
    log_success "Network restarted successfully"
}

# Show usage information
show_usage() {
    cat << EOF
🔗 Besu Network Manager

Usage: $0 <command> [options]

Commands:
  setup               Complete network setup (network + keys + config)
  start               Start the network (with safety checks)
  stop [--force]      Stop the network gracefully or forcefully
  restart             Restart the network (stop + start)
  status              Show network and container status
  logs [container]    Show container logs
  test                Test network connectivity and functionality
  reset               Reset entire network (destructive!)
  help                Show this help message

Examples:
  $0 setup            # Set up everything from scratch
  $0 start            # Start the network
  $0 status           # Check network status
  $0 logs rpc-node    # Show RPC node logs
  $0 stop --force     # Force stop all containers
  $0 restart          # Restart the network
  $0 test             # Test network connectivity
  $0 reset            # Complete network reset

Network Configuration:
  Network Name: $NETWORK_NAME
  Chain ID:     $CHAIN_ID
  RPC Port:     $RPC_EXTERNAL_PORT
  Data Dir:     $NETWORK_DIR

Prerequisites:
  - Podman (brew install podman)
  - Node.js >= 18 (brew install node)
  - jq (brew install jq) - optional, for JSON parsing
  - curl - for connectivity testing

For more detailed information, see the README.md file.
EOF
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

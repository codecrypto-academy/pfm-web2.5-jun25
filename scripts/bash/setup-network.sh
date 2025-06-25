#!/bin/bash

# Setup Podman network for Besu blockchain

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Main function
main() {
    log_info "Setting up Podman network for Besu blockchain"
    
    # Validate prerequisites
    check_podman
    validate_config
    
    # Clean up existing network if it exists
    cleanup_existing_network
    
    # Create new network
    create_network
    
    log_success "Podman network setup completed successfully"
}

# Clean up existing network and containers
cleanup_existing_network() {
    log_info "Checking for existing network and containers..."
    
    # Stop and remove containers with the network label
    local containers
    containers=$(podman ps -a --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null || true)
    
    if [[ -n "$containers" ]]; then
        log_info "Stopping and removing existing containers..."
        
        # Stop containers gracefully first
        if ! podman stop $containers --time 10 2>/dev/null; then
            log_warning "Some containers couldn't be stopped gracefully, forcing stop..."
            podman kill $containers 2>/dev/null || true
        fi
        
        # Remove containers
        if ! podman rm $containers 2>/dev/null; then
            log_warning "Some containers couldn't be removed automatically"
        else
            log_success "Existing containers removed"
        fi
    fi
    
    # Remove existing network
    if network_exists "$NETWORK_NAME"; then
        log_info "Removing existing network: $NETWORK_NAME"
        
        if ! podman network rm "$NETWORK_NAME" 2>/dev/null; then
            log_error "Failed to remove existing network: $NETWORK_NAME"
            log_info "You may need to manually remove it with: podman network rm $NETWORK_NAME"
            exit 1
        fi
        
        log_success "Existing network removed"
    fi
    
    # Clean up network directory
    if [[ -d "$NETWORK_DIR" ]]; then
        log_info "Cleaning up existing network directory..."
        safe_rmdir "$NETWORK_DIR"
    fi
}

# Create Podman network
create_network() {
    log_info "Creating Podman network: $NETWORK_NAME"
    
    if ! podman network create \
        --subnet "$NETWORK_SUBNET" \
        "$NETWORK_NAME"; then
        log_error "Failed to create Podman network: $NETWORK_NAME"
        exit 1
    fi
    
    # Verify network was created
    if ! network_exists "$NETWORK_NAME"; then
        log_error "Network creation verification failed"
        exit 1
    fi
    
    log_success "Podman network created: $NETWORK_NAME (subnet: $NETWORK_SUBNET)"
    
    # Display network information
    log_info "Network details:"
    podman network inspect "$NETWORK_NAME" | jq -r '.[0] | "  Name: \(.name)\n  Subnet: \(.subnets[0].subnet)\n  Gateway: \(.subnets[0].gateway)"' || {
        log_warning "Could not display network details (jq not installed)"
        podman network ls --filter "name=$NETWORK_NAME"
    }
}

# Cleanup function for this script
cleanup_on_error() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Network setup failed"
        
        # Attempt to clean up partial setup
        if network_exists "$NETWORK_NAME"; then
            log_info "Cleaning up partially created network..."
            podman network rm "$NETWORK_NAME" 2>/dev/null || true
        fi
    fi
}

# Set up error cleanup
trap cleanup_on_error EXIT

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

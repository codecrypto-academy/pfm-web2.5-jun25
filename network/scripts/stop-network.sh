#!/bin/bash

# Stop Besu network containers

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Load configuration
load_config "$SCRIPT_DIR/../config/network.conf"

# Main function
main() {
    local force="${1:-false}"
    
    if [[ "$force" == "--force" || "$force" == "-f" ]]; then
        force=true
    fi
    
    log_info "Stopping Besu network containers"
    
    # Validate prerequisites
    check_podman
    
    # Stop containers
    stop_containers "$force"
    
    log_success "Besu network stopped successfully"
}

# Stop all network containers
stop_containers() {
    local force="$1"
    
    # Get all containers with our network label
    local containers
    containers=$(podman ps -a --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null || true)
    
    if [[ -z "$containers" ]]; then
        log_info "No containers found for network: $NETWORK_NAME"
        return 0
    fi
    
    log_info "Found containers to stop: $(echo $containers | wc -w)"
    
    # Stop containers gracefully unless force is specified
    if [[ "$force" == "true" ]]; then
        log_info "Force stopping containers..."
        
        if ! podman kill $containers 2>/dev/null; then
            log_warning "Some containers couldn't be force stopped"
        else
            log_success "All containers force stopped"
        fi
    else
        log_info "Gracefully stopping containers (timeout: 30s)..."
        
        if ! podman stop $containers --time 30 2>/dev/null; then
            log_warning "Some containers couldn't be stopped gracefully"
            log_info "Retrying with force stop..."
            
            # Try force stop for remaining containers
            local still_running
            still_running=$(podman ps --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null || true)
            
            if [[ -n "$still_running" ]]; then
                podman kill $still_running 2>/dev/null || true
            fi
        else
            log_success "All containers stopped gracefully"
        fi
    fi
    
    # Remove containers
    log_info "Removing stopped containers..."
    
    if ! podman rm $containers 2>/dev/null; then
        log_warning "Some containers couldn't be removed"
        
        # Show which containers couldn't be removed
        local remaining
        remaining=$(podman ps -a --quiet --filter "label=network=$NETWORK_NAME" 2>/dev/null || true)
        
        if [[ -n "$remaining" ]]; then
            log_warning "Remaining containers:"
            podman ps -a --filter "label=network=$NETWORK_NAME" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true
        fi
    else
        log_success "All containers removed"
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 [--force|-f]"
    echo ""
    echo "Options:"
    echo "  --force, -f    Force stop containers without graceful shutdown"
    echo ""
    echo "Examples:"
    echo "  $0              # Graceful stop with 30s timeout"
    echo "  $0 --force      # Force stop immediately"
}

# Handle help option
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    show_usage
    exit 0
fi

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

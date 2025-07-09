#!/bin/bash

# Common utilities for Besu network management
# Source this file in other scripts

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Podman is available
check_podman() {
    if ! command_exists podman; then
        log_error "Podman is not installed or not in PATH"
        log_info "Install Podman: brew install podman"
        exit 1
    fi
    
    # Check if Podman machine is running (required on macOS)
    if [[ "$(uname)" == "Darwin" ]]; then
        local machine_status
        machine_status=$(podman machine list 2>/dev/null | grep -c "running" || echo "0")
        if [[ "$machine_status" -eq 0 ]]; then
            log_warning "Podman machine is not running"
            log_info "Starting Podman machine..."
            podman machine start || {
                log_error "Failed to start Podman machine"
                exit 1
            }
        else
            log_info "Podman machine is running"
        fi
    fi
}

# Check if Node.js is available
check_node() {
    if ! command_exists node; then
        log_error "Node.js is not installed or not in PATH"
        log_info "Install Node.js: brew install node"
        exit 1
    fi
    
    # Check Node.js version (require >= 18)
    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $node_version -lt 18 ]]; then
        log_error "Node.js version 18 or higher is required (found: v$node_version)"
        exit 1
    fi
}

# Load configuration
load_config() {
    local config_file="$1"
    
    if [[ ! -f "$config_file" ]]; then
        log_error "Configuration file not found: $config_file"
        exit 1
    fi
    
    # shellcheck source=/dev/null
    source "$config_file"
    log_info "Configuration loaded from: $config_file"
}

# Wait for container to be ready
wait_for_container() {
    local container_name="$1"
    local timeout="${2:-30}"
    local count=0
    
    log_info "Waiting for container '$container_name' to be ready..."
    
    while [[ $count -lt $timeout ]]; do
        if podman ps --filter "name=$container_name" --filter "status=running" --quiet | grep -q .; then
            log_success "Container '$container_name' is running"
            return 0
        fi
        
        sleep 1
        ((count++))
    done
    
    log_error "Container '$container_name' failed to start within $timeout seconds"
    return 1
}

# Check if network exists
network_exists() {
    local network_name="$1"
    podman network ls --quiet --filter "name=^${network_name}$" | grep -q .
}

# Check if container exists
container_exists() {
    local container_name="$1"
    podman ps -a --quiet --filter "name=^${container_name}$" | grep -q .
}

# Cleanup function for shutdown
cleanup_on_exit() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Script failed with exit code: $exit_code"
    fi
}

# Set up trap for cleanup
trap cleanup_on_exit EXIT

# Validate configuration values
validate_config() {
    local required_vars=(
        "NETWORK_NAME" "NETWORK_SUBNET" "NETWORK_DIR"
        "BOOTNODE_IP" "MINER_NODE_IP" "RPC_NODE_IP"
        "P2P_PORT" "RPC_PORT" "CHAIN_ID"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required configuration variable '$var' is not set"
            exit 1
        fi
    done
    
    log_success "Configuration validation passed"
}

# Create directory with error handling
safe_mkdir() {
    local dir="$1"
    
    if ! mkdir -p "$dir" 2>/dev/null; then
        log_error "Failed to create directory: $dir"
        exit 1
    fi
    
    log_info "Created directory: $dir"
}

# Remove directory with error handling
safe_rmdir() {
    local dir="$1"
    
    if [[ -d "$dir" ]]; then
        if ! rm -rf "$dir" 2>/dev/null; then
            log_error "Failed to remove directory: $dir"
            exit 1
        fi
        log_info "Removed directory: $dir"
    fi
}

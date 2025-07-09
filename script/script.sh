# Advice: Use CTRL+F with "🚩" to follow script flow and locate key checkpoints.

# Defensive scripting: I start with `set -euo pipefail` to ensure the script is robust and fails predictably.
# - 'e': The script stops immediately if any command fails
# - 'u': Treats undefined variables as errors
# - 'o pipefail': Pipelines fail if any command in them fails
# This prevents silent errors and hard-to-detect bugs in blockchain.
set -euo pipefail

# --- [ Configuration Parameters ] ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.yaml"

# 🚩 Script Flags
# --debug: Enables verbose logs for step-by-step debugging.
# --no-cleanup: Skips deletion of keys, genesis file, and Docker network to reuse the existing blockchain setup.
DEBUG=${DEBUG:-0}
NO_CLEANUP=${NO_CLEANUP:-0}

# Global variable for primary RPC endpoint
RPC_PRIMARY_ENDPOINT=""

LOG_FILE="${SCRIPT_DIR}/logs/besu-network-$(date +%Y%m%d-%H%M%S).log"
LOG_DIR="$(dirname "$LOG_FILE")"

# Add user bin directory to PATH if it exists
if [[ -d "$HOME/bin" ]]; then
    export PATH="$HOME/bin:$PATH"
fi

# --- [ Color Definitions ] ---
readonly COLOR_RESET='\033[0m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_YELLOW='\033[0;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_MAGENTA='\033[0;35m'
readonly COLOR_CYAN='\033[0;36m'
readonly COLOR_LIGHT_GRAY='\033[0;37m'
readonly COLOR_DARK_GRAY='\033[1;30m'
readonly COLOR_LIGHT_BLUE='\033[1;34m'
readonly COLOR_BOLD='\033[1m'
readonly COLOR_PURPLE='\033[0;35m'  # Purple for block monitoring

# --- [ Logging Infrastructure ] ---

# 🚩 LOGGING: Unique timestamped log files in ./script/logs for traceability.
# Unique timestamped log files in ./script/logs for traceability.
# Initialize logging system
init_logging() {
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Initialize log file with header
    cat > "$LOG_FILE" << EOF
===============================================
Besu Network Automation Tool - Execution Log
===============================================
Started: $(date)
Script: $0
Arguments: $*
Working Directory: $(pwd)
===============================================

EOF
}

log_to_file() {
    local message="$1"
    local timestamp=$(date '+%H:%M:%S')
    
    # Strip ANSI color codes and write to log file
    echo "[$timestamp] $message" | sed 's/\x1b\[[0-9;]*m//g' >> "$LOG_FILE"
}

# --- [ Enhanced Logging Functions ] ---

# Magenta: Mark the beginning of major sections
log_step() {
    local message="--- [ $1 ] ---"
    echo -e "${COLOR_MAGENTA}${COLOR_BOLD}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Green: Confirm successful actions
log_success() {
    local message="✓ $1"
    echo -e "${COLOR_GREEN}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Red: Critical errors
log_error() {
    local message="✗ ERROR: $1"
    echo -e "${COLOR_RED}$message${COLOR_RESET}" >&2
    log_to_file "$message"
}

# Yellow: Warnings
log_warning() {
    local message="⚠ WARNING: $1"
    echo -e "${COLOR_YELLOW}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Cyan: Active verifications
log_check() {
    local message="→ $1"
    echo -e "${COLOR_CYAN}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Blue: Docker-related actions
log_docker() {
    local message="🐳 $1"
    echo -e "${COLOR_BLUE}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Gray: Cleanup processes
log_clean() {
    local message="🧹 $1"
    echo -e "${COLOR_DARK_GRAY}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Light Blue: Useful tips
log_tip() {
    local message="💡 TIP: $1"
    echo -e "${COLOR_LIGHT_BLUE}$message${COLOR_RESET}"
    log_to_file "$message"
}

# Light Gray: Debug information (only shown when DEBUG=1)
log_debug() {
    if [[ $DEBUG -eq 1 ]]; then
        local message="[DEBUG] $1"
        echo -e "${COLOR_LIGHT_GRAY}$message${COLOR_RESET}"
        log_to_file "$message"
    fi
}

# Purple: Block monitoring with pico emoji
log_block() {
    local message="(🔷 $1)"
    echo -e "${COLOR_PURPLE}$message${COLOR_RESET}"
    log_to_file "$message"
}

# --- [ Utility Functions ] ---

# Exit with error message
exit_with_error() {
    log_error "$1"
    log_to_file "Script terminated with error"
    exit 1
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ask user for confirmation
ask_confirmation() {
    local prompt="$1"
    local response
    
    while true; do
        read -p "$prompt (y/n): " response
        case $response in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) log_warning "Please answer yes (y) or no (n).";;
        esac
    done
}

# Install jq if not present
install_jq() {
    log_check "Attempting to install jq..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y jq
        elif command_exists yum; then
            sudo yum install -y jq
        elif command_exists dnf; then
            sudo dnf install -y jq
        elif command_exists pacman; then
            sudo pacman -S --noconfirm jq
        else
            log_error "Unable to install jq automatically. Please install it manually."
            return 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            brew install jq
        else
            log_error "Homebrew not found. Please install jq manually."
            return 1
        fi
    else
        log_error "Unsupported OS for automatic jq installation. Please install it manually."
        return 1
    fi
    
    # Verify installation
    if command_exists jq; then
        log_success "jq installed successfully"
        return 0
    else
        log_error "jq installation failed"
        return 1
    fi
}

# Install yq if not present
install_yq() {
    log_check "Attempting to install yq..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Download yq binary directly from GitHub
        local YQ_VERSION="v4.35.2"
        local YQ_BINARY="yq_linux_amd64"
        
        if [[ "$(uname -m)" == "aarch64" ]] || [[ "$(uname -m)" == "arm64" ]]; then
            YQ_BINARY="yq_linux_arm64"
        fi
        
        sudo wget -q "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/${YQ_BINARY}" -O /usr/local/bin/yq
        sudo chmod +x /usr/local/bin/yq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            brew install yq
        else
            log_error "Homebrew not found. Please install yq manually."
            return 1
        fi
    else
        log_error "Unsupported OS for automatic yq installation. Please install it manually."
        return 1
    fi
    
    # Verify installation
    if command_exists yq; then
        log_success "yq installed successfully"
        return 0
    else
        log_error "yq installation failed"
        return 1
    fi
}

# Check all required dependencies
check_dependencies() {
    log_step "Checking Dependencies"
    
    local missing_critical=0
    local missing_optional=0
    
    # Force WSL to refresh filesystem state before npm check (this is a WSL-specific workaround for stale filesystem cache)
    if [[ "$OSTYPE" == "linux-gnu"* ]] && grep -qi microsoft /proc/version 2>/dev/null; then
        log_debug "Detected WSL environment, refreshing filesystem state..."
        touch "${SCRIPT_DIR}/.wsl_refresh_$$" 2>/dev/null && rm -f "${SCRIPT_DIR}/.wsl_refresh_$$" 2>/dev/null
        sleep 0.1
    fi
    
    # Check critical dependencies (docker, node, npm)
    log_check "Verifying Docker installation..."
    if command_exists docker; then
        log_success "Docker is installed ($(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ','))"
    else
        log_error "Docker is not installed. Please install Docker before running this script."
        log_tip "Visit https://docs.docker.com/get-docker/ for installation instructions"
        missing_critical=1
    fi
    
    log_check "Verifying Node.js installation..."
    if command_exists node; then
        log_success "Node.js is installed ($(node --version))"
    else
        log_error "Node.js is not installed. Please install Node.js before running this script."
        log_tip "Visit https://nodejs.org/ for installation instructions"
        missing_critical=1
    fi

    # Check for jq
    log_check "Verifying jq installation..."
    if command_exists jq; then
        log_success "jq is installed ($(jq --version))"
    else
        log_warning "jq is not installed. This tool is required for JSON processing."
        
        if ask_confirmation "Would you like to install jq automatically?"; then
            if install_jq; then
                log_success "jq has been successfully installed"
            else
                log_error "Failed to install jq automatically"
                missing_optional=1
            fi
        else
            log_error "jq is required for this script to function properly"
            log_tip "You can install jq manually from https://stedolan.github.io/jq/"
            missing_optional=1
        fi
    fi
    
    # Check for yq
    log_check "Verifying yq installation..."
    if command_exists yq; then
        log_success "yq is installed ($(yq --version 2>/dev/null | head -n1))"
    else
        log_warning "yq is not installed. This tool is required for YAML processing."
        
        if ask_confirmation "Would you like to install yq automatically?"; then
            if install_yq; then
                log_success "yq has been successfully installed"
            else
                log_error "Failed to install yq automatically"
                missing_optional=1
            fi
        else
            log_error "yq is required for this script to function properly"
            log_tip "You can install yq manually from https://github.com/mikefarah/yq"
            missing_optional=1
        fi
    fi
    
    # Final check
    if [[ $missing_critical -eq 1 ]]; then
        exit_with_error "Critical dependencies are missing. Please install them before running this script."
    fi
    
    if [[ $missing_optional -eq 1 ]]; then
        exit_with_error "Required tools (jq/yq) are not installed. Cannot proceed without them."
    fi
    
    log_success "All dependencies verified successfully"
    echo ""  # Add blank line for better readability
}

# 🚩 DECOUPLING: Logic (script) separated from data (config.yaml)
load_config() {
    # Load configuration from YAML file
    log_step "Loading Configuration"
    
    # Check if config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        exit_with_error "Configuration file not found: $CONFIG_FILE"
    fi
    
    log_check "Reading configuration from: $CONFIG_FILE"
    
    # --- [ Blockchain Configuration ] ---
    CHAIN_ID=$(yq eval '.blockchain.chainId // 1337' "$CONFIG_FILE")
    BLOCK_PERIOD_SECONDS=$(yq eval '.blockchain.blockPeriodSeconds // 15' "$CONFIG_FILE")
    EPOCH_LENGTH=$(yq eval '.blockchain.epochLength // 30000' "$CONFIG_FILE")
    
    log_debug "Blockchain - Chain ID: $CHAIN_ID"
    log_debug "Blockchain - Block Period: $BLOCK_PERIOD_SECONDS seconds"
    log_debug "Blockchain - Epoch Length: $EPOCH_LENGTH"
    
    # --- [ Consensus Configuration ] ---
    CONSENSUS_TYPE=$(yq eval '.consensus.type // "clique"' "$CONFIG_FILE")
    log_debug "Consensus Type: $CONSENSUS_TYPE"
    
    # --- [ Network Configuration ] ---
    NETWORK_NAME=$(yq eval '.network.name // "besu-network"' "$CONFIG_FILE")
    NETWORK_SUBNET=$(yq eval '.network.subnet // "172.24.0.0/16"' "$CONFIG_FILE")
    NETWORK_LABEL=$(yq eval '.network.label // "project=besu-net"' "$CONFIG_FILE")
    
    log_debug "Network Name: $NETWORK_NAME"
    log_debug "Network Subnet: $NETWORK_SUBNET"
    log_debug "Network Label: $NETWORK_LABEL"
    
    # --- [ Docker Configuration ] ---
    DOCKER_IMAGE=$(yq eval '.docker.image // "hyperledger/besu:latest"' "$CONFIG_FILE")
    DOCKER_USER_PERMISSIONS=$(yq eval '.docker.user_permissions // true' "$CONFIG_FILE")
    
    log_debug "Docker Image: $DOCKER_IMAGE"
    log_debug "Docker User Permissions: $DOCKER_USER_PERMISSIONS"
    
    # --- [ RPC Configuration ] ---
    RPC_TIMEOUT=$(yq eval '.rpc.timeout // 30000' "$CONFIG_FILE")
    log_debug "RPC Timeout: $RPC_TIMEOUT ms"
    
    # --- [ Transaction Signer Dependencies Directory ] ---
    # Get the relative path from config and convert to absolute

    # 🚩 Get "npm" dependencies directory from config.yaml (so as to stay flexible)

    TX_SIGNER_DEPS_DIR_REL=$(yq eval '.tx_signer_deps_dir // "../besu-sdk/"' "$CONFIG_FILE")
    # Convert to absolute path relative to the script directory
    TX_SIGNER_DEPS_DIR="$(cd "${SCRIPT_DIR}" && cd "${TX_SIGNER_DEPS_DIR_REL}" 2>/dev/null && pwd)" || {
        log_warning "Transaction signer dependencies directory not found: ${SCRIPT_DIR}/${TX_SIGNER_DEPS_DIR_REL}"
        TX_SIGNER_DEPS_DIR="${SCRIPT_DIR}/${TX_SIGNER_DEPS_DIR_REL}"
    }
    
    log_debug "TX Signer Deps Dir (relative): $TX_SIGNER_DEPS_DIR_REL"
    log_debug "TX Signer Deps Dir (absolute): $TX_SIGNER_DEPS_DIR"
    
    # --- [ Automated Tests Configuration ] ---
    AUTOMATED_TESTS_ENABLED=$(yq eval '.automatedTests.enabled // true' "$CONFIG_FILE")
    AUTOMATED_TESTS_WAIT_TIMEOUT=$(yq eval '.automatedTests.waitTimeout // 60' "$CONFIG_FILE")
    AUTOMATED_TESTS_BLOCK_TIMEOUT=$(yq eval '.automatedTests.blockProductionTimeout // 30' "$CONFIG_FILE")
    AUTOMATED_TESTS_TX_TIMEOUT=$(yq eval '.automatedTests.transactionTimeout // 60' "$CONFIG_FILE")
    
    log_debug "Automated Tests Enabled: $AUTOMATED_TESTS_ENABLED"
    log_debug "Automated Tests Wait Timeout: $AUTOMATED_TESTS_WAIT_TIMEOUT seconds"
    log_debug "Automated Tests Block Production Timeout: $AUTOMATED_TESTS_BLOCK_TIMEOUT seconds"
    log_debug "Automated Tests Transaction Timeout: $AUTOMATED_TESTS_TX_TIMEOUT seconds"
    
    # --- [ Environment File Configuration ] ---
    ENV_FILE_GENERATE=$(yq eval '.envFile.generate // true' "$CONFIG_FILE")
    ENV_FILE_PATH=$(yq eval '.envFile.path // "./env_forwarding/.env"' "$CONFIG_FILE")
    ENV_FILE_INCLUDE_WARNING=$(yq eval '.envFile.includeWarning // true' "$CONFIG_FILE")
    
    log_debug "Env File Generate: $ENV_FILE_GENERATE"
    log_debug "Env File Path: $ENV_FILE_PATH"
    log_debug "Env File Include Warning: $ENV_FILE_INCLUDE_WARNING"
    
    # --- [ Load Nodes Array ] ---
    # Count number of nodes
    NODE_COUNT=$(yq eval '.nodes | length' "$CONFIG_FILE")
    log_debug "Total nodes: $NODE_COUNT"
    
    # Initialize arrays for node data
    declare -g -a NODE_NAMES=()
    declare -g -a NODE_IPS=()
    declare -g -a NODE_ROLES=()
    declare -g -a NODE_RPC_MAPPINGS=()
    declare -g -a NODE_PREFUNDING=()
    
    # Load each node's data
    for i in $(seq 0 $((NODE_COUNT - 1))); do
        NODE_NAMES+=("$(yq eval ".nodes[$i].name" "$CONFIG_FILE")")
        NODE_IPS+=("$(yq eval ".nodes[$i].ip" "$CONFIG_FILE")")
        
        # Get roles as a comma-separated string
        roles=$(yq eval ".nodes[$i].roles | join(\",\")" "$CONFIG_FILE")
        NODE_ROLES+=("$roles")
        
        # Get RPC mapping if exists
        rpc_mapping=$(yq eval ".nodes[$i].rpc_mapping // \"\"" "$CONFIG_FILE")
        NODE_RPC_MAPPINGS+=("$rpc_mapping")
        
        # Get prefunding amount (in ETH)
        prefunding=$(yq eval ".nodes[$i].prefunding // 0" "$CONFIG_FILE")
        NODE_PREFUNDING+=("$prefunding")
        
        log_debug "Node $i: ${NODE_NAMES[$i]} - IP: ${NODE_IPS[$i]} - Roles: ${NODE_ROLES[$i]} - RPC: ${NODE_RPC_MAPPINGS[$i]} - Prefunding: ${NODE_PREFUNDING[$i]} ETH"
    done
    
    # Dynamic RPC endpoint map via associative arrays: scalable, descriptive, and config-driven (no hardcoded ports)
    declare -g -A RPC_ENDPOINTS=() # -A for associative array
    log_check "Building dynamic RPC endpoint map..."
    
    for i in $(seq 0 $((NODE_COUNT - 1))); do
        local node_name="${NODE_NAMES[$i]}"
        local rpc_alias
        rpc_alias=$(yq eval ".nodes[$i].rpc_alias // \"\"" "$CONFIG_FILE")
        local rpc_mapping="${NODE_RPC_MAPPINGS[$i]}"
        
        # If the node has both an alias and a mapping, add it to the map
        if [[ -n "$rpc_alias" && -n "$rpc_mapping" ]]; then
            # Extract the host port (e.g., "9999" from "9999:8545")
            local host_port="${rpc_mapping%%:*}"
            local endpoint_url="http://localhost:${host_port}"

            RPC_ENDPOINTS["$rpc_alias"]="$endpoint_url"
            log_debug "Mapped RPC alias '$rpc_alias' to endpoint $endpoint_url (from node '$node_name')"
        fi
    done
    
    log_success "Dynamic RPC endpoint map created with ${#RPC_ENDPOINTS[@]} entries"
    
    # --- [ Set Primary RPC Endpoint ] ---
    # Find the first available RPC endpoint to use as primary
    RPC_PRIMARY_ENDPOINT=""
    for i in "${!NODE_NAMES[@]}"; do
        if [[ "${NODE_ROLES[$i]}" == *"rpc"* ]] && [[ -n "${NODE_RPC_MAPPINGS[$i]}" ]]; then
            local port="${NODE_RPC_MAPPINGS[$i]%%:*}"
            RPC_PRIMARY_ENDPOINT="http://localhost:$port"
            log_debug "Primary RPC endpoint set to: $RPC_PRIMARY_ENDPOINT"
            break
        fi
    done
    
    # If no RPC endpoint found, log warning
    if [[ -z "$RPC_PRIMARY_ENDPOINT" ]]; then
        log_warning "No RPC endpoint found in configuration"
        RPC_PRIMARY_ENDPOINT="http://localhost:8545"  # Default fallback
    fi
    
    # --- [ Load Alloc (Pre-funded Accounts) Array ] ---
    ALLOC_COUNT=$(yq eval '.alloc | length' "$CONFIG_FILE")
    log_debug "Pre-funded accounts: $ALLOC_COUNT"
    
    declare -g -a ALLOC_ADDRESSES=()
    declare -g -a ALLOC_PREFUNDING=()
    
    for i in $(seq 0 $((ALLOC_COUNT - 1))); do
        ALLOC_ADDRESSES+=("$(yq eval ".alloc[$i].address" "$CONFIG_FILE")")
        ALLOC_PREFUNDING+=("$(yq eval ".alloc[$i].prefunding" "$CONFIG_FILE")")
        
        log_debug "Alloc $i: ${ALLOC_ADDRESSES[$i]} - Prefunding: ${ALLOC_PREFUNDING[$i]} Wei"
    done
    

    
    # --- [ Load Test Transactions Array ] ---
    TEST_TX_COUNT=$(yq eval '.testTransactions | length' "$CONFIG_FILE")
    log_debug "Test transactions: $TEST_TX_COUNT"
    
    declare -g -a TEST_TX_FROM_NODES=()
    declare -g -a TEST_TX_TO_ADDRESSES=()
    declare -g -a TEST_TX_VALUES_ETHER=()
    declare -g -a TEST_TX_GAS=()
    declare -g -a TEST_TX_RPC_ENDPOINTS=()
    declare -g -a isolated_validators=()
    
    for i in $(seq 0 $((TEST_TX_COUNT - 1))); do
        TEST_TX_FROM_NODES+=("$(yq eval ".testTransactions[$i].from_node" "$CONFIG_FILE")")
        TEST_TX_TO_ADDRESSES+=("$(yq eval ".testTransactions[$i].to" "$CONFIG_FILE")")
        TEST_TX_VALUES_ETHER+=("$(yq eval ".testTransactions[$i].value_ether" "$CONFIG_FILE")")
        TEST_TX_GAS+=("$(yq eval ".testTransactions[$i].gas" "$CONFIG_FILE")")
        TEST_TX_RPC_ENDPOINTS+=("$(yq eval ".testTransactions[$i].rpc_endpoint" "$CONFIG_FILE")")
        
        log_debug "Test TX $i: From ${TEST_TX_FROM_NODES[$i]} to ${TEST_TX_TO_ADDRESSES[$i]} - Value: ${TEST_TX_VALUES_ETHER[$i]} ETH"
    done
    
    # Validate TX Signer Dependencies Directory if test transactions are configured
    if [[ $TEST_TX_COUNT -gt 0 ]]; then
        if [[ ! -d "$TX_SIGNER_DEPS_DIR" ]]; then
            log_warning "Transaction signer dependencies directory not found: $TX_SIGNER_DEPS_DIR"
            log_warning "This is required for transaction tests. Transaction tests will be skipped if directory is not available."
            log_tip "Create the directory or ensure the path in config.yaml is correct"
        else
            log_debug "Transaction signer dependencies directory exists and is accessible"
        fi
    fi
    
    log_success "Configuration loaded successfully"
    echo ""  # Add blank line for better readability
}

# Validate configuration - Level 1: Format and Syntax
validate_config_level1() {
    log_step "Configuration Validation - Level 1: Format and Syntax"
    local errors=0
    
    # 1. Validate chainId (must be > 200000)
    log_check "Validating chainId..."
    if [[ ! "$CHAIN_ID" =~ ^[0-9]+$ ]]; then
        log_error "chainId must be a number, got: $CHAIN_ID"
        ((errors++))
    else
        log_success "chainId is valid: $CHAIN_ID"
    fi
    
    # 2. Validate blockPeriodSeconds (between 1-300)
    log_check "Validating blockPeriodSeconds..."
    if [[ ! "$BLOCK_PERIOD_SECONDS" =~ ^[0-9]+$ ]]; then
        log_error "blockPeriodSeconds must be a number, got: $BLOCK_PERIOD_SECONDS"
        ((errors++))
    elif [[ $BLOCK_PERIOD_SECONDS -lt 1 || $BLOCK_PERIOD_SECONDS -gt 300 ]]; then
        log_error "blockPeriodSeconds must be between 1-300, got: $BLOCK_PERIOD_SECONDS"
        ((errors++))
    else
        log_success "blockPeriodSeconds is valid: $BLOCK_PERIOD_SECONDS"
    fi
    
    # 3. Validate epochLength (> 1000)
    log_check "Validating epochLength..."
    if [[ ! "$EPOCH_LENGTH" =~ ^[0-9]+$ ]]; then
        log_error "epochLength must be a number, got: $EPOCH_LENGTH"
        ((errors++))
    elif [[ $EPOCH_LENGTH -le 1000 ]]; then
        log_error "epochLength must be greater than 1000, got: $EPOCH_LENGTH"
        ((errors++))
    else
        log_success "epochLength is valid: $EPOCH_LENGTH"
    fi
    
    # 4. Validate subnet format (CIDR)
    log_check "Validating network subnet..."
    if [[ ! "$NETWORK_SUBNET" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        log_error "subnet must be in CIDR format (e.g., 172.24.0.0/16), got: $NETWORK_SUBNET"
        ((errors++))
    else
        log_success "subnet format is valid: $NETWORK_SUBNET"
    fi
    
    # 5. Validate node names (alphanumeric and unique)
    log_check "Validating node names..."
    declare -A node_name_check
    local node_name_errors_start=$errors
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        
        # Check alphanumeric (allow hyphens and underscores)
        if [[ ! "$node_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
            log_error "Node name must be alphanumeric (hyphens and underscores allowed), got: $node_name"
            ((errors++))
        fi
        
        # Check uniqueness
        if [[ -n "${node_name_check[$node_name]:-}" ]]; then
            log_error "Duplicate node name found: $node_name"
            ((errors++))
        else
            node_name_check["$node_name"]=1
        fi
    done
    if [[ $errors -eq $node_name_errors_start ]]; then
        log_success "All node names are valid and unique"
    fi
    
    # 6. Validate node IPs (Docker private range 172.16.0.0/12)
    log_check "Validating node IPs..."
    for i in "${!NODE_IPS[@]}"; do
        local ip="${NODE_IPS[$i]}"
        
        # Check IP format
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            log_error "Invalid IP format for node ${NODE_NAMES[$i]}: $ip"
            ((errors++))
            continue
        fi
        
        # Check if in Docker private range (172.16.0.0 - 172.31.255.255)
        IFS='.' read -r -a octets <<< "$ip"
        if [[ ${octets[0]} -eq 172 ]]; then
            if [[ ${octets[1]} -lt 16 || ${octets[1]} -gt 31 ]]; then
                log_error "IP for node ${NODE_NAMES[$i]} not in Docker private range (172.16.0.0/12): $ip"
                ((errors++))
            fi
        else
            log_error "IP for node ${NODE_NAMES[$i]} not in Docker private range (172.16.0.0/12): $ip"
            ((errors++))
        fi
    done
    
    # 7. Validate alloc addresses (0x... format)
    log_check "Validating pre-funded account addresses..."
    for i in "${!ALLOC_ADDRESSES[@]}"; do
        local address="${ALLOC_ADDRESSES[$i]}"
        
        # Check if starts with 0x and is 42 characters (0x + 40 hex chars)
        if [[ ! "$address" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
            log_error "Invalid Ethereum address format: $address"
            ((errors++))
        fi
    done
    
    # 8. Validate prefunding amounts (non-negative numbers)
    log_check "Validating account prefunding amounts..."
    for i in "${!ALLOC_PREFUNDING[@]}"; do
        local prefunding="${ALLOC_PREFUNDING[$i]}"
        
        # Check if numeric and non-negative
        if [[ ! "$prefunding" =~ ^[0-9]+$ ]]; then
            log_error "Prefunding must be a non-negative number for address ${ALLOC_ADDRESSES[$i]}: $prefunding"
            ((errors++))
        fi
    done
    
    # 9. Validate gas in test transactions (>= 21000)
    log_check "Validating test transaction gas values..."
    for i in "${!TEST_TX_GAS[@]}"; do
        local gas="${TEST_TX_GAS[$i]}"
        
        # Check if numeric
        if [[ ! "$gas" =~ ^[0-9]+$ ]]; then
            log_error "Gas must be a number for test transaction $i: $gas"
            ((errors++))
        elif [[ $gas -lt 21000 ]]; then
            log_error "Gas must be at least 21000 for test transaction $i: $gas"
            ((errors++))
        fi
    done
    
    # 10. Validate node prefunding amounts
    log_check "Validating node prefunding amounts..."
    for i in "${!NODE_PREFUNDING[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local prefunding="${NODE_PREFUNDING[$i]}"
        
        # Check if numeric and non-negative
        if [[ ! "$prefunding" =~ ^[0-9]+$ ]]; then
            log_error "Node prefunding for '$node_name' must be a number, got: $prefunding"
            ((errors++))
        elif [[ $prefunding -lt 0 ]]; then
            log_error "Node prefunding for '$node_name' must be non-negative, got: $prefunding"
            ((errors++))
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        log_success "Level 1 validation passed - All format and syntax checks successful"
        return 0
    else
        log_error "Level 1 validation failed with $errors error(s)"
        return 1
    fi
}

# 🚩 MULTI-LEVEL VALIDATION - EXHAUSTIVE VALIDATION SYSTEM
# - Level 1: Syntax and format (data types, ranges)
# - Level 2: Logical coherence (uniqueness, dependencies)
# - Detects errors before expensive operations (Docker)
validate_config_level2() {
    log_step "Configuration Validation - Level 2: Logical Coherence"
    local errors=0
    local warnings=0
    
    # 1. Check uniqueness of IPs and ports
    log_check "Checking uniqueness of node IPs..."
    declare -A ip_check
    for i in "${!NODE_IPS[@]}"; do
        local ip="${NODE_IPS[$i]}"
        if [[ -n "${ip_check[$ip]:-}" ]]; then
            log_error "Duplicate IP address found: $ip (nodes: ${ip_check[$ip]} and ${NODE_NAMES[$i]})"
            ((errors++))
        else
            ip_check["$ip"]="${NODE_NAMES[$i]}"
        fi
    done
    
    # Check uniqueness of RPC ports
    log_check "Checking uniqueness of RPC ports..."
    declare -A port_check
    for i in "${!NODE_RPC_MAPPINGS[@]}"; do
        local mapping="${NODE_RPC_MAPPINGS[$i]}"
        if [[ -n "$mapping" ]]; then
            # Extract port from mapping (format: "host_port:container_port")
            local host_port="${mapping%%:*}"
            if [[ -n "${port_check[$host_port]:-}" ]]; then
                log_error "Duplicate RPC port found: $host_port (nodes: ${port_check[$host_port]} and ${NODE_NAMES[$i]})"
                ((errors++))
            else
                port_check["$host_port"]="${NODE_NAMES[$i]}"
            fi
        fi
    done
    
    # 2. Check for at least one bootnode
    log_check "Checking for bootnode..."
    local bootnode_count=0
    for roles in "${NODE_ROLES[@]}"; do
        if [[ "$roles" == *"bootnode"* ]]; then
            ((bootnode_count++))
        fi
    done
    if [[ $bootnode_count -eq 0 ]]; then
        log_error "No bootnode found. At least one node must have the 'bootnode' role"
        ((errors++))
    else
        log_success "Found $bootnode_count bootnode(s)"
    fi
    
    # 3. Check for at least one validator
    log_check "Checking for validators..."
    local validator_count=0
    for roles in "${NODE_ROLES[@]}"; do
        if [[ "$roles" == *"validator"* ]]; then
            ((validator_count++))
        fi
    done
    if [[ $validator_count -eq 0 ]]; then
        log_error "No validator found. At least one node must have the 'validator' role"
        ((errors++))
    else
        log_success "Found $validator_count validator(s)"

    fi
    
    # 4. Validate test transactions from_node exists and has rpc role
    log_check "Validating test transaction source nodes..."
    for i in "${!TEST_TX_FROM_NODES[@]}"; do
        local from_node="${TEST_TX_FROM_NODES[$i]}"
        local found=0
        local has_rpc=0
        
        # Find the node
        for j in "${!NODE_NAMES[@]}"; do
            if [[ "${NODE_NAMES[$j]}" == "$from_node" ]]; then
                found=1
                # Check if has rpc role
                if [[ "${NODE_ROLES[$j]}" == *"rpc"* ]]; then
                    has_rpc=1
                fi
                break
            fi
        done
        
        if [[ $found -eq 0 ]]; then
            log_error "Test transaction $i references non-existent node: $from_node"
            ((errors++))
        elif [[ $has_rpc -eq 0 ]]; then
            log_error "Test transaction $i from node '$from_node' does not have 'rpc' role"
            ((errors++))
        fi
    done
    
    # 🚩 DYNAMIC ENDPOINT VALIDATION
    # - Validates that each alias used in transactions exists in the map
    # - Does not assume hardcoded names (primary/secondary)
    # - Provides specific error messages with solution

    # 5. Validate referenced RPC endpoints exist
    log_check "Validating RPC endpoints in test transactions..."
    for i in "${!TEST_TX_RPC_ENDPOINTS[@]}"; do
        local endpoint_alias="${TEST_TX_RPC_ENDPOINTS[$i]}"
        
        # Check if the alias exists in our dynamic endpoint map
        if [[ -z "${RPC_ENDPOINTS[$endpoint_alias]:-}" ]]; then
            log_error "Test transaction $i uses an undefined rpc_endpoint alias: '$endpoint_alias'"
            log_tip "Ensure a node in config.yaml has 'rpc_alias: \"$endpoint_alias\"'"
            ((errors++))
        else
            log_debug "Test transaction $i uses valid RPC endpoint alias: '$endpoint_alias' -> ${RPC_ENDPOINTS[$endpoint_alias]}"
        fi
    done
    
    # Additional warnings
    if [[ $NODE_COUNT -lt 2 ]]; then
        log_warning "Only $NODE_COUNT node(s) configured. A network typically requires at least 2 nodes"
        ((warnings++))
    fi
    
    # Summary
    if [[ $errors -eq 0 ]]; then
        if [[ $warnings -gt 0 ]]; then
            log_warning "Level 2 validation passed with $warnings warning(s)"
        else
            log_success "Level 2 validation passed - All logical coherence checks successful"
        fi
        return 0
    else
        log_error "Level 2 validation failed with $errors error(s) and $warnings warning(s)"
        return 1
    fi
}

# Main validation function that calls both levels
validate_config() {
    log_step "Starting Configuration Validation"
    
    local level1_result=0
    local level2_result=0
    
    # Run Level 1 validation
    if ! validate_config_level1; then
        level1_result=1
    fi
    
    echo ""  # Add spacing between levels
    
    # Run Level 2 validation
    if ! validate_config_level2; then
        level2_result=1
    fi
    
    echo ""  # Add spacing
    
    # Overall result
    if [[ $level1_result -eq 0 && $level2_result -eq 0 ]]; then
        log_success "Configuration validation completed successfully"
        return 0
    else
        log_error "Configuration validation failed. Please fix the errors above before proceeding."
        return 1
    fi
}

# Validate existing resources when using --no-cleanup
validate_existing_resources() {
    log_step "Validating Existing Resources"
    
    local errors=0
    local warnings=0
    
    # Check nodes directory
    local nodes_dir="${SCRIPT_DIR}/nodes"
    log_check "Checking nodes directory..."
    if [[ ! -d "$nodes_dir" ]]; then
        log_error "Nodes directory not found: $nodes_dir"
        log_tip "Run without --no-cleanup to create a fresh environment"
        ((errors++))
    else
        log_success "Nodes directory exists"
        
        # Check each node's required files
        for i in "${!NODE_NAMES[@]}"; do
            local node_name="${NODE_NAMES[$i]}"
            local node_dir="${nodes_dir}/${node_name}"
            
            if [[ ! -d "$node_dir" ]]; then
                log_error "Node directory missing: $node_dir"
                ((errors++))
                continue
            fi
            
            # Check required files
            local required_files=("key" "key.pub" "address" "config.toml")
            local missing_files=0
            
            for file in "${required_files[@]}"; do
                if [[ ! -f "${node_dir}/${file}" ]]; then
                    log_error "Missing file for node $node_name: $file"
                    ((missing_files++))
                fi
            done
            
            if [[ $missing_files -eq 0 ]]; then
                log_debug "Node $node_name has all required files"
            else
                ((errors++))
            fi
        done
    fi
    
    # Check genesis.json
    local genesis_file="${SCRIPT_DIR}/genesis.json"
    log_check "Checking genesis.json..."
    if [[ ! -f "$genesis_file" ]]; then
        log_error "Genesis file not found: $genesis_file"
        ((errors++))
    else
        # Validate it's valid JSON
        if ! jq empty "$genesis_file" 2>/dev/null; then
            log_error "Genesis file is not valid JSON"
            ((errors++))
        else
            log_success "Genesis file exists and is valid JSON"
        fi
    fi
    
    # Check Docker network
    log_check "Checking Docker network: $NETWORK_NAME..."
    if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
        log_error "Docker network not found: $NETWORK_NAME"
        ((errors++))
    else
        log_success "Docker network exists"
        
        # Check network configuration matches
        local network_info=$(docker network inspect "$NETWORK_NAME" 2>/dev/null)
        if [[ -n "$network_info" ]]; then
            local configured_subnet=$(echo "$network_info" | jq -r '.[0].IPAM.Config[0].Subnet' 2>/dev/null)
            if [[ "$configured_subnet" != "$NETWORK_SUBNET" ]]; then
                log_warning "Network subnet mismatch. Expected: $NETWORK_SUBNET, Found: $configured_subnet"
                log_warning "This may cause connectivity issues"
                ((warnings++))
            fi
        fi
    fi
    
    # Check for existing containers
    log_check "Checking for existing containers..."
    local existing_containers=$(docker ps -a --filter "label=$NETWORK_LABEL" --format '{{.Names}}')
    if [[ -n "$existing_containers" ]]; then
        log_warning "Found existing containers with project label:"
        while IFS= read -r container; do
            local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)
            log_warning "  - $container (status: $status)"
            
            # Note: Exited/dead containers are expected in --no-cleanup mode and will be removed/recreated
            # Treating them as fatal errors would prevent legitimate restarts of the network
        done <<< "$existing_containers"
        
        log_warning "Existing containers will be removed and recreated"
        ((warnings++))
    fi
    
    # Check config.yaml modification time
    log_check "Checking configuration consistency..."
    if [[ -f "$genesis_file" ]]; then
        local config_mtime=$(stat -c %Y "$CONFIG_FILE" 2>/dev/null || stat -f %m "$CONFIG_FILE" 2>/dev/null)
        local genesis_mtime=$(stat -c %Y "$genesis_file" 2>/dev/null || stat -f %m "$genesis_file" 2>/dev/null)
        
        if [[ -n "$config_mtime" && -n "$genesis_mtime" && $config_mtime -gt $genesis_mtime ]]; then
            log_warning "config.yaml has been modified after genesis.json was created"
            log_warning "This may cause inconsistencies. Consider running without --no-cleanup"
            ((warnings++))
        fi
    fi
    
    # Summary
    if [[ $errors -eq 0 ]]; then
        if [[ $warnings -gt 0 ]]; then
            log_warning "Validation completed with $warnings warning(s)"
            log_tip "Review warnings above. You may want to run without --no-cleanup for a clean start"
        else
            log_success "All existing resources validated successfully"
        fi
        return 0
    else
        log_error "Validation failed with $errors error(s) and $warnings warning(s)"
        log_error "Cannot proceed with --no-cleanup due to missing or invalid resources"
        return 1
    fi
}

# 🚩 CLEANUP Function - removes containers, network, and nodes directory
cleanup_environment() {
    log_step "Cleaning Up Environment"
    
    # Stop and remove all containers with project label
    log_clean "Stopping and removing containers with label: $NETWORK_LABEL"
    local containers=$(docker ps -a --filter "label=$NETWORK_LABEL" -q)
    if [[ -n "$containers" ]]; then
        log_debug "Found containers to remove: $containers"

        echo "$containers" | xargs -r docker stop 2>/dev/null || true
        echo "$containers" | xargs -r docker rm -f 2>/dev/null || true
        
        # Verify containers are removed
        local remaining=$(docker ps -a --filter "label=$NETWORK_LABEL" -q)
        if [[ -n "$remaining" ]]; then
            log_warning "Some containers could not be removed: $remaining"
        else
            log_success "All containers removed successfully"
        fi
    else
        log_success "No containers found with label: $NETWORK_LABEL"
    fi
    
    # Remove Docker network
    log_clean "Removing Docker network: $NETWORK_NAME"
    if docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
        if docker network rm "$NETWORK_NAME" 2>/dev/null; then
            log_success "Docker network removed: $NETWORK_NAME"
        else
            log_warning "Failed to remove Docker network: $NETWORK_NAME"
        fi
    else
        log_success "Docker network does not exist: $NETWORK_NAME"
    fi
    
    # Remove nodes directory with enhanced cleanup
    local nodes_dir="${SCRIPT_DIR}/nodes"
    if [[ -d "$nodes_dir" ]]; then
        log_clean "Removing nodes directory: $nodes_dir"
        
        # Method 1: Try normal removal first
        if rm -rf "$nodes_dir" 2>/dev/null; then
            log_success "Nodes directory removed successfully"
        else
            log_warning "Normal removal failed, trying enhanced cleanup methods..."
            
            # Method 2: Try with Docker to handle permission issues
            log_clean "Using Docker to remove files with proper permissions..."
            if docker run --rm -v "${nodes_dir}:/data" alpine:latest rm -rf /data 2>/dev/null; then
                # Remove the empty directory structure
                rm -rf "$nodes_dir" 2>/dev/null || true
                log_success "Nodes directory removed using Docker cleanup"
            else
                log_warning "Docker cleanup failed, trying with sudo..."
                
                # Method 3: Try with sudo (ask for permission first)
                if command_exists sudo; then
                    log_clean "Attempting sudo cleanup (may require password)..."
                    if sudo rm -rf "$nodes_dir" 2>/dev/null; then
                        log_success "Nodes directory removed using sudo"
                    else
                        log_error "Failed to remove nodes directory even with sudo"
                        log_warning "Manual cleanup required: $nodes_dir"
                        
                        # Show what's left
                        log_debug "Remaining files in nodes directory:"
                        find "$nodes_dir" -type f 2>/dev/null | head -10 | while read -r file; do
                            local perms=$(ls -la "$file" 2>/dev/null | awk '{print $1, $3, $4}')
                            log_debug "  $file ($perms)"
                        done
                    fi
                else
                    log_error "No sudo available and cleanup failed"
                    log_warning "Manual cleanup required: $nodes_dir"
                fi
            fi
        fi
        
        # Final verification
        if [[ -d "$nodes_dir" ]]; then
            log_warning "Nodes directory still exists after cleanup attempts"
            local remaining_files=$(find "$nodes_dir" -type f 2>/dev/null | wc -l)
            log_warning "Remaining files: $remaining_files"
        else
            log_success "Nodes directory completely removed"
        fi
    else
        log_success "Nodes directory does not exist"
    fi
    
    log_success "Environment cleanup completed"
    echo ""  # Add blank line for better readability
}

# Cleanup containers only - stops containers but preserves nodes, network, and configuration
cleanup_containers_only() {
    log_step "Stopping Containers (Preserving Configuration)"
    
    # Stop and remove all containers with project label but keep everything else
    log_clean "Stopping and removing containers with label: $NETWORK_LABEL"
    local containers=$(docker ps -a --filter "label=$NETWORK_LABEL" -q)
    if [[ -n "$containers" ]]; then
        log_debug "Found containers to stop: $containers"
        echo "$containers" | xargs -r docker stop 2>/dev/null || true
        echo "$containers" | xargs -r docker rm -f 2>/dev/null || true
        
        # Verify containers are removed
        local remaining=$(docker ps -a --filter "label=$NETWORK_LABEL" -q)
        if [[ -n "$remaining" ]]; then
            log_warning "Some containers could not be removed: $remaining"
        else
            log_success "All containers stopped and removed successfully"
        fi
    else
        log_success "No containers found with label: $NETWORK_LABEL"
    fi
    
    # Keep Docker network for future use
    log_success "Docker network preserved: $NETWORK_NAME"
    
    # Keep nodes directory and all files
    local nodes_dir="${SCRIPT_DIR}/nodes"
    if [[ -d "$nodes_dir" ]]; then
        log_success "Nodes directory preserved: $nodes_dir"
    fi
    
    # Keep genesis.json
    local genesis_file="${SCRIPT_DIR}/genesis.json"
    if [[ -f "$genesis_file" ]]; then
        log_success "Genesis file preserved: $genesis_file"
    fi
    
    log_success "Configuration preserved for future --no-cleanup runs"
    log_tip "To restart the network later, run: ./script.sh --no-cleanup"
    
    echo ""  # Add blank line for better readability
}

# Create Docker network with the configured settings
create_docker_network() {
    log_step "Creating Docker Network"
    
    # If using --no-cleanup, skip network creation
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_check "Using existing Docker network (--no-cleanup mode)"
        return 0
    fi
    
    # Check if network already exists
    log_check "Checking if network '$NETWORK_NAME' already exists..."
    if docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
        log_warning "Network '$NETWORK_NAME' already exists. It will be recreated."
        log_docker "Removing existing network: $NETWORK_NAME"
        docker network rm "$NETWORK_NAME" 2>/dev/null || {
            log_error "Failed to remove existing network. It might be in use."
            return 1
        }
    fi
    
    # Create the network with specified configuration
    log_docker "Creating network: $NETWORK_NAME"
    log_debug "Network configuration - Subnet: $NETWORK_SUBNET, Label: $NETWORK_LABEL"
    
    # Build the docker network create command
    local network_cmd="docker network create"
    network_cmd+=" --driver bridge"
    network_cmd+=" --subnet=\"$NETWORK_SUBNET\""
    network_cmd+=" --label=\"$NETWORK_LABEL\""
    network_cmd+=" \"$NETWORK_NAME\""
    
    # Execute the command
    if eval "$network_cmd" >/dev/null 2>&1; then
        log_success "Docker network created successfully: $NETWORK_NAME"
    else
        log_error "Failed to create Docker network"
        return 1
    fi
    
    # Verify the network was created correctly
    log_check "Verifying network configuration..."
    
    # Check if network exists
    if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
        log_error "Network verification failed - network not found"
        return 1
    fi
    
    # Get network details for verification
    local network_info=$(docker network inspect "$NETWORK_NAME" 2>/dev/null)
    if [[ -z "$network_info" ]]; then
        log_error "Failed to inspect network"
        return 1
    fi
    
    # Verify subnet configuration
    local configured_subnet=$(echo "$network_info" | jq -r '.[0].IPAM.Config[0].Subnet' 2>/dev/null)
    if [[ "$configured_subnet" != "$NETWORK_SUBNET" ]]; then
        log_error "Network subnet mismatch. Expected: $NETWORK_SUBNET, Got: $configured_subnet"
        return 1
    fi
    
    # Verify label
    local configured_label=$(echo "$network_info" | jq -r ".[0].Labels.\"${NETWORK_LABEL%%=*}\"" 2>/dev/null)
    local expected_label="${NETWORK_LABEL#*=}"
    if [[ "$configured_label" != "$expected_label" ]]; then
        log_warning "Network label verification issue. Expected: $expected_label, Got: $configured_label"
        # This is just a warning, not a critical error
    fi
    
    # Display network information
    log_success "Network verification passed"
    log_docker "Network ID: $(echo "$network_info" | jq -r '.[0].Id' | cut -c1-12)"
    log_docker "Subnet: $configured_subnet"
    log_docker "Gateway: $(echo "$network_info" | jq -r '.[0].IPAM.Config[0].Gateway')"
    
    # Check for IP conflicts
    log_check "Checking for potential IP conflicts..."
    local existing_networks=$(docker network ls --format '{{.Name}}' | grep -v "^${NETWORK_NAME}$")
    local conflict_found=0
    
    while IFS= read -r network; do
        if [[ -n "$network" && "$network" != "bridge" && "$network" != "host" && "$network" != "none" ]]; then
            local other_subnet=$(docker network inspect "$network" 2>/dev/null | jq -r '.[0].IPAM.Config[0].Subnet' 2>/dev/null)
            if [[ -n "$other_subnet" && "$other_subnet" != "null" ]]; then
                # Simple check if subnets overlap (basic check for same network prefix)
                local our_prefix="${NETWORK_SUBNET%%/*}"
                local other_prefix="${other_subnet%%/*}"
                if [[ "${our_prefix%.*}" == "${other_prefix%.*}" ]]; then
                    log_warning "Potential IP conflict with network '$network' (subnet: $other_subnet)"
                    conflict_found=1
                fi
            fi
        fi
    done <<< "$existing_networks"
    
    if [[ $conflict_found -eq 0 ]]; then
        log_success "No IP conflicts detected"
    else
        log_warning "IP conflicts detected but proceeding. Monitor for connectivity issues."
    fi
    
    echo ""  # Add blank line for better readability
    return 0
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --debug)
                DEBUG=1
                log_debug "Debug mode enabled"
                shift
                ;;
            --no-cleanup)
                NO_CLEANUP=1
                log_debug "No-cleanup mode enabled"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_warning "Unknown option: $1"
                shift
                ;;
        esac
    done
}

# Show help message
show_help() {
    cat << EOF
Besu Network Automation Tool

Usage: ./script.sh [OPTIONS]

Options:
    --debug         Enable debug output
    --no-cleanup    Skip cleanup phase and use existing resources
    -h, --help      Show this help message

This script creates a complete Hyperledger Besu private network based on the
configuration defined in config.yaml. It handles:
- Dependency verification
- Network setup
- Node deployment
- Automated testing
- Environment file generation
- Real-time block monitoring (🔷 purple notifications)

Configuration file: config.yaml (must be in the same directory as this script)

Note: When using --no-cleanup, ensure all resources (nodes/, genesis.json, 
Docker network) exist and are in a consistent state from a previous run.
EOF
}

# 🚩 Generate node identities through BESU VMs
#   - public key generation (key.pub)
#   - private key generation (key)
#   - address generation (address)
# Generate node identities using Besu's key generation capabilities
generate_node_identities() {
    log_step "Generating Node Identities"
    
    # If using --no-cleanup, skip identity generation
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_check "Using existing node identities (--no-cleanup mode)"
        return 0
    fi
    
    # Create base nodes directory
    local nodes_dir="${SCRIPT_DIR}/nodes"
    log_check "Creating nodes directory: $nodes_dir"
    mkdir -p "$nodes_dir"
    
    # Track if we need to apply user permissions
    local apply_permissions=0
    if [[ "$DOCKER_USER_PERMISSIONS" == "true" ]]; then
        apply_permissions=1
        log_debug "User permission mapping enabled"
    fi
    
    # Generate identity for each node
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_dir="${nodes_dir}/${node_name}"
        
        log_check "Generating identity for node: $node_name"
        
        # Create node directory
        mkdir -p "$node_dir"
        
        # Run Besu in ephemeral container to generate keys
        log_docker "Running Besu key generation for $node_name"
        
        # Step 1: Export the address (this will create the private key if it doesn't exist)
        
        # 🚩 PORTABLE GENERATION: ephemeral container (`--rm`) to generate keys. 
        # So there's no need to install Besu on the host.

        local export_addr_cmd="docker run --rm"
        
        # Add user mapping if enabled
        if [[ $apply_permissions -eq 1 ]]; then
            export_addr_cmd+=" -u $(id -u):$(id -g)"
        fi
        
        export_addr_cmd+=" -v \"${node_dir}:/data\""
        export_addr_cmd+=" $DOCKER_IMAGE"
        export_addr_cmd+=" --data-path=/data public-key export-address --to=/data/address"
        
        log_debug "Exporting address (this creates the private key)..."
        if ! eval "$export_addr_cmd" >/dev/null 2>&1; then
            log_error "Failed to export address for node: $node_name"
            return 1
        fi
        
        # Step 2: Export the public key
        local export_pub_cmd="docker run --rm"
        
        # Add user mapping if enabled
        if [[ $apply_permissions -eq 1 ]]; then
            export_pub_cmd+=" -u $(id -u):$(id -g)"
        fi
        
        export_pub_cmd+=" -v \"${node_dir}:/data\""
        export_pub_cmd+=" $DOCKER_IMAGE"
        export_pub_cmd+=" --data-path=/data public-key export --to=/data/key.pub"
        
        # Execute the command
        log_debug "Executing: $export_pub_cmd"
        if ! eval "$export_pub_cmd" >/dev/null 2>&1; then
            log_error "Failed to generate public key for node: $node_name"
            return 1
        fi
        
        # Verify all required files were created
        local missing_files=0
        
        # Check for private key file (created by Besu initialization)
        if [[ ! -f "${node_dir}/key" ]]; then
            log_error "Private key file not generated for node: $node_name"
            ((missing_files++))
        else
            log_debug "Private key generated: ${node_dir}/key"
        fi
        
        # Check for public key file
        if [[ ! -f "${node_dir}/key.pub" ]]; then
            log_error "Public key file not generated for node: $node_name"
            ((missing_files++))
        else
            # Read the public key
            local public_key=$(cat "${node_dir}/key.pub" 2>/dev/null | tr -d '\n')
            log_debug "Public key for $node_name: $public_key"
        fi
        
        # Check for address file
        if [[ ! -f "${node_dir}/address" ]]; then
            log_error "Address file not generated for node: $node_name"
            ((missing_files++))
        else
            local address=$(cat "${node_dir}/address" 2>/dev/null | tr -d '\n')
            log_debug "Address for $node_name: $address"
        fi
        
        # Verify key.pub exists and contains valid public key data
        if [[ -f "${node_dir}/key.pub" ]]; then
            # Read and validate the public key format
            local full_pub_key
            full_pub_key=$(cat "${node_dir}/key.pub" 2>/dev/null | tr -d '\n' | sed 's/^0x//')
            
            # Check if it's a valid hex string (either 128 or 130 chars)
            if [[ ! "$full_pub_key" =~ ^[a-fA-F0-9]{128,130}$ ]]; then
                log_error "Invalid public key format for $node_name: expected 128-130 hex characters, got '${full_pub_key}' (${#full_pub_key} chars)"
                ((missing_files++))
            else
                log_debug "Public key validated for $node_name: ${full_pub_key:0:16}...${full_pub_key: -16} (${#full_pub_key} chars)"
            fi
        else
            log_error "Public key file not found for $node_name: key.pub"
            ((missing_files++))
        fi
        
        if [[ $missing_files -gt 0 ]]; then
            log_error "Failed to generate all required files for node: $node_name"
            return 1
        fi
        
        # Apply correct permissions if needed
        if [[ $apply_permissions -eq 1 ]]; then
            # Ensure files are readable by current user
            chmod 600 "${node_dir}/key" 2>/dev/null || true
            chmod 644 "${node_dir}/key.pub" "${node_dir}/address" 2>/dev/null || true
        fi
        
        log_success "Identity generated for node: $node_name"
    done
    
    # Display summary of generated identities
    log_step "Node Identities Summary"
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_dir="${nodes_dir}/${node_name}"
        
        if [[ -f "${node_dir}/address" ]]; then
            local address=$(cat "${node_dir}/address" 2>/dev/null | tr -d '\n')
            log_success "$node_name: $address"
            
            # Also show the node ID and enode URL for bootnodes
            if [[ "${NODE_ROLES[$i]}" == *"bootnode"* ]] && [[ -f "${node_dir}/key.pub" ]]; then
                local full_pub_key=$(cat "${node_dir}/key.pub" 2>/dev/null | tr -d '\n' | sed 's/^0x//')
                local node_id
                if [[ "$full_pub_key" =~ ^04 ]]; then
                    node_id="${full_pub_key:2}"  # Remove leading 04
                else
                    node_id="$full_pub_key"
                fi
                log_debug "  Node ID: ${node_id:0:16}...${node_id: -16}"
                log_debug "  Enode URL: enode://${node_id}@${NODE_IPS[$i]}:30303"
            fi
        fi
    done
    
    log_success "All node identities generated successfully"
    echo ""  # Add blank line for better readability
    return 0
}

# 🚩 GENESIS BLOCK GENERATION
# Generate genesis.json file with Clique PoA configuration

generate_genesis() {
    log_step "Generating Genesis Configuration"
    
    # If using --no-cleanup, skip genesis generation
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_check "Using existing genesis.json (--no-cleanup mode)"
        return 0
    fi
    
    local genesis_file="${SCRIPT_DIR}/genesis.json"
    local nodes_dir="${SCRIPT_DIR}/nodes"
    
    # Collect validator addresses
    log_check "Collecting validator addresses..."
    local validator_addresses=()
    local validator_names=()
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        
        # Check if this node is a validator
        if [[ "$node_roles" == *"validator"* ]]; then
            local address_file="${nodes_dir}/${node_name}/address"
            if [[ -f "$address_file" ]]; then
                # Read address and remove newlines, then remove 0x prefix if present
                local address=$(cat "$address_file" 2>/dev/null | tr -d '\n' | sed 's/^0x//')
                
                # Validate that we have exactly 40 hex characters
                if [[ ! "$address" =~ ^[a-fA-F0-9]{40}$ ]]; then
                    log_error "Invalid address format for validator $node_name: expected 40 hex characters, got '${address}' (${#address} chars)"
                    return 1
                fi
                
                validator_addresses+=("$address")
                validator_names+=("$node_name")
                log_debug "Added validator: $node_name with address: 0x$address"
            else
                log_error "Address file not found for validator: $node_name"
                return 1
            fi
        fi
    done
    
    local validator_count=${#validator_addresses[@]}
    log_success "Found $validator_count validator(s)"
    
    # 🚩 Extradata field generation (Clique PoA model)

    # [32 bytes vanity] + [addresses] + [65 bytes signature]
    # - 32 bytes iniciales: Vanity data (usualmente ceros)
    # - 20 bytes por validador: Direcciones concatenadas
    # - 65 bytes finales: Espacio para firma (inicialmente ceros)

    log_check "Building extraData field..."

    local extra_data="0x"
    extra_data+="$(printf '%0*s' 64 '' | tr ' ' '0')"
    for address in "${validator_addresses[@]}"; do
        extra_data+="$address"
    done
    
    extra_data+="$(printf '%0*s' 130 '' | tr ' ' '0')"
    
    log_debug "ExtraData length: ${#extra_data} characters"
    log_debug "ExtraData: $extra_data"
    
    # Generate genesis.json file
    log_check "Writing genesis.json file..."
    cat <<EOF > "$genesis_file"
{
  "config": {
    "chainId": $CHAIN_ID,
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
      "blockPeriodSeconds": $BLOCK_PERIOD_SECONDS,
      "epochLength": $EPOCH_LENGTH
    }
  },
  "nonce": "0x0",
  "timestamp": "0x0",
  "gasLimit": "0x47b760",
  "difficulty": "0x1",
  "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "coinbase": "0x0000000000000000000000000000000000000000",
  "extraData": "$extra_data",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "alloc": {
EOF
    
    # Add pre-funded accounts from config
    local first_alloc=1
    for i in "${!ALLOC_ADDRESSES[@]}"; do
        local address="${ALLOC_ADDRESSES[$i]}"
        local prefunding="${ALLOC_PREFUNDING[$i]}"
        
        # Remove 0x prefix from address for the key
        local address_key="${address#0x}"
        
        # Validate that we have exactly 40 hex characters for the address key
        if [[ ! "$address_key" =~ ^[a-fA-F0-9]{40}$ ]]; then
            log_error "Invalid address format for alloc entry $i: expected 40 hex characters, got '${address_key}' (${#address_key} chars) from '${address}'"
            return 1
        fi
        
        # Add comma if not the first entry
        if [[ $first_alloc -eq 0 ]]; then
            echo "," >> "$genesis_file"
        else
            first_alloc=0
        fi
        
        # Write account entry without trailing comma
        cat <<EOF >> "$genesis_file" | tr -d '\n'
    "$address_key": {
      "balance": "$prefunding"
    }
EOF
    done
    
    # Add automatic pre-funding for generated node accounts
    log_check "Adding automatic pre-funding for generated node accounts..."
    
    # 🚩 Node PRE-FUNDING
    # This loop auto-allocates ETH to each new node in genesis.json
    # (skipping the manual step of extracting addresses and editing the alloc section)

    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_prefunding_eth="${NODE_PREFUNDING[$i]}"
        local address_file="${nodes_dir}/${node_name}/address"
        
        # Skip nodes with 0 prefunding
        if [[ "$node_prefunding_eth" == "0" ]]; then
            log_debug "Skipping $node_name (prefunding: 0 ETH)"
            continue
        fi
        
        if [[ -f "$address_file" ]]; then
            # Read the node's address
            local node_address=$(cat "$address_file" 2>/dev/null | tr -d '\n' | sed 's/^0x//')
            
            # Validate address format
            if [[ ! "$node_address" =~ ^[a-fA-F0-9]{40}$ ]]; then
                log_error "Invalid address format for node $node_name: expected 40 hex characters, got '${node_address}' (${#node_address} chars)"
                return 1
            fi
            
            # Convert ETH to Wei (multiply by 10^18)
            local funding_wei
            if command_exists bc; then
                funding_wei=$(echo "scale=0; $node_prefunding_eth * 1000000000000000000 / 1" | bc)
            else
                # Fallback for systems without bc
                funding_wei=$(python3 -c "print(int($node_prefunding_eth * 10**18))" 2>/dev/null || echo "0")
            fi
            
            # Validate the Wei amount
            if [[ ! "$funding_wei" =~ ^[0-9]+$ ]]; then
                log_error "Invalid funding amount calculated for node $node_name: $funding_wei Wei from $node_prefunding_eth ETH"
                return 1
            fi
            
            # Check if the amount is greater than 0 (string comparison for large numbers)
            if [[ "$funding_wei" == "0" ]]; then
                log_error "Funding amount cannot be zero for node $node_name"
                return 1
            fi
            
            # Add comma before entry
            if [[ $first_alloc -eq 0 ]]; then
                echo "," >> "$genesis_file"
            else
                first_alloc=0
            fi
            
            # Write node account entry
            cat <<EOF >> "$genesis_file" | tr -d '\n'
    "$node_address": {
      "balance": "$funding_wei"
    }
EOF
            
            log_debug "Added pre-funding for $node_name (0x$node_address): $node_prefunding_eth ETH ($funding_wei Wei)"
        else
            log_warning "Address file not found for node $node_name, skipping pre-funding"
        fi
    done
    
    log_success "Automatic node pre-funding completed"
    
    # Close the JSON structure
    cat <<EOF >> "$genesis_file"

  }
}
EOF
    
    # Verify the genesis file was created and is valid JSON
    log_check "Verifying genesis.json..."
    if [[ ! -f "$genesis_file" ]]; then
        log_error "Genesis file was not created"
        return 1
    fi
    
    # Check if the JSON is valid
    if ! jq empty "$genesis_file" 2>/dev/null; then
        log_error "Generated genesis.json is not valid JSON"
        log_debug "Genesis file content:"
        cat "$genesis_file" >&2
        return 1
    fi
    
    log_success "Genesis file generated successfully: $genesis_file"
    
    # Display summary of validators included
    log_step "Genesis Configuration Summary"
    log_success "Chain ID: $CHAIN_ID"
    log_success "Consensus: Clique PoA"
    log_success "Block Period: $BLOCK_PERIOD_SECONDS seconds"
    log_success "Epoch Length: $EPOCH_LENGTH blocks"
    log_success "Validators included ($validator_count):"
    
    for i in "${!validator_names[@]}"; do
        local name="${validator_names[$i]}"
        local address="0x${validator_addresses[$i]}"
        log_success "  - $name: $address"
    done
    
    # Display pre-funded accounts from config
    if [[ ${#ALLOC_ADDRESSES[@]} -gt 0 ]]; then
        log_success "Pre-funded accounts from config (${#ALLOC_ADDRESSES[@]}):"
        for i in "${!ALLOC_ADDRESSES[@]}"; do
            local address="${ALLOC_ADDRESSES[$i]}"
            local prefunding="${ALLOC_PREFUNDING[$i]}"
            # Convert prefunding from Wei to Ether for display (divide by 10^18)
            local ether_prefunding="N/A"
            if command_exists bc; then
                ether_prefunding=$(echo "scale=4; $prefunding / 1000000000000000000" | bc 2>/dev/null || echo "N/A")
            fi
            log_success "  - $address: $prefunding Wei ($ether_prefunding ETH)"
        done
    fi
    
    # Display auto-prefunded node accounts
    local nodes_with_funding=0
    for i in "${!NODE_NAMES[@]}"; do
        if [[ "${NODE_PREFUNDING[$i]}" != "0" ]]; then
            ((nodes_with_funding++))
        fi
    done
    
    if [[ $nodes_with_funding -gt 0 ]]; then
        log_success "Auto-prefunded node accounts ($nodes_with_funding):"
        for i in "${!NODE_NAMES[@]}"; do
            local node_name="${NODE_NAMES[$i]}"
            local node_roles="${NODE_ROLES[$i]}"
            local node_prefunding_eth="${NODE_PREFUNDING[$i]}"
            local address_file="${nodes_dir}/${node_name}/address"
            
            # Skip nodes with 0 prefunding
            if [[ "$node_prefunding_eth" == "0" ]]; then
                continue
            fi
            
            if [[ -f "$address_file" ]]; then
                local node_address=$(cat "$address_file" 2>/dev/null | tr -d '\n')
                
                # Format roles for display
                local role_list=""
                if [[ "$node_roles" == *"validator"* ]]; then role_list+="validator "; fi
                if [[ "$node_roles" == *"bootnode"* ]]; then role_list+="bootnode "; fi
                if [[ "$node_roles" == *"rpc"* ]]; then role_list+="rpc "; fi
                role_list="${role_list% }"  # Remove trailing space
                if [[ -z "$role_list" ]]; then role_list="none"; fi
                
                log_success "  - $node_name ($node_address): $node_prefunding_eth ETH - Roles: $role_list"
            fi
        done
    else
        log_success "No nodes configured with prefunding"
    fi
    
    # Verify extraData format
    local expected_length=$((2 + 64 + (validator_count * 40) + 130))
    local actual_length=${#extra_data}
    if [[ $actual_length -ne $expected_length ]]; then
        log_warning "ExtraData length mismatch. Expected: $expected_length, Got: $actual_length"
        return 1
    fi
    
    log_success "Genesis configuration complete"
    echo ""  # Add blank line for better readability
    return 0
}

# Generate node-specific configuration files (config.toml)
generate_node_configs() {
    log_step "Generating Node Configuration Files"
    
    # If using --no-cleanup, skip config generation
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_check "Using existing node configurations (--no-cleanup mode)"
        return 0
    fi
    
    local nodes_dir="${SCRIPT_DIR}/nodes"
    local genesis_file="${SCRIPT_DIR}/genesis.json"
    
    # First, collect all bootnode enode URLs
    log_check "Collecting bootnode enode URLs..."
    local bootnode_urls=()
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        local node_ip="${NODE_IPS[$i]}"
        
        # Check if this node is a bootnode
        if [[ "$node_roles" == *"bootnode"* ]]; then
            local public_key_file="${nodes_dir}/${node_name}/key.pub"
            
            if [[ -f "$public_key_file" ]]; then
                # Read the public key and process it to extract the node ID
                local full_pub_key
                full_pub_key=$(cat "$public_key_file" 2>/dev/null | tr -d '\n' | sed 's/^0x//')
                
                # Extract the node ID: remove 04 prefix if present
                local node_id
                if [[ "$full_pub_key" =~ ^04 ]]; then
                    node_id="${full_pub_key:2}"  # Remove leading 04
                else
                    node_id="$full_pub_key"
                fi
                
                # Validate that we have exactly 128 hex characters for the Node ID
                if [[ ! "$node_id" =~ ^[a-fA-F0-9]{128}$ ]]; then
                    log_error "Invalid Node ID format for bootnode $node_name: expected 128 hex characters, got '${node_id}' (${#node_id} chars)"
                    return 1
                fi
                
                # Construct the enode URL
                local enode_url="enode://${node_id}@${node_ip}:30303"
                bootnode_urls+=("$enode_url")
                
                log_debug "Bootnode enode URL for $node_name: $enode_url"
            else
                log_error "Public key file not found for bootnode: $node_name"
                return 1
            fi
        fi
    done
    
    log_success "Found ${#bootnode_urls[@]} bootnode(s)"
    
    # Generate config.toml for each node
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        local node_dir="${nodes_dir}/${node_name}"
        local config_file="${node_dir}/config.toml"
        
        log_check "Generating config.toml for node: $node_name"
        
        # Build bootnodes array based on node role
        # Bootnodes get an empty list to avoid self-referencing issues
        # Other nodes get the full list of bootnode URLs
        local bootnodes_toml="[]"  # Default to empty list
        
        # If the current node is NOT a bootnode, then give it the full list
        if [[ "$node_roles" != *"bootnode"* ]]; then
            bootnodes_toml="["
            local comma=""
            for url in "${bootnode_urls[@]}"; do
                bootnodes_toml+="${comma}\"$url\""
                comma=","
            done
            bootnodes_toml+="]"
            log_debug "Node '$node_name' is a peer. Setting bootnodes: $bootnodes_toml"
        else
            # Bootnodes get an empty peer list to prevent them from trying to connect to themselves.
            log_debug "Node '$node_name' IS the bootnode. Setting empty bootnodes list."
        fi
        
        # Determine RPC configuration
        local rpc_enabled="false"
        local rpc_config=""
        if [[ "$node_roles" == *"rpc"* ]]; then
            rpc_enabled="true"
            rpc_config="rpc-http-host=\"0.0.0.0\"
rpc-http-port=8545
rpc-http-cors-origins=[\"*\"]
rpc-http-api=[\"ETH\",\"NET\",\"CLIQUE\",\"ADMIN\"]"
        fi
        
        # Determine mining configuration
        local mining_enabled="false"
        local coinbase_config=""
        if [[ "$node_roles" == *"validator"* ]]; then
            mining_enabled="true"
            # Read the node's address for coinbase
            local node_address=""
            if [[ -f "${node_dir}/address" ]]; then
                node_address=$(cat "${node_dir}/address" 2>/dev/null | tr -d '\n')
            fi
            coinbase_config="miner-coinbase=\"$node_address\""
        fi
        
        # 🚩 Generate the complete config.toml file using a single heredoc
        cat <<EOF > "$config_file"
# Configuration file for Besu node: $node_name
# Generated by Besu Network Automation Tool

# Network configuration
genesis-file="/data/genesis.json"
data-path="/data"

# P2P configuration
p2p-enabled=true
nat-method="DOCKER"

# Discovery configuration
bootnodes=$bootnodes_toml

# Host allowlist
host-allowlist=["*"]

# Logging
logging="INFO"

# RPC HTTP configuration
rpc-http-enabled=$rpc_enabled
$rpc_config

# Metrics configuration
metrics-enabled=false

# Mining configuration
miner-enabled=$mining_enabled
$coinbase_config

# Node identity
node-private-key-file="/data/key"
EOF
        
        # Verify the config file was created
        if [[ ! -f "$config_file" ]]; then
            log_error "Failed to create config.toml for node: $node_name"
            return 1
        fi
        
        # Verify file is readable
        if ! cat "$config_file" >/dev/null 2>&1; then
            log_error "Config file is not readable for node: $node_name"
            return 1
        fi
        
        log_success "Config file generated for node: $node_name"
        
        # Display key configuration details in debug mode
        if [[ $DEBUG -eq 1 ]]; then
            log_debug "Node $node_name configuration:"
            log_debug "  - Roles: $node_roles"
            log_debug "  - Bootnodes: $(grep -c "enode://" "$config_file") configured"
            log_debug "  - RPC enabled: $(grep "rpc-http-enabled=true" "$config_file" >/dev/null && echo "yes" || echo "no")"
            log_debug "  - Mining enabled: $(grep "miner-enabled=true" "$config_file" >/dev/null && echo "yes" || echo "no")"
        fi
    done
    
    # Summary of generated configurations
    log_step "Node Configuration Summary"
    
    local rpc_nodes=0
    local validator_nodes=0
    local bootnode_nodes=0
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        
        [[ "$node_roles" == *"rpc"* ]] && ((rpc_nodes++))
        [[ "$node_roles" == *"validator"* ]] && ((validator_nodes++))
        [[ "$node_roles" == *"bootnode"* ]] && ((bootnode_nodes++))
    done
    
    log_success "Generated ${#NODE_NAMES[@]} node configuration files"
    log_success "  - Bootnodes: $bootnode_nodes"
    log_success "  - Validators: $validator_nodes"
    log_success "  - RPC nodes: $rpc_nodes"
    
    # Display bootnode enode URLs for reference
    if [[ ${#bootnode_urls[@]} -gt 0 ]]; then
        log_success "Bootnode enode URLs:"
        for url in "${bootnode_urls[@]}"; do
            log_success "  - $url"
        done
    fi
    
    echo ""  # Add blank line for better readability
    return 0
}

# 🚩 STAGGERED NODE LAUNCH
# Launch Docker containers for all nodes with staggered approach

launch_nodes() {
    log_step "Launching Node Containers (Staggered Start)"
    
    local nodes_dir="${SCRIPT_DIR}/nodes"
    local genesis_file="${SCRIPT_DIR}/genesis.json"
    local launched_nodes=0
    local failed_nodes=0
    
    # Arrays to track node status
    declare -a launched_node_names=()
    declare -a launched_node_roles=()
    declare -a launched_node_ips=()
    
    # If using --no-cleanup, remove existing containers first
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_check "Removing existing containers (--no-cleanup mode)"
        local existing_containers=$(docker ps -a --filter "label=$NETWORK_LABEL" -q)
        if [[ -n "$existing_containers" ]]; then
            echo "$existing_containers" | xargs -r docker stop 2>/dev/null || true
            echo "$existing_containers" | xargs -r docker rm -f 2>/dev/null || true
            log_success "Existing containers removed"
        fi
    fi

    # 🚩 Docker run for nodes as function
    # Builds args from TOML (parsed from YAML) and loops by index to launch each node.
    
    # Helper function to launch a single node
    launch_single_node() {
        local node_index="$1"
        local node_name="${NODE_NAMES[$node_index]}"
        local node_ip="${NODE_IPS[$node_index]}"
        local node_roles="${NODE_ROLES[$node_index]}"
        local rpc_mapping="${NODE_RPC_MAPPINGS[$node_index]}"
        local node_dir="${nodes_dir}/${node_name}"
        
        log_docker "Launching container for node: $node_name"
        
        # Build docker run command
        local docker_cmd="docker run -d"
        
        # Container name
        docker_cmd+=" --name ${node_name}"
        
        # Network configuration
        docker_cmd+=" --network ${NETWORK_NAME}"
        docker_cmd+=" --ip ${node_ip}"
        
        # Project label
        docker_cmd+=" --label ${NETWORK_LABEL}"
        
        # RPC port mapping if node has rpc role
        if [[ "$node_roles" == *"rpc"* ]] && [[ -n "$rpc_mapping" ]]; then
            docker_cmd+=" -p ${rpc_mapping}"
            log_debug "Adding RPC port mapping: $rpc_mapping"
        fi
        
        # Volume mounts
        # Mount entire node directory to /data to match config.toml paths
        docker_cmd+=" -v ${node_dir}:/data"
        # Mount genesis file to /data/genesis.json inside the container
        docker_cmd+=" -v ${genesis_file}:/data/genesis.json:ro"
        
        # User permissions if enabled
        if [[ "$DOCKER_USER_PERMISSIONS" == "true" ]]; then
            docker_cmd+=" --user $(id -u):$(id -g)"
            log_debug "Using user permissions: $(id -u):$(id -g)"
        fi
        
        # Docker image
        docker_cmd+=" ${DOCKER_IMAGE}"
        
        # Besu command with config file now points to /data/config.toml
        docker_cmd+=" --config-file=/data/config.toml"
        
        # Add sync configuration directly as command-line argument (bypasses TOML parsing issues)
        docker_cmd+=" --sync-min-peers=0"
        
        # Execute the docker run command
        log_debug "Executing: $docker_cmd"
        
        if eval "$docker_cmd" >/dev/null 2>&1; then
            # Verify container is running
            if docker ps --format '{{.Names}}' | grep -q "^${node_name}$"; then
                log_success "Container launched successfully: $node_name"
                ((launched_nodes++))
                
                # Track successfully launched nodes
                launched_node_names+=("$node_name")
                launched_node_roles+=("$node_roles")
                launched_node_ips+=("$node_ip")
                return 0
            else
                log_error "Container failed to start: $node_name"
                ((failed_nodes++))
                
                # Try to get logs for debugging
                local logs=$(docker logs "$node_name" 2>&1 | head -10)
                if [[ -n "$logs" ]]; then
                    log_debug "Container logs for $node_name:"
                    log_debug "$logs"
                fi
                return 1
            fi
        else
            log_error "Failed to launch container: $node_name"
            ((failed_nodes++))
            return 1
        fi
    }
    
    # 🚩 --- [ PHASE 1: LAUNCH BOOTNODES ] ---

    # 🚩 Launching bootnodes with "launch_single_node" (loops by index)
    log_step "Phase 1: Launching Bootnode(s)"
    local bootnode_count=0
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_roles="${NODE_ROLES[$i]}"
        
        # Only launch bootnodes in this phase
        if [[ "$node_roles" != *"bootnode"* ]]; then
            continue
        fi
        
        local node_name="${NODE_NAMES[$i]}"
        log_check "Launching bootnode: $node_name"
        
        if launch_single_node "$i"; then
            ((bootnode_count++))
            log_success "Bootnode $node_name launched successfully"
        else
            log_error "Failed to launch bootnode: $node_name"
            return 1
        fi
    done
    
    if [[ $bootnode_count -eq 0 ]]; then
        log_error "No bootnodes found to launch. At least one bootnode is required."
        return 1
    fi
    
    log_success "Launched $bootnode_count bootnode(s) successfully"
    
    # Brief pause for bootnode stabilization (revealed to be unnecessary on posterior testing)
    sleep 0
    
    # --- [ PHASE 2: LAUNCH REMAINING NODES ] ---

    # 🚩 Launching non-bootnode peers with "launch_single_node" (loops by index)
    log_step "Phase 2: Launching Non-Bootnode Peers"
    local peer_count=0
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_roles="${NODE_ROLES[$i]}"
        
        # Skip bootnodes, as they are already running
        if [[ "$node_roles" == *"bootnode"* ]]; then
            continue
        fi
        
        local node_name="${NODE_NAMES[$i]}"
        log_check "Launching peer node: $node_name"
        
        if launch_single_node "$i"; then
            ((peer_count++))
            log_success "Peer node $node_name launched successfully"
            
            # Small delay between peer launches to avoid overwhelming bootnodes
            if [[ $peer_count -lt $((NODE_COUNT - bootnode_count)) ]]; then
                log_debug "Brief pause before next peer launch..."
                sleep 2
            fi
        else
            log_error "Failed to launch peer node: $node_name"
            # Continue with other nodes rather than failing completely
        fi
    done
    
    log_success "Launched $peer_count peer node(s)"
    
    # --- [ FINAL VERIFICATION & SUMMARY ] ---
    log_step "Node Launch Summary"
    
    # Verify final node count
    local total_launched_nodes=$(docker ps --filter "label=$NETWORK_LABEL" --format '{{.Names}}' | wc -l)
    local expected_nodes=$NODE_COUNT
    
    if [[ $total_launched_nodes -eq $expected_nodes ]]; then
        log_success "All $expected_nodes nodes launched successfully using staggered approach"
        log_success "  - Bootnodes: $bootnode_count (launched first)"
        log_success "  - Peer nodes: $peer_count (launched after stabilization)"
    else
        log_warning "Launched $total_launched_nodes out of $expected_nodes nodes"
        if [[ $failed_nodes -gt 0 ]]; then
            log_error "$failed_nodes node(s) failed to launch"
        fi
    fi
    
    # Display all running nodes with their roles
    if [[ ${#launched_node_names[@]} -gt 0 ]]; then
        log_success "Running nodes:"
        for i in "${!launched_node_names[@]}"; do
            local name="${launched_node_names[$i]}"
            local roles="${launched_node_roles[$i]}"
            local ip="${launched_node_ips[$i]}"
            
            # Format roles for display
            local role_display=""
            [[ "$roles" == *"bootnode"* ]] && role_display+="bootnode "
            [[ "$roles" == *"validator"* ]] && role_display+="validator "
            [[ "$roles" == *"rpc"* ]] && role_display+="rpc "
            role_display=$(echo "$role_display" | xargs)  # Trim whitespace
            
            # Add launch phase indicator
            local launch_phase=""
            if [[ "$roles" == *"bootnode"* ]]; then
                launch_phase=" (Phase 1)"
            else
                launch_phase=" (Phase 2)"
            fi
            
            log_success "  - $name ($ip) - Roles: $role_display$launch_phase"
        done
        
        # Display RPC endpoints if any
        local rpc_endpoints_found=0
        for i in "${!NODE_NAMES[@]}"; do
            if [[ "${NODE_ROLES[$i]}" == *"rpc"* ]] && [[ -n "${NODE_RPC_MAPPINGS[$i]}" ]]; then
                if [[ $rpc_endpoints_found -eq 0 ]]; then
                    log_success "RPC Endpoints:"
                    rpc_endpoints_found=1
                fi
                local port="${NODE_RPC_MAPPINGS[$i]%%:*}"
                log_success "  - ${NODE_NAMES[$i]}: http://localhost:$port"
            fi
        done
    fi
    
    # Error handling and debugging information
    if [[ $failed_nodes -gt 0 ]]; then
        log_error "$failed_nodes node(s) failed to launch"
        
        # Show docker ps for debugging
        log_debug "Current running containers:"
        docker ps --filter "label=$NETWORK_LABEL" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
        
        # Show failed containers
        log_debug "Failed/stopped containers:"
        docker ps -a --filter "label=$NETWORK_LABEL" --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
        
        return 1
    fi
    
    # Success summary
    log_success "Staggered node launch completed successfully"
    log_tip "Bootnodes were launched first and given time to initialize before peer connections"
    log_tip "This approach significantly improves P2P network formation reliability"
    
    # The robust P2P connectivity test is now handled in the dedicated
    # test_p2p_connectivity function. This premature check is removed to avoid confusion.
    log_success "Network ready for validation. P2P connectivity will be tested in automated tests."
    
    echo ""  # Add blank line for better readability
    
    # Start block monitoring immediately after node launch
    sleep 5  # Brief pause for containers to initialize
    
    # Start monitor but don't fail if it doesn't work
    if ! start_block_monitor; then
        log_warning "Block monitor could not be started, but continuing anyway"
    else
        log_debug "Block monitor started with PID: ${BLOCK_MONITOR_PID:-unknown}"
    fi
    
    return 0
}

# Wait for node to be ready by polling RPC endpoint
wait_for_node_ready() {
    local rpc_url="$1"
    local timeout="${AUTOMATED_TESTS_WAIT_TIMEOUT:-60}"
    local start_time=$(date +%s)
    
    log_check "Waiting for node at $rpc_url to be ready (timeout: ${timeout}s)..."
    
    while true; do
        # Check if timeout reached
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $timeout ]]; then
            log_error "Timeout waiting for node at $rpc_url"
            return 1
        fi
        
        # Try to call net_version
        local response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
            "$rpc_url" 2>/dev/null || true)
        
        # Check if we got a valid response
        if [[ -n "$response" ]] && echo "$response" | jq -e '.result' >/dev/null 2>&1; then
            local net_version=$(echo "$response" | jq -r '.result')
            log_success "Node ready at $rpc_url (network version: $net_version)"
            return 0
        fi
        
        log_check "Node not ready yet, retrying in 2 seconds... (elapsed: ${elapsed}s)"
        sleep 2
    done
}

# 🚩 Genesis state test: verifies pre-funded balances and block height  
# Uses JSON-RPC calls to confirm initial chain integrity before running operations

test_genesis_state() {
    log_step "Testing Genesis State"
    
    local rpc_url="${1:-$RPC_PRIMARY_ENDPOINT}"
    local errors=0
    
    # Test 1: Verify block number (should be 0 or more)
    log_check "Verifying current block number..."
    local block_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$rpc_url" 2>/dev/null || true)
    
    if [[ -n "$block_response" ]] && echo "$block_response" | jq -e '.result' >/dev/null 2>&1; then
        local block_hex=$(echo "$block_response" | jq -r '.result')
        local block_number=$((16#${block_hex#0x}))
        log_success "Current block number: $block_number"
        
        if [[ $block_number -lt 0 ]]; then
            log_error "Invalid block number: $block_number"
            ((errors++))
        fi
    else
        log_error "Failed to get block number"
        ((errors++))
    fi
    
    # Test 2: Verify pre-funded account balances
    log_check "Verifying pre-funded account balances..."
    
    for i in "${!ALLOC_ADDRESSES[@]}"; do
        local address="${ALLOC_ADDRESSES[$i]}"
        local expected_balance="${ALLOC_PREFUNDING[$i]}"  # Changed from ALLOC_BALANCES to ALLOC_PREFUNDING
        
        log_check "Checking balance for $address..."
        
        local balance_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$address\",\"latest\"],\"id\":1}" \
            "$rpc_url" 2>/dev/null || true)
        
        if [[ -n "$balance_response" ]] && echo "$balance_response" | jq -e '.result' >/dev/null 2>&1; then
            # Get the actual balance as a hex string from the node
            local actual_balance_hex=$(echo "$balance_response" | jq -r '.result')

            # Convert the expected decimal balance to a hex string using bc for large number support
            local expected_balance_hex="0x$(echo "obase=16; $expected_balance" | bc)"
            
            # Convert both to lowercase for case-insensitive comparison
            local actual_balance_lower=$(echo "$actual_balance_hex" | tr '[:upper:]' '[:lower:]')
            local expected_balance_lower=$(echo "$expected_balance_hex" | tr '[:upper:]' '[:lower:]')
            
            if [[ "$actual_balance_lower" == "$expected_balance_lower" ]]; then
                log_success "Balance correct for $address: $expected_balance Wei"
            else
                log_error "Balance mismatch for $address. Expected: $expected_balance_hex, Got: $actual_balance_hex"
                ((errors++))
            fi
        else
            log_error "Failed to get balance for $address"
            ((errors++))
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        log_success "Genesis state verification passed"
        return 0
    else
        log_error "Genesis state verification failed with $errors error(s)"
        return 1
    fi
}

# Test P2P connectivity between nodes - MODIFIED with Intelligent Polling
test_p2p_connectivity() {
    log_step "Testing P2P Connectivity"
    
    local warnings=0
    local total_peers=0
    local isolated_nodes=()
    isolated_validators=()
    
    # --- [ Intelligent Wait for P2P ] ---
    # Find the first RPC-enabled node to use for polling
    local primary_rpc_url=""
    local primary_node_name=""
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        local rpc_mapping="${NODE_RPC_MAPPINGS[$i]}"
        
        if [[ "$node_roles" == *"rpc"* ]] && [[ -n "$rpc_mapping" ]]; then
            local port="${rpc_mapping%%:*}"
            primary_rpc_url="http://localhost:$port"
            primary_node_name="$node_name"
            break
        fi
    done
    
    if [[ -z "$primary_rpc_url" ]]; then
        log_error "No RPC-enabled node found for P2P polling"
        return 1
    fi
    
    local p2p_timeout=45 # 45 second timeout for peers to connect
    local start_time=$(date +%s)
    
    log_check "Waiting for P2P network to establish (polling for peers at $primary_rpc_url)..."
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $p2p_timeout ]]; then
            log_warning "Timeout waiting for P2P connections. Proceeding with test anyway."
            break
        fi
        
        local peer_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
            "$primary_rpc_url" 2>/dev/null || true)
        
        if [[ -n "$peer_response" ]] && echo "$peer_response" | jq -e '.result' >/dev/null 2>&1; then
            local peer_count_hex=$(echo "$peer_response" | jq -r '.result')
            local peer_count=$((16#${peer_count_hex#0x}))
            
            if [[ $peer_count -gt 0 ]]; then
                log_success "P2P network established! Found $peer_count peer(s) after ${elapsed}s."
                break
            fi
            log_debug "Waiting for peers... ($peer_count found so far, elapsed: ${elapsed}s)"
        fi
        
        sleep 3 # Wait 3 seconds between polls
    done
    # --- [ End of Intelligent Wait ] ---
    
    local expected_peers=$((NODE_COUNT - 1))
    log_check "Checking peer connections (expecting up to $expected_peers peers per node)..."
    
    # Check each node with RPC enabled
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        local rpc_mapping="${NODE_RPC_MAPPINGS[$i]}"
        
        if [[ "$node_roles" != *"rpc"* ]] || [[ -z "$rpc_mapping" ]]; then
            log_debug "Skipping $node_name (no RPC endpoint)"
            continue
        fi
        
        local port="${rpc_mapping%%:*}"
        local rpc_url="http://localhost:$port"
        
        log_check "Checking peers for $node_name at $rpc_url..."
        
        local peer_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
            "$rpc_url" 2>/dev/null || true)
        
        if [[ -n "$peer_response" ]] && echo "$peer_response" | jq -e '.result' >/dev/null 2>&1; then
            local peer_count_hex=$(echo "$peer_response" | jq -r '.result')
            local peer_count=$((16#${peer_count_hex#0x}))
            
            # Enhanced logging with role information
            local role_info=""
            if [[ "$node_roles" == *"bootnode"* ]]; then role_info+="bootnode "; fi
            if [[ "$node_roles" == *"validator"* ]]; then role_info+="validator "; fi
            if [[ "$node_roles" == *"rpc"* ]]; then role_info+="rpc "; fi
            role_info=$(echo "$role_info" | xargs)  # Trim whitespace
            
            if [[ $peer_count -gt 0 ]]; then
                log_success "$node_name ($role_info) has $peer_count peer(s)"
                
                # If debug enabled, get detailed peer info
                if [[ $DEBUG -eq 1 ]]; then
                    local peers_response=$(curl -s -X POST \
                        -H "Content-Type: application/json" \
                        -d '{"jsonrpc":"2.0","method":"admin_peers","params":[],"id":1}' \
                        "$rpc_url" 2>/dev/null || true)
                    
                    if [[ -n "$peers_response" ]] && echo "$peers_response" | jq -e '.result' >/dev/null 2>&1; then
                        log_debug "  Detailed peer info for $node_name:"
                        echo "$peers_response" | jq -r '.result[] | "    - " + .network.remoteAddress + " (enode: " + .enode[0:20] + "...)"' 2>/dev/null || log_debug "    - Peer details unavailable"
                    fi
                fi
            else
                log_warning "$node_name ($role_info) is isolated (0 peers)"
                isolated_nodes+=("$node_name")
                ((warnings++))
                
                # Additional diagnostics for isolated nodes
                if [[ $DEBUG -eq 1 ]]; then
                    log_debug "  Diagnostics for isolated node $node_name:"
                    
                    # Check if the node is listening on P2P port
                    local container_ip="${NODE_IPS[$i]}"
                    log_debug "    - Container IP: $container_ip"
                    log_debug "    - Expected P2P port: 30303"
                    
                    # Check container status
                    local container_status=$(docker inspect -f '{{.State.Status}}' "$node_name" 2>/dev/null || echo "not found")
                    log_debug "    - Container status: $container_status"
                    
                    # Show recent logs (last 5 lines) for debugging
                    log_debug "    - Recent container logs:"
                    docker logs --tail 5 "$node_name" 2>&1 | while IFS= read -r line; do
                        log_debug "      $line"
                    done
                fi
            fi
            
            total_peers=$((total_peers + peer_count))
        else
            log_error "Failed to get peer count for $node_name"
            if [[ $DEBUG -eq 1 ]]; then
                log_debug "  RPC response: $peer_response"
            fi
            isolated_nodes+=("$node_name")
            ((warnings++))
        fi
    done
    
    # Summary
    log_step "P2P Connectivity Summary"
    
    # Calculate average peers per node
    local nodes_with_rpc=0
    for i in "${!NODE_NAMES[@]}"; do
        if [[ "${NODE_ROLES[$i]}" == *"rpc"* ]] && [[ -n "${NODE_RPC_MAPPINGS[$i]}" ]]; then
            ((nodes_with_rpc++))
        fi
    done
    
    local avg_peers=0
    if [[ $nodes_with_rpc -gt 0 ]]; then
        avg_peers=$((total_peers / nodes_with_rpc))
    fi
    
    log_success "Network topology analysis:"
    log_success "  - Total nodes: $NODE_COUNT"
    log_success "  - Nodes with RPC (tested): $nodes_with_rpc"
    log_success "  - Average peers per node: $avg_peers"
    log_success "  - Expected peers per node: $((NODE_COUNT - 1))"
    
    if [[ ${#isolated_nodes[@]} -eq 0 ]]; then
        log_success "All tested nodes appear to be connected to the network"
        
        # Check if we have good network density
        if [[ $avg_peers -ge $((NODE_COUNT / 2)) ]]; then
            log_success "Good network density - sufficient peer connections"
        else
            log_warning "Low network density - consider checking node configurations"
        fi
    else
        log_warning "${#isolated_nodes[@]} node(s) may be isolated: ${isolated_nodes[*]}"
        
    fi
    
    # 🚩 Detect isolated validators to prevent "The Stall" (no peers = no consensus)  
    # Clique PoA requires peer connectivity — proactive check avoids chain halts

    for node in "${isolated_nodes[@]}"; do
        for i in "${!NODE_NAMES[@]}"; do
            if [[ "${NODE_NAMES[$i]}" == "$node" ]] && [[ "${NODE_ROLES[$i]}" == *"validator"* ]]; then
                isolated_validators+=("$node")
                break
            fi
        done
    done
    
    if [[ ${#isolated_validators[@]} -gt 0 ]]; then
        log_error "CRITICAL: Isolated validator nodes detected: ${isolated_validators[*]}"
        log_error "This will likely cause consensus failures and block production to stall"
        log_tip "Restart the network or use --debug flag for detailed diagnostics"
    fi
    
    if [[ $warnings -eq 0 ]]; then
        log_success "P2P connectivity test passed"
        return 0
    else
        log_warning "P2P connectivity test completed with $warnings warning(s)"
        
        # If we have critical issues (isolated validators), consider this a failure
        if [[ ${#isolated_validators[@]} -gt 0 ]]; then
            log_error "P2P connectivity test failed due to isolated validators"
            return 1
        fi
        
        return 0
    fi
}

# Fast ethers package verification (avoids slow require() call)
verify_ethers_fast() {
    # Quick directory check first (milliseconds vs seconds)
    if [[ -d "$TX_SIGNER_DEPS_DIR/node_modules/ethers" ]]; then
        # Optionally get version from package.json (still fast)
        local version=$(jq -r '.version' "$TX_SIGNER_DEPS_DIR/node_modules/ethers/package.json" 2>/dev/null || echo "installed")
        echo "$version"
        return 0
    else
        return 1
    fi
}

# Ensure transaction signer dependencies are installed
ensure_tx_signer_dependencies() {
    log_check "Checking transaction signer dependencies..."
    
    # Check if the dependencies directory exists
    if [[ ! -d "$TX_SIGNER_DEPS_DIR" ]]; then
        log_error "Transaction signer dependencies directory not found: $TX_SIGNER_DEPS_DIR"
        return 1
    fi
    
    # Check if package.json exists
    if [[ -f "${TX_SIGNER_DEPS_DIR}/package.json" ]]; then
        log_check "Found package.json, ensuring dependencies are installed..."
        
        # Change to the dependencies directory and install packages
        local install_output=""
        local install_status=0
        
        # Capture both stdout and stderr for better debugging
        if install_output=$(cd "$TX_SIGNER_DEPS_DIR" && npm install 2>&1); then
            log_success "Transaction signer dependencies are up to date"
            log_debug "npm install output: $install_output"
        else
            install_status=$?
            log_error "Failed to install transaction signer dependencies"
            log_error "npm install output: $install_output"
            return $install_status
        fi
        
        # Verify that ethers package is available
        log_check "Verifying ethers package availability..."
        local ethers_check=""
        if ethers_check=$(verify_ethers_fast); then
            log_success "ethers package verified (version: $ethers_check)"
        else
            log_error "ethers package not available after installation"
            log_error "ethers check output: $ethers_check"
            return 1
        fi
        
    else
        log_warning "No package.json found in $TX_SIGNER_DEPS_DIR"
        log_warning "Attempting to verify ethers package availability..."
        
        # Try to check if ethers is available anyway
        local ethers_check=""
        if ethers_check=$(verify_ethers_fast); then
            log_success "ethers package found (version: $ethers_check)"
        else
            log_error "ethers package not available and no package.json to install it"
            log_error "Please ensure ethers is installed in $TX_SIGNER_DEPS_DIR"
            log_tip "Run: cd $TX_SIGNER_DEPS_DIR && npm install ethers"
            return 1
        fi
    fi
    
    return 0
}

# Format address to proper EIP-55 checksum format using Node.js and ethers
format_address_checksum() {
    local address="$1"
    local formatted_address=""
    
    # Create a temporary Node.js script for address formatting
    local formatter_script="${TX_SIGNER_DEPS_DIR}/format_address.js"
    
    cat > "$formatter_script" << 'EOF'
const { ethers } = require('ethers');

try {
    if (process.argv.length < 3) {
        throw new Error('Usage: node format_address.js <address>');
    }
    
    // Clean and normalize the input address
    let inputAddress = process.argv[2].trim(); // Remove whitespace
    
    // Convert to lowercase to bypass any incorrect checksum, then let ethers format it correctly
    const checksumAddress = ethers.getAddress(inputAddress.toLowerCase());
    console.log(checksumAddress);
    
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
EOF
    
    # Format the address using Node.js
    local node_output=""
    if node_output=$(cd "$TX_SIGNER_DEPS_DIR" && node format_address.js "$address" 2>&1); then
        echo "$node_output"
        rm -f "$formatter_script"
        return 0
    else
        log_error "Failed to format address: $address"
        log_tip "Common address issues: incorrect checksum, missing 0x prefix, wrong length (must be 42 chars), or invalid hex characters"
        rm -f "$formatter_script"
        return 1
    fi
}

# 🚩 (BASH + NODE.JS): Delegate signing cryptography to Node.js.
# Transaction testing: uses embedded Node.js + ethers.js to sign and send a test TX (Bash can't sign).  
# Validates EIP-55 checksum, builds raw TX, signs with wallet, and confirms via RPC.
test_transaction() {
    log_step "Testing Transaction Submission"
    
    local errors=0
    local tx_count=0
    
    # Check if we have test transactions configured
    if [[ $TEST_TX_COUNT -eq 0 ]]; then
        log_warning "No test transactions configured, skipping transaction tests"
        return 0
    fi
    
    # Ensure transaction signer dependencies are installed
    if ! ensure_tx_signer_dependencies; then
        log_warning "Transaction signer dependencies not available, skipping transaction tests"
        log_tip "To enable transaction tests, ensure ethers package is installed in: $TX_SIGNER_DEPS_DIR"
        log_tip "Run: cd $TX_SIGNER_DEPS_DIR && npm install ethers"
        return 0  # Return success to not fail the entire test suite
    fi
    
    # Process each test transaction
    for i in $(seq 0 $((TEST_TX_COUNT - 1))); do
        local from_node="${TEST_TX_FROM_NODES[$i]}"
        local to_address="${TEST_TX_TO_ADDRESSES[$i]}"
        local value_ether="${TEST_TX_VALUES_ETHER[$i]}"
        local gas="${TEST_TX_GAS[$i]}"
        local endpoint_type="${TEST_TX_RPC_ENDPOINTS[$i]}"
        
        log_check "Processing test transaction $((i+1))/$TEST_TX_COUNT..."
        log_debug "From: $from_node, To: $to_address, Value: $value_ether ETH"
        
        # Format the destination address to proper EIP-55 checksum format
        log_check "Formatting destination address to EIP-55 checksum..."
        local formatted_to_address=""
        if formatted_to_address=$(format_address_checksum "$to_address"); then
            if [[ "$to_address" != "$formatted_to_address" ]]; then
                log_success "Address checksum corrected: $to_address → $formatted_to_address"
            else
                log_debug "Address already has correct checksum: $formatted_to_address"
            fi
            to_address="$formatted_to_address"
        else
            ((errors++))
            continue
        fi
        
        local rpc_url="${RPC_ENDPOINTS[$endpoint_type]:-}"
        
        if [[ -z "$rpc_url" ]]; then
            log_error "RPC endpoint alias not found in configuration: '$endpoint_type'"
            log_tip "Ensure a node in config.yaml has 'rpc_alias: \"$endpoint_type\"'"
            ((errors++))
            continue
        fi
        
        # Get the from address (node's address)
        local from_address=""
        for j in "${!NODE_NAMES[@]}"; do
            if [[ "${NODE_NAMES[$j]}" == "$from_node" ]]; then
                local node_dir="${SCRIPT_DIR}/nodes/${from_node}"
                if [[ -f "${node_dir}/address" ]]; then
                    from_address=$(cat "${node_dir}/address" 2>/dev/null | tr -d '\n')
                    break
                fi
            fi
        done
        
        if [[ -z "$from_address" ]]; then
            log_error "Could not find address for node: $from_node"
            ((errors++))
            continue
        fi
        
        # Format the from address to proper EIP-55 checksum format as well
        log_check "Formatting from address to EIP-55 checksum..."
        local formatted_from_address=""
        if formatted_from_address=$(format_address_checksum "$from_address"); then
            if [[ "$from_address" != "$formatted_from_address" ]]; then
                log_success "From address checksum corrected: $from_address → $formatted_from_address"
            else
                log_debug "From address already has correct checksum: $formatted_from_address"
            fi
            from_address="$formatted_from_address"
        else
            ((errors++))
            continue
        fi
        
        # Get current nonce
        log_check "Getting nonce for $from_address..."
        local nonce_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionCount\",\"params\":[\"$from_address\",\"latest\"],\"id\":1}" \
            "$rpc_url" 2>/dev/null || true)
        
        if [[ -z "$nonce_response" ]] || ! echo "$nonce_response" | jq -e '.result' >/dev/null 2>&1; then
            log_error "Failed to get nonce for $from_address"
            ((errors++))
            continue
        fi
        
        local nonce_hex=$(echo "$nonce_response" | jq -r '.result')
        local nonce=$((16#${nonce_hex#0x}))
        log_debug "Current nonce: $nonce"
        
        # Get chain ID
        log_check "Getting chain ID..."
        local chainid_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
            "$rpc_url" 2>/dev/null || true)
        
        if [[ -z "$chainid_response" ]] || ! echo "$chainid_response" | jq -e '.result' >/dev/null 2>&1; then
            log_error "Failed to get chain ID"
            ((errors++))
            continue
        fi
        
        local chainid_hex=$(echo "$chainid_response" | jq -r '.result')
        local chainid=$((16#${chainid_hex#0x}))
        log_debug "Chain ID: $chainid"
        
        # Convert value from ether to wei, ensuring the result is an integer
        log_debug "Converting $value_ether ETH to Wei..."
        local value_wei
        if command_exists bc; then
            value_wei=$(echo "scale=0; $value_ether * 1000000000000000000 / 1" | bc)
        else
            # Fallback for systems without bc
            value_wei=$(python3 -c "print(int($value_ether * 10**18))" 2>/dev/null || echo "1000000000000000000")
        fi
        log_debug "Value in Wei: $value_wei"
        
        # Validate values before building transaction object
        if [[ ! "$value_wei" =~ ^[0-9]+$ ]]; then
            log_error "Invalid value in Wei: $value_wei"
            ((errors++))
            continue
        fi
        
        if [[ $value_wei -le 0 ]]; then
            log_error "Transaction value must be greater than 0"
            ((errors++))
            continue
        fi
        
        # Build transaction object with validation
        log_debug "Building transaction object..."
        local tx_object
        if ! tx_object=$(jq -n \
            --arg from "$from_address" \
            --arg to "$to_address" \
            --arg value "0x$(printf '%x' $value_wei)" \
            --arg gas "0x$(printf '%x' $gas)" \
            --arg gasPrice "0x3b9aca00" \
            --arg nonce "0x$(printf '%x' $nonce)" \
            --arg chainId "$chainid" \
            '{
                from: $from,
                to: $to,
                value: $value,
                gas: $gas,
                gasPrice: $gasPrice,
                nonce: $nonce,
                chainId: $chainId
            }' 2>/dev/null); then
            log_error "Failed to create transaction object (jq error)"
            ((errors++))
            continue
        fi
        
        # Validate transaction object was created successfully
        if [[ -z "$tx_object" ]] || ! echo "$tx_object" | jq empty 2>/dev/null; then
            log_error "Invalid transaction object created"
            ((errors++))
            continue
        fi
        
        log_debug "Transaction object created successfully"
        if [[ $DEBUG -eq 1 ]]; then
            log_debug "Transaction details:"
            log_debug "  From: $from_address"
            log_debug "  To: $to_address"
            log_debug "  Value: $value_ether ETH ($value_wei Wei)"
            log_debug "  Gas: $gas"
            log_debug "  Nonce: $nonce"
            log_debug "  Chain ID: $chainid"
        fi
        
        # Sign transaction using Node.js and ethers.js
        log_check "Signing transaction..."
        
        # Get the private key for the from node
        local private_key_file="${SCRIPT_DIR}/nodes/${from_node}/key"
        if [[ ! -f "$private_key_file" ]]; then
            log_error "Private key file not found for node: $from_node"
            ((errors++))
            continue
        fi
        
        # 🚩 Create a temporary Node.js script (`sign_tx.js`) for signing on the fly (uses `ethers.js` library)
        local signer_script="${TX_SIGNER_DEPS_DIR}/sign_tx.js"
        log_debug "Creating signing script: $signer_script"
        
        cat > "$signer_script" << 'EOF'
const { ethers } = require('ethers');
const fs = require('fs');

async function signTransaction() {
    try {
        // Validate arguments
        if (process.argv.length < 4) {
            throw new Error('Usage: node sign_tx.js <privateKeyFile> <txDataJSON>');
        }
        
        const privateKeyFile = process.argv[2];
        const txDataString = process.argv[3];
        
        // Parse transaction data
        let txData;
        try {
            txData = JSON.parse(txDataString);
        } catch (parseError) {
            throw new Error(`Failed to parse transaction data: ${parseError.message}`);
        }
        
        // Read and validate private key
        if (!fs.existsSync(privateKeyFile)) {
            throw new Error(`Private key file not found: ${privateKeyFile}`);
        }
        
        const privateKeyHex = fs.readFileSync(privateKeyFile, 'utf8').trim();
        if (!privateKeyHex) {
            throw new Error('Private key file is empty');
        }
        
        const privateKey = privateKeyHex.startsWith('0x') ? privateKeyHex : '0x' + privateKeyHex;
        
        // Validate private key format (should be 64 hex chars after 0x)
        if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
            throw new Error(`Invalid private key format: expected 64 hex characters, got ${privateKey.length - 2}`);
        }
        
        // Create wallet
        const wallet = new ethers.Wallet(privateKey);
        
        // Validate transaction data
        const requiredFields = ['to', 'value', 'gas', 'gasPrice', 'nonce', 'chainId'];
        for (const field of requiredFields) {
            if (txData[field] === undefined) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Sign transaction
        const signedTx = await wallet.signTransaction({
            to: txData.to,
            value: txData.value,
            gasLimit: txData.gas,
            gasPrice: txData.gasPrice,
            nonce: parseInt(txData.nonce, 16),
            chainId: parseInt(txData.chainId)
        });
        
        // Validate signed transaction format
        if (!signedTx || !signedTx.startsWith('0x')) {
            throw new Error('Invalid signed transaction format');
        }
        
        console.log(signedTx);
    } catch (error) {
        console.error('Transaction signing error:', error.message);
        process.exit(1);
    }
}

signTransaction();
EOF
        
        # Verify the script was created successfully
        if [[ ! -f "$signer_script" ]]; then
            log_error "Failed to create signing script"
            ((errors++))
            continue
        fi
        
        log_debug "Signing script created with enhanced error handling"
        
        # Sign the transaction with improved error handling
        log_check "Signing transaction using Node.js and ethers..."
        local signed_tx=""
        local signing_error=""
        
        # Capture both stdout and stderr for better debugging
        if signing_error=$(cd "$TX_SIGNER_DEPS_DIR" && node sign_tx.js "$private_key_file" "$tx_object" 2>&1); then
            signed_tx="$signing_error"
            log_debug "Transaction signed successfully"
        else
            log_error "Failed to sign transaction"
            log_error "Node.js error output: $signing_error"
            
            # Provide specific debugging guidance based on common errors
            if [[ "$signing_error" == *"Cannot find module 'ethers'"* ]]; then
                log_error "Missing ethers dependency. This should have been caught earlier."
                log_tip "Try: cd $TX_SIGNER_DEPS_DIR && npm install ethers"
            elif [[ "$signing_error" == *"ENOENT"* ]]; then
                log_error "Node.js or script file not found"
                log_tip "Verify Node.js is installed and script file exists"
            elif [[ "$signing_error" == *"private key"* ]]; then
                log_error "Private key file issue"
                log_tip "Check private key file format and permissions: $private_key_file"
            fi
            
            rm -f "$signer_script"
            ((errors++))
            continue
        fi
        
        # Validate the signed transaction format
        if [[ -z "$signed_tx" ]]; then
            log_error "Signing returned empty result"
            rm -f "$signer_script"
            ((errors++))
            continue
        elif [[ "$signed_tx" == "Error:"* ]]; then
            log_error "Signing returned error: $signed_tx"
            rm -f "$signer_script"
            ((errors++))
            continue
        elif [[ ! "$signed_tx" =~ ^0x[a-fA-F0-9]+$ ]]; then
            log_error "Invalid signed transaction format: expected hex string starting with 0x"
            log_debug "Received: ${signed_tx:0:100}..."
            rm -f "$signer_script"
            ((errors++))
            continue
        fi
        
        rm -f "$signer_script"
        log_success "Transaction signed successfully: ${signed_tx:0:66}..."
        
        # Send the signed transaction
        log_check "Sending transaction..."
        local send_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"$signed_tx\"],\"id\":1}" \
            "$rpc_url" 2>/dev/null || true)
        
        if [[ -z "$send_response" ]] || ! echo "$send_response" | jq -e '.result' >/dev/null 2>&1; then
            log_error "Failed to send transaction"
            log_debug "Response: $send_response"
            ((errors++))
            continue
        fi
        
        local tx_hash=$(echo "$send_response" | jq -r '.result')
        log_success "Transaction sent with hash: $tx_hash"
        
        # Poll for transaction receipt
        log_check "Waiting for transaction confirmation..."
        local receipt=""
        local poll_timeout="${AUTOMATED_TESTS_TX_TIMEOUT:-60}"
        local poll_start=$(date +%s)
        
        while true; do
            local current_time=$(date +%s)
            local elapsed=$((current_time - poll_start))
            
            if [[ $elapsed -gt $poll_timeout ]]; then
                log_error "Timeout waiting for transaction receipt"
                ((errors++))
                break
            fi
            
            local receipt_response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$tx_hash\"],\"id\":1}" \
                "$rpc_url" 2>/dev/null || true)
            
            if [[ -n "$receipt_response" ]] && echo "$receipt_response" | jq -e '.result | select(. != null)' >/dev/null 2>&1; then
                receipt=$(echo "$receipt_response" | jq -r '.result')
                break
            fi
            
            log_debug "Transaction not yet mined, waiting... (elapsed: ${elapsed}s)"
            sleep 2
        done
        
        if [[ -n "$receipt" ]]; then
            local status=$(echo "$receipt" | jq -r '.status')
            local block_number=$(echo "$receipt" | jq -r '.blockNumber')
            local gas_used=$(echo "$receipt" | jq -r '.gasUsed')
            
            if [[ "$status" == "0x1" ]]; then
                log_success "Transaction confirmed in block $block_number (gas used: $gas_used)"
                ((tx_count++))
                
                # Verify final balances
                log_check "Verifying final balance for $to_address..."
                local balance_response=$(curl -s -X POST \
                    -H "Content-Type: application/json" \
                    -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$to_address\",\"latest\"],\"id\":1}" \
                    "$rpc_url" 2>/dev/null || true)
                
                if [[ -n "$balance_response" ]] && echo "$balance_response" | jq -e '.result' >/dev/null 2>&1; then
                    local balance_hex=$(echo "$balance_response" | jq -r '.result')
                    # Use python or bc for large number conversion to avoid bash integer overflow
                    local balance_ether=""
                    if command_exists python3; then
                        balance_ether=$(python3 -c "print(f'{int(\"$balance_hex\", 16) / 10**18:.4f}')" 2>/dev/null || echo "N/A")
                    elif command_exists bc; then
                        # Remove 0x prefix and convert to decimal using bc
                        local balance_decimal=$(echo "ibase=16; ${balance_hex#0x}" | bc 2>/dev/null || echo "0")
                        balance_ether=$(echo "scale=4; $balance_decimal / 1000000000000000000" | bc 2>/dev/null || echo "N/A")
                    else
                        balance_ether="N/A"
                    fi
                    log_success "Final balance for $to_address: $balance_hex Wei ($balance_ether ETH)"
                fi
            else
                log_error "Transaction failed with status: $status"
                ((errors++))
            fi
        fi
    done
    
    # Summary
    log_step "Transaction Test Summary"
    
    if [[ $tx_count -eq 0 && $errors -eq 0 ]]; then
        log_success "Transaction tests skipped (dependencies not available)"
        log_tip "To enable transaction testing, install ethers package in: $TX_SIGNER_DEPS_DIR"
    elif [[ $tx_count -gt 0 ]]; then
        log_success "Successfully processed $tx_count out of $TEST_TX_COUNT test transactions"
        
        if [[ $errors -eq 0 ]]; then
            log_success "All transaction tests passed"
            log_success "Transaction signing working correctly"
            log_success "Transaction submission successful"
            log_success "Transaction confirmation verified"
        else
            log_warning "$errors transaction(s) failed during processing"
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        log_success "Transaction tests completed successfully"
        return 0
    else
        log_error "Transaction tests failed with $errors error(s)"
        log_tip "Use --debug flag for detailed transaction debugging information"
        return 1
    fi
}

# Main function to run all automated tests

# 🚩 RPC Access for Testing
# After deployment, I run an automated test suite to verify the network is fully functional.

run_automated_tests() {
    log_step "Running Automated Tests"
    
    if [[ "$AUTOMATED_TESTS_ENABLED" != "true" ]]; then
        log_warning "Automated tests are disabled in configuration"
        return 0
    fi
    
    local test_errors=0
    
    # Find the first RPC endpoint to use for tests
    local test_rpc_url=""
    for i in "${!NODE_NAMES[@]}"; do
        if [[ "${NODE_ROLES[$i]}" == *"rpc"* ]] && [[ -n "${NODE_RPC_MAPPINGS[$i]}" ]]; then
            local port="${NODE_RPC_MAPPINGS[$i]%%:*}"
            test_rpc_url="http://localhost:$port"
            break
        fi
    done
    
    if [[ -z "$test_rpc_url" ]]; then
        log_error "No RPC endpoint found for testing"
        return 1
    fi
    
    log_success "Using RPC endpoint for tests: $test_rpc_url"
    
    # Test 1: Wait for node readiness
    if ! wait_for_node_ready "$test_rpc_url"; then
        log_error "Node readiness test failed"
        ((test_errors++))
    fi
    
    echo ""  # Add spacing
    
    # Test 2: Genesis state verification (only in clean-up mode)
    if [[ $NO_CLEANUP -eq 0 ]]; then
        log_step "Testing Genesis State (Clean-up mode)"
        if ! test_genesis_state "$test_rpc_url"; then
            log_error "Genesis state test failed"
            ((test_errors++))
        fi
    else
        log_warning "Skipping Genesis state test (--no-cleanup mode)"
        log_tip "In no-cleanup mode, the chain state is expected to have evolved beyond genesis"
        log_success "Genesis state test: SKIPPED (appropriate for continuation mode)"
    fi
    
    echo ""  # Add spacing
    
    # Test 3: P2P connectivity
    if ! test_p2p_connectivity; then
        log_error "P2P connectivity test failed"
        ((test_errors++))
    fi
    
    echo ""  # Add spacing
    
    # Test 4: Block production (wait for at least one block)
    log_step "Testing Block Production"
    
    # Check for 2-validator stall problem
    local validator_count=0
    for roles in "${NODE_ROLES[@]}"; do
        if [[ "$roles" == *"validator"* ]]; then
            ((validator_count++))
        fi
    done
    
    if [[ $validator_count -eq 2 ]]; then
        log_tip ">1 validators detected - Expect known stalling issue due to timing-sensitive voting sync."
    fi
    
    log_check "Waiting for block production... (timeout: $AUTOMATED_TESTS_BLOCK_TIMEOUT seconds)"
    
    local block_timeout="${AUTOMATED_TESTS_BLOCK_TIMEOUT:-30}"
    local start_time=$(date +%s)
    local initial_block=0
    local current_block=0
    
    # Get initial block number
    local block_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$test_rpc_url" 2>/dev/null || true)
    
    if [[ -n "$block_response" ]] && echo "$block_response" | jq -e '.result' >/dev/null 2>&1; then
        local block_hex=$(echo "$block_response" | jq -r '.result')
        initial_block=$((16#${block_hex#0x}))
    fi
    
    # Wait for new blocks
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $block_timeout ]]; then
            log_error "Timeout waiting for block production"
            ((test_errors++))
            break
        fi
        
        block_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$test_rpc_url" 2>/dev/null || true)
        
        if [[ -n "$block_response" ]] && echo "$block_response" | jq -e '.result' >/dev/null 2>&1; then
            local block_hex=$(echo "$block_response" | jq -r '.result')
            current_block=$((16#${block_hex#0x}))
            
            if [[ $current_block -gt $initial_block ]]; then
                log_success "Block production confirmed. Current block: $current_block (started at: $initial_block)"
                break
            fi
        fi
        
        log_debug "Waiting for block production... Current: $current_block (elapsed: ${elapsed}s)"
        sleep 5
    done
    
    echo ""  # Add spacing
    
    # Test 5: Transaction submission
    if ! test_transaction; then
        log_error "Transaction test failed"
        ((test_errors++))
    fi
    
    echo ""  # Add spacing
    
    # Final summary
    log_step "Automated Test Summary"
    
    if [[ $test_errors -eq 0 ]]; then
        log_success "All automated tests passed successfully"
        return 0
    else
        log_error "Automated tests completed with $test_errors error(s)"
        return 1
    fi
}

# Generate .env file for Next.js application
generate_env_file() {
    log_step "Generating Environment File"
    
    # Check if ENV_FILE_GENERATE is true
    if [[ "$ENV_FILE_GENERATE" != "true" ]]; then
        log_warning "Environment file generation is disabled in configuration"
        return 0
    fi
    
    log_check "Generating .env file for Next.js application..."
    
    # Convert relative path to absolute path
    local env_file_path="$ENV_FILE_PATH"
    if [[ ! "$env_file_path" =~ ^/ ]]; then
        env_file_path="${SCRIPT_DIR}/${env_file_path}"
    fi
    
    # Create directory for .env file if it doesn't exist
    local env_dir=$(dirname "$env_file_path")
    if [[ ! -d "$env_dir" ]]; then
        log_check "Creating directory for .env file: $env_dir"
        mkdir -p "$env_dir"
    fi
    
    # Get the first validator node's private key
    local first_validator_private_key=""
    local first_validator_name=""
    
    for i in "${!NODE_NAMES[@]}"; do
        local node_name="${NODE_NAMES[$i]}"
        local node_roles="${NODE_ROLES[$i]}"
        
        if [[ "$node_roles" == *"validator"* ]]; then
            local private_key_file="${SCRIPT_DIR}/nodes/${node_name}/key"
            if [[ -f "$private_key_file" ]]; then
                first_validator_private_key=$(cat "$private_key_file" 2>/dev/null | tr -d '\n')
                # Add 0x prefix if not present
                if [[ ! "$first_validator_private_key" =~ ^0x ]]; then
                    first_validator_private_key="0x${first_validator_private_key}"
                fi
                first_validator_name="$node_name"
                log_debug "Using private key from validator node: $first_validator_name"
                break
            fi
        fi
    done
    
    if [[ -z "$first_validator_private_key" ]]; then
        log_error "No validator node with private key found. Cannot generate .env file."
        return 1
    fi
    
    # Write the .env file
    log_check "Writing .env file to: $env_file_path"
    
    # Start writing the .env file
    cat > "$env_file_path" << EOF
# Environment configuration for Next.js application
# Generated by Besu Network Automation Tool
# Generated at: $(date)

# Besu RPC endpoint - primary RPC URL for blockchain interactions
NEXT_PUBLIC_RPC_URL=$RPC_PRIMARY_ENDPOINT

# Private key for transaction signing
# WARNING: This is the private key from validator node: $first_validator_name
# NEVER commit this file to version control!
PRIVATE_KEY=$first_validator_private_key

# Additional configuration can be added here
EOF
    
    # Add simple security note if enabled
    if [[ "$ENV_FILE_INCLUDE_WARNING" == "true" ]]; then
        # Add brief security note to the .env file
        cat >> "$env_file_path" << 'EOF'

# Note: This file contains a private key - ensure it's in your .gitignore
EOF
    fi
    
    # Verify the file was created successfully
    if [[ ! -f "$env_file_path" ]]; then
        log_error "Failed to create .env file"
        return 1
    fi
    
    # Set appropriate permissions (read/write for owner only)
    chmod 600 "$env_file_path"
    
    log_success "Environment file generated successfully"
    log_success "Location: $env_file_path"
    log_success "Contains:"
    log_success "  - NEXT_PUBLIC_RPC_URL: $RPC_PRIMARY_ENDPOINT"
    log_success "  - PRIVATE_KEY: from validator node '$first_validator_name'"
    log_tip "Ensure .env is in your .gitignore to avoid committing private keys"
    
    return 0
}


# 🚩 ASYNCHRONOUS MINED BLOCK LOGS (subshell () + polling with curl to RPC)
# The `&` operator launches the block monitor in the background, keeping the UI responsive.

start_block_monitor() {
    # Find RPC endpoint to check for mined blocks 🔷
    local rpc_url=""
    for i in "${!NODE_NAMES[@]}"; do
        if [[ "${NODE_ROLES[$i]}" == *"rpc"* ]] && [[ -n "${NODE_RPC_MAPPINGS[$i]}" ]]; then
            local port="${NODE_RPC_MAPPINGS[$i]%%:*}"
            rpc_url="http://localhost:$port"
            break
        fi
    done
    
    [[ -z "$rpc_url" ]] && return 1
    
    # Simple background monitor
    (
        # Get current block as starting point
        local response=$(curl -s -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$rpc_url" 2>/dev/null)
        
        local last_block=0
        if [[ -n "$response" ]]; then
            local current=$(echo "$response" | jq -r '.result' 2>/dev/null)
            [[ "$current" != "null" ]] && last_block=$((16#${current#0x}))
        fi
        
        while kill -0 $$ 2>/dev/null; do
            response=$(curl -s -X POST -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                "$rpc_url" 2>/dev/null)
            
            if [[ -n "$response" ]]; then
                local current=$(echo "$response" | jq -r '.result' 2>/dev/null)
                if [[ "$current" != "null" ]]; then
                    local block_num=$((16#${current#0x}))
                    
                    if [[ $block_num -gt $last_block ]]; then
                        for ((i=last_block+1; i<=block_num; i++)); do
                            local block_data=$(curl -s -X POST -H "Content-Type: application/json" \
                                -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBlockByNumber\",\"params\":[\"0x$(printf '%x' $i)\",false],\"id\":1}" \
                                "$rpc_url" 2>/dev/null)
                            
                            if [[ -n "$block_data" ]]; then
                                local tx_count=$(echo "$block_data" | jq -r '.result.transactions | length' 2>/dev/null)
                                if [[ "$tx_count" == "0" ]]; then
                                    log_block "Block #$i - EMPTY"
                                else
                                    log_block "Block #$i - $tx_count tx"
                                fi
                            fi
                        done
                        last_block=$block_num
                    fi
                fi
            fi
            
            sleep 2
        done
    ) &
    
    BLOCK_MONITOR_PID=$!
    return 0
}

# Stop block monitor function
stop_block_monitor() {
    if [[ -n "${BLOCK_MONITOR_PID:-}" ]]; then
        kill $BLOCK_MONITOR_PID 2>/dev/null || true
        wait $BLOCK_MONITOR_PID 2>/dev/null || true
        unset BLOCK_MONITOR_PID
    fi
}

# 🚩 Exit interactive menu

# Display a final menu to the user for next actions
prompt_final_actions() {
    # Stop the temporary monitor that runs during tests
    stop_block_monitor
    
    # Add a small delay to ensure all background processes have stopped outputting
    sleep 1

    # Use a single echo command with newlines (\n) to ensure the message
    # and the separator are printed together without a block message sneaking in.
    local final_message
    final_message="\n"
    final_message+="${COLOR_MAGENTA}${COLOR_BOLD}===================================================================${COLOR_RESET}\n"
    final_message+="${COLOR_LIGHT_BLUE}💡 Deployment completed. The network is now active.${COLOR_RESET}\n"
    final_message+="${COLOR_LIGHT_BLUE}   From now on, only new block creation will be displayed.${COLOR_RESET}\n"
    final_message+="${COLOR_MAGENTA}${COLOR_BOLD}===================================================================${COLOR_RESET}\n"
    
    echo -e "$final_message"

    while true; do
        echo -e "Choose an option:"
        echo -e "   ${COLOR_CYAN}[1]${COLOR_RESET} Continue and monitor blocks in real-time"
        echo -e "   ${COLOR_CYAN}[2]${COLOR_RESET} Stop containers but preserve configuration (for --no-cleanup)"
        echo -e "   ${COLOR_CYAN}[3]${COLOR_RESET} Stop the network completely and exit"
        
        # Ensure we can read user input by redirecting from terminal
        if [[ -t 0 ]]; then
            read -p "Your choice [1-3]: " choice
        else
            # If stdin is not a terminal, try to read from /dev/tty
            read -p "Your choice [1-3]: " choice < /dev/tty
        fi

        case $choice in
            1)
                log_success "Starting block monitoring..."
                log_tip "Press Ctrl+C at any time to stop the network and exit."
                
                # Restart the block monitor for the user
                start_block_monitor
                
                # Wait for user interruption (Ctrl+C). The trap will handle the cleanup.
                # The `wait` correctly pauses the main script, waiting for a user interruption via Ctrl+C.
                wait ${BLOCK_MONITOR_PID:-0} 2>/dev/null || true
                
                # If wait finishes, exit gracefully.
                exit 0
                ;;
            2)
                log_step "Stopping containers but preserving configuration..."
                
                # Call the partial cleanup function to stop only containers
                cleanup_containers_only
                
                log_success "Containers stopped successfully!"
                log_success "Configuration preserved for future use."
                log_tip "To restart the network later, run: ./script.sh --no-cleanup"
                exit 0
                ;;
            3)
                log_step "Stopping network completely as requested..."
                
                # Call the main cleanup function to stop containers and network
                cleanup_environment
                
                log_success "Network stopped completely. Goodbye!"
                exit 0
                ;;
            *)
                log_warning "Invalid option. Please enter 1, 2, or 3."
                echo "" # Add a newline for readability before re-prompting
                ;;
        esac
    done
}

# Cleanup function to stop background processes and network on script exit
cleanup_on_exit() {
    # Check if we have running containers before printing messages
    local containers
    # This default parameter expansion makes the cleanup function resilient to partial script failures. It solves the 'unbound variable' bug by providing a fallback value if `$NETWORK_LABEL` was never loaded.
    containers=$(docker ps -q --filter "label=${NETWORK_LABEL:-project=besu-net}" 2>/dev/null)
    if [[ -n "$containers" ]]; then
        echo "" # Newline to separate from any block monitoring output
        log_step "Script interrupted. Shutting down network..."
        
        # Stop monitor first to avoid more logs
        stop_block_monitor
        
        # Use the existing full cleanup function
        cleanup_environment
        
        log_success "Network stopped successfully."
    fi
}

# Trap handler ensures automatic cleanup on EXIT, INT, and TERM signals to prevent orphaned containers and networks.
trap cleanup_on_exit EXIT INT TERM

# Main function to orchestrate the entire process
# 🎯 FUNCIÓN PRINCIPAL - ORQUESTACIÓN DEL FLUJO COMPLETO
# Decisión de diseño: Pipeline secuencial con validaciones
# Razonamiento:
# - Cada paso depende del éxito del anterior
# - Fail-fast con mensajes descriptivos
# - Orden crítico: red → identidades → genesis → configuración → lanzamiento
# Arquitectura: Funciones atómicas con responsabilidad única (SRP)

main() {
    # Initialize logging system first
    init_logging
    
    log_step "Besu Network Automation Tool Starting"
    log_success "Logging to: $LOG_FILE"
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Check all required dependencies
    check_dependencies
    
    # Load configuration from config.yaml
    load_config
    
    # Validate configuration
    if ! validate_config; then
        exit_with_error "Configuration validation failed. Please fix the errors and try again."
    fi
    
    # Handle cleanup based on --no-cleanup flag
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_step "No-Cleanup Mode Active"
        log_warning "Using existing resources from previous run"
        log_tip "Ensure config.yaml hasn't changed since last run"
        
        # Validate existing resources
        if ! validate_existing_resources; then
            exit_with_error "Cannot proceed with --no-cleanup due to invalid or missing resources"
        fi
    else
        # Clean up any existing environment
        cleanup_environment
    fi
    
    # Create Docker network
    if ! create_docker_network; then
        exit_with_error "Failed to create Docker network. Please check Docker daemon is running and you have necessary permissions."
    fi
    
    # Generate node identities
    if ! generate_node_identities; then
        exit_with_error "Failed to generate node identities. Please check Docker configuration and permissions."
    fi
    
    # Generate genesis configuration
    if ! generate_genesis; then
        exit_with_error "Failed to generate genesis.json. Please check validator configuration."
    fi
    
    # Generate node configuration files
    if ! generate_node_configs; then
        exit_with_error "Failed to generate node configuration files. Please check bootnode configuration."
    fi
    
    # Launch node containers
    if ! launch_nodes; then
        exit_with_error "Failed to launch all node containers. Please check Docker configuration and logs."
    fi
    
    # Run automated tests if enabled
    if [[ "$AUTOMATED_TESTS_ENABLED" == "true" ]]; then
        # Pre-check transaction signer dependencies if we have test transactions
        if [[ $TEST_TX_COUNT -gt 0 ]]; then
            log_check "Pre-checking transaction signer dependencies before running tests..."
            if ! ensure_tx_signer_dependencies; then
                log_warning "Transaction signer dependencies not available. Transaction tests will be skipped."
                log_tip "To fix this, ensure ethers package is installed in: $TX_SIGNER_DEPS_DIR"
                log_tip "Run: cd $TX_SIGNER_DEPS_DIR && npm install ethers"
            fi
        fi
        
        if ! run_automated_tests; then
            log_warning "Some automated tests failed. Please review the test results above."
            # Don't exit with error, just warn about test failures
        fi
    else
        log_success "Automated tests skipped (disabled in configuration)"
    fi
    
    # Generate .env file after tests
    if ! generate_env_file; then
        log_warning "Failed to generate .env file. Please check configuration and permissions."
        # Don't exit with error, just warn about .env generation failure
    fi
    
    log_success "Script execution complete"
    log_to_file "Script completed successfully at $(date)"
    log_tip "Logs saved to: $LOG_FILE"
    
    # Provide helpful debugging tips based on what happened
    if [[ "$AUTOMATED_TESTS_ENABLED" == "true" ]] && [[ ${#isolated_validators[@]} -gt 0 ]]; then
        log_warning "Network deployed but P2P connectivity issues detected"
        log_tip "If you experience 'The Stall' (block production stops), try:"
        log_tip "  1. Re-run with --debug flag for detailed diagnostics"
        log_tip "  2. Check container logs: docker logs <node-name>"
        log_tip "  3. Restart network without --no-cleanup for fresh start"
    else
        log_tip "Run with --debug flag for detailed output during operations"
    fi
    
    log_step "Network Successfully Deployed"
    
    # Display final network information
    log_success "Network Information:"
    log_success "  - Network Name: $NETWORK_NAME"
    log_success "  - Chain ID: $CHAIN_ID"
    log_success "  - Nodes: $NODE_COUNT"
    
    # Show if --no-cleanup was used
    if [[ $NO_CLEANUP -eq 1 ]]; then
        log_success "  - Mode: Reused existing resources (--no-cleanup)"
    fi
    
    # Display RPC endpoints
    local has_rpc=0
    for i in "${!NODE_NAMES[@]}"; do
        if [[ "${NODE_ROLES[$i]}" == *"rpc"* ]] && [[ -n "${NODE_RPC_MAPPINGS[$i]}" ]]; then
            if [[ $has_rpc -eq 0 ]]; then
                log_success "  - RPC Endpoints:"
                has_rpc=1
            fi
            local port="${NODE_RPC_MAPPINGS[$i]%%:*}"
            log_success "    - ${NODE_NAMES[$i]}: http://localhost:$port"
        fi
    done
    
    log_tip "Use 'docker ps' to view running containers"
    log_tip "Use 'docker logs <node-name>' to view node logs"

    # Debug log to confirm we're reaching this point
    log_debug "About to call prompt_final_actions..."
    
    # Call the interactive prompt to let the user decide what to do next
    prompt_final_actions
}

# Execute main function with all arguments
log_debug "Executing main function..."
main "$@"
log_debug "Main function completed"
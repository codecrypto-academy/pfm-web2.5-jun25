# Besu Network Makefile
# Convenience commands for network management

.PHONY: help setup start stop restart status logs test clean reset install

# Default target
help:
	@echo "🔗 Besu Network Manager"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup     - Complete network setup from scratch"
	@echo "  make start     - Start the network"
	@echo "  make stop      - Stop the network gracefully"
	@echo "  make restart   - Restart the network"
	@echo "  make status    - Show network status"
	@echo "  make logs      - Show all container logs"
	@echo "  make test      - Test network connectivity"
	@echo "  make clean     - Stop and clean up containers"
	@echo "  make reset     - Complete network reset (destructive!)"
	@echo "  make install   - Install prerequisites (macOS)"
	@echo ""
	@echo "Configuration:"
	@echo "  Network:  besu-network"
	@echo "  RPC Port: 4200"
	@echo "  Chain ID: 246700"

# Install prerequisites on macOS
install:
	@echo "Installing prerequisites..."
	@command -v brew >/dev/null 2>&1 || { echo "Homebrew is required but not installed. Visit https://brew.sh"; exit 1; }
	@brew install podman node jq curl 2>/dev/null || true
	@yarn install
	@echo "✅ Prerequisites installed"

# Complete setup
setup:
	@./besu-network.sh setup

# Start network
start:
	@./besu-network.sh start

# Stop network
stop:
	@./besu-network.sh stop

# Restart network
restart:
	@./besu-network.sh restart

# Show status
status:
	@./besu-network.sh status

# Show logs
logs:
	@./besu-network.sh logs

# Test connectivity
test:
	@./besu-network.sh test

# Clean containers (non-destructive)
clean:
	@./besu-network.sh stop --force

# Complete reset (destructive)
reset:
	@./besu-network.sh reset

# Development targets
dev-build:
	@yarn build

dev-keys:
	@yarn dev createKeys ./test-keys

dev-enode:
	@yarn dev createKeysAndEnode 127.0.0.1 42007 ./test-enode

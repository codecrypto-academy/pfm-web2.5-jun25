# 🧪 Quick Testing Guide - Besu Network Management API

## 🚀 Quick Start

### Prerequisites
- Development server running on `http://localhost:3000`
- `curl` and `jq` installed for JSON formatting

### Option 1: Run Comprehensive Test Script
```bash
./test-comprehensive.sh
```

### Option 2: Manual Testing Commands

## 📋 Manual Testing Commands

### 1. Check Server Status
```bash
curl -s http://localhost:3000/api/networks | jq .
```

### 2. Create a Test Network
```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "quick-test",
    "chainId": 1337,
    "nodeCount": 3,
    "subnet": "172.30.0.0/24",
    "baseRpcPort": 9000,
    "baseP2pPort": 31000,
    "memoryLimit": "2g"
  }' | jq .
```

### 3. Get Network Details
```bash
curl -s http://localhost:3000/api/networks/quick-test | jq .
```

### 4. List Network Nodes
```bash
curl -s http://localhost:3000/api/networks/quick-test/nodes | jq .
```

### 5. Check Network Status
```bash
curl -s http://localhost:3000/api/networks/quick-test/status | jq .
```

### 6. Add a Custom Node
```bash
curl -X POST http://localhost:3000/api/networks/quick-test/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500,
    "nodeIdPrefix": "api",
    "memoryLimit": "3g"
  }' | jq .
```

### 7. Add an Auto-Assigned Node
```bash
curl -X POST http://localhost:3000/api/networks/quick-test/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "miner"
  }' | jq .
```

### 8. Get Specific Node Details (replace NODE_ID)
```bash
curl -s http://localhost:3000/api/networks/quick-test/nodes/NODE_ID | jq .
```

### 9. Test Port Conflict (should fail)
```bash
curl -X POST http://localhost:3000/api/networks/quick-test/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500
  }' | jq .
```

### 10. Remove a Node (replace NODE_ID)
```bash
curl -X DELETE http://localhost:3000/api/networks/quick-test/nodes/NODE_ID | jq .
```

### 11. Clean Up - Delete Network
```bash
curl -X DELETE http://localhost:3000/api/networks/quick-test | jq .
```

## 🔍 Testing Different Scenarios

### Create Production-Like Network
```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "production-test",
    "chainId": 8881,
    "nodeCount": 5,
    "subnet": "10.0.100.0/24",
    "gateway": "10.0.100.1",
    "baseRpcPort": 8545,
    "baseP2pPort": 30303,
    "bootnodeCount": 2,
    "minerCount": 2,
    "memoryLimit": "4g",
    "cpuLimit": "2.0",
    "besuImage": "hyperledger/besu:latest",
    "labels": {
      "environment": "production",
      "team": "blockchain"
    }
  }' | jq .
```

### Add High-Performance Node
```bash
curl -X POST http://localhost:3000/api/networks/production-test/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "nodeIdPrefix": "hp",
    "memoryLimit": "8g",
    "cpuLimit": "4.0",
    "labels": {
      "performance": "high",
      "purpose": "api-gateway"
    },
    "env": {
      "JAVA_OPTS": "-Xmx6g",
      "BESU_OPTS": "--metrics-enabled=true"
    }
  }' | jq .
```

## 🐳 Docker Commands for Verification

### Check Running Containers
```bash
docker ps | grep besu
```

### Check All Containers (including stopped)
```bash
docker ps -a | grep besu
```

### Check Docker Networks
```bash
docker network ls | grep -E "(quick-test|production-test)"
```

### Check Container Logs (replace CONTAINER_ID)
```bash
docker logs CONTAINER_ID
```

### Inspect Container Details (replace CONTAINER_ID)
```bash
docker inspect CONTAINER_ID | jq .
```

## 🛠️ Troubleshooting

### If Network Creation Fails
1. Check Docker daemon is running: `docker info`
2. Check available ports: `netstat -tuln | grep -E "(8545|9000|30303|31000)"`
3. Check disk space: `df -h`

### If Node Addition Fails
1. Check network exists: `curl -s http://localhost:3000/api/networks/NETWORK_ID`
2. Check port conflicts: Try different ports
3. Check container limits: `docker system df`

### Clean Up Everything
```bash
# Stop all besu containers
docker stop $(docker ps -q --filter ancestor=hyperledger/besu:latest)

# Remove all besu containers
docker rm $(docker ps -aq --filter ancestor=hyperledger/besu:latest)

# Remove test networks
docker network prune -f

# Clean up test data (be careful!)
# sudo rm -rf /tmp/besu-networks
```

## 📊 Expected Results

### Successful Network Creation
```json
{
  "success": true,
  "network": {
    "networkId": "quick-test",
    "chainId": 1337,
    "dockerNetworkId": "...",
    "subnet": "172.30.0.0/24",
    "gateway": "172.30.0.1",
    "containersCreated": 3,
    "nodes": [...]
  }
}
```

### Successful Node Addition
```json
{
  "success": true,
  "node": {
    "id": "api-1704067200000",
    "type": "rpc",
    "ip": "172.30.0.13",
    "rpcPort": 9500,
    "p2pPort": 31500,
    "address": "0x...",
    "enode": "enode://...",
    "containerId": "...",
    "containerName": "..."
  }
}
```

### Error Response (Port Conflict)
```json
{
  "success": false,
  "error": "RPC port 9500 is already in use"
}
```

## 🎯 Testing Tips

1. **Use unique network IDs** to avoid conflicts
2. **Check container status** between operations
3. **Monitor Docker resources** during testing
4. **Test both success and failure scenarios**
5. **Clean up after testing** to avoid resource issues

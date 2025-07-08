# 🧪 Testing Guide - Besu Network Management API

## 🚀 Quick Start

### Prerequisites
- Development server running on `http://localhost:3000`
- Docker daemon running
- `curl` installed for testing

## 📋 Basic Testing Commands

### 1. Check Docker Status
```bash
curl http://localhost:3000/api/docker/status
```

### 2. List Networks
```bash
curl http://localhost:3000/api/networks
```

### 3. Create a Test Network
```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "test-network",
    "chainId": 1337,
    "subnet": "172.20.0.0/24",
    "nodeCount": 3,
    "baseRpcPort": 8545,
    "baseP2pPort": 30303,
    "bootnodeCount": 1,
    "minerCount": 2,
    "besuImage": "hyperledger/besu:latest",
    "memoryLimit": "2g",
    "cpuLimit": "1.0"
  }'
```

### 4. Get Network Details
```bash
curl http://localhost:3000/api/networks/test-network
```

### 5. Get Network Status
```bash
curl http://localhost:3000/api/networks/test-network/status
```

### 6. Add a Miner Node
```bash
curl -X POST http://localhost:3000/api/networks/test-network/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "miner",
    "rpcPort": 8546,
    "p2pPort": 30306,
    "memoryLimit": "1g",
    "cpuLimit": "0.5"
  }'
```

### 7. Add an RPC Node
```bash
curl -X POST http://localhost:3000/api/networks/test-network/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "ip": "172.20.0.15",
    "rpcPort": 8547,
    "p2pPort": 30307,
    "nodeIdPrefix": "custom-rpc"
  }'
```

### 8. List All Nodes
```bash
curl http://localhost:3000/api/networks/test-network/nodes
```

### 9. Get Node Details
```bash
curl http://localhost:3000/api/networks/test-network/nodes/miner-1
```

### 10. Remove a Node
```bash
curl -X DELETE http://localhost:3000/api/networks/test-network/nodes/miner-1
```

### 11. Delete Network
```bash
curl -X DELETE http://localhost:3000/api/networks/test-network
```

## 🎯 Default Configuration

- **Default Subnet:** 172.20.0.0/24
- **Default Node Count:** 2 (1 bootnode + 1 miner)
- **Default Base RPC Port:** 8545
- **Default Base P2P Port:** 30303
- **Node Types:** bootnode (auto-created), miner, rpc
- **Default Docker Image:** hyperledger/besu:latest
- **Default Memory Limit:** 2g per container
- **Default CPU Limit:** 1.0 per container

## 🐳 Docker Verification

### Check Running Containers
```bash
docker ps | grep besu
```

### Check Docker Networks
```bash
docker network ls | grep test-network
```

### Check Container Logs
```bash
docker logs <container-id>
```

## 🛠️ Troubleshooting

### Common Issues
1. **Docker not running:** Check with `docker info`
2. **Port conflicts:** Use different ports in your requests
3. **Network exists:** Use a different networkId

### Clean Up
```bash
# Stop all besu containers
docker stop $(docker ps -q --filter ancestor=hyperledger/besu:latest)

# Remove all besu containers  
docker rm $(docker ps -aq --filter ancestor=hyperledger/besu:latest)

# Remove test networks
docker network prune -f
```

## 📊 Expected Response Format

All endpoints return JSON with this structure:
```json
{
  "success": true,
  "data": { ... },
  "error": "..."  // Only present when success: false
}
```

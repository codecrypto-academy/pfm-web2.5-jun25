export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🚀 Besu Network Manager API</h1>
      <p>REST API for managing Hyperledger Besu networks with Docker</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>📋 Available Endpoints:</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>GET /api/networks</strong> - List all networks</li>
          <li><strong>POST /api/networks</strong> - Create a new network</li>
          <li><strong>GET /api/networks/[id]</strong> - Get network details</li>
          <li><strong>DELETE /api/networks/[id]</strong> - Delete a network</li>
          <li><strong>GET /api/networks/[id]/status</strong> - Get network status</li>
          <li><strong>GET /api/networks/[id]/nodes</strong> - List all nodes in a network</li>
          <li><strong>POST /api/networks/[id]/nodes</strong> - Add a node to network</li>
          <li><strong>GET /api/networks/[id]/nodes/[nodeId]</strong> - Get node details</li>
          <li><strong>DELETE /api/networks/[id]/nodes/[nodeId]</strong> - Remove a node</li>
          <li><strong>GET /api/docker/status</strong> - Check Docker availability</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>🔧 Test with cURL:</h3>
        <pre style={{ fontSize: '0.9rem' }}>
{`# Check Docker status
curl http://localhost:3000/api/docker/status

# List networks
curl http://localhost:3000/api/networks

# Create a network with custom parameters
curl -X POST http://localhost:3000/api/networks \\
  -H "Content-Type: application/json" \\
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

# Get network details
curl http://localhost:3000/api/networks/test-network

# Get network status
curl http://localhost:3000/api/networks/test-network/status

# Add a miner node to the network
curl -X POST http://localhost:3000/api/networks/test-network/nodes \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "miner",
    "rpcPort": 8546,
    "p2pPort": 30306,
    "memoryLimit": "1g",
    "cpuLimit": "0.5"
  }'

# Add an RPC node with custom configuration
curl -X POST http://localhost:3000/api/networks/test-network/nodes \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "rpc",
    "ip": "172.20.0.15",
    "rpcPort": 8547,
    "p2pPort": 30307,
    "nodeIdPrefix": "custom-rpc"
  }'

# List nodes in network
curl http://localhost:3000/api/networks/test-network/nodes

# Get specific node details
curl http://localhost:3000/api/networks/test-network/nodes/miner-1

# Remove a node
curl -X DELETE http://localhost:3000/api/networks/test-network/nodes/miner-1

# Delete the entire network
curl -X DELETE http://localhost:3000/api/networks/test-network`}
        </pre>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>📋 API Information:</h3>
        <ul style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <li><strong>Default Subnet:</strong> 172.20.0.0/24</li>
          <li><strong>Default Node Count:</strong> 2 (1 bootnode + 1 miner)</li>
          <li><strong>Default Base RPC Port:</strong> 8545</li>
          <li><strong>Default Base P2P Port:</strong> 30303</li>
          <li><strong>Node Types:</strong> bootnode (auto-created), miner, rpc</li>
          <li><strong>Default Docker Image:</strong> hyperledger/besu:latest</li>
          <li><strong>Default Memory Limit:</strong> 2g per container</li>
          <li><strong>Default CPU Limit:</strong> 1.0 per container</li>
        </ul>
        
        <h4 style={{ marginTop: '1rem' }}>Response Format:</h4>
        <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>All endpoints return JSON with the following structure:</p>
        <pre style={{ fontSize: '0.8rem', backgroundColor: '#f8f9fa', padding: '0.5rem', borderRadius: '4px' }}>
{`{
  "success": true,
  "data": { ... },     // Varies by endpoint
  "error": "..."       // Present when success: false
}`}
        </pre>
      </div>
    </main>
  )
}

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

# Create a network
curl -X POST http://localhost:3000/api/networks \\
  -H "Content-Type: application/json" \\
  -d '{
    "networkId": "test-network",
    "chainId": 1337,
    "subnet": "172.25.0.0/24"
  }'

# Add a node to the network
curl -X POST http://localhost:3000/api/networks/test-network/nodes \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "validator-1",
    "type": "validator",
    "mining": true,
    "rpcPort": 8546
  }'

# List nodes in network
curl http://localhost:3000/api/networks/test-network/nodes

# Remove a node
curl -X DELETE http://localhost:3000/api/networks/test-network/nodes/validator-1`}
        </pre>
      </div>
    </main>
  )
}

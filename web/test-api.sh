#!/bin/bash

echo "🧪 Testing Simplified Besu Network API"
echo "====================================="

# Test 1: Check if server is running
echo "1. Checking if development server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running"
    echo "Please start the development server with: yarn dev"
    exit 1
fi

# Test 2: List networks (should be empty initially)
echo -e "\n2. Listing existing networks..."
curl -s http://localhost:3000/api/simple-networks | jq . || echo "Raw response: $(curl -s http://localhost:3000/api/simple-networks)"

# Test 3: Create a simple network
echo -e "\n3. Creating a test network..."
curl -X POST http://localhost:3000/api/simple-networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "test-simple-api",
    "chainId": 9999,
    "subnet": "172.29.0.0/24"
  }' | jq . || echo "Raw response: $(curl -s -X POST http://localhost:3000/api/simple-networks -H "Content-Type: application/json" -d '{"networkId": "test-simple-api", "chainId": 9999, "subnet": "172.29.0.0/24"}')"

# Test 4: List networks again
echo -e "\n4. Listing networks after creation..."
curl -s http://localhost:3000/api/simple-networks | jq . || echo "Raw response: $(curl -s http://localhost:3000/api/simple-networks)"

echo -e "\n✅ Test completed!"

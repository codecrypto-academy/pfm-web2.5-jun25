#!/bin/bash

# Script para probar la API de Besu Network

API_BASE="http://localhost:3000/api"

echo "🚀 Probando API de Besu Network..."

# 1. Health check
echo "1. Health check..."
curl -s "$API_BASE/health" | jq '.'
echo ""

# 2. Listar redes (inicialmente vacío)
echo "2. Listando redes existentes..."
curl -s "$API_BASE/networks" | jq '.'
echo ""

# 3. Crear una red de prueba
echo "3. Creando red de prueba..."
curl -s -X POST "$API_BASE/networks" \
  -H "Content-Type: application/json" \
  -d '{
    "networkName": "test-network",
    "subnet": "172.25.0.0/16",
    "nodes": [
      {
        "name": "bootnode",
        "ip": "172.25.0.10",
        "isBootnode": true
      },
      {
        "name": "rpc-node",
        "ip": "172.25.0.11",
        "isRpc": true
      },
      {
        "name": "miner-node",
        "ip": "172.25.0.12",
        "isMiner": true
      }
    ]
  }' | jq '.'
echo ""

# 4. Esperar un momento para que se cree la red
echo "⏳ Esperando que se cree la red..."
sleep 5

# 5. Verificar la red creada
echo "5. Verificando red creada..."
curl -s "$API_BASE/networks/test-network" | jq '.'
echo ""

# 6. Listar redes nuevamente
echo "6. Listando redes después de crear..."
curl -s "$API_BASE/networks" | jq '.'
echo ""

# 7. Obtener logs del bootnode
echo "7. Obteniendo logs del bootnode..."
curl -s "$API_BASE/networks/test-network/nodes/bootnode/logs" | jq '.'
echo ""

# 8. Intentar remover un nodo
echo "8. Removiendo nodo miner..."
curl -s -X DELETE "$API_BASE/networks/test-network/nodes" \
  -H "Content-Type: application/json" \
  -d '{"nodeName": "miner-node"}' | jq '.'
echo ""

# 9. Verificar red después de remover nodo
echo "9. Verificando red después de remover nodo..."
curl -s "$API_BASE/networks/test-network" | jq '.'
echo ""

# 10. Eliminar la red completa
echo "10. Eliminando red completa..."
curl -s -X DELETE "$API_BASE/networks/test-network" | jq '.'
echo ""

# 11. Verificar que la red fue eliminada
echo "11. Verificando que la red fue eliminada..."
curl -s "$API_BASE/networks" | jq '.'
echo ""

echo "✅ Pruebas completadas!"
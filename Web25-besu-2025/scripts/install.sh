#!/bin/bash
# Script de instalación automática para el sistema de gestión de redes Hyperledger Besu

# 1. Instalar dependencias en cada subproyecto
echo "📦 Instalando dependencias en /web..."
cd web
npm install

echo "📦 Instalando dependencias en /web/mcp-server..."
cd mcp-server
npm install

# 2. Configurar MongoDB usando Docker
echo "🐳 Iniciando MongoDB en Docker..."
cd ../../scripts
./besu-ethers-toolkit.js

# 3. Crear archivos de entorno para la web y scripts
echo "📝 Configurando variables de entorno..."
cd ../web
cat > .env.local <<EOF
MONGODB_URI=mongodb://admin:password123@localhost:27017/besuNetworks
MONGODB_DB=besuNetworks
EOF

# Este fichero no es obligatorio, pero permite usar el script de besu-ethers-toolkit.js
cd ../scripts
cat > .env <<EOF
BESU_RPC=http://localhost:PUERTO
PRIVATE_KEY=0xLA_CLAVE_PRIVADA_AQUI
EOF

echo "✅ Instalación completada. Ahora puede iniciar los servicios:"
echo "1. Iniciar MongoDB (si no está corriendo): docker start mongodb-besu"
echo "2. Iniciar el servidor MCP: cd web && npm run start:mcp-server"
echo "3. Iniciar la aplicación web: cd web && npm run dev"
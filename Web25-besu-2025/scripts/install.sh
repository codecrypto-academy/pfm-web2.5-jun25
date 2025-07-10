#!/bin/bash
# Script de instalación automática para el sistema de gestión de redes Hyperledger Besu

# 1. Instalar dependencias en cada subproyecto
echo "📦 Instalando dependencias en /web..."
cd web
npm install --legacy-peer-deps

echo "📦 Instalando dependencias en /web/mcp-server..."
cd mcp-server
npm install --legacy-peer-deps

echo "📦 Instalando dependencias en /scripts..."
cd ../../scripts
npm install

# Este fichero no es obligatorio, pero permite usar el script besu-ethers-toolkit.js
cat > .env <<EOF
BESU_RPC=http://localhost:PUERTO
PRIVATE_KEY=0xLA_CLAVE_PRIVADA_AQUI
EOF

# 2. Configurar MongoDB usando Docker
echo "🐳 Iniciando MongoDB en Docker..."
./mongodb-docker-setup.sh

# 3. Crear archivos de entorno para la web y scripts
echo "📝 Configurando variables de entorno..."
cd ../web
cat > .env.local <<EOF
OPENAI_API_KEY=sk-TU_CLAVE_OPENAI_AQUI
MONGODB_URI=mongodb://admin:password123@localhost:27017/besuNetworks?authSource=admin
MONGODB_DB=besuNetworks
EOF

echo "✅ Instalación completada. Ahora puede iniciar los servicios:"
echo "1. Iniciar MongoDB (si no está corriendo): docker start mongodb-besu"
echo "2. Poner to clave OpenAI en el archivo .env.local"
echo "3. Iniciar el servidor MCP: cd web && npm run start:mcp-server"
echo "4. Iniciar la aplicación web en otro terminal: cd web && npm run dev"

#!/bin/bash
#
# Besu Network Management Script
# Author: Javier Ruiz-Canela López
# Email: jrcanelalopez@gmail.com
# Date: June 28, 2025
# 
# This script was developed with the assistance of GitHub Copilot
# to provide shell utilities for managing Hyperledger Besu networks.
#

# ==============================================================================
# CONFIGURACIÓN DE LA RED BESU
# ==============================================================================

# Red Docker y direcciones IP
NETWORK="172.24.0.0/16"
BOOTNODE_IP="172.24.0.20"
BOOTNODE_KEY_IP="172.24.0.21"
MINER_IP="172.24.0.22"
MINER_KEY_IP="172.24.0.22"

# Puertos de los nodos
RPC_PORT=8545
RPC_PORT_PUBLISHED=8888
MINER_RPC_PORT=8546
MINER_RPC_PORT_PUBLISHED=8889

# Configuración de nodos RPC adicionales
RPC_NODES=(8547 8548)
RPC_IPS=("172.24.0.23" "172.24.0.24")

# ==============================================================================
# CONFIGURACIÓN DE DOCKER
# ==============================================================================

DOCKER_NETWORK_NAME="besu-network"
DOCKER_NETWORK_LABEL="network=besu-network"
DOCKER_NETWORK_TYPE_LABEL="type=besu"
BESU_IMAGE="hyperledger/besu:latest"

# ==============================================================================
# RUTAS Y ARCHIVOS
# ==============================================================================

# Directorios de los nodos
BOOTNODE_DIR="networks/besu-network/bootnode"
MINER_DIR="networks/besu-network/miner"

# Archivos de configuración
GENESIS_FILE="networks/besu-network/genesis.json"
CONFIG_FILE="networks/besu-network/config.toml"
MINER_CONFIG_FILE="networks/besu-network/miner_config.toml"

# Rutas dentro del contenedor Docker
BESU_DATA_PATH="/data/bootnode/data"
MINER_DATA_PATH="/data/miner/data"
BESU_KEY_FILE="/data/bootnode/key.priv"
MINER_KEY_FILE="/data/miner/key.priv"
BESU_GENESIS_FILE="/data/genesis.json"
BESU_CONFIG_FILE="/data/config.toml"
MINER_CONFIG_FILE_DOCKER="/data/miner_config.toml"

# ==============================================================================
# FUNCIONES AUXILIARES
# ==============================================================================

# Función para mostrar mensajes con formato
log_step() {
    echo ""
    echo "=== $1 ==="
}

log_success() {
    echo "✅ $1"
}

log_info() {
    echo "ℹ️  $1"
}

log_warning() {
    echo "⚠️  $1"
}

# Función para verificar dependencias
check_dependencies() {
    log_step "Verificando dependencias"
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker no está instalado. Por favor, instala Docker primero."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js no está instalado. Por favor, instala Node.js primero."
        exit 1
    fi
    
    if [ ! -f "functions.mjs" ]; then
        echo "❌ Archivo functions.mjs no encontrado. Asegúrate de ejecutar desde el directorio correcto."
        exit 1
    fi
    
    log_success "Todas las dependencias están disponibles"
}

# Función para limpiar recursos existentes
cleanup_existing() {
    log_step "Limpiando recursos existentes"
    
    # Detener y eliminar contenedores existentes
    if [ "$(docker ps -aq --filter "label=${DOCKER_NETWORK_LABEL}")" ]; then
        log_info "Eliminando contenedores existentes..."
        docker rm -f $(docker ps -aq --filter "label=${DOCKER_NETWORK_LABEL}") 2>/dev/null || true
    fi
    
    # Eliminar red Docker existente
    if [ "$(docker network ls -q --filter name=${DOCKER_NETWORK_NAME})" ]; then
        log_info "Eliminando red Docker existente..."
        docker network rm ${DOCKER_NETWORK_NAME} 2>/dev/null || true
    fi
    
    # Eliminar directorio de datos existente
    if [ -d "networks" ]; then
        log_info "Eliminando directorio de datos existente..."
        rm -rf networks
    fi
    
    log_success "Limpieza completada"
}

# ==============================================================================
# SCRIPT PRINCIPAL
# ==============================================================================

set -e  # Salir en caso de error

echo "🚀 Iniciando despliegue de red Besu privada"
echo "Autor: Javier Ruiz-Canela López (jrcanelalopez@gmail.com)"
echo "Fecha: $(date)"
echo ""

# Verificar dependencias
check_dependencies

# Limpiar recursos existentes
cleanup_existing


log_step "Paso 1: Crear estructura de directorios"
mkdir -p "networks/besu-network/bootnode"
mkdir -p "networks/besu-network/miner"
for i in "${!RPC_NODES[@]}"; do
  mkdir -p "networks/besu-network/rpc${RPC_NODES[$i]}"
done
log_success "Estructura de directorios creada"

log_step "Paso 2: Crear red Docker"
docker network create ${DOCKER_NETWORK_NAME} \
  --subnet "${NETWORK}" \
  --label "${DOCKER_NETWORK_LABEL}" \
  --label "${DOCKER_NETWORK_TYPE_LABEL}"
log_success "Red Docker '${DOCKER_NETWORK_NAME}' creada con subnet ${NETWORK}"

log_step "Paso 3: Generar claves para el bootnode"
cd "networks/besu-network/bootnode"
node ../../../functions.mjs create-keys "${BOOTNODE_KEY_IP}"
cd ../../..
log_success "Claves del bootnode generadas (clave privada, pública, enode y address)"

log_step "Paso 4: Generar claves para el nodo miner"
cd "networks/besu-network/miner"
node ../../../functions.mjs create-keys "${MINER_KEY_IP}"
cd ../../..
log_success "Claves del nodo miner generadas (clave privada, pública, enode y address)"

# Leer las direcciones generadas
BOOTNODE_ADDRESS=$(cat networks/besu-network/bootnode/address)
MINER_ADDRESS=$(cat networks/besu-network/miner/address)

log_info "Bootnode address: 0x${BOOTNODE_ADDRESS}"
log_info "Miner address: 0x${MINER_ADDRESS}"

log_step "Paso 5: Crear archivos de configuración y lanzar bootnode"

# Crear archivo genesis.json
log_info "Generando archivo genesis.json..."
cat > "networks/besu-network/genesis.json" << EOF
{
  "config": {
    "chainId": 13371337,
    "londonBlock": 0,
    "clique": {
      "blockperiodseconds": 4,
      "epochlength": 30000,
      "createemptyblocks": true
    }
  },
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000${MINER_ADDRESS}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "alloc": {
    "${BOOTNODE_ADDRESS}": {
      "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
    },
    "${MINER_ADDRESS}": {
      "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
    }
  }
}
EOF

# Crear configuración del bootnode
log_info "Generando configuración del bootnode..."
cat > "networks/besu-network/config.toml" << EOF
genesis-file="${BESU_GENESIS_FILE}"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${RPC_PORT}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
sync-mode="FULL"
EOF

# Preparar enode del bootnode con la IP correcta
BOOTNODE_ENODE=$(cat networks/besu-network/bootnode/enode)
BOOTNODE_ENODE=$(echo $BOOTNODE_ENODE | sed "s/${BOOTNODE_KEY_IP}/${BOOTNODE_IP}/")
log_info "Enode del bootnode: ${BOOTNODE_ENODE}"

# Crear configuración del miner
log_info "Generando configuración del miner..."
cat > "networks/besu-network/miner_config.toml" << EOF
genesis-file="${BESU_GENESIS_FILE}"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${MINER_RPC_PORT}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
miner-enabled=true
miner-coinbase="0x${MINER_ADDRESS}"
bootnodes=["${BOOTNODE_ENODE}"]
sync-mode="FULL"
EOF

# Lanzar bootnode
log_info "Lanzando contenedor del bootnode..."
docker run -d \
  --name "besu-network-bootnode" \
  --label nodo=bootnode \
  --label "${DOCKER_NETWORK_LABEL}" \
  --ip "${BOOTNODE_IP}" \
  --network "${DOCKER_NETWORK_NAME}" \
  -p ${RPC_PORT_PUBLISHED}:${RPC_PORT} \
  -v "$(pwd)/networks/${DOCKER_NETWORK_NAME}:/data" \
  "${BESU_IMAGE}" \
  --config-file="${BESU_CONFIG_FILE}" \
  --data-path="${BESU_DATA_PATH}" \
  --node-private-key-file="${BESU_KEY_FILE}" \
  --genesis-file="${BESU_GENESIS_FILE}"

log_success "Bootnode lanzado (puerto externo: ${RPC_PORT_PUBLISHED})"

log_step "Paso 6: Lanzar nodo miner"
log_info "Lanzando contenedor del miner..."
docker run -d \
  --name "besu-network-miner" \
  --label nodo=miner \
  --label "${DOCKER_NETWORK_LABEL}" \
  --ip "${MINER_IP}" \
  --network "${DOCKER_NETWORK_NAME}" \
  -p ${MINER_RPC_PORT_PUBLISHED}:${MINER_RPC_PORT} \
  -v "$(pwd)/networks/${DOCKER_NETWORK_NAME}:/data" \
  "${BESU_IMAGE}" \
  --config-file="${MINER_CONFIG_FILE_DOCKER}" \
  --data-path="${MINER_DATA_PATH}" \
  --node-private-key-file="${MINER_KEY_FILE}" \
  --genesis-file="${BESU_GENESIS_FILE}"

log_success "Nodo miner lanzado (puerto externo: ${MINER_RPC_PORT_PUBLISHED})"

log_step "Paso 7: Crear y lanzar nodos RPC adicionales"
for i in "${!RPC_NODES[@]}"; do
  RPC_PORT_LOCAL=${RPC_NODES[$i]}
  RPC_IP=${RPC_IPS[$i]}
  RPC_DIR="networks/${DOCKER_NETWORK_NAME}/rpc${RPC_PORT_LOCAL}"
  RPC_CONTAINER_NAME="${DOCKER_NETWORK_NAME}-rpc${RPC_PORT_LOCAL}"
  RPC_DATA_PATH="/data/rpc${RPC_PORT_LOCAL}/data"
  RPC_KEY_FILE="/data/rpc${RPC_PORT_LOCAL}/key.priv"
  RPC_CONFIG_FILE="/data/rpc${RPC_PORT_LOCAL}_config.toml"
  
  log_info "Configurando nodo RPC ${RPC_PORT_LOCAL}..."
  
  # Crear clave para el nodo rpc
  cd "${RPC_DIR}"
  node ../../../functions.mjs create-keys "${RPC_IP}"
  cd ../../..
  
  # Crear config para el nodo rpc
  cat > "${RPC_DIR}_config.toml" << EOF
genesis-file="${BESU_GENESIS_FILE}"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${RPC_PORT_LOCAL}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
bootnodes=["${BOOTNODE_ENODE}"]
sync-mode="FULL"
EOF

  # Lanzar nodo rpc
  docker run -d \
    --name "${RPC_CONTAINER_NAME}" \
    --label nodo=rpc \
    --label "${DOCKER_NETWORK_LABEL}" \
    --ip "${RPC_IP}" \
    --network "${DOCKER_NETWORK_NAME}" \
    -p ${RPC_PORT_LOCAL}:${RPC_PORT_LOCAL} \
    -v "$(pwd)/networks/${DOCKER_NETWORK_NAME}:/data" \
    "${BESU_IMAGE}" \
    --config-file="${RPC_CONFIG_FILE}" \
    --data-path="${RPC_DATA_PATH}" \
    --node-private-key-file="${RPC_KEY_FILE}" \
    --genesis-file="${BESU_GENESIS_FILE}"
  
  log_success "Nodo RPC lanzado en puerto ${RPC_PORT_LOCAL} (IP: ${RPC_IP})"
done


log_step "Paso 8: Esperando sincronización de la red"
log_info "Esperando a que los nodos estén listos y sincronizados..."

# Esperar más tiempo para la sincronización
WAIT_TIME=60
for i in $(seq 1 $WAIT_TIME); do
  echo -ne "\rEsperando sincronización... ${i}/${WAIT_TIME} segundos"
  sleep 1
done
echo ""

log_info "Verificando conectividad del bootnode..."
# Verificar que el bootnode responde
MAX_RETRIES=5
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:${RPC_PORT_PUBLISHED} > /dev/null 2>&1; then
    log_success "Bootnode está respondiendo correctamente"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warning "Intento ${RETRY_COUNT}/${MAX_RETRIES}: Bootnode aún no responde, esperando..."
    sleep 5
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  log_warning "Bootnode no responde después de ${MAX_RETRIES} intentos, pero continuando..."
fi

log_step "Paso 9: Transferir fondos desde el mnemonic"
MNEMONIC="test test test test test test test test test test test junk"
AMOUNT="1" # ETH por cuenta
FROM_PRIV_KEY=$(cat networks/besu-network/bootnode/key.priv)

log_info "Mnemonic utilizado: ${MNEMONIC}"
log_info "Cantidad por cuenta: ${AMOUNT} ETH"
log_info "Usando RPC endpoint: http://localhost:${RPC_PORT_PUBLISHED}"

node functions.mjs fund-mnemonic "$FROM_PRIV_KEY" "$MNEMONIC" "$AMOUNT" "http://localhost:${RPC_PORT_PUBLISHED}"

log_success "Fondos transferidos a las 10 primeras cuentas del mnemonic"

# ==============================================================================
# RESUMEN FINAL
# ==============================================================================

echo ""
echo "🎉 ¡Red Besu desplegada exitosamente!"
echo ""
echo "=== INFORMACIÓN DE LA RED ==="
echo "Nombre de la red: ${DOCKER_NETWORK_NAME}"
echo "Subnet: ${NETWORK}"
echo "Chain ID: 13371337"
echo ""
echo "=== NODOS DESPLEGADOS ==="
echo "• Bootnode:"
echo "  - IP interna: ${BOOTNODE_IP}"
echo "  - Puerto RPC externo: ${RPC_PORT_PUBLISHED}"
echo "  - Address: 0x${BOOTNODE_ADDRESS}"
echo ""
echo "• Miner:"
echo "  - IP interna: ${MINER_IP}"
echo "  - Puerto RPC externo: ${MINER_RPC_PORT_PUBLISHED}"
echo "  - Address: 0x${MINER_ADDRESS}"
echo ""
for i in "${!RPC_NODES[@]}"; do
  echo "• Nodo RPC ${RPC_NODES[$i]}:"
  echo "  - IP interna: ${RPC_IPS[$i]}"
  echo "  - Puerto RPC externo: ${RPC_NODES[$i]}"
done
echo ""
echo "=== ENDPOINTS RPC ==="
echo "• Bootnode: http://localhost:${RPC_PORT_PUBLISHED}"
echo "• Miner: http://localhost:${MINER_RPC_PORT_PUBLISHED}"
for port in "${RPC_NODES[@]}"; do
  echo "• RPC ${port}: http://localhost:${port}"
done
echo ""
echo "=== MNEMONIC PARA TESTING ==="
echo "Mnemonic: ${MNEMONIC}"
echo "Derivation path: m/44'/60'/0'/0/X (donde X = 0-9)"
echo "✅ Las primeras 10 cuentas ya tienen ${AMOUNT} ETH cada una"
echo ""
echo "=== COMANDOS ÚTILES ==="
echo "• Ver logs del bootnode: docker logs besu-network-bootnode"
echo "• Ver logs del miner: docker logs besu-network-miner"
echo "• Detener la red: docker rm -f \$(docker ps -aq --filter \"label=${DOCKER_NETWORK_LABEL}\")"
echo "• Eliminar la red: docker network rm ${DOCKER_NETWORK_NAME}"
echo ""
echo "✅ ¡Red lista para usar!"

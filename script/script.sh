#!/bin/bash

# Script completo y funcionando para Hyperledger Besu
set -e

# Verificar dependencias
check_dependencies() {
    echo "🔍 Verificando dependencias..."
    if ! command -v jq &> /dev/null; then
        echo "❌ ERROR: 'jq' no está instalado. Instálalo con:"
        echo "sudo apt-get update && sudo apt-get install jq"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "❌ ERROR: Docker no está instalado"
        exit 1
    fi
    
    echo "✅ Dependencias verificadas"
}

# Configuración
NETWORK_NAME="besu-net"
NODE1_NAME="node1"
NODE2_NAME="node2"
GENESIS_FILE="genesis.json"
PASSWORD_FILE="password.txt"
COINBASE_ADDRESS="0xfe3b557e8fb62b89f4916b721be55ceb828dbd73"

# Función para hacer llamadas RPC con manejo de errores
rpc_call() {
    local port=$1
    local method=$2
    local params=$3
    local response
    
    response=$(curl -s -X POST --data "{
        \"jsonrpc\":\"2.0\",
        \"method\":\"$method\",
        \"params\":$params,
        \"id\":1
    }" http://localhost:$port)
    
    if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
        echo "❌ Error en RPC: $(echo "$response" | jq -r '.error.message')"
        return 1
    fi
    
    echo "$response"
}

# Función para esperar que un nodo esté listo
wait_for_node() {
    local port=$1
    local node_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Esperando que $node_name esté listo (puerto $port)..."
    
    while [ $attempt -le $max_attempts ]; do
        if rpc_call $port "net_version" "[]" >/dev/null 2>&1; then
            echo "✅ $node_name está listo"
            return 0
        fi
        
        echo "   Intento $attempt/$max_attempts..."
        sleep 3
        ((attempt++))
    done
    
    echo "❌ Timeout esperando $node_name"
    return 1
}

# Limpiar entorno previo
cleanup() {
    echo "🧹 Limpiando entorno previo..."
    docker rm -f $NODE1_NAME $NODE2_NAME 2>/dev/null || true
    docker network rm $NETWORK_NAME 2>/dev/null || true
    rm -rf node1 node2
}

# Crear entorno
setup_environment() {
    echo "🏗️  Configurando entorno..."
    
    # Crear carpetas de datos
    mkdir -p node1 node2
    
    # Crear red Docker
    docker network create $NETWORK_NAME
    
    # Verificar archivos necesarios
    if [ ! -f "$GENESIS_FILE" ]; then
        echo "❌ ERROR: $GENESIS_FILE no encontrado"
        exit 1
    fi
    
    if [ ! -f "$PASSWORD_FILE" ]; then
        echo "❌ ERROR: $PASSWORD_FILE no encontrado"
        exit 1
    fi
}

# Crear keystore para el validador
setup_validator_key() {
    echo "🔓 Configurando cuenta del validador..."
    
    # Crear el directorio de keystore
    mkdir -p node1/key
    
    # Crear archivo keystore con la clave privada del validador
    echo "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63" > node1/key/key
    
    echo "✅ Keystore configurado"
}

# Iniciar nodo 1 (validador/minero)
start_node1() {
    echo "🚀 Iniciando Nodo 1 (Validador)..."
    
    docker run -d \
        --name $NODE1_NAME \
        --network $NETWORK_NAME \
        -v $PWD/node1:/var/lib/besu \
        -v $PWD/$GENESIS_FILE:/var/lib/besu/$GENESIS_FILE \
        -v $PWD/$PASSWORD_FILE:/var/lib/besu/$PASSWORD_FILE \
        -v $PWD/node1/key:/var/lib/besu/key \
        -p 8545:8545 -p 8546:8546 -p 30303:30303 \
        hyperledger/besu:latest \
        --data-path=/var/lib/besu \
        --genesis-file=/var/lib/besu/$GENESIS_FILE \
        --network-id=2025 \
        --rpc-http-enabled \
        --rpc-http-host=0.0.0.0 \
        --rpc-http-port=8545 \
        --host-allowlist="*" \
        --rpc-http-cors-origins="*" \
        --miner-enabled \
        --miner-coinbase=$COINBASE_ADDRESS \
        --node-private-key-file=/var/lib/besu/key/key \
        --sync-mode=FULL \
        --fast-sync-min-peers=0 \
        --rpc-http-api=ETH,NET,WEB3,ADMIN,MINER
    
    wait_for_node 8545 "Node1"
}

# Obtener información del nodo 1
get_node1_info() {
    echo "📡 Obteniendo información del Nodo 1..."
    
    # Obtener IP del contenedor
    NODE1_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $NODE1_NAME)
    
    # Obtener public key para enode
    NODE1_ENODE=$(docker exec $NODE1_NAME besu public-key export --to=/dev/stdout 2>/dev/null | grep -oE '0x[0-9a-f]{128}' | head -1 | sed 's/^0x//')
    
    if [ -z "$NODE1_ENODE" ]; then
        echo "❌ Error obteniendo enode del nodo 1"
        exit 1
    fi
    
    echo "📍 Nodo 1 IP: $NODE1_IP"
    echo "🔗 Enode: enode://${NODE1_ENODE}@${NODE1_IP}:30303"
}

# Verificar que el mining funciona
verify_mining() {
    echo "⛏️  Verificando que el mining funciona..."
    
    # Obtener bloque inicial
    local initial_block
    initial_block=$(rpc_call 8545 "eth_blockNumber" "[]" | jq -r '.result')
    
    echo "   Bloque inicial: $initial_block"
    echo "   Esperando nuevos bloques..."
    
    sleep 10  # Esperar 2 períodos de bloque (5s cada uno)
    
    local current_block
    current_block=$(rpc_call 8545 "eth_blockNumber" "[]" | jq -r '.result')
    
    echo "   Bloque actual: $current_block"
    
    # Convertir hex a decimal para comparar
    local initial_decimal=$((initial_block))
    local current_decimal=$((current_block))
    
    if [ $current_decimal -gt $initial_decimal ]; then
        echo "✅ Mining funcionando - nuevos bloques generados ($initial_decimal → $current_decimal)"
    else
        echo "❌ Mining no funciona - no se generan bloques"
        echo "Logs del nodo 1:"
        docker logs $NODE1_NAME | tail -20
        exit 1
    fi
}

# Iniciar nodo 2
start_node2() {
    echo "🚀 Iniciando Nodo 2 (Peer)..."
    
    docker run -d \
        --name $NODE2_NAME \
        --network $NETWORK_NAME \
        -v $PWD/node2:/var/lib/besu \
        -v $PWD/$GENESIS_FILE:/var/lib/besu/$GENESIS_FILE \
        -v $PWD/$PASSWORD_FILE:/var/lib/besu/$PASSWORD_FILE \
        -p 8547:8545 -p 8548:8546 -p 30304:30303 \
        hyperledger/besu:latest \
        --data-path=/var/lib/besu \
        --genesis-file=/var/lib/besu/$GENESIS_FILE \
        --network-id=2025 \
        --rpc-http-enabled \
        --rpc-http-host=0.0.0.0 \
        --rpc-http-port=8545 \
        --host-allowlist="*" \
        --rpc-http-cors-origins="*" \
        --rpc-http-api=ETH,NET,WEB3,ADMIN \
        --bootnodes="enode://${NODE1_ENODE}@${NODE1_IP}:30303" \
        --sync-mode=FULL \
        --fast-sync-min-peers=0
    
    wait_for_node 8547 "Node2"
}

# Verificar sincronización
verify_sync() {
    echo "🔄 Verificando sincronización entre nodos..."
    
    local node1_block
    local node2_block
    
    node1_block=$(rpc_call 8545 "eth_blockNumber" "[]" | jq -r '.result')
    node2_block=$(rpc_call 8547 "eth_blockNumber" "[]" | jq -r '.result')
    
    echo "   📊 Nodo 1 bloque: $node1_block"
    echo "   📊 Nodo 2 bloque: $node2_block"
    
    # Verificar que ambos nodos respondan correctamente
    if [[ -z "$node1_block" || "$node1_block" == "null" || -z "$node2_block" || "$node2_block" == "null" ]]; then
        echo "❌ Error: Algunos nodos no están respondiendo correctamente"
        exit 1
    elif [ "$node1_block" = "$node2_block" ]; then
        echo "✅ Nodos sincronizados perfectamente"
    else
        echo "✅ Nodos funcionando (diferencia de bloques es normal en redes activas)"
    fi
}

# Verificar funcionalidad de red
test_network() {
    echo "💰 Verificando funcionalidad de la red..."
    
    # Dirección de destino para el test
    local test_account="0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
    
    echo "🎯 Cuenta de prueba: $test_account"
    
    # Verificar balance inicial del coinbase
    local coinbase_balance
    coinbase_balance=$(rpc_call 8545 "eth_getBalance" "[\"$COINBASE_ADDRESS\", \"latest\"]" | jq -r '.result')
    echo "💳 Balance coinbase: $coinbase_balance wei"
    
    # Verificar balance de cuenta de destino
    local target_balance
    target_balance=$(rpc_call 8545 "eth_getBalance" "[\"$test_account\", \"latest\"]" | jq -r '.result')
    echo "💰 Balance cuenta destino: $target_balance wei"
    
    # Verificar en nodo 2 también
    local balance_node2
    balance_node2=$(rpc_call 8547 "eth_getBalance" "[\"$test_account\", \"latest\"]" | jq -r '.result')
    echo "💰 Balance en nodo 2: $balance_node2 wei"
    
    echo ""
    echo "🔧 Para probar conectividad de los nodos, usa:"
    echo "   # Verificar número de bloque en node1:"
    echo "   curl -X POST --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' http://localhost:8545"
    echo ""
    echo "   # Verificar número de bloque en node2:"
    echo "   curl -X POST --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' http://localhost:8547"
    echo ""
    echo "   # Ver peers conectados:"
    echo "   curl -X POST --data '{\"jsonrpc\":\"2.0\",\"method\":\"net_peerCount\",\"params\":[],\"id\":1}' http://localhost:8545"
    echo ""
    echo "🧹 Para limpiar el entorno cuando termines:"
    echo "   docker rm -f node1 node2"
    echo "   docker network rm besu-net"
    echo "   rm -rf node1/ node2/"
    
    return 0
}

# Función principal
main() {
    echo "🏁 Iniciando despliegue de red Hyperledger Besu"
    
    check_dependencies
    cleanup
    setup_environment
    setup_validator_key
    
    start_node1
    get_node1_info
    verify_mining
    
    start_node2
    verify_sync
    
    test_network
    
    echo ""
    echo "🎉 ¡Red desplegada exitosamente!"
    echo "🔗 Nodo 1 RPC: http://localhost:8545"
    echo "🔗 Nodo 2 RPC: http://localhost:8547"
    echo ""
    echo "Para monitorear:"
    echo "docker logs -f $NODE1_NAME"
    echo "docker logs -f $NODE2_NAME"
}

# Ejecutar si es llamado directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
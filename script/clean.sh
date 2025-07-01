#!/bin/bash
#
# Script para limpiar completamente la red Besu
# Author: Javier Ruiz-Canela López
# Email: jrcanelalopez@gmail.com
# Date: June 28, 2025
#
# Este script limpia todos los recursos creados por besu.sh
#

set -e

# ==============================================================================
# CONFIGURACIÓN - Debe coincidir con besu.sh
# ==============================================================================

DOCKER_NETWORK_NAME="besu-network"
DOCKER_NETWORK_LABEL="network=besu-network"
DOCKER_NETWORK_TYPE_LABEL="type=besu"

# Directorio donde se almacenan los datos de la red
BESU_NETWORK_DIR="./networks"

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

# ==============================================================================
# PROCESO DE LIMPIEZA
# ==============================================================================

echo "🧹 Iniciando limpieza de la red Besu"
echo "Autor: Javier Ruiz-Canela López (jrcanelalopez@gmail.com)"
echo "Fecha: $(date)"

log_step "Paso 1: Detener y eliminar contenedores de Besu"

# Verificar si existen contenedores con el label de la red
CONTAINERS=$(docker ps -aq --filter "label=${DOCKER_NETWORK_LABEL}" 2>/dev/null || true)

if [ -n "$CONTAINERS" ]; then
    log_info "Encontrados contenedores de la red Besu, eliminando..."
    
    # Mostrar contenedores que se van a eliminar
    echo "Contenedores a eliminar:"
    docker ps -a --filter "label=${DOCKER_NETWORK_LABEL}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
    
    # Detener contenedores primero
    log_info "Deteniendo contenedores..."
    docker stop $CONTAINERS 2>/dev/null || true
    
    # Eliminar contenedores
    log_info "Eliminando contenedores..."
    docker rm -f $CONTAINERS 2>/dev/null || true
    
    log_success "Contenedores eliminados correctamente"
else
    log_info "No se encontraron contenedores de la red Besu"
fi

log_step "Paso 2: Eliminar red Docker"

# Verificar si existe la red Docker
if docker network ls --filter name=${DOCKER_NETWORK_NAME} --format "{{.Name}}" | grep -q "^${DOCKER_NETWORK_NAME}$"; then
    log_info "Eliminando red Docker '${DOCKER_NETWORK_NAME}'..."
    docker network rm ${DOCKER_NETWORK_NAME} 2>/dev/null || true
    log_success "Red Docker eliminada correctamente"
else
    log_info "La red Docker '${DOCKER_NETWORK_NAME}' no existe"
fi

log_step "Paso 3: Eliminar archivos y directorios de datos"

if [ -d "$BESU_NETWORK_DIR" ]; then
    log_info "Eliminando directorio de datos: $BESU_NETWORK_DIR"
    
    # Mostrar contenido antes de eliminar
    echo "Contenido a eliminar:"
    ls -la "$BESU_NETWORK_DIR" 2>/dev/null || true
    
    # Eliminar directorio completo
    rm -rf "$BESU_NETWORK_DIR"
    log_success "Directorio de datos eliminado correctamente"
else
    log_info "El directorio '$BESU_NETWORK_DIR' no existe"
fi

log_step "Paso 4: Limpieza adicional de Docker"

# Limpiar volúmenes huérfanos (opcional)
log_info "Limpiando volúmenes Docker huérfanos..."
docker volume prune -f 2>/dev/null || true

# Limpiar imágenes no utilizadas (opcional, comentado por defecto)
# log_info "Limpiando imágenes Docker no utilizadas..."
# docker image prune -f 2>/dev/null || true

log_success "Limpieza de Docker completada"

log_step "Verificación final"

# Verificar que no queden recursos
REMAINING_CONTAINERS=$(docker ps -aq --filter "label=${DOCKER_NETWORK_LABEL}" 2>/dev/null || true)
REMAINING_NETWORK=$(docker network ls --filter name=${DOCKER_NETWORK_NAME} --format "{{.Name}}" 2>/dev/null || true)

if [ -n "$REMAINING_CONTAINERS" ]; then
    log_warning "Aún quedan contenedores con label de Besu"
    docker ps -a --filter "label=${DOCKER_NETWORK_LABEL}"
else
    log_success "No quedan contenedores de Besu"
fi

if [ -n "$REMAINING_NETWORK" ]; then
    log_warning "La red Docker aún existe: $REMAINING_NETWORK"
else
    log_success "La red Docker fue eliminada correctamente"
fi

if [ -d "$BESU_NETWORK_DIR" ]; then
    log_warning "El directorio de datos aún existe: $BESU_NETWORK_DIR"
else
    log_success "El directorio de datos fue eliminado correctamente"
fi

# ==============================================================================
# RESUMEN FINAL
# ==============================================================================

echo ""
echo "🎉 ¡Limpieza de la red Besu completada!"
echo ""
echo "=== RECURSOS ELIMINADOS ==="
echo "• Contenedores Docker con label: ${DOCKER_NETWORK_LABEL}"
echo "• Red Docker: ${DOCKER_NETWORK_NAME}"
echo "• Directorio de datos: ${BESU_NETWORK_DIR}"
echo "• Volúmenes Docker huérfanos"
echo ""
echo "=== COMANDOS ÚTILES PARA VERIFICACIÓN ==="
echo "• Ver contenedores restantes: docker ps -a"
echo "• Ver redes Docker: docker network ls"
echo "• Ver volúmenes Docker: docker volume ls"
echo ""
echo "✅ ¡Sistema limpio y listo para un nuevo despliegue!"
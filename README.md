# Hyperledger Besu Network Manager

Sistema de gestión automática para redes blockchain privadas basado en Hyperledger Besu con protocolo Clique (Proof of Authority).

Este proyecto implementa una solución completa para la creación y administración de redes blockchain privadas, eliminando la configuración manual y los conflictos de recursos mediante gestión automática de contenedores Docker.

## Descripción Técnica

El sistema proporciona una interfaz web desarrollada en Next.js que permite crear y gestionar redes Hyperledger Besu de forma automática. Utiliza Docker para la containerización de nodos y implementa algoritmos de asignación dinámica para evitar conflictos de puertos, direcciones IP y nombres de recursos.

## Stack Tecnológico

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Node.js, Dockerode API
- **Blockchain**: Hyperledger Besu
- **Protocolo de Consenso**: Clique (Proof of Authority)
- **Containerización**: Docker Engine, Docker Networks
- **Interfaz**: Tailwind CSS

## Requisitos del Sistema

```bash
# Verificar versiones mínimas
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
docker --version  # >= 20.0.0
```

### Configuración de Docker

**El proyecto funciona en múltiples entornos:**

#### Windows (Recomendado)
- **Docker Desktop** ejecutándose en Windows
- Ejecutar la aplicación directamente desde **PowerShell** o **Command Prompt**
- La biblioteca dockerode se conecta automáticamente a Docker Desktop

#### WSL2 (Alternativo)
- Docker Desktop con integración WSL2 habilitada
- Ejecutar la aplicación desde WSL2 Ubuntu/Debian
- Verificar que Docker funciona: `docker ps`

#### Linux/macOS
- Docker Engine instalado y ejecutándose
- Socket Docker disponible en `/var/run/docker.sock`

## Instalación

### Configuración del Entorno

```bash
# Clonar el repositorio
git clone https://github.com/codecrypto-academy/web25-besu-2025.git

# Navegar al directorio del proyecto
cd web25-besu-2025/web

# Instalar dependencias (usar --legacy-peer-deps si hay conflictos)
npm install --legacy-peer-deps

# Iniciar el servidor de desarrollo
npm run dev
```

### Verificación de la Instalación

1. Acceder a `http://localhost:3000` para verificar que la aplicación está funcionando
2. Verificar conexión Docker en `http://localhost:3000/api/networks`

## Guía de Uso

### Interfaz Web

#### Creación de Redes

1. Acceder al dashboard principal
2. Seleccionar "Nueva Red"
3. Introducir nombre identificativo
4. Confirmar creación

El sistema asignará automáticamente una subred única y generará un nombre de red sin conflictos.

#### Despliegue de Nodos

1. Seleccionar red existente
2. Hacer clic en "Añadir Nodo"
3. Especificar tipo de nodo:
   - **Nodo Minero**: Valida transacciones y produce bloques
   - **Nodo RPC**: Proporciona endpoints para aplicaciones externas
4. Confirmar despliegue

La aplicación asignará automáticamente puertos RPC únicos, direcciones IP internas y nombres de contenedor.

### Deployment Mediante Script

Para usuarios que prefieren despliegue via línea de comandos:

```bash
# Navegar al directorio de scripts
cd script/

# Otorgar permisos de ejecución (Linux/macOS/WSL)
chmod +x script.sh

# Ejecutar deployment automático
./script.sh
```

**Nota**: El script bash requiere un entorno Unix (Linux, macOS, WSL). Para Windows nativo, usar la interfaz web.

## Testing de Funcionalidad

### Verificación de Conectividad

```bash
# Comprobar respuesta del nodo (ejemplo con puerto 8545)
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

## Arquitectura del Sistema

### Gestión de Recursos

El sistema implementa los siguientes mecanismos de asignación automática:

- **Puertos RPC**: Rango 8545-8600, asignación secuencial
- **Puertos P2P**: Rango 30303-30400, asignación dinámica
- **Subredes Docker**: Rango 172.20.0.0/16 - 172.50.0.0/16
- **Nombres de Contenedor**: Prefijo tipológico + hash criptográfico

### Protocolo de Consenso

- **Algoritmo**: Clique (Proof of Authority)
- **Tiempo de Bloque**: Aproximadamente 15 segundos
- **Finalidad**: Determinística tras confirmación
- **Network ID**: Único por red desplegada

## Resolución de Problemas

### Docker no se conecta

```bash
# Verificar que Docker está ejecutándose
docker ps

# En Windows: Reiniciar Docker Desktop
# En WSL: sudo service docker start
# En Linux/macOS: sudo systemctl start docker
```

### Conflictos de dependencias NPM

```bash
# Limpiar e instalar con legacy peer deps
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Puertos ocupados

El sistema asigna puertos automáticamente, pero si hay conflictos:

- Verificar puertos ocupados: `netstat -an | findstr :8545` (Windows) o `lsof -i :8545` (Unix)
- El sistema saltará automáticamente a puertos disponibles
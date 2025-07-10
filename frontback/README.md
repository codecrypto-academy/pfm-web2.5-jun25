# Besu Network Manager - Frontend/Backend

Esta aplicación Next.js permite crear y gestionar redes de blockchain Hyperledger Besu usando Docker, con una interfaz web moderna.

## 🚀 Características

- **Creación de redes Besu**: Configuración automática de bootnode, nodo minero y nodos RPC
- **Gestión de nodos**: Agregar y eliminar nodos dinámicamente
- **Configuración automática**: Generación automática de claves, archivos de configuración y genesis.json
- **Interfaz web**: UI moderna y responsive para gestionar la red
- **Docker integration**: Gestión completa de contenedores Docker
- **Consenso Clique PoA**: Configuración automática del consenso Proof of Authority

## 🛠️ Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Verificar Docker**:
   Asegúrate de que Docker Desktop esté instalado y ejecutándose.

3. **Ejecutar la aplicación**:
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador**:
   http://localhost:3000

## 📋 Uso

### Crear una Red

1. Configura los parámetros básicos:
   - **Chain ID**: ID único de la blockchain (ej: 13371337)
   - **Nombre de la Red**: Nombre descriptivo (ej: besu-demo)
   - **Subnet**: Rango de IPs para Docker (ej: 172.25.0.0/16)

2. Haz clic en "Crear Red"

### Agregar Nodos

1. Completa la información del nodo:
   - **Nombre**: Identificador único del nodo
   - **Tipo**: bootnode, miner, o rpc
   - **Puerto**: Puerto P2P (ej: 30303)
   - **RPC Port**: Puerto RPC (solo para nodos RPC, ej: 8545)
   - **IP**: Dirección IP del nodo en la red Docker

2. Haz clic en "Agregar Nodo"

### Gestionar la Red

- **Actualizar Estado**: Ver el estado actual de todos los nodos
- **Eliminar Red**: Detener y eliminar toda la red
- **Probar Creación**: Verificar que la creación de archivos funciona
- **Limpiar Contenedores**: Eliminar todos los contenedores y configuraciones

## 🔧 Configuración Técnica

### Estructura de Archivos

La aplicación crea automáticamente la siguiente estructura:

```
networks/
└── [network-name]/
    ├── genesis.json
    ├── bootnode/
    │   ├── config.toml
    │   ├── key
    │   ├── address
    │   ├── pub
    │   ├── enode
    │   └── data/
    ├── miner-node/
    │   ├── config.toml
    │   ├── key
    │   ├── address
    │   ├── pub
    │   └── data/
    └── rpc-node/
        ├── config.toml
        ├── key
        ├── address
        ├── pub
        └── data/
```

### Configuración de Consenso

La red se configura automáticamente con:
- **Consenso**: Clique Proof of Authority
- **Block Period**: 4 segundos
- **Epoch Length**: 30000 bloques
- **Gas Limit**: 0x1fffffffffffff
- **Difficulty**: 0x1

### Puertos por Defecto

- **Bootnode**: 30303 (P2P)
- **Miner Node**: 30304 (P2P)
- **RPC Node**: 30305 (P2P), 8545 (RPC)

## 🐛 Solución de Problemas

### Error: "No se encuentra el archivo config.toml"

Este problema ha sido solucionado. Los archivos ahora se crean en las ubicaciones correctas:
- `/data/[node-name]/config.toml` dentro del contenedor
- `/data/[node-name]/key` para la clave privada
- `/data/genesis.json` para el archivo genesis

### Error: "Docker no está disponible"

1. Verifica que Docker Desktop esté instalado y ejecutándose
2. Asegúrate de que el usuario tenga permisos para ejecutar Docker
3. En Windows, verifica que WSL2 esté habilitado

### Error: "Puerto ya en uso"

1. Usa el botón "Limpiar Contenedores" para eliminar contenedores anteriores
2. Verifica que no haya otros servicios usando los mismos puertos
3. Cambia los puertos en la configuración

### Verificar Funcionamiento

1. Usa el botón "Probar Creación" para verificar que los archivos se crean correctamente
2. Revisa la consola del navegador para logs detallados
3. Usa `docker ps` en la terminal para ver los contenedores activos

## 🔄 API Endpoints

- `POST /api/network` - Crear red
- `DELETE /api/network` - Eliminar red
- `GET /api/network` - Obtener estado de la red
- `POST /api/node` - Agregar nodo
- `DELETE /api/node` - Eliminar nodo
- `POST /api/test` - Probar creación de archivos
- `POST /api/cleanup` - Limpiar todo

## 📝 Logs

La aplicación genera logs detallados en:
- Consola del navegador (F12 → Console)
- Terminal donde se ejecuta `npm run dev`
- Logs de Docker: `docker logs [container-name]`

## 🚀 Próximas Mejoras

- [ ] Interfaz para configurar parámetros de consenso
- [ ] Visualización de logs en tiempo real
- [ ] Gestión de cuentas y transferencias
- [ ] Métricas de red y nodos
- [ ] Backup y restauración de configuraciones

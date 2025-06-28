# 🚀 Besu Network Setup Script

**Autor:** Javier Ruiz-Canela López  
**Email:** jrcanelalopez@gmail.com  
**Fecha:** 28 de Junio, 2025

_Este script fue desarrollado con la asistencia de GitHub Copilot para proporcionar utilidades shell para la gestión de redes Hyperledger Besu._

---

Este repositorio contiene un script llamado `besu.sh` para desplegar una red privada de Ethereum usando **Hyperledger Besu** con consenso **Clique (Proof of Authority)**.

## 📋 Características de la Red

- **Consenso:** Clique (Proof of Authority)
- **Chain ID:** 13371337
- **Subnet Docker:** 172.24.0.0/16
- **Tiempo de bloque:** 4 segundos
- **Nodos incluidos:**
  - 1 Bootnode (puerto 8888)
  - 1 Miner (puerto 8889)
  - 2 Nodos RPC adicionales (puertos 8547, 8548)

## ⚠️ Requisitos del Sistema

> **Recomendación:**  
> Ejecuta este script en un sistema **Linux** o **macOS** para asegurar la máxima compatibilidad.

### Dependencias Requeridas

1. **Docker** - Para contenedores de los nodos Besu
2. **Node.js** - Para scripts de generación de claves y transferencias
3. **npm** - Para gestión de paquetes

### Instalación de Dependencias Node.js

```bash
npm install elliptic ethers buffer keccak256
```

## 🚀 Uso Rápido

1. **Clonar el repositorio y navegar al directorio:**

   ```bash
   cd script/
   ```

2. **Ejecutar el script de despliegue:**

   ```bash
   chmod +x besu.sh
   ./besu.sh
   ```

3. **Esperar a que se complete el despliegue** (aproximadamente 2-3 minutos)

## 📝 Pasos Detallados del Script

El script realiza los siguientes pasos automáticamente:

### 1. **🧹 Verificación y Limpieza**

- Verifica que Docker y Node.js están instalados
- Limpia cualquier red Besu existente
- Elimina contenedores y redes Docker previos

### 2. **📁 Crear Estructura de Directorios**

- Crea directorios para almacenar los archivos de cada nodo
- Estructura: `networks/besu-network/{bootnode,miner,rpc8547,rpc8548}/`

### 3. **🌐 Crear Red Docker**

- Crea una red Docker privada con subnet `172.24.0.0/16`
- Etiquetas para identificación y gestión

### 4. **🔐 Generar Claves Criptográficas**

- **Bootnode:** Genera clave privada, pública, address y enode
- **Miner:** Genera clave privada, pública, address y enode
- **Nodos RPC:** Generan sus propias claves independientes

### 5. **⚙️ Crear Archivos de Configuración**

- **genesis.json:** Configuración inicial de la blockchain
- **config.toml:** Configuración de cada nodo (bootnode, miner, RPC)
- Pre-financia las cuentas del bootnode y miner

### 6. **🐳 Lanzar Contenedores Docker**

- **Bootnode:** Puerto externo 8888 → interno 8545
- **Miner:** Puerto externo 8889 → interno 8546
- **RPC Nodes:** Puertos externos 8547, 8548

### 7. **⏳ Sincronización**

- Espera 60 segundos para que los nodos se sincronicen
- Verifica conectividad del bootnode

### 8. **💰 Transferir Fondos Iniciales**

- Usa el mnemonic de testing: `test test test test test test test test test test test junk`
- Transfiere **1 ETH** a las primeras 10 cuentas derivadas
- Derivation path: `m/44'/60'/0'/0/X` (donde X = 0-9)

## 🔗 Endpoints de Conexión

Una vez desplegada la red, puedes conectarte a través de:

| Nodo       | Endpoint                | Función                      |
| ---------- | ----------------------- | ---------------------------- |
| Bootnode   | `http://localhost:8888` | Nodo de descubrimiento y RPC |
| Miner      | `http://localhost:8889` | Nodo minero (genera bloques) |
| RPC Node 1 | `http://localhost:8547` | Nodo RPC adicional           |
| RPC Node 2 | `http://localhost:8548` | Nodo RPC adicional           |

## 🧪 Testing y Verificación

### Verificar Número de Bloque

```bash
curl -X POST \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  -H "Content-Type: application/json" \
  http://localhost:8888
```

### Verificar Saldo de Cuenta

```bash
curl -X POST \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "latest"],"id":1}' \
  -H "Content-Type: application/json" \
  http://localhost:8888
```

### Cuentas Pre-financiadas

El script transfiere **1 ETH** a estas cuentas (derivadas del mnemonic):

| Índice | Dirección                                    | Derivation Path    |
| ------ | -------------------------------------------- | ------------------ |
| 0      | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `m/44'/60'/0'/0/0` |
| 1      | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `m/44'/60'/0'/0/1` |
| 2      | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `m/44'/60'/0'/0/2` |
| ...    | ...                                          | ...                |
| 9      | `...`                                        | `m/44'/60'/0'/0/9` |

## 🔧 Configuración de Metamask

1. **Añadir Red Personalizada:**

   - **Nombre:** Besu Local Network
   - **RPC URL:** `http://localhost:8888`
   - **Chain ID:** `13371337`
   - **Símbolo:** `ETH`

2. **Importar Cuenta con Mnemonic:**

   ```
   test test test test test test test test test test test junk
   ```

3. **Verificar Saldos:** Las primeras 10 cuentas deberían tener 1 ETH cada una.

## 🛠️ Gestión de la Red

### Ver Logs de los Nodos

```bash
# Logs del bootnode
docker logs besu-network-bootnode

# Logs del miner
docker logs besu-network-miner

# Logs de nodos RPC
docker logs besu-network-rpc8547
docker logs besu-network-rpc8548
```

### Detener la Red

```bash
# Detener todos los contenedores
docker rm -f $(docker ps -aq --filter "label=network=besu-network")

# Eliminar la red Docker
docker network rm besu-network
```

### Limpiar Completamente

```bash
# Eliminar contenedores, red y archivos
docker rm -f $(docker ps -aq --filter "label=network=besu-network")
docker network rm besu-network
rm -rf networks/
```

## 🐛 Solución de Problemas

### El script falla al crear la red Docker

- **Causa:** Conflicto de subnet
- **Solución:** Cambiar la variable `NETWORK` en el script

### Los nodos no se sincronizan

- **Causa:** Puertos ocupados o firewall
- **Solución:** Verificar que los puertos 8888, 8889, 8547, 8548 estén libres

### Las transferencias fallan

- **Causa:** Nodos no sincronizados
- **Solución:** Esperar más tiempo o reiniciar la red

## 📚 Recursos Adicionales

- [Documentación Hyperledger Besu](https://besu.hyperledger.org/)
- [Clique Consensus](https://github.com/ethereum/EIPs/issues/225)
- [Docker Network Guide](https://docs.docker.com/network/)

---

**¿Problemas?** Abre un issue o contacta: jrcanelalopez@gmail.com

# Hyperledger Besu Network Deployer

Este script (`script.sh`) permite desplegar automáticamente una red privada de Ethereum utilizando **Hyperledger Besu** y **Docker**, con nodos configurados para consenso PoA (Clique) y soporte para múltiples validadores.

---

## 🚀 ¿Qué hace?

- ✅ Limpia redes Docker y carpetas previas (`./besu-network`)
- 🔐 Genera claves y direcciones para:
  - Bootnode
  - Nodo RPC
  - Nodo minero
  - N nodos adicionales
- ⚙️ Crea los archivos `genesis.json`, `config.toml` y `bootnode-config.toml`
- 🐳 Lanza los contenedores Docker:
  - Bootnode
  - Nodo RPC (puerto `1002:8545`)
  - Nodo minero
  - Validadores adicionales
- 💸 Realiza una transacción de prueba entre el nodo minero y el bootnode
- 📡 Espera que el nodo RPC esté disponible y verifica el balance

---

## 🧠 Requisitos

- Docker
- Node.js
- `npm install elliptic ethers keccak256 node-fetch`
- Archivos `.mjs`:
  - `index.mjs` con funciones: `createKeys`, `transfer`, `balance`
  - `createPrivatePublicKeys.mjs` con función: `createKeysAndEnode`

---

## 📦 Instalación de dependencias

```bash
npm install elliptic ethers keccak256 node-fetch
```

---

## 📌 Uso

```bash
chmod +x script.sh
./script.sh [NUM_NODOS_ADICIONALES]
```

Ejemplos:

```bash
./script.sh         # Despliega solo 3 nodos base (bootnode, rpc, miner)
./script.sh 2       # Despliega 3 nodos base + 2 nodos validadores adicionales
```

---

## 📂 Estructura generada

```
besu-network/
├── bootnode/
│   ├── key
│   ├── address
│   ├── enode
├── rpc-node/
├── miner-node/
├── node-1/
├── node-2/
├── genesis.json
├── config.toml
├── bootnode-config.toml
```

---

## 🧪 Prueba de red

El script envía 0.01 ETH desde el nodo minero al bootnode y muestra el balance para verificar conectividad y validez de la red.

---

## ✅ Resultado

Al final verás un resumen como este:

```
=== RED DESPLEGADA EXITOSAMENTE ===
Nodos totales: 5
Nodos base: 3 (bootnode + RPC + miner)
Nodos adicionales: 2
Bootnode: 172.25.0.10
Nodo RPC: 172.25.0.11:1002
Nodo Minero: 172.25.0.12
  - node-1: 172.25.0.13
  - node-2: 172.25.0.14
```

---

## ✨ Recomendaciones

- Usa `docker logs <nombre_nodo>` para revisar los nodos si algo falla.
- Puedes adaptar el script para incluir `logrotate` o persistencia de datos si la red es duradera.
- Considera separar las llaves en otro directorio para más claridad.

---

## 📤 Limpieza

```bash
docker rm -f $(docker ps -aq --filter "label=network=besu-network")
docker network rm besu-network
rm -rf besu-network
```

---

## 📄 Licencia

MIT o la que tú determines.

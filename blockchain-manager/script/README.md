** Script de automatizacion de redes de blockchain con hyperledger besu **

Debemos desarrollar un script que permita crear una red de blockchain con hyperledger besu.

Los pasos son los siguientes:

1. crear un directorio para meter los archivos de la red.
2. crear una docker network para la red.
3. crear una clave privada para el bootnode.
   1. Esta clave sirve para obtener la public key del bootnode.
   2. La public key sirve para obtener el enode
   3. Estos ficheros los meteremos en el directorio bootnode dentro del directorio de la red.
4. Crear una clave privada para el nodo miner.
   1. Esta clave sirve para obtener el address del nodo miner.
   3. Estos ficheros los meteremos en el directorio miner dentro del directorio de la red.
5. crear con docker el bootnode.
   1. Los datos los meteremos en el directorio bootnode/data
6. crear con docker el nodo miner.
   1. Los datos los meteremos en el directorio miner/data
7. crear varios nodos rpc.
   1. Los datos los meteremos en el directorio rpcxxxx/data siendo xxxx el port del nodo.
8. Transferencias.

   1. Usaremos en mnemonic para transferir 
   Mnemonic:          test test test test test test test test test test test junk
   Derivation path:   m/44'/60'/0'/0/0
   2. Transferiremos funds a las 10 primeras cuentas de este mnenomic.
   
9. Comprobacion de las transferencias.
   1. Crearemos en metamask una cuenta con el mnemonic.
   2. Comprobaremos que las 10 primeras cuentas tienen fondos.

## 🚀 Uso de los Scripts

### 1. Crear la Red Blockchain
```bash
# Ejecutar el script principal para crear la red
./script/create-blockchain.sh

### 2. Verificar Estado de la Red
```bash
# Verificar que la red esté funcionando
node script/blockchain-utilities.mjs network-status

# Ver información detallada de la red
node script/blockchain-utilities.mjs network-info
```

### 3. Mostrar Información de Cuentas
```bash
# Mostrar cuentas 0-10 con claves privadas para MetaMask
node script/blockchain-utilities.mjs show-accounts

# Mostrar solo cuentas 1-5
node script/blockchain-utilities.mjs show-accounts 1 5
```

### 4. Realizar Transferencias
```bash
# Transferir 1 ETH a las cuentas 1-10 desde la cuenta 0
node script/blockchain-utilities.mjs transfer-funds

# Transferir 2 ETH a las cuentas 1-5 desde la cuenta 0
node script/blockchain-utilities.mjs transfer-funds 0 1 5 2

# Transferir 0.5 ETH a las cuentas 1-10 desde la cuenta 0
node script/blockchain-utilities.mjs transfer-funds 0 1 10 0.5
```

### 5. Verificar Balances
```bash
# Verificar balance de una cuenta específica
node script/blockchain-utilities.mjs balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

## 📋 Detalles de la Configuración

### Red Blockchain
- **Chain ID**: 20190606
- **Consensus**: Clique PoA
- **Block Time**: 4 segundos
- **Gas Limit**: 0xa00000 (10,485,760)

### Nodos Creados
- **Bootnode**: Puerto 8888
- **Miner**: Puerto 8889  
- **RPC Nodes**: Puertos 8545, 8546, 8547, 8548

### Transferencias
- **Mnemonic**: `test test test test test test test test test test test junk`
- **Derivation Path**: `m/44'/60'/0'/0/0`
- **Fondos por cuenta**: Configurable (por defecto 1 ETH)
- **Cuentas objetivo**: Configurable (por defecto 1-10)

## 🔧 Dependencias Requeridas

### Sistema
- Docker
- Node.js (v14+)
- npm

### Node.js Packages
- ethers (se instala automáticamente)
- elliptic
- keccak256

## ✅ Verificación

### 1. Verificar que la red esté funcionando
```bash
# Verificar contenedores
docker ps --filter "name=besu-network"

# Verificar estado de red
node script/blockchain-utilities.mjs network-status
```

### 2. Verificar transferencias en MetaMask
1. Ejecutar: `node script/blockchain-utilities.mjs show-accounts`
2. Importar cuentas usando las claves privadas mostradas
3. Cambiar a las cuentas 1-10
4. Verificar que cada una tenga los fondos transferidos

### 3. Verificar via comandos
```bash
# Ver balance de cuenta específica
node script/blockchain-utilities.mjs balance 0x[DIRECCION]

# Ver información de red
node script/blockchain-utilities.mjs network-info
```

## 🛠️ Comandos Disponibles

```bash
node script/blockchain-utilities.mjs [comando] [parámetros]

Comandos disponibles:
    create-keys <ip>                    - Create node keys for given IP address
    network-info [url]                  - Get network information (defaults to http://localhost:8545)
    network-status [url]                - Check network health and peer connections
    balance <address>                   - Get balance for address
    transfer <fromPrivate> <to> <amount> - Transfer funds from one account to another
    transfer-funds [source] [start] [end] [amount] - Transfer funds to multiple accounts
    show-accounts [start] [end]         - Show account information for MetaMask import
```

## 🛠️ Solución de Problemas

### Error de APIs inválidos
- El script usa solo APIs básicos compatibles con Besu
- Si hay errores, verificar la versión de Besu

### Error de coinbase
- El script incluye `--miner-coinbase` automáticamente
- Verificar que el archivo de dirección del minero exista

### Error de extraData
- El script genera el extraData correcto (234 caracteres hex)
- Verificar que el genesis.json se genere correctamente

### Problemas de conectividad
- Verificar que los puertos estén disponibles
- Verificar que Docker esté ejecutándose
- Verificar que la red Docker se haya creado correctamente

### Problemas con Node.js
- Verificar que Node.js esté instalado: `node --version`
- Verificar que ethers esté instalado: `npm list ethers`
- Si falta ethers: `npm install ethers`

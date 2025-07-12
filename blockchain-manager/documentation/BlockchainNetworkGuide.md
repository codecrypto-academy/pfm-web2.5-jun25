# Guía de Gestión de Red Blockchain con Hyperledger Besu

Este documento describe dos métodos principales para interactuar y gestionar la red de blockchain con Hyperledger Besu en este repositorio:

1.  **Uso del Script de Shell (`create-blockchain.sh`)**: Un script autónomo que automatiza la creación y gestión de la red con configuraciones predefinidas.
2.  **Uso de la Aplicación/Librería TypeScript (`lib`)**: Una aplicación programática que ofrece un control más granular sobre la red a través de comandos y constantes configurables.

## 🚀 Requisitos Previos Comunes

Asegúrate de tener instalados los siguientes programas en tu sistema antes de usar cualquiera de los métodos:

-   **Docker**: Para la creación y gestión de los nodos de la blockchain.
-   **Node.js** (v14+): Para ejecutar los scripts de automatización (incluye npm, pero usaremos Yarn).
-   **Yarn**: Gestor de paquetes de Node.js.
-   **TypeScript**: Necesario para el método de la librería `lib`.

---

## Método 1: Uso del Script de Shell (`create-blockchain.sh`)

El script `./blockchain-manager/script/create-blockchain.sh` es una solución completa para desplegar una red de Hyperledger Besu. Este script maneja la creación de la red, la generación de claves, la configuración de archivos de génesis y el despliegue de los nodos (bootnode, minero y RPC) utilizando contenedores Docker. Todas las configuraciones (IPs, puertos, nombres de red, etc.) están **hardcodeadas dentro del propio script `create-blockchain.sh`**.

### 1. Crear la Red Blockchain

Para iniciar y configurar la red de blockchain con Hyperledger Besu utilizando este script:

```bash
# Ejecutar el script principal para crear la red
./blockchain-manager/script/create-blockchain.sh
```

Este script realizará lo siguiente:
- Eliminará cualquier red Docker `besu-network` existente y sus contenedores.
- Creará un nuevo directorio `networks/besu-network`.
- Creará una red Docker `besu-network`.
- Generará las claves privadas y públicas para el bootnode y el nodo minero.
- Generará el archivo `genesis.json` con la configuración de Clique PoA.
- Generará el archivo `config.toml` para la configuración de los nodos Besu.
- Creará y arrancará los contenedores Docker para el bootnode, el nodo minero y varios nodos RPC.

### 2. Verificar Estado de la Red (Método 1)

Para asegurar que la red esté funcionando correctamente después de ejecutar `create-blockchain.sh`:

```bash
# Verificar que los contenedores de la red estén funcionando
docker ps --filter "label=network=besu-network"

# Ver información detallada de la red (ejecutar desde el directorio raíz)
node blockchain-manager/script/blockchain-utilities.mjs network-info

# Verificar el estado de la red y las conexiones entre pares
node blockchain-manager/script/blockchain-utilities.mjs network-status
```

#### Validación Automatizada con `test-blockchain.sh`

El script `./blockchain-manager/script/test-blockchain.sh` proporciona una validación completa y automatizada de la red. Este script realiza los siguientes pasos:

-   **Recreación de la Blockchain**: Ejecuta `./create-blockchain.sh` para asegurar un entorno de red limpio y recién creado.
-   **Verificación de Estado de Nodos**: Comprueba que todos los nodos (bootnode, minero y RPC) estén ejecutándose correctamente.
-   **Espera de Sincronización**: Espera 60 segundos para permitir que los nodos de la red se sincronicen.
-   **Verificación de Información de Red**: Utiliza `node blockchain-utilities.mjs network-info` para obtener información general de la red.
-   **Verificación de Estado de Red**: Utiliza `node blockchain-utilities.mjs network-status` para comprobar la salud de la red y las conexiones entre pares.
-   **Verificación de Sincronización de Bloques**: Comprueba el número de bloque en todos los nodos RPC (puertos 8545, 8546, 8547, 8548) para verificar que estén sincronizados.
-   **Obtención de Balance del Minero**: Recupera la dirección y la clave privada del nodo minero y luego verifica su balance inicial.
-   **Transferencia de Fondos Individual**: Crea una nueva dirección y transfiere 80 unidades de la moneda desde la cuenta del minero a esta nueva dirección.
-   **Transferencia a Múltiples Cuentas**: Ejecuta transferencias de fondos a un rango de cuentas predefinidas utilizando diferentes nodos RPC para probar la conectividad.
-   **Verificación de Balances**: Muestra información detallada de las cuentas incluyendo balances actuales usando diferentes nodos RPC.

Para ejecutar esta secuencia de prueba completa:

```bash
./blockchain-manager/script/test-blockchain.sh
```


### 4. Detalles de Configuración (Método 1)

Las configuraciones para la red creada por `create-blockchain.sh` son:

-   **Chain ID**: 20190606
-   **Consensus**: Clique PoA
-   **Block Time**: 4 segundos
-   **Gas Limit**: 0xa00000 (10,485,760)
-   **Bootnode**: Puerto 8888
-   **Miner**: Puerto 8889
-   **RPC Nodes**: Puertos 8545, 8546, 8547, 8548

---

## Método 2: Uso de la Aplicación/Librería TypeScript (`lib`)

El directorio `blockchain-manager/lib` contiene una aplicación TypeScript que proporciona una manera programática de gestionar la red blockchain. Esta librería define las configuraciones clave como **constantes en `blockchain-manager/lib/src/constants.ts`**, lo que permite una mayor flexibilidad y mantenimiento.

### 1. Instalación de Dependencias (`lib`)

Antes de ejecutar cualquier script o comando de la librería, navega al directorio `blockchain-manager/lib` e instala las dependencias de Node.js con Yarn:

```bash
cd blockchain-manager/lib
yarn install
cd ../..
```

### 2. Compilación de los Scripts (`lib`)

Los scripts de la librería están escritos en TypeScript y deben ser compilados antes de usarse:

```bash
cd blockchain-manager/lib
yarn build
cd ../..
```

### 3. Ejecutar la Aplicación Principal (`lib/src/app.ts`)

El archivo `lib/src/app.ts` contiene la lógica para crear y configurar los nodos de la red programáticamente, utilizando las constantes definidas en `constants.ts`. Para ejecutarlo:

```bash
cd blockchain-manager/lib
yarn start
cd ../..
```

### 4. Ejecutar Pruebas de Red End-to-End (`lib/src/test_network.ts`)

El archivo `lib/src/test_network.ts` actúa como una prueba de extremo a extremo para verificar que los nodos creados por la aplicación `lib` funcionan correctamente, incluyendo la verificación de balances y transacciones. Para ejecutarlo:

```bash
cd blockchain-manager/lib
yarn check-blockchain
cd ../..
```

### 5. Detalles de Configuración (Método 2)

Todas las configuraciones importantes para la red gestionada por la librería `lib` se encuentran en `blockchain-manager/lib/src/constants.ts`. Esto incluye:

-   **PROJECT_LABEL**: Etiqueta para proyectos Docker.
-   **CHAIN_ID**: ID de la cadena (ej. 20190606).
-   **NETWORK_NAME**: Nombre de la red Docker (ej. `besu-network`).
-   **NETWORK_SUBNET**: Subred IP para la red Docker.
-   **NETWORK_GATEWAY**: Gateway de la red Docker.
-   **BOOTNODE_IP**: IP del nodo bootnode.
-   **BOOTNODE_PORT**: Puerto RPC del bootnode.
-   **MINERNODE_IP**: IP del nodo minero.
-   **MINERNODE_PORT**: Puerto RPC del nodo minero.
-   **P2P_PORT**: Puerto P2P general.
-   **RPC_PORT**: Puerto RPC general.
-   **RPC_PORT_NODE_LIST**: Lista de puertos para nodos RPC adicionales.

### 6. Comandos Disponibles de la Librería (`lib/package.json`)

Además de `start` y `check-blockchain`, los scripts definidos en `lib/package.json` son:

-   `dev`: Ejecuta `nodemon` para desarrollo con recarga en caliente.
-   `build`: Compila el código TypeScript a JavaScript.
-   `test`: Ejecuta las pruebas unitarias con Jest.
-   `test:coverage`: Ejecuta las pruebas con cobertura de código.

---

## ✅ Verificación General de la Red

Independientemente del método utilizado para crear la red, puedes verificar su estado de la siguiente manera:

### 1. Verificar Contenedores Docker

```bash
docker ps --filter "label=network=besu-network"
```

### 2. Verificar Transferencias en MetaMask

1.  Ejecuta: `node blockchain-manager/script/blockchain-utilities.mjs show-accounts` (si usas `create-blockchain.sh`) o inspecciona los archivos de identidad generados por `lib` para obtener las claves privadas.
2.  Importa las cuentas que desees verificar en MetaMask utilizando las claves privadas.
3.  Cambia a las cuentas de destino (ej. cuentas 1-10) y verifica que cada una tenga los fondos transferidos.

### 3. Verificar Balances y Red Vía Comandos

```bash
# Ver balance de cuenta específica (reemplaza [DIRECCION] con la dirección real)
node blockchain-manager/script/blockchain-utilities.mjs balance 0x[DIRECCION]

# Ver información de red
node blockchain-manager/script/blockchain-utilities.mjs network-info
```

**Nota**: Los comandos `balance` y `network-info` utilizan el `script/blockchain-utilities.mjs` y se conectarán a un nodo RPC (por defecto, el puerto 8545). Asegúrate de que un nodo RPC esté activo y accesible en ese puerto.

---

## 🛠️ Solución de Problemas

-   **Errores de APIs inválidos**: El script y la librería usan solo APIs básicos compatibles con Besu. Si hay errores, verificar la versión de Besu.
-   **Error de coinbase**: El script y la librería incluyen `--miner-coinbase` automáticamente. Verificar que el archivo de dirección del minero exista.
-   **Error de extraData**: El script y la librería generan el extraData correcto (234 caracteres hex). Verificar que el `genesis.json` se genere correctamente.
-   **Problemas de conectividad**: Verificar que los puertos estén disponibles, que Docker esté ejecutándose y que la red Docker se haya creado correctamente.
-   **Problemas con Node.js/Yarn**:
    -   Verificar que Node.js esté instalado: `node --version`.
    -   Verificar que Yarn esté instalado: `yarn --version`.
    -   Asegúrate de haber ejecutado `yarn install` en el directorio `blockchain-manager/lib` si estás usando la librería TypeScript. Si faltan dependencias, `yarn install` debería resolverlo. 
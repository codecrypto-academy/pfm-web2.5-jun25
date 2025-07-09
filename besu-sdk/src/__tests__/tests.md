PRINCIPLES

+ I want the 1st test to be super easy—an incredibly basic, no-arguments, zero-advanced-features script. It should be a lame, absurdly simple, beginner-level script that still covers end-to-end elements, but in the most straightforward and obvious way possible.
+ Design the test suite to be extensive, well-organized, and clearly segmented by type of operation, purpose, and dependencies. Each test group should have a distinct scope and minimal overlap, ensuring clarity in intent and maintenance.
+ Yet, structure the tests to maximize the use of deployed networks and active nodes. Since initializing full networks can be time-consuming, tests should be grouped and ordered in a way that avoids redundant network setups and minimizes idle time during execution.

# Análisis y Ideas de Pruebas para el Besu SDK

## Visión General de la Arquitectura

El SDK está diseñado para orquestar redes Besu en Docker. Se compone de:
*   **Capas de Alto Nivel (Core):** `NetworkBuilder`, `Network`, `BesuNode`. Representan la lógica de negocio principal y la orquestación.
*   **Capas de Servicio (Services):** `DockerManager`, `FileManager`, `SystemValidator`. Abstraen interacciones con el sistema (Docker, disco, sistema operativo).
*   **Utilidades (Utils):** `key-generator`, `logger`. Funciones auxiliares genéricas.
*   **Soporte:** `types`, `errors`, `validators`. Definiciones y reglas.

La clave para las pruebas es entender estas capas. Las funciones de "plomería" (plumbing) suelen ser más adecuadas para pruebas de integración, mientras que la "lógica de negocio" pura y las utilidades son ideales para pruebas unitarias.

---

## 1. `index.ts` (Punto de Entrada, Configuración por Defecto, `createTestNetwork`)

### Función-Nivel Lógico:
*   **`createTestNetwork(validatorCount, rpcNodeCount)`:**
    *   **¿Qué hace?** Es una función de conveniencia que encapsula el uso del `NetworkBuilder` para crear una red de prueba con un número específico de validadores y nodos RPC, usando configuraciones por defecto.
    *   **¿Es pura?** **NO**. Tiene efectos secundarios masivos: construye y arranca una red completa, lo que implica interactuar con Docker, escribir en disco, generar claves, etc.
    *   **¿Se puede testear en aislamiento?** **NO directamente.** Requiere una configuración de entorno (Docker disponible) y mocks extensos si se quiere unit-testear la función en sí, pero su propósito real es ser una prueba de integración de alto nivel.
    *   **Idea de Test (Enfoque integración):**
        *   Llamar a `createTestNetwork(1, 1)` y verificar que la red se inicia, el `status` es `RUNNING`, hay 1 validador y 1 nodo RPC, y que el proveedor de `ethers.js` es funcional (ej. `getBlockNumber()`).
        *   Probar con diferentes combinaciones de `validatorCount` y `rpcNodeCount` (ej. `(3, 0)`, `(0, 1)` - este último debería fallar al validar la red).
        *   Verificar que los puertos RPC asignados (`DEFAULTS.rpcPort + i`) son los esperados y únicos.

### Lógica de Negocio vs. Plomería:
*   Principalmente **Plomería y Orquestación**. Actúa como una "receta" predefinida que conecta el `NetworkBuilder` y sus métodos para formar una red.

### Edge Cases & Assumptions:
*   **`validatorCount = 0`:** El `NetworkBuilder` (y `validators/config.ts`) debería lanzar un error porque una red Clique requiere al menos un validador.
*   **Colisiones de IP:** `172.20.0.10 + i` podría generar colisiones si `validatorCount` + `rpcNodeCount` es muy alto o si se usa `createTestNetwork` varias veces sin limpiar. Aunque la validación de IP duplicada está en el `NetworkBuilder`, es bueno verificarlo aquí.
*   **Recursos del sistema:** Se asume que Docker está disponible y hay suficientes recursos (memoria, disco). `SystemValidator` se encarga de esto, pero la función podría colapsar si las verificaciones previas fallan.

### Configurabilidad y Flags:
*   Comportamiento impulsado por `validatorCount`, `rpcNodeCount`.
*   Utiliza `DEFAULTS` para `blockPeriod`, `subnet`, `rpcPort`.
    *   **Test idea:** Asegurarse de que `DEFAULTS` se aplican correctamente cuando no se anulan explícitamente en el `NetworkBuilder` por el usuario.

### Side Effects:
*   **Logs:** Extensos logs de `INFO`, `SUCCESS`, `DEBUG` de todo el proceso de setup de la red.
*   **Write to disk:** Creación de directorios (`./besu-networks/test-network-timestamp`), `genesis.json`, y archivos de claves (`key`, `key.pub`, `address`) para cada nodo.
*   **Docker interaction:** Creación de red Docker, pull de imagen Besu, creación y arranque de contenedores Docker.
*   **Emit events:** La clase `Network` que se construye emitirá eventos de cambio de estado y nuevos bloques.

---

## 2. `core/NetworkBuilder.ts`

### Función-Nivel Lógico:

#### Métodos de Configuración (`withChainId`, `withBlockPeriod`, `withNetworkName`, `withSubnet`, `addValidator`, `addNode`, `addRpcNode`, `withDataDirectory`):
*   **¿Qué hacen?** Modifican el estado interno (`this.state`) del `NetworkBuilder` con las opciones proporcionadas por el usuario. Realizan validaciones básicas de formato y unicidad *en el momento*.
*   **¿Son puros?** **NO**. Modifican el estado del objeto.
*   **¿Se pueden testear en aislamiento?** **SÍ**. Son perfectos para pruebas unitarias, verificando que los valores se guardan correctamente y que las validaciones lanzan los errores esperados.
*   **Ideas de Test (Inputs → Outputs / Errores):**
    *   **`withChainId(chainId: number)`:**
        *   Input: `1337`, Output: `state.chainId = 1337`.
        *   Input: `0`, `-1`, `1.5`, `NaN`, Output: `ConfigurationValidationError` (mensaje específico).
    *   **`withBlockPeriod(seconds: number)`:**
        *   Input: `5`, Output: `state.blockPeriodSeconds = 5`.
        *   Input: `0`, `-5`, `2.5`, Output: `ConfigurationValidationError`.
    *   **`withNetworkName(name: string)`:**
        *   Input: `'my-besu-net'`, Output: `state.networkName = 'my-besu-net'`.
        *   Input: `''`, `'123name'`, `'name with spaces'`, `'name@symbol'`, Output: `ConfigurationValidationError` (regex).
        *   Input: `'a'.repeat(65)` (longitud), Output: `ConfigurationValidationError`.
    *   **`withSubnet(subnet: string)`:**
        *   Input: `'172.20.0.0/16'`, Output: `state.subnet = '172.20.0.0/16'`.
        *   Input: `'192.168.1.0'`, `'not-a-subnet'`, `'1.1.1.1/33'`, Output: `ConfigurationValidationError` (CIDR, rango de prefijo).
        *   Input: `'8.8.8.0/24'` (IP pública), Output: `ConfigurationValidationError` (rango privado).
    *   **`addValidator(name, ip, options?)`, `addNode(name, ip, options?)`, `addRpcNode(name, ip, port?, options?)`:**
        *   Inputs válidos: Añade el nodo a `state.nodes` con `validator: true/false`, `rpc: true/false`, `rpcPort`, `identitySeed`, `initialBalance`.
        *   Input: Nombre duplicado (`addValidator('node1', ...)` luego `addNode('node1', ...) `), Output: `ConfigurationValidationError` (`Node name must be unique`).
        *   Input: IP duplicada, Output: `ConfigurationValidationError` (`IP address must be unique`).
        *   Input: Nombre inválido (ej. `''`, `'-node'`), Output: `ConfigurationValidationError`.
        *   Input: IP inválida (ej. `'not-an-ip'`, `'256.1.1.1'`), Output: `ConfigurationValidationError`.
        *   **IPs problemáticas específicas:**
            *   **Dirección de red/broadcast:** Para subnet `172.20.0.0/24`, probar `172.20.0.0` y `172.20.0.255`. Validación debe atraparlas.
            *   **IP fuera del subnet:** `172.20.0.10` en una red `172.21.0.0/16`. Validación debe fallar.
            *   **IP del gateway:** `172.20.0.1` (normalmente reservada para gateway). ¿Se permite o se advierte?
        *   `addNode` con `rpcPort` pero `rpc` `false`/`undefined`: Debe lanzar un error (esta validación se hace en `validators/config.ts` pero el `Builder` podría hacerla antes o el `addNode` podría ya setear `rpc:true` si se da `rpcPort`).
        *   `rpcPort`: `0`, `70000`, `65536`, `1.5`, Output: `ConfigurationValidationError` (`Must be an integer between 1 and 65535`).
        *   **Puerto 0 o 65536 (fuera de rango):** Validación debe atrapar estos casos límite.
        *   **Puertos privilegiados (`80`, `443`):** Verificar que se emite advertencia. Si Docker lo permite, ¿funciona? Si no se tienen permisos, ¿falla Docker y el SDK lo reporta correctamente?
        *   **Puertos comunes (`22` SSH, `8080` proxy/web, `5432` Postgres):** Verificar advertencias de conflicto potencial.
        *   `initialBalance`: Validar formatos como `"100"`, `"1.5"`, `"0.001"`. Probar también formatos inválidos como `"abc"`, `"-10"`.
    *   **`withDataDirectory(dir: string)`:**
        *   Input: `'./custom-data'`, Output: `state.baseDataDir = './custom-data'`.

#### Métodos de Control (`build`, `clone`, `reset`, `getConfig`):
*   **`build(autoStart = true)`:**
    *   **¿Qué hace?** Finaliza la configuración, realiza validaciones finales (como "al menos un validador"), llama a `SystemValidator`, interactúa con `DockerManager` y `FileManager` para verificar y preparar el entorno, y finalmente instancia y (opcionalmente) arranca la `Network`.
    *   **¿Es pura?** **NO**. Tiene efectos secundarios masivos: interactúa con Docker, el sistema de archivos, y puede iniciar la red.
    *   **¿Se puede testear en aislamiento?** **SÍ, pero con mocks.** `DockerManager`, `FileManager`, `SystemValidator` deben ser mockeados para unit-testear la lógica de `build` (ej. que las validaciones se llamen, que el `Network` se instancie con la configuración correcta). Las pruebas de integración no mockearían estos servicios.
    *   **Ideas de Test (Enfoque Unitario con Mocks):**
        *   Happy Path: Configuración completa y válida. Verificar que se llama a `validateNetworkConfig`, `SystemValidator.checkPrerequisites`, `dockerManager.createNetwork`/`adoptNetwork`, y que retorna una instancia de `Network`.
        *   Validaciones Faltantes: `build()` sin `chainId`, `blockPeriodSeconds`, `subnet`, `nodes`. Debe lanzar `ConfigurationValidationError` específico para cada campo faltante.
        *   `nodes` sin validadores: Debe lanzar `ConfigurationValidationError` (`At least one node must be configured as a validator`).
        *   **Un solo Nodo No-Validador:** Intentar crear una red con solo un nodo `addNode()` (no `addValidator()`). Debe fallar validación.
        *   **`validateChainIdUnique`:**
            *   **Test idea (ChainId duplicado entre redes distintas):** Mockear `FileManager.exists` para que devuelva `true` para `baseDataDir`, `FileManager.listDirectories` para devolver nombres de redes existentes, y `FileManager.readJSON` para devolver `network.json` de esas redes. Asegurarse de que si una red existente tiene el mismo `chainId`, se lanza `ChainIdConflictError`.
            *   Testear que no lanza error si el `chainId` es único.
            *   Testear que ignora metadatos corruptos (ej. `readJSON` lanza `FileSystemError` o `JSON.parse` falla).
        *   **`getExistingSubnets`:**
            *   Mockear `dockerManager.getClient().listNetworks()` para devolver diferentes configuraciones de redes Docker (con/sin IPAM, con múltiples IPs, etc.). Verificar que solo se extraen los subnets con formato CIDR correctamente.
            *   **Test idea (Subnet duplicado):** Mockear `getExistingSubnets` para que devuelva un `subnet` que ya existe (`'172.20.0.0/16'`) y verificar que `build()` lanza `SubnetConflictError`.
        *   **`autoStart` argument:**
            *   Llamar `build(false)`: Verificar que el `Network` retornado tiene `status = NetworkStatus.UNINITIALIZED` y que `network.setup()` *no* fue llamado.
            *   Llamar `build()` (o `build(true)`): Verificar que el `Network` retornado tiene `status = NetworkStatus.RUNNING` y que `network.setup()` *fue* llamado.

*   **`clone()`:**
    *   **¿Qué hace?** Crea una nueva instancia de `BesuNetworkBuilder` con una copia profunda del estado actual, permitiendo ramificar configuraciones.
    *   **¿Es pura?** **Relativamente**. No modifica el estado actual, pero crea un nuevo objeto.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Clonar un builder configurado. Modificar el clon (ej. `addNode`). Verificar que el builder original *no* se modificó.
        *   Verificar que la configuración inicial del clon es idéntica a la del original.
*   **`reset()`:**
    *   **¿Qué hace?** Restablece el estado del builder a su configuración inicial vacía.
    *   **¿Es pura?** **NO**. Modifica el estado del objeto.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Configurar un builder, llamar a `reset()`, y verificar que `getConfig()` devuelve un objeto vacío (o con `nodes: []`).
*   **`getConfig()`:**
    *   **¿Qué hace?** Devuelve una copia parcial del estado de configuración actual del builder.
    *   **¿Es pura?** **SÍ**.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Verificar que `getConfig()` refleja con precisión los valores establecidos por los métodos `withX` y `addX`.

### Lógica de Negocio vs. Plomería:
*   **Lógica de Negocio:**
    *   `addXNode` (validación de unicidad de nombre/IP).
    *   `validateChainIdUnique` (regla de negocio crítica para evitar conflictos entre redes).
    *   `getExistingSubnets` (soporte para una regla de negocio que evita conflictos de subred).
    *   Parte de `build` (la validación final y la decisión de cómo proceder con Docker, si la red existe o no).
*   **Plomería/Orquestación:**
    *   Los métodos `withX` (simplemente establecen valores).
    *   `build` (llamadas a servicios externos como `SystemValidator`, `DockerManager`, `FileManager`).

### Edge Cases & Assumptions:
*   **Docker Daemon inactivo:** `build` asumirá que `SystemValidator.checkPrerequisites` lo detecta y lanza `DockerNotAvailableError`.
*   **`networkName` no especificado:** `getNetworkName` generará uno por defecto.
    *   **Test idea:** Construir una red sin `withNetworkName` y verificar que el nombre es generado correctamente (`besu-network-timestamp`).
*   **`subnet` no especificado al crear una red nueva:** `build` debería lanzar `ConfigurationValidationError`.
    *   **Test idea:** Llamar `builder.withChainId(..).addValidator(..).build()` sin `withSubnet()` ni `withNetworkName()` (así se fuerza creación de una red nueva), y verificar que falla.
*   **`baseDataDir`:** Si es nulo/indefinido, se usa por defecto `./besu-networks`. Si el directorio no existe, `FileManager` debería crearlo.
*   **Nodos sin `rpcPort`:** Si `rpc` es `true` pero `rpcPort` no se especifica, debe usarse el valor por defecto de Besu (8545). Esta es una asunción que se maneja dentro de `BesuNode` y `validators/config.ts`.

### Configurabilidad y Flags:
*   **`autoStart` en `build`:** Ya cubierto.
*   **`identitySeed` en `addNode`/`addValidator`:**
    *   **Test idea:** Añadir nodos con el mismo `identitySeed` y verificar que tienen las mismas claves y direcciones. Añadir con diferentes seeds y verificar que son diferentes.
    *   **Test idea:** Asegurarse de que `generateDeterministicIdentity` advierte sobre su uso en producción.

### Side Effects:
*   **Logs:** `info`, `warn`, `debug` (ej. cuando se genera el nombre de la red, o durante `validateChainIdUnique`).
*   **Interaction with external services:** `build` es el principal punto donde se interactúa con `DockerManager`, `FileManager`, `SystemValidator`.

---

## 3. `core/Network.ts`

### Función-Nivel Lógico:

#### Métodos de Lectura (`getStatus`, `getConfig`, `getDockerNetworkName`, `getDataDirectory`, `getNodes`, `getNode`, `getValidators`, `getRpcNode`, `getProvider`):
*   **¿Qué hacen?** Proporcionan acceso al estado y configuración de la red.
*   **¿Son puros?** **SÍ** (si se ignora la creación de nuevos objetos `Map` o `Provider` que envuelven el estado).
*   **¿Se pueden testear en aislamiento?** **SÍ**.
*   **Ideas de Test:**
    *   Después de `setup()`, verificar que todos los getters devuelven la información correcta y actualizada.
    *   `getNode(name)`: Devolver el nodo correcto; lanzar `NodeNotFoundError` si el nodo no existe.
    *   `getRpcNode()`: Devolver el primer nodo RPC; devolver `null` si no hay nodos RPC.
    *   `getProvider()`: Devolver un `ethers.JsonRpcProvider` si hay un nodo RPC; `null` si no.

#### Métodos de Orquestación y Mutación (`setup`, `addNode`, `removeNode`, `teardown`):
*   **`setup()`:**
    *   **¿Qué hace?** El proceso completo de inicialización de la red: crea estructura de directorios, network Docker, genesis, genera claves, arranca nodos.
    *   **¿Es pura?** **NO**. Altamente side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **NO**, es el corazón de la integración. Requiere un entorno Docker.
    *   **Ideas de Test (Enfoque Integración):**
        *   Happy Path: Llamar a `setup()`. Verificar `status = RUNNING`. Verificar que todos los nodos están `RUNNING`. Verificar que se puede obtener un `provider` y hacer una llamada (`getBlockNumber`).
        *   Fallo en la creación de Docker network: Simular un fallo en `dockerManager.createNetwork`. Verificar `status = ERROR` y que se intenta un `teardown` de limpieza.
        *   Fallo en `generateGenesis`: Simular un error. Verificar `status = ERROR` y limpieza.
        *   Fallo al iniciar un nodo: Simular un fallo en `node.start()`. Verificar `status = ERROR` y limpieza.
        *   **`createNetworkStructure`:** Integración con `FileManager`. Verificar que los directorios (`besu-networks/my-net`, `nodes/node1`, etc.) existen después del setup.
        *   **`generateGenesis`:** Verificar que el `genesis.json` generado es válido para Clique, contiene los validadores correctos en `extraData`, y las `alloc` con los balances correctos (por defecto y especificados).

*   **`addNode(options: NodeOptions)`:**
    *   **¿Qué hace?** Añade un nuevo nodo a una red `RUNNING`. Genera su identidad, lo arranca, lo financia (si `initialBalance` se especifica) y actualiza los metadatos.
    *   **¿Es pura?** **NO**. Altamente side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager`, `FileManager`, `key-generator`, `ethers.js` (`provider`, `wallet`).
    *   **Ideas de Test:**
        *   Solo si la red está `RUNNING`: Lanzar `InvalidNetworkStateError` si no lo está.
        *   Validar `NodeOptions` (nombre, IP, etc.) con `validateNodeOptions`.
        *   **Duplicación de nombre/IP:** Lanzar `DuplicateNodeNameError` o `IPAddressConflictError`.
        *   **IP fuera de la subred:** Lanzar `ConfigurationValidationError` (delegado a `validateNodeIp`).
        *   Happy Path: Añadir un nodo básico. Verificar que el nodo se añade a `this.nodes`, se arranca y está `RUNNING`.
        *   Añadir un nodo RPC: Verificar que el RPC es accesible.
        *   Añadir un validador: Verificar que se añade a `this.validators` y que participa en la red.
        *   **Financiamiento de nodos:**
            *   **Test idea:** Añadir un nodo con `initialBalance: "100"`. Mockear `provider.getBlockNumber` y `funderWallet.sendTransaction`. Verificar que `sendTransaction` es llamado con el `to` y `value` correctos.
            *   **Test idea:** Si no hay nodos RPC o fundadores, verificar que se loggea una advertencia y el nodo se añade pero sin financiación.
            *   **Test idea:** `initialBalance` con formato inválido (`"abc"`). Verificar que loggea una advertencia y usa el balance por defecto.

*   **`removeNode(nodeName: string)`:**
    *   **¿Qué hace?** Detiene, remueve y elimina un nodo de la red.
    *   **¿Es pura?** **NO**. Side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `BesuNode` (para `stop`, `remove`, `getStatus`) y `FileManager`.
    *   **Ideas de Test:**
        *   Solo si la red está `RUNNING`: Lanzar `InvalidNetworkStateError` si no lo está.
        *   Lanzar `NodeNotFoundError` si el nodo no existe.
        *   **`LastValidatorRemovalError`:** Si es el último validador (`getValidators().length === 1`), lanzar este error.
        *   Happy Path: Detener y remover un nodo. Verificar que se elimina de `this.nodes` y `this.validators`.

*   **`teardown(removeData = false)`:**
    *   **¿Qué hace?** Detiene toda la red, remueve contenedores y la red Docker. Opcionalmente, elimina los datos en disco.
    *   **¿Es pura?** **NO**. Masivamente side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **NO**, es una prueba de integración de alto nivel.
    *   **Ideas de Test (Enfoque Integración):**
        *   Happy Path: `status = RUNNING` a `STOPPED`. Todos los nodos se detienen y remueven. La red Docker se elimina.
        *   `removeData = true`: Verificar que `fileManager.removeDirectory` es llamado en `this.dataDir`.
        *   Manejo de errores: Si un nodo no se detiene/remueve correctamente, verificar que se loggea el error pero el `teardown` continúa con los demás recursos.
        *   `stopBlockMonitoring()`: Verificar que los listeners del proveedor se limpian.

#### Métodos Auxiliares/Internos (`generateGenesis`, `createAndStartNode`, `startBlockMonitoring`, `stopBlockMonitoring`, `saveNetworkMetadata`, `logNetworkInfo`, `validateState`, `setStatus`, `validateChainIdUnique`):
*   **`generateGenesis()`:**
    *   **¿Qué hace?** Crea el archivo `genesis.json` con la configuración de la red y las identidades/balances iniciales de los nodos.
    *   **¿Es pura?** **NO**. Escribe en disco.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `FileManager` y `key-generator`.
    *   **Ideas de Test:**
        *   Verificar que `writeNodeKeys` se llama para cada nodo.
        *   Validar la estructura del `genesis.json` (contenido de `extradata`, `alloc` con balances correctos).
        *   **Balances iniciales:** Verificar que el balance se convierte correctamente a hexadecimal (`ethers.parseEther`). Probar números enteros, decimales, y muy grandes. Asegurarse de que el balance por defecto se usa si `initialBalance` no está presente o es inválido.
*   **`createAndStartNode()`:**
    *   **¿Qué hace?** Instancia un `BesuNode`, le inyecta las dependencias, lo añade a `this.nodes` y lo arranca.
    *   **¿Es pura?** **NO**. Side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `FileManager`, `DockerManager`, `BesuNode` constructor y `start` method.
    *   **Ideas de Test:**
        *   Verificar que `BesuNode` se instancia con los parámetros correctos (config, identity, managers, paths, bootnodes).
        *   Verificar que `node.start()` es llamado.
        *   Verificar que el nodo se añade a `this.nodes` y `this.validators` (si es validador).
        *   **Bootnodes:** Asegurarse de que los `enodeUrls` de los validadores ya en ejecución son pasados como `bootnodes` al nuevo nodo.
*   **`startBlockMonitoring()`, `stopBlockMonitoring()`:**
    *   **¿Qué hace?** Configura/desconfigura un listener de bloques usando `ethers.js` para emitir eventos `new-block`.
    *   **¿Es pura?** **NO**. Interactúa con `ethers.js` provider y emite eventos.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `getProvider` y el `provider` de `ethers.js` (para simular la emisión de `block`).
    *   **Ideas de Test:**
        *   `startBlockMonitoring()`: Verificar que `provider.on('block', ...)` es llamado.
        *   `stopBlockMonitoring()`: Verificar que `provider.removeAllListeners()` es llamado.
        *   Simular un nuevo bloque: Verificar que el evento `new-block` se emite con los datos correctos del bloque.
*   **`saveNetworkMetadata()`:**
    *   **¿Qué hace?** Guarda la información de la red en `network.json` para persistencia y recuperación.
    *   **¿Es pura?** **NO**. Escribe en disco.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `FileManager`.
    *   **Ideas de Test:**
        *   Verificar que el `network.json` generado contiene los campos correctos (`name`, `chainId`, `nodes` con `containerId`, `address`, `ip`, `isValidator`).
*   **`logNetworkInfo()`:**
    *   **¿Qué hace?** Loggea un resumen de la configuración de la red.
    *   **¿Es pura?** **NO**. Loggea a consola.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `logger`.
    *   **Ideas de Test:**
        *   Verificar que la salida de log contiene toda la información relevante de la red.
*   **`validateState()`:**
    *   **¿Qué hace?** Lanza un `InvalidNetworkStateError` si la red no está en uno de los estados permitidos.
    *   **¿Es pura?** **SÍ**.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Llamar con estados permitidos y no lanzar error.
        *   Llamar con estados no permitidos y lanzar `InvalidNetworkStateError` con mensaje correcto.
*   **`setStatus()`:**
    *   **¿Qué hace?** Actualiza el estado interno de la red y emite un evento `status-change`.
    *   **¿Es pura?** **NO**. Modifica estado y emite eventos.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Verificar que el estado interno se actualiza.
        *   Verificar que el evento `status-change` se emite con `from`, `to` y `timestamp` correctos.

### Lógica de Negocio vs. Plomería:
*   **Lógica de Negocio Central:** `setup`, `addNode`, `removeNode`, `teardown`. Estos son los métodos que definen el comportamiento de alto nivel del SDK.
*   **Lógica de Configuración/Generación:** `generateGenesis`, `createAndStartNode`. Contienen la lógica específica de Besu para inicializar nodos.
*   **Plomería/Utilidades:** `getters`, `validateState`, `setStatus`, `logNetworkInfo`, `saveNetworkMetadata`.

### Edge Cases & Assumptions:
*   **Red sin nodos RPC:** `getRpcNode()` y `getProvider()` devuelven `null`. `startBlockMonitoring()` se salta.
*   **Fallo al obtener `enodeUrl` de un validador:** `createAndStartNode` maneja este `warn` al obtener `bootnodes`.
*   **Corrupción de `network.json`:** `validateChainIdUnique` lo maneja loggeando una advertencia y continuando (asumiendo que es una validación secundaria).
*   **Recursos bajos:** Se asume que `SystemValidator` ya ha alertado o fallado.
*   **Múltiples llamadas a `setup()` / `teardown()`:** `validateState` lo previene.
*   **Transacción de financiación de nodo falla:** `addNode` lo loggea pero no falla la adición del nodo.
    *   **Test idea:** Simular que `funderWallet.sendTransaction` o `tx.wait` falla durante `addNode`. Verificar que se loggea el error y el nodo se añade de todos modos (pero con balance 0).

### Configurabilidad y Flags:
*   **`NetworkConfig` object:** Es el principal impulsor de la configuración (chainId, blockPeriod, network name/subnet, nodes array).
*   **`NodeOptions` en `addNode`:** Permite personalizar nodos al añadirlos dinámicamente.
*   `baseDataDir` en el constructor del `Network` (viene del `NetworkBuilder`).

### Side Effects:
*   **Logs:** Amplio uso de `logger` en todos los niveles.
*   **Write to disk:** `generateGenesis`, `createAndStartNode` (para claves), `saveNetworkMetadata`.
*   **Emit events:** `status-change`, `node-added`, `node-removed`, `new-block`.
*   **Modify internal state:** `status`, `nodes`, `validators`.
*   **Docker interaction:** Crea/manipula redes y contenedores.
*   **Network activity:** `getProvider` y sus interacciones (`getBlockNumber`, `sendTransaction`).

---

## 4. `core/BesuNode.ts`

### Función-Nivel Lógico:

#### Métodos de Lectura (`getStatus`, `getConfig`, `getIdentity`, `getAddress`, `getName`, `isValidator`, `getRpcUrl`, `getWsUrl`, `getRpcProvider`, `getWsProvider`, `getWallet`, `getContainerId`):
*   **¿Qué hacen?** Acceso a la configuración, estado e identidad del nodo, y herramientas de interacción (providers, wallet).
*   **¿Son puros?** **SÍ**.
*   **¿Se pueden testear en aislamiento?** **SÍ**.
*   **Ideas de Test:**
    *   Instanciar `BesuNode` con una `NodeConfig` y `NodeIdentity` mock.
    *   Verificar que todos los getters devuelven los valores correctos basados en la configuración inicial y el estado mockeado del contenedor.
    *   `getRpcProvider()`/`getWsProvider()`: Devuelven `null` si RPC no está habilitado; devuelven un `provider` si sí.
    *   `getWallet()`: Devuelve una instancia de `ethers.Wallet` con la clave privada correcta.

#### Métodos de Control (`start`, `stop`, `remove`, `getLogs`, `getEnodeUrl`):
*   **`start()`:**
    *   **¿Qué hace?** Crea (si no existe) y arranca el contenedor Docker del nodo. Espera a que el nodo esté listo.
    *   **¿Es pura?** **NO**. Masivamente side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager` (todos sus métodos como `createContainer`, `startContainer`, `executeSystemCommand`, `getContainerState`).
    *   **Ideas de Test:**
        *   **Validación de estado:** Lanzar `InvalidNodeStateError` si el nodo ya está `RUNNING` o en `ERROR`.
        *   Happy Path: Verificar que `createContainer` (si `container` es `null`), `startContainer`, y `waitForNodeReady` son llamados en secuencia.
        *   Manejo de errores: Si `startContainer` o `waitForNodeReady` fallan, el estado debe ir a `ERROR`.
*   **`stop()`:**
    *   **¿Qué hace?** Detiene el contenedor Docker.
    *   **¿Es pura?** **NO**. Side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager`.
    *   **Ideas de Test:**
        *   **Validación de estado:** Lanzar `InvalidNodeStateError` si el nodo no está `RUNNING`.
        *   Happy Path: Verificar que `dockerManager.stopContainer` es llamado.
        *   Manejo de errores: Si `stopContainer` falla, el estado debe ir a `ERROR`.
*   **`remove()`:**
    *   **¿Qué hace?** Elimina el contenedor Docker.
    *   **¿Es pura?** **NO**. Side-effect-heavy.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager`.
    *   **Ideas de Test:**
        *   Happy Path: Verificar que `dockerManager.removeContainer` es llamado y `this.container` se setea a `null`.
        *   Manejo de errores: Si `removeContainer` falla.
*   **`getLogs(tail = 100)`:**
    *   **¿Qué hace?** Recupera los logs del contenedor Docker.
    *   **¿Es pura?** **NO**. Interactúa con Docker.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager`.
    *   **Ideas de Test:**
        *   Verificar que `dockerManager.getContainerLogs` es llamado con los parámetros correctos.
        *   Lanzar error si `container` es `null`.
*   **`getEnodeUrl()`:**
    *   **¿Qué hace?** Ejecuta un comando Besu dentro del contenedor para obtener la clave pública y construye el `enodeUrl`.
    *   **¿Es pura?** **NO**. Interactúa con Docker.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager`.
    *   **Ideas de Test:**
        *   **Validación de estado:** Lanzar `InvalidNodeStateError` si el nodo no está `RUNNING`.
        *   Happy Path: Mockear `executeSystemCommand` para devolver una clave pública. Verificar que el `enodeUrl` se construye correctamente (`enode://pubkey@ip:30303`).
        *   Manejo de errores: Si `executeSystemCommand` falla o devuelve una cadena vacía.

#### Métodos de Construcción Interna (`createContainer`, `buildEnvironment`, `buildVolumes`, `waitForNodeReady`, `setStatus`):
*   **`createContainer()`:**
    *   **¿Qué hace?** Construye las `ContainerOptions` de Docker y llama a `dockerManager.createContainer`.
    *   **¿Es pura?** **NO**. Interactúa con Docker.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `DockerManager`.
    *   **Ideas de Test:**
        *   Verificar que las `ContainerOptions` generadas son correctas para diferentes configuraciones de nodos (validador, RPC, sin RPC).
        *   Asegurarse de que `pullImageIfNeeded` se llama.
*   **`buildEnvironment()`:**
    *   **¿Qué hace?** Construye el array de variables de entorno para el contenedor Besu.
    *   **¿Es pura?** **SÍ**.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Verificar que las variables de entorno básicas de Besu están siempre presentes.
        *   Verificar que las variables de entorno RPC solo se añaden si `config.rpc` es `true`.
        *   Verificar que `bootnodes` se añade correctamente si está presente.
*   **`buildVolumes()`:**
    *   **¿Qué hace?** Construye el array de mapeos de volumen para el contenedor Docker.
    *   **¿Es pura?** **SÍ**.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Verificar que los volúmenes para `/data` y `genesis.json` se mapean correctamente.
*   **`waitForNodeReady()`:**
    *   **¿Qué hace?** Sondea el estado del nodo (vía RPC o estado del contenedor) hasta que está listo o se agota el tiempo.
    *   **¿Es pura?** **NO**. Sondea un sistema externo.
    *   **¿Se puede testear en aislamiento?** **SÍ, con mocks** para `getRpcProvider` (simulando que el RPC responde o no) y `dockerManager.getContainerState`.
    *   **Ideas de Test:**
        *   **RPC Node:** Mockear `provider.getBlockNumber` para que inicialmente falle y luego tenga éxito. Verificar que resuelve.
        *   **Non-RPC Node:** Mockear `getContainerState` para que devuelva un estado `running` después de varios intentos. Verificar que resuelve.
        *   Timeout: Mockear el sondeo para que nunca tenga éxito. Verificar que lanza un error de timeout.
*   **`setStatus()`:**
    *   **¿Qué hace?** Actualiza el estado interno del nodo y emite un evento `status-change`.
    *   **¿Es pura?** **NO**. Modifica estado y emite eventos.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Verificar que el estado interno se actualiza.
        *   Verificar que el evento `status-change` se emite con `from`, `to` y `timestamp` correctos.

### Lógica de Negocio vs. Plomería:
*   **Lógica de Negocio:** `start` (incluyendo `waitForNodeReady`), `getEnodeUrl`. Estos métodos aplican reglas de negocio sobre cómo se comporta un nodo Besu.
*   **Plomería/Orquestación:** `stop`, `remove`, `getLogs`, `createContainer`. Estos son envoltorios directos sobre la API de Docker.
*   **Configuración Específica de Besu:** `buildEnvironment`, `buildVolumes`.

### Edge Cases & Assumptions:
*   **`genesisPath` / `dataPath` / `nodePath`:** Se asume que los directorios y archivos de claves existen gracias a `FileManager` y `Network`.
*   **`bootnodes`:** Se asume que los `enodeUrl` de los bootnodes son correctos.
*   **`rpcPort`:** Si no se especifica y `rpc` es `true`, `buildEnvironment` usa el puerto por defecto de Besu (8545).
*   **`getEnodeUrl`:** Asume que el comando `besu public-key export` existe y devuelve una clave pública válida.
*   **Tiempo de espera:** `waitForNodeReady` tiene un timeout fijo (30s). Para redes muy grandes o máquinas lentas, esto podría ser un problema. No es un *problema* del código, sino un parámetro a considerar.

### Configurabilidad y Flags:
*   El objeto `config` del constructor es el principal punto de configuración.
*   `bootnodes` array.

### Side Effects:
*   **Logs:** `debug`, `info`, `success`, `error`.
*   **Docker interaction:** Crea/arranca/detiene/elimina contenedores, ejecuta comandos, obtiene logs.
*   **Modify internal state:** `status`, `container`.
*   **Emit events:** `status-change`.

---

## 5. `services/DockerManager.ts`

### Función-Nivel Lógico:

#### Métodos de Control de Recursos Docker (`createNetwork`, `adoptNetwork`, `removeNetwork`, `networkExists`, `pullImageIfNeeded`, `createContainer`, `startContainer`, `stopContainer`, `removeContainer`, `getContainerState`, `waitForContainerState`, `getContainerLogs`, `executeSystemCommand`, `listContainers`, `listNetworks`, `removeContainers`, `removeAllNetworks`, `cleanupAll`):
*   **¿Qué hacen?** Interactúan directamente con la API de Docker vía `dockerode` para gestionar redes, imágenes y contenedores.
*   **¿Son puros?** **NO**. Todos interactúan con un sistema externo (Docker daemon).
*   **¿Se pueden testear en aislamiento?** **SÍ, pero solo con mocks.** No se pueden ejecutar "en aislamiento" sin Docker. Se mockearía el objeto `Docker` y los métodos de `dockerode`.
*   **Ideas de Test (Unitario con Mocks para `dockerode`):**
    *   **`createNetwork(name, subnet)`:**
        *   Happy Path: Verificar que `docker.createNetwork` es llamado con los parámetros `Name`, `Driver`, `CheckDuplicate`, `IPAM`, `Labels` correctos.
        *   **`NetworkAlreadyExistsError`:** Mockear `networkExists` para devolver `true`. Verificar que lanza `NetworkAlreadyExistsError`.
        *   Manejo de errores: Mockear `createNetwork` de `dockerode` para lanzar un error. Verificar que `DockerOperationError` es lanzado.
    *   **`adoptNetwork(networkName)`:**
        *   Happy Path: Mockear `docker.getNetwork().inspect()` para devolver información válida de red (con IPAM, Subnet, Gateway). Verificar que devuelve el objeto y la configuración correcta.
        *   **`NetworkNotFoundError`:** Mockear `getNetwork().inspect()` para lanzar un error con `statusCode=404`.
        *   **`DockerOperationError`:** Mockear `getNetwork().inspect()` para lanzar otro tipo de error.
        *   Network sin IPAM: Mockear `inspect()` para que `IPAM` sea `null` o `Config` vacío.
    *   **`removeNetwork(network)`:**
        *   Happy Path: Verificar que `removeContainers` y luego `network.remove()` son llamados.
        *   Ignorar 404: Mockear `network.remove()` para lanzar error con `statusCode=404`. Verificar que no lanza error.
    *   **`networkExists(name)`:** Mockear `docker.listNetworks` para devolver listas con/sin el nombre de red.
    *   **`pullImageIfNeeded(imageName)`:**
        *   Imagen existe: Mockear `docker.getImage().inspect()` para que tenga éxito. Verificar que `docker.pull` *no* es llamado.
        *   Imagen no existe: Mockear `docker.getImage().inspect()` para que falle, y `docker.pull` para que tenga éxito.
        *   Fallo al pull: Mockear `docker.pull` para que falle. Verificar que lanza `BesuImageNotFoundError`.
    *   **`createContainer(options)`:**
        *   Happy Path: Verificar que `docker.createContainer` es llamado con las opciones correctas (`name`, `Image`, `Env`, `HostConfig` (Binds, NetworkMode, RestartPolicy, Memory, CpuShares, LogConfig), `NetworkingConfig`, `Labels`).
        *   Port Bindings: Verificar que los `PortBindings` se configuran correctamente si `options.ports` existe.
        *   Manejo de errores: Lanzar `DockerOperationError`.
    *   **`startContainer(container)`:** Happy Path, `DockerOperationError`.
    *   **`stopContainer(container, timeout)`:** Happy Path, ignore 304, `DockerOperationError`.
    *   **`removeContainer(container, force)`:** Happy Path, ignore 404, `DockerOperationError`.
    *   **`getContainerState(container)`:** Mockear `container.inspect()` para devolver diferentes estados Docker.
    *   **`waitForContainerState(container, desiredState, timeout)`:**
        *   Happy Path: Mockear `getContainerState` para que el estado deseado se alcance antes del timeout.
        *   Timeout: Mockear `getContainerState` para que nunca alcance el estado deseado. Verificar que lanza `ContainerStateTimeoutError`.
        *   Estado inesperado: Mockear `getContainerState` para que devuelva `'exited'` o `'dead'` antes del estado deseado. Verificar que lanza `UnexpectedContainerStateError`.
    *   **`getContainerLogs(container, options)`:** Mockear `container.logs()`.
    *   **`executeSystemCommand(container, command)`:** Mockear `container.exec()` y `exec.start()`.
    *   **`listContainers(networkName?)`, `listNetworks()`:** Mockear `docker.listContainers`/`listNetworks` con diferentes `Labels` y `NetworkSettings`. Verificar que filtra correctamente por `besu-sdk=true` y por `networkName`.
    *   **`removeContainers(networkName?)`, `removeAllNetworks()`:** Mockear `listContainers`/`listNetworks` y luego el `removeContainer`/`removeNetwork` para cada uno. Asegurarse de que maneja los errores de eliminación de elementos individuales y continúa.
*   **`getGatewayIP(subnet)`:**
    *   **¿Qué hace?** Calcula la IP del gateway (normalmente `.1`) para un dado subnet.
    *   **¿Es pura?** **SÍ**.
    *   **¿Se puede testear en aislamiento?** **SÍ**.
    *   **Ideas de Test:**
        *   Input: `'172.20.0.0/16'`, Output: `'172.20.0.1'`.
        *   Input: `'192.168.1.0/24'`, Output: `'192.168.1.1'`.

### Lógica de Negocio vs. Plomería:
*   Principalmente **Plomería**. Este servicio es una capa de abstracción directa sobre la API de Docker.
*   `waitForContainerState` tiene una lógica importante de "salud" del contenedor.
*   `adoptNetwork` tiene lógica para verificar y procesar una red existente.
*   Las funciones de `remove` con el filtro `besu-sdk=true` son lógica de negocio del SDK para gestionar sus propios recursos.

### Edge Cases & Assumptions:
*   **Docker Daemon inactivo:** `dockerode` lanzará errores de conexión que `DockerManager` debe envolver en `DockerOperationError`.
*   **Colisiones de nombres/IPs/puertos:** `DockerManager` asume que las validaciones previas (`NetworkBuilder`, `validators/config`) han prevenido la mayoría de las colisiones, pero `NetworkAlreadyExistsError` es una verificación de Docker en tiempo de ejecución.
*   **Volúmenes no accesibles:** Si los paths locales no tienen permisos o no existen, Docker fallará al montar el volumen, y `DockerManager` debería capturar este `DockerOperationError`.
*   **Errores de red de Docker:** Si Docker no puede crear la red por algún motivo (ej. recursos), `DockerManager` debe manejarlo.

### Configurabilidad y Flags:
*   `besuImage` constante (`hyperledger/besu:latest`).
*   Configuración de `HostConfig` (Memory, CpuShares, LogConfig) son valores fijos dentro de `createContainer`.
*   Tiempo de espera para `stopContainer` y `waitForContainerState`.

### Side Effects:
*   **Logs:** `debug`, `info`, `success`, `error` (muy importantes para depuración de Docker).
*   **Interacción directa con Docker daemon:** La esencia de este servicio.
*   **Gestión de procesos/recursos del sistema:** Implícita al crear/eliminar contenedores.

---

## 6. `services/FileManager.ts`

### Función-Nivel Lógico:

#### Métodos de Archivo/Directorio (`ensureDirectory`, `writeFile`, `writeJSON`, `readFile`, `readJSON`, `exists`, `removeFile`, `removeDirectory`, `copyFile`, `listFiles`, `listDirectories`, `getStats`):
*   **¿Qué hacen?** Wrappers asíncronos sobre la API `fs/promises` de Node.js.
*   **¿Son puros?** **NO**. Todos interactúan con el sistema de archivos.
*   **¿Se pueden testear en aislamiento?** **SÍ**. Idealmente, en un directorio temporal único para cada test para evitar colisiones.
*   **Ideas de Test (Unitario):**
    *   **`ensureDirectory(dirPath)`:**
        *   Happy Path: Crea un directorio nuevo. Crea directorios anidados. No lanza error si ya existe.
        *   Manejo de errores: Permisos insuficientes (simular con `jest.spyOn(fs, 'mkdir').mockRejectedValue(...)`). Lanza `FileSystemError`.
    *   **`writeFile(filePath, content)` / `writeJSON(filePath, data)`:**
        *   Happy Path: Escribe el contenido correctamente. Crea directorios padre si es necesario. Sobrescribe archivos existentes. `writeJSON` debe formatear con 2 espacios.
        *   Manejo de errores: Permisos, disco lleno, path inválido.
    *   **`readFile(filePath)` / `readJSON(filePath)`:**
        *   Happy Path: Lee el contenido correctamente. `readJSON` parsea el JSON.
        *   Manejo de errores: Archivo no existente (lanza `FileSystemError`). Permisos. Contenido JSON inválido (lanza `FileSystemError`).
    *   **`exists(itemPath)`:** Devuelve `true` para archivo/directorio existente, `false` para no existente.
    *   **`removeFile(filePath)` / `removeDirectory(dirPath)`:**
        *   Happy Path: Elimina el recurso.
        *   Ignora no existente: No lanza error si el archivo/directorio ya no existe (`ENOENT`).
        *   `removeDirectory`: Elimina contenido recursivamente.
        *   Manejo de errores: Permisos.
    *   **`copyFile(source, destination)`:**
        *   Happy Path: Copia el archivo, crea directorio destino si es necesario.
        *   Manejo de errores: Fuente no existe, destino no accesible.
    *   **`listFiles(dirPath, recursive?)`:**
        *   Happy Path: Lista solo archivos, no directorios. Lista recursivamente si se pide.
        *   Dir. no existente: Lanza `FileSystemError`.
    *   **`listDirectories(dirPath)`:** Lista solo directorios.
    *   **`getStats(filePath)`:** Devuelve estadísticas de archivo.

#### Métodos Específicos del SDK (`createNetworkStructure`, `writeNodeKeys`, `ensureBaseDataDirectory`):
*   **`createNetworkStructure(networkPath, nodeNames)`:**
    *   **¿Qué hace?** Crea el layout estándar de directorios para una red Besu (`networkPath`, `networkPath/nodes`, `networkPath/nodes/nodeName`).
    *   **¿Es pura?** **NO**. Escribe en disco.
    *   **¿Se puede testear en aislamiento?** **SÍ**, en un directorio temporal.
    *   **Ideas de Test:**
        *   Happy Path: Verificar que todos los directorios esperados existen.
        *   Manejo de errores: Si falla una creación de directorio interna.
*   **`writeNodeKeys(nodePath, privateKey, publicKey, address)`:**
    *   **¿Qué hace?** Escribe los archivos `key`, `key.pub`, `address` en el directorio del nodo, limpiando el prefijo `0x`.
    *   **¿Es pura?** **NO**. Escribe en disco.
    *   **¿Se puede testear en aislamiento?** **SÍ**, en un directorio temporal.
    *   **Ideas de Test:**
        *   Happy Path: Verificar que los 3 archivos existen y su contenido es correcto (sin `0x`).
        *   Probar con claves con y sin `0x` al inicio.
*   **`ensureBaseDataDirectory(baseDir = './besu-networks')`:**
    *   **¿Qué hace?** Asegura que el directorio base donde se guardarán todas las redes existe y devuelve su ruta absoluta.
    *   **¿Es pura?** **NO**. Escribe en disco.
    *   **¿Se puede testear en aislamiento?** **SÍ**, en un directorio temporal.
    *   **Ideas de Test:**
        *   Happy Path: Crea el directorio si no existe. Devuelve la ruta absoluta correcta.

### Lógica de Negocio vs. Plomería:
*   Principalmente **Plomería**. Abstrae las operaciones `fs`.
*   `createNetworkStructure` y `writeNodeKeys` tienen lógica específica del SDK sobre cómo estructurar los datos de Besu.

### Edge Cases & Assumptions:
*   **Permisos de archivo:** `FileManager` envuelve los errores de `fs` en `FileSystemError`. Es importante que estos errores sean informativos.
*   **Espacio en disco:** El SDK no controla el espacio en disco lleno, `fs` lanzará un error que `FileManager` envolverá.
*   **Rutinas de limpieza:** `removeDirectory` usa `force: true` lo cual es bueno para resiliencia en `teardown`.

### Configurabilidad y Flags:
*   Ninguna directamente en este servicio, se basa en los paths de entrada.

### Side Effects:
*   **Logs:** `debug`, `info`, `error`.
*   **Interacción con el sistema de archivos:** La esencia de este servicio.

---

## 7. `services/SystemValidator.ts`

### Función-Nivel Lógico:

#### Métodos de Validación (`checkPrerequisites`, `checkDockerAvailable`, `getDockerInfo`, `checkDockerVersion`, `checkResources`, `checkBesuImage`, `checkPortsAvailable`, `networkExists`):
*   **¿Qué hacen?** Verifican las condiciones del entorno (Docker, recursos) antes de iniciar la red.
*   **¿Son puros?** **NO**. Interactúan con Docker y el sistema operativo.
*   **¿Se pueden testear en aislamiento?** **SÍ, con mocks** para `Docker` y sus métodos (`ping`, `info`, `version`, `getImage`, `listNetworks`).
*   **Ideas de Test (Unitario con Mocks):**
    *   **`checkPrerequisites(docker, nodeCount)`:** Orquesta todas las demás verificaciones.
        *   Happy Path: Todas las verificaciones internas pasan. No lanza error.
        *   Fallo en cualquier sub-verificación: La función lanza el error correspondiente (`DockerNotAvailableError`, `InsufficientResourcesError`).
    *   **`checkDockerAvailable(docker)`:**
        *   Docker OK: Mock `docker.ping()` éxito. No lanza error.
        *   Docker NO OK: Mock `docker.ping()` falla. Lanza `DockerNotAvailableError`.
    *   **`checkDockerVersion(docker, info)`:**
        *   Versión OK: Mock `docker.version()` para devolver una versión >= mínima. No lanza error.
        *   Versión antigua: Mock `docker.version()` para devolver una versión < mínima. Lanza `DockerNotAvailableError`.
        *   No se puede determinar la versión: Loggea `warn`.
    *   **`checkResources(info, nodeCount)`:**
        *   Recursos OK: Mock `info.MemTotal` y `info.DriverStatus` (con `parseDiskInfo`) para que los recursos disponibles sean > requeridos. No lanza error.
        *   Memoria insuficiente: Lanza `InsufficientResourcesError` (memoria).
        *   Disco insuficiente: Lanza `InsufficientResourcesError` (disco).
        *   Muchos contenedores corriendo: Loggea `warn`.
        *   Info faltante: Loggea `warn` si `MemTotal` o `DriverStatus` no están disponibles.
    *   **`checkBesuImage(docker)`:**
        *   Imagen existe: Mock `docker.getImage().inspect()` éxito. No lanza error.
        *   Imagen no existe: Mock `docker.getImage().inspect()` falla. Loggea `info` (`will be pulled when needed`).
    *   **`checkPortsAvailable(ports)`:**
        *   Actualmente solo loggea advertencias para puertos comunes.
        *   **Test idea:** Verificar que se loggean las advertencias para puertos como 80, 8545.
        *   **Test idea (Mejora):** Si se añade lógica real de escaneo de puertos, testear que devuelve los puertos no disponibles correctamente.
    *   **`networkExists(docker, networkName)`:** Mock `docker.listNetworks` con/sin el nombre.

#### Métodos Auxiliares Puros (`parseVersion`, `isVersionLower`, `parseDiskInfo`, `estimateRequirements`):
*   **¿Qué hacen?** Realizan cálculos o transformaciones de datos.
*   **¿Son puros?** **SÍ**.
*   **¿Se pueden testear en aislamiento?** **SÍ**.
*   **Ideas de Test:**
    *   **`parseVersion(version)`:**
        *   Input: `'20.10.17'`, Output: `{ major: 20, minor: 10, patch: 17 }`.
        *   Input: `'v1.2.3-beta'`, Output: `{ 1, 2, 3 }`.
        *   Input: `'invalid'`, Output: `{ 0, 0, 0 }`.
    *   **`isVersionLower(current, required)`:** Probar todas las combinaciones (current < required, current == required, current > required) para major, minor, patch.
    *   **`parseDiskInfo(driverStatus)`:**
        *   Input: Diferentes formatos de `DriverStatus` de Docker info (ej. `[['Data Space Used', '10.24 GB']]`, `[['Free Space', '500 MB']]`).
        *   Output: `{ availableMB: ... }` o `null`.
    *   **`estimateRequirements(nodeCount)`:**
        *   Input: `1`, `3`, `10`.
        *   Output: Verificar cálculos de `memoryMB`, `diskMB`, `estimatedStartupTime` según las constantes `DEFAULT_REQUIREMENTS`.

### Lógica de Negocio vs. Plomería:
*   **Lógica de Negocio:** `checkPrerequisites` y sus sub-funciones (Docker disponible, versiones, recursos, imágenes) son el núcleo de la validación pre-operativa.
*   **Plomería/Utilidades:** Los métodos `parseX`, `isVersionLower`, `estimateRequirements`.

### Edge Cases & Assumptions:
*   **Variabilidad de `docker.info()`:** El formato de `DriverStatus` puede variar entre sistemas operativos y drivers de almacenamiento de Docker. `parseDiskInfo` intenta ser robusto pero no puede cubrir todos los casos.
*   **Métricas de recursos:** Asume que `docker.info()` proporciona métricas de memoria y disco fiables.
*   **`checkPortsAvailable`:** Es una validación muy básica, el SDK asume que Docker lanzará un error si el puerto ya está en uso.

### Configurabilidad y Flags:
*   `DEFAULT_REQUIREMENTS` constantes internas.
*   Los valores de `nodeCount` son una configuración en tiempo de ejecución para estimar recursos.

### Side Effects:
*   **Logs:** `info`, `debug`, `warn` (cuando no puede determinar info o hay posibles problemas).
*   **No hay interacción mutante:** Solo lectura del estado del sistema.

---

## 8. `utils/key-generator.ts`

### Función-Nivel Lógico:

#### Métodos de Generación (`generateNodeIdentity`, `generateMultipleIdentities`, `generateDeterministicIdentity`):
*   **¿Qué hacen?** Crean nuevas identidades (dirección, clave pública, clave privada).
*   **¿Son puros?** **NO**. Dependen de la aleatoriedad (`createRandom`) o de un `seed` de entrada.
*   **¿Se pueden testear en aislamiento?** **SÍ**.
*   **Ideas de Test (Unitario):**
    *   **`generateNodeIdentity()`:**
        *   Output: `NodeIdentity` con `address` (0x, 40 chars, lowercase), `publicKey` (0x, 130 chars), `privateKey` (0x, 64 chars).
        *   Unicidad: Llamar dos veces, verificar que las identidades son diferentes.
        *   Validez criptográfica: Usar `ethers.js` para verificar que la clave privada deriva a la dirección y clave pública dadas.
    *   **`generateMultipleIdentities(count)`:**
        *   Input: `5`, Output: Array de 5 identidades únicas y válidas.
        *   Input: `0`, `-1`, `1.5`, Output: Lanza error (`Count must be a positive integer`).
    *   **`generateDeterministicIdentity(seed)`:**
        *   **CRÍTICO:** Input: `'my-secret-seed'`, Output: Siempre la misma `NodeIdentity` para el mismo seed.
        *   Unicidad: Diferentes seeds producen diferentes identidades.
        *   **ADVERTENCIA:** Verificar que `logger.warn` es llamado con el mensaje de advertencia de producción.

#### Métodos de Conversión/Validación (`deriveAddressFromPrivateKey`, `validateNodeIdentity`, `formatPrivateKeyForBesu`, `addressFromEnode`):
*   **¿Qué hacen?** Transforman o validan formatos de claves/direcciones.
*   **¿Son puros?** **SÍ** (si `ethers.js` es tratado como una dependencia pura que siempre da la misma salida para la misma entrada).
*   **¿Se pueden testear en aislamiento?** **SÍ**.
*   **Ideas de Test (Unitario):**
    *   **`deriveAddressFromPrivateKey(privateKey)`:**
        *   Input: Clave privada con `0x`. Output: Dirección Ethereum (0x, 40 chars, lowercase).
        *   Input: Clave privada sin `0x`. Output: Igual que antes.
        *   Input: Clave privada inválida (ej. longitud incorrecta, caracteres no hexadecimales). Lanza error (`Invalid private key`).
    *   **`validateNodeIdentity(identity)`:**
        *   Input: `NodeIdentity` válido. Output: `true`.
        *   Input: Dirección con formato inválido. Lanza error (`Invalid Ethereum address format`).
        *   Input: Clave privada no coincide con dirección. Lanza error.
        *   Input: Clave pública no coincide con clave privada. Lanza error.
    *   **`formatPrivateKeyForBesu(privateKey)`:**
        *   Input: Clave con `0x`. Output: Clave sin `0x`.
        *   Input: Clave sin `0x`. Output: Igual (no cambia).
    *   **`addressFromEnode(enodeUrl)`:**
        *   Input: `enode://pubkey@ip:port`. Output: Dirección Ethereum (0x, 40 chars, lowercase).
        *   Input: `enode://pubkey@ip:port?discport=X`. Output: Igual.
        *   Input: Enode inválido (sin pubkey, formato incorrecto). Lanza error (`Invalid enode URL format`).

### Lógica de Negocio vs. Plomería:
*   Todos son lógica de negocio fundamental relacionada con la criptografía y la identidad de los nodos Besu.

### Edge Cases & Assumptions:
*   `ethers.js` es fiable y seguro.
*   Manejo de mayúsculas/minúsculas en direcciones (siempre se convierten a minúsculas).
*   Prefijos `0x` (se manejan explícitamente).

### Configurabilidad y Flags:
*   `seed` para `generateDeterministicIdentity`.
*   `DEBUG` flag para el logger.

### Side Effects:
*   **Logs:** `debug`, `warn` (especialmente para `generateDeterministicIdentity`).

---

## 9. `validators/config.ts`

### Función-Nivel Lógico:

#### Todas las funciones de validación (`validateNetworkConfig`, `validateNetworkSettings`, `validateSubnet`, `validateNodeConfig`, `validateNodeOptions`, `validateNodeIp`, `ipToNumber`, `validateRpcPort`, `validateDockerConnection`):
*   **¿Qué hacen?** Aplican reglas estrictas sobre los formatos y valores de los objetos de configuración.
*   **¿Son puros?** **CASI TODAS**. `validateRpcPort` y `validateNetworkConfig` tienen un pequeño efecto secundario de `console.warn`. `ipToNumber` es pura.
*   **¿Se pueden testear en aislamiento?** **SÍ**. Son el ejemplo perfecto de funciones puras o casi puras para unit tests.
*   **Ideas de Test (Unitario - muchos inputs -> errores):**
    *   **`validateNetworkConfig(config)`:**
        *   Happy Path: Configuración totalmente válida. No lanza error.
        *   `chainId`: `0`, `-1`, `1.5`, `null`. Lanza `ConfigurationValidationError`.
        *   `chainId`: `1`, `3`, `42` (conocidos). Loggea `warn`.
        *   `blockPeriodSeconds`: `0`, `-5`, `1.5`. Lanza `ConfigurationValidationError`.
        *   `blockPeriodSeconds`: `90` (largo). Loggea `warn`.
        *   `network.name`: `''`, `123name`, `name with spaces`, `name@symbol`, `a.repeat(65)`. Lanza `ConfigurationValidationError`.
        *   `network.subnet`: Inválido (ver `validateSubnet` tests). Lanza `ConfigurationValidationError`.
        *   `nodes`: Array vacío o `null`. Lanza `ConfigurationValidationError` (`non-empty array`).
        *   Nombres de nodos duplicados: Lanza `ConfigurationValidationError` (`Node names must be unique`).
        *   IPs de nodos duplicadas: Lanza `ConfigurationValidationError` (`IP addresses must be unique`).
        *   **No validators:** Lanza `ConfigurationValidationError` (`At least one node must be configured as a validator`).
        *   Puertos RPC duplicados: Lanza `ConfigurationValidationError` (`RPC ports must be unique`).
    *   **`validateNetworkSettings(network)`:** Ya cubierto por `validateNetworkConfig`.
    *   **`validateSubnet(subnet)`:**
        *   Happy Path: `'10.0.0.0/8'`, `'172.16.0.0/12'`, `'192.168.0.0/16'`, `'172.20.0.0/24'`. No lanza error.
        *   Formato inválido: `'192.168.1.0'`, `'not-a-subnet'`. Lanza `ConfigurationValidationError`.
        *   Prefijo inválido: `'1.1.1.1/7'`, `'1.1.1.1/31'`. Lanza `ConfigurationValidationError` (`between 8 and 30`).
        *   Octeto inválido: `'256.1.1.1/24'`. Lanza `ConfigurationValidationError`.
        *   Rango público: `'8.8.8.0/24'`. Lanza `ConfigurationValidationError` (`private network range`).
    *   **`validateNodeConfig(node, subnet)`:**
        *   Happy Path: Nodos válidos, IP dentro de subred.
        *   Nombre inválido: `''`, `'123name'`. Lanza `ConfigurationValidationError`.
        *   IP inválida: `'not-an-ip'`, `'256.1.1.1'`. Lanza `ConfigurationValidationError`.
        *   **IP fuera de subred:** `'192.168.1.10'`, `'172.21.0.10'` con subred `'172.20.0.0/16'`. Lanza `ConfigurationValidationError` (`Must be within subnet`).
        *   **IP de red/broadcast:** `'172.20.1.0'` o `'172.20.1.255'` con subred `'172.20.1.0/24'`. Lanza `ConfigurationValidationError`.
        *   `rpcPort` sin `rpc` habilitado: Lanza `ConfigurationValidationError`.
        *   `rpcPort` inválido: `0`, `70000`. Lanza `ConfigurationValidationError`.
        *   `rpcPort` privilegiado (`80`): Loggea `warn`.
    *   **`validateNodeOptions(options)`:**
        *   Similar a `validateNodeConfig` para nombre, IP (formato, no subred), RPC.
    *   **`validateNodeIp(ip, subnet)`:**
        *   **IPs válidas:** IPs dentro del subnet, formato correcto.
        *   **IPs fuera del subnet:** `172.20.0.10` en subnet `172.21.0.0/16`. Lanza `ConfigurationValidationError`.
        *   **Dirección de red:** Para subnet `172.20.0.0/24`, IP `172.20.0.0`. Lanza `ConfigurationValidationError`.
        *   **Dirección de broadcast:** Para subnet `172.20.0.0/24`, IP `172.20.0.255`. Lanza `ConfigurationValidationError`.
        *   **IP del gateway:** `172.20.0.1` (normalmente reservada). ¿Se permite, se advierte, o se rechaza?
        *   **Formato inválido:** `256.1.1.1`, `not-an-ip`. Lanza `ConfigurationValidationError`.
    *   **`validateRpcPort(port)`:**
        *   Happy Path: `8545`, `30000`. No lanza error.
        *   **Fuera de rango:** `0`, `-1`, `65536`, `70000`, `1.5`. Lanza `ConfigurationValidationError`.
        *   **Puertos privilegiados:** `80`, `443`. Loggea `warn` pero permite continuar.
        *   **Puertos comunes:** `22` (SSH), `3306` (MySQL), `5432` (PostgreSQL), `8080` (proxy/web). Loggea `warn` sobre conflictos potenciales.
        *   **Test de integración:** Verificar si Docker realmente permite usar puertos privilegiados sin permisos apropiados.
    *   **`validateDockerConnection(dockerHost?)`:**
        *   Happy Path: `undefined`, `'unix:///var/run/docker.sock'`, `'tcp://localhost:2375'`. No lanza error.
        *   Inválido: `'localhost:2375'`, `'my-docker-host'`. Lanza `ConfigurationValidationError` (`Must start with one of...`).

### Lógica de Negocio vs. Plomería:
*   **Pura Lógica de Negocio**. Estas funciones codifican las reglas y limitaciones de lo que es una configuración válida para una red Besu y sus nodos.

### Edge Cases & Assumptions:
*   Las expresiones regulares para nombres de red/nodos y subnets son correctas.
*   Los rangos de IPs privadas son los definidos por RFC1918.
*   Los rangos de puertos son los estándar (1-65535, <1024 privilegiados).

### Configurabilidad y Flags:
*   Ninguna. Se basan en reglas fijas.

### Side Effects:
*   **Logs:** `console.warn` para chain IDs conocidos, puertos privilegiados/comunes.

---

## 10. Escenarios de Fallo en la Orquestación

### Fallos de Docker y Estados del Sistema:

#### Docker Daemon No Disponible:
*   **Test idea (Docker Daemon apagado al iniciar):**
    *   Intentar `NetworkBuilder.build()` con el daemon de Docker detenido.
    *   **Expected:** `SystemValidator.checkPrerequisites` debe lanzar `DockerNotAvailableError`.
*   **Test idea (Docker Daemon se apaga durante operación):**
    *   Crear una red `RUNNING`, luego simular que el daemon Docker se detiene.
    *   Intentar `addNode()`, `removeNode()`, `teardown()`.
    *   **Expected:** Los métodos deben fallar con `DockerOperationError` apropiados.
    *   **Nota:** El SDK no tiene monitoreo en tiempo real, por lo que `getStatus()` seguirá devolviendo el último estado conocido hasta el siguiente intento de interacción.

#### Validación de Estados Incorrectos:
*   **`Network` - Estados incorrectos:**
    *   `network.setup()` cuando `status` es `RUNNING` o `STOPPING`: Debe lanzar `InvalidNetworkStateError`.
    *   `network.teardown()` cuando `status` es `UNINITIALIZED` o `INITIALIZING`: Debe lanzar `InvalidNetworkStateError`.
    *   `network.addNode()/removeNode()` cuando `status` no es `RUNNING`: Debe lanzar `InvalidNetworkStateError`.
*   **`BesuNode` - Estados incorrectos:**
    *   `node.start()` cuando `status` es `RUNNING`: Debe lanzar `InvalidNodeStateError`.
    *   `node.stop()` cuando `status` es `STOPPED` o `CREATED`: Debe lanzar `InvalidNodeStateError`.
*   **Test idea:** Cada error debe incluir un mensaje descriptivo que indique el estado actual y los estados esperados.

#### Reutilización de Builders y Nodos:
*   **Reutilización de NetworkBuilder:**
    *   Llamar `build()` múltiples veces en el mismo `NetworkBuilder`.
    *   **Expected:** Cada llamada debe crear una nueva instancia de `Network` independiente.
*   **Instanciación directa de BesuNode:**
    *   Crear un `BesuNode` directamente (saltándose `NetworkBuilder.build()`).
    *   **Test idea:** ¿El constructor permite esta inyección de dependencias? ¿Funciona correctamente o falla por dependencias faltantes?

#### Persistencia y Recuperación:
*   **Salida abrupta del proceso:**
    *   Ejecutar `setup()`, luego forzar salida del proceso Node.js (`process.exit()` o `Ctrl+C`).
    *   **Expected:** Los contenedores Docker y la red Docker deben persistir (comportamiento esperado).
    *   **Test de recuperación:** Intentar "adoptar" la red existente con otro script del SDK. ¿Funciona `adoptNetwork` correctamente?
    *   **Metadatos:** Verificar si `network.json` se guardó dependiendo del momento de la salida.

#### Limpieza Parcial y Corrupción:
*   **Múltiples llamadas a teardown:**
    *   Llamar `teardown(false)` varias veces consecutivas.
    *   **Expected:** No debe haber errores ni dejar residuos. Debe ser idempotente.
*   **Corrupción de archivos:**
    *   Borrar manualmente algunos archivos dentro de `./besu-networks/mi-red/nodes/` pero no todo el directorio.
    *   Intentar `teardown()` o `addNode()` cuando faltan archivos de claves.
    *   **Expected:** ¿Cómo reacciona el SDK? ¿Loggea errores pero continúa? ¿Falla completamente?
*   **Metadatos corruptos:**
    *   Modificar manualmente `network.json` con JSON inválido.
    *   Intentar `validateChainIdUnique` o adopción de red.
    *   **Expected:** Debe manejar graciosamente la corrupción (loggear warning y continuar).

#### Fallos Específicos de Contenedores:
*   **Contenedor falla al iniciar:**
    *   Simular que `dockerManager.startContainer` falla para un nodo específico.
    *   **Expected:** `Network.setup()` debe ir a estado `ERROR` y intentar limpieza.
*   **Contenedor se detiene inesperadamente:**
    *   Simular que un contenedor se detiene durante la operación normal.
    *   **Expected:** El SDK no detecta esto automáticamente, pero el próximo `getEnodeUrl()` o interacción debe fallar apropiadamente.

#### Problemas de Recursos:
*   **Memoria/CPU insuficiente:**
    *   Simular que `SystemValidator.checkResources` detecta recursos insuficientes.
    *   **Expected:** Debe lanzar `InsufficientResourcesError` antes de intentar crear contenedores.
*   **Espacio en disco agotado:**
    *   Simular que `FileManager` falla al escribir debido a espacio insuficiente.
    *   **Expected:** Debe lanzar `FileSystemError` apropiado.

#### Validaciones de Puertos Avanzadas:
*   **Puertos ya en uso:**
    *   Crear una red que use puerto `8545`, luego intentar crear otra red que también use `8545`.
    *   **Expected:** Docker debe fallar al crear el segundo contenedor. El SDK debe reportar `DockerOperationError`.
*   **Puertos privilegiados sin permisos:**
    *   Intentar usar puerto `80` sin permisos de administrador.
    *   **Expected:** Docker debe fallar. Verificar que el SDK reporta el error correctamente.

---

## Ideas Adicionales y Resumen de Funcionalidades a Testear:

### Features to test :

#### Pruebas de Integración Clave:

*   **Creating a network from a pre-existent network (has to be set up previously)**
    *   **Scenario:**
        1.  Usa `NetworkBuilder` para crear y `build()` una red con un nombre específico (ej. "my-adopted-network") y `autoStart=true`.
        2.  Asegúrate de que se limpie, o al menos que el Docker Network exista al comienzo del siguiente test.
        3.  Crea *otra* instancia de `NetworkBuilder`.
        4.  Llama a `.withNetworkName("my-adopted-network")` y `.build()` (sin especificar `subnet`).
        5.  **Expected:** El `NetworkBuilder` (y `DockerManager.adoptNetwork`) detecta la red existente, la "adopta", obtiene su subred de Docker, y procede a crear los nodos dentro de esa subred. La red resultante debe estar `RUNNING`.
    *   **Edge Cases:**
        *   La red existente no tiene configuración de subred IPAM válida.
        *   La red existente es creada por una herramienta diferente y no tiene etiquetas `besu-sdk=true`. ¿Se adopta? (Sí, `adoptNetwork` no las exige, solo `listContainers`/`listNetworks` de `DockerManager` las usa para filtrar).

*   **Try chainId duplication in same net; also different nets**
    *   **Same Net:** El `NetworkBuilder` ya tiene validación de unicidad de nombres de nodo y IPs. El `chainId` es un parámetro de la red, no del nodo. No aplica "chainId duplication in same net" de la misma manera que IPs/nombres de nodo.
    *   **Different Nets (CRÍTICO, YA IMPLEMENTADO):**
        1.  Crea una red A con `chainId = 1337`.
        2.  Llama a `networkA.teardown(false)` (NO borres los datos en disco, solo los contenedores y la red Docker, para que `network.json` persista).
        3.  Intenta crear una red B (usando un `NetworkBuilder` nuevo) con `chainId = 1337` y un `networkName` *diferente*.
        4.  **Expected:** `NetworkBuilder.build()` debe lanzar `ChainIdConflictError` porque `validateChainIdUnique` lo detecta en los metadatos persistidos.
        5.  **Variación:** Testear que si se usa un `baseDataDir` diferente (donde no hay metadatos), el error no se lanza.

*   **Try setting two Docker networks with the same subnet 172.20.0.0/16**
    *   **Scenario (CRÍTICO, YA IMPLEMENTADO):**
        1.  Crea una red A con `subnet = '172.20.0.0/16'`. `build()` y asegúrate de que se crea el Docker network.
        2.  Crea *otra* instancia de `NetworkBuilder`.
        3.  Intenta crear una red B con `subnet = '172.20.0.0/16'` y un `networkName` *diferente*.
        4.  **Expected:** `NetworkBuilder.build()` debe lanzar `SubnetConflictError` porque `getExistingSubnets` lo detecta. Docker permite crear subredes duplicadas, pero el SDK lo prohíbe explícitamente para evitar problemas de ruteo.
    *   **Variación:**
        *   Si la red A se ha limpiado completamente (`teardown(true)`), entonces la red B con el mismo subnet debería poder crearse sin problema.

*   **Try out the autostart NetworkBuilder argument**
    *   **Scenario:**
        1.  Instancia `NetworkBuilder`. Configura una red básica.
        2.  Llama a `builder.build(false)`.
        3.  **Expected:** `Network` se devuelve, pero su `status` debe ser `UNINITIALIZED`. No debe haber contenedores Docker corriendo ni red Docker creada por el SDK todavía.
        4.  Luego, llama a `network.setup()`.
        5.  **Expected:** La red se inicializa y pasa a `RUNNING`.
    *   **Scenario 2:**
        1.  Instancia `NetworkBuilder`. Configura una red básica.
        2.  Llama a `builder.build()` (sin argumento, o con `true`).
        3.  **Expected:** `Network` se devuelve y su `status` debe ser `RUNNING` inmediatamente. Los contenedores y la red Docker deben estar funcionando.

#### Casos de Borde Críticos:

*   **Validaciones de IP Exhaustivas:**
    *   **Dirección de red exacta:** `172.20.0.0` en subnet `172.20.0.0/24` debe ser rechazada.
    *   **Dirección de broadcast exacta:** `172.20.0.255` en subnet `172.20.0.0/24` debe ser rechazada.
    *   **IP fuera de subnet por un bit:** `172.21.0.10` en subnet `172.20.0.0/16` debe ser rechazada.
    *   **IP del gateway predeterminada:** `172.20.0.1` - verificar si se permite, advierte o rechaza.

*   **Validaciones de Puerto Exhaustivas:**
    *   **Puerto 0:** Debe ser rechazado inmediatamente por validación.
    *   **Puerto 65536:** Debe ser rechazado (fuera del rango válido).
    *   **Puertos privilegiados sin permisos:** Intentar puerto `80`/`443` en contenedores sin privilegios apropiados.
    *   **Puertos de servicios comunes:** `22`, `3306`, `5432`, `8080` - verificar advertencias pero permitir uso.

*   **Configuraciones de Red Extremas:**
    *   **Red solo con nodo no-validador:** Debe fallar en validación (`at least one validator required`).
    *   **Red con ChainId duplicado:** Entre diferentes redes en el mismo `baseDataDir`.
    *   **Subnet duplicado:** Entre diferentes redes Docker activas.

*   **Escenarios de Fallo de Sistema:**
    *   **Docker daemon se apaga durante operación:** Verificar manejo de errores en `addNode()`, `removeNode()`, `teardown()`.
    *   **Proceso se termina abruptamente:** Verificar persistencia y capacidad de recuperación.
    *   **Archivos corrompidos/faltantes:** `network.json` inválido, archivos de claves faltantes.
    *   **Permisos de sistema:** Directorios sin permisos de escritura, puertos privilegiados.

*   **Estados Inválidos:**
    *   **Operaciones en estados incorrectos:** `setup()` en red `RUNNING`, `addNode()` en red `STOPPED`.
    *   **Transiciones de estado no permitidas:** Verificar que todas las operaciones validen el estado actual.
    *   **Múltiples operaciones simultáneas:** ¿Qué pasa si se llama `addNode()` mientras otro `addNode()` está en progreso?

#### Pruebas de Robustez y Limpieza:

*   **Limpieza idempotente:** `teardown()` múltiples veces no debe causar errores.
*   **Recuperación de fallos parciales:** Red que falla durante `setup()` debe poder limpiarse y reintentarse.
*   **Gestión de recursos:** Verificar que no se dejan contenedores/redes huérfanos después de fallos.

---

Espero que esta guía detallada te sea de gran utilidad para tus esfuerzos de testing y para entender a fondo cada capa de tu SDK. ¡Es un proyecto impresionante!
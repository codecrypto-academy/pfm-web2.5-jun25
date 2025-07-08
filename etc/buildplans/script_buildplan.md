### **Guía Maestra V2: Creación de una Red Besu con una Herramienta Bash Automatizada**

Este documento es una guía detallada y robusta para construir una red privada de blockchain Hyperledger Besu. El objetivo ha evolucionado: ya no creamos un simple script, sino una **herramienta de línea de comandos en Bash**, reutilizable y configurable, que gestiona el ciclo de vida completo de nuestro entorno de desarrollo.

# **I. Manifiesto de Diseño: Las Reglas de Oro de la Herramienta**

Estos principios son la base sobre la que se construye una herramienta fiable, intuitiva y potente.

*   **Configuración Externa y Centralizada (vía config.yaml):** La lógica del script y la configuración de la red deben estar completamente desacopladas. Toda la definición de la red (nodos, roles, chainId, parámetros de consenso, transacciones de prueba) se externalizará a un archivo `config.yaml`. Esto permite modificar la topología de la red sin tocar una sola línea de código del script. En la parte superior del script, crea una sección de "Parámetros" claramente delimitada donde se cargarán y procesarán todas las variables del YAML externo usando `yq` (nada de parsing manual). El archivo `config.yaml` debe contener estructuras como:
    ```yaml
    blockchain:
      chainId: 123999
      blockPeriodSeconds: 15
      epochLength: 30000
    consensus:
      type: "clique"
    network:
      name: "besu-network"
      subnet: "172.24.0.0/16"
      label: "project=besu-net"
    nodes:
      - name: "bootnode-validator-1"
        ip: "172.24.0.11"
        roles: ["validator", "bootnode", "rpc"]
        rpc_mapping: "9999:8545"
      - name: "validator-2"
        ip: "172.24.0.12"
        roles: ["validator"]
      - name: "validator-3"
        ip: "172.24.0.13"
        roles: ["validator"]
      - name: "rpc-node-4"
        ip: "172.24.0.14"
        roles: ["rpc"]
        rpc_mapping: "9998:8545"
      - name: "data-replica-5"
        ip: "172.24.0.15"
        roles: []
    docker:
      image: "hyperledger/besu:latest"
      user_permissions: true  # Usar --user $(id -u):$(id -g)
    alloc:
      - address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B" # Cuenta de Vitalik para pruebas
        balance: "1000000000000000000000" # 1000 ETH
    # RPC configuration for transaction signing
    rpc:
      primary_endpoint: "http://localhost:9999"
      secondary_endpoint: "http://localhost:9998"
      timeout: 30000  # milliseconds
    # Ruta al directorio que contiene la herramienta de firma de transacciones (Node.js).
    # ¡IMPORTANTE! Esta ruta es RELATIVA AL DIRECTORIO DONDE SE ENCUENTRA ESTE config.yaml.
    # El script la resolverá a una ruta absoluta para garantizar la robustez.
    tx_signer_deps_dir: "../frontback/
    testTransactions:
      - from_node: "bootnode-validator-1"
        to: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
        value_ether: 1.5 # El script lo convertirá a Wei
        gas: "21000" # wei
        rpc_endpoint: "primary_endpoint"  # Referencia al RPC configurado
      - from_node: "rpc-node-4"
        to: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
        value_ether: 0.5
        gas: "21000"
        rpc_endpoint: "secondary_endpoint"  # Referencia al RPC configurado
    ```
    Esto evita tener que "cazar" valores hardcodeados por todo el script y permite que cualquier usuario defina topologías de red completamente diferentes en segundos.

*   **Claridad Visual y Estructura Explícita:** Usar comentarios con separadores gráficos (`--- [ Título ] ---`) para delinear bloques lógicos y hacer el script escaneable.

*   **Autonomía Total (Todo-en-Uno):** El script `script.sh` debe ser una solución integral. Desde la limpieza inicial hasta la construcción de la red, el lanzamiento de los nodos y la ejecución de pruebas de verificación, todo debe ocurrir de forma autónoma. La meta es simple: ejecutar `./script.sh` y observar cómo la red cobra vida y se valida a sí misma sin necesidad de intervención manual.

*   **Modularidad Lógica Interna:** Organizar el código en funciones Bash (`create_network_docker()`, `generate_node_keys()`, `start_besu_node()`, `run_automated_tests()`).

*   **Robustez y Manejo de Errores:** Un script robusto no asume que todo saldrá bien.
    *   **Verificación de Comandos:** Después de cada comando crítico (ej. `docker`, `curl`), se debe comprobar el código de salida con `$?`. Si un paso crucial falla, el script debe detenerse con un mensaje de error claro para evitar problemas en cascada.
    *   **Logs Detallados:** Utiliza `echo` generosamente para informar qué está haciendo el script en cada momento. Imprime variables importantes para facilitar la depuración (`debug`).

* **Logging Informativo y Codificado por Colores:** No queremos que los prints de debug se hagan abruptamente y fuera de contexto. Queremos integrarlos en una narrativa elegante, para que el propio unvelop del programa sea suficiente to witness everything going on. La salida del script es su interfaz de usuario. No te limites a usar `echo`. Se definirán variables de color al principio del script y se usarán funciones de logging para diferenciar tipos de mensajes. Implementa funciones de logging diferenciadas por propósito y color: `log_step` (magenta, para marcar el inicio de secciones), `log_success` (verde, para confirmar acciones exitosas), `log_error` (rojo, para errores críticos), `log_warning` (amarillo, para advertencias), `log_check` (cian, para verificaciones activas), `log_docker` (azul, para acciones relacionadas con Docker), `log_clean` (gris, para procesos de limpieza), `log_tip` (azul claro, para consejos útiles) y `log_debug` (gris claro, para depuración opcional). Este sistema transforma la salida en una narrativa clara, estructurada y visualmente intuitiva, facilitando el seguimiento, diagnóstico y uso del script.

*   **Experiencia de Usuario y Operabilidad - Modo de Depuración:** Falta de un modo "verboso" o de "depuración". El logging por colores es excelente para el flujo normal, pero cuando algo va mal, un desarrollador puede necesitar ver los payloads JSON-RPC completos, las respuestas de `curl`, o los valores exactos de las variables. Introducir un flag de línea de comandos y una variable de entorno para controlar la verbosidad.
    *   **Control de Verbosidad:** Añadir un `DEBUG=0` al principio del script para controlar el nivel de detalle en los logs.
    *   **Activación Flexible:** Permitir que se active con un flag: `./script.sh --debug` o `DEBUG=1 ./script.sh`.
    *   **Función de Debug Condicional:** Crear una función `log_debug` que solo imprima si `DEBUG` es `1`, mostrando payloads JSON-RPC, respuestas de `curl`, valores de variables críticas, y detalles internos del proceso.
    Esta funcionalidad proporciona transparencia total durante la depuración sin contaminar la salida normal del script, mejorando significativamente la experiencia del desarrollador cuando necesita diagnosticar problemas.

*   **Portabilidad y Conciencia del Entorno (El Principio "Anti-Funciona en mi Máquina"):** El script debe ser agnóstico al entorno del desarrollador.
    *   **Sin Rutas Absolutas:** Usa variables como `$(pwd)` para construir rutas relativas al directorio donde se ejecuta el script.
    *   **Gestión de Permisos:** Para evitar problemas de permisos con archivos creados por Docker, ejecuta los contenedores con el ID del usuario y grupo actuales (`--user $(id -u):$(id -g)`). Esto asegura que los archivos generados en volúmenes mapeados sean propiedad del usuario, no de `root`, haciendo la vida infinitamente más fácil.

*   **Robustez y Chequeos de Salud Inteligentes:** La herramienta no solo lanza los nodos, sino que verifica activamente que la red está sana. Debe implementar bucles de espera y chequeos post-arranque (`net_peerCount`, `eth_blockNumber`) para confirmar que los nodos se ven entre sí y que la cadena está produciendo bloques, proporcionando retroalimentación útil si algo falla.

*   **English Language Requirement:** Todos los comentarios, variables, funciones y mensajes de salida deben estar en inglés.

# **II. Pasos de Implementación**

*(Esta sección resume los pasos de construcción ya detallados en la versión anterior: Verificación de Dependencias, Carga de Configuración, Validación de Parámetros, Limpieza, Creación de Red Docker, Generación de Identidades, Preparación de `genesis.json` y `config.toml`, y Lanzamiento de Nodos Docker. A continuación se detalla la fase de pruebas que se ejecuta después de lanzar los nodos.)*

### **0.0. Verificación Proactiva de Dependencias:**

**Concepto:** La herramienta no debe fallar con errores crípticos a mitad de ejecución. Su primera acción será preguntar al usuario si desea instalar las dependencias externas (`jq` para JSON y `yq` para YAML). Si el usuario se niega, la herramienta verificará si existen; si no, se detendrá con un mensaje claro indicando lo que falta.

**Acciones y Buenas Prácticas:**
*   **Instalación Asistida:** El script debe ofrecer instalar automáticamente las dependencias que falten (`jq`, `yq`) antes de proceder.
*   **Verificación Completa:** Debe comprobar que todas las herramientas externas necesarias están instaladas y disponibles en el `PATH`: `docker`, `node`, `npm`, `jq`, y `yq`.
*   **Mensajes Claros:** Si una dependencia falta y el usuario rechaza la instalación automática, el script debe detenerse inmediatamente con un mensaje de error claro y amigable que indique exactamente qué necesita instalar.
*   **Prevención de Fallos:** Este enfoque previene fallos crípticos más adelante en la ejecución del script.

### **0.1. Carga y Procesamiento del Archivo de Configuración:**

**Concepto:** Antes de ejecutar cualquier lógica, el script debe cargar y validar el archivo `config.yaml`. Este paso es fundamental para el desacoplamiento entre la lógica del script y la configuración de la red.

**Acciones y Buenas Prácticas:**
*   **Verificación de Existencia:** El script debe comprobar que el archivo `config.yaml` existe en el directorio actual. Si no existe, debe detenerse con un mensaje claro indicando que se requiere este archivo.
*   **Parsing y Validación:** Usa `yq` para extraer los valores del YAML y asignarlos a variables de Bash. Implementa validaciones básicas para campos críticos.

### **0.2. Validación Exhaustiva de Parámetros de Configuración:**

**Concepto:** El script realiza dos niveles de validación. El primero es una **revisión de formato y sintaxis** para asegurar que los datos son correctos individualmente. El segundo, más profundo, es una **validación de coherencia lógica y topológica** para garantizar que la configuración describe una red funcional y viable.

#### **Nivel 1: Validación de Formato y Sintaxis (Verificaciones Fundamentales)**

Esta capa previene errores de ejecución básicos al comprobar que cada valor cumple con su formato esperado y sus restricciones individuales.

*   **Esquema YAML:** Verifica que todas las claves requeridas (`chainId`, `nodes`, `rpc_mapping`, etc.) existan para evitar errores por `null`.
*   **Parámetros de la Red y Cadena:**
    *   `chainId`: Debe ser un entero único y no estándar (ej. > 200000).
    *   `blockPeriodSeconds`: Número positivo en un rango razonable (ej. 1-300).
    *   `epochLength`: Número positivo suficientemente grande (ej. > 1000).
    *   `subnet`: Debe ser un CIDR válido (ej. `172.20.0.0/16`).
*   **Configuración de Nodos:**
    *   `nodes[].name`: Nombres alfanuméricos y únicos.
    *   `nodes[].ip`: IPs deben estar en el rango privado de Docker (`172.16.0.0/12`).
*   **Formato de Datos Ethereum:**
    *   `alloc`: Las direcciones deben tener el formato `0x...` y los balances ser números no negativos.
    *   `automated_tests`: Direcciones y valores deben tener el formato y tipo correctos.
*   **Infraestructura:**
    *   Verifica que la imagen de Docker especificada sea válida.
    *   Verifica que los valores de gas sean enteros positivos y razonables (>= 21000).

#### **Nivel 2: Validación de Coherencia Lógica y Topológica (Nuevas Reglas)**

Esta capa es distinta porque no solo mira el formato, sino la **lógica de la red**. Se asegura de que la configuración no solo sea sintácticamente correcta, sino que pueda dar lugar a una blockchain funcional.

**1. Unicidad y Colisiones en la Red (Errores Fatales)**
*   **Nombres de Nodos:** Confirma que `nodes[].name` no esté duplicado.
*   **Direcciones IP:** Confirma que `nodes[].ip` no esté duplicado.
*   **Puertos de Host:** Confirma que no haya puertos de host duplicados en `rpc_mapping` a lo largo de *todos* los nodos.

**2. Viabilidad de la Topología P2P**
*   **Error Fatal:** La red debe tener al menos un nodo con el rol `bootnode` para permitir el descubrimiento de pares.
*   **Advertencia:** Recomienda un número pequeño (1-3) de `bootnodes` si se definen demasiados.

**3. Viabilidad del Consenso (Clique)**
*   **Error Fatal:** La red debe tener al menos un nodo con el rol `validator` para producir bloques.
*   **Error Fatal:** La dirección del validador usada en el génesis (`extraData`) debe pertenecer a un nodo con el rol `validator`.
*   **Advertencia Crítica:** Advierte si el número de validadores es demasiado bajo para mantener el quórum y la tolerancia a fallos (requiere `floor(N/2) + 1` validadores activos).

**4. Coherencia de las Pruebas Automatizadas**
*   **Error Fatal:** El nodo `from_node` especificado en una prueba debe existir en la lista de nodos.
*   **Error Fatal:** El nodo `from_node` debe tener el rol `rpc` para poder recibir la transacción de prueba.
*   **Error Fatal:** El `rpc_endpoint` referenciado en una prueba debe existir en la sección `rpc` del nodo.
*   **Advertencia:** Advierte si la cuenta `from_node` no tiene fondos pre-asignados en `alloc`, ya que la prueba podría fallar por falta de fondos.

### **1. Limpieza y Preparación del Entorno (Idempotencia)**

**Concepto:** El script debe ser idempotente, lo que significa que ejecutarlo múltiples veces produce el mismo resultado. Para lograrlo, el primer paso siempre debe ser limpiar cualquier artefacto de ejecuciones anteriores. Esto garantiza que partimos de un estado conocido y limpio, eliminando conflictos y errores residuales.

**Acciones y Buenas Prácticas:**
*   **Eliminación Segura de Contenedores:** Para evitar borrar accidentalmente otros contenedores Docker, es una excelente práctica etiquetar los contenedores de tu proyecto al crearlos (ej. `--label project=besu-net`). Luego, la limpieza se vuelve precisa y segura:
    ```bash
    # Detiene todos los contenedores con la etiqueta específica
    docker stop $(docker ps -aq --filter "label=project=besu-net")
    ```
*   **Supresión de Errores Inocuos:** Cuando un comando de borrado (como `docker stop` o `docker network rm`) se ejecuta y no encuentra nada que borrar, por defecto devuelve un error y detiene el script. Para evitar esto, se debe suprimir el error y permitir que el script continúe, ya que la ausencia del recurso es el estado deseado.
    ```bash
    # Ejemplo de comando de borrado robusto
    docker network rm besu-network 2>/dev/null || true
    ```
*   **Flujo de Limpieza Completo:**
    1.  Detener y eliminar todos los contenedores Docker etiquetados previamente.
    2.  Eliminar la red Docker específica del proyecto.
    3.  Eliminar por completo los directorios de datos de nodos de la ejecución anterior para asegurar que no se reutilicen claves o datos antiguos (`rm -rf nodes/`).

### **2. Creación de la Red Docker Dedicada**

**Concepto:** Los nodos Besu necesitan un espacio de red virtual y aislado para comunicarse entre sí de forma segura. Crear una red Docker personalizada es esencial para este propósito.

**Acciones y Buenas Prácticas:**
*   **Evitar Conflictos de IP:** Es una práctica recomendada definir una subred que no entre en conflicto con las redes comunes de Wi-Fi (`192.168.x.x`) o corporativas (`10.x.x.x`). Un rango como `172.24.0.0/16` es una opción ideal.
*   **Comando de Creación:** Utiliza `docker network create` para establecer la red. Asignar una etiqueta (`--label`) facilita la gestión y la limpieza posterior.

    ```bash
    # Crea una red llamada 'besu-network' con una subred y etiqueta específicas
    docker network create \
      --subnet=172.24.0.0/16 \
      --label project=besu-project \
      besu-network
    ```

### **3. Generación de Identidades de Nodo**

**Concepto:** Cada nodo en la red requiere una identidad criptográfica única, compuesta por una clave privada y una dirección pública. Aunque Besu puede generar esto automáticamente al arrancar, es crucial que nuestro script las genere explícitamente *antes* de lanzar los nodos. Esto nos da control total sobre las identidades y nos permite usarlas para configurar el `genesis.json` y las `enode URLs`.

**Acciones y Buenas Prácticas:**
*   **Generación Explícita:** Para cada nodo (ej. `nodo1`, `nodo2`, etc.), se debe ejecutar un contenedor Docker efímero (`docker run --rm`) de Besu con el único propósito de generar claves.
*   **¡Exportar las Tres Claves!** Este es un detalle crítico. No basta con la clave privada y la dirección. Para construir la `enode URL` más tarde, se necesita la **clave pública completa** (un hash de 128 caracteres hexadecimales).
    *   **Comando:** `besu public-key export`
    *   **Archivos a guardar:** `key` (clave privada), `address` (dirección pública de 20 bytes) y la **clave pública completa**.
*   **Almacenamiento Local:** Los archivos generados deben almacenarse en directorios locales y estructurados en la máquina anfitriona para su uso posterior.
    ```
    nodes/
    ├── node1/
    │   ├── key      # Clave privada
    │   ├── address  # Dirección (ej: 0x...)
    │   └── public   # Clave pública completa (para enode)
    └── node2/
        └── ...
    ```

### **4. Preparación Dinámica del Fichero `genesis.json`**

**Concepto:** El `genesis.json` es la "partida de nacimiento" de la blockchain. Define el estado inicial de la red, las reglas de consenso y los validadores iniciales. Todos los nodos deben usar exactamente el mismo archivo génesis para pertenecer a la misma red. El script debe generarlo dinámicamente usando las identidades creadas en el paso anterior.

**Acciones y Buenas Prácticas:**
*   **Generación con `cat <<EOL`:** Esta es una forma elegante y legible en Bash para crear un archivo multi-línea.
*   **`chainId`:** Asigna un ID único a tu red (ej. `123999`) para evitar colisiones con otras redes.
*   **Configuración de Consenso (Clique PoA):** Define `blockPeriodSeconds` (tiempo entre bloques) y `epochLength` (bloques entre los cuales se procesan votos de validadores).
*   **Precisión Absoluta en `extraData`:** Este campo es crucial y requiere un formato exacto para definir el sellador (validador) inicial.
    > **Fórmula:** `0x` + 32 bytes de ceros + 40 caracteres hexadecimales de la dirección del validador (leída del archivo `address`, **sin** el prefijo `0x`) + 65 bytes de ceros (reservados para la firma).
    > **Consejo:** Usa el comando `printf` en Bash para generar los ceros de relleno de forma limpia.
*   **`alloc` (Pre-asignación de Fondos):** En esta sección, puedes asignar fondos iniciales a las direcciones de los nodos generados o a cuentas de prueba que usarás con herramientas como MetaMask.

### **5. Preparación Dinámica del Fichero `config.toml`**

**Concepto:** Este es el archivo de configuración principal de cada nodo Besu. El script debe generar una versión de este archivo para cada nodo, personalizando detalles como la lista de bootnodes.

**Acciones y Buenas Prácticas:**
*   **Construcción de la `enode URL`:** Este es un punto donde muchos fallan. El script debe construir esta URL dinámicamente.
    > **Fórmula Exacta:** `enode://<CLAVE_PÚBLICA_COMPLETA_SIN_04_INICIAL>@<IP_ESTÁTICA_DEL_NODO>:<PUERTO_P2P>`
    > **Ejemplo:** `enode://a1b2c3...@172.24.0.11:30303`
    > El script debe leer la clave pública del archivo `public` y combinarla con la IP estática que se le asignará al contenedor del bootnode.
*   **Configuración del `config.toml`:**
    *   **`bootnodes=[]`:** Inserta la `enode URL` del bootnode (o una lista de ellas) en este campo.
    *   **RPC y APIs:** Habilita el servidor RPC (`rpc-http-enabled=true`), define las APIs a exponer (`rpc-http-api=["ETH", "NET", "CLIQUE", "ADMIN"]`), y configura `rpc-http-cors-origins=["*"]` para permitir el acceso desde aplicaciones web.
    *   **Rutas:** Especifica las rutas al `genesis.json` y a los datos del nodo.

### **6. Lanzamiento de los Nodos en Contenedores Docker**

**Concepto:** Con todos los archivos de configuración listos, es hora de lanzar cada nodo Besu en su propio contenedor Docker.

**Acciones y Buenas Prácticas:**
*   **Lanzamiento en Segundo Plano:** Usa `docker run -d` para que los contenedores se ejecuten en segundo plano y el script pueda continuar.
*   **IPs Estáticas:** Asigna una IP estática a cada nodo dentro de la red Docker (`--ip 172.24.0.11`). Esto hace que las `enode URLs` sean predecibles y la configuración de red más estable.
*   **Mapeo de Volúmenes (`-v`):** Esencial para la persistencia. Mapea los directorios de datos locales (`nodes/node1`, `config/`, etc.) a sus correspondientes rutas dentro del contenedor. Esto asegura que los datos de la blockchain y las claves sobrevivan si el contenedor se reinicia.
*   **Mapeo de Puertos (`-p`):** Mapea los puertos **solo** para los nodos que necesitan ser accedidos desde fuera de Docker (ej. el nodo RPC que se conectará a MetaMask). El puerto RPC `8545` del contenedor se puede mapear a un puerto local como `9999` (`-p 9999:8545`). Los nodos internos no necesitan mapeo de puertos, lo que mejora la seguridad.
*   **Mejorar Legibilidad:** Para los comandos `docker run` largos y complejos, usa una barra invertida `\` al final de cada línea para dividirlos. Esto hace el script inmensamente más fácil de leer y depurar.

# **III. La Fase de Pruebas Automatizadas**

**Concepto:** Una vez que los contenedores están en ejecución, el trabajo del script no ha terminado. Esta fase es crucial para **verificar activamente** que la red no solo "existe", sino que está **viva, sana y funcional**. Se ejecuta una batería de pruebas automatizadas que simulan las interacciones básicas que un desarrollador realizaría manualmente. Utilizando herramientas estándar de la línea de comandos como **Bash, `curl`, `jq`** y delegando tareas criptográficas complejas a **Node.js**, este enfoque garantiza una validación completa y confiable.

#### **Buenas Prácticas**

1.  **Espera Inteligente y Sincronizada (No usar `sleep`):**
    El uso de un `sleep` con tiempo fijo es frágil y poco fiable, ya que el tiempo de inicialización de un nodo puede variar. La práctica correcta es implementar un sondeo activo (`polling`). Se debe crear una función que, en un bucle, "pingea" el endpoint RPC del nodo (`net_version` es ideal para esto). El script solo avanza cuando recibe una respuesta HTTP 200, confirmando que el nodo no solo está encendido, sino listo para aceptar peticiones.

2.  **Interacción Nativa con JSON-RPC (El poder de `curl` + `jq`):**
    Para las verificaciones de estado, no se necesita un framework complejo. La combinación de `curl` para realizar las peticiones HTTP y `jq` para construir los payloads JSON y parsear las respuestas es indispensable. Esta dupla permite:
    *   **Construir Peticiones Limpias:** Crear objetos JSON para `eth_getBalance`, `eth_blockNumber`, etc., directamente en la terminal.
    *   **Extraer Datos de Forma Segura:** Parsear las respuestas JSON para obtener valores específicos (`result`, `error`) sin depender de frágiles procesamientos de texto.

3.  **Delegación Criptográfica (El Método Inteligente):**
    Bash no fue diseñado para operaciones criptográficas complejas como la firma de transacciones ECDSA. Intentarlo es inseguro y propenso a errores. La solución elegante es la **separación de responsabilidades**:
    *   **Bash se encarga de la orquestación:** Prepara los datos de la transacción, llama a otros procesos y maneja el flujo general.
    *   **Node.js se encarga de la criptografía:** Se invoca con un script de una sola línea (`-e`) para recibir la transacción no firmada y una clave privada. Usando librerías probadas como `ethers.js`, firma la transacción de forma segura y devuelve la *raw transaction* (cadena hexadecimal).

    > **Prerrequisito:** El entorno de ejecución debe tener Node.js y las librerías necesarias (`ethers`) instaladas a través de `npm` o `yarn` en el directorio que el YAML especifique en "tx_signer_deps_dir"

### **Protocolo de Pruebas Secuenciales**

Las siguientes pruebas deben ejecutarse en orden, ya que cada una valida una capa fundamental de la red antes de pasar a la siguiente.

#### **Test 1: Estabilidad y Disponibilidad de Nodos**

*   **Objetivo:** Asegurarse de que cada nodo RPC de la red esté completamente inicializado y listo para aceptar peticiones, previniendo errores de "conexión rechazada".
*   **Implementación:**
    1.  Se invoca una función `wait_for_node_ready(RPC_URL)` para cada nodo.
    2.  Esta función entra en un bucle `while` que, cada 2 segundos, ejecuta:
        ```bash
        curl -s -o /dev/null -w "%{http_code}" -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' -H "Content-Type: application/json" ${RPC_URL}
        ```
    3.  El bucle termina exitosamente si el código de estado HTTP devuelto es `200`.
    4.  Si un nodo no responde dentro de un timeout predefinido (ej. 30-60 segundos), el script falla con un error, indicando un problema grave en el arranque del nodo.

#### **Test 2: Verificación del Estado Inicial (Génesis)**

*   **Objetivo:** Confirmar que el estado inicial de la blockchain (definido en el bloque génesis) se ha aplicado correctamente.
*   **Implementación:**
    1.  **Número de Bloque:** Se llama a `eth_blockNumber`.
        *   **Aserción:** El número de bloque devuelto (tras convertirlo de hexadecimal a decimal) debe ser `0` o superior.
    2.  **Balances Pre-financiados (`alloc`):** Para cada cuenta especificada en la configuración de génesis:
        *   Se llama a `eth_getBalance` con la dirección de la cuenta.
        *   **Aserción:** El balance devuelto (en Wei) debe coincidir exactamente con el valor configurado en el `genesis.json`. Esto valida que la cadena se inició con el estado económico esperado.

#### **Test 3: Salud de la Conectividad P2P**

*   **Objetivo:** Asegurarse de que los nodos se descubren y conectan entre sí, formando una red P2P funcional.
*   **Implementación:**
    1.  Para cada nodo de la red, se ejecuta una llamada RPC a `net_peerCount`.
    2.  **Aserción:** El resultado debe ser igual al número total de nodos menos uno (`N-1`). Un resultado de `0` en un nodo que no debería estar aislado es una señal de alerta (`log_warning`) que indica un posible problema con la configuración de `bootnodes`, reglas de firewall de Docker o descubrimiento de peers.

#### **Test 4: Prueba de Fuego — Transacción Completa de Extremo a Extremo**

*   **Objetivo:** Realizar una transacción completa para demostrar que la red puede firmar, propagar, minar y finalizar una transferencia de valor, validando el ciclo de vida completo.
*   **Implementación (Flujo Detallado):**
    1.  **Preparación (Bash):**
        *   Se leen los detalles de la transacción de prueba (emisor, receptor, valor) desde un archivo de configuración (`config.yaml`).
        *   Se obtiene el `nonce` actual de la cuenta emisora con `eth_getTransactionCount`.
        *   Se obtiene el `chainId` de la red con `eth_chainId`.
    2.  **Construcción de la Transacción (Bash + jq):** Se ensambla un objeto JSON con todos los parámetros necesarios: `nonce`, `to`, `value` (convertido a Wei), `gasLimit`, `maxFeePerGas`, `maxPriorityFeePerGas` (para EIP-1559) o `gasPrice` (legacy), y `chainId`.
    3.  **Firma Segura (Delegación a Node.js):**
        *   Se invoca a Node.js, pasándole el objeto de transacción y la clave privada del emisor.
        *   El script de `ethers.js` en una línea (`node -e "..."`) instancia un `Wallet`, firma la transacción con `wallet.signTransaction(txObject)` y devuelve la *raw transaction* firmada como una cadena hexadecimal a la salida estándar.
        ```bash
        # Ejemplo conceptual
        RAW_TX=$(node -e "const ethers = require('ethers'); \
                          const wallet = new ethers.Wallet('${PRIVATE_KEY}'); \
                          const tx = ${TX_JSON}; \
                          wallet.signTransaction(tx).then(console.log)")
        ```
    4.  **Envío a la Red (Bash + curl):** La `RAW_TX` capturada se envía al nodo RPC a través del método `eth_sendRawTransaction`. El hash de la transacción devuelto se guarda para el seguimiento.
    5.  **Espera de Confirmación (Polling):**
        *   El script entra en un bucle que llama a `eth_getTransactionReceipt` usando el hash de la transacción.
        *   El bucle persiste hasta que la respuesta deja de ser `null`, lo que indica que la transacción ha sido minada e incluida en un bloque.
    6.  **Verificación Final de Estado:**
        *   Se vuelve a llamar a `eth_getBalance` para las cuentas emisora y receptora.
        *   **Aserción Final:** Se verifica matemáticamente que:
            *   El saldo del receptor ha aumentado en el `value` de la transacción.
            *   El saldo del emisor ha disminuido en el `value` MÁS el coste del gas (`gasUsed * effectiveGasPrice`).

Al completar exitosamente este protocolo, se obtiene una alta confianza en que la red blockchain está configurada correctamente, los nodos están interconectados y el mecanismo de consenso es capaz de procesar transacciones de manera fiable.

# **IV. Creación del Archivo `.env` para el Frontend**

**Concepto:** Para cerrar el círculo y conectar la infraestructura de backend con la aplicación de frontend, la "práctica brillante" final es que el script genere automáticamente el archivo de configuración (`.env`) que los niveles superiores del proyecto necesitarían (la aplicación web Next.js).

**Acciones y Buenas Prácticas:**
*   **Generación Automática:** Al final de una ejecución exitosa, el script debe crear un archivo `.env` en el directorio de la aplicación frontend (ej. `script/env_forwarding/`).
*   **Contenido del Archivo:** Este archivo debe contener las variables de entorno necesarias.
*   **Punto Ciego:** El archivo `.env` generado con una clave privada. Aunque es una práctica común en desarrollo local, es increíblemente peligroso. Un desarrollador podría accidentalmente comitear el archivo `.env` a Git, exponiendo la clave privada.
    *   **Generar `.gitignore`:** Cuando el script genere el archivo `.env`, debe verificar si el archivo `.gitignore` del frontend ya contiene una entrada para `.env`. Si no, debe añadirla automáticamente.
    *   **Imprimir una Gran Advertencia:** Después de generar el archivo, imprimir un mensaje grande y en rojo/amarillo.
*   **Advertnecia:** Incluir la URL del RPC principal (`NEXT_PUBLIC_RPC_URL=http://localhost:9999`) y la clave privada de una de las cuentas de prueba (`PRIVATE_KEY=0x...`).
*   **Convención de Next.js:** Para que las variables sean accesibles en el navegador, Next.js requiere que tengan el prefijo `NEXT_PUBLIC_`. Las claves secretas que solo deben usarse en el lado del servidor (API routes) no deben llevar este prefijo.

    ```dotenv
    # Archivo .env generado automáticamente
    
    # Clave privada para firmar transacciones en el backend (API Routes). No exponer al cliente.
    PRIVATE_KEY=0x...
    
    # URL del RPC para que el frontend (MetaMask, etc.) se conecte a la red.
    NEXT_PUBLIC_RPC_URL=http://localhost:9999
    ```
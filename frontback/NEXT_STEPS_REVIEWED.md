## 🚨 **SPRINT 1: Solución del Bug Crítico del Faucet**

### **Mi Análisis del Estado Actual**
Mirando el código del faucet en `/api/faucet/route.ts`, veo que está usando ethers.js correctamente, pero hay varios puntos sospechosos. El faucet hace `await tx.wait()` lo cual debería confirmar la transacción, pero claramente algo está fallando en la propagación. Mi hipótesis principal es que hay un problema con la configuración de gas o con el estado del nonce entre transacciones múltiples.

### **Mi Plan de Ataque**
1. **Implementar logging exhaustivo** - Necesito ver exactamente qué está pasando en cada step de la transacción
2. **Verificar configuración de gas** - Puede que `gasLimit: 21000` sea insuficiente para el network
3. **Revisar estado del nonce** - Ethers.js maneja esto automáticamente, pero en redes privadas a veces hay inconsistencias
4. **Testear con diferentes cuentas** - Para descartar problemas específicos de direcciones

### **Lo que necesito de ti para este SPRINT**:
- **¿Tienes acceso a los logs de Besu?** Necesito ver si las transacciones están llegando al nodo
- **¿Cuál es la configuración exacta de gas en tu red?** (gasPrice, gasLimit defaults)
- **¿Hay algún middleware o proxy entre el frontend y Besu?** 
- **¿Tienes el private key del faucet con suficiente balance?** (para verificar)

### **Recursos que necesito**:
- Acceso a logs de Besu (si es posible)
- Confirmación de que el nodo está corriendo y sincronizado
- Balance actual del faucet address

### **Cómo prefiero que me promptees**:
```
"SPRINT 1 - Debugging Faucet
Logs de Besu: [aquí los logs si los tienes]
Configuración de gas: gasPrice=X, gasLimit=Y
Balance del faucet: X.X ETH
¿Algún middleware?: Sí/No
Procede a debuggear el faucet."
```

## 🏗️ **SPRINT 2: Arquitectura Multi-Red Base**

### **Mi Análisis del Estado Actual**
El código actual está hardcodeado para una sola red. Necesito reestructurar completamente la arquitectura para manejar múltiples redes. El challenge más grande es que cada red tiene su propio RPC endpoint, private keys, y configuración. Mi estrategia será usar React Context para gestionar el estado global y localStorage para persistir las configuraciones.

### **Mi Plan de Ataque**
1. **Crear NetworkContext** - Para manejar el estado global de redes
2. **Reestructurar APIs** - Para que reciban networkId como parámetro
3. **Implementar selector de red** - Componente dropdown en el header
4. **Sistema de configuración** - Para almacenar/cargar configuraciones de red

### **Lo que necesito de ti para este SPRINT**:
- **¿Cómo identificas una red?** (¿por chainId? ¿por nombre? ¿por puerto?)
- **¿Qué información mínima necesitas para definir una red?** (RPC URL, privkey, nombre, etc.)
- **¿Dónde prefieres almacenar las configuraciones?** (localStorage, archivo, base de datos)
- **¿Hay algún límite en el número de redes?** (para UI considerations)

### **Recursos que necesito**:
- Estructura JSON ejemplo de configuración de red
- Iconos/indicadores para diferentes tipos de red (mainnet, testnet, private)
- Colores/temas para diferenciar redes visualmente

### **Cómo prefiero que me promptees**:
```
"SPRINT 2 - Multi-Red Architecture
Ejemplo de configuración de red: {JSON aquí}
Límite de redes: X redes máximo
Almacenamiento preferido: localStorage/file/db
Iconos: [adjuntar archivos SVG/PNG]
Procede con la arquitectura multi-red."
```

## 📊 **SPRINT 3: Visualización Central de Bloques**

### **Mi Análisis del Estado Actual**
El componente `BlockExplorer` actual es muy básico. Para la visualización "ciempiés" necesito reescribir completamente este componente. Mi mayor preocupación es el rendimiento - si hay muchos bloques, el re-rendering podría ser costoso. Voy a usar React virtualization y optimizar con useMemo/useCallback.  Bueno o ono. A lo mejor no hace falta tatna sofisticacion. El documento de requisitos menciona una animación de cascada fluida (🔴), lo que confirma que el rendimiento es clave... Pero nose. Como tu veas.

### **Mi Plan de Ataque**
1.  **Diseñar el layout de "tiras"** - Bloques como líneas finas (sin pasarse) apiladas verticalmente en la columna central de la pantalla, dema´s widgets as ualreddeor. Para esto tendra que reducirse un poco el tamaño en general de los ltierales.
2.  **Implementar la animación "Ciempiés"** - Los nuevos bloques aparecen arriba y empujan a los viejos hacia abajo. Buscaré un efecto de cascada donde los bloques superiores se mueven ligeramente más rápido.
3.  **Bloque en minado** - Crear un estado especial en la parte superior para el bloque actual, con un parpadeo suave, como queestá gestandose sabes? Un ritmo acompasado, como un pulso suave.
4.  **Contador de tiempo y progreso** - A la derecha del bloque en minado, un contador numérico de segundos. A la izquierda, un indicador circular de progreso. Blancos ambos.

### **Lo que necesito de ti para este SPRINT**:
-   **¿Cuál es tu tiempo de bloque configurado?** (para el timer circular y el contador numérico 🟢) Pues depende, lo congiuras cuando creas una red. Y la que viene de partida por el .env que nos trasalda script.sh (leete el README de /script que lo deja bastante claro) esa ya lo trae confgurado.
-   **¿Qué información quieres mostrar en cada "tira" de bloque ya minado?** (número, hash, txs, etc. 🟢) solo el numero de hash en el medio
-   **¿Cuántos bloques máximo en pantalla?** (para optimizar el rendimiento de la virtualización 🟢) tantos como quepan segun la latura que la hayas dado
-   **¿Prefieres WebSocket o polling?** (para los updates en tiempo real de nuevos bloques 🟢) tu eliges

### **Recursos que necesito**:
-   **SVG para el indicador circular de progreso** (para el timer visual 🔴) te paso un SVG en blanco pero tiene que ser animado sabes, que se vaya sabes como un contador cicralr que vap erindeo area por el radio que pasa... me eplxic¿?
-   **Colores específicos para los diferentes estados**:
    -   Bloque normal (confirmado) 🟢 lo tienes en assets, escoge el color
    -   Bloque en minado (el requisito menciona un parpadeo suave entre un azul más transparente y uno más opaco 🔴)
-   **Medidas exactas** (altura de tira, spacing, etc. 🟢) tambien lo tienes en assets, escoge el color libremente

## 🔧 **SPRINT 4: Panel de Gestión de Nodos**

### **Mi Análisis del Estado Actual**
Este es completamente nuevo. Necesito integrar con besu-sdk para obtener información de nodos. Mi mayor incertidumbre es cómo besu-sdk expone la información de nodos - necesito entender la API exacta, de hecho no se ni si es posible... al o mjero con ehters... se tendira que ver, pero si no lo fuera, no nos desanimemos eh, ivnestigalo sin afán, a ver si se puede. y lo hacmeos. Eso sí, no se sis motrar dmeiada informacion de cada nodo, pero minimo "nodo" y "dinero", y os requisitos confirman que este panel es central para cada red y que la creación dinámica de nodos (`+` botón) es una funcionalidad MUY CRITICA 🟢. De hecho ver el estado , poder apgarlos, eliminarlos, crearlos... en el fondo son VMs.

### **Mi Plan de Ataque**
1.  **Investigar API de besu-sdk** - Para obtener la lista de nodos y su información (Nombre, Saldo ETH, Tipo,... datoas deben aparecer).
2.  **Crear NodeSelector component** - Un dropdown que muestre Nombre, Saldo y Tipo de cada nodo para una selección rápida.
3.  **Implementar visualización de tipos** - Usar SVGs (frontback/assets y colores para diferenciar Validador, Normal, RPC y Bootnode.
4.  **Formulario de creación** - Para deployar nuevos nodos a la red activa.

Al crear la neuva netowrk deberia n pdoer ponerse, y en el dahsboard deberia encontrarla forma de verlos.

### **Lo que necesito de ti para este SPRINT**:
-   **¿Cómo obtengo la lista de nodos con besu-sdk?** (métodos específicos para obtener la lista completa por red 🟢)
-   **¿Qué información de nodo está disponible vía API?** (Necesito confirmar que puedo obtener **Nombre, Saldo en ETH y Tipo de Nodo** 🟢)
-   **¿Cómo creo un nuevo nodo dinámicamente?** (pasos y configuración para el formulario de creación 🟢)
-   **¿Hay diferencias entre validador/normal/RPC/bootnode?** (a nivel de API de besu-sdk o de su configuración 🟡)

### **Recursos que necesito**:
-   **SVG para cada tipo de nodo:** 🟡
    -   **Validador:** assets/white-node
    -   **Normal:** assets/grey-node
    -   **RPC:** any node can be rpc so we have marine-node-rpc and white-node-rpc grey-node-rpc
    -   **Bootnode:** assets/marine-node
-   **Documentación de besu-sdk** relevante para la gestión de nodos.
-   **Colores exactos** para cada tipo de nodo.

### **Cómo prefiero que me promptees**:
```
"SPRINT 4 - Panel de Nodos
Métodos besu-sdk: [documentación/ejemplos]
Información disponible: [Nombre, Saldo ETH, Tipo, etc.]
Proceso creación: [pasos detallados]
Recursos: [adjuntar SVGs de nodos, colores específicos]
Procede con el panel de nodos."
```

## 🦊 **SPRINT 5: Integración MetaMask**

### **Mi Análisis del Estado Actual**
Necesito implementar Web3 wallet connection. Mi plan es usar `window.ethereum`. El challenge principal es manejar los dos contextos: **Admin** (suplantando nodos del servidor) vs **Usuario** (usando MetaMask). El documento de requisitos confirma este sistema dual como una pieza central 🟢, así que mi plan de crear un Context de React para manejar la identidad activa es el correcto.

### **Mi Plan de Ataque**
1.  **Implementar conexión MetaMask** - Botón de conexión, detección de wallet, manejo de estados (conectado/desconectado).
2.  **Crear sistema dual de identidad** - Un Context de React para manejar si el `signer` activo es un nodo (Admin) o una cuenta de MetaMask (Usuario).
3.  **Modificar APIs de transacción** - Para aceptar firmas del `signer` activo, sea cual sea su origen.
4.  **Indicador visual de identidad** - Mostrar en la barra superior qué identidad está operando, ej: `"Operando como: Nodo Validador 1"` o `"Operando como: 0x123...abc (MetaMask)"`.

### **Lo que necesito de ti para este SPRINT**:
-   **¿Qué acciones puede hacer solo el Admin?** (crear nodos, faucet, suplantar otros nodos 🟢)
-   **¿Qué acciones puede hacer el Usuario?** (transferir ETH desde su cuenta, consultar balances 🟢)
-   **¿Cómo manejas la autorización?** (¿Debo implementar checks en el cliente o se validará todo en el servidor? 🟢)
-   **¿Hay alguna restricción de red?** (Confirmo que MetaMask debe estar en la misma red que el nodo RPC para interactuar 🟢)

### **Recursos que necesito**:
-   **Icono de MetaMask** (SVG para el botón de conexión 🟢)
-   **Iconos para Admin/Usuario** (para el indicador de identidad en la barra superior 🟢)
-   **Colores para diferentes estados** (conectado, desconectado, modo admin 🟡)

### **Cómo prefiero que me promptees**:
```
"SPRINT 5 - MetaMask Integration
Permisos Admin: [crear nodos, faucet, gestión]
Permisos Usuario: [transferir, consultar]
Autorización: server-side/client-side
Restricciones: [red, cuentas, etc.]
Recursos: [SVG MetaMask, iconos Admin/Usuario]
Procede con MetaMask."
```

## 🎨 **SPRINT 6: Estilizado Profesional Tipo Battle.net**

### **Mi Análisis del Estado Actual**
El CSS actual es muy básico con Tailwind. Para lograr el look "Battle.net", necesito implementar un sistema de diseño más sofisticado. Mi plan es usar variables CSS para los colores y gradientes. El documento de requisitos especifica una paleta de "tonos azules oscuros, detalles en azul claro y blanco" 🟡 y una barra superior multifuncional, lo cual guiará mi trabajo.

### **Mi Plan de Ataque**:
1.  **Crear sistema de colores** - Variables CSS para el tema completo, basadas en la paleta de azules oscuros, azul claro y blanco.
2.  **Rediseñar header** - Crear una barra superior que contenga el **Selector de Red**, el **Indicador de Identidad** y el **Toggle de Vista (Dashboard/Terminal)**.
3.  **Mejorar layout** - Asegurar una distribución proporcionada y equilibrada, eliminando espacios muertos como se solicita.
4.  **Implementar efectos** - Añadir sombras, gradientes y hover states para lograr una estética profesional y dinámica.

### **Lo que necesito de ti para este SPRINT**:
-   **¿Tienes referencias visuales específicas?** (screenshots de Battle.net o mockups que ejemplifiquen el estilo 🟡)
-   **¿Cuál es la paleta exacta de colores?** (hex codes para los azules oscuros, azul claro y blanco 🟡)
-   **¿Hay algún elemento específico que quieras destacar?** (ej. el botón de conectar MetaMask, el panel de Faucet, etc. 🟢)
-   **¿Prefieres gradientes o colores planos para los fondos y paneles?** 🟡

### **Recursos que necesito**:
-   **Paleta de colores exacta** (hex codes para cada tono 🟡)
-   **Referencias visuales** (screenshots/mockups 🟡)
-   **Tipografía preferida** (fuentes específicas o confirmo si debo usar una fuente de sistema moderna 🟢)
-   **Iconos del header** (para el selector de vista Dashboard/Terminal 🟢)

### **Cómo prefiero que me promptees**:
```
"SPRINT 6 - Estilizado Battle.net
Paleta: [#123456, #789ABC, etc.]
Referencias: [adjuntar screenshots/mockups]
Tipografía: [fuente específica o usar default]
Recursos: [iconos header, efectos específicos]
Procede con el estilizado."
```

## 💻 **SPRINT 7: Terminal Integrada**

### **Mi Análisis del Estado Actual**
Necesito crear una vista completamente nueva que sea alternativa al dashboard. Mi challenge principal es obtener los logs de besu-sdk en tiempo real. Los requisitos especifican que debe ser una vista a pantalla completa con un estilo de texto coloreado y una animación de "escritura" 🔴, lo que añade complejidad.

### **Mi Plan de Ataque**:
1.  **Crear componente Terminal** - Vista fullscreen que se activa con un toggle en la barra superior.
2.  **Implementar sistema de logs** - Conexión con besu-sdk para obtener logs en tiempo real.
3.  **Estilizado terminal** - Fondo oscuro, fuente mono, y texto con sintaxis coloreada (tonos de azul, verde, blanco) al estilo `@script.sh`.
4.  **Implementar "Typing Effect"** - Renderizar cada nueva línea de log letra por letra para un efecto dinámico.

### **Lo que necesito de ti para este SPRINT**:
-   **¿Cómo accedo a los logs de besu-sdk?** (API, archivos, streaming en tiempo real 🟢)
-   **¿Qué tipos de logs existen?** (debug, info, warn, error - para la colorización 🟡)
-   **¿Hay algún filtro específico que deba implementar?** (por nodo, por tipo de log 🟡)
-   **¿Confirmas que los logs deben ser en tiempo real?** (en lugar de bajo demanda 🟢)

### **Recursos que necesito**:
-   **Ejemplos de logs** (para el parsing y definir las reglas de colorización 🟡)
-   **Colores específicos** para cada tipo de log (ej. verde para INFO, rojo para ERROR, etc. 🟡)
-   **Icono toggle** (para el switch Dashboard ↔ Terminal en la barra superior 🟢)

### **Cómo prefiero que me promptees**:
```
"SPRINT 7 - Terminal
Acceso a logs: [API/archivos/streaming]
Tipos de logs: [debug, info, warn, error]
Filtros: [por nodo, tipo, timestamp]
Ejemplos: [adjuntar samples de logs]
Colores: [#verde para info, #rojo para error, etc.]
Procede con la terminal."
```

## 🎭 **SPRINT 8: Animaciones y Efectos Visuales**

### **Mi Análisis del Estado Actual**
Este es el sprint más "estético" y complejo visualmente, clasificado como de alta complejidad (🔴) en los requisitos. Las animaciones CSS/JS pueden ser costosas, especialmente la "ciempiés". Voy a usar CSS `transform` y `opacity` para optimizar el rendimiento y evitar repaints.

### **Mi Plan de Ataque**:
1.  **Animación ciempiés** - Usar CSS keyframes con `transform` para la animación de cascada de los bloques.
2.  **Bloque minando** - Implementar un parpadeo suave con `opacity` y `transitions` entre un azul transparente y opaco.
3.  **Timer circular** - Animar el SVG del timer para que se vaya "agotando" visualmente.
4.  **Feedback multi-red** - Crear micro-animaciones (resplandor suave o un pico) para indicar cuando una red en segundo plano mina un bloque.
5.  **Typing effect** - Implementar el renderizado controlado letra por letra para la terminal.

### **Lo que necesito de ti para este SPRINT**:
-   **¿Qué velocidad prefieres para las animaciones?** (rápido, medio, lento 🔴)
-   **¿Hay alguna animación que consideres opcional?** (todas están marcadas como 🔴, necesito saber la prioridad en caso de problemas de rendimiento).
-   **¿Prefieres efectos sutiles o más llamativos?** (el requisito menciona "suave" para el parpadeo y resplandor, lo que sugiere sutileza 🔴)
-   **¿Hay dispositivos móviles que considerar?** (para ajustar la complejidad de las animaciones según las constraints de performance 🔴)

### **Recursos que necesito**:
-   **SVG para timer circular** (que sea animable, ej. con un `stroke-dasharray` 🔴)
-   **SVG para micro-animaciones** (para el feedback multi-red, si se opta por un icono en lugar de un resplandor 🔴)
-   **Referencia de velocidades** (ejemplos de timing que te gusten 🔴)
-   **Colores para efectos** (color exacto del resplandor, del parpadeo, etc. 🔴)

### **Cómo prefiero que me promptees**:
```
"SPRINT 8 - Animaciones
Velocidad: rápido/medio/lento
Prioridad: [cuáles son must-have vs nice-to-have]
Sutileza: sutil/llamativo
Constraints: [mobile, performance, etc.]
Recursos: [SVG timer, efectos, colores específicos]
Procede con las animaciones."
```
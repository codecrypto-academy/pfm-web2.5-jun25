1.  **¿Cuál es el orden cronológico ESTRICTO y correcto para desplegar una red Besu funcional con múltiples nodos desde cero?**
    (a) 1. Crear red Docker. 2. Generar claves para todos los nodos. 3. Crear `genesis.json` usando esas claves. 4. Lanzar `nodo1` (bootnode). 5. Lanzar `nodo2` usando el `enode` de `nodo1`.
    (b) 1. Lanzar `nodo1`. 2. Crear `genesis.json`. 3. Crear red Docker. 4. Generar claves. 5. Lanzar `nodo2`.
    (c) 1. Crear `genesis.json`. 2. Lanzar todos los contenedores vacíos. 3. Usar `docker exec` para generar claves y configurar cada nodo. 4. Reiniciar todos los nodos.

2.  **Un `full node` de Ethereum tarda días en sincronizar, pero un `archive node` tarda aún más y ocupa mucho más espacio. ¿Cuál es la diferencia clave en lo que almacenan?**
    (a) Un `full node` solo guarda el estado más reciente de la blockchain y poda (elimina) los estados intermedios. Un `archive node` guarda una instantánea del estado completo de la blockchain después de **cada bloque**, permitiendo consultar saldos o estados de contratos en cualquier punto del pasado.
    (b) Un `archive node` almacena también la mempool histórica de cada bloque.
    (c) Un `archive node` almacena una copia de toda la blockchain por cada validador, para mayor redundancia.

3.  **Si un "Full Node" en una red Clique recibe un bloque de un Validador y, al re-ejecutar las transacciones, obtiene un hash de estado diferente al propuesto, el nodo:**
    (a) Rechaza el bloque, lo descarta, y espera a que otro Validador proponga un bloque válido para esa misma altura de bloque.
    (b) Acepta el bloque pero marca al Validador como "no fiable", reduciendo su prioridad en futuras conexiones.
    (c) Entra en un estado de "conflicto" y solicita una votación a los demás nodos para decidir cuál es el estado correcto.

4.  **¿Qué funcionalidad clave habilita la creación automática de un fichero `.env` en la carpeta `/frontback` por parte del `script.sh` de despliegue?**
    (a) Permite que la aplicación frontend de Next.js conozca la clave privada de un nodo (ej. `nodo1`) y la URL del RPC sin necesidad de configuración manual, facilitando funcionalidades como un "Admin Faucet".
    (b) Configura las variables de entorno de Docker para que los contenedores arranquen más rápido.
    (c) Es necesario para que la librería de TypeScript (`/lib`) pueda encontrar los scripts de Bash en la carpeta `/script`.

5.  **Dentro del `config.toml` de un `nodo2`, se establece `bootnodes=["enode://<key>@176.45.10.2:30303"]`. ¿Qué representa la dirección IP `176.45.10.2`?**
    (a) La dirección IP **interna** del contenedor de `nodo1` dentro de la red virtual de Docker.
    (b) La dirección IP del PC anfitrión en la LAN.
    (c) La dirección IP pública del `nodo1` en Internet.

6.  **Se lanza un `nodo1` con `-p 9999:8545`. Se lanza un `nodo2` con `-p 9998:8545`. Ambos son parte de la misma red Clique. Un usuario envía una transacción a `nodo1` a través de `localhost:9999`. Inmediatamente, hace una consulta `eth_getTransactionReceipt` a `nodo2` a través de `localhost:9998`. ¿Qué es más probable que reciba como respuesta?**
    (a) `null`, porque aunque la transacción haya llegado a la mempool de `nodo1`, tomará tiempo (el `blockPeriodSeconds`) para que sea incluida en un bloque y ese bloque sea propagado y procesado por `nodo2`.
    (b) El recibo de la transacción, ya que la propagación en una red Docker local es instantánea.
    (c) Un error, porque no se puede consultar el recibo de una transacción en un nodo diferente al que la recibió.

7.  **¿Qué combinación de flags en un comando `docker run` para un nodo Besu le asigna simultáneamente los roles de "Bootnode", "Validador inicial" y "RPC Node"?**
    (a) Se necesita el `enode` del nodo en el flag `--bootnodes` de los *otros* nodos, la dirección del nodo en el `extraData` del `genesis.json`, y el flag `-p` para mapear su puerto RPC.
    (b) Solo es necesario el flag `-p 8545:8545`, ya que exponer el puerto RPC lo convierte automáticamente en el nodo principal para todos los propósitos.
    (c) Se necesita `--bootnodes` apuntando a sí mismo, la dirección del nodo en el `extraData` del `genesis.json`, y `-p` para mapear el puerto RPC.

8.  **¿Cuál afirmación sobre la generación y uso de claves en Besu/Ethereum es CIERTA?**
    (a) La clave privada de un nodo se genera siempre en frío, fuera de la blockchain, y se puede importar en Metamask para gestionar la cuenta asociada desde una interfaz de usuario.
    (b) La generación de una nueva cuenta (clave privada/pública) requiere una conexión a un nodo sincronizado para registrar la nueva dirección en la blockchain.
    (c) Debido al "problema del cumpleaños", es probable que al generar un millón de claves, dos de ellas sean idénticas, por lo que las DApps deben verificar la unicidad de las direcciones.

9.  **En el contexto de redes, ¿cuál de las siguientes afirmaciones sobre `127.0.0.1` es FALSA?**
    (a) Es parte del rango de direcciones IP privadas Clase A (`10.x.x.x`) y es asignada por el router a la primera máquina que se conecta a la red.
    (b) Es una dirección de loopback que cada ordenador utiliza para referirse a sí mismo.
    (c) El tráfico destinado a `127.0.0.1` nunca sale a la red local (LAN), permaneciendo siempre dentro de la máquina que lo origina.

10. **En una red Clique con un solo validador, este propone añadir un segundo validador. ¿Qué ocurre con la votación?**
    (a) La propuesta es aceptada inmediatamente, ya que el voto del único validador existente constituye el 100% (>50%) de la mayoría requerida.
    (b) La propuesta queda pendiente hasta que un segundo validador se una por otros medios y pueda votar.
    (c) La propuesta es rechazada, ya que se necesita un mínimo de dos votos afirmativos para cualquier cambio en la gobernanza.

11. **Escenario: Tienes dos redes Docker independientes, `red-A` (con subred `172.20.0.0/16`) y `red-B` (con subred `172.21.0.0/16`). ¿Es posible tener nodos que pertenezcan a la **misma blockchain** (mismo `Chain ID`) pero que vivan en estas dos redes Docker diferentes?**
    (a) Sí, pero requeriría una configuración de red avanzada, como exponer los puertos P2P (30303) de los nodos a internet y configurarlos para que se encuentren usando IPs públicas, en lugar de nombres de contenedor.
    (b) No, porque los nodos de una misma blockchain deben residir obligatoriamente en la misma subred L2 para poder comunicarse.
    (c) No, porque el `Chain ID` está directamente vinculado a la subred de Docker en la configuración de Besu.

12. **Se está diseñando la topología de una red PoA para una aplicación financiera. Se decide tener un `bootnode` dedicado (sin rol de validador ni RPC), un `validador` dedicado (sin rol de RPC ni bootnode) y un `nodo-RPC` dedicado (sin rol de validador ni bootnode). Al lanzar el `validador`, ¿cuál de las siguientes configuraciones de `docker run` es la más correcta y segura?**
    (a) `docker run ... --bootnodes="enode_del_bootnode"` y la dirección del `validador` en el `extraData` del `genesis.json`, sin mapeo de puertos (`-p`).
    (b) `docker run ... -p 8545:8545 --bootnodes="enode_del_RPC"` y la dirección del `validador` en el `extraData` del `genesis.json`.
    (c) `docker run ... --bootnodes="enode_del_bootnode"` y la clave privada del `validador` en el `extraData` del `genesis.json` para auto-autorización.

13. **Un desarrollador ejecuta su frontend de Next.js, que escucha en `localhost:3000`. ¿Qué afirmación es la más precisa sobre la accesibilidad de esta aplicación?**
    (a) Solo otros programas en el mismo ordenador pueden acceder a la aplicación a través de `localhost:3000`, ya que `localhost` es una dirección de loopback que no sale a la red local.
    (b) La aplicación es accesible desde cualquier dispositivo en internet, siempre que conozcan la IP pública del desarrollador y el puerto 3000.
    (c) Cualquier dispositivo conectado a la misma red WiFi (LAN) puede acceder a la aplicación escribiendo `localhost:3000` en su navegador.

14. **¿Por qué es una buena práctica de seguridad NO exponer el puerto RPC (con `-p`) de todos los nodos de la red?**
    (a) Para seguir el "Principio de Mínimo Privilegio", reduciendo la superficie de ataque al exponer solo los nodos que estrictamente necesitan ser contactados desde el exterior.
    (b) Para reducir el consumo de ancho de banda de la red Docker.
    (c) Para evitar que los nodos no-RPC se conviertan accidentalmente en bootnodes.

15. **¿Por qué el software cliente de Ethereum (como Geth) guardaba los ficheros `keystore` en un directorio de datos específico (ej. `/data/keystore`) y por qué se usaba el flag `-v` de Docker para mapearlo?**
    (a) Para que el propio software cliente pudiera acceder a las claves y firmar transacciones automáticamente, una función que ahora delegan en carteras como Metamask. El mapeo (`-v`) aseguraba que estas claves persistieran en el PC anfitrión si el contenedor se eliminaba.
    (b) Era una base de datos pública de todas las claves de la red, y el mapeo (`-v`) permitía que otros nodos la leyeran para verificar identidades.
    (c) Los ficheros `keystore` contenían la configuración de la red, no las claves, y el mapeo (`-v`) permitía una configuración centralizada.

16. **En el comando `besu ... --data-path=/data/n1 --to=/data/n1/addr`, el flag `--to` sirve para:**
    (a) Guardar la dirección Ethereum legible por humanos en un fichero de texto plano, como una conveniencia adicional a los ficheros de clave.
    (b) Especificar el destino de la base de datos de la blockchain.
    (c) Indicar la dirección del bootnode al que debe conectarse.

17. **La comunicación P2P de Ethereum (el "gossip") se realiza sobre:**
    (a) Principalmente sobre **TCP**, que garantiza una entrega de datos ordenada y fiable, fundamental para que los bloques y las transacciones se reconstruyan correctamente.
    (b) Un protocolo propietario de la Ethereum Foundation que reemplaza a la pila TCP/IP.
    (c) Principalmente sobre UDP para una transmisión rápida de bloques, sacrificando la fiabilidad en la entrega.

18. **¿Cómo se propaga la información sobre un nuevo nodo en la red después de que contacta al bootnode?**
    (a) A través de un cotilleo en cascada: el bootnode se lo dice a sus vecinos, y estos a sus otros vecinos, propagando la información de forma descentralizada.
    (b) El bootnode envía un mensaje de broadcast a todos los nodos de la red para informarles.
    (c) El nuevo nodo es responsable de contactar a todos los demás nodos uno por uno.

19. **Un alumno sigue el consejo de usar un "Docker-only Path". ¿Qué significa esto en la práctica para la configuración de su entorno de desarrollo?**
    (a) Que no necesita instalar Besu ni una Java Development Kit (JDK) en su máquina anfitriona; todas las interacciones con Besu, incluida la generación de claves, se realizan a través de comandos `docker run` utilizando la imagen oficial de Besu.
    (b) Que debe instalar una versión específica de Docker (Docker Pro) que incluye el binario de Besu.
    (c) Que todo el proyecto, incluido el frontend de Next.js y la librería de TypeScript, debe ejecutarse dentro de un único contenedor Docker.

20. **¿Cuál es la relación entre la contraseña de Metamask y la `seed phrase`?**
    (a) Son independientes. La `seed phrase` es la clave maestra para la recuperación total. La contraseña es una clave local que simplemente encripta/desencripta los datos de la cartera en un dispositivo específico para la comodidad del día a día.
    (b) La `seed phrase` se genera a partir de la contraseña la primera vez que se crea la cartera.
    (c) La contraseña es el "nombre de usuario" y la `seed phrase` es la "contraseña" para acceder a los servidores de Metamask.

21. **¿Qué problema fundamental resuelve un "Admin Faucet" que firma transacciones desde el backend (leyendo una clave privada de un `.env`) en lugar de usar Metamask?**
    (a) Evita que el usuario final necesite tener fondos en su propia cuenta para pagar el gas de la transacción de "solicitar fondos", rompiendo el problema del "huevo y la gallina".
    (b) Es más rápido porque evita la sobrecarga de la extensión de Metamask.
    (c) Es más seguro porque la clave privada se almacena en el backend en lugar del navegador.

22. **Un `config.toml` especifica `rpc-http-cors-origins=["*"]`. ¿Qué implicación de seguridad tiene esta configuración?**
    (a) Permite que cualquier página web cargada en un navegador pueda realizar peticiones al puerto RPC del nodo, lo cual es conveniente para el desarrollo pero peligroso en producción si el puerto está expuesto a Internet.
    (b) Ninguna, es una configuración estándar y segura para producción.
    (c) Encripta todo el tráfico RPC usando el certificado comodín (`*`).

23. **La tutoría menciona que añadir un nodo validador a Clique "no es tan trivial". ¿Qué complejidad introduce en comparación con añadir un nodo normal?**
    (a) Requiere un proceso de gobernanza on-chain: los validadores existentes deben votar para proponer y autorizar la dirección del nuevo validador.
    (b) Requiere una configuración de hardware mucho más potente.
    (c) Requiere una modificación del `genesis.json`, lo cual es una operación delicada.

24. **En el `extraData` del `genesis.json` para Clique, se inserta la dirección de un validador. ¿Por qué es crucial el formato exacto de `0x` + 64 ceros + dirección sin `0x` + 130 ceros?**
    (a) Es la estructura que el cliente Besu espera: 32 bytes de relleno (vanity), seguidos de los 20 bytes de la dirección del validador, y finalmente 65 bytes reservados para la firma del bloque, que se dejan en cero en el génesis.
    (b) Es una convención estética para que el campo `extraData` tenga siempre la misma longitud.
    (c) Los primeros 64 ceros son para la clave pública del validador y los últimos 130 para la firma inicial.

25. **La URL `enode://` es un identificador P2P. ¿Qué componente de esta URL garantiza la identidad criptográfica del nodo?**
    (a) El `node-id`, que es la clave pública hexadecimal del nodo.
    (b) La dirección IP, que es única en la red.
    (c) El número de puerto P2P (ej. 30303).

26. **Si una `seed phrase` de 512 bits se usa para generar la clave maestra de una cartera HD, ¿qué afirmación es correcta?**
    (a) La `seed phrase` (las palabras mnemotécnicas) es una representación legible de una entropía inicial, que mediante un algoritmo (PBKDF2) se convierte en una `seed` binaria de 512 bits, que a su vez genera la clave maestra y el chain code.
    (b) La frase de recuperación (seed phrase) y la clave maestra son la misma cosa, simplemente representadas de forma diferente (palabras vs. binario).
    (c) La clave maestra también tiene 512 bits, y de ella se deriva una única clave privada de 256 bits.

27. **Un "Full Node" en Ethereum Mainnet quiere sincronizarse desde cero. ¿Por qué este proceso puede tardar días o incluso semanas?**
    (a) Porque debe descargar toda la historia de la blockchain (todos los bloques desde el génesis) y, lo que es más lento, re-ejecutar cada una de las millones de transacciones de la historia para verificar y construir el estado actual de forma independiente.
    (b) Porque la velocidad de descarga está limitada por la Ethereum Foundation para evitar la sobrecarga de la red P2P.
    (c) Porque el nodo debe resolver un complejo puzzle criptográfico (minería) por cada bloque histórico que descarga para demostrar que está haciendo el trabajo correctamente.

28. **Se desea crear un contenedor Docker vacío y, una vez en ejecución, "instalar" Besu y configurarlo como un nodo. ¿Cuál es el principal obstáculo técnico y conceptual de este enfoque en comparación con el `docker run hyperledger/besu` directo?**
    (a) Aunque es posible instalar Besu con `docker exec` y un gestor de paquetes, se pierde la ventaja clave de la contenedorización: la portabilidad y la reproducibilidad declarativa que ofrece una imagen pre-construida (Dockerfile). La configuración se volvería manual e imperativa.
    (b) Es imposible, ya que los contenedores se basan en imágenes inmutables y no se puede instalar software nuevo en un contenedor en ejecución.
    (c) El rendimiento de Besu sería significativamente menor, ya que no estaría optimizado para el kernel del sistema operativo del contenedor base (ej. Alpine o Ubuntu).

29. **El estándar BIP-44 define una "ruta de derivación" como `m/purpose'/coin_type'/account'/change/address_index`. Para Ethereum, esta suele ser `m/44'/60'/0'/0/x`. ¿Qué representa el número `60` en esta ruta?**
    (a) El **identificador único asignado a la criptomoneda Ethereum**, que asegura que las claves derivadas para Bitcoin (`0`) no se mezclen con las de Ethereum.
    (b) La versión del estándar BIP, indicando que es la revisión número 60.
    (c) El número de cuentas que se pueden generar (un máximo de 60).

30.  **En una red Besu con consenso Clique, un nodo que actúa como Bootnode y RPC Node:**
    (a) Necesita tener su puerto P2P (30303) y su puerto RPC (8545) mapeados al PC anfitrión para funcionar correctamente.
    (b) Debe ser obligatoriamente el primer validador definido en el `extraData` del `genesis.json` para poder guiar a otros nodos.
    (c) Cumple dos roles distintos: el de Bootnode se define por ser el objetivo del flag `--bootnodes` de otros nodos, y el de RPC Node por tener un puerto mapeado con el flag `-p` de Docker.

31. **¿Por qué un desarrollador añadiría múltiples `bootnodes` a la configuración de su red privada, incluso si todos se ejecutan en la misma máquina física?**
    (a) Para simular un entorno de producción más realista y probar la **resiliencia** de la red. Si se detiene el contenedor de un bootnode, los nuevos nodos aún pueden unirse a la red utilizando los otros bootnodes como punto de entrada.
    (b) Para aumentar la velocidad de procesamiento de transacciones, ya que cada bootnode puede gestionar una mempool separada.
    (c) Para cumplir con los requisitos del consenso Clique, que exige un mínimo de 3 bootnodes para la votación.

32. **El atributo `extraData` del `genesis.json` es un campo hexadecimal. En Clique, su estructura contiene:**
    (a) 32 bytes de ceros, seguidos de los 20 bytes de la dirección del validador (o varias direcciones concatenadas), seguidos de 65 bytes de ceros reservados para la firma.
    (b) La clave privada del primer validador, encriptada con una clave de sesión derivada del `Chain ID`.
    (c) Un hash SHA3 de las direcciones de todos los validadores iniciales, que sirve como una suma de verificación para la integridad del conjunto de validadores.

33. **Un nodo se define primero por su identidad (cuenta) y luego se le asigna a un proceso (Besu). ¿Qué comando de Besu realiza la creación de la identidad?**
    (a) `besu public-key export-address`
    (b) `besu --import-key`
    (c) `besu --create-account`

34. **Cuando un usuario introduce su contraseña en Metamask para desbloquear la cartera, ¿qué operación realiza la extensión "on the fly"?**
    (a) Utiliza la contraseña para **desencriptar la frase de recuperación o la clave maestra**, que está almacenada de forma encriptada en el almacenamiento local del navegador, dando acceso temporal a todas las claves privadas derivadas.
    (b) Envía la contraseña a un servidor de Metamask para verificarla y obtener un token de sesión.
    (c) La contraseña se combina con la frase de recuperación para generar una nueva clave privada temporal que se usa para todas las transacciones de esa sesión.

35.  **Un usuario en su casa tiene la IP `192.168.1.50`. Al mismo tiempo, dentro de Docker, un contenedor tiene la IP `172.18.0.5`. ¿Por qué este esquema de direccionamiento es válido y funcional?**
    (a) Porque Docker crea una red virtual aislada (un "vecindario virtual") con su propio rango de IPs, que no interfiere con la red local (LAN) del PC anfitrión, evitando así conflictos de enrutamiento.
    (b) Porque `172.18.0.5` es una IP pública y `192.168.1.50` es privada, por lo que no hay conflicto.
    (c) El sistema operativo asigna prioridades, dando siempre preferencia al tráfico de la red física (`192.168.x.x`) sobre la red virtual de Docker.

36. **Un desarrollador ha expuesto el puerto RPC de su nodo Besu (`-p 9999:8545`). ¿Qué tipo de peticiones puede recibir y procesar directamente este endpoint `http://localhost:9999` desde un script `curl`, y cuáles no?**
    (a) Puede procesar cualquier llamada RPC, incluyendo `eth_sendRawTransaction` si la transacción ya viene firmada, pero no puede procesar una `eth_sendTransaction` que requiera que el nodo firme con una clave que no posee.
    (b) Puede procesar `eth_getBalance` y `eth_blockNumber`, pero rechazará `eth_sendTransaction` porque todas las transacciones deben originarse desde una DApp.
    (c) No puede procesar ninguna petición directamente. Actúa solo como un proxy que reenvía todo el tráfico a Metamask para su aprobación.

37. **¿Por qué es indispensable generar las claves/cuentas de los nodos ANTES de crear el fichero `genesis.json`?**
    (a) Porque se necesita al menos una dirección de un futuro nodo para especificarla como el validador inicial en el campo `extraData`.
    (b) Porque el `genesis.json` debe contener las claves privadas de los validadores para poder firmar el bloque 0.
    (c) Porque el `Chain ID` se calcula a partir de un hash de las claves públicas de todos los nodos iniciales.

38. **Al conectar Metamask a tu nodo local (`http://localhost:9999`), ¿qué información de la red **NO** se obtiene automáticamente del nodo y debe ser introducida manualmente?**
    (a) El `Chain ID` y el símbolo de la moneda (ej. "ETH").
    (b) El último número de bloque.
    (c) El saldo de la cuenta activa.

39. **Comparando el consenso Clique (PoA) con el consenso PoS de Ethereum, una diferencia fundamental en la validación de bloques es:**
    (a) En Clique, un bloque es válido si está firmado por un signer autorizado y su contenido es determinista. En PoS, un bloque es válido si es propuesto por el staker elegido y obtiene atestaciones (`>2/3` del comité) de otros stakers.
    (b) En Clique, cualquier nodo puede validar un bloque, pero solo los signers pueden proponerlo. En PoS, solo los stakers pueden validar y proponer.
    (c) El determinismo de Clique permite que los bloques se propaguen más rápido, mientras que la aleatoriedad de PoS requiere un período de "finalización" de 12 segundos antes de que el bloque sea válido.

40. **En la interfaz de Metamask, un usuario puede cambiar de "Ethereum Mainnet" a "Sepolia Testnet" y luego a "Mi Red Besu Local" (que ha configurado manualmente). ¿Qué está cambiando realmente el usuario en cada selección?**
    (a) Está cambiando la **red de blockchain** de destino. Metamask simplemente modifica la URL del endpoint RPC al que enviará las futuras transacciones y consultas, junto con el `Chain ID` asociado.
    (b) Está cambiando la `docker-network` a la que su navegador está conectado, permitiéndole ver los nodos de cada red.
    (c) Está reiniciando la extensión con una configuración de consenso diferente (PoS para Mainnet, PoA para la red local).

41.  **Al ejecutar `docker run --rm -v $(pwd)/n1:/data/n1 hyperledger/besu ... --data-path=/data/n1 --to=/data/n1/addr`, ¿qué afirmación es la más precisa?**
    (a) `--data-path` especifica el directorio de trabajo para la generación de los ficheros `key` y `public`, mientras que `--to` es un comando adicional para exportar la dirección legible por humanos a un fichero separado, facilitando su uso en scripts.
    (b) El flag `--to` es redundante, ya que `--data-path` crea todos los ficheros necesarios, incluyendo la dirección, dentro de la carpeta `/data/n1`.
    (c) El contenedor crea los ficheros en su sistema de archivos interno y el flag `--rm` se asegura de que se copien al volumen mapeado (`-v`) antes de que el contenedor se destruya.

42.  **Cuando un `docker run` especifica `--network mi-red`, el contenedor `nodo2` necesita la IP de `nodo1`. ¿Cómo funciona la resolución?**
    (a) La red Docker (`mi-red`) incluye un servicio DNS interno que mantiene un mapa de nombres de contenedor a sus IPs internas, resolviendo `nodo1` a su IP automáticamente.
    (b) `nodo2` envía una petición de broadcast a la red `mi-red` preguntando "¿quién es nodo1?", y `nodo1` responde con su IP.
    (c) El daemon de Docker intercepta la petición y la reescribe, sustituyendo `nodo1` por su IP antes de que la petición se envíe.

43. **¿Por qué una `API Key` de Infura es importante para el proveedor de servicios, pero no ofrece seguridad criptográfica a las transacciones del usuario?**
    (a) Porque la API Key es un mecanismo de **autenticación y rate-limiting** para Infura (para saber quién eres y cuánto usas su servicio), mientras que la seguridad criptográfica de la transacción proviene de la **firma ECDSA** que realiza Metamask con la clave privada del usuario **antes** de enviar la transacción a Infura.
    (b) Porque la API Key encripta la comunicación entre Metamask e Infura, pero no la transacción final.
    (c) Porque Infura usa la API Key para firmar la transacción, actuando como un co-firmante de confianza.

44. **¿Cuál de las siguientes afirmaciones describe mejor la diferencia entre un "Full Node" y un "Validador" en un contexto PoA como Clique?**
    (a) Ambos almacenan y validan la blockchain completa, pero solo el "Validador" tiene su dirección en la lista de firmantes autorizados y puede proponer nuevos bloques.
    (b) Un "Full Node" solo almacena las cabeceras de los bloques, mientras que un "Validador" almacena la blockchain completa y firma nuevos bloques.
    (c) Un "Validador" es un "Full Node" que además tiene su puerto RPC expuesto, mientras que un "Full Node" normal no es accesible desde el exterior.

45. **Un `Full Node` en una red Clique que NO es un validador, ¿qué función de validación realiza?**
    (a) Re-ejecuta todas las transacciones de cada bloque que recibe para verificar de forma independiente que el hash de estado resultante coincide con el propuesto por el validador.
    (b) Ninguna, solo almacena los bloques que le envían los validadores.
    (c) Solo valida la firma criptográfica del bloque, pero confía en que las transacciones internas son correctas.

46.  **El comando `docker run --rm -v $(pwd):/data hyperledger/besu:latest public-key export-address ...` es una técnica de automatización inteligente porque:**
    (a) Lanza un contenedor temporal ("usar y tirar") únicamente para ejecutar una herramienta de Besu, cuyos resultados (ficheros de claves) se guardan en el PC anfitrión a través de un volumen mapeado.
    (b) Utiliza la misma VM persistente del nodo para generar las claves, asegurando la compatibilidad.
    (c) Pre-calienta la imagen de Docker, haciendo que el posterior arranque del nodo persistente sea mucho más rápido.

47. **¿Por qué una URL `enode://...` contiene una dirección IP en lugar de un nombre de dominio, a diferencia de una URL `http://...` que sí puede usarlo?**
    (a) Para evitar la centralización y los puntos únicos de fallo que representa el sistema DNS; la red P2P se basa en el conocimiento directo de las direcciones IP de los peers.
    (b) Porque el protocolo P2P de Ethereum es más antiguo que el DNS y no fue diseñado para soportarlo.
    (c) Es una limitación de seguridad para evitar ataques de "DNS spoofing" donde un atacante podría redirigir el tráfico de un nodo a una máquina maliciosa.

48. **En un entorno PoS como Ethereum, si un validador está desconectado (offline) cuando le toca proponer un bloque, ¿qué sucede?**
    (a) No pasa nada en ese slot de 12 segundos; el slot queda vacío (se salta un bloque). El validador offline sufre una pequeña penalización por inactividad. La red continúa en el siguiente slot con el siguiente proponente programado.
    (b) La red se detiene y espera a que el validador vuelva a estar online.
    (c) Otro validador del comité de atestación toma su lugar inmediatamente y propone un bloque.

49.  **Un alumno crea su red y nota que aunque no hay transacciones, el número de bloque aumenta constantemente. ¿Qué configuración en su `genesis.json` es la responsable de este comportamiento?**
    (a) `"clique": { "createemptyblocks": true }`
    (b) `"difficulty": "0x1"`
    (c) `"gasLimit": "0x1fffffffffffff"`

50. **Un desarrollador intenta configurar el flag `--bootnodes` de Besu usando solo el nombre del contenedor (`--bootnodes="enode://<key>@nodo1:30303"`), confiando en el DNS de Docker. ¿Por qué falla este enfoque?**
    (a) El software Besu no tiene conocimiento del sistema DNS de Docker; requiere una dirección IP explícita en el flag para poder establecer una conexión TCP/IP.
    (b) El DNS de Docker no puede resolver nombres de host que contengan claves públicas hexadecimales en la misma cadena de texto.
    (c) Falla porque Besu se ejecuta antes de que el DNS de Docker esté completamente operativo, resultando en un error de "host no encontrado".

51. **En una configuración con múltiples bootnodes, un nodo nuevo (`nodo-N`) se inicia con `--bootnodes="enodeA,enodeB"`. ¿Qué sucede?**
    (a) `nodo-N` intenta conectar con `enodeA`. Si falla o no responde en un tiempo determinado, entonces intentará conectar con `enodeB` como mecanismo de fallback.
    (b) `nodo-N` se conecta a ambos simultáneamente para una sincronización más rápida.
    (c) `nodo-N` elige uno al azar para balancear la carga de la red.

52. **¿Por qué, a pesar de que la generación de claves es aleatoria, el uso de una `seed phrase` produce siempre la misma secuencia de cuentas?**
    (a) La "aleatoriedad" está en la generación de la entropía inicial. La `seed phrase` es una representación de esa entropía. El proceso de **derivación** de claves a partir de esa semilla es un algoritmo matemático **determinista**, no aleatorio.
    (b) Porque la `seed phrase` no es aleatoria, es una clave predefinida del estándar BIP-39.
    (c) Es una ilusión; las direcciones son las mismas, pero las claves privadas subyacentes son diferentes en cada restauración.

53.  **Considerando una red Clique donde se desea máxima seguridad y separación de responsabilidades, la configuración ideal sería:**
    (a) Un nodo Bootnode (sin puerto RPC expuesto), un nodo Validador (sin puerto RPC expuesto) y un nodo RPC (que no es ni Bootnode ni Validador).
    (b) Un único nodo que cumple los roles de Bootnode, Validador y RPC para centralizar y simplificar la gestión.
    (c) Un nodo Bootnode con su puerto RPC expuesto para el descubrimiento, y varios nodos Validadores aislados sin exposición de puertos para firmar bloques de forma segura.

54. **¿Cuál de las siguientes afirmaciones describe mejor la relación entre un bloque, la mempool y el "gossip"?**
    (a) Las transacciones llegan a un nodo vía RPC, entran en su mempool, y son "cotilleadas" a otros nodos. Un validador toma transacciones de su propia mempool para crear un bloque, que luego también es "cotilleado" a la red.
    (b) Un bloque se crea vacío y se "cotillea"; los nodos luego insertan transacciones de su mempool en el bloque que han recibido.
    (c) El "gossip" es el protocolo para transmitir la mempool completa de un nodo a otro; el nodo receptor elige las transacciones y crea un bloque.

55. **¿Por qué es conceptualmente incorrecto decir que el `Chain ID` sirve para "cambiar entre redes Docker" en Metamask?**
    (a) Porque Metamask no tiene conocimiento ni control sobre las redes Docker; solo le importa la URL del endpoint RPC y el `Chain ID` para firmar transacciones para una **red de blockchain** específica.
    (b) Porque todas las redes Docker comparten el mismo `Chain ID` por defecto, que es 1337.
    (c) Porque el `Chain ID` se usa para la red P2P, mientras que las redes Docker se gestionan a través de la API RPC.

56. **¿Por qué un script de Bash puede tener problemas de portabilidad entre Windows (incluso con WSL), macOS y Linux, y por qué una librería TypeScript (como una que use `dockerode`) puede ser una solución más robusta para la distribución?**
    (a) Porque comandos de shell y herramientas de texto (`sed`, `grep`) pueden tener implementaciones o comportamientos ligeramente diferentes entre plataformas. Una librería de JavaScript/TypeScript abstrae estas diferencias del sistema operativo, interactuando con la API de Docker de forma consistente.
    (b) Porque Bash tiene sintaxis diferentes en cada sistema operativo, mientras que TypeScript se compila a un único binario universal.
    (c) Porque Windows no puede ejecutar ficheros `.sh` en absoluto, ni siquiera con WSL.

57.  **Al elegir un puerto para un nuevo servicio en tu máquina, ¿por qué generalmente se evita usar puertos por debajo de 1024 (ej. puerto 80, 443, 22)?**
    (a) Porque son puertos "bien conocidos" o privilegiados, y su uso a menudo requiere permisos de administrador del sistema.
    (b) Porque son puertos dinámicos que el sistema operativo asigna aleatoriamente a procesos efímeros.
    (c) Porque esos puertos son menos eficientes y tienen menor capacidad de transferencia de datos.

58. **Escenario: Se despliega una red Clique con `nodo1` (Validador, Bootnode, RPC) y `nodo2` (Full Node). Se envía una transacción a través del RPC de `nodo1` que consume una gran cantidad de gas, casi llenando el límite del bloque. Inmediatamente después, se envía una segunda transacción más pequeña. Ambas entran en la mempool de `nodo1`. Debido al `blockPeriodSeconds` de 5 segundos, `nodo1` crea el bloque #101 incluyendo solo la primera transacción. ¿Qué estado tendrá `nodo2` exactamente 1 segundo después de recibir y validar el bloque #101?**
    (a) `nodo2` tendrá la primera transacción en su estado y la segunda en su mempool, lista para el bloque #102, y su altura de bloque será 101.
    (b) `nodo2` rechazará el bloque #101 porque el protocolo de cotilleo (gossip) le habrá enviado la segunda transacción, y al ver que no está incluida, detectará una inconsistencia.
    (c) `nodo2` tendrá el bloque #101, pero su mempool estará vacía, ya que solo el nodo RPC que recibe las transacciones las mantiene en la mempool.

59. **Si tu DApp necesita firmar un mensaje sin enviar una transacción (ej. para autenticación), usaría `personal_sign`. ¿Quién realiza la operación criptográfica de firma en este flujo?**
    (a) La extensión Metamask, que recibe la petición de firma, se la muestra al usuario para su aprobación, y si este acepta, firma los datos con la clave privada almacenada de forma segura dentro de la extensión, devolviendo solo la firma a la DApp.
    (b) La DApp, que solicita al usuario su clave privada para realizar la firma directamente en el navegador.
    (c) El nodo RPC (Infura/Besu), que tiene una clave de sesión segura para firmar en nombre del usuario.

60. **¿Qué limita el número de transacciones que pueden caber en un bloque de Ethereum/Besu?**
    (a) El **límite de gas del bloque** (`gasLimit`), definido en el `genesis.json` (y ajustable por los validadores). La suma del `gas used` de todas las transacciones no puede exceder este límite.
    (b) Un número máximo fijo de transacciones (ej. 1500 transacciones por bloque).
    (c) El `blockPeriodSeconds`, que determina cuánto tiempo tiene el validador para recopilar transacciones.

61. **Un script de `curl` para obtener el número de bloque devuelve `{"jsonrpc":"2.0","id":1,"result":"0x87"}`. ¿Qué combinación de comandos de shell de Linux permitiría extraer y convertir el número de bloque a decimal en un solo paso?**
    (a) `echo $((16#$(curl ... | jq -r '.result' | sed 's/0x//')))`
    (b) `... | jq '.result' | hex2dec`
    (c) `... | sed 's/.*"result":"(.*?)"/\1/' | bc`

62. **Un desarrollador ejecuta `docker run -it ubuntu:latest /bin/bash`. Dentro de ese contenedor interactivo, ¿puede ejecutar `ping 1.1.1.1` y obtener respuesta? ¿Y puede ejecutar `ping localhost`?**
    (a) Sí puede hacer ping a `1.1.1.1` (si tiene red), ya que por defecto los contenedores tienen acceso de salida a internet. Sí puede hacer ping a `localhost`, que se resolverá al propio contenedor (`127.0.0.1`).
    (b) No puede hacer ping a `1.1.1.1` porque el contenedor está aislado. Sí puede hacer ping a `localhost`.
    (c) Sí puede hacer ping a `1.1.1.1`, pero no a `localhost`, ya que `localhost` se refiere al PC anfitrión, no al contenedor.

63. **En una red PoA Clique, si un único validador se vuelve malicioso y empieza a censurar transacciones (no las incluye en sus bloques), ¿qué pueden hacer los usuarios?**
    (a) Si hay otros validadores, los usuarios pueden esperar a que le toque el turno a un validador honesto. Si es el único, la red está efectivamente bajo su control, y la única solución es una coordinación social fuera de la cadena para reemplazarlo.
    (b) Nada. El validador tiene control total sobre el contenido de sus bloques.
    (c) Pueden enviar sus transacciones a un `full node` no validador, que tiene la capacidad de forzar la inclusión de transacciones en el siguiente bloque.

64. **En una red PoA Clique, el mecanismo de consenso se basa en:**
    (a) Un sistema de turnos determinista entre un conjunto predefinido y autorizado de validadores para firmar bloques.
    (b) La competición entre todos los nodos para resolver un complejo problema matemático (minería).
    (c) La probabilidad de que un validador sea elegido en función de la cantidad de Ether que ha puesto en "stake".

65.  **Para añadir un nuevo validador a una red Clique en funcionamiento, el procedimiento correcto implica:**
    (a) Realizar una llamada RPC al método `clique_propose` desde un nodo con su puerto RPC expuesto, lo que inicia un proceso de votación on-chain entre los validadores existentes.
    (b) Detener todos los nodos, editar el campo `extraData` del `genesis.json` en el PC anfitrión para añadir la nueva dirección, y reiniciar todos los nodos.
    (c) Desde un nodo que sea RPC y Validador, enviar una transacción normal a una dirección de contrato especial de gobernanza con los datos del nuevo validador.

66.  **¿Por qué un nodo Besu necesita un fichero `config.toml` además de los flags de línea de comandos en `docker run`?**
    (a) Para simplificar el comando `docker run`, agrupando configuraciones estáticas y repetitivas en un fichero, y dejando solo los parámetros dinámicos (como el nombre o la IP) en la línea de comandos.
    (b) El `config.toml` es obligatorio y `docker run` no puede pasar todos los parámetros necesarios.
    (c) El `config.toml` se usa para la configuración P2P, y los flags de línea de comandos para la configuración RPC.

67. **Un usuario envía una transacción a la Mainnet. ¿Cómo llega esta transacción desde su cartera (ej. Metamask) a la mempool de un validador que podría incluirla en un bloque?**
    (a) Metamask envía la transacción firmada a un nodo RPC (como Infura). Ese nodo la valida y la "cotillea" (gossip) a sus peers. La transacción se propaga de nodo a nodo por toda la red hasta que llega a las mempools de los validadores.
    (b) Metamask la envía directamente al validador que propondrá el siguiente bloque, cuya identidad es pública.
    (c) La transacción se envía a un "servidor de mempool" centralizado, desde donde los validadores la descargan.

68. **Un nodo `nodo-A` se une a una red usando `bootnode-B` y `bootnode-C` en su lista de bootnodes (`--bootnodes="enode_B,enode_C"`). Si `bootnode-B` está caído en ese momento:**
    (a) `nodo-A` intentará conectar con `bootnode-B`, fallará, y luego intentará conectar con `bootnode-C`, usando este último como su punto de entrada a la red.
    (b) `nodo-A` fallará al arrancar, ya que siempre intenta conectarse al primer bootnode de la lista y no continúa si este falla.
    (c) `nodo-A` se conectará a `bootnode-C` pero marcará la red como "degradada", funcionando solo en modo de solo lectura.

69. **Un script de despliegue genera las claves y el `genesis.json`. Luego, lanza `nodo1` (validador) y `nodo2` (full node). El comando de `nodo2` tiene un error tipográfico en la URL `enode` de su `--bootnodes`. ¿Qué observaremos?**
    (a) `nodo1` funcionará como una blockchain de un solo nodo, produciendo bloques. `nodo2` arrancará, pero se quedará aislado en el bloque 0, mostrando errores de conexión P2P en sus logs, incapaz de sincronizarse.
    (b) El contenedor de `nodo2` no se creará; Docker validará la sintaxis de la URL `enode` y rechazará el comando `docker run`.
    (c) `nodo1` y `nodo2` se comunicarán a través de la capa de red de Docker, que corregirá el error tipográfico del `enode` usando su DNS interno y la información del `genesis.json` compartido.

70. **Un nuevo nodo se une a la Mainnet de Ethereum. No conoce a nadie. ¿Cómo encuentra a sus primeros peers para empezar a sincronizar?**
    (a) Los clientes como Geth o Besu tienen una pequeña lista de "bootnodes" codificada en su software. El nuevo nodo contacta a estos bootnodes de confianza para obtener una lista más grande de peers activos e iniciar el proceso de descubrimiento.
    (b) Se conecta a un servidor DNS centralizado de la Ethereum Foundation que le proporciona una lista inicial de IPs de nodos activos.
    (c) Envía un paquete de broadcast a su red local (LAN) con la esperanza de que otro nodo Ethereum esté en la misma red.

71. **El término "JSON-RPC" describe:**
    (a) Un protocolo para realizar llamadas a procedimientos remotos (`Remote Procedure Call`) donde la petición y la respuesta se formatean como objetos JSON y se transportan comúnmente sobre HTTP.
    (b) Un tipo de base de datos NoSQL utilizada por los nodos Besu para almacenar el estado de la blockchain.
    (c) El formato de los bloques en una red compatible con Ethereum.

72. **¿Cuál de las siguientes es una descripción precisa de la interacción entre `localhost`, tu LAN (`192.168.x.x`) y la red Docker (`172.x.x.x`)?**
    (a) Son tres redes paralelas y aisladas. La comunicación entre ellas solo es posible a través de puentes explícitos, como el mapeo de puertos (`-p`) que conecta el espacio de `localhost` con el de la red Docker.
    (b) `localhost` es un alias para la IP de la LAN, y la red Docker es una sub-interfaz de la red LAN.
    (c) Son tres redes jerárquicas: el tráfico de Docker pasa por la LAN antes de llegar a `localhost`.

73. **Si un alumno tiene problemas para instalar Besu nativamente en su Mac o Linux (por dependencias de JDK, etc.), ¿cuál es la estrategia de resolución recomendada por los alumnos más experimentados?**
    (a) Adoptar un enfoque "Docker-only", usando un contenedor de Besu efímero (`docker run --rm ...`) incluso para tareas como la generación de claves, eliminando la necesidad de una instalación local.
    (b) Formatear el ordenador e instalar una versión de Linux compatible.
    (c) Descargar los binarios manualmente en lugar de usar un gestor de paquetes, y ajustar las variables de entorno del sistema (`$PATH`, `$JAVA_HOME`).

74. **Un nodo Besu es lanzado con `-v /mis_datos:/data` y `--data-path=/data/mi_nodo`. Después de sincronizar 1GB de datos, el contenedor se detiene y se elimina con `docker rm`. ¿Qué le pasa a ese 1GB de datos de la blockchain?**
    (a) Permanece intacto en la carpeta `/mis_datos/mi_nodo` del PC anfitrión, porque el volumen (`-v`) crea un enlace persistente, no una copia temporal.
    (b) Se elimina junto con el contenedor, ya que estaba en su sistema de archivos.
    (c) Permanece en un "volumen anónimo" de Docker que puede ser recuperado, pero no es directamente accesible desde el sistema de archivos del host.

75. **Considera el comando `docker run -d --name mi-nodo -v /tmp/data:/opt/besu/data ${BESU_IMAGE} --data-path=/opt/besu/data`. Si el proceso Besu dentro del contenedor falla al arrancar, pero el contenedor sigue en ejecución (ej. con un script de reinicio), ¿qué contendrá la carpeta `/tmp/data` en el PC anfitrión?**
    (a) Contendrá la estructura de directorios inicial que Besu crea antes de intentar sincronizar (como `DATABASE_METADATA`, etc.), aunque la base de datos en sí esté vacía o corrupta.
    (b) Estará vacía, ya que Besu no llegó a escribir la base de datos.
    (c) Contendrá un único fichero `error.log` con el motivo del fallo, creado por el daemon de Docker en el volumen mapeado.

76. **Al usar una URL de Infura para Mainnet (`https://mainnet.infura.io/v3/YOUR_API_KEY`), tu DApp envía una nueva transacción (`eth_sendRawTransaction`). ¿Qué sucede exactamente en el backend de Infura?**
    (a) Infura actúa como un "gateway" o "load balancer", recibiendo tu transacción firmada y retransmitiéndola (gossip) a través de su propia flota de nodos Ethereum (Geth, Besu, etc.) altamente disponibles a la red P2P global.
    (b) Infura ejecuta la transacción en una simulación, devuelve el resultado, y luego la envía a la red real para su confirmación.
    (c) Infura, que es uno de los validadores principales de la red, incluye directamente tu transacción en el siguiente bloque que le toca proponer.

77. **¿Cuál es la relación conceptual entre la "Puerta de enlace predeterminada" (`192.168.1.1`) de tu LAN y un `bootnode` en tu red Docker?**
    (a) Son funcionalmente análogas: ambas actúan como el "punto de entrada/salida" o "punto de descubrimiento" para las entidades de su red. La puerta de enlace es para que los dispositivos encuentren Internet, y el bootnode es para que los nodos se encuentren entre sí.
    (b) Ambas son direcciones de broadcast para sus respectivas redes.
    (c) Ambas deben tener la primera dirección IP disponible en su subred (ej. `.1`).

78.  **En los ejemplos de scripts, se utiliza `node -e "..."` para firmar una transacción desde Bash. ¿Cuál es la ventaja de este método sobre tener un fichero `tx.js` separado?**
    (a) Permite que el script de Bash sea completamente autónomo y portable, sin depender de un fichero de script adicional, lo que simplifica la distribución y ejecución.
    (b) El rendimiento es mayor porque `node -e` compila el código JavaScript a código máquina en tiempo real.
    (c) `node -e` tiene acceso a las variables de entorno del script de Bash de forma nativa, mientras que un fichero `tx.js` no.

79. **Un nodo completo recibe un nuevo bloque firmado por un validador. ¿Cómo verifica criptográficamente que el bloque es auténtico y proviene de quien dice ser?**
    (a) Utiliza el **Algoritmo de Firma Digital de Curva Elíptica (ECDSA)**. Con la firma, el hash del bloque y la **clave pública** del validador, puede verificar matemáticamente que la firma solo pudo haber sido creada por alguien que posee la **clave privada** correspondiente a esa clave pública.
    (b) Desencripta la firma con la clave privada del validador. Si el resultado es el hash del bloque, la firma es válida.
    (c) Compara la firma del bloque con una lista de firmas pre-aprobadas para ese validador, almacenada en su base de datos.

80. **Después de que un proponente de bloque en PoS crea y transmite su bloque, ¿qué papel juega el "comité de atestación"?**
    (a) Es un subconjunto de validadores elegidos al azar para ese slot, cuya tarea es "votar" (atestiguar) que han visto el bloque y consideran que es válido. Un bloque se considera canónico cuando obtiene más de 2/3 de los votos del comité.
    (b) Es un grupo de 128 validadores elegidos al azar que deben resolver un puzzle para validar el bloque.
    (c) Es el comité que gestiona la mempool global, decidiendo qué transacciones se incluyen en el bloque del proponente.

81.  **Al definir una subred en Docker como `176.45.0.0/16`, ¿qué parte de la dirección IP `176.45.10.2` corresponde al "host" y qué parte a la "red"?**
    (a) Red: `176.45`, Host: `10.2`
    (b) Red: `176`, Host: `45.10.2`
    (c) Red: `176.45.10`, Host: `2`

82. **¿Cuál es la principal ventaja de una Cartera Jerárquica Determinista (HD Wallet) como Metamask frente al antiguo sistema de ficheros `keystore` (uno por cuenta) que usaban los clientes como Geth?**
    (a) Las carteras HD permiten gestionar un número virtualmente infinito de cuentas desde una única copia de seguridad (la frase de recuperación), mientras que con el sistema `keystore` se debía hacer una copia de seguridad individual de cada fichero de cuenta.
    (b) Las carteras HD son más rápidas para firmar transacciones porque usan un algoritmo criptográfico más moderno.
    (c) El sistema `keystore` es inseguro porque almacena las claves privadas en texto plano, mientras que las carteras HD las encriptan.

83.  **En un script de automatización para una red Besu, el proceso correcto para generar la identidad de un nuevo nodo y asignársela es:**
    (a) Lanzar un contenedor efímero (`docker run --rm`) que ejecuta `besu --public-key export-address` para crear los ficheros de claves en un volumen mapeado al PC anfitrión, y luego usar esos ficheros en un `docker run` posterior para el nodo persistente.
    (b) Lanzar un contenedor `docker run` con `--node-private-key-file` apuntando a un fichero vacío; Besu lo generará y rellenará automáticamente.
    (c) Usar `besu --public-key export-address` directamente en la terminal del PC anfitrión, y luego mapear la carpeta resultante con `-v` y apuntar al fichero de clave con `--node-private-key-file` en el `docker run`.

84.  **Si en el fichero `genesis.json` de una red Clique se especifica en el `extraData` una dirección de validador que no corresponde a ningún nodo existente en la red:**
    (a) La red se iniciará, pero permanecerá estancada en el bloque 0, ya que ningún nodo posee la clave privada necesaria para firmar y proponer el bloque 1.
    (b) La red no se podrá iniciar; los nodos darán un error de "validador no encontrado" y no se crearán los contenedores.
    (c) Besu detectará la inconsistencia y asignará aleatoriamente el rol de validador al primer nodo que se conecte (el bootnode) para permitir que la red avance.

85.  **Un compañero de proyecto sugiere usar una librería TypeScript como `dockerode` para gestionar los contenedores, mientras que la tutoría menciona que llamar a scripts de Bash desde TypeScript es una opción válida. ¿Cuál es la principal ventaja de la aproximación con scripts de Bash en el contexto de este proyecto?**
    (a) Permite una transición más sencilla desde el Nivel 1 (script monolítico), ya que la lógica de los comandos de Docker ya está probada. La librería TypeScript se convierte en un simple "wrapper" que ejecuta estos scripts modulares, reduciendo la complejidad inicial.
    (b) Los scripts de Bash son más rápidos y consumen menos memoria que una librería de Node.js como `dockerode`.
    (c) `dockerode` no es compatible con Hyperledger Besu, solo con contenedores genéricos de Linux.

86. **¿Cuál es el propósito del `p2pPort` (30303) frente al `rpcPort` (8545) en un nodo Besu?**
    (a) `p2pPort` es para la comunicación **horizontal** entre nodos (cotilleo, sincronización de bloques), mientras que `rpcPort` es para la comunicación **vertical** desde una aplicación cliente hacia el nodo.
    (b) `p2pPort` es para la comunicación encriptada y `rpcPort` para la no encriptada.
    (c) `p2pPort` usa el protocolo UDP para velocidad, y `rpcPort` usa TCP para fiabilidad.

87. **Si un `bootnode` se cae permanentemente y se crea uno nuevo desde cero, ¿qué deben hacer los nodos existentes para seguir funcionando como una única red cohesionada con los nuevos nodos que se unan?**
    (a) Deben ser reiniciados con su flag `--bootnodes` actualizado para apuntar al `enode` del nuevo bootnode.
    (b) Nada, el protocolo de cotilleo eventualmente descubrirá al nuevo bootnode.
    (c) Solo los nodos validadores deben ser reiniciados; los nodos normales aprenderán del nuevo bootnode a través de los bloques.

88.  **Un nodo (`nodo-A`) se une a una red usando a `nodo-B` como su único bootnode. Una hora más tarde, se une `nodo-C` (usando también a `nodo-B`). ¿Cómo se entera `nodo-A` de la existencia de `nodo-C`?**
    (a) A través del protocolo de "cotilleo" (gossip), `nodo-B` informa a `nodo-A` sobre `nodo-C` (y viceversa), permitiendo que `nodo-A` y `nodo-C` establezcan una conexión directa entre ellos.
    (b) `nodo-A` debe ser reiniciado para que vuelva a consultar a `nodo-B` y obtener la lista actualizada de peers.
    (c) `nodo-B` envía una transmisión de "broadcast" a todos los nodos que conoce, incluyendo a `nodo-A`, para informarles sobre la llegada de `nodo-C`.

89. **Un operador de red desea añadir un nuevo validador (`nodo-NUEVO`) a una red Clique que ya está en funcionamiento. El método correcto es:**
    (a) Desde un validador existente, realizar una llamada RPC (`clique_propose`) para iniciar una votación on-chain sobre la inclusión de la dirección de `nodo-NUEVO`.
    (b) Detener `nodo-NUEVO`, añadir su dirección al `genesis.json`, y luego reiniciar toda la red para que los cambios surtan efecto.
    (c) Usar `docker exec` para acceder al bootnode y añadir manualmente la clave pública de `nodo-NUEVO` a una lista de confianza.

90. **Finalmente, ¿cuál es la pieza de información más CRÍTICA que un `nodo2` necesita del `nodo1` para poder unirse a la blockchain, y que encapsula tanto la identidad criptográfica como la ubicación de red?**
    (a) La URL `enode` del `nodo1`.
    (b) El `Chain ID`.
    (c) La dirección IP interna del `nodo1`.

91. **Cuando una DApp en tu navegador ejecuta el código `await ethereum.request({ method: 'eth_requestAccounts' })`, ¿qué está ocurriendo exactamente?**
    (a) El código JavaScript está llamando a una función `request` del objeto `ethereum`, que ha sido **inyectado** en el DOM del navegador por la extensión de Metamask, la cual intercepta la llamada y abre su propia interfaz para la aprobación del usuario.
    (b) La DApp está enviando una petición HTTP directa a un servidor de Ethereum para solicitar una lista de cuentas.
    (c) El navegador detecta la llamada y utiliza su funcionalidad nativa de "Web Crypto" para generar y proponer nuevas cuentas al usuario.

92. **¿Cuál es la relación entre el flag `-d` (`--detach`) y el flag `-it` (`--interactive --tty`) en un comando `docker run`?**
    (a) Son opuestos: `-d` ejecuta el contenedor en segundo plano (detached), mientras que `-it` lo ejecuta en primer plano y adjunta la terminal del host a la del contenedor para interacción directa.
    (b) Son alias para la misma función: ejecutar un contenedor en segundo plano.
    (c) `-d` es para contenedores de producción y `-it` es para contenedores de desarrollo.

93. **Si tuvieras dos contenedores en la misma `docker-network`, `nodo-besu` y `api-backend`, ¿cómo podría el `api-backend` (ej. en NodeJS) conectarse al RPC de `nodo-besu` de la forma más eficiente y segura?**
    (a) Haciendo que el `api-backend` se conecte a `http://nodo-besu:8545`, aprovechando el DNS interno de la red Docker. Esta es la forma más robusta ya que no depende de IPs que pueden cambiar.
    (b) Mapeando el puerto RPC de `nodo-besu` al host (`-p 8545:8545`) y haciendo que el `api-backend` se conecte a `http://localhost:8545`.
    (c) Haciendo que el `api-backend` se conecte directamente a la IP interna del contenedor `nodo-besu` (ej. `http://172.18.0.2:8545`), que se obtendría con `docker inspect`.

94. **En una red con `bootnode-A` y `bootnode-B`, ¿cuál de las siguientes configuraciones de red es la más robusta y resiliente?**
    (a) `bootnode-A` y `bootnode-B` se apuntan mutuamente en sus propios flags `--bootnodes`, y todos los demás nodos (`nodo-C`, `nodo-D`, etc.) apuntan a una lista que contiene tanto a `bootnode-A` como a `bootnode-B`.
    (b) `nodo-C` apunta a `bootnode-A`, `nodo-D` apunta a `bootnode-B`, y los dos bootnodes no se conocen entre sí para mantener la independencia.
    (c) Todos los nodos, incluyendo los bootnodes, apuntan únicamente a `bootnode-A` para tener un único punto de verdad y evitar conflictos de enrutamiento.

95. **En el consenso Proof-of-Stake (PoS) de Ethereum, ¿cómo se elige al proponente del siguiente bloque?**
    (a) Un algoritmo pseudoaleatorio (RANDAO) selecciona a un único validador de entre todos los que han depositado 32 ETH o más. La probabilidad de ser elegido es la misma para todos.
    (b) Los validadores votan entre ellos en cada "slot" (intervalo de 12 segundos) para elegir a un líder.
    (c) Un algoritmo determinista rota el derecho a proponer bloques en un orden fijo entre todos los validadores activos.

96. **Para cambiar la lista de validadores en una red Clique en funcionamiento, ¿qué se debe hacer?**
    (a) Iniciar una votación on-chain a través de una llamada RPC específica como `clique_propose` desde un validador existente.
    (b) Editar el `genesis.json` y reiniciar solo los nodos validadores.
    (c) Detener la red, ejecutar un script de migración, y volver a arrancar.

97. **¿Cuál de las siguientes afirmaciones sobre las claves de Ethereum es la más precisa?**
    (a) Las claves privadas se generan siempre en frío (off-chain) y su probabilidad de colisión es astronómicamente baja.
    (b) Para mayor seguridad, la clave privada se deriva de la clave pública usando un algoritmo de hash inverso.
    (c) Cada vez que se crea una cuenta, su dirección pública se registra en un "servidor de claves" central de Ethereum.

98. **¿El mapeo de puertos `-p` "se salta" o debilita el aislamiento de la red Docker?**
    (a) No, no se la salta. Actúa como un "puente" o "portero" controlado, que atraviesa la barrera de aislamiento solo para ese puerto y contenedor específicos, manteniendo el resto del aislamiento intacto.
    (b) Sí, crea un agujero de seguridad que permite a cualquier contenedor de la red comunicarse libremente con el exterior.
    (c) Sí, porque fusiona la pila de red del contenedor con la del host, eliminando el aislamiento a nivel de red.

99. **¿Cuál de las siguientes acciones es una modificación **INMUTABLE** una vez que una red Besu ha sido lanzada?**
    (a) Cambiar el `chainId` de la red editando el `genesis.json` y reiniciando los nodos.
    (b) Añadir un nuevo nodo validador a la red.
    (c) Eliminar un nodo de la red deteniendo su contenedor de Docker.

100. **¿Cuál es la función del protocolo "Gossip" en una red Besu?**
    (a) Es el mecanismo de comunicación P2P por el cual los nodos se propagan transacciones y bloques recién creados entre sí de forma descentralizada.
    (b) Es el protocolo de votación que usa Clique para elegir al siguiente validador.
    (c) Es el nombre de la API RPC que permite a las DApps interactuar con la red.

101. **Un usuario importa la misma `seed phrase` en Metamask y en Trust Wallet. ¿Verá las mismas cuentas con los mismos saldos?**
    (a) Sí, porque ambas carteras siguen el mismo estándar (BIP-39/44), por lo que derivarán la misma secuencia de claves privadas/públicas de la `seed` inicial. Los saldos serán los mismos porque se consultan de la misma blockchain pública.
    (b) No, porque cada cartera usa un algoritmo de encriptación propietario, generando claves diferentes.
    (c) Solo si ambas carteras están conectadas al mismo nodo RPC de Infura, que es quien gestiona la derivación de claves.

102. **¿Cuál es la diferencia conceptual entre la "red de Docker" y la "red de Blockchain"?**
    (a) La red de Docker es la capa física/de transporte (la carretera virtual), mientras que la red de Blockchain es la capa lógica/de aplicación (el club con sus reglas y miembros) que corre sobre esa carretera.
    (b) Son sinónimos en el contexto de este proyecto.
    (c) La red de Docker usa el protocolo IP, mientras que la red de Blockchain usa el protocolo Enode.

103. **Un desarrollador configura una red Besu Clique en Docker y, por error, establece el `blockPeriodSeconds` a `0` en el `genesis.json`. ¿Cuál será el comportamiento más probable de la red al arrancar?**
    (a) El nodo validador entrará en un bucle infinito de creación de bloques vacíos a la máxima velocidad que su CPU le permita, consumiendo el 100% de los recursos y llenando el disco rápidamente.
    (b) La red no arrancará, Besu lanzará un error de configuración de génesis inválido.
    (c) La red funcionará, pero los bloques solo se crearán cuando llegue una nueva transacción, comportándose como un sistema "bajo demanda".

104. **En el contexto de las carteras HD, la "entropía inicial" que se usa para generar la `seed phrase` proviene de:**
    (a) Una fuente de aleatoriedad del sistema operativo del dispositivo, a menudo combinada con movimientos del ratón o interacciones del usuario para aumentar la imprevisibilidad.
    (b) Una consulta a un servidor cuántico de números aleatorios mantenido por la Ethereum Foundation.
    (c) El hash del primer bloque de Ethereum, que actúa como una semilla común para todas las carteras.

105. **Un "Full Node" que no es un validador en una red Clique recibe un bloque malicioso de un validador. ¿Cuál es su reacción correcta?**
    (a) Lo ignora, lo descarta, y espera una propuesta de bloque válida de otro validador para esa misma altura.
    (b) Lo acepta para no perder la sincronización, pero envía una "transacción de disputa" para alertar a otros nodos.
    (c) Inicia una votación on-chain con otros "Full Nodes" para decidir si el validador debe ser penalizado.

106. **¿Cuál es la función del comando `docker run --rm ...` para generar claves?**
    (a) Lanzar una VM temporal y de un solo uso como una herramienta para ejecutar `besu ... export-address`, guardando los resultados en el PC host a través de un volumen.
    (b) Crear una VM persistente que actuará como un "servidor de claves" para toda la red.
    (c) Actualizar la imagen de `hyperledger/besu` con las nuevas claves generadas.

107. **¿Cuál de las siguientes afirmaciones describe con mayor precisión la relación entre el `Chain ID` (definido en `genesis.json`), el protocolo de consenso (PoA Clique) y el protocolo de red P2P (RLPx/Gossip)?**
    (a) El protocolo P2P utiliza el `Chain ID` como parte del "handshake" inicial para rechazar peers de otras blockchains, mientras que el consenso PoA es una capa lógica superior que dicta las reglas de producción de bloques, pero no afecta directamente al cotilleo de transacciones y bloques.
    (b) El `Chain ID` es utilizado por el protocolo P2P para encriptar los mensajes de cotilleo, mientras que el consenso PoA determina el tamaño de la mempool de cada nodo.
    (c) El consenso PoA modifica el protocolo P2P para que el cotilleo de bloques solo ocurra desde los validadores hacia los nodos normales, y no entre nodos normales, optimizando la red.

108. **¿Cuál de las siguientes afirmaciones describe mejor la interacción entre el DNS de Docker y el flag `--bootnodes` de Besu?**
    (a) Son capas complementarias y desacopladas: Docker proporciona resolución de nombre a IP a nivel de red, mientras que Besu requiere la URL `enode` completa (que incluye la identidad criptográfica) a nivel de aplicación, la cual no puede ser proporcionada por un DNS genérico.
    (b) Son mutuamente excluyentes; si se usa el DNS de Docker para la comunicación entre servicios, no se debe usar el flag `--bootnodes`.
    (c) Besu puede ser configurado para usar el DNS de Docker como un "plugin de descubrimiento", donde se le pasa solo el nombre del host y Besu consulta internamente al DNS para obtener la IP y la clave pública.

109. **¿Es posible tener nodos de una misma blockchain (mismo `Chain ID`) en dos `docker-network` completamente separadas y en diferentes máquinas físicas?**
    (a) Sí, pero requeriría una configuración de red compleja, como exponer los puertos P2P a Internet y usar IPs públicas en las configuraciones de `--bootnodes`.
    (b) No, es técnicamente imposible ya que el `Chain ID` está vinculado a la subred.
    (c) Sí, usando el comando `docker network connect` para crear un túnel entre las dos redes Docker.

110. **Si la sincronización de un "Full Node" desde cero puede tardar días, ¿cómo es posible que carteras como Metamask muestren un balance casi instantáneamente?**
    (a) Metamask no es un nodo; es un cliente ligero que confía en un nodo RPC (como el de Infura, o uno configurado por el usuario) para que le proporcione la información del estado de la blockchain de forma rápida.
    (b) Metamask utiliza una técnica de sincronización "ultra-light" que solo descarga un índice de todas las direcciones y sus saldos.
    (c) Metamask predice el balance basándose en las transacciones pendientes en la mempool global.

111. **Un nodo validador en Clique tiene una alta carga de CPU, mientras que un nodo RPC en la misma red tiene un alto tráfico de red. ¿Por qué podría darse esta situación?**
    (a) El validador está ocupado re-ejecutando transacciones y calculando hashes de estado para crear nuevos bloques (CPU-intensivo), mientras que el nodo RPC está principalmente ocupado recibiendo peticiones de DApps y transmitiendo datos (red-intensivo).
    (b) Es un error; el nodo RPC debería tener más carga de CPU al procesar las peticiones.
    (c) El validador está constantemente realizando cálculos criptográficos para encontrar el siguiente bloque (minería PoW), mientras que el RPC solo reenvía datos.

112. **¿Cuál de estas afirmaciones compara correctamente la finalidad de un `Chain ID` y una `API Key` de Infura?**
    (a) Ambos son mecanismos de seguridad; el `Chain ID` previene ataques de repetición en la blockchain, mientras que la `API Key` autentica y autoriza el uso del servicio de Infura, permitiendo el seguimiento del uso y la prevención de abusos.
    (b) El `Chain ID` identifica la red (Mainnet, Sepolia), mientras que la `API Key` identifica al validador específico dentro de la red de Infura.
    (c) El `Chain ID` es público y compartido por todos los nodos de una red, mientras que la `API Key` es una clave privada que se usa para firmar transacciones en nombre del usuario.

113. **Un usuario utiliza Metamask para enviar una transacción en la Mainnet de Ethereum, usando el endpoint RPC por defecto de Infura. ¿Cuál es el flujo de datos correcto?**
    (a) Metamask -> Infura (vía HTTPS/JSON-RPC) -> Red P2P TCP/IP (Gossip) -> Validadores
    (b) Metamask -> Red P2P TCP/IP -> Infura -> Validador
    (c) Metamask -> Red P2P TCP/IP (Gossip) -> Todos los nodos de la red

114. **El papel del bootnode en el protocolo de "cotilleo" (gossip) es ser:**
    (a) El iniciador de la cascada de información: presenta a los nuevos nodos a un subconjunto de peers, y estos a su vez se encargan de seguir propagando la información.
    (b) El servidor central que retransmite cada mensaje de cotilleo a todos los demás nodos de la red.
    (c) Un "directorio" pasivo que solo responde a las consultas de nuevos nodos, pero no participa activamente en la propagación de información.

115. **Para que un amigo tuyo, desde su casa, pueda interactuar con tu red Besu local que se ejecuta en tu PC, ¿qué sería indispensable?**
    (a) Necesitarías configurar tu router (Port Forwarding) para redirigir el tráfico de un puerto de tu IP pública al puerto `9999` de tu PC, y tu amigo tendría que apuntar su Metamask a tu IP pública y ese puerto.
    (b) Que ambos estéis conectados a la misma `docker-network` a través de un túnel VPN.
    (c) Nada, solo necesitas pasarle la dirección `http://localhost:9999` y funcionará, ya que `localhost` se resuelve a la IP del servidor.

116.  **Un comando `docker run` incluye los flags `-v /home/user/app:/app` y `-p 8080:80`. ¿Cuál es la descripción más precisa de lo que hacen?**
    (a) `-v` establece una conexión persistente de archivos entre la carpeta del host y la del contenedor, mientras que `-p` establece un puente de comunicación de red entre el puerto del host y el del contenedor.
    (b) `-v` crea un enlace de red al puerto 80, y `-p` comparte la carpeta `/app` con el host en el directorio `/home/user/app`.
    (c) `-v` copia el contenido de `/home/user/app` a `/app` al iniciar el contenedor, y `-p` copia el tráfico del puerto 80 al 8080.

117.  **¿Cuál es la diferencia fundamental entre el flag `-v` y el flag `-p` en un comando `docker run`?**
    (a) `-v` se usa para la persistencia de datos montando un directorio del host dentro del contenedor, mientras que `-p` se usa para la comunicación de red mapeando un puerto del host a un puerto del contenedor.
    (b) `-v` establece una conexión de red virtual entre el host y el contenedor, mientras que `-p` comparte la CPU del host.
    (c) `-v` mapea un puerto de red del host a un puerto del contenedor, mientras que `-p` monta un directorio del host dentro del contenedor.

118. **Un estudiante almacena la configuración de sus redes Besu (nodos, IPs, etc.) en un fichero `redes.json` en su proyecto. ¿Qué papel cumple este fichero?**
    (a) Es una forma de persistir el **estado de la configuración de la infraestructura** para su aplicación de gestión (el frontend/API), permitiéndole recordar qué redes ha creado el usuario, para luego poder borrarlas o modificarlas.
    (b) Es un fichero de configuración oficial de Besu, que sustituye al `config.toml`.
    (c) Es una caché local de la blockchain para acelerar las consultas de saldo.

119. **Un usuario pierde su ordenador pero tiene guardada su "frase de recuperación" (seed phrase) de 12 palabras. Al instalar Metamask en un nuevo dispositivo e importar esa frase, recupera el acceso a todas sus cuentas (Cuenta 1, Cuenta 2, etc.). ¿Cómo es esto posible?**
    (a) Porque todas las cuentas de un usuario (sus pares de claves privada/pública) se derivan **determinísticamente** de una única clave maestra (master key) generada a partir de esa frase de recuperación. El mismo algoritmo (siguiendo el estándar BIP-39/44) siempre generará la misma secuencia de claves.
    (b) La frase de recuperación es una contraseña que desencripta un fichero de respaldo que Metamask guarda automáticamente en la nube.
    (c) Al importar la frase, Metamask envía un hash de la misma a la blockchain, que le devuelve una lista de todas las direcciones asociadas a ese hash.

120.  **¿Por qué un script de automatización (`script.sh`) robusto debe incluir una sección de "Clean up" al principio que elimine contenedores y redes previas?**
    (a) Para asegurar la **idempotencia** del script, garantizando que siempre se ejecute en un estado limpio y produzca el mismo resultado, independientemente de si falló o tuvo éxito en ejecuciones anteriores.
    (b) Para liberar espacio en el disco duro, ya que los contenedores antiguos consumen muchos recursos.
    (c) Es un requisito de seguridad de Docker para evitar que los contenedores nuevos puedan acceder a datos de los antiguos.

121.  **En una red Clique con 3 validadores (`V1`, `V2`, `V3`), `V1` propone añadir a `V4` como nuevo validador. Para que la propuesta sea aceptada:**
    (a) `V1` y al menos otro validador (ej. `V2`) deben enviar una transacción de voto afirmativo para alcanzar la mayoría de `>50%` (2 de 3).
    (b) Solo `V1` necesita votar, ya que es el proponente; su voto cuenta como una aprobación automática si no hay objeciones.
    (c) Todos los validadores (`V1`, `V2`, `V3`) deben votar afirmativamente para que el cambio sea unánime y se aplique.

122. **¿Qué sucede si se intenta arrancar un nodo Besu (`nodo2`) con un `genesis.json` cuyo `Chain ID` es diferente al del `bootnode` (`nodo1`)?**
    (a) `nodo2` arrancará pero no podrá sincronizarse, y sus logs mostrarán errores de "Chain ID mismatch" al intentar conectar con `nodo1`.
    (b) `nodo2` adoptará el `Chain ID` de `nodo1` para mantener la consistencia.
    (c) La red se bifurcará (fork), creando dos blockchains paralelas con el mismo historial hasta el bloque 0.

123. **Un usuario configura Metamask con un RPC a su nodo local (`http://localhost:8545`). Luego se conecta a una DApp de Uniswap. La interfaz de Uniswap funciona, pero cualquier intento de hacer un "swap" falla. ¿Cuál es la causa más probable?**
    (a) El `Chain ID` de la red local Besu no coincide con el de Ethereum Mainnet, y los contratos inteligentes de Uniswap a los que la DApp intenta llamar no existen en la red local.
    (b) El nodo local no tiene suficiente Ether para pagar las tasas de gas de la transacción de swap.
    (c) Uniswap bloquea todas las conexiones que provienen de `localhost` por motivos de seguridad.

124. **Imagina una cartera HD. El usuario genera 5 cuentas. Luego, borra la cartera y la restaura desde la `seed phrase`. Al restaurarla, solo ve la primera cuenta. ¿Por qué y qué debe hacer?**
    (a) Es el comportamiento esperado. La cartera solo muestra las cuentas hasta la primera que no ha tenido ninguna transacción. El usuario debe hacer clic en "Añadir/Crear cuenta" varias veces, y la cartera volverá a derivar y mostrar las cuentas 2, 3, 4 y 5 en el mismo orden.
    (b) La `seed phrase` solo restaura la primera cuenta; las demás se han perdido para siempre.
    (c) Es un error de la cartera. Debería reiniciar la aplicación para que se sincronicen todas las cuentas.

125. **Imagina que expones el puerto RPC de tu nodo Besu local al público (con Port Forwarding) y un atacante obtiene acceso. ¿Cuál es el mayor riesgo INMEDIATO si el atacante NO conoce ninguna de tus claves privadas?**
    (a) Puede enviar un número masivo de transacciones de coste cero para llenar la mempool y los bloques, realizando un ataque de denegación de servicio (DoS) a tu red privada.
    (b) Puede robar los fondos de las cuentas del nodo, ya que el acceso RPC otorga permisos de firma.
    (c) Puede cambiar la lista de validadores de Clique usando la API `clique_propose`, ya que esta no requiere firma.

126.  **Si solo se mapea el puerto de `nodo1` (`-p 9999:8545`) en una red de 4 nodos, ¿cómo puede un script en el PC anfitrión consultar el balance de `nodo2`?**
    (a) No puede directamente. Tendría que mapear también el puerto RPC de `nodo2` (ej. `-p 9998:8545`) para poder acceder a él desde el host.
    (b) Conectándose a `localhost:9999` y especificando la dirección de `nodo2` en la llamada RPC. La petición llegará a `nodo1`, que podrá consultar el estado de `nodo2` internamente.
    (c) Conectándose al puerto P2P de `nodo1` (`localhost:30303`), que permite consultas de estado de todos los nodos de la red.

127.  **Escenario: Una red de 4 nodos (`nodo1` a `nodo4`) está funcionando, con `nodo1` como único bootnode. `nodo1` se cae y es eliminado. ¿Cuál es la estrategia más eficiente para añadir un nuevo `nodo5` y mantener la red cohesionada?**
    (a) Designar `nodo2` como el nuevo bootnode de facto. Arrancar `nodo5` con el flag `--bootnodes` apuntando al `enode` de `nodo2`.
    (b) Crear un `nodo-nuevo-bootnode` desde cero y reiniciar `nodo2`, `nodo3` y `nodo4` para que apunten a su nuevo `enode`. Luego, arrancar `nodo5` apuntando también a él.
    (c) Reiniciar `nodo2`, `nodo3` y `nodo4` sin ningún flag `--bootnodes`, ya que se conocen entre sí y el protocolo de cotilleo es suficiente para mantener la red.

128.  **La blockchain de Besu "nace" (se crea el bloque 0) en el preciso instante en que:**
    (a) El primer nodo (bootnode) arranca por primera vez y procesa el fichero `genesis.json` que se le ha proporcionado.
    (b) El comando `docker network create` finaliza con éxito.
    (c) Se termina de escribir el fichero `genesis.json` en el disco duro del PC anfitrión.

129.  **La URL `enode://<key>@<ip>:<port>` es fundamental para la red P2P de Ethereum. ¿Por qué es necesario pasar la URL completa al flag `--bootnodes` en lugar de un simple nombre de host como `nodo1`?**
    (a) Para garantizar la identidad criptográfica; la clave pública (`<key>`) es esencial para que el nodo que se conecta verifique que está hablando con el peer correcto y no con un impostor.
    (b) Porque el protocolo `enode://` no es compatible con la resolución de nombres DNS y requiere siempre una dirección IP literal.
    (c) El flag `--bootnodes` es un parámetro de Docker, no de Besu, y Docker no tiene acceso a las claves públicas generadas por Besu.

130. **Un desarrollador quiere que su DApp lea el balance de una cuenta en la red principal (Mainnet) de Ethereum sin ejecutar su propio nodo. ¿Cuál es el método más común y eficiente para lograrlo?**
    (a) Usar un servicio de "Nodo como Servicio" (Node-as-a-Service) como Infura, obteniendo una URL de endpoint RPC y una API Key para enviar las llamadas `eth_getBalance`.
    (b) Conectarse directamente a la red P2P de Ethereum a través de un cliente ligero en el navegador y solicitar los datos a peers aleatorios.
    (c) Enviar una petición HTTP a un explorador de bloques como Etherscan, y parsear (extraer) el balance del HTML de la página de la dirección.

131. **Escenario: En una red Clique de 5 validadores, un bloque B1 es creado por `V1`. Debido a una latencia de red, `V2` y `V3` reciben y aceptan B1. Al mismo tiempo, `V4` y `V5` no reciben B1 y, al ser el turno de `V4`, este crea un bloque B2 para la misma altura. ¿Qué ocurre a continuación?**
    (a) Es una bifurcación temporal. La cadena que logre que el siguiente validador construya sobre ella (cree un bloque hijo) se volverá la más larga y, por tanto, la canónica, haciendo que el otro bloque sea descartado (se convierta en "uncle/ommer").
    (b) La red se ha bifurcado (forked) permanentemente. Las transacciones en B1 y B2 son válidas en sus respectivas ramas.
    (c) Se activa un protocolo de votación de emergencia. Todos los validadores votan por B1 o B2, y el bloque con más votos se convierte en canónico.

132. **Un desarrollador quiere usar Kubernetes (K8S) en lugar de Docker para este proyecto. ¿Cuál sería el equivalente conceptual en K8S de un `docker run` y una `docker-network`?**
    (a) Un `Deployment` (o un `StatefulSet` para nodos) y un `Service` de tipo `ClusterIP` o `NodePort`.
    (b) `kubectl run` y un `Service Mesh` como Istio.
    (c) Un `Pod` y una `Ingress Rule`.

133. **¿Por qué la persistencia de datos usando volúmenes (`-v`) es absolutamente crítica para un nodo de blockchain en Docker?**
    (a) Porque los contenedores son efímeros; si el contenedor se elimina, toda la base de datos de la blockchain sincronizada (que puede tardar horas o días en construirse) se perdería si no estuviera almacenada en el PC anfitrión.
    (b) Porque el sistema de archivos de un contenedor es de solo lectura por defecto.
    (c) Para permitir que el frontend de React pueda leer directamente los ficheros de la base de datos del nodo.

134. **¿Qué es exactamente el "gossip" en el contexto de la red P2P de Ethereum?**
    (a) Un método por el cual un nodo propaga información (como una nueva transacción o un nuevo bloque) a un subconjunto aleatorio de sus peers, quienes a su vez la propagan a sus propios peers, asegurando una difusión rápida y descentralizada.
    (b) Un protocolo de chat encriptado que usan los operadores de nodos para coordinarse.
    (c) El proceso de votación que realizan los comités de atestación para validar un bloque.

135. **Escenario: Un script de automatización crea una red Besu con varios nodos, incluyendo `nodo-A` y `nodo-B`. El `genesis.json` se configura para dar 1000 ETH a una cuenta externa de MetaMask, pero no se asignan fondos a `nodo-A` ni a `nodo-B`. El script luego intenta ejecutar una transacción simple de `nodo-A` a `nodo-B`. La firma de la transacción es exitosa, pero al enviarla al RPC, la red devuelve el error: `{"code":-32004, "message":"Upfront cost exceeds account balance"}`. ¿Cuál es la causa raíz de este error?**
    (a) El nodo emisor (`nodo-A`) tiene un balance de 0 ETH. No puede pagar el "coste por adelantado" (gas * precio del gas) requerido para que su transacción sea siquiera considerada para inclusión en un bloque, aunque la firma criptográfica sea válida.
    (b) El `genesis.json` está corrupto. El error de "coste por adelantado" es un mensaje genérico que Besu emite cuando no puede leer correctamente la sección `alloc`.
    (c) La red está experimentando una congestión extrema y el `gasPrice` de la transacción es demasiado bajo para competir con otras transacciones en el "mempool".

136. **Un desarrollador está creando un script de automatización para una red Besu. El script debe generar las claves de los nodos y, a continuación, enviar una transacción de prueba desde el `bootnode` a otra cuenta. Al ejecutar el script por primera vez, la transacción falla con un error de "balance insuficiente". ¿Cuál es el flujo de trabajo correcto y más robusto para solucionar este problema de "huevo y gallina" (necesitar la dirección antes de poder financiarla)?**
    (a) Implementar un proceso de dos fases: 1. Ejecutar una primera fase del script que solo genere las identidades de los nodos (claves y direcciones) y las guarde. 2. Usar esas direcciones generadas para construir dinámicamente un `genesis.json` que incluya al `bootnode` en la sección `alloc` con fondos iniciales, y luego proceder con el despliegue de la red y la transacción de prueba.
    (b) Modificar el script para que, después de arrancar la red, utilice un "faucet" (grifo) centralizado para enviar ETH al `bootnode` antes de intentar la transacción de prueba.
    (c) Configurar el `bootnode` para que ignore los costes de gas (`--min-gas-price=0`) para las transacciones que origina él mismo, permitiéndole enviar transacciones aunque no tenga fondos.

137. **Escenario: Una red Besu con un consenso Clique de 3 validadores arranca correctamente, produce el bloque #1 y luego se detiene por completo (stall), sin generar más bloques. Las llamadas RPC a los nodos funcionan, pero las nuevas transacciones nunca se confirman. ¿Cuál es la causa más probable de este "stall" en el bloque #1?**
    (a) Ha ocurrido un fallo en la conectividad P2P entre los nodos validadores. No pueden comunicarse entre sí para alcanzar el quórum (`floor(N/2) + 1`) necesario para firmar y aceptar el bloque #2.
    (b) El `blockPeriodSeconds` en el `genesis.json` está configurado a un valor demasiado alto, y la red simplemente está esperando el siguiente intervalo para proponer un bloque.
    (c) La cuenta `coinbase` del validador cuyo turno es proponer el bloque #2 no tiene suficientes fondos para recibir la recompensa del bloque.

138. **En el mismo escenario de la red estancada (stalled), un desarrollador intenta enviar una transacción a través de una llamada `eth_sendRawTransaction`. La llamada no devuelve un error inmediato, pero la transacción nunca aparece en la blockchain. ¿Por qué ocurre esto?**
    (a) La transacción es aceptada en el "mempool" (la sala de espera de transacciones) del nodo RPC, pero como la red no puede producir nuevos bloques, nunca hay una oportunidad de incluirla y confirmarla. La llamada eventualmente expirará (timeout).
    (b) La red ha entrado en un modo de solo lectura por seguridad, y rechaza todas las transacciones que intentan modificar el estado hasta que se resuelva el problema de consenso.
    (c) El `nonce` de la transacción es incorrecto, y el nodo la descarta silenciosamente sin propagarla al resto de la red.

139. **Un script de despliegue intenta firmar una transacción usando un helper en Node.js que requiere la librería `ethers`. El comando en el script se ve así: `node ./utils/sign.js $TX_DATA > /dev/null 2>&1`. El script continúa sin errores aparentes, pero no se genera ninguna transacción firmada. ¿Cuál es la causa más probable de este "fallo silencioso"?**
    (a) La librería `ethers` no está instalada en el entorno (`node_modules` no existe o está incompleto). El comando `node` falla, pero su salida de error es redirigida a `/dev/null` por `2>&1`, ocultando el problema y permitiendo que el script continúe.
    (b) La variable `$TX_DATA` está vacía o malformada, y el script de Node.js termina correctamente sin hacer nada.
    (c) El sistema de archivos tiene permisos incorrectos, y el script de shell no puede ejecutar `node` o leer el fichero `sign.js`.

140. **Al revisar la configuración de una red Besu, se descubre un nodo llamado `data-replica-5` que está funcionando pero no tiene asignado ningún rol (`validator`, `bootnode`, `rpc`). Aunque no es la causa directa de un fallo de red, ¿qué representa esta situación?**
    (a) Una mala práctica y una posible ineficiencia. El nodo consume recursos (CPU, memoria, disco) para sincronizar la cadena, pero no contribuye a la seguridad (no valida), a la conectividad (no es bootnode) ni ofrece un punto de acceso (no tiene RPC), siendo un "peso muerto" en la red.
    (b) Una configuración de seguridad avanzada, donde el nodo actúa como un "honeypot" para detectar ataques a la red P2P.
    (c) Un nodo en modo "archivo". Está diseñado específicamente para almacenar una copia completa de la blockchain para fines de auditoría, y por eso no necesita otros roles.

141.  **Tras desplegar una red Besu, un nodo RPC (`rpc-3`) reporta tener 0 peers, mientras que el bootnode (`boot-1`) reporta tener 2 peers (los otros dos nodos de la red). Se ha verificado que el `config.toml` de `rpc-3` apunta correctamente al enode de `boot-1` y que el flag `--sync-min-peers=0` está activo para todos los nodos. Al revisar los logs de `rpc-3`, no se observa ningún error fatal, solo mensajes de "Waiting for peers". ¿Cuál es la causa más probable de este aislamiento selectivo?**
    (a) El `config.toml` del bootnode (`boot-1`) también contiene su propia URL en la lista `bootnodes`. Esto crea una condición de carrera donde el bootnode, al intentar descubrirse a sí mismo, no siempre inicializa su servicio P2P a tiempo para atender las peticiones de conexión de los nodos que arrancan más tarde, como `rpc-3`.
    (b) El flag `--sync-min-peers=0` es incorrecto. La versión de Besu desplegada requiere `--min-sync-peers=0` y, al no reconocerlo, el nodo `rpc-3` utiliza el valor por defecto de 5, quedándose atascado porque solo existen 3 otros nodos en la red.
    (c) Hay un problema de firewall en la red Docker. Aunque el bootnode puede establecer conexiones salientes a los primeros nodos, el firewall está bloqueando las conexiones entrantes desde la IP de `rpc-3`, pero no desde las IPs de los otros nodos.
    (d) El nodo `rpc-3` fue iniciado con un `chain-id` diferente en sus parámetros de `docker run`, lo que le hace rechazar las conexiones de los otros nodos de la red a pesar de que el `genesis.json` sea el mismo.

142.  **Un script de automatización falla al iniciar los contenedores de Besu, los cuales se detienen inmediatamente después de arrancar (el "punto gris"). El log de un contenedor muestra el error: `Unknown option in TOML configuration file: rpc-http-api`. Sin embargo, el desarrollador verifica que la línea `rpc-http-api=["ETH","NET","CLIQUE"]` en el `config.toml` es sintácticamente correcta. ¿Cuál es la causa raíz más probable de que Besu no reconozca una opción estándar?**
    (a) Existe un error de sintaxis en una línea *anterior* en el `config.toml`, como un parámetro con guiones sin comillas (ej. `min-peers-to-start-sync=0`). Esto provoca que el parser de TOML falle silenciosamente y nunca llegue a procesar la línea `rpc-http-api`, haciendo que Besu crea que la opción no fue proporcionada.
    (b) La imagen Docker `hyperledger/besu:latest` local está desactualizada y corresponde a una versión muy antigua donde el módulo RPC se configuraba con un nombre diferente, como `json-rpc-http-api`.
    (c) El script está montando un volumen de Docker incorrecto, y el contenedor no está leyendo el `config.toml` esperado, sino uno por defecto o vacío que carece de la opción `rpc-http-api`.
    (d) La opción `rpc-http-api` solo es válida si `miner-enabled=true` también está presente en el `config.toml`, y este nodo en particular no es un minero.

143.  **Un desarrollador intenta solucionar un problema de aislamiento de nodos añadiendo el flag `--sync-min-peers=0` directamente al comando `docker run`. El contenedor falla al arrancar y el log muestra `Unknown option: '--sync-min-peers=0'. Possible solutions: --sync-mode, --p2p-enabled`. El desarrollador, confundido, ejecuta `docker pull hyperledger/besu:latest` y el sistema responde `Status: Image is up to date`. ¿Qué conclusión lógica se deriva de este conjunto de hechos?**
    (a) El parámetro `--sync-min-peers` no se establece como un flag directo, sino que es una sub-opción de otro parámetro principal. La sintaxis correcta probablemente sería algo como `--sync-mode=X --sync-options="min-peers=0"`, y Besu no lo está aceptando en el formato proporcionado.
    (b) El error es un falso negativo. Existe un conflicto de permisos en el volumen montado (`-v`) que impide a Besu leer su archivo de configuración, y al no encontrarlo, intenta validar los flags de la línea de comandos contra un conjunto de opciones por defecto, donde `--sync-min-peers` no está incluido.
    (c) La imagen `hyperledger/besu:latest` en el repositorio oficial de Docker Hub ha sido actualizada con una regresión que eliminó el flag `--sync-min-peers`, y la pista `Possible solutions` es la única guía correcta.
    (d) El nombre del flag fue cambiado en una versión intermedia. Ni el nombre "moderno" (`--sync-min-peer-count`) ni el nombre "antiguo" (`--sync-min-peers`) son correctos; el verdadero flag podría ser algo diferente no sugerido, como `--discovery-min-peers=0`.

144.  **Durante el proceso de depuración, un script de despliegue se modifica para que el `genesis.json` pre-financie las cuentas de los nodos generados automáticamente. Tras un `clean build`, las transacciones de prueba siguen fallando con el error `Upfront cost exceeds account balance`. El desarrollador confirma que los nodos tienen rol de `validator` y que el `genesis.json` en su disco local contiene las direcciones de los nodos con balances correctos. ¿Cuál es el error de despliegue más probable?**
    (a) El comando `docker run` está montando el `genesis.json` desde una ruta incorrecta o un directorio cacheado. Aunque el archivo en `script/genesis.json` es correcto, el contenedor está leyendo una versión antigua del archivo que no contiene los balances de los nodos.
    (b) El `chainId` especificado en el `genesis.json` no coincide con el `network-id` pasado como flag en el `docker run`. Esto causa que el nodo ignore el `genesis.json` personalizado y genere uno por defecto donde los nodos no tienen fondos.
    (c) El formato del balance en el `genesis.json` está como un número decimal en lugar de un string hexadecimal. Besu requiere que los balances estén en formato string hexadecimal (ej. `"0x3b9aca00"`), y al no poder parsear el valor decimal, asigna un balance de 0.
    (d) El error es engañoso. Los nodos sí tienen fondos, pero el `gasPrice` de la transacción es tan astronómicamente alto que supera incluso el balance pre-financiado, un error común al no configurar explícitamente el precio del gas.

145.  **Una red Clique PoA se despliega con dos nodos validadores, `validator-A` y `validator-B`. La red arranca, los nodos se conectan entre sí (cada uno reporta 1 peer), pero la producción de bloques se detiene después del bloque génesis. No hay errores de "conexión rechazada" ni "configuración inválida" en los logs. ¿Cuál es la explicación más precisa de este "stall" o atasco?**
    (a) La red está en un punto muerto de consenso. Para crear un nuevo bloque, se requiere una mayoría de `floor(2/2) + 1 = 2` firmas. Si `validator-A` propone un bloque, debe obtener la firma de `validator-B` para que sea válido. Debido a la latencia de red, por mínima que sea, es posible que la firma de `validator-B` no llegue antes de que la propuesta de bloque de `validator-A` expire, y viceversa, creando un ciclo infinito donde ningún bloque puede ser finalizado.
    (b) Uno de los dos validadores tiene un reloj de sistema (NTP) desincronizado. El protocolo Clique es sensible al timestamp de los bloques, y si la diferencia de tiempo entre los dos nodos es mayor que `blockPeriodSeconds`, rechazarán mutuamente sus propuestas de bloque, causando el atasco.
    (c) El `epochLength` en el `genesis.json` está configurado a un valor demasiado bajo. Si `epochLength` es 2, después del primer bloque se activa una votación para añadir/eliminar validadores, y al no haber votos, el sistema entra en un estado de limbo de consenso.
    (d) Ambos validadores están intentando minar el mismo bloque al mismo tiempo. Al detectar una colisión, ambos descartan su trabajo y esperan un tiempo aleatorio para volver a intentarlo, pero debido a la baja latencia, vuelven a colisionar, entrando en un "livelock".

146.  **Un equipo de desarrollo configura una red de pruebas con 4 nodos, de los cuales 2 son validadores, para simular un entorno de alta disponibilidad donde si un validador falla, el otro puede continuar. Sin embargo, observan que cuando apagan manualmente uno de los dos nodos validadores, toda la red deja de producir bloques inmediatamente. ¿Por qué su hipótesis de "alta disponibilidad" es incorrecta para esta configuración?**
    (a) Porque el requisito de consenso en una red de 2 validadores es del 100% de participación. La mayoría necesaria es 2. Cuando un nodo se apaga, el único validador restante solo puede reunir 1 firma (la suya), lo cual es insuficiente para alcanzar el umbral de 2 firmas. Por lo tanto, la red no tiene tolerancia a fallos.
    (b) Porque el nodo que se apaga era también el `bootnode`. Al caerse el bootnode, el validador restante pierde la conexión con el resto de la red, y aunque podría técnicamente minar bloques, no los puede propagar, deteniendo el avance percibido de la cadena.
    (c) Porque en Clique, los validadores se turnan para proponer bloques. Si el validador `A` se apaga justo cuando era su turno, el validador `B` debe esperar un tiempo de "timeout" muy largo (varios minutos) antes de poder tomar el turno, lo que parece un atasco total de la red.
    (d) Porque el `extraData` del `genesis.json` lista los validadores en un orden específico. Si el primer validador de la lista se apaga, el protocolo tiene un bug que impide al segundo validador asumir el rol de proponente principal.


    Entendido. Tienes toda la razón. La pregunta original no captura bien la sutileza de "por qué unos sí y otros no" a pesar de un `sleep`. Necesitamos preguntas que fuercen al estudiante a pensar en el *no determinismo* y en los estados internos de la aplicación, no solo en el flujo del script.

147. **Un script despliega una red Besu con un bootnode y varios peers. El bootnode se configura incorrectamente para que se incluya a sí mismo en su propia lista de `bootnodes`. Para compensar, el script incluye una larga pausa (`sleep 120`) después de lanzar el bootnode, antes de lanzar los peers. A pesar de esta espera de 2 minutos, se observa consistentemente que algunos peers se conectan, pero otros quedan aislados. ¿Cuál es la explicación más precisa de por qué un `sleep` prolongado no soluciona el problema?**
    (a) Porque el problema no es de tiempo, sino de estado. Al intentar conectarse a sí mismo, el módulo P2P del bootnode puede entrar en un ciclo de reintentos fallidos de "auto-descubrimiento". Este estado anómalo puede persistir indefinidamente, haciendo que el bootnode acepte conexiones entrantes solo de forma intermitente y errática, sin importar cuánto tiempo haya pasado.
    (b) Porque Docker gestiona los recursos de CPU de forma dinámica. Después de un tiempo de inactividad, Docker podría reducir la prioridad de la CPU del contenedor del bootnode. Cuando los peers intentan conectarse de golpe, el bootnode no tiene suficientes ciclos de CPU para procesar todas las peticiones, descartando algunas.
    (c) Porque la tabla DHT (Distributed Hash Table) del bootnode se llena con su propia entrada, causando un "envenenamiento de caché". Esto impide que pueda registrar correctamente las nuevas peticiones de conexión de los peers, aceptando solo las primeras que llegan antes de que la caché se corrompa.
    (d) Porque el `sleep` en el script solo pausa el script de bash, no el contenedor de Docker. Durante esos 2 minutos, el bootnode ha estado intentando conectar con los peers (que aún no existen), y al fallar repetidamente, ha añadido sus futuras IPs a una lista negra temporal, rechazándolos cuando finalmente arrancan.

148. **Se ejecuta un script que lanza 4 nodos Besu en rápida sucesión: `boot-1` (el bootnode), `validator-2`, `rpc-3` y `data-4`. El script NO tiene pausas (`sleep`). Se observa un resultado no determinista: a veces, todos los nodos se conectan, pero a menudo, `data-4` queda aislado. Sabiendo que `boot-1` se configura para descubrirse a sí mismo, ¿cuál es la mejor descripción de esta condición de carrera?**
    (a) El resultado depende de si el módulo P2P de `boot-1` completa su ciclo de inicialización interna *antes o después* de que la petición de conexión de `data-4` llegue. Si `validator-2` y `rpc-3` se conectan durante la fase "precaria" de arranque del bootnode, mientras que `data-4` intenta conectar justo en el momento en que el bootnode está en un ciclo de reintento interno, su petición será rechazada, resultando en su aislamiento.
    (b) El kernel del sistema operativo tiene un límite en el número de conexiones TCP que un solo proceso puede aceptar en un corto período de tiempo. Los tres nodos (`validator-2`, `rpc-3`, `data-4`) intentan conectar casi simultáneamente, y el sistema operativo acepta las dos primeras peticiones pero descarta la de `data-4` por "rate limiting".
    (c) El nodo `boot-1` utiliza un algoritmo de "backoff exponencial" para descubrir peers. Después de conectarse exitosamente con `validator-2` y `rpc-3`, entra en un período de "enfriamiento" para no sobrecargar la red, ignorando deliberadamente la petición de `data-4` durante este tiempo.
    (d) Todos los nodos (`validator-2`, `rpc-3`, `data-4`) obtienen la lista de peers del bootnode, pero `data-4`, al ser el último, recibe una lista que ya incluye a `validator-2` y `rpc-3`. Intenta conectar con ellos en lugar del bootnode, pero como ellos mismos aún no están completamente sincronizados, rechazan su conexión.

149.  **Un nodo Besu en un contenedor Docker (`172.20.0.3`) necesita enviar datos de telemetría a un servidor externo en Internet. La configuración de red del contenedor, visible con `docker inspect`, muestra que su `gateway` es `172.20.0.1`. ¿Cuál es la función precisa y obligatoria de esta dirección de gateway para que la comunicación del nodo con el exterior sea exitosa?**
    (a) Actuar como el enrutador de primer salto. El sistema operativo del contenedor envía todos los paquetes destinados a redes externas (fuera de la subred `172.20.0.0/16`) a la dirección MAC del gateway, que luego son gestionados por el motor de Docker para ser enrutados hacia Internet, típicamente mediante NAT en la máquina anfitriona.
    (b) Traducir el nombre de dominio del servidor de telemetría a una dirección IP, actuando como el servidor DNS primario para el contenedor.
    (c) Asignar dinámicamente la dirección IP `172.20.0.3` al contenedor al iniciarse, funcionando como un servidor DHCP interno de la red Docker.

150. **Se configura un firewall en la máquina anfitriona (host) que bloquea todo el tráfico saliente cuya IP de origen sea `172.20.0.1`, que es el gateway de la red Docker. Un nodo Besu dentro de un contenedor en `172.20.0.3` intenta establecer una conexión con un `bootnode` en la Internet pública. ¿Cuál es el resultado y por qué?**
    (a) La conexión fallará. El tráfico del contenedor destinado a Internet es enrutado a través del gateway (`172.20.0.1`). Luego, el host aplica Network Address Translation (NAT), haciendo que el tráfico parezca originarse desde la IP del host. Sin embargo, las reglas de `iptables` de Docker (cadena `DOCKER-USER` o `FORWARD`) procesan el paquete mientras su origen lógico aún está dentro de la red Docker, y el firewall del host puede bloquearlo basándose en la IP interna del gateway antes de que se complete el NAT.
    (b) La conexión funcionará sin problemas, ya que la tecnología de virtualización de red de Docker crea un túnel cifrado que evade las reglas del firewall del sistema anfitrión.
    (c) La conexión fallará, pero el nodo Besu detectará el bloqueo y automáticamente intentará usar un protocolo de comunicación alternativo (como WebSocket en lugar de TCP) para sortear el firewall.

151.  **Un administrador configura un nuevo nodo validador (`nodoN`) para una red Clique. Verifica que la clave privada proporcionada genera la dirección correcta, la cual está autorizada en el `genesis.json`. Sin embargo, por error, configura el nodo para que anuncie un `enode` URL que contiene una clave pública *diferente* a la que corresponde a su clave privada. ¿Cuál es la consecuencia técnica inmediata cuando otros nodos intentan conectarse a `nodoN`?**
    (a) La conexión será rechazada durante el handshake del protocolo de descubrimiento RLPx. La verificación criptográfica fallará porque la firma que `nodoN` usa para autenticarse (generada con su clave privada real) no podrá ser verificada positivamente por los pares usando la clave pública incorrecta que `nodoN` anunció en su `enode`.
    (b) La conexión se establecerá correctamente, pero `nodoN` no podrá sincronizar bloques porque los hashes de los bloques que reciba no coincidirán con los que calcule localmente.
    (c) La conexión se establecerá y el nodo funcionará, pero cualquier sistema de monitoreo externo que se base en la clave pública lo reportará como un nodo no identificado, siendo un problema puramente cosmético.

152.  **En una red que utiliza el mecanismo de consenso QBFT, donde la identidad de un validador está ligada a su clave pública, se restaura un nodo a partir de una clave privada. Un script de auditoría verifica que la clave privada genera una dirección que pertenece al conjunto de validadores activos. ¿Por qué es esta comprobación críticamente insuficiente y debe validarse también la clave pública correspondiente?**
    (a) Porque los mensajes de consenso de QBFT (Prepare/Commit) son firmados y la recuperación de la clave pública a partir de la firma es fundamental para atribuir el voto. Si la clave pública recuperada de la firma no coincide con la clave pública esperada en la lista de validadores para esa ronda, los demás nodos considerarán el voto como inválido y lo descartarán, aunque la dirección derivada sea correcta.
    (b) Porque la clave pública es necesaria para cifrar las transacciones privadas entre los miembros del consorcio, y sin la correcta, el nodo no podría participar en transacciones confidenciales.
    (c) Porque la dirección de un validador podría tener múltiples claves privadas asociadas debido a un error en el algoritmo de generación de claves de Besu, y solo la clave pública puede desambiguar cuál es la correcta.

153.  **Una dApp interactúa con una red de prueba (`Testnet-A`, `chainID=1337`). El usuario firma un mensaje "Permit" (EIP-2612) para un contrato de token en la dirección `0xContractA`. Un atacante despliega un clon exacto de este contrato en `Fraud-Net` (también `chainID=1337`), pero debido a que el desplegador es diferente, el contrato se crea en una dirección distinta, `0xContractB`. El atacante obtiene la firma original del usuario e intenta retransmitirla al contrato `0xContractB`. ¿Cuál es el resultado?**
    (a) El ataque fallará y la transacción será revertida. El estándar EIP-712, en el que se basa "Permit", incluye la dirección del contrato (`verifyingContract`) en el hash del dominio que se firma. La función `permit` en `0xContractB` recalculará este hash usando su propia dirección, y no coincidirá con el hash firmado por el usuario (que se basaba en `0xContractA`).
    (b) El ataque tendrá éxito, ya que el `chainID` idéntico es el único factor de seguridad contra la repetición entre cadenas, y al ser el mismo, la firma se considera válida en cualquier contrato con la misma interfaz.
    (c) El ataque solo fallará si la wallet del usuario está online y detecta la retransmisión en una red no autorizada, enviando una transacción de cancelación.

154.  **Dos redes privadas de Besu, `Red-Alfa` y `Red-Beta`, operan por error con el mismo `chainID=4242`. Un usuario, con la misma dirección en ambas redes, tiene un `nonce` de cuenta de `15` en `Red-Alfa` y un `nonce` de `20` en `Red-Beta`. Un atacante captura una transacción firmada enviada a `Red-Alfa` con `nonce=15`. ¿Puede el atacante retransmitir exitosamente esta transacción en `Red-Beta` en un entorno de red estable y sin reinicios?**
    (a) No, es imposible. Un nodo de `Red-Beta` recibirá la transacción con `nonce=15` y la rechazará inmediatamente porque espera una transacción con `nonce=20` para esa cuenta. Una transacción con un nonce inferior al actual de la cuenta es siempre inválida.
    (b) Sí, el atacante puede "guardar" la transacción y retransmitirla en `Red-Beta` después de que el usuario haya enviado exactamente 5 transacciones más en esa red para alcanzar el nonce `20`.
    (c) Sí, porque el `chainID` idéntico hace que la firma sea válida, y los nodos de `Red-Beta` la aceptarán en su mempool, aunque no la procesarán hasta que el nonce sea el correcto.

155. **El método `generateDeterministicIdentity` utiliza `ethers.keccak256(ethers.toUtf8Bytes(seed))` para crear una entropía a partir de un `seed` string. Un desarrollador utiliza el mismo `identitySeed` para un nodo validador (`validator-1`) y un nodo RPC (`rpc-1`) en la misma red. ¿Cuál es la consecuencia CRÍTICA de esta acción?**
    (a) Ambos nodos tendrán la misma clave privada y, por lo tanto, la misma dirección Ethereum. Esto provocará un conflicto irresoluble a nivel de protocolo, donde las transacciones y bloques firmados por uno serían indistinguibles del otro, y el nonce de la cuenta se volvería inconsistente.
    (b) El rendimiento de la red se degrada porque ambos nodos compiten por los mismos recursos criptográficos.
    (c) El `NetworkBuilder` detectará el uso del mismo `identitySeed` y lanzará un error `ConfigurationValidationError` antes de construir la red.
    (d) Solo se emitirá una advertencia de seguridad en la consola, pero la red funcionará correctamente asignando roles diferentes a cada nodo.

156. **En el método `Network.addNode`, si se especifica un `initialBalance`, el SDK intenta financiar la nueva cuenta desde un validador existente. La lógica de financiación está dentro de un bloque `try...catch` que, en caso de fallo, solo emite un `log.error`. ¿Qué sucede si la transacción de financiación falla porque el validador "funder" no tiene suficiente ETH para pagar el gas?**
    (a) La adición del nodo continúa. El contenedor del nuevo nodo se inicia y se une a la red correctamente, pero su cuenta tendrá un balance de 0 ETH, y el SDK simplemente mostrará un mensaje de error sobre el fallo de la financiación.
    (b) El proceso de añadir el nodo se revierte por completo, y el contenedor del nuevo nodo es eliminado para mantener la consistencia de la red.
    (c) La red entera se detiene (`stall`) porque una transacción crucial ha fallado, y espera a que el validador "funder" reciba fondos para poder continuar.
    (d) El SDK reintentará automáticamente la transacción de financiación cada nuevo bloque hasta que tenga éxito.

157. **El SDK permite crear una red Clique con 2 validadores. Si uno de estos validadores se detiene (por ejemplo, `docker stop validator-2`), la red deja de producir bloques. Basado en el funcionamiento de Clique, ¿cuál es la razón fundamental de este "stall"?**
    (a) El consenso Clique requiere una mayoría de `floor(N/2) + 1` firmas para validar un bloque. Con N=2, la mayoría es 2. El único validador restante solo puede proporcionar su propia firma, por lo que nunca puede alcanzar el quórum necesario.
    (b) Porque el nodo detenido era también el `bootnode`, y el validador restante no puede descubrir a otros peers para propagar sus bloques.
    (c) La red entra en un "periodo de epoch" para votar por un nuevo conjunto de validadores, y al no haber suficientes votos, el consenso se pausa indefinidamente.
    (d) El protocolo requiere que siempre haya un número impar de validadores activos; una configuración con un número par es inherentemente inestable.

158. **La clase `BesuNode` ofrece dos métodos para obtener un proveedor de ethers.js: `getRpcProvider()` (que crea un `JsonRpcProvider`) y `getWsProvider()` (que crea un `WebSocketProvider`). Una dApp necesita mostrar notificaciones en tiempo real cada vez que se mina un nuevo bloque, sin sobrecargar al nodo con peticiones constantes. ¿Cuál es el enfoque más eficiente utilizando el SDK?**
    (a) Usar `node.getWsProvider()` y suscribirse al evento `provider.on('block', ...)` una sola vez, permitiendo que el nodo notifique a la dApp de forma proactiva cada nuevo bloque.
    (b) Usar `node.getRpcProvider()` y llamar a `provider.getBlockNumber()` dentro de un `setInterval` cada segundo para detectar cambios.
    (c) Usar `node.getLogs()` periódicamente para comprobar si el número de logs ha aumentado, lo que indicaría un nuevo bloque.
    (d) Usar `node.getWallet()` y intentar enviar una transacción de gas cero; si tiene éxito, significa que se ha minado un nuevo bloque.

159. **El `DockerManager` incluye un método `adoptNetwork`. Un equipo de DevOps ya tiene una red de pruebas compleja creada manualmente con `docker-compose`, que no usa las etiquetas `besu-sdk=true`. ¿Qué permitiría la funcionalidad de "adopción" del SDK en este escenario?**
    (a) El SDK podría inspeccionar la red Docker existente para obtener su `subnet`, y luego permitir al `NetworkBuilder` añadir nuevos nodos (con las etiquetas del SDK) que sean compatibles y puedan comunicarse con los nodos preexistentes.
    (b) El SDK podría tomar el control total de la red, incluyendo la eliminación de contenedores y la red de Docker durante el `teardown`, incluso si no tienen las etiquetas del SDK.
    (c) La función `adoptNetwork` fallaría porque la red de `docker-compose` no contiene el fichero `network.json` que el SDK necesita para la gestión.
    (d) La adopción se limita a leer los logs de los contenedores existentes, pero no permite añadir nuevos nodos ni gestionar el ciclo de vida de los existentes.

160. **El método `waitForNodeReady` en `BesuNode.ts` tiene una lógica diferenciada: si un nodo es RPC, sondea su endpoint hasta obtener una respuesta. Si no es un nodo RPC, simplemente comprueba que el estado del contenedor Docker sea "running" y no "restarting". ¿Qué problema podría surgir en un nodo NO-RPC que pasa esta comprobación?**
    (a) El contenedor podría estar en estado "running", pero el proceso Besu interno podría estar atascado en el bloque génesis debido a un problema de conectividad P2P que no es detectable solo por el estado del contenedor. La red lo consideraría "listo" prematuramente.
    (b) Ninguno, si el contenedor está en estado "running" significa que el proceso Besu interno está completamente funcional y sincronizado.
    (c) El nodo no-RPC podría empezar a consumir una cantidad excesiva de CPU, lo que el `waitForNodeReady` no detectaría, llevando a una degradación del rendimiento del sistema anfitrión.
    (d) Docker podría reportar el estado "running" mientras todavía está montando los volúmenes, causando que el nodo falle por no encontrar el `genesis.json` inmediatamente después de que `waitForNodeReady` termine.

161. **El SDK, a través de `validators/config.ts`, impone una restricción para que las subredes de Docker (`subnet`) estén en los rangos de IP privadas (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). ¿Por qué el SDK es más estricto que Docker, que permitiría usar cualquier rango de IP?**
    (a) Para prevenir problemas de enrutamiento y conflictos de red difíciles de depurar, donde los contenedores podrían intentar comunicarse con IPs públicas reales en Internet en lugar de con otros nodos de la red local.
    (b) Para mejorar el rendimiento, ya que los routers gestionan el tráfico de IPs privadas de forma más eficiente que el de IPs públicas.
    (c) Es un requisito del protocolo de consenso Clique, que no funciona correctamente con rangos de IP públicas.
    (d) Para cumplir con los estándares de seguridad de Hyperledger, que prohíben el uso de IPs públicas en redes de desarrollo.

162. **En `Network.ts`, el método `teardown` se llama dentro de un bloque `catch` si el `setup` falla. ¿Qué principio de diseño de software robusto demuestra esta implementación?**
    (a) Idempotencia y "Cleanup on Failure", asegurando que un fallo a mitad del `setup` no deje recursos huérfanos (como redes Docker o directorios de datos), permitiendo que el usuario pueda volver a ejecutar la operación desde un estado limpio sin intervención manual.
    (b) Inyección de dependencias, ya que `teardown` depende del estado del `setup`.
    (c) "Fail-fast", ya que el sistema se detiene y limpia al primer signo de error.
    (d) Programación defensiva, ya que asume que el `setup` siempre fallará y prepara la limpieza de antemano.

163. **La función `addressFromEnode` en `key-generator.ts` extrae la clave pública de la URL enode y usa `ethers.computeAddress` para derivar la dirección. ¿Qué ataque previene la verificación implícita al conectar a un peer usando su enode completo en lugar de solo su IP?**
    (a) Un ataque de denegación de servicio (DoS) contra el puerto 30303.
    (b) Un ataque de repetición de transacciones (`replay attack`).
    (c) Un ataque de intermediario ("Man-in-the-Middle"), donde un atacante en la misma red podría hacerse pasar por el bootnode. El nodo que se conecta puede verificar criptográficamente que la clave pública del peer al que se ha conectado corresponde a la de la URL enode.
    (d) Un ataque de "eclipse", donde se aísla a un nodo de la red principal.

164. **La clase `NetworkBuilder` tiene un método `clone()`. ¿Cuál es un caso de uso práctico y potente para esta funcionalidad en un entorno de pruebas de CI/CD?**
    (a) Para definir una configuración base (ej. 3 validadores, un `chainId` de test) y luego, a partir de clones, crear rápidamente múltiples variaciones para probar diferentes parámetros (ej. un `blockPeriod` muy bajo, otro con muchos nodos RPC), sin redefinir la configuración común cada vez.
    (b) Para crear una copia de seguridad en caliente de una red en ejecución.
    (c) Para migrar una red de un host Docker a otro.
    (d) Para aumentar el número de validadores en una red ya en ejecución, clonando un validador existente.

165. **El `DockerManager` aplica etiquetas como `besu-sdk=true` a todas las redes y contenedores que crea. Su método `cleanupAll()` busca y elimina todos los recursos con esta etiqueta. ¿Qué problema resuelve este enfoque basado en etiquetas?**
    (a) Mejora el rendimiento del `docker ps` y `docker network ls` al permitir que Docker indexe los recursos por etiquetas.
    (b) Permite que el SDK coexista de forma segura en una máquina que ejecuta otros contenedores no relacionados (ej. bases de datos, servidores web), asegurando que las operaciones de limpieza del SDK solo afecten a sus propios recursos y no destruyan accidentalmente otros proyectos.
    (c) Es un requisito para que los contenedores Besu se comuniquen entre sí, ya que solo pueden descubrir peers con la misma etiqueta.
    (d) Permite aplicar políticas de seguridad de Docker específicas solo a los contenedores etiquetados por el SDK.











dime el array de repsuetsa correctas
# Scripts de despliegue de red Besu

Esta carpeta contiene los scripts necesarios para crear y gestionar una red Hyperledger Besu de prueba usando Docker.

## ¿Qué hace el script principal?
- El script `script.sh` automatiza la creación de una red Besu con nodos bootnode, minero y rpc.
- Genera claves y archivos de configuración para cada nodo.
- Crea la red de Docker y los contenedores necesarios.
- Realiza una transacción de prueba para verificar el funcionamiento de la red.

## ¿Cómo ejecutarlo?
1. **Requisitos previos:**
   - Tener Docker instalado y corriendo en el sistema.
   - Tener Node.js instalado (para los scripts `.mjs` y `.js`).
   - Ejecutar desde una terminal con permisos suficientes para Docker.

2. **Ejecución:**
   - Navega a la carpeta `script` desde la terminal:
     ```sh
     cd script
     ```
   - Da permisos de ejecución al script (solo la primera vez):
     ```sh
     chmod +x script.sh
     ```
   - Ejecuta el script:
     ```sh
     ./script.sh
     ```

3. **¿Qué genera?**
   - Una red Docker llamada `besu-network`.
   - Directorios y archivos de configuración en `script/networks/besu-network`.
   - Contenedores Docker para cada nodo de la red.

## Archivos importantes
- `script.sh`: Script principal de automatización.
- `createPrivatePublicKeys.mjs`, `generateAccounts.mjs`, `transfer.js`: Scripts auxiliares para generación de claves y cuentas.
- `accounts.json`: Archivo generado con las cuentas de prueba.

## Notas para los revisores
- El script elimina cualquier red/contendor anterior con la label `network=besu-network` antes de crear una nueva red.
- Si hay errores, revisar que Docker esté corriendo y que no haya conflictos de puertos.
- Para limpiar todo, puedes ejecutar el script nuevamente o eliminar manualmente la red y los contenedores desde Docker Desktop.

---

**Autor:** Dariel Frias 
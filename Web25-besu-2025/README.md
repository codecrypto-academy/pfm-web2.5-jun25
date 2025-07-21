# Sistema de Gestión de Redes Hyperledger Besu

## Introducción a Hyperledger Besu

Hyperledger Besu es un cliente Ethereum empresarial diseñado para ser utilizado en redes públicas y privadas. En este proyecto se implementa una red privada utilizando el consenso Clique (Proof of Authority), que permite una validación rápida y eficiente de transacciones mediante un conjunto de nodos validadores autorizados, ideal para entornos empresariales.

Se proporciona una solución completa para gestionar redes Besu utilizando contenedores Docker, con una interfaz web para la administración y monitoreo de nodos. El sistema permite la gestión de validadores mediante un sistema de propuestas donde los firmantes existentes pueden votar para añadir o eliminar nuevos validadores.

### Componentes de una Red Besu

1. **Nodos Validadores (Mineros)**
   - Participan en el consenso Clique
   - Proponen y validan bloques
   - Mantienen la integridad de la red
   - Requieren claves privadas para firmar bloques

2. **Bootnode**
   - Punto de entrada inicial para nuevos nodos
   - Facilita el descubrimiento P2P
   - Mantiene la lista de nodos activos

3. **Nodos RPC**
   - Proporcionan acceso a la API JSON-RPC
   - Permiten interactuar con la blockchain
   - Procesan transacciones y consultas

4. **Nodos Completos**
   - Almacenan la blockchain completa
   - Sincronizan con otros nodos

## Introducción al Proyecto

### Descripción del funcionamiento de la aplicación 🚀

Esta aplicación web, desarrollada en **Next.js**, permite gestionar redes y nodos Hyperledger Besu de forma visual e intuitiva.

- **Frontend** (`/web/app`):  
  🖥️ Construido con React, TypeScript y TailwindCSS para una interfaz moderna y animaciones fluidas (gracias a framer-motion).

- **Backend** (`/web/lib`):  
  🛠️ Desarrollado en Node.js, expone una API REST que utiliza la librería `lib-besu` para crear y gestionar redes y nodos Besu, conectándose a una base de datos MongoDB.

- **Gestión Inteligente (IA)**:  
  🤖 La página `ai-manager` permite enviar instrucciones en lenguaje natural. El backend utiliza la API de OpenAI para interpretar las órdenes y comunicarse con el servidor MCP, que ejecuta acciones como crear redes, añadir nodos o consultar balances.

- **Servidor MCP**:  
  🔗 Escrito en Node.js, recibe peticiones del backend y ejecuta herramientas como `create_besu_network`, `add_besu_node`, `start_besu_network`, etc., usando la librería `lib-besu` y MongoDB.

En resumen, la aplicación integra gestión visual, automatización inteligente y control seguro de redes Besu, facilitando la administración de blockchains empresariales de forma sencilla y eficiente.

### Escema General

```mermaid
graph TD
    A[Frontend Next.js] --> B[Page ai-manager]
    A --> B2[Page actions]
    B --> C[POST /api/ai-chat]
    B2 --> C2[API REST Endpoints]
    
    C --> D[Backend NodeJS]
    C2 --> D
    D --> E[API REST + BesuManager1]
    D --> F[IA Integration + OpenAI]
    
    E --> G[lib-besu]
    E --> H[MongoDB]
    G --> I[Docker Networks]
    
    F --> J[POST /api/mcp]
    J --> K[Serveur MCP]
    
    K --> P[create_besu_network]
    K --> Q[remove_besu_network]
    K --> R[add_besu_node]
    K --> S[remove_besu_node]
    K --> T[start_besu_network]
    K --> U[stop_besu_network]
    K --> V[get_besu_balance]
    K --> W[list_networks]
    
    P --> L[BesuManager2]
    Q --> L
    R --> L
    S --> L
    T --> L
    U --> L
    V --> L
    W --> L
    
    L --> M[lib-besu]
    L --> N[MongoDB]
    M --> O[Docker Networks]
```

## Estructura del Proyecto

### 1. Aplicación Web (`/web`)
Interfaz gráfica desarrollada con Next.js 13 que incluye:

#### Frontend (`/web/app`)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

- Implementado en React con TypeScript
- Utiliza el nuevo App Router de Next.js 13
- Interfaz moderna con TailwindCSS
- Gestión visual de redes y nodos Besu

#### Backend (`/web/lib`)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

- Implementado en TypeScript
- APIs para gestión de redes y nodos
- Integración con MongoDB para persistencia
- Incluye la librería besu_docker_lib compilada en `lib-besu`

#### Servidor MCP (`/web/mcp-server`)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Model Context Protocol](https://img.shields.io/badge/MCP-FF6B6B?style=for-the-badge&logo=protocol&logoColor=white)

- Contiene un servidor MCP (Model Context Protocol)
- Implementa el modelo de contexto para la gestión de redes Besu
- Gestiona la creación y la gestión de redes Besu
- Permite la interacción con la IA para automatización de tareas
- Permite gestionar la lógica de negocio con un lenguaje humano 

#### Datos de ejemplo de redes (`/web/data`)
- Contiene un fichero JSON con ejemplos de redes Besu
- Facilita la creación de redes de pruebas en mongoDB

#### Claves y direcciones para nodos (`/web/networks/Keypair`)
- Contine las cuentas usadas para el primer firmante
- Almacena pares de claves predefinidos
- Claves públicas y privadas para validadores
- Direcciones Ethereum asociadas
- Necesarios para la inicialización de la red

### 2. Biblioteca Docker (`/besu_docker_lib`)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)

Librería TypeScript para gestión de infraestructura:
- Creación y gestión de redes Docker
- Gestión del ciclo de vida de nodos Besu
- Configuración automatizada de nodos
- Gestión de contenedores Docker

### 3. Scripts de Utilidad (`/scripts`)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Bash](https://img.shields.io/badge/Bash-4EAA25?style=for-the-badge&logo=gnu-bash&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-5391FE?style=for-the-badge&logo=powershell&logoColor=white)
![Ethers.js](https://img.shields.io/badge/Ethers.js-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

Scripts para gestión de redes Besu y generación de transacciones:

#### Scripts de Red
- `script.sh` (Linux) y `script.ps1` (Windows)
- Crean redes Besu de prueba usando Docker
- Generan el directorio `networks` con la configuración

#### Gestión de MongoDB
- `mongodb-docker-setup.sh`: Configura la base de datos en Docker
- `mongodb-compass-connection.md`: Instrucciones de conexión para MongoDB Compass

![ejemplo de datos de red Besu en mongodb](web/data/ejemplo.redbesu.mongodb.png)

#### Herramientas Ethereum
![Ethers.js](https://img.shields.io/badge/Ethers.js-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)
![Hyperledger Besu](https://img.shields.io/badge/Hyperledger_Besu-2F3134?style=for-the-badge&logo=hyperledger&logoColor=white)

- `besu-ethers-toolkit.js`: Utilidades para interactuar con la red Besu
  - Proponer nuevos validadores
  - Listar propuestas pendientes
  - Mostrar validadores actuales
  - Monitorear los nuevos bloques

#### Generación de Transacciones
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Ethers.js](https://img.shields.io/badge/Ethers.js-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)

- `generate-transactions.js` y `generate-transaction-types.js`: Genera transacciones de ejemplo y despliega contratos inteligentes

## Funcionamiento del Sistema

### 1. Creación de Red
```mermaid
graph TD
    A[Usuario] -->|Solicita nueva red| B[Web UI]
    B -->|Crea configuración| C[MongoDB]
    B -->|Solicita infraestructura| D[Lib Docker]
    D -->|Configura red| E[Docker]
    E -->|Inicia nodos| F[Red Besu]
```

### 2. Consenso Clique (PoA)
- Sistema de consenso basado en autoridad donde solo los nodos validadores autorizados pueden firmar bloques
- Proceso de votación para añadir o eliminar validadores (requiere mayoría de votos)
- Los validadores se turnan para crear bloques en un orden predeterminado
- Tiempo de bloque configurable y finalidad rápida
- Ideal para redes privadas con validadores conocidos

### 3. Gestión de Nodos
```mermaid
graph LR
    A[Bootnode] -->|Discovery| B[Validador 1]
    A -->|Discovery| C[Validador 2]
    A -->|Discovery| D[RPC Node]
    B -->|Consenso| C
    B -->|Consenso| E[Validador 3]
    C -->|Consenso| E
```

## Guía de Instalación y Uso

1. **Requisitos Previos**
   ```bash
   # Instalar Docker
   docker --version
   
   # Instalar Node.js
   node --version
   ```

2. **Instalación automatizada del proyecto con install.sh**
   ```bash
   # Clonar el repositorio
   git clone --branch pfm-2.5-besu https://github.com/codecrypto-academy/CarreteroSamuel.git

   # Entrar al directorio del proyecto
   cd CarreteroSamuel/Web25-besu-2025
   
   # Ejecutar el script de instalación
   ./scripts/install.sh
   ```

3. **Configuración del Proyecto**
   Si no ha usado el script de instalación, debe configurar manualmente el proyecto:

   ```bash
   # Clonar repositorio
   git clone --branch pfm-2.5-besu https://github.com/codecrypto-academy/CarreteroSamuel.git
   
   # Instalar dependencias
   cd web 
   npm install
   cd mcp-server
   npm install
   cd ../../besu_docker_lib 
   npm install
   cd ../scripts 
   npm install
   cd 
   ```

4. **Compilación y publicación de besu_docker_lib**
   
   Cuando se realizan cambios en la librería besu_docker_lib, es necesario recompilarla y publicar la nueva versión para que la aplicación web y el servidor MCP la utilicen.:
   ```bash
   # Entrar al directorio besu_docker_lib
   cd besu_docker_lib

   # Compilar la librería
   npm run build

   # Conectarse a NPM
   npm login

   # Cambiar la versión
   # para un patch (1.0.1)
   npm version patch
   # para un minor (1.1.0)
   npm version minor
   # para un major (2.0.0)
   npm version major

   # Publicar la librería en NPM
   npm publish --access public
   ```

5. **Iniciar Servicios**
   ```bash

   cd scripts
   # Iniciar la base de datos MongoDB (Solo la primera vez)
   ./mongodb-docker-setup.sh

   cd ../web
   # Iniciar servidor MCP
   npm run start:mcp-server

   #-----------Y en otro terminal ------------

   cd web
   # Iniciar aplicación web
   npm run dev
   ```

6. **Gestión de Firmantes con besu-ethers-toolkit.js**

   Los nodos validadores que son creados son firmantes por defecto. Para añadir o eliminar firmantes, se utiliza el script `besu-ethers-toolkit.js` que interactúa con la red Besu a través de JSON-RPC.

   Para configurar el script besu-ethers-toolkit.js, debes crear un archivo `.env` en el directorio scripts y definir las siguientes variables de entorno:
   ```bash
   BESU_RPC=http://localhost:18555 (Puerto del node Besu Firmante)
   PRIVATE_KEY=0x... (clave privada del firmante)
   ```

   BESU_RPC indica la URL del nodo Besu al que se conectará el script.
   PRIVATE_KEY es la clave privada de la cuenta que firmará las transacciones.
   Asegúrate de mantener este archivo seguro, ya que contiene información sensible.
   
   ```bash
   # Mostrar los firmantes actuales
   node besu-ethers-toolkit.js list-signers

   # Ver propuestas pendientes
   node besu-ethers-toolkit.js proposals

   # Proponer un nuevo firmante (true para añadir, false para eliminar)
   node besu-ethers-toolkit.js propose <dirección-ethereum> true

   # Monitorear nuevos bloques (útil para verificar cambios)
   node besu-ethers-toolkit.js monitor-blocks
   ```

   El proceso de añadir un nuevo firmante requiere:
   1. Un firmante existente propone al nuevo candidato
   2. Otros firmantes deben votar la propuesta (usando el mismo comando)
   3. Cuando se alcanza la mayoría de votos, el candidato se convierte en firmante
   4. Se puede verificar el estado con `list-signers` y `proposals`

   Ejemplo completo:
   ```bash
   # 1. Ver firmantes actuales
   node besu-ethers-toolkit.js list-signers
   
   # 2. Proponer nuevo firmante
   node besu-ethers-toolkit.js propose 0x1234...5678 true
   
   # 3. Verificar la propuesta
   node besu-ethers-toolkit.js proposals
   
   # 4. Esperar votos de otros firmantes
   node besu-ethers-toolkit.js monitor-blocks
   
   # 5. Confirmar la adición
   node besu-ethers-toolkit.js list-signers
   ```

## API y Endpoints

### REST API

#### Gestión de Redes
- `POST /api/networks` - Crear red
- `GET /api/networks` - Listar redes
- `DELETE /api/networks/:id` - Eliminar red
- `POST /api/networks/:id/nodes` - Añadir nodo

#### Monitoreo y Estado de Red
- `GET /api/test-connection?port={port}` - Probar conectividad con nodo Besu
- `GET /api/network/{id}/validators?ip={ip}&port={port}` - Obtener validadores activos y propuestas
- `GET /api/network/{id}/balances?ip={ip}&port={port}&accounts={accounts}` - Consultar balances de cuentas

#### Integración con IA
- `POST /api/ai-chat` - Enviar instrucciones en lenguaje natural al AI Manager

### JSON-RPC (Ethereum/Besu)

#### Métodos Estándar Ethereum
- `eth_blockNumber` - Obtener número del último bloque
- `eth_getBalance` - Consultar balance de una cuenta
- `eth_sendTransaction` - Enviar transacción
- `eth_getBlock` - Obtener información de un bloque
- `eth_getTransaction` - Obtener detalles de una transacción
- `eth_getTransactionReceipt` - Obtener recibo de transacción

#### Métodos Específicos de Besu/Clique
- `clique_getSigners` - Obtener lista de validadores activos
- `clique_getSignersAtHash` - Obtener validadores en un bloque específico
- `clique_propose` - Proponer añadir/eliminar un validador
- `clique_getProposals` - Obtener propuestas pendientes de validadores

### Parámetros de Ejemplo

#### Test de Conectividad
```bash
GET /api/test-connection?port=18555
# Respuesta: { success: true, rpcUrl, blockNumber, chainId, cliqueInfo }
```

#### Consulta de Validadores
```bash
GET /api/network/testnet/validators?ip=localhost&port=18555
# Respuesta: { success: true, signers: [...], proposals: [...] }
```

#### Consulta de Balances
```bash
GET /api/network/testnet/balances?ip=localhost&port=18555&accounts=[{...}]
# Respuesta: { success: true, balances: [{ address, balanceWei, balanceEth }] }
```

## Monitoreo y Mantenimiento

1. **Logs de Nodos**
   ```bash
   docker logs [NODE_CONTAINER_ID]
   ```

2. **Métricas**
   - Tiempo de bloque
   - Transacciones por segundo
   - Estado de sincronización
   - Uso de recursos

## Solución de Problemas

1. **Problemas de Consenso**
   - Verificar conectividad entre validadores
   - Comprobar configuración del consenso Clique
   - Verificar el estado de las propuestas de validadores
   - Revisar logs de validadores

2. **Problemas de Red**
   - Verificar puertos Docker
   - Comprobar configuración bootnode
   - Revisar reglas de firewall

## AI Manager

El sistema incluye un módulo de gestión inteligente (AI Manager) que facilita la interacción y automatización de tareas en la red Besu mediante inteligencia artificial.

### 1. Integración con OpenAI

La IA del sistema utiliza la API de OpenAI para asistir en la gestión de redes, generación de comandos, ayuda contextual y automatización de flujos. Para habilitar esta funcionalidad es necesario disponer de una clave de API de OpenAI.

- **Dónde colocar la clave:**
  Debe crearse un archivo `.env.local` en el directorio `web/` con el siguiente contenido:
  
  ```env
  OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
  Sustituya el valor por su clave personal de OpenAI. Sin esta clave, las funciones de IA no estarán disponibles en la interfaz web.

### 2. Servidor MCP (Model Context Protocol)

El servidor MCP es responsable de gestionar la comunicación entre la interfaz web y los servicios de backend, incluyendo la IA y la gestión de redes Besu. Este servidor permite la orquestación de tareas complejas y la integración de la lógica de negocio avanzada.

- **¿Para qué sirve?**
  - Centraliza la lógica de gestión de redes y nodos
  - Expone endpoints para la IA y la administración de la red
  - Permite la creación y gestión de redes Besu desde la web
  - Permite la interacción con MongoDB para persistencia de datos
  - Permite añadir funciones de forma modular y escalable
  - Permite añadir condiciones y reglas complejas de forma sencilla

  **Cómo se compila:**
   - Asegúrese de que la librería `besu_docker_lib` está compilada y actualizada en el directorio `web/mcp-server/dist/lib-besu/`.
   - La librería se compila al ejecutar `npm run build` en el directorio `web/mcp-server`.

- **Cómo se ejecuta:**
  Desde el directorio `web`, utilice el siguiente comando para iniciar el servidor MCP:
  
  ```bash
  npm run start:mcp-server
  ```
  > **Importante:** Debe ejecutar este comando para poder utilizar la pagina AI Manager. Y se debe ejecutar desde el directorio `web` para que los directorios de las redes se creen en la ubicación correcta. Si se ejecuta desde otro directorio, la estructura de carpetas podría no ser la esperada y causar errores en la gestión de redes.

## Actualizar la librería besu_docker_lib

   - Publicación de la nueva versión de besu_docker_lib en NPM
   - Actualizar con `npm update` en el directorio `web` y `web/mcp-server`

## Referencias

- [Documentación Hyperledger Besu](https://besu.hyperledger.org/en/stable/)
- [Especificación Clique PoA](https://eips.ethereum.org/EIPS/eip-225)
- [Ethers.js Documentation](https://docs.ethers.io/v5/)
- [Docker Documentation](https://docs.docker.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Model Context Protocol Documentation](https://github.com/openai/model-context-protocol)

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - vea el archivo [LICENSE](./LICENSE) para más detalles.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

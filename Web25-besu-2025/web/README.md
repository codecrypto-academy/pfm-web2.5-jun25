
# Aplicación Web de Gestión de Redes Hyperledger Besu

## Descripción Técnica

Esta aplicación web proporciona una interfaz completa para gestionar redes blockchain Hyperledger Besu, implementando el protocolo IBFT 2.0 (Istanbul Byzantine Fault Tolerance) para redes privadas empresariales.

### Arquitectura del Sistema

```mermaid
graph TD
    A[Cliente Web] -->|Next.js SSR| B[Servidor Next.js]
    B -->|API Routes| C[Capa de Servicios]
    C -->|Mongoose| D[MongoDB]
    C -->|Docker API| E[Contenedores Besu]
    E -->|P2P| F[Red Blockchain]
```

## Componentes Principales

### 1. Frontend (Next.js 13 App Router)
- Páginas dinámicas SSR
- Componentes React con TypeScript
- TailwindCSS para estilos
- Gestión de estado del lado del cliente

### 2. Backend (API Routes)
- Endpoints REST para gestión de redes
- Integración con MongoDB
- Control de contenedores Docker
- Gestión de transacciones Ethereum

### 3. Base de Datos (MongoDB)

#### Esquema de Red
```typescript
interface Network {
  id: string;
  name: string;
  chainId: number;
  nodes: Node[];
  accounts: Account[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Esquema de Nodo
```typescript
interface Node {
  id: string;
  networkId: string;
  type: 'bootnode' | 'validator' | 'rpc';
  ip: string;
  port: number;
  status: 'running' | 'stopped';
}
```

## Instalación y Configuración

### 1. Requisitos Previos
```bash
# Verificar versiones
node --version  # v18 o superior
npm --version   # v8 o superior
docker --version
```

### 2. Configuración de MongoDB
```bash
# Iniciar MongoDB con Docker
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -v mongodb_data:/data/db \
  mongo

# Verificar conexión
mongosh mongodb://admin:password123@localhost:27017
```

### 3. Configuración del Proyecto
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
```

Contenido de .env.local:
```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/besuNetworks
MONGODB_DB=besuNetworks
```

### 4. Desarrollo y Producción
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## API y Endpoints

### Redes
- `POST /api/networks`
  ```typescript
  // Crear red
  interface CreateNetworkRequest {
    name: string;
    chainId: number;
    nodes: {
      type: NodeType;
      ip: string;
      port: number;
    }[];
  }
  ```

- `GET /api/networks`
  ```typescript
  // Listar redes
  interface NetworkResponse {
    networks: Network[];
    total: number;
  }
  ```

### Nodos
- `POST /api/networks/:id/nodes`
  ```typescript
  // Añadir nodo
  interface AddNodeRequest {
    type: NodeType;
    ip: string;
    port: number;
  }
  ```

## Gestión de Estado

### 1. Estados de Red
```typescript
type NetworkStatus = 
  | 'initializing'  // Creando contenedores
  | 'starting'      // Iniciando nodos
  | 'running'       // Red activa
  | 'stopping'      // Deteniendo nodos
  | 'stopped'       // Red detenida
  | 'error'         // Error en la red
```

### 2. Monitoreo
- Métricas de red
- Estado de nodos
- Logs en tiempo real
- Alertas y notificaciones

## Características de Seguridad

1. **Autenticación**
   - JWT para API
   - Roles de usuario
   - Control de acceso

2. **Validación**
   - Sanitización de entrada
   - Validación de parámetros
   - Prevención de inyección

3. **Red**
   - HTTPS/TLS
   - CORS configurado
   - Rate limiting

## Solución de Problemas

### 1. Problemas de Base de Datos
```bash
# Verificar conexión
mongosh mongodb://admin:password123@localhost:27017/besuNetworks

# Verificar índices
db.networks.getIndexes()
```

### 2. Problemas de Docker
```bash
# Ver logs de contenedores
docker logs [CONTAINER_ID]

# Verificar red Docker
docker network inspect besu_network
```

## Referencias

- [Documentación Next.js](https://nextjs.org/docs)
- [API Hyperledger Besu](https://besu.hyperledger.org/en/stable/Reference/API-Methods/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)

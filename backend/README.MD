# Besu Network API

REST API para gestionar redes Besu blockchain usando Next.js y TypeScript.

## Características

- 🚀 **Next.js 14** con TypeScript
- 🐳 **Gestión de redes Docker** usando devisrael-docker-manager
- ⛓️ **Despliegue de redes Besu** blockchain
- 🔍 **Validación de datos** con Zod
- 📊 **Monitoreo de nodos** y logs
- 🛠️ **API REST completa** para CRUD de redes

## Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd besu-network-api

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

## Endpoints de la API

### Health Check
- **GET** `/api/health` - Verificar estado de la API

### Gestión de Redes

#### Crear Red
- **POST** `/api/networks`
```json
{
  "networkName": "mi-red-besu",
  "subnet": "172.25.0.0/16",
  "dataPath": "./besu-networks",
  "nodes": [
    {
      "name": "bootnode",
      "ip": "172.25.0.10",
      "isBootnode": true
    },
    {
      "name": "rpc-node",
      "ip": "172.25.0.11",
      "isRpc": true
    },
    {
      "name": "miner-node",
      "ip": "172.25.0.12",
      "isMiner": true
    }
  ]
}
```

#### Listar Redes
- **GET** `/api/networks`

#### Obtener Información de Red
- **GET** `/api/networks/{networkName}`

#### Eliminar Red
- **DELETE** `/api/networks/{networkName}`

### Gestión de Nodos

#### Agregar Nodo (Próximamente)
- **POST** `/api/networks/{networkName}/nodes`
```json
{
  "node": {
    "name": "validator-1",
    "ip": "172.25.0.13",
    "isMiner": true
  }
}
```

#### Remover Nodo
- **DELETE** `/api/networks/{networkName}/nodes`
```json
{
  "nodeName": "validator-1"
}
```

#### Obtener Logs de Nodo
- **GET** `/api/networks/{networkName}/nodes/{nodeName}/logs`

## Ejemplos de Uso

### 1. Crear una red Besu

```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkName": "test-network",
    "subnet": "172.25.0.0/16",
    "nodes": [
      {
        "name": "bootnode",
        "ip": "172.25.0.10",
        "isBootnode": true
      },
      {
        "name": "rpc-node",
        "ip": "172.25.0.11",
        "isRpc": true
      },
      {
        "name": "miner-node",
        "ip": "172.25.0.12",
        "isMiner": true
      }
    ]
  }'
```

### 2. Obtener información de la red

```bash
curl http://localhost:3000/api/networks/test-network
```

### 3. Listar todas las redes

```bash
curl http://localhost:3000/api/networks
```

### 4. Obtener logs de un nodo

```bash
curl http://localhost:3000/api/networks/test-network/nodes/bootnode/logs
```

### 5. Remover un nodo

```bash
curl -X DELETE http://localhost:3000/api/networks/test-network/nodes \
  -H "Content-Type: application/json" \
  -d '{"nodeName": "miner-node"}'
```

### 6. Eliminar la red completa

```bash
curl -X DELETE http://localhost:3000/api/networks/test-network
```

## Respuestas de la API

Todas las respuestas siguen el siguiente formato:

### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Operación completada exitosamente",
  "data": {
    // datos específicos de la respuesta
  }
}
```

### Respuesta de Error
```json
{
  "success": false,
  "error": "Descripción del error"
}
```

## Estructura del Proyecto

```
src/
├── app/
│   └── api/
│       ├── health/
│       │   └── route.ts
│       └── networks/
│           ├── route.ts
│           └── [networkName]/
│               ├── route.ts
│               └── nodes/
│                   ├── route.ts
│                   └── [nodeName]/
│                       └── logs/
│                           └── route.ts
├── lib/
│   ├── network-manager.ts
│   └── validation.ts
└── types/
    └── api.ts
```

## Configuración de Desarrollo

### Variables de Entorno

Crea un archivo `.env.local`:

```env
# Puerto del servidor (opcional, por defecto 3000)
PORT=3000

# Directorio base para datos de Besu
BESU_DATA_PATH=./besu-networks
```

### Docker

Asegúrate de que Docker esté corriendo:

```bash
# Verificar que Docker esté corriendo
docker --version
docker ps

# Si no está corriendo, iniciarlo
sudo systemctl start docker  # Linux
# o usar Docker Desktop en Windows/Mac
```

## Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Construcción
npm run build

# Producción
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

## Dependencias Principales

- **Next.js 14**: Framework React para el backend API
- **TypeScript**: Tipado estático
- **devisrael-docker-manager**: Tu librería para gestión Docker y Besu
- **Zod**: Validación de esquemas
- **dockerode**: Interacción con Docker API

## Limitaciones Actuales

1. **Agregar nodos dinámicamente**: Actualmente solo se pueden agregar nodos al crear la red completa
2. **Persistencia**: Los datos de redes activas se mantienen solo en memoria
3. **Autenticación**: No implementada (para desarrollo)
4. **Rate limiting**: No implementado

## Próximas Mejoras

- [ ] Implementar agregado dinámico de nodos
- [ ] Persistencia de datos en base de datos
- [ ] Autenticación y autorización
- [ ] Rate limiting
- [ ] Websockets para estado en tiempo real
- [ ] Métricas y monitoreo avanzado
- [ ] Interfaz web para gestión visual

## Desarrollo y Testing

### Testing Manual

1. Ejecutar la API:
```bash
npm run dev
```

2. Usar herramientas como Postman, Insomnia o curl para probar los endpoints

3. Verificar logs de contenedores Docker:
```bash
docker logs <container-name>
```

### Debugging

- Los logs de la aplicación aparecen en la consola de Next.js
- Los logs de contenedores Besu están disponibles via el endpoint `/logs`
- Usar Docker Desktop para monitoreo visual de contenedores

## Deployment

### Desarrollo Local
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Docker (Opcional)
```dockerfile
# Dockerfile para la API
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Error: "Cannot connect to Docker daemon"
- Verificar que Docker esté corriendo
- Verificar permisos de usuario para Docker

### Error: "Port already in use"
- Cambiar el puerto en `.env.local`
- Verificar que no hay otras aplicaciones usando el puerto

### Error: "Network already exists"
- Eliminar la red existente primero
- Verificar con `docker network ls`

## Contribución

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## Licencia

ISC

## Autor

@devisrael
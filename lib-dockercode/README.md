# Docker Manager

Una biblioteca en TypeScript para gestionar contenedores y redes Docker utilizando [dockerode](https://github.com/apocas/dockerode).

## Instalación

```bash
npm install docker-manager
```

## Requisitos

- Node.js >= 14
- Docker instalado y en ejecución en el sistema

## Características

- Crear redes Docker con subredes y etiquetas personalizadas
- Crear contenedores Docker con opciones de configuración avanzadas
- Asignar direcciones IP específicas a los contenedores
- Eliminar contenedores individuales o todos los contenedores de una red
- Eliminar redes Docker
- Obtener información detallada de redes y contenedores

## Uso

### Importar la biblioteca

```typescript
import { DockerManager } from 'docker-manager';

// Crear una instancia del gestor de Docker
const dockerManager = new DockerManager();
```

### Crear una red

```typescript
// Crear una red con una subred específica y etiquetas
const networkId = await dockerManager.createNetwork({
  name: 'mi-red',
  subnet: '172.20.0.0/16',
  labels: {
    'app': 'mi-aplicacion',
    'environment': 'desarrollo'
  }
});

console.log(`Red creada con ID: ${networkId}`);
```

### Crear un contenedor

```typescript
// Crear un contenedor y conectarlo a una red con una IP específica
const containerId = await dockerManager.createContainer({
  name: 'mi-contenedor',
  Image: 'nginx:latest',
  networkName: 'mi-red',
  ip: '172.20.0.2',
  ExposedPorts: {
    '80/tcp': {}
  },
  HostConfig: {
    PortBindings: {
      '80/tcp': [{ HostPort: '8080' }]
    }
  }
});

console.log(`Contenedor creado con ID: ${containerId}`);
```

### Eliminar un contenedor

```typescript
// Eliminar un contenedor por nombre o ID
await dockerManager.removeContainer('mi-contenedor');
```

### Eliminar todos los contenedores de una red

```typescript
// Eliminar todos los contenedores conectados a una red
await dockerManager.removeContainersInNetwork('mi-red');
```

### Eliminar una red

```typescript
// Eliminar una red y todos sus contenedores
await dockerManager.removeNetwork('mi-red');

// Eliminar una red sin eliminar sus contenedores
await dockerManager.removeNetwork('mi-red', false);
```

### Obtener información de una red

```typescript
// Obtener información detallada de una red
const networkInfo = await dockerManager.getNetworkInfo('mi-red');
console.log(networkInfo);
```

### Obtener información de un contenedor

```typescript
// Obtener información detallada de un contenedor
const containerInfo = await dockerManager.getContainerInfo('mi-contenedor');
console.log(containerInfo);
```

## API

### `DockerManager`

#### Constructor

```typescript
constructor(options?: Docker.DockerOptions)
```

- `options`: Opciones de conexión a Docker (opcional)

#### Métodos

##### `createNetwork(options: NetworkCreateOptions): Promise<string>`

Crea una nueva red Docker.

- `options`: Opciones para crear la red
  - `name`: Nombre de la red
  - `subnet`: Subred en formato CIDR (ej. "172.20.0.0/16")
  - `labels`: Etiquetas para la red (opcional)
- Retorna: Promise con el ID de la red creada

##### `createContainer(options: ContainerOptions): Promise<string>`

Crea un nuevo contenedor Docker.

- `options`: Opciones para crear el contenedor
  - `name`: Nombre del contenedor
  - `ip`: Dirección IP específica para el contenedor (opcional)
  - `networkName`: Nombre de la red a la que conectar el contenedor (opcional)
  - Además, todas las opciones estándar de dockerode para crear contenedores
- Retorna: Promise con el ID del contenedor creado

##### `removeContainer(nameOrId: string, force: boolean = true): Promise<void>`

Elimina un contenedor Docker.

- `nameOrId`: Nombre o ID del contenedor a eliminar
- `force`: Si es true, fuerza la eliminación incluso si está en ejecución (por defecto: true)

##### `removeContainersInNetwork(networkNameOrId: string): Promise<void>`

Elimina todos los contenedores conectados a una red específica.

- `networkNameOrId`: Nombre o ID de la red

##### `removeNetwork(networkNameOrId: string, removeContainers: boolean = true): Promise<void>`

Elimina una red Docker y opcionalmente todos sus contenedores.

- `networkNameOrId`: Nombre o ID de la red a eliminar
- `removeContainers`: Si es true, elimina todos los contenedores conectados a la red (por defecto: true)

##### `getNetworkInfo(networkNameOrId: string): Promise<NetworkInfo>`

Obtiene información detallada de una red Docker.

- `networkNameOrId`: Nombre o ID de la red
- Retorna: Promise con la información de la red

##### `getContainerInfo(containerNameOrId: string): Promise<ContainerInfo>`

Obtiene información detallada de un contenedor Docker.

- `containerNameOrId`: Nombre o ID del contenedor
- Retorna: Promise con la información del contenedor

## Licencia

ISC 
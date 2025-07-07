# Pruebas para Besu Network Manager

## Estructura de pruebas

Las pruebas para la biblioteca Besu Network Manager están organizadas de la siguiente manera:

```
tests/
└── __tests__/               # Pruebas unitarias
    ├── BesuNodeManager.test.ts
    ├── ConfigGenerator.test.ts
    ├── DockerService.test.ts
    ├── FileSystem.test.ts
    └── GenesisGenerator.test.ts
```

## Tipos de pruebas

### Pruebas unitarias

Las pruebas unitarias verifican el funcionamiento correcto de cada componente individual de la biblioteca:

- **BesuNodeManager.test.ts**: Prueba la gestión de nodos Besu individuales (creación, inicio, parada).
- **ConfigGenerator.test.ts**: Prueba la generación de archivos de configuración TOML para nodos Besu.
- **DockerService.test.ts**: Prueba las operaciones con Docker (creación/eliminación de redes, contenedores, etc.).
- **FileSystem.test.ts**: Prueba las operaciones del sistema de archivos.
- **GenesisGenerator.test.ts**: Prueba la generación de archivos genesis.json para diferentes protocolos de consenso.



## Ejecución de pruebas

### Requisitos previos

- Node.js (versión 14 o superior)
- npm o yarn
- Docker (para las pruebas de integración)

### Instalación de dependencias

```bash
npm install
```

### Ejecutar todas las pruebas

```bash
npm test
```

### Ejecutar pruebas unitarias específicas

```bash
npm test -- -t "BesuNetworkManager"
```



## Cobertura de código

Para generar un informe de cobertura de código:

```bash
npm test -- --coverage
```

El informe se generará en el directorio `coverage/`.

## Notas adicionales

- Las pruebas unitarias utilizan mocks para simular las dependencias externas (Docker, sistema de archivos, etc.).
- La biblioteca se ha optimizado para eliminar funcionalidades no utilizadas, manteniendo solo los componentes esenciales para la gestión de nodos Besu individuales y redes Docker.
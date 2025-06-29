# Pruebas para Besu Network Manager

## Estructura de pruebas

Las pruebas para la biblioteca Besu Network Manager están organizadas de la siguiente manera:

```
src/
├── services/
│   └── __tests__/           # Pruebas unitarias para los servicios
│       ├── BesuNetworkManager.test.ts
│       ├── DockerService.test.ts
│       ├── GenesisGenerator.test.ts
│       ├── KeyGenerator.test.ts
│       └── TransactionService.test.ts
└── __tests__/
    └── integration/         # Pruebas de integración
        └── BesuNetworkIntegration.test.ts
```

## Tipos de pruebas

### Pruebas unitarias

Las pruebas unitarias verifican el funcionamiento correcto de cada componente individual de la biblioteca:

- **BesuNetworkManager.test.ts**: Prueba las funcionalidades principales del gestor de red Besu.
- **DockerService.test.ts**: Prueba las operaciones con Docker (creación/eliminación de redes, contenedores, etc.).
- **GenesisGenerator.test.ts**: Prueba la generación de archivos genesis.json para diferentes protocolos de consenso.
- **KeyGenerator.test.ts**: Prueba la generación de claves para los nodos Besu.
- **TransactionService.test.ts**: Prueba el envío y seguimiento de transacciones.

### Pruebas de integración

Las pruebas de integración verifican el funcionamiento correcto de la biblioteca en su conjunto:

- **BesuNetworkIntegration.test.ts**: Prueba el ciclo de vida completo de una red Besu (creación, inicialización, inicio, parada).

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

### Ejecutar pruebas de integración

Las pruebas de integración están marcadas como `skip` por defecto para evitar ejecutarlas en entornos CI. Para ejecutarlas:

```bash
npm test -- -t "BesuNetwork Integration" --runInBand
```

> **Nota**: Las pruebas de integración requieren Docker en ejecución y crearán contenedores reales. Asegúrate de tener Docker instalado y en ejecución antes de ejecutar estas pruebas.

## Cobertura de código

Para generar un informe de cobertura de código:

```bash
npm test -- --coverage
```

El informe se generará en el directorio `coverage/`.

## Notas adicionales

- Las pruebas unitarias utilizan mocks para simular las dependencias externas (Docker, sistema de archivos, etc.).
- Las pruebas de integración crean contenedores Docker reales y pueden tardar más tiempo en ejecutarse.
- Si encuentras problemas con las pruebas de integración, asegúrate de que Docker esté en ejecución y que no haya conflictos de puertos.
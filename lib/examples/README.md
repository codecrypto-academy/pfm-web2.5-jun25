# Ejemplos de Besu Network

**Author:** Javier Ruiz-Canela López  
**Email:** jrcane## 🚀 Cómo ejecutar los ejemplos

### Ejecutar ejemplo simple (validado):

```bash
# Desde el directorio lib/
npx ts-node examples/example.ts

# Limpiar recursos manualmente (si es necesario)
npx ts-node examples/example.ts cleanup
```

### Ejecutar ejemplo avanzado:

```bash
# Desde el directorio lib/
npx ts-node examples/advanced-example.ts
```

## 📋 Configuración de ejemplo validado

El `example.ts` usa esta configuración que **pasa todas las validaciones**:

```typescript
// Red con configuración válida
const networkConfig: BesuNetworkConfig = {
  name: "simple-besu-network",
  chainId: 1337, // ✅ Chain ID único
  subnet: "172.30.0.0/16", // ✅ Subnet disponible
  consensus: "clique", // ✅ Consenso válido
  gasLimit: "0x47E7C4", // ✅ Gas limit en rango válido
  blockTime: 5, // ✅ Tiempo de bloque razonable
};

// Nodos con configuración que pasa validaciones
const nodes = [
  {
    name: "bootnode1", // ✅ Nombre único y válido
    ip: "172.30.0.20", // ✅ IP dentro de subnet, no reservada
    rpcPort: 8545, // ✅ Puerto en rango válido
    p2pPort: 30303, // ✅ Puerto P2P único
    type: "bootnode", // ✅ Tipo válido
  },
  {
    name: "miner1",
    ip: "172.30.0.21", // ✅ IP única
    rpcPort: 8548, // ✅ No consecutivo con bootnode
    p2pPort: 30304, // ✅ Puerto P2P único
    type: "miner",
  },
  // ... más nodos con configuración válida
];
```

## ⚠️ Ejemplos de configuraciones INVÁLIDAS

### ❌ Puertos consecutivos (miners)

```typescript
// ESTO FALLA las validaciones
{ name: 'miner1', rpcPort: 8546, type: 'miner' },
{ name: 'miner2', rpcPort: 8547, type: 'miner' }, // ❌ Consecutivo!
```

### ❌ IP fuera de subnet

```typescript
// ESTO FALLA las validaciones
{ name: 'node1', ip: '192.168.1.100', subnet: '172.30.0.0/16' } // ❌ Fuera!
```

### ❌ Nombres duplicados

```typescript
// ESTO FALLA las validaciones
{ name: 'node1', ip: '172.30.0.20' },
{ name: 'node1', ip: '172.30.0.21' } // ❌ Duplicado!
```

### ❌ Sin bootnode

````typescript
// ESTO FALLA las validaciones - Solo miners, falta bootnode
nodes: [
    { name: 'miner1', type: 'miner' },
    { name: 'miner2', type: 'miner' }
] // ❌ Sin bootnode!
```m
**Date:** June 28, 2025

_This documentation was developed with the assistance of GitHub Copilot._

---

Esta carpeta contiene ejemplos que demuestran las capacidades de la librería Besu Network, incluyendo las **nuevas validaciones robustas** implementadas.

## 📁 Archivos de ejemplo

### 1. `example.ts` - Ejemplo SIMPLE ✅ VALIDADO

**Red básica con 4 nodos (Configuración que pasa todas las validaciones)**

- 1 Bootnode (descubrimiento de peers)
- 1 Miner (minado de bloques)
- 2 RPC nodes (acceso API)

**Características principales:**

- ✅ **Configuración validada**: Cumple todas las nuevas validaciones de seguridad
- ✅ **Puertos no consecutivos**: Evita conflictos entre miners
- ✅ **IPs dentro de subnet**: Todas las IPs están correctamente asignadas
- ✅ **Puertos P2P únicos**: Cada nodo tiene su puerto P2P específico
- ✅ **Nombres válidos**: Nomenclatura consistente y sin duplicados
- 💰 Financiamiento de cuentas desde mnemonic
- 📊 Verificación de balances y conectividad
- 🧹 Limpieza automática de recursos

### 2. `advanced-example.ts` - Ejemplo AVANZADO

**Red simplificada con 6 nodos**

- 2 Bootnodes (redundancia)
- 2 Miners (distribución de minado)
- 1 RPC node (acceso)
- 1 Nodo regular (observador)

**Características:**

- Red optimizada para estabilidad
- Múltiples transacciones entre cuentas
- Monitoreo de conectividad avanzado
- Verificación de sincronización
- Tiempo de estabilización extendido (60 segundos)

## 🔒 Validaciones Implementadas

Los ejemplos están diseñados para demostrar las nuevas validaciones que incluyen:

### ✅ Validaciones de Nombres
- Nombres únicos sin duplicados
- Formato válido (solo letras, números, guiones)
- Convenciones de nomenclatura consistentes

### ✅ Validaciones de Red
- IPs dentro de la subnet configurada
- IPs no reservadas (red, broadcast, gateway)
- Formato válido de direcciones IP

### ✅ Validaciones de Puertos
- Puertos RPC únicos y en rango válido (1024-65535)
- Puertos P2P únicos y no conflictivos
- No se permiten puertos del sistema reservados
- Miners no pueden usar puertos consecutivos

### ✅ Validaciones de Consenso
- Al menos un bootnode requerido
- Mínimo un miner para consenso Clique
- Validadores suficientes para IBFT2/QBFT
- Arquitectura de red equilibrada

## �🚀 Cómo ejecutar los ejemplos

### Ejecutar ejemplo simple (validado):

```bash
# Ejecutar el ejemplo simple
npm run example:simple

# Limpiar recursos manualmente (si es necesario)
npm run example:cleanup
````

### Ejecutar ejemplo avanzado:

```bash
# Ejecutar el ejemplo avanzado
npm run example:advanced

# Limpiar recursos manualmente (si es necesario)
npm run example:advanced:cleanup
```

> **🧹 Limpieza automática**: Ambos ejemplos ahora **limpian automáticamente** la red al finalizar, deteniendo y eliminando todos los contenedores y volúmenes. No es necesario ejecutar comandos de limpieza manualmente.

### Comandos alternativos:

```bash
# Ejecutar directamente con ts-node
npx ts-node examples/example.ts
npx ts-node examples/advanced-example.ts

# Con parámetros de limpieza manual
npx ts-node examples/example.ts cleanup
npx ts-node examples/advanced-example.ts cleanup
```

## 📊 Puertos de acceso

### Ejemplo Simple:

- **Bootnode RPC**: http://localhost:18545
- **Miner RPC**: http://localhost:18546
- **RPC1**: http://localhost:18547
- **RPC2**: http://localhost:18548

### Ejemplo Avanzado:

- **Bootnodes**: http://localhost:18545, 18546
- **Miners**: http://localhost:18550, 18551
- **RPC Node**: http://localhost:18560
- **Nodo regular**: http://localhost:18570

## ⚠️ Requisitos previos

1. **Docker** instalado y ejecutándose
2. **Node.js** (versión 16 o superior)
3. **Dependencias** instaladas (`npm install`)

## 🔧 Configuración de red

### Ejemplo Simple:

- **Subnet**: 172.30.0.0/16
- **Chain ID**: 1337
- **Consenso**: Clique
- **Tiempo de bloque**: 5 segundos

### Ejemplo Avanzado:

- **Subnet**: 172.40.0.0/16
- **Chain ID**: 8888
- **Consenso**: Clique
- **Tiempo de bloque**: 3 segundos (más rápido para pruebas)

## 📝 Lo que verás en cada ejemplo

### Ejemplo Simple:

1. ✅ Creación de red con 4 nodos
2. 🔄 Inicio de contenedores Docker
3. 🔍 Verificación de conectividad
4. 💰 Financiamiento de 5 cuentas con 10 ETH cada una
5. 💎 Consulta de balances
6. 📊 Información final de la red

### Ejemplo Avanzado:

1. ✅ Creación de red con 6 nodos (2 bootnodes, 2 miners, 1 RPC, 1 node)
2. 🔄 Inicio secuencial de contenedores
3. ⏳ Tiempo de estabilización extendido (60 segundos)
4. 🔍 Verificación detallada de conectividad con reintentos
5. 💰 Financiamiento de 10 cuentas con 100 ETH cada una
6. 🔄 Ejecución de 3 transacciones entre cuentas
7. ⏳ Verificación de confirmación de transacciones
8. 💎 Comparación de balances antes/después
9. 🔄 Verificación de sincronización de red
10. 📊 Estadísticas completas de la red
11. 🧹 Limpieza automática de todos los recursos

## 🛠️ Troubleshooting

### Si los contenedores no se inician:

```bash
# Verificar Docker
docker ps

# Limpiar contenedores conflictivos
npm run cleanup-networks

# Verificar puertos ocupados
lsof -i :18545-18571
```

### Si hay errores de subnet:

Los ejemplos incluyen auto-resolución de conflictos de subnet. Si la subnet especificada está en uso, se encontrará automáticamente una alternativa.

### Si las transacciones fallan:

- Verificar que todos los nodos estén sincronizados
- Aumentar el tiempo de espera entre transacciones
- Verificar balances suficientes en las cuentas

## 🎯 Próximos pasos

Después de ejecutar estos ejemplos, puedes:

1. **Modificar la configuración** de nodos en los archivos
2. **Agregar más transacciones** o tipos de operaciones
3. **Experimentar con diferentes consensos** (IBFT2, QBFT)
4. **Crear tus propios scripts** usando la librería
5. **Integrar con aplicaciones web3** usando las URLs RPC

## 📚 Documentación adicional

- Ver `../README.md` para documentación completa de la librería
- Ver `../_test_/besu.test.ts` para tests completos de la librería
- Ver `../src/index.ts` para API completa disponible

> **🧪 Tests consolidados**: Todos los tests de la librería ahora están en un solo archivo `_test_/besu.test.ts` que incluye tests unitarios, de integración, resolución de conflictos y conectividad.

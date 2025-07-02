# Prompt Optimizado para Proyecto Hyperledger Besu

## Contexto del Proyecto
Necesito desarrollar un proyecto de automatización de Hyperledger Besu con 4 niveles progresivos. El repositorio está en: https://github.com/codecrypto-academy/web25-besu-2025.git

## Especificaciones Técnicas
- **Protocolo**: Clique (PoA - Proof of Authority)
- **Containerización**: Docker con imagen `hyperledger/besu:latest`
- **Plataformas**: Linux/Mac/WSL
- **Lenguajes**: Bash, TypeScript, NextJS
- **Chain ID**: 1337 (red de prueba)

## Estructura de Niveles y Entregables

### Nivel 1 (2 pts) - Script de Despliegue
**Objetivo**: Script bash que automatice el despliegue de múltiples nodos Besu
**Entregable**: `script/script.sh` que:
- Cree una red Docker personalizada
- Despliegue múltiples nodos Besu con protocolo Clique
- Configure génesis block y validadores iniciales
- Ejecute transacciones de prueba para validar la red
- Incluya logging y manejo de errores

### Nivel 2 (3 pts) - Librería TypeScript
**Objetivo**: Biblioteca para gestión programática de redes Besu
**Entregable**: `lib/` con:
- Clases TypeScript para gestión de nodos y redes
- Soporte para 3 tipos de nodos:
  - **Firmador (Signer)**: Nodos validadores que participan en el consenso Clique
  - **Minero (Miner)**: Nodos que procesan transacciones pero no validan
  - **Normal**: Nodos que solo sincronizan y consultan la blockchain
- Métodos para crear/eliminar/configurar nodos según su tipo
- Interfaz para interactuar con API JSON-RPC de Besu
- Suite de tests unitarios con Jest/Vitest
- Tipos TypeScript bien definidos para cada tipo de nodo

### Nivel 3 (2 pts) - API REST
**Objetivo**: Backend NextJS que exponga la funcionalidad de la librería
**Entregable**: `frontback/pages/api/` con endpoints:
- `POST /api/networks` - Crear red
- `DELETE /api/networks/:id` - Eliminar red  
- `POST /api/networks/:id/nodes` - Añadir nodo (especificando tipo: signer/miner/normal)
- `DELETE /api/networks/:id/nodes/:nodeId` - Remover nodo
- `GET /api/networks/:id/status` - Estado de la red y tipos de nodos
- `PUT /api/networks/:id/nodes/:nodeId/type` - Cambiar tipo de nodo

### Nivel 4 (2 pts) - Frontend
**Objetivo**: Interfaz web para gestión visual de redes
**Entregable**: `frontback/components/` y `frontback/pages/` con:
- Dashboard para visualizar redes activas y tipos de nodos
- Formularios para crear/configurar redes
- Panel de control para añadir/remover nodos con selección de tipo
- Visualización diferenciada de nodos (Firmador/Minero/Normal)
- Monitoreo en tiempo real del estado de los nodos por tipo

## Instrucciones para el LLM

**Cuando me ayudes, por favor:**

1. **Pregunta específica antes de empezar**: ¿En qué nivel quieres que te ayude? (1, 2, 3, o 4)

2. **Para cada nivel, proporciona**:
   - Código completo y funcional
   - Configuración de archivos necesarios (package.json, tsconfig.json, etc.)
   - Comandos de instalación y ejecución
   - Ejemplos de uso y testing

3. **Considera estos aspectos técnicos**:
   - **Docker**: Uso de redes internas, volúmenes persistentes, variables de entorno
   - **Besu**: Configuración de protocolo Clique, génesis customizado, claves de validadores
   - **Tipos de Nodos**:
     - **Firmador**: Configurar con claves privadas para validación, incluir en extraData del génesis
     - **Minero**: Activar mining pero sin participar en consenso Clique
     - **Normal**: Solo sincronización, sin mining ni validación
   - **TypeScript**: Tipado fuerte, async/await, manejo de errores, enums para tipos de nodo
   - **Testing**: Casos de prueba realistas, mocking de Docker, validación de transacciones

4. **Incluye siempre**:
   - Manejo de errores robusto
   - Logging detallado para debugging  
   - Documentación en código
   - Validación de inputs
   - Cleanup de recursos

5. **Formatos de respuesta preferidos**:
   - Código en bloques con sintaxis highlighting
   - Explicaciones paso a paso
   - Comandos de terminal listos para copiar/pegar
   - Estructura de archivos clara

## Ejemplo de Solicitud
"Ayúdame con el Nivel 2. Necesito la librería TypeScript que permita crear y gestionar redes Besu usando Docker. Debe soportar los 3 tipos de nodos (Firmador, Minero, Normal) con sus configuraciones específicas. Incluye la implementación completa con tests."

## Tipos de Nodos - Especificaciones Técnicas

### Nodo Firmador (Signer)
- **Propósito**: Validador en red Clique PoA
- **Configuración Besu**: `--miner-enabled --miner-coinbase=<address>`
- **Claves**: Requiere clave privada para firmar bloques
- **Génesis**: Dirección incluida en `extraData`

### Nodo Minero (Miner) 
- **Propósito**: Procesa transacciones sin validar bloques
- **Configuración Besu**: `--miner-enabled` (sin coinbase de validador)
- **Claves**: Clave privada para mining rewards
- **Génesis**: No incluido en `extraData`

### Nodo Normal
- **Propósito**: Solo sincronización y consultas
- **Configuración Besu**: Sin flags de mining
- **Claves**: Opcional, solo para envío de transacciones
- **Génesis**: Participante pasivo de la red

## Información Adicional
- El proyecto debe ser modular y escalable
- Prioriza la legibilidad del código sobre la optimización prematura  
- Usa patrones async/await para operaciones Docker
- Implementa validación de configuraciones antes de desplegar nodos
- Considera manejo de puertos dinámicos para evitar conflictos
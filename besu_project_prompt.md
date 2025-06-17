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
- Métodos para crear/eliminar/configurar nodos
- Interfaz para interactuar con API JSON-RPC de Besu
- Suite de tests unitarios con Jest/Vitest
- Tipos TypeScript bien definidos

### Nivel 3 (2 pts) - API REST
**Objetivo**: Backend NextJS que exponga la funcionalidad de la librería
**Entregable**: `frontback/pages/api/` con endpoints:
- `POST /api/networks` - Crear red
- `DELETE /api/networks/:id` - Eliminar red  
- `POST /api/networks/:id/nodes` - Añadir nodo
- `DELETE /api/networks/:id/nodes/:nodeId` - Remover nodo
- `GET /api/networks/:id/status` - Estado de la red

### Nivel 4 (2 pts) - Frontend
**Objetivo**: Interfaz web para gestión visual de redes
**Entregable**: `frontback/components/` y `frontback/pages/` con:
- Dashboard para visualizar redes activas
- Formularios para crear/configurar redes
- Panel de control para añadir/remover nodos
- Monitoreo en tiempo real del estado de los nodos

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
   - **TypeScript**: Tipado fuerte, async/await, manejo de errores
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
"Ayúdame con el Nivel 2. Necesito la librería TypeScript que permita crear y gestionar redes Besu usando Docker. Incluye la implementación completa con tests."

## Información Adicional
- El proyecto debe ser modular y escalable
- Prioriza la legibilidad del código sobre la optimización prematura  
- Usa patrones async/await para operaciones Docker
- Implementa validación de configuraciones antes de desplegar nodos
- Considera manejo de puertos dinámicos para evitar conflictos
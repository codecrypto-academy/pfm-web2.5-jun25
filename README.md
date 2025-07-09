# Besu Network Manager

Herramientas para gestionar redes Hyperledger Besu.

## Componentes

- `/lib` - Librería TypeScript
- `/besu-manager-app` - Aplicación web
- `/script` - Scripts bash

## Requisitos

- Docker Desktop
- Node.js v18+

## Uso Rápido

**Aplicación web:**
```bash
cd besu-manager-app
npm install && npm run dev
```

**Scripts:**
```bash
cd script
./script.sh start
```

**Librería:**
```bash
cd lib
npm install && npm run build
```

## 🌟 Características Principales

### Gestión de Redes
- ✅ Creación automática de redes Docker
- ✅ Configuración de protocolos de consenso
- ✅ Generación de archivos génesis
- ✅ Gestión de claves y cuentas
- ✅ Configuración de bootnodes

### Gestión de Nodos
- ✅ Creación de nodos validadores y regulares
- ✅ Control de estado (iniciar/detener/reiniciar)
- ✅ Monitoreo de métricas
- ✅ Configuración de puertos automática
- ✅ Limpieza automática de recursos

### Integración Blockchain
- ✅ Conexión con MetaMask
- ✅ Envío de transacciones
- ✅ Despliegue de contratos
- ✅ Consulta de estado de blockchain
- ✅ Gestión de cuentas y balances

## 🧪 Testing

### Tests Unitarios
```bash
cd lib
npm test
```

### Tests de Integración
```bash
cd script
./test_transactions.sh
```

### Tests de la Aplicación Web
```bash
cd besu-manager-app
npm run lint
npm run build
```

## 📦 Distribución

### Librería NPM
La librería se puede empaquetar como un paquete NPM:

```bash
cd lib
npm pack
```

### Aplicación Web
La aplicación se puede desplegar en cualquier plataforma compatible con Next.js:

```bash
cd besu-manager-app
npm run build
npm start
```

## 🤝 Contribución

1. **Fork** el repositorio
2. **Crear** una rama para la funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear** un Pull Request

### Guías de Contribución

- Seguir las convenciones de código existentes
- Agregar tests para nuevas funcionalidades
- Actualizar documentación cuando sea necesario
- Verificar que todos los tests pasen
- Usar commits descriptivos

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

### Problemas Comunes

1. **Docker no está ejecutándose**:
   - Verificar que Docker Desktop esté iniciado
   - Ejecutar `docker ps` para confirmar

2. **Puertos ocupados**:
   - Verificar puertos disponibles (8545, 30303)
   - Modificar configuración de puertos base

3. **Permisos de Docker**:
   - Asegurar que el usuario tenga permisos Docker
   - En Linux: agregar usuario al grupo docker

### Recursos Adicionales

- [Documentación de Hyperledger Besu](https://besu.hyperledger.org/)
- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de TypeScript](https://www.typescriptlang.org/docs/)

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Aplicación    │    │    Librería     │    │     Docker      │
│     Web         │◄──►│   TypeScript    │◄──►│   Containers    │
│   (Next.js)     │    │                 │    │   (Besu Nodes)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MetaMask     │    │     Scripts     │    │   Blockchain    │
│   Integration   │    │   & Examples    │    │    Network      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

Este ecosistema proporciona una solución completa para el desarrollo, testing y gestión de redes Hyperledger Besu, desde la programación de bajo nivel hasta la gestión visual de alto nivel.
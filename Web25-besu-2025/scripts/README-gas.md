# Cómo generar transacciones con Gas en Besu

## 🔥 ¿Cuándo aparece el Gas en Besu?

### Situaciones que consumen Gas:

1. **Transferencias simples**: 21,000 gas (mínimo)
2. **Smart contracts**: 500,000+ gas (despliegue)
3. **Llamadas a funciones**: Variable según complejidad
4. **Operaciones de almacenamiento**: Más costosas
5. **Bucles y cálculos**: Proporcional a la complejidad

## 🚀 Generar transacciones

### 1. Instalación
```bash
cd scripts
npm install
```

### 2. Generar algunas transacciones
```bash
npm run generate
```

### 3. Desplegar un contrato (mucho gas)
```bash
npm run generate-contract
```

### 4. Modo continuo (nuevas transacciones cada 10s)
```bash
npm run generate-continuous
```

## 📊 Lo que verás

### En tu interfaz web:
- **Bloques vacíos** (0 TX): Gris
- **Bloques con transacciones**: Naranja con indicador "TX"
- **Gas utilizado** mostrado para cada bloque

### Ejemplos de gas:
```
Transferencia simple:    21,000 gas
Transferencia con data:  25,000+ gas
Despliegue contrato:     500,000+ gas
Llamada a función:       45,000+ gas
```

## 🔧 Configuración

El script utiliza:
- **RPC Endpoint**: `http://localhost:18555`
- **Clave privada**: Cuenta prefinanciada de tu red
- **Gas Limit**: Adaptado según el tipo de transacción

## 💡 ¿Por qué Gas en red privada?

Incluso en privado, Besu:
1. **Mide la complejidad** de las operaciones
2. **Limita los recursos** por transacción
3. **Previene bucles infinitos**
4. **Simula un entorno realista**

La diferencia: **Gas gratuito** (sin coste real) pero **límites conservados**!

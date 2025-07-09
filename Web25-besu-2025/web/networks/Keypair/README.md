# Sistema de Gestión de Claves para Redes Hyperledger Besu

## Descripción Técnica

Este directorio contine claves criptográficas para nodos firmantes Hyperledger Besu, proporcionando pares de claves preconfigurados para tipos de nodos firmantes en la red blockchain.

## Componentes Criptográficos

### 1. Algoritmos y Estándares
- Curva Elíptica: **secp256k1**
- Firma Digital: **ECDSA**
- Derivación de Dirección: **Keccak-256**

### 2. Formato de Claves
```typescript
interface KeyPair {
  privateKey: Buffer;    // 32 bytes
  publicKey: Buffer;     // 64 bytes (sin compresión)
  address: string;       // 20 bytes (con prefijo 0x)
}
```

## Estructura del Sistema

```
Keypair/
├── basenode1/         # Ejemplo de Nodo Validador Principal
│   ├── address        # Dirección Ethereum (0x...)
│   ├── key            # Clave privada (hex)
│   └── publicKey      # Clave pública (hex)
├── basenode2/         # Otro ejemplo de Nodo Validador Principal
└── basenode3/         # Otro ejemplo de Nodo Validador Principal
```

## Especificaciones Técnicas

### 1. Claves Privadas
- Longitud: 256 bits (32 bytes)
- Formato: Hexadecimal sin prefijo
- Ejemplo:
  ```
  8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63
  ```

## Uso

### Importar Claves

1. Copiar directorios de nodos:
```bash
cp -r basenode1/* ../networks/mi-red/nodo1/
```

2. Ajustar permisos:
```bash
chmod 600 ../networks/mi-red/nodo1/key
```

## Seguridad

⚠️ **ADVERTENCIA**: Estas claves son solo para desarrollo y pruebas.
NO USAR EN PRODUCCIÓN.

### Mejores Prácticas

1. Generar nuevas claves para producción
2. Mantener claves privadas seguras
3. Usar gestión de secretos adecuada

## Generación de Nuevas Claves

```bash
# Generar nuevo par de claves
besu public-key export --to=newnode/key.pub
besu public-key export-address --to=newnode/address
```

## Contenido de Archivos

### address
```
0x123...789
```

### key
```
8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63
```

### publicKey
```
0x123...789
```

## Contribución

- No commitear claves privadas reales
- Documentar el uso de claves
- Mantener el formato estándar

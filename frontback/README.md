compiled besu-sdk npm run build
then went fronteback
npm install ../../besu-sdk
asi install en frontback el dist de besu-sdk... jeje
Cómo se instaló
Ejecutaste npm install ../besu-sdk desde el directorio frontback. Esto instaló besu-sdk como dependencia local usando la ruta relativa al directorio donde compilaste el SDK. npm añadió automáticamente la entrada "besu-sdk": "file:../besu-sdk" en el package.json.

Dónde está instalado
El SDK está en frontback/node_modules/besu-sdk como un enlace simbólico (symlink) que apunta a tu directorio local ../besu-sdk. Puedes verificarlo en package.json donde aparece listado en dependencies, y en el archivo .package-lock.json que muestra "link": true.

Cómo usarlo ahora
Importa las funciones que necesites en cualquier archivo JavaScript o TypeScript dentro de frontback:
javascript// CommonJS
const { BesuNetworkBuilder, createTestNetwork } = require('besu-sdk');

// ES6/TypeScript
import { BesuNetworkBuilder, createTestNetwork } from 'besu-sdk';
Los cambios que hagas en el código fuente de besu-sdk se reflejan inmediatamente en frontback sin necesidad de reinstalar, ya que es un enlace simbólico.


## Resumen Exhaustivo de la Instalación Realizada

### 1. **Problema Inicial**
- Tenías Tailwind CSS v4.1.11 (versión en desarrollo/inestable)
- `npx tailwindcss init -p` fallaba con error "could not determine executable to run"
- Error de sistema `ENOENT: no such file or directory, uv_cwd` en WSL

### 2. **Soluciones Aplicadas**

#### A. **Actualización de package.json**
- Downgrade de Tailwind CSS de v4.1.11 a v3.4.7 (versión estable)
- Corrección de versiones de React (18.3.1) y tipos TypeScript
- Eliminación de `"type": "commonjs"` 
- Añadidos scripts esenciales de Next.js (dev, build, start, lint)

#### B. **Limpieza y Reinstalación**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### C. **Configuración Manual de Tailwind**
Creamos manualmente:
- `tailwind.config.js` con paths de contenido para Next.js
- `postcss.config.js` con plugins de Tailwind y Autoprefixer
- `styles/globals.css` con directivas @tailwind

#### D. **Configuración del Editor**
- Configuración de VS Code para ignorar warnings de @tailwind
- Recomendación de instalar extensión "Tailwind CSS IntelliSense"

### 3. **Problemas Resueltos**
- Incompatibilidad de versiones
- Error de WSL con rutas
- Warnings del editor sobre directivas @tailwind
- Falta de configuración de PostCSS

---

## Guía de Instalación desde Cero

### 📦 **Instalación Completa de Tailwind CSS en Next.js**

#### **Prerrequisitos**
- Node.js 18+ instalado
- npm o yarn
- Proyecto Next.js existente

#### **Paso 1: Instalar Dependencias**
```bash
# Instalar Tailwind CSS y sus dependencias
npm install -D tailwindcss postcss autoprefixer

# O con yarn
yarn add -D tailwindcss postcss autoprefixer
```

#### **Paso 2: Inicializar Configuración**
```bash
# Crea tailwind.config.js y postcss.config.js
npx tailwindcss init -p
```

#### **Paso 3: Configurar Tailwind**
Edita `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### **Paso 4: Añadir Directivas CSS**
Crea o edita `app/globals.css` (o `styles/globals.css`):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### **Paso 5: Importar CSS en Layout**
En `app/layout.tsx` (App Router) o `pages/_app.tsx` (Pages Router):
```typescript
import './globals.css'  // Ajusta la ruta según tu estructura
```

#### **Paso 6: Verificar Instalación**
Crea un componente de prueba:
```tsx
export default function TestComponent() {
  return (
    <div className="bg-blue-500 text-white p-4 rounded-lg">
      <h1 className="text-2xl font-bold">¡Tailwind funciona!</h1>
    </div>
  )
}
```

#### **Paso 7: Ejecutar Proyecto**
```bash
npm run dev
# Abre http://localhost:3000
```

### 🔧 **Configuración Adicional Recomendada**

#### **VS Code**
1. Instala extensión "Tailwind CSS IntelliSense"
2. Crea `.vscode/settings.json`:
```json
{
  "css.validate": false,
  "css.lint.unknownAtRules": "ignore"
}
```

#### **Prettier (Opcional)**
```bash
npm install -D prettier prettier-plugin-tailwindcss
```

Crea `.prettierrc`:
```json
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 📁 **Estructura Final**
```
proyecto/
├── app/
│   ├── globals.css      # Directivas @tailwind
│   └── layout.tsx       # Importa globals.css
├── components/
├── node_modules/
├── .vscode/
│   └── settings.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── package-lock.json
```

### ⚠️ **Troubleshooting Común**

1. **Estilos no se aplican**: Verifica que los paths en `content` de `tailwind.config.js` sean correctos
2. **Warning @tailwind**: Normal sin la extensión de VS Code
3. **Error "Cannot find module"**: Ejecuta `npm install` de nuevo
4. **Cambios no se reflejan**: Reinicia el servidor de desarrollo

### 🚀 **Comandos Útiles**
```bash
# Ver clases no utilizadas (producción)
npx tailwindcss -o output.css --minify

# Generar archivo CSS completo (debugging)
npx tailwindcss -i ./app/globals.css -o ./dist/output.css --watch
```


Paso1. Poner a correr script.sh con la direeccion relativa de fronaback en config.yaml para que deposite aqui su nodo RPC en .env dentro d e env_forwarding en frontback

ethers esta intalado en frontback y compartido como peer depdencny con el nodemdules de besu-sdk
script lo consulta en frotnack
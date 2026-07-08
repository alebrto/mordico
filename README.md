# Mordisco – Control de ventas

Aplicación web full-stack para una fábrica de empanadas: ventas, clientes,
cartera, gastos, inventario, flujo de caja, reportes y proyecciones
financieras. Construida con **React + Vite + TailwindCSS** en el frontend y
**Supabase** (PostgreSQL + Auth + Row Level Security) como backend.

## 1. Requisitos

- Node.js 18+
- Una cuenta y proyecto en [Supabase](https://supabase.com)

## 2. Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con los datos de tu proyecto Supabase (Project Settings → API):

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
```

## 3. Configurar la base de datos

1. Abre tu proyecto en Supabase → **SQL Editor**.
2. Pega y ejecuta el contenido de `supabase/schema.sql`.
   Esto crea:
   - Las tablas `clientes`, `ventas`, `gastos`, `abonos`, `inventario`.
   - Columnas calculadas automáticamente (`total`, `saldo`).
   - Un trigger que actualiza el `saldo`/`estado` de una venta cada vez que
     se registra un abono.
   - Un trigger que descuenta inventario automáticamente según la receta
     estándar al registrar una venta.
   - Políticas de **Row Level Security**: cada usuario solo ve sus propios
     datos (filtrado por `user_id = auth.uid()`).
3. En **Authentication → Providers**, confirma que el proveedor "Email" esté
   habilitado (viene activo por defecto).

## 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`. La primera vez, crea una cuenta desde la
pantalla de login (modo "Regístrate").

## 5. Compilar para producción

```bash
npm run build
npm run preview
```

## 5.1 Desplegar en Netlify

El proyecto ya incluye `netlify.toml` (build command, carpeta de publicación
y la regla de redirección para que las rutas de React Router — `/clientes`,
`/ventas`, etc. — no den 404 al recargar la página).

**Opción A — Conectando tu repositorio de Git (recomendado):**

1. Sube este proyecto a un repositorio en GitHub/GitLab/Bitbucket.
2. En Netlify: **Add new site → Import an existing project** → elige el
   repositorio.
3. Netlify detecta automáticamente `netlify.toml` (build command
   `npm run build`, carpeta `dist`). No necesitas cambiar nada.
4. Antes de desplegar (o justo después), ve a **Site settings → Environment
   variables** y agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ASISTENTE_IA_ENDPOINT` (opcional, solo si activaste el asistente IA)
5. Click en **Deploy site**. Cada vez que hagas push a la rama principal,
   Netlify vuelve a construir y desplegar automáticamente.

**Opción B — Arrastrar y soltar (sin Git):**

1. En tu computador: `npm install` y luego `npm run build`.
2. Entra a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la
   carpeta `dist/` generada.
3. Como esta opción no permite variables de entorno antes del build, debes
   definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en tu `.env` local
   *antes* de correr `npm run build`, ya que Vite las incrusta en el momento
   de compilar.

> Importante: las variables `VITE_*` se "hornean" dentro del bundle en el
> momento del build, no en tiempo de ejecución. Si cambias tus credenciales
> de Supabase después de desplegar, necesitas volver a construir y
> redesplegar (con Git, esto es automático al hacer push).

## 6. Asistente IA (opcional)

La vista **Dashboard financiero** incluye un asistente que responde preguntas
como "¿Cuántas empanadas faltan para el punto de equilibrio?". Por seguridad,
la llamada a la API de Anthropic **no se hace desde el navegador** (expondría
tu API key); se hace desde una Supabase Edge Function.

Pasos:

```bash
# Instala la CLI de Supabase si no la tienes
npm install -g supabase

# Inicia sesión y vincula tu proyecto
supabase login
supabase link --project-ref TU_PROJECT_REF

# Configura tu API key de Anthropic como secreto (nunca en el frontend)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-tu-clave

# Despliega la función
supabase functions deploy asistente-ia
```

Copia la URL resultante (algo como
`https://TU_PROJECT_REF.functions.supabase.co/asistente-ia`) y agrégala a tu
`.env`:

```
VITE_ASISTENTE_IA_ENDPOINT=https://TU_PROJECT_REF.functions.supabase.co/asistente-ia
```

Si no configuras esta variable, el asistente sigue visible en la interfaz
pero mostrará un mensaje indicando que falta la configuración, sin romper el
resto de la aplicación.

## 7. Parámetros financieros del negocio

Los valores fijos (precio de la empanada, costos, arriendo, gastos fijos,
etc.) están centralizados en `src/lib/financials.js`, en el objeto
`PARAMETROS`. Ahí también viven las fórmulas de:

- Punto de equilibrio
- Margen bruto
- Utilidad bruta / neta
- Proyección mensual
- Flujo de caja
- Nivel de morosidad de cartera (0-7 días, 8-30 días, +30 días)

Si tus costos cambian, edita únicamente ese archivo — todas las vistas
(Resumen, Dashboard financiero, Reportes) leen de ahí.

Para un control más dinámico (editar estos valores desde la UI sin tocar
código), se recomienda crear una tabla `parametros` en Supabase y adaptar
`financials.js` para leerla; el esquema actual no la incluye para mantener el
setup inicial simple.

**Importante sobre el punto de equilibrio:** se calcula con los **gastos
fijos reales** que registras en la vista Gastos (tipo = "Fijo") durante el
mes en curso, dividido entre el margen unitario. NO usa los valores de
`PARAMETROS` como gasto fijo — esos solo sirven de referencia inicial. Si
registras un gasto fijo grande (ej. una compra grande de insumos marcada
como "Fijo"), el punto de equilibrio del Dashboard financiero se recalcula
de inmediato.

**Logo del reporte PDF:** en la vista Reportes puedes subir una imagen que se
guarda en el navegador (localStorage) y se incrusta automáticamente en cada
PDF que exportes. Si cambias de computador o navegador, deberás volver a
subirla.

## 8. Estructura del proyecto

```
mordisco/
├── src/
│   ├── components/       # Sidebar, navegación móvil, Asistente IA
│   ├── lib/               # Cliente Supabase + lógica financiera
│   ├── pages/              # Una vista por cada sección del menú
│   ├── App.jsx             # Rutas + guardia de autenticación
│   └── main.jsx
├── supabase/
│   ├── schema.sql           # Tablas, triggers y políticas RLS
│   └── functions/
│       └── asistente-ia/    # Edge Function para el asistente IA
├── tailwind.config.js       # Paleta de colores Mordisco
└── .env.example
```

## 9. Notas de seguridad

- Row Level Security está activo en todas las tablas: un usuario nunca puede
  leer o modificar datos de otro usuario, incluso si manipula las peticiones
  desde el navegador.
- La API key de Anthropic vive solo en el servidor (Supabase Edge Functions),
  nunca en el bundle de frontend.
- Cambia `ANTHROPIC_API_KEY` si sospechas que se filtró, usando
  `supabase secrets set`.

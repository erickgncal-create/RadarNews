# Radar de Focos Informativos 📡

Aplicación web desarrollada con **Next.js (App Router)**, **Tailwind CSS** y **Supabase Realtime** para monitorear incidentes, reportes ciudadanos y tendencias en tiempo real.

## Características

- ⚡ **Sincronización en vivo**: Actualización reactiva mediante Supabase Realtime Channels (`INSERT`, `UPDATE`, `DELETE`).
- 🛡️ **Seguridad y Validación**: Sanitización estricta de URLs de fuentes externas para mitigar riesgos de inyección.
- ♿ **Accesibilidad (WCAG 2.2)**: Navegación accesible por teclado, soporte de lectores de pantalla (`aria-pressed`, `aria-label`, `sr-only`) y respeto a preferencias de movimiento reducido (`motion-safe`).
- 🔍 **Búsqueda y Filtros reactivos**: Filtrado inmediato por palabras clave, zonas y categorías temáticas.
- 📱 **Diseño Responsivo**: Optimizado para dispositivos móviles y pantallas de escritorio.

---

## Estructura del Proyecto

```text
radar-noticias-app/
├── app/
│   ├── globals.css          # Estilos globales y utilidades de Tailwind
│   ├── layout.tsx           # Layout raíz con metadatos SEO
│   └── page.tsx             # Radar interactivo con realtime y filtros
├── lib/
│   └── supabase.ts          # Cliente tipado y seguro de Supabase
├── .env.example             # Plantilla de variables de entorno públicas
├── .gitignore               # Exclusión de credenciales y artefactos compilados
├── next.config.mjs          # Configuración de Next.js
├── package.json             # Dependencias y scripts
├── postcss.config.js        # Pipeline de PostCSS
├── tailwind.config.ts       # Configuración de diseño Tailwind
├── tsconfig.json            # Configuración y path aliases (@/*) de TypeScript
└── README.md                # Documentación del proyecto
```

---

## Configuración y Esquema de Supabase

Crea la tabla en el SQL Editor de tu proyecto en Supabase:

```sql
create table public.focos_noticias (
  id_foco uuid primary key default gen_random_uuid(),
  titulo text not null,
  zona text not null,
  categoria text not null, -- 'transito', 'servicios', 'clima', 'seguridad'
  volumen_reportes integer not null default 1,
  primer_reporte timestamptz not null default now(),
  ultimo_reporte timestamptz not null default now(),
  ejemplos_tweets text[] default array[]::text[],
  activo boolean not null default true
);

-- Habilitar Row Level Security (RLS)
alter table public.focos_noticias enable row level security;

-- Permitir lectura pública para clientes anónimos
create policy "Permitir lectura publica de focos activos"
  on public.focos_noticias
  for select
  using (activo = true);

-- Habilitar la replicación Realtime en la tabla
alter publication supabase_realtime add table public.focos_noticias;
```

---

## Instalación y Ejecución Local

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd radar-noticias-app
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Copia el archivo `.env.example` como `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Rellena tus credenciales de Supabase en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

4. **Ejecutar en modo de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Subir a GitHub

```bash
git init
git add .
git commit -m "feat: radar de focos informativos con realtime y next.js"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

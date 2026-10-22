# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

"NGR Taller": app web para un taller de reparación de tractocamiones (proyecto de residencias profesionales). Arma el expediente digital de cada unidad: fotos por etapa (Ingreso/Proceso/Terminado), inventario de ingreso con diagrama de daños, etiquetas QR que deben retirarse antes de liberar la unidad y mapa del taller. La UI, los identificadores de dominio y los comentarios están en español; mantén esa convención.

Stack: Next.js 16 (App Router, Turbopack) + React 19.2 + TypeScript strict + Tailwind CSS v4 + Supabase (Postgres, Auth, Storage) vía `@supabase/ssr`. Iconos con `lucide-react`.

La raíz del repo git es `ProyectoResidencias/`; la app vive en `proyecto-residencias/`. Ejecuta todos los comandos desde aquí.

## Comandos

```bash
npm run dev        # http://localhost:3000
npm run build      # build de producción (también corre el chequeo de tipos)
npm run lint       # ESLint (next/core-web-vitals + typescript + react-hooks v7)
npx tsc --noEmit   # solo tipos
```

No hay framework de pruebas.

Configuración: copia `.env.example` a `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sin ellas la app no truena: `supabaseConfigurado` es `false`, el proxy deja pasar y cada página muestra `<AvisoConfiguracion />`. El esquema de BD, las políticas RLS y el bucket están en `supabase/schema.sql` (se corre en el SQL Editor de Supabase).

## Arquitectura

Todas las páginas son Client Components que leen y escriben directo en Supabase con la anon key. La seguridad real son las políticas RLS (solo el rol `authenticated`).

- `src/proxy.ts`: es el "middleware" de Next 16. Refresca la sesión (cookies) con `createServerClient` y redirige a `/login?next=…` si no hay usuario. Solo `/login` es pública.
- `src/lib/supabase.ts`: cliente único `createBrowserClient<Database>` (sesión en cookies para que el proxy la vea) y `BUCKET_FOTOS`.
- `src/types/supabase.ts`: tipos escritos a mano que deben coincidir con `supabase/schema.sql`. Usa `type`, no `interface`, y declara `Relationships` por tabla; si no, supabase-js infiere `never` en insert/update. Los joins se tipan con `.overrideTypes<T[], { merge: false }>()` (`InventarioConDanos`, `EtiquetaQRConUnidad`, `FotografiaConUnidad`).
- `src/services/api.ts`: único lugar con consultas. Convención: `console.error('[funcion] …')` y lanzar `Error` con mensaje en español. Las operaciones de varios pasos hacen rollback manual (inventario→daños; Storage→fila de foto). Las fotos se comprimen en el navegador (`comprimirImagen`, import dinámico) y se guardan en `{unidad_id}/{etapa}/{timestamp}-{nombre}`.
- `src/lib/constantes.ts`: catálogos del dominio (estados, etapas, tipos de daño, vistas, talleres) con sus clases de Tailwind, más helpers de fechas. Las clases van como literales completos para que Tailwind las detecte.
- `src/lib/hooks.ts`: `useDatos(cargador, clave?)` (carga con `{datos, setDatos, error, cargando, recargar}`; se recarga cuando cambia `clave`; usa `useEffectEvent`), `useUsuario`, `useAviso` (toasts) y `mensajeDeError`.
- `src/components/ui.tsx`: primitivas visuales compartidas (`Pagina`, `Encabezado`, `Tarjeta`, `Estadistica`, `Insignia`, `Vacio`, `Cargando`, `ErrorCarga`, `Aviso`, `Campo`, y las clases `claseInput`/`claseBoton*`). Reúsalas en lugar de repetir estilos.
- `DiagramaCamion.tsx`: SVG de 5 vistas con viewBox fijo 400x220 y contenedor `aspect-[20/11]`. Los daños se guardan como `posicion_x/y` en % sobre ese contenedor; si cambias la proporción, los puntos guardados se desalinean.

Reglas de negocio en la UI:
- No se puede pasar una unidad a `Liberada`/`Entregada` si tiene etiquetas QR sin retirar (`/unidades/[id]`).
- Un QR `Colocada` en una unidad con estado de `ESTADOS_SALIDA` es una alerta crítica (dashboard, `/qr-supervision`).
- El mapa ubica las unidades por `etiquetas_qr_rastreo.taller` y `ubicacion_rack` de sus QR colocados.

La unidad seleccionada en `/camara`, `/inventario` y `/qr-supervision` llega por `?unidad=<id>`. Las páginas que usan `useSearchParams` se envuelven en `<Suspense>` (el build lo exige).

`Navbar` es un export **default** (importarlo con llaves ya causó una pantalla en blanco). Se oculta en `/login` y en celular se vuelve una barra inferior. Para fotos remotas usa `next/image`: el host `*.supabase.co` ya está permitido en `next.config.ts`. Alias de import: `@/*` → `src/*`.

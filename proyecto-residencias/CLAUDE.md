# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

"NGR Taller": app web para el taller de reparación de tractocamiones RSAD (Corporativo Nugar), proyecto de residencias profesionales. Arma el expediente digital de cada unidad (identificada por su **número de cono**, columna `unidad_eco`): inventario físico, fotos por etapa (Ingreso/Proceso/Terminado), etiquetas QR por taller con fecha de retiro, y mapa del taller. La UI, los identificadores de dominio y los comentarios están en español; mantén esa convención.

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

Configuración: copia `.env.example` a `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sin ellas la app no truena: `supabaseConfigurado` es `false`, el proxy deja pasar y cada página muestra `<AvisoConfiguracion />`. Base de datos: `supabase/schema.sql` es el esquema completo para una instalación nueva (tablas, trigger de fases, RLS, bucket). Si la BD ya tenía el esquema anterior, se corre la migración `supabase/migraciones/002_fases_qr_inventario.sql`. Ambos son idempotentes; cualquier cambio de esquema va en los dos y en `src/types/supabase.ts`.

## Arquitectura

Todas las páginas son Client Components que leen y escriben directo en Supabase con la anon key. La seguridad real son las políticas RLS (solo el rol `authenticated`).

- `src/proxy.ts`: es el "middleware" de Next 16. Refresca la sesión (cookies) con `createServerClient` y redirige a `/login?next=…` si no hay usuario. Solo `/login` es pública.
- `src/lib/supabase.ts`: cliente único `createBrowserClient<Database>` (sesión en cookies para que el proxy la vea) y `BUCKET_FOTOS`.
- `src/types/supabase.ts`: tipos escritos a mano que deben coincidir con `supabase/schema.sql`. Usa `type`, no `interface`, y declara `Relationships` por tabla; si no, supabase-js infiere `never` en insert/update. Los joins se tipan con `.overrideTypes<T[], { merge: false }>()` (`InventarioConDanos`, `EtiquetaQRConUnidad`, `FotografiaConUnidad`).
- `src/services/api.ts`: único lugar con consultas. Convención: `console.error('[funcion] …')` y lanzar `Error` con mensaje en español. Las operaciones de varios pasos hacen rollback manual (inventario→daños; Storage→fila de foto). Las fotos se comprimen en el navegador (`comprimirImagen`, import dinámico) y se guardan en `{unidad_id}/{etapa}/{timestamp}-{nombre}`.
- `src/lib/constantes.ts`: catálogos del dominio (fases, etapas de foto, vistas, talleres) con sus clases de Tailwind, helpers de fechas y `situacionRetiro()` de los QR. Las clases van como literales completos para que Tailwind las detecte.
- `src/lib/fases.ts`: tareas de cada fase (`tareasDeFase`), cuáles son obligatorias para avanzar y adónde lleva cada una. Lo usan el expediente y el dashboard («¿Qué sigue?»).
- `src/lib/hojaInventario.ts`: catálogo de la hoja física «INVENTARIO FÍSICO ESTADO UNIDAD» (Depto. Operativo RSAD) en sus 3 columnas y grupos. El formulario (`components/HojaInventario.tsx`) y el Excel (`lib/excelInventario.ts`, con exceljs) se generan desde ahí: para cambiar la hoja se edita solo ese archivo. Cada parte se guarda en `inventarios_ingreso.checklist` como `{cant, estado: B|R|M}` (o `{si}` en OTROS) y el encabezado en `datos_hoja`.
- `src/lib/hooks.ts`: `useDatos(cargador, clave?)` (carga con `{datos, setDatos, error, cargando, recargar}`; se recarga cuando cambia `clave`; usa `useEffectEvent`), `useUsuario`, `useAviso` (toasts) y `mensajeDeError`.
- `src/components/ui.tsx`: primitivas visuales compartidas (`Pagina`, `Encabezado`, `Tarjeta`, `Estadistica`, `Insignia`, `Vacio`, `Cargando`, `ErrorCarga`, `Aviso`, `Campo`, y las clases `claseInput`/`claseBoton*`). Reúsalas en lugar de repetir estilos.
- `DiagramaCamion.tsx`: las 5 vistas de la hoja (viewBox fijo 400x220, contenedor `aspect-[20/11]`); tocar pone una ✕ (golpe). Los golpes se guardan como `posicion_x/y` en % sobre ese contenedor: si cambias la proporción, los guardados se desalinean. `SvgHoja` arma la franja vistas + medidores LH/RH que se incrusta como PNG en el Excel.

Reglas de negocio:
- Fases: Ingreso → Espera de Liberación → Proceso → Control de Calidad → Entrega. Solo se avanza de una en una y nunca se regresa; lo impide el trigger `validar_fase_unidad` (que además llena `historial_estados` con fecha y correo del usuario), no solo la UI. Se avanza con `avanzarFase()` desde el expediente, cuando las tareas obligatorias de la fase están completas.
- QR: un mismo cono puede tener varios QR (uno por taller); el índice único parcial solo impide repetir cono + taller mientras el QR siga sin retirar. Cada QR guarda `fecha_colocacion` y `fecha_retiro_programada` (por defecto, la fecha compromiso de la unidad). Para pasar a Entrega hay que retirar todos.
- Fotos: las de Ingreso solo para unidades en Ingreso; Proceso para Proceso; Terminado para Proceso o Control de Calidad (`ETAPAS_FOTO[].fases`).
- El mapa ubica las unidades por `taller` y `ubicacion_rack` de sus QR colocados.

El flujo es guiado: el expediente (`/unidades/[id]`) enlaza a cada tarea con `?unidad=<id>` (`/inventario`, `/fotos?etapa=…`, `/qr-supervision`) y esas páginas regresan a `/unidades/[id]?hecho=…`. El inventario no está en el menú. `/camara` redirige a `/fotos` (next.config.ts). Las páginas que usan `useSearchParams` se envuelven en `<Suspense>` (el build lo exige).

`Navbar` es un export **default** (importarlo con llaves ya causó una pantalla en blanco). Se oculta en `/login` y en celular se vuelve una barra inferior. Para fotos remotas usa `next/image`: el host `*.supabase.co` ya está permitido en `next.config.ts`. Alias de import: `@/*` → `src/*`.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// -----------------------------------------------------------------------------
// Variables de entorno: crea un archivo .env.local en la raíz del proyecto
// (copia .env.example) con:
//
//   NEXT_PUBLIC_SUPABASE_URL=https://qqpuumpfdpmtbjfpjljg.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_publica_aqui
//
// El prefijo NEXT_PUBLIC_ es obligatorio para que Next.js exponga estas
// variables al bundle del navegador (son seguras: la anon key depende de
// tus políticas RLS en Supabase, nunca pongas aquí la service_role key).
// -----------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Si faltan las variables, la app no truena al importar este módulo: las
 * páginas muestran un aviso de configuración (ver <AvisoConfiguracion />).
 */
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

// createBrowserClient (de @supabase/ssr) guarda la sesión en cookies, no en
// localStorage, para que src/proxy.ts pueda verificarla antes de cada página.
export const supabase = createBrowserClient<Database>(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'sin-configurar'
);

// Nombre del bucket de Storage, centralizado aquí para no "hardcodear" el
// string en varios archivos (si cambia el nombre del bucket, se edita 1 vez).
export const BUCKET_FOTOS = 'fotos-tractocamiones';

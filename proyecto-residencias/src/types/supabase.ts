/**
 * Tipos TypeScript escritos a mano a partir del esquema SQL (supabase/schema.sql).
 * Cada tabla expone 3 variantes:
 *  - Row:    forma de los datos al leer (SELECT)
 *  - Insert: forma mínima requerida al escribir (INSERT); los campos con
 *            valor por defecto en la BD (id, timestamps) son opcionales
 *  - Update: todos los campos opcionales (UPDATE parcial)
 *
 * IMPORTANTE: se usan `type` y no `interface`. Los genéricos de supabase-js
 * exigen que Row/Insert/Update sean asignables a Record<string, unknown>, y las
 * interfaces no tienen firma de índice implícita; con `interface` TypeScript
 * infiere `never` en .insert()/.update(). Por la misma razón cada tabla declara
 * `Relationships`.
 */

// ---------------------------------------------------------------------------
// Enums de dominio (reflejan los CHECK constraints de la BD)
// ---------------------------------------------------------------------------

/** Fases del taller, en orden. Solo avanzan (lo valida un trigger en la BD). */
export type EstadoUnidad = 'Ingreso' | 'Espera de Liberación' | 'Proceso' | 'Control de Calidad' | 'Entrega';

export type VistaDiagrama = 'frontal' | 'lateral_izquierdo' | 'lateral_derecho' | 'trasera' | 'superior';

export type TipoDano = 'golpe' | 'rayon' | 'abolladura' | 'rotura' | 'faltante' | 'oxido';

export type EtapaFoto = 'Ingreso' | 'Proceso' | 'Terminado';

export type EstadoQR = 'Pendiente' | 'Colocada' | 'Retirada';

// ---------------------------------------------------------------------------
// 1. unidades
// ---------------------------------------------------------------------------

export type Unidad = {
  id: string;
  unidad_eco: string;
  vin: string | null;
  modelo: string | null;
  cliente_aseguradora: string | null;
  tipo_golpe: string | null;
  fecha_ingreso: string; // ISO date
  fecha_compromiso: string | null; // ISO date
  responsable_asignado: string | null;
  estado_unidad: EstadoUnidad;
  created_at: string;
};

export type UnidadInsert = {
  id?: string;
  unidad_eco: string;
  vin?: string | null;
  modelo?: string | null;
  cliente_aseguradora?: string | null;
  tipo_golpe?: string | null;
  fecha_ingreso?: string;
  fecha_compromiso?: string | null;
  responsable_asignado?: string | null;
  estado_unidad?: EstadoUnidad;
};

export type UnidadUpdate = Partial<UnidadInsert>;

// ---------------------------------------------------------------------------
// historial_estados (lo llena el trigger de la BD; solo lectura desde la app)
// ---------------------------------------------------------------------------

export type HistorialEstado = {
  id: string;
  unidad_id: string;
  estado: EstadoUnidad;
  registrado_por: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 2. inventarios_ingreso
// ---------------------------------------------------------------------------

/** Estado de una parte en la hoja: Bueno / Regular / Malo. */
export type EstadoParte = 'B' | 'R' | 'M';

/** Renglón de "Partes y accesorios": Cant + estado, o Sí/No en el grupo OTROS. */
export type ParteInventario = { cant?: number | null; estado?: EstadoParte | null; si?: boolean | null };

/** Encabezado de la hoja (franja amarilla y renglones de arriba). */
export type DatosHoja = {
  cliente?: string;
  tarjeta_iave?: string;
  cia?: string;
  marca?: string;
  tipo?: string;
  modelo?: string;
  placas?: string;
  color?: string;
  numero_motor?: string;
  numero_serie?: string;
  llantas?: string;
};

export type InventarioIngreso = {
  id: string;
  unidad_id: string;
  kilometraje: number;
  /** Tanque LH, 0-100 (%) */
  nivel_combustible: number;
  /** Tanque RH, 0-100 (%) */
  nivel_combustible_rh: number | null;
  tiene_gato_hidraulico: boolean;
  tiene_extintor: boolean;
  tiene_llanta_refaccion: boolean;
  datos_hoja: DatosHoja;
  /** Partes y accesorios: clave de ITEMS_HOJA (src/lib/hojaInventario.ts) → renglón. */
  checklist: Record<string, ParteInventario>;
  observaciones: string | null;
  supervisor: string | null;
  observaciones_mecanicas: string | null;
  observaciones_carroceria: string | null;
  firma_operador_url: string | null;
  capturado_por: string;
  created_at: string;
};

export type InventarioIngresoInsert = Omit<
  InventarioIngreso,
  'id' | 'created_at' | 'firma_operador_url' | 'checklist' | 'datos_hoja' | 'nivel_combustible_rh' | 'observaciones' | 'supervisor' | 'observaciones_mecanicas' | 'observaciones_carroceria'
> & {
  id?: string;
  checklist?: Record<string, ParteInventario>;
  datos_hoja?: DatosHoja;
  nivel_combustible_rh?: number | null;
  observaciones?: string | null;
  supervisor?: string | null;
  observaciones_mecanicas?: string | null;
  observaciones_carroceria?: string | null;
  firma_operador_url?: string | null;
};
export type InventarioIngresoUpdate = Partial<InventarioIngresoInsert>;

// ---------------------------------------------------------------------------
// 3. danos_diagrama
// ---------------------------------------------------------------------------

export type DanoDiagrama = {
  id: string;
  inventario_id: string;
  posicion_x: number; // porcentaje 0-100 relativo al ancho del diagrama
  posicion_y: number; // porcentaje 0-100 relativo al alto del diagrama
  vista: VistaDiagrama;
  tipo_dano: TipoDano;
  descripcion: string | null;
  created_at: string;
};

export type DanoDiagramaInsert = Omit<DanoDiagrama, 'id' | 'created_at' | 'tipo_dano' | 'descripcion'> & {
  id?: string;
  tipo_dano?: TipoDano;
  descripcion?: string | null;
};
export type DanoDiagramaUpdate = Partial<DanoDiagramaInsert>;

// ---------------------------------------------------------------------------
// 4. fotografias_unidad
// ---------------------------------------------------------------------------

export type FotografiaUnidad = {
  id: string;
  unidad_id: string;
  etapa: EtapaFoto;
  seccion: string | null;
  url_publica: string;
  ruta_storage: string;
  peso_kb: number;
  subido_por: string;
  created_at: string;
};

export type FotografiaUnidadInsert = Omit<FotografiaUnidad, 'id' | 'created_at'> & { id?: string };
export type FotografiaUnidadUpdate = Partial<FotografiaUnidadInsert>;

// ---------------------------------------------------------------------------
// 5. etiquetas_qr_rastreo
// ---------------------------------------------------------------------------

export type EtiquetaQRRastreo = {
  id: string;
  unidad_id: string;
  codigo_qr: string;
  taller: string;
  ubicacion_rack: string | null;
  estado: EstadoQR;
  fecha_colocacion: string | null;
  /** Fecha en que se debe retirar (por defecto, la fecha compromiso de la unidad). */
  fecha_retiro_programada: string | null; // ISO date
  fecha_retiro: string | null;
  retirado_por: string | null;
  created_at: string;
};

export type EtiquetaQRRastreoInsert = Omit<
  EtiquetaQRRastreo,
  'id' | 'created_at' | 'estado' | 'fecha_retiro' | 'retirado_por'
> & {
  id?: string;
  estado?: EstadoQR;
  fecha_retiro?: string | null;
  retirado_por?: string | null;
};
export type EtiquetaQRRastreoUpdate = Partial<EtiquetaQRRastreoInsert>;

// ---------------------------------------------------------------------------
// Tipos compuestos que devuelven los servicios (joins)
// ---------------------------------------------------------------------------

export type InventarioConDanos = InventarioIngreso & { danos_diagrama: DanoDiagrama[] };

export type EtiquetaQRConUnidad = EtiquetaQRRastreo & {
  unidades: Pick<Unidad, 'id' | 'unidad_eco' | 'estado_unidad' | 'fecha_compromiso'> | null;
};

export type FotografiaConUnidad = FotografiaUnidad & {
  unidades: Pick<Unidad, 'id' | 'unidad_eco'> | null;
};

// ---------------------------------------------------------------------------
// Database: estructura que espera createClient<Database>()
// ---------------------------------------------------------------------------

type RelacionConUnidad<Nombre extends string> = {
  foreignKeyName: Nombre;
  columns: ['unidad_id'];
  isOneToOne: false;
  referencedRelation: 'unidades';
  referencedColumns: ['id'];
};

export type Database = {
  public: {
    Tables: {
      unidades: {
        Row: Unidad;
        Insert: UnidadInsert;
        Update: UnidadUpdate;
        Relationships: [];
      };
      historial_estados: {
        Row: HistorialEstado;
        Insert: Omit<HistorialEstado, 'id' | 'created_at'>;
        Update: Partial<Omit<HistorialEstado, 'id'>>;
        Relationships: [RelacionConUnidad<'historial_estados_unidad_id_fkey'>];
      };
      inventarios_ingreso: {
        Row: InventarioIngreso;
        Insert: InventarioIngresoInsert;
        Update: InventarioIngresoUpdate;
        Relationships: [RelacionConUnidad<'inventarios_ingreso_unidad_id_fkey'>];
      };
      danos_diagrama: {
        Row: DanoDiagrama;
        Insert: DanoDiagramaInsert;
        Update: DanoDiagramaUpdate;
        Relationships: [
          {
            foreignKeyName: 'danos_diagrama_inventario_id_fkey';
            columns: ['inventario_id'];
            isOneToOne: false;
            referencedRelation: 'inventarios_ingreso';
            referencedColumns: ['id'];
          },
        ];
      };
      fotografias_unidad: {
        Row: FotografiaUnidad;
        Insert: FotografiaUnidadInsert;
        Update: FotografiaUnidadUpdate;
        Relationships: [RelacionConUnidad<'fotografias_unidad_unidad_id_fkey'>];
      };
      etiquetas_qr_rastreo: {
        Row: EtiquetaQRRastreo;
        Insert: EtiquetaQRRastreoInsert;
        Update: EtiquetaQRRastreoUpdate;
        Relationships: [RelacionConUnidad<'etiquetas_qr_rastreo_unidad_id_fkey'>];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

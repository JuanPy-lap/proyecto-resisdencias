export interface Unidad {
  id: string;
  unidad_eco: string;
  vin?: string;
  modelo?: string;
  cliente_aseguradora?: string;
  tipo_golpe?: string;
  fecha_ingreso?: string;
  fecha_compromiso?: string;
  responsable_asignado?: string;
  estado_unidad: 'Ingreso' | 'En Reparacion' | 'Terminado' | 'Entregado';
  creado_el?: string;
}

export interface FotografiasUnidad {
  id: string;
  unidad_id: string;
  etapa: 'Ingreso' | 'Proceso' | 'Terminado';
  seccion?: string;
  url_publica: string;
  ruta_storage: string;
  peso_kb: number;
  subido_por?: string;
  creado_el?: string;
}

export interface InventarioIngreso {
  id?: string;
  unidad_id: string;
  kilometraje: number;
  nivel_combustible: string;
  tiene_gato_hidraulico: boolean;
  tiene_extintor: boolean;
  tiene_llanta_refaccion: boolean;
  observaciones_mecanicas?: string;
  observaciones_carroceria?: string;
  capturado_por?: string;
}
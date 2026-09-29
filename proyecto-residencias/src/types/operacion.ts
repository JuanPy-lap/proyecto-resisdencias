export type PrioridadQR = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type EtapaUnidad = 'Ingreso' | 'Proceso' | 'Terminado';
export type EstadoUnidad = 'Activo' | 'Pendiente' | 'En taller';

export interface Tractocamion {
  id: string;
  unidad: string;
  economico: string;
  planta: string;
  etapa: EtapaUnidad;
  estado: EstadoUnidad;
  ultimaActualizacion: string;
  responsable: string;
}

export interface AlertaQR {
  id: string;
  unidadEco: string;
  tipoFalla: string;
  prioridad: PrioridadQR;
  descripcion: string;
  fecha: string;
  area: string;
  estado: 'Pendiente' | 'Atendida';
}

export interface Fotografia {
  id: string;
  unidadEco: string;
  etapa: EtapaUnidad;
  nombre: string;
  fecha: string;
  pesoKb: number;
  calidad: 'Alta' | 'Media';
}

export interface Inventario {
  id: string;
  unidadEco: string;
  kilometraje: string;
  condicion: string;
  fotos: number;
  observaciones: string[];
  danos: string[];
}

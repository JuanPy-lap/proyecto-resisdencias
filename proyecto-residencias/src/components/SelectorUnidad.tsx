'use client';

import type { Unidad } from '@/types/supabase';
import { claseInput } from '@/components/ui';

/** Select de unidades reutilizado por cámara, inventario y QR. */
export default function SelectorUnidad({
  unidades,
  valor,
  cambiar,
  incluirEntregadas = false,
}: {
  unidades: Unidad[];
  valor: string;
  cambiar: (id: string) => void;
  incluirEntregadas?: boolean;
}) {
  const visibles = incluirEntregadas ? unidades : unidades.filter((u) => u.estado_unidad !== 'Entregada' || u.id === valor);
  return (
    <select value={valor} onChange={(e) => cambiar(e.target.value)} className={`${claseInput} font-mono`}>
      <option value="">— Selecciona una unidad —</option>
      {visibles.map((u) => (
        <option key={u.id} value={u.id}>
          {u.unidad_eco} · {u.estado_unidad}
          {u.modelo ? ` · ${u.modelo}` : ''}
        </option>
      ))}
    </select>
  );
}

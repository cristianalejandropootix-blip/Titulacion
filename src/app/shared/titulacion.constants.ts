export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const ESTADOS_FASE = {
  revision: 'En Revisión',
  aprobada: 'Aprobado',
  rechazada: 'Rechazado',
  pendiente: 'Pendiente'
} as const;

export function getEtiquetaEstadoFase(estado: string): string {
  switch (estado) {
    case ESTADOS_FASE.revision:
      return 'Documentos en revisión';
    case ESTADOS_FASE.aprobada:
      return 'Documentos aceptados';
    case ESTADOS_FASE.rechazada:
      return 'Documentos rechazados';
    default:
      return estado || ESTADOS_FASE.pendiente;
  }
}

export function getClaseEstadoFase(estado: string): string {
  switch (estado) {
    case ESTADOS_FASE.revision:
      return 'estado--revision';
    case ESTADOS_FASE.aprobada:
      return 'estado--aprobada';
    case ESTADOS_FASE.rechazada:
      return 'estado--rechazada';
    default:
      return 'estado--pendiente';
  }
}

export function getResumenEstadoFase(estado: string): string {
  const resumen = estado === ESTADOS_FASE.aprobada ? 'Aprobada' : 'No aprobada';
  return `${resumen}: ${getEtiquetaEstadoFase(estado)}`;
}

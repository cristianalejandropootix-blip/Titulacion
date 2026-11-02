const FECHA_PROTOCOLARIA_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function normalizarFechaProtocolaria(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const coincidencia = FECHA_PROTOCOLARIA_PATTERN.exec(valor.trim());
  if (!coincidencia) return null;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const diasPorMes = [31, esAnioBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasPorMes[mes - 1]) return null;

  return `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`;
}

export function extraerFechaProtocolaria(origen: unknown): string | null {
  if (!origen || typeof origen !== 'object') return null;
  const datos = origen as Record<string, unknown>;
  return normalizarFechaProtocolaria(
    datos['fechaProtocolaria'] ?? datos['fecha_protocolaria'] ?? datos['fecha_acto_protocolario']
  );
}

export function obtenerFechaActualMerida(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(ahora);
}

export function obtenerMinutoDelDiaMerida(ahora = new Date()): number {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Merida',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(ahora);
  const horaFormateada = Number(partes.find(parte => parte.type === 'hour')?.value ?? 0);
  const hora = horaFormateada === 24 ? 0 : horaFormateada;
  const minuto = Number(partes.find(parte => parte.type === 'minute')?.value ?? 0);
  return hora * 60 + minuto;
}

export function formatearFechaProtocolaria(fecha: string, capitalizar = false): string {
  const normalizada = normalizarFechaProtocolaria(fecha);
  if (!normalizada) return fecha;
  const [anio, mes, dia] = normalizada.split('-').map(Number);
  const fechaLocal = new Date(anio, mes - 1, dia, 12);
  const texto = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(fechaLocal);
  return capitalizar ? texto.charAt(0).toLocaleUpperCase('es-MX') + texto.slice(1) : texto;
}

export function sumarAnosFechaProtocolaria(fecha: string, anos: number): string {
  const normalizada = normalizarFechaProtocolaria(fecha);
  if (!normalizada) return fecha;
  const [anio, mes, dia] = normalizada.split('-').map(Number);
  const nuevoAnio = anio + anos;
  const diaMaximo = new Date(nuevoAnio, mes, 0).getDate();
  return `${nuevoAnio}-${dosDigitos(mes)}-${dosDigitos(Math.min(dia, diaMaximo))}`;
}

export function obtenerAnioFechaProtocolaria(fecha: string): number | null {
  return normalizarFechaProtocolaria(fecha)
    ? Number(fecha.slice(0, 4))
    : null;
}

function esAnioBisiesto(anio: number): boolean {
  return anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

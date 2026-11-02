export const DOMINIO_INSTITUCIONAL = 'conkal.tecnm.mx';

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

export function esCorreoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function esCorreoRegistroValido(correo: string): boolean {
  return (correo.match(/@/g)?.length ?? 0) === 1 &&
    /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(correo);
}

export function tieneDominioInstitucional(correo: string): boolean {
  return correo.split('@')[1] === DOMINIO_INSTITUCIONAL;
}

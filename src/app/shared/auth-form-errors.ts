export type AuthFormField =
  | 'correo'
  | 'contrasena'
  | 'matricula'
  | 'nombre'
  | 'primerApellido'
  | 'segundoApellido'
  | 'proyecto'
  | 'carrera';

const FIELD_KEYS = ['field', 'campo', 'param', 'property', 'path'] as const;

export function getApiField(
  error: unknown,
  aliases: Partial<Record<AuthFormField, readonly string[]>>
): AuthFormField | null {
  if (typeof error !== 'object' || error === null) return null;

  const root = error as Record<string, unknown>;
  const bodies = [root, root['error'], root['errors']];
  for (const body of bodies) {
    if (typeof body !== 'object' || body === null) continue;
    const record = body as Record<string, unknown>;
    for (const key of FIELD_KEYS) {
      const field = record[key];
      if (typeof field === 'string') {
        const match = findField(field, aliases);
        if (match) return match;
      }
    }
    for (const [field, values] of Object.entries(aliases)) {
      if (!values) continue;
      if (values.some((alias) => Object.prototype.hasOwnProperty.call(record, alias))) {
        return field as AuthFormField;
      }
    }
  }
  return null;
}

export function getRegistrationErrorField(message: string): AuthFormField | null {
  const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\b(correo|email)\b/.test(normalized) &&
    /\b(registrad|exist|duplicad|duplicate|usad|uso|in use|invalid|invalido|incorrect)\w*/.test(normalized)) {
    return 'correo';
  }
  if (/\b(matricula|control)\b/.test(normalized) &&
    /\b(registrad|exist|duplicad|duplicate|usad|uso|in use|invalid|invalido|incorrect)\w*/.test(normalized)) {
    return 'matricula';
  }
  if (/\b(contrasena|password)\b/.test(normalized) &&
    /\b(corta|short|8 caracter|8 character|minim)\w*/.test(normalized)) {
    return 'contrasena';
  }
  return null;
}

function findField(
  value: string,
  aliases: Partial<Record<AuthFormField, readonly string[]>>
): AuthFormField | null {
  const normalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [field, values] of Object.entries(aliases)) {
    if (!values) continue;
    if (values.some((alias) =>
      normalized === alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )) {
      return field as AuthFormField;
    }
  }
  return null;
}

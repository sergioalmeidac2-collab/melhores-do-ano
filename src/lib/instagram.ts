/**
 * Normaliza um handle de Instagram digitado com ou sem @, URL completa, espaços etc.
 * Retorna sempre no formato "@usuario" (ou null se vazio).
 */
export function normalizeInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  // remove URL completa (instagram.com/usuario ou www.instagram.com/usuario/)
  value = value.replace(/^https?:\/\//i, '').replace(/^(www\.)?instagram\.com\//i, '');
  value = value.split('?')[0];
  value = value.replace(/\/+$/, '');
  value = value.replace(/^@/, '');
  value = value.trim();

  if (!value) return null;

  // handles válidos: letras, números, pontos e underscore
  const cleaned = value.replace(/[^a-zA-Z0-9._]/g, '');
  if (!cleaned) return null;

  return `@${cleaned.toLowerCase()}`;
}

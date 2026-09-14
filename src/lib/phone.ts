// Utilidades para telefone brasileiro (celular e fixo).

/** Remove tudo que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Aplica máscara brasileira progressiva enquanto o usuário digita.
 * Aceita fixo (10 dígitos) e celular (11 dígitos), com ou sem DDI 55.
 */
export function maskBrazilPhone(value: string): string {
  let digits = onlyDigits(value).slice(0, 13); // até 13 dígitos (55 + DDD + 9 dígitos)

  // remove DDI 55 apenas para exibição da máscara local (mantemos sem DDI na UI)
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${ddd}`;

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }

  if (rest.length <= 8) {
    // fixo: 4+4
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  // celular: 5+4
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

export interface PhoneValidation {
  valid: boolean;
  normalized: string | null; // formato E.164-like: 55DDDNNNNNNNNN
  error?: string;
}

/**
 * Valida e normaliza um telefone brasileiro para o formato 55 + DDD (2) + número (8 ou 9 dígitos).
 * Esse formato normalizado é o que usamos como chave de deduplicação e para futura integração com WhatsApp.
 */
export function validateAndNormalizeBrazilPhone(rawValue: string): PhoneValidation {
  let digits = onlyDigits(rawValue);

  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  if (digits.length < 10 || digits.length > 11) {
    return { valid: false, normalized: null, error: 'Informe um telefone válido com DDD.' };
  }

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { valid: false, normalized: null, error: 'DDD inválido.' };
  }

  const subscriberNumber = digits.slice(2);
  // celular deve começar com 9; fixo deve começar entre 2 e 5
  if (subscriberNumber.length === 9 && subscriberNumber[0] !== '9') {
    return { valid: false, normalized: null, error: 'Número de celular inválido.' };
  }
  if (subscriberNumber.length === 8 && !/^[2-5]/.test(subscriberNumber)) {
    return { valid: false, normalized: null, error: 'Número de telefone inválido.' };
  }

  return { valid: true, normalized: `55${digits}` };
}

/** Formata o telefone normalizado (55DDDNNNNNNNNN) de volta para exibição. */
export function formatNormalizedPhone(normalized: string): string {
  const digits = normalized.startsWith('55') ? normalized.slice(2) : normalized;
  return maskBrazilPhone(digits);
}

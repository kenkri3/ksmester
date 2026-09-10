import xss, { IFilterXSSOptions } from 'xss';

const xssOptions: IFilterXSSOptions = {
  whiteList: {}, // Stripper alle HTML-tags som standard
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
};

/**
 * Renser en streng mot XSS-angrep.
 */
export const sanitize = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return xss(input.trim(), xssOptions);
};

/**
 * Renser e-post og konverterer til små bokstaver uten farlige tegn eller linjeskift.
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().replace(/[\r\n\0]/g, '');
};

/**
 * Renser telefonnummer slik at kun sifre og + - tegn beholdes.
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d\s\+\-]/g, '').trim();
};

/**
 * Fjerner linjeskift (\r og \n) fra headere (f.eks. subject, to, reply-to)
 * for å forhindre SMTP/HTTP Header Injection.
 */
export const sanitizeHeader = (headerValue: string): string => {
  if (!headerValue || typeof headerValue !== 'string') return '';
  return headerValue.replace(/[\r\n\0]/g, '').trim();
};

/**
 * Renser et helt objekt rekursivt.
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = sanitizeEmail(value);
      } else if (key.toLowerCase().includes('phone')) {
        sanitized[key] = sanitizePhone(value);
      } else {
        sanitized[key] = sanitize(value);
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitize(item) : item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
};

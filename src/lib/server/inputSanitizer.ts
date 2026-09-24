/**
 * Input Sanitization & Validation Helper
 * Inspirert av The Lazy Developer Form Validation & Security Guide:
 * "Defence-in-depth form security with schemas, XSS sanitization, server-side re-validation, and CORS. Stop bots and bad data at every layer."
 */

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Fjern potensielt skadelige kontrolltegn og null-bytes
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) && email.length <= 254;
}

export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Norske og internasjonale telefonnumre
  const clean = phone.replace(/[\s\-\(\)\.]/g, '');
  return /^(\+47|0047)?[2-9]\d{7}$/.test(clean) || /^\+?[1-9]\d{6,14}$/.test(clean);
}

export function validateNorwegianOrgNr(orgnr: string): boolean {
  if (!orgnr || typeof orgnr !== 'string') return false;
  const clean = orgnr.replace(/\s+/g, '');
  if (!/^\d{9}$/.test(clean)) return false;

  // Modulus 11-kontrollsifferberegning
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  const control = remainder === 0 ? 0 : 11 - remainder;
  return control === parseInt(clean[8], 10);
}

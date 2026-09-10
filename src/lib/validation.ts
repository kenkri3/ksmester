import { z } from 'zod';

/**
 * Valideringshjelper for norske telefonnumre.
 * Støtter:
 * - 8 siffer: 4xxxxxxx, 9xxxxxxx (mobil), 2xxxxxxx, 3xxxxxxx, 5xxxxxxx, 6xxxxxxx, 7xxxxxxx
 * - +47 eller 0047 prefiks
 */
export const validateNorwegianPhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  // Norsk mobil/fasttelefon med eller uten +47 / 0047
  const norwegianPhoneRegex = /^(\+47|0047)?[2-9]\d{7}$/;
  return norwegianPhoneRegex.test(cleaned);
};

/**
 * Valideringshjelper for norsk organisasjonsnummer (9 siffer).
 * Bruker også kontrollsifferberegning (Modulus 11).
 */
export const validateNorwegianOrgnr = (orgnr: string): boolean => {
  if (!orgnr) return false;
  const clean = orgnr.replace(/\s+/g, '');
  if (!/^\d{9}$/.test(clean)) return false;

  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 11 - remainder;
  if (checkDigit === 11) return false; // Ugyldig kontrollsiffer
  return checkDigit === parseInt(clean[8], 10);
};

// ===========================================
// LEAD & ONBOARDING SCHEMA
// ===========================================
export const leadFormSchema = z.object({
  company: z
    .string()
    .min(2, 'Firmanavn må være minst 2 tegn')
    .max(120, 'Firmanavn kan ikke være mer enn 120 tegn'),

  orgnr: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || validateNorwegianOrgnr(val), {
      message: 'Vennligst oppgi et gyldig norsk organisasjonsnummer (9 siffer)',
    }),

  name: z
    .string()
    .min(2, 'Navn må være minst 2 tegn')
    .max(100, 'Navn kan ikke være mer enn 100 tegn')
    .regex(/^[a-zA-ZæøåÆØÅ\s\-\.']+$/, 'Navn kan kun inneholde bokstaver, mellomrom og bindestrek'),

  email: z
    .string()
    .email('Vennligst oppgi en gyldig e-postadresse')
    .max(254, 'E-post kan ikke være mer enn 254 tegn')
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .min(8, 'Telefonnummer må være minst 8 siffer')
    .max(20, 'Telefonnummer er for langt')
    .refine(validateNorwegianPhone, 'Vennligst oppgi et gyldig norsk telefonnummer (f.eks. 912 34 567 eller +47 912 34 567)'),

  trade: z
    .string()
    .max(100)
    .default('Byggmester / Tømrer'),

  workers: z
    .coerce
    .number()
    .int()
    .min(1, 'Minst 1 ansatt')
    .max(1000, 'Maksimum 1000')
    .default(3),

  plan: z
    .enum(['solo', 'team', 'entreprenor', 'partner'])
    .default('team'),

  message: z
    .string()
    .max(2000, 'Melding kan ikke være over 2000 tegn')
    .optional()
    .or(z.literal('')),

  referralSource: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

// ===========================================
// KONTAKTSKJEMA & DEMOBESTILLING
// ===========================================
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Navn må være minst 2 tegn')
    .max(100, 'Navn kan ikke være over 100 tegn'),

  email: z
    .string()
    .email('Vennligst oppgi en gyldig e-postadresse')
    .max(254)
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .refine((val) => !val || validateNorwegianPhone(val), 'Ugyldig telefonnummer')
    .optional()
    .or(z.literal('')),

  company: z
    .string()
    .max(120)
    .optional()
    .or(z.literal('')),

  subject: z
    .string()
    .min(3, 'Emne må være minst 3 tegn')
    .max(150, 'Emne kan ikke være over 150 tegn')
    .regex(/^[^\r\n]*$/, 'Emne kan ikke inneholde linjeskift'),

  message: z
    .string()
    .min(10, 'Meldingen må være minst 10 tegn')
    .max(3000, 'Meldingen kan ikke være over 3000 tegn'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// ===========================================
// BRUKER- OG PARTNER-AUTENTISERING
// ===========================================
export const loginSchema = z.object({
  email: z.string().email('Ugyldig e-postadresse').toLowerCase().trim(),
  password: z.string().min(6, 'Passordet må ha minst 6 tegn'),
});

export const registerSchema = z.object({
  email: z.string().email('Ugyldig e-postadresse').toLowerCase().trim(),
  password: z.string().min(8, 'Passordet må ha minst 8 tegn'),
  name: z.string().min(2, 'Navn må være minst 2 tegn'),
  companyName: z.string().min(2, 'Firmanavn må være minst 2 tegn'),
  orgnr: z.string().optional().or(z.literal('')),
  phone: z.string().refine((val) => !val || validateNorwegianPhone(val), 'Ugyldig telefonnummer').optional().or(z.literal('')),
  trade: z.string().default('Byggmester'),
});

// ===========================================
// HJELPEFUNKSJONER FOR FEILHÅNDTERING
// ===========================================
export const getFieldErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  return errors;
};

/**
 * Lightweight input validation shared across auth screens.
 *
 * The backend is the authoritative check (pydantic EmailStr), but validating on
 * the client gives instant feedback and stops obviously-malformed addresses from
 * ever hitting the API.
 */

// Pragmatic email shape: non-space/@ local part, an @, a domain, a dot, a TLD.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

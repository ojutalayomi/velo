/** Single source of truth for password rules (client form, redux validation and /api/signup). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_RULE_MESSAGE = `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} chars, including uppercase, lowercase, number & special character.`;

export function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}

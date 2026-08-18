import crypto from 'crypto';

// Unambiguous, human-friendly characters (removed 0, O, I, 1, L)
const ALLOWED_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

/**
 * Generates a cryptographically secure 6-character room code.
 * Example: K7X92P
 */
export function generateRoomCode(): string {
  let result = '';
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = bytes[i] % ALLOWED_CHARS.length;
    result += ALLOWED_CHARS[randomIndex];
  }
  return result;
}

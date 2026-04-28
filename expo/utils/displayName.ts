import { containsProfanity } from "@/utils/profanity";

export const NAME_CHANGE_COOLDOWN_DAYS = 30;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;

const RESERVED_TERMS: string[] = [
  "admin",
  "administrator",
  "onstreak",
  "support",
  "moderator",
  "moderater",
  "mod",
  "staff",
  "official",
  "system",
  "root",
  "owner",
];

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const ALLOWED_CHARS_REGEX = /^[\p{L}\p{N} '._\-]+$/u;
const LETTER_REGEX = /\p{L}/u;

export type DisplayNameValidation =
  | { valid: true; cleaned: string }
  | { valid: false; error: string };

export function validateDisplayName(input: string): DisplayNameValidation {
  const trimmed = (input ?? "").trim();
  if (trimmed.length < DISPLAY_NAME_MIN) {
    return {
      valid: false,
      error: `Name must be at least ${DISPLAY_NAME_MIN} characters.`,
    };
  }
  if (trimmed.length > DISPLAY_NAME_MAX) {
    return {
      valid: false,
      error: `Name must be ${DISPLAY_NAME_MAX} characters or less.`,
    };
  }
  if (!LETTER_REGEX.test(trimmed)) {
    return { valid: false, error: "Name must contain at least one letter." };
  }
  if (EMOJI_REGEX.test(trimmed)) {
    return { valid: false, error: "Emojis are not allowed in your name." };
  }
  if (!ALLOWED_CHARS_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Use only letters, numbers, spaces, and basic symbols.",
    };
  }
  const lower = trimmed.toLowerCase();
  for (const term of RESERVED_TERMS) {
    if (lower === term || lower.includes(term)) {
      return { valid: false, error: "Please choose a different display name." };
    }
  }
  if (containsProfanity(trimmed)) {
    return { valid: false, error: "Please choose a different display name." };
  }
  return { valid: true, cleaned: trimmed };
}

export function daysUntilNameChangeAvailable(
  lastNameChangeAt: string | null
): number {
  if (!lastNameChangeAt) return 0;
  const last = new Date(lastNameChangeAt).getTime();
  if (!Number.isFinite(last)) return 0;
  const elapsedMs = Date.now() - last;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const remaining = NAME_CHANGE_COOLDOWN_DAYS - elapsedDays;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining);
}

export function canChangeDisplayName(lastNameChangeAt: string | null): boolean {
  return daysUntilNameChangeAvailable(lastNameChangeAt) === 0;
}

export const NAME_CHANGE_COOLDOWN_MESSAGE =
  "You can update your display name once every 30 days.";

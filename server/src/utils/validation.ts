import { HttpError } from "../middleware/error-handler";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function parseOptionalString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

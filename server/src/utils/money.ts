import { HttpError } from "../middleware/error-handler";

// All helpers here work on numeric(10,2)-shaped decimal strings (e.g. "350.00")
// and plain integer cents. Converting a decimal string to/from cents involves
// only integer arithmetic — never a floating-point division or multiplication
// of dollar amounts — so it stays exact for any realistic invoice amount
// (well within Number.MAX_SAFE_INTEGER).
export function toCents(decimal: string): number {
  const trimmed = decimal.trim();
  const isNegative = trimmed.startsWith("-");
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const cents = fractionPart.padEnd(2, "0").slice(0, 2);
  const value = Number(wholePart || "0") * 100 + Number(cents || "0");
  return isNegative ? -value : value;
}

export function centsToDecimalString(cents: number): string {
  const isNegative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${isNegative ? "-" : ""}${dollars}.${String(remainder).padStart(2, "0")}`;
}

interface ParseMonetaryOptions {
  allowZero?: boolean;
}

// Validates a single client-supplied monetary value. The number branch uses
// toFixed/Number round-tripping only to check for sub-cent precision in the
// *input itself* — it never sums or otherwise combines multiple amounts, so
// there's no float-accumulation risk. All stored/compared values downstream
// travel as decimal strings or integer cents (see toCents above).
export function parseMonetaryValue(
  value: unknown,
  field: string,
  { allowZero = false }: ParseMonetaryOptions = {},
): string {
  const isInvalidMagnitude = (n: number) => (allowZero ? n < 0 : n <= 0);
  const magnitudeError = allowZero ? "must be a non-negative number." : "must be greater than 0.";

  if (typeof value === "number") {
    if (!Number.isFinite(value) || isInvalidMagnitude(value)) {
      throw new HttpError(400, "VALIDATION_ERROR", `${field} ${magnitudeError}`);
    }
    const formatted = value.toFixed(2);
    if (Number(formatted) !== value) {
      throw new HttpError(400, "VALIDATION_ERROR", `${field} must have at most 2 decimal places.`);
    }
    return formatted;
  }

  if (typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (isInvalidMagnitude(parsed)) {
      throw new HttpError(400, "VALIDATION_ERROR", `${field} ${magnitudeError}`);
    }
    return parsed.toFixed(2);
  }

  throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid monetary value.`);
}

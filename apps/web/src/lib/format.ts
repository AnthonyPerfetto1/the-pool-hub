// price is a numeric(10,2) string from the API (e.g. "350.00"). Converting to
// Number here is only for display formatting, never for storage or arithmetic.
export function formatCurrency(price: string): string {
  const value = Number(price);
  if (Number.isNaN(value)) {
    return price;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatOrderTypeLabel(orderType: "opening" | "closing"): string {
  return orderType === "opening" ? "Pool Opening" : "Pool Closing";
}

// Integer-cents addition of two decimal strings — used to compute the
// client-side edit ceiling (remaining balance + this transaction's own
// current amount), without floating-point arithmetic on the actual values.
export function addCurrencyStrings(a: string, b: string): string {
  const toCents = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0").slice(0, 2) || "0");
  };
  const totalCents = toCents(a) + toCents(b);
  return `${Math.floor(totalCents / 100)}.${String(totalCents % 100).padStart(2, "0")}`;
}

// Converts a full ISO instant into the "YYYY-MM-DDTHH:mm" shape an
// <input type="datetime-local"> expects, using LOCAL time components (not
// UTC) so the picker shows the same wall-clock time the user originally set.
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

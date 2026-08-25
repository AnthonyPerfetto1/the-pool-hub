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

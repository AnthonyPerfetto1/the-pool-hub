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

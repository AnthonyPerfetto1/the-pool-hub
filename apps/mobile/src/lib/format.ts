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

export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// "Today · 9:00 AM" / "Tomorrow · 9:00 AM" / "Mon, Jan 5 · 9:00 AM" — all
// compared using the device's local calendar day, matching every other
// date display in the app (nothing here talks to the server's timezone
// handling; it's purely a "how far away is this" label for the reader).
export function formatAppointmentWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dateDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const time = formatTimeOnly(iso);

  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

export function formatOrderTypeLabel(orderType: "opening" | "closing"): string {
  return orderType === "opening" ? "Pool Opening" : "Pool Closing";
}

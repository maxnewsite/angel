import { clsx } from "clsx";

export function cn(...args: any[]) {
  return clsx(args);
}

export function formatMoney(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

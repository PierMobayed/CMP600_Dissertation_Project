import type { DeliveryOptionMeta } from "../api";

/** Simulated GBP prices for dissertation prototype (not live billing). */
const PRICE_GBP: Record<string, number> = {
  Standard: 8.99,
  Express: 14.99,
  SameDay: 21.99,
  PickupPoint: 6.49,
  ScheduledWindow: 11.99,
  TemperatureControlled: 16.99,
  WhiteGlove: 24.99,
};

export function priceForOption(optionId: string): number {
  return PRICE_GBP[optionId] ?? 9.99;
}

export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export function formatFromGbp(amount: number): string {
  return `from ${formatGbp(amount)}`;
}

export function isNextDayOption(optionId: string): boolean {
  return optionId === "Express";
}

export function isSameDayOption(optionId: string): boolean {
  return optionId === "SameDay";
}

export function serviceBadge(option: DeliveryOptionMeta): string | null {
  if (option.id === "Express") return "Next day";
  if (option.id === "SameDay") return "Same day";
  return null;
}

export function simulatedPaymentRef(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `PAY-${n}`;
}

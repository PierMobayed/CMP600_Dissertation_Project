/** Delivery date window: today through today + MAX_DELIVERY_DAYS_AHEAD. */

export const MAX_DELIVERY_DAYS_AHEAD = 30;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function maxDeliveryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DELIVERY_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
}

/** Clamp stored/API dates into the allowed window for display and inputs. */
export function clampDeliveryDate(iso: string | null | undefined): string {
  const today = todayIso();
  const max = maxDeliveryDate();
  if (!iso || !iso.trim()) return today;
  const v = iso.trim().slice(0, 10);
  if (v < today) return today;
  if (v > max) return max;
  return v;
}

export function minForwardDeliveryDate(currentIso: string | null | undefined): string {
  const today = todayIso();
  if (!currentIso) return today;
  const booked = clampDeliveryDate(currentIso);
  return booked >= today ? booked : today;
}

export function isDeliveryDateForward(currentIso: string | null | undefined, nextIso: string): boolean {
  const min = minForwardDeliveryDate(currentIso);
  const max = maxDeliveryDate();
  return nextIso >= min && nextIso <= max;
}

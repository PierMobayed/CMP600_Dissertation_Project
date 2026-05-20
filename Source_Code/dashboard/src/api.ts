const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

function token(): string {
  return localStorage.getItem("token") || "cmp600-demo-token";
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: { error?: { message?: string } } }).detail?.error?.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: { error?: { message?: string } } }).detail?.error?.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: { error?: { message?: string } } }).detail?.error?.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = (await res.json()) as { token: string };
  localStorage.setItem("token", data.token);
}

export function logout() {
  localStorage.removeItem("token");
}

export function officeHoldShipment(shipmentId: string, reason: string) {
  return apiPost(`/dashboard/shipments/${shipmentId}/hold`, { reason });
}

export function officeReleaseHold(shipmentId: string) {
  return apiPost(`/dashboard/shipments/${shipmentId}/release-hold`, {});
}

export function officeCancelShipment(shipmentId: string, reason?: string) {
  return apiPost(`/dashboard/shipments/${shipmentId}/cancel`, { reason: reason ?? "" });
}

export function officeRescheduleDelivery(shipmentId: string, deliveryDate: string) {
  return apiPatch(`/dashboard/shipments/${shipmentId}/delivery-date`, { delivery_date: deliveryDate });
}

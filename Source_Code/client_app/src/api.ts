const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

function token() {
  return localStorage.getItem("token") || "";
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(await res.text());
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
    let msg = await res.text();
    try {
      const j = JSON.parse(msg) as { detail?: { error?: { message?: string } } };
      msg = j.detail?.error?.message ?? msg;
    } catch {
      /* keep */
    }
    throw new Error(msg);
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
    let msg = await res.text();
    try {
      const j = JSON.parse(msg) as { detail?: { error?: { message?: string } } };
      msg = j.detail?.error?.message ?? msg;
    } catch {
      /* keep */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export type DeliveryOptionMeta = { id: string; label: string; description: string };

export async function getDeliveryOptionsPublic(): Promise<DeliveryOptionMeta[]> {
  const res = await fetch(`${API}/meta/delivery-options`);
  if (!res.ok) throw new Error("Could not load delivery options");
  const data = (await res.json()) as { options: DeliveryOptionMeta[] };
  return data.options;
}

export async function createClientShipment(clientId: string, body: Record<string, unknown>) {
  return apiPost<{
    shipmentId: string;
    orderId: string;
    status: string;
    destination: string;
    deliveryOption: string;
    deliveryDate: string | null;
  }>(`/clients/${clientId}/shipments`, body);
}

export type ClientOrderRecord = {
  shipmentId: string;
  orderId: string;
  status: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryOption?: string;
  deliveryDate?: string | null;
  holdReason?: string | null;
  canEdit?: boolean;
  canHold?: boolean;
  canCancel?: boolean;
  canReleaseHold?: boolean;
};

export async function updateClientShipment(clientId: string, shipmentId: string, body: Record<string, unknown>) {
  return apiPatch<ClientOrderRecord>(`/clients/${clientId}/shipments/${shipmentId}`, body);
}

export async function holdClientShipment(clientId: string, shipmentId: string, reason: string) {
  return apiPost<ClientOrderRecord>(`/clients/${clientId}/shipments/${shipmentId}/hold`, { reason });
}

export async function releaseHoldClientShipment(clientId: string, shipmentId: string) {
  return apiPost<ClientOrderRecord>(`/clients/${clientId}/shipments/${shipmentId}/release-hold`, {});
}

export async function cancelClientShipment(clientId: string, shipmentId: string, reason?: string) {
  return apiPost<ClientOrderRecord>(`/clients/${clientId}/shipments/${shipmentId}/cancel`, { reason: reason ?? "" });
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = (await res.json()) as { token: string; userId: string; role: string };
  localStorage.setItem("token", data.token);
  localStorage.setItem("clientId", data.userId);
  return data;
}

export async function register(username: string, password: string, displayName: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, display_name: displayName }),
  });
  if (!res.ok) {
    let msg = "Registration failed";
    try {
      const j = (await res.json()) as { detail?: { error?: { message?: string } } };
      msg = j.detail?.error?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { token: string; userId: string; role: string };
  localStorage.setItem("token", data.token);
  localStorage.setItem("clientId", data.userId);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("clientId");
}

export function getClientId() {
  return localStorage.getItem("clientId") || "";
}

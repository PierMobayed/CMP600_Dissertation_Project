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

export async function apiPost<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = (await res.json()) as { token: string; userId: string };
  localStorage.setItem("token", data.token);
  localStorage.setItem("driverId", data.userId);
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("driverId");
}

export function getDriverId() {
  return localStorage.getItem("driverId") || "";
}

// Backend API client for AuraControl.
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const API = `${BASE}/api`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type Command = {
  id: string;
  name: string;
  category: string;
  service_uuid?: string | null;
  characteristic_uuid?: string | null;
  write_type: "withResponse" | "withoutResponse";
  payload_hex: string;
  description?: string | null;
  device_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type EqBand = { freq: string; gain: number };

export type Profile = {
  id: string;
  name: string;
  type: string;
  bass: number;
  treble: number;
  bands: EqBand[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

export type LogEntry = {
  id: string;
  action: string;
  characteristic_uuid?: string | null;
  value_hex?: string | null;
  message?: string | null;
  created_at: string;
};

export type GattCharacteristic = {
  uuid: string;
  is_readable: boolean;
  is_writable: boolean;
  is_notifiable: boolean;
};

export type GattService = { uuid: string; characteristics: GattCharacteristic[] };

export type Device = {
  id: string;
  ble_id: string;
  name: string;
  rssi?: number | null;
  gatt: GattService[];
  last_connected?: string | null;
  created_at: string;
};

export type Macro = {
  id: string;
  name: string;
  steps: { command_id: string; delay_ms: number }[];
  created_at: string;
};

export const api = {
  // Commands
  getCommands: (category?: string) =>
    request<Command[]>(`/commands${category ? `?category=${category}` : ""}`),
  createCommand: (data: Partial<Command>) =>
    request<Command>("/commands", { method: "POST", body: JSON.stringify(data) }),
  updateCommand: (id: string, data: Partial<Command>) =>
    request<Command>(`/commands/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCommand: (id: string) =>
    request<{ success: boolean }>(`/commands/${id}`, { method: "DELETE" }),

  // Bindings
  getBindings: () => request<Record<string, string>>("/bindings"),
  setBinding: (controlKey: string, commandId: string) =>
    request(`/bindings/${controlKey}`, {
      method: "PUT",
      body: JSON.stringify({ command_id: commandId }),
    }),
  deleteBinding: (controlKey: string) =>
    request(`/bindings/${controlKey}`, { method: "DELETE" }),

  // Profiles
  getProfiles: () => request<Profile[]>("/profiles"),
  createProfile: (data: Partial<Profile>) =>
    request<Profile>("/profiles", { method: "POST", body: JSON.stringify(data) }),
  updateProfile: (id: string, data: Partial<Profile>) =>
    request<Profile>(`/profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  activateProfile: (id: string) =>
    request<Profile>(`/profiles/${id}/activate`, { method: "POST" }),
  deleteProfile: (id: string) =>
    request<{ success: boolean }>(`/profiles/${id}`, { method: "DELETE" }),

  // Devices
  getDevices: () => request<Device[]>("/devices"),
  upsertDevice: (data: Partial<Device>) =>
    request<Device>("/devices", { method: "POST", body: JSON.stringify(data) }),
  deleteDevice: (id: string) =>
    request<{ success: boolean }>(`/devices/${id}`, { method: "DELETE" }),

  // Logs
  getLogs: (limit = 200) => request<LogEntry[]>(`/logs?limit=${limit}`),
  createLog: (data: Partial<LogEntry>) =>
    request<LogEntry>("/logs", { method: "POST", body: JSON.stringify(data) }),
  clearLogs: () => request<{ success: boolean }>("/logs", { method: "DELETE" }),

  // Macros
  getMacros: () => request<Macro[]>("/macros"),
  createMacro: (data: Partial<Macro>) =>
    request<Macro>("/macros", { method: "POST", body: JSON.stringify(data) }),
  updateMacro: (id: string, data: Partial<Macro>) =>
    request<Macro>(`/macros/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMacro: (id: string) =>
    request<{ success: boolean }>(`/macros/${id}`, { method: "DELETE" }),
};

import { callApi } from "./features";

// Live API client with graceful fallbacks — the console works with or without the backend.

export interface Geo { ip: string; country: string; city: string; isp: string; flag: string; }
export interface Status { online: boolean; geo?: Geo; }
export interface Profile { name: string; preset: string; node: string; protocol: string; ddns: { provider: string; domain: string; token: string; lastIp: string; lastUpdate: string | null }; }
export interface Node { id: string; country: string; city: string; latency: number | null; protocols: string[]; }
export interface Tunnel { interface: string; pubkey: string; endpoint: string; handshake: string; rx: number; tx: number; }
export interface NetShield { running: boolean; blocked: number; queries: number; top: { domain: string; count: number }[]; }
export interface Prefs { dns: string[]; mtu: number; autoReconnect?: boolean; }

export async function fetchStatus(): Promise<Status | null> {
  try { return await callApi<Status>("/api/status"); } catch { return null; }
}
export async function fetchProfiles(): Promise<Profile[]> {
  try { return await callApi<Profile[]>("/api/profiles"); } catch { return []; }
}
export async function fetchNodes(): Promise<Node[]> {
  try { return await callApi<Node[]>("/api/nodes"); } catch { return []; }
}
export async function fetchTunnels(): Promise<Tunnel[]> {
  try { return await callApi<Tunnel[]>("/api/tunnels"); } catch { return []; }
}
export async function fetchNetShield(): Promise<NetShield | null> {
  try { return await callApi<NetShield>("/api/netshield"); } catch { return null; }
}
export async function fetchPrefs(): Promise<Prefs | null> {
  try { return await callApi<Prefs>("/api/prefs"); } catch { return null; }
}
export async function toggleKillSwitch(on: boolean): Promise<void> {
  try { await callApi("/api/killswitch", { method: "POST", body: JSON.stringify({ on }) }); } catch {}
}
export async function tunnelAction(action: "up" | "down"): Promise<void> {
  try { await callApi("/api/tunnels/" + action, { method: "POST", body: JSON.stringify({ interface: "wg0" }) }); } catch {}
}
export async function updateDdns(profile: string): Promise<{ ok: boolean; ip?: string; message?: string } | null> {
  try { return await callApi("/api/ddns/update", { method: "POST", body: JSON.stringify({ profile }) }); } catch { return null; }
}
export async function createProfile(name: string, preset: string, node: string, domain: string, provider: string, token: string): Promise<Profile | null> {
  try {
    return await callApi<Profile>("/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name, preset, node, ddns: { provider, domain, token } })
    });
  } catch { return null; }
}
export async function deleteProfile(name: string): Promise<boolean> {
  try { await callApi("/api/profiles/" + encodeURIComponent(name), { method: "DELETE" }); return true; } catch { return false; }
}
export async function savePrefs(prefs: Partial<Prefs>): Promise<Prefs | null> {
  try { return await callApi<Prefs>("/api/prefs", { method: "PUT", body: JSON.stringify(prefs) }); } catch { return null; }
}

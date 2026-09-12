import type { Camera, BOP, CameraZone } from '@/types/camera';
import type { IBVAPEvent, TimelineEntry } from '@/types/event';
import type { Alert, AlertStatus } from '@/types/alert';
import type { Evidence } from '@/types/evidence';
import type { WatchlistPerson, WatchlistVehicle } from '@/types/watchlist';
import type { SystemHealth, User } from '@/types/system';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ibvap_token') || localStorage.getItem('token') || '';
}

function getRefreshToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ibvap_refresh_token') || '';
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mergeHeaders(options: RequestInit, defaults: Record<string, string>) {
  return {
    ...defaults,
    ...getAuthHeaders(),
    ...Object.fromEntries(new Headers(options.headers).entries()),
  };
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) return false;

      localStorage.setItem('ibvap_token', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('ibvap_refresh_token', data.data.refreshToken);
      }
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: mergeHeaders(options, {}),
  });

  if (res.status === 401 && retry && await refreshAccessToken()) {
    return fetchWithAuth(endpoint, options, false);
  }

  return res;
}

async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...mergeHeaders(options, { 'Content-Type': 'application/json' }),
  };

  let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...getAuthHeaders(),
      },
    });
  }

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || `API request failed (${res.status})`);
  }

  return data.data as T;
}

function mapBackendUser(raw: Record<string, unknown>): User {
  const roleMap: Record<string, User['role']> = {
    SUPER_ADMIN: 'ADMIN',
    COMMANDER: 'COMMANDER',
    BOP_OPERATOR: 'OPERATOR',
    ANALYST: 'ANALYST',
    INVESTIGATOR: 'INVESTIGATOR',
    AUDITOR: 'AUDITOR',
  };
  return {
    id: String(raw.id),
    name: String(raw.name),
    email: String(raw.email),
    role: roleMap[String(raw.role)] || 'OPERATOR',
  };
}

function mapSystemHealth(raw: { services: Array<{ service: string; status: string; latency: number; lastChecked: string }>; overall: string }, cameras?: Camera[]): SystemHealth {
  const statusMap = (s: string): 'ONLINE' | 'DEGRADED' | 'OFFLINE' => {
    if (s === 'healthy') return 'ONLINE';
    if (s === 'degraded') return 'DEGRADED';
    return 'OFFLINE';
  };

  const camList = cameras || [];
  const online = camList.filter((c) => c.status === 'ONLINE').length;
  const offline = camList.filter((c) => c.status === 'OFFLINE').length;
  const warning = camList.filter((c) => c.status === 'DEGRADED').length;

  return {
    services: raw.services.map((s) => ({
      name: s.service,
      status: statusMap(s.status),
      latency: s.latency,
      lastCheck: s.lastChecked,
      uptime: s.status === 'healthy' ? 99.9 : s.status === 'degraded' ? 95.0 : 0,
    })),
    hardware: { cpu: 38, ram: 52, gpu: 64, storage: 41 },
    cameraSummary: {
      total: camList.length,
      online,
      offline,
      warning,
    },
    aiMetrics: {
      inferenceFps: 24.5,
      inferenceLatency: 42,
    },
    infrastructure: {
      eventProcessingRate: raw.overall === 'healthy' ? 128 : 64,
      apiResponseTime: raw.services[0]?.latency || 12,
    },
  };
}

// ─── Auth ────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Authentication failed');
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('ibvap_token', data.data.accessToken);
    localStorage.setItem('ibvap_refresh_token', data.data.refreshToken);
  }
  return data.data;
}

export async function verifyFace(descriptor: number[], token?: string) {
  const authToken = token || getToken();
  const res = await fetch(`${API_BASE}/auth/face-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ descriptor }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Face verification failed');
  }
  return data.data as { status: 'enrolled' | 'verified'; message: string; distance?: number };
}

export async function getCurrentUser(): Promise<User> {
  const raw = await fetchApi<Record<string, unknown>>('/auth/me');
  return mapBackendUser(raw);
}

// ─── Dashboard ───────────────────────────────────────────
export async function getDashboardStats() {
  const [cameras, alerts, events] = await Promise.all([
    getCameras(),
    getAlerts(),
    getEvents(),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const eventsToday = events.filter((e) => e.timestamp.startsWith(today)).length;

  return {
    totalCameras: cameras.length,
    onlineCameras: cameras.filter((c) => c.status === 'ONLINE').length,
    offlineCameras: cameras.filter((c) => c.status === 'OFFLINE').length,
    activeAlerts: alerts.filter((a) => a.status !== 'RESOLVED').length,
    criticalAlerts: alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length,
    eventsToday: eventsToday || events.length,
  };
}

// ─── Cameras ─────────────────────────────────────────────
export async function getCameras(): Promise<Camera[]> {
  return fetchApi<Camera[]>('/cameras');
}

export async function getCamera(id: string): Promise<Camera | undefined> {
  try {
    return await fetchApi<Camera>(`/cameras/${id}`);
  } catch {
    return undefined;
  }
}

export interface CameraRegistration {
  cameraCode: string;
  name: string;
  bopId: string;
  location: string;
  latitude: number;
  longitude: number;
  resolution: string;
  streamUrl: string;
  rtspUsername?: string;
  rtspPassword?: string;
}

export interface CameraControlResult {
  id: string;
  status: Camera['status'];
  aiStatus: Camera['aiStatus'];
  fps: number;
  lastSeen: string | null;
  message: string;
}

export async function addCamera(newCam: CameraRegistration): Promise<Camera> {
  return fetchApi<Camera>('/cameras', {
    method: 'POST',
    body: JSON.stringify({
      cameraCode: newCam.cameraCode,
      name: newCam.name,
      location: newCam.location,
      bopCode: newCam.bopId,
      latitude: newCam.latitude,
      longitude: newCam.longitude,
      resolution: newCam.resolution,
      streamUrl: newCam.streamUrl,
      rtspUsername: newCam.rtspUsername || undefined,
      rtspPassword: newCam.rtspPassword || undefined,
    }),
  });
}

export async function deleteCamera(id: string): Promise<boolean> {
  await fetchApi(`/cameras/${id}`, { method: 'DELETE' });
  return true;
}

export async function startCamera(id: string): Promise<CameraControlResult> {
  return fetchApi<CameraControlResult>(`/cameras/${id}/start`, { method: 'POST' });
}

export async function stopCamera(id: string): Promise<CameraControlResult> {
  return fetchApi<CameraControlResult>(`/cameras/${id}/stop`, { method: 'POST' });
}

export async function toggleCameraStatus(id: string): Promise<CameraControlResult | undefined> {
  const cam = await getCamera(id);
  if (!cam) return undefined;
  return cam.status === 'ONLINE' ? stopCamera(id) : startCamera(id);
}

export async function replaceCameraZones(id: string, zones: Omit<CameraZone, 'id'>[]) {
  return fetchApi<{ cameraId: string; zones: CameraZone[] }>(`/cameras/${id}/zones`, {
    method: 'PUT',
    body: JSON.stringify({ zones }),
  });
}

// ─── Events ──────────────────────────────────────────────
export async function getEvents(): Promise<IBVAPEvent[]> {
  return fetchApi<IBVAPEvent[]>('/events');
}

export async function getEvent(id: string): Promise<IBVAPEvent | undefined> {
  try {
    return await fetchApi<IBVAPEvent>(`/events/${id}`);
  } catch {
    return undefined;
  }
}

export async function getEventTimeline(_eventId: string): Promise<TimelineEntry[]> {
  return [];
}

// ─── Alerts ──────────────────────────────────────────────
export async function getAlerts(): Promise<Alert[]> {
  return fetchApi<Alert[]>('/alerts');
}

export async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<Alert | undefined> {
  const actionMap: Partial<Record<AlertStatus, string>> = {
    ACKNOWLEDGED: 'acknowledge',
    RESOLVED: 'resolve',
    ESCALATED: 'escalate',
  };
  const action = actionMap[status];
  if (!action) return undefined;

  const result = await fetchApi<{ alertId: string; status: AlertStatus }>(`/alerts/${alertId}/${action}`, {
    method: 'PATCH',
  });
  const alerts = await getAlerts();
  return alerts.find((a) => a.alertId === result.alertId);
}

// ─── Evidence ────────────────────────────────────────────
export async function getEvidence(): Promise<Evidence[]> {
  return fetchApi<Evidence[]>('/evidence');
}

export async function getEvidenceById(id: string): Promise<Evidence | undefined> {
  try {
    return await fetchApi<Evidence>(`/evidence/${id}`);
  } catch {
    return undefined;
  }
}

export async function verifyEvidence(id: string) {
  return fetchApi<{
    verified: boolean;
    currentHash: string;
    blockchainHash: string;
    timestamp: string;
    blockNumber: number;
    txId: string;
    recordedBy: string;
    recordedOrg: string;
  }>(`/evidence/${id}/verify`, { method: 'POST' });
}

// ─── Watchlist (backend routes exist; wire when ready) ─────
export async function getWatchlist(): Promise<{
  persons: WatchlistPerson[];
  vehicles: WatchlistVehicle[];
}> {
  try {
    const [persons, vehicles] = await Promise.all([
      fetchApi<WatchlistPerson[]>('/watchlist/persons'),
      fetchApi<WatchlistVehicle[]>('/watchlist/vehicles'),
    ]);
    return { persons, vehicles };
  } catch {
    return { persons: [], vehicles: [] };
  }
}

export async function addWatchlistPerson(person: Omit<WatchlistPerson, 'referenceId' | 'addedAt'>): Promise<WatchlistPerson> {
  return fetchApi<WatchlistPerson>('/watchlist/persons', {
    method: 'POST',
    body: JSON.stringify(person),
  });
}

export async function addWatchlistVehicle(vehicle: Omit<WatchlistVehicle, 'vehicleId' | 'addedAt'>): Promise<WatchlistVehicle> {
  return fetchApi<WatchlistVehicle>('/watchlist/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle),
  });
}

// ─── Analytics ───────────────────────────────────────────
export async function getAnalytics() {
  return fetchApi<{
    alertsByHour: Array<{ hour: string; count: number }>;
    eventsByDay: Array<{ date: string; persons: number; vehicles: number; intrusions: number; anpr: number }>;
    threatDistribution: Array<{ name: string; value: number; color: string }>;
    bopEvents: Array<{ name: string; events: number; alerts: number }>;
  }>('/analytics/overview');
}

// ─── System Health ───────────────────────────────────────
export async function getSystemHealth(): Promise<SystemHealth> {
  const [raw, cameras] = await Promise.all([
    fetchApi<{ services: Array<{ service: string; status: string; latency: number; lastChecked: string }>; overall: string }>('/system/health'),
    getCameras().catch(() => [] as Camera[]),
  ]);
  return mapSystemHealth(raw, cameras);
}

// ─── BOPs ────────────────────────────────────────────────
export async function getBOPs(): Promise<BOP[]> {
  return fetchApi<BOP[]>('/bops');
}

// ─── Global Search ───────────────────────────────────────
export async function globalSearch(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return { cameras: [], alerts: [], events: [], evidence: [], watchlist: [] };

  const [cameras, alerts, events, evidence, watchlist] = await Promise.all([
    getCameras(),
    getAlerts(),
    getEvents(),
    getEvidence(),
    getWatchlist(),
  ]);

  return {
    cameras: cameras.filter(
      (c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q),
    ),
    alerts: alerts.filter(
      (a) => a.alertId.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.bopId.toLowerCase().includes(q),
    ),
    events: events.filter(
      (e) => e.eventId.toLowerCase().includes(q) || e.eventType.toLowerCase().includes(q) || e.zone.toLowerCase().includes(q),
    ),
    evidence: evidence.filter(
      (ev) => ev.evidenceId.toLowerCase().includes(q) || ev.blockchainTxId.toLowerCase().includes(q) || ev.hash.toLowerCase().includes(q),
    ),
    watchlist: [
      ...watchlist.persons.filter((p) => p.name.toLowerCase().includes(q) || p.referenceId.toLowerCase().includes(q)),
      ...watchlist.vehicles.filter((v) => v.numberPlate.toLowerCase().includes(q) || v.vehicleId.toLowerCase().includes(q)),
    ],
  };
}

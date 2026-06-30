export type DepartmentAssignment = {
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  roleId: number;
  roleName: string;
  permissions: string[];
};

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  imageUrl: string | null;
  roleId: number;
  roleName: string;
  permissions: string[];
  isSuperAdmin: boolean;
  activeDepartmentId: number | null;
  departmentAssignments: DepartmentAssignment[];
};

export const AUTH_STORAGE_KEY = "university_auth";
export const TOKEN_KEY = "university_token";
export const ACTIVE_DEPARTMENT_KEY = "university_active_department";

/** Session expires after 1 hour without user activity */
export const SESSION_TTL_MS = 60 * 60 * 1000;

/** Minimum interval between persisting activity timestamps to localStorage */
const ACTIVITY_TOUCH_MIN_INTERVAL_MS = 30_000;

let lastActivityTouchWriteAt = 0;

export type StoredAuth = {
  user: AuthUser;
  token: string;
  /** @deprecated use lastActivityAt */
  loginAt?: number;
  lastActivityAt?: number;
};

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function getStoredActiveDepartmentId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ACTIVE_DEPARTMENT_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function setStoredActiveDepartmentId(departmentId: number | null): void {
  if (typeof window === "undefined") return;
  if (departmentId == null) {
    localStorage.removeItem(ACTIVE_DEPARTMENT_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_DEPARTMENT_KEY, String(departmentId));
}

export function getSessionLastActivityAt(stored: StoredAuth | null): number | null {
  if (!stored) return null;
  const ts = stored.lastActivityAt ?? stored.loginAt;
  return typeof ts === "number" && ts > 0 ? ts : null;
}

export function setStoredAuth(
  data: StoredAuth,
  options?: { preserveLastActivityAt?: boolean }
): void {
  if (typeof window === "undefined") return;
  const existing = options?.preserveLastActivityAt ? getStoredAuth() : null;
  const preserved = getSessionLastActivityAt(existing);
  const payload: StoredAuth = {
    ...data,
    lastActivityAt:
      options?.preserveLastActivityAt && preserved != null
        ? preserved
        : (data.lastActivityAt ?? Date.now()),
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  localStorage.setItem(TOKEN_KEY, data.token);
  if (data.user.activeDepartmentId != null) {
    setStoredActiveDepartmentId(data.user.activeDepartmentId);
  }
}

/** Record user activity so the inactivity timer resets (throttled writes). */
export function touchSessionActivity(force = false): void {
  if (typeof window === "undefined") return;
  const stored = getStoredAuth();
  if (!stored?.token) return;

  const now = Date.now();
  if (!force && now - lastActivityTouchWriteAt < ACTIVITY_TOUCH_MIN_INTERVAL_MS) {
    return;
  }

  lastActivityTouchWriteAt = now;
  const payload: StoredAuth = { ...stored, lastActivityAt: now };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function isSessionExpired(): boolean {
  const stored = getStoredAuth();
  const lastActivity = getSessionLastActivityAt(stored);
  if (!lastActivity) return false;
  return Date.now() - lastActivity > SESSION_TTL_MS;
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACTIVE_DEPARTMENT_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

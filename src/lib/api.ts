import {
  getStoredActiveDepartmentId,
  getStoredToken,
  touchSessionActivity,
} from "@/types/auth";

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();
  if (token) {
    touchSessionActivity();
  }
  const headers: HeadersInit = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const activeDepartmentId = getStoredActiveDepartmentId();
  if (activeDepartmentId) {
    (headers as Record<string, string>)["X-Department-Id"] = String(activeDepartmentId);
  }
  return fetch(url, { ...options, headers });
}

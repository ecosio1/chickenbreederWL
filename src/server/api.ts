import { getDevSession } from "./dev-session";

export interface ApiListResponse<T> {
  page: number;
  page_size: number;
  total: number;
  items: T[];
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const { userId, organizationId } = await getDevSession();
  const headers = new Headers(init?.headers);
  headers.set("x-user-id", userId);
  headers.set("x-organization-id", organizationId);

  return fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
}



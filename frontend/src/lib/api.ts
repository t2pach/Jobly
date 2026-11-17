const BASE = "/api";
const TOKEN_KEY = "jobly_token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type Detail = string | { msg: string; loc?: (string | number)[] }[] | undefined;

function errorMessage(status: number, detail: Detail): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const field = d.loc?.filter((x) => x !== "body").join(".");
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join("; ");
  }
  if (status === 429) return "Слишком много запросов, попробуйте через минуту";
  if (status >= 500) return "Сервер временно недоступен";
  return `Ошибка ${status}`;
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, "Нет связи с сервером");
  }
  if (res.status === 401 && token) {
    tokenStore.clear();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
    }
  }
  if (!res.ok) {
    let detail: Detail;
    try {
      detail = (await res.json()).detail;
    } catch {}
    throw new ApiError(res.status, errorMessage(res.status, detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function qs(params: Record<string, string | number | null | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
}

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

// Função auxiliar robusta para buscar o token em qualquer lugar (localStorage ou Cookie)
const getToken = () => {
  if (typeof window === "undefined") return null;

  // 1. Tenta buscar do localStorage
  const localToken = localStorage.getItem("@ClinicOS:token");
  if (localToken) return localToken;

  // 2. Tenta buscar dos Cookies do navegador
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];

  return null;
};

const request = async <T>(path: string, options: RequestOptions = {}) => {
  const headers = new Headers(options.headers);
  headers.set(
    "Content-Type",
    headers.get("Content-Type") || "application/json",
  );

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = (await response.json().catch(() => undefined)) as T;
  if (!response.ok) throw data ?? new Error(response.statusText);
  return { data, status: response.status, headers: response.headers };
};

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) => request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

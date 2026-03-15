const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedApiBaseUrl}${normalizedPath}`;
}
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedApiBaseUrl}${normalizedPath}`;
}

/**
 * Fetch wrapper that auto-retries once on 401 by refreshing the session.
 * If refresh fails, redirects to /login?expired=true.
 */
let _refreshing = null;

export async function fetchWithAuth(path, options = {}) {
  const url = path.startsWith("http") ? path : apiUrl(path);
  const opts = { credentials: "include", ...options };

  let response = await fetch(url, opts);

  if (response.status === 401) {
    // Deduplicate concurrent refresh attempts
    if (!_refreshing) {
      _refreshing = fetch(apiUrl("/api/v1/auth/refresh"), {
        method: "POST",
        credentials: "include",
      })
        .then((r) => r.ok)
        .catch(() => false)
        .finally(() => {
          _refreshing = null;
        });
    }

    const refreshed = await _refreshing;
    if (refreshed) {
      response = await fetch(url, opts);
    } else {
      window.location.href = "/login?expired=true";
      return response;
    }
  }

  return response;
}

/**
 * Extract a user-friendly error message from a failed API response.
 * Includes X-Request-ID when available (useful for 500 errors).
 */
export async function formatApiError(response, fallback = "Ocurrió un error inesperado") {
  const requestId = response.headers?.get("X-Request-ID");
  let message = fallback;

  try {
    const data = await response.json();
    message = data?.detail || fallback;
  } catch {
    // non-JSON response
  }

  if (response.status >= 500 && requestId) {
    message += ` (ref: ${requestId.slice(0, 8)})`;
  }

  return message;
}

export async function downloadCsvExport({ dataset, scope = "all", filters = {} }) {
  const params = new URLSearchParams({ scope });
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") return;
    params.set(key, String(value));
  });

  const response = await fetch(apiUrl(`/api/v1/export/${dataset}.csv?${params.toString()}`), {
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = "No se pudo exportar el CSV";
    try {
      const data = await response.json();
      errorMessage = data?.detail || errorMessage;
    } catch {
      // No-op: mantiene mensaje genérico si el backend no responde JSON.
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const encodedNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  const fileName = encodedNameMatch?.[1]
    ? decodeURIComponent(encodedNameMatch[1])
    : (plainNameMatch?.[1] || `${dataset}-${scope}.csv`);

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return fileName;
}
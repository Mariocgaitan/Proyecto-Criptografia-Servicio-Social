const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedApiBaseUrl}${normalizedPath}`;
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
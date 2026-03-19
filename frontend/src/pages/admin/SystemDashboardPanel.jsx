import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";

import { apiUrl } from "@/lib/api";

const CHART_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#f97316"];

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{helper}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <h3 className="mb-3 text-sm font-semibold text-white/90">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

function formatUptime(seconds) {
  const s = Number(seconds || 0);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function SystemDashboardPanel() {
  const [windowMinutes, setWindowMinutes] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [latency, setLatency] = useState(null);
  const [logins, setLogins] = useState({ totales: null, series: [] });

  const windowQuery = useMemo(
    () => new URLSearchParams({ ventana_minutos: windowMinutes }).toString(),
    [windowMinutes]
  );

  const fetchSystemMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = (path) => apiUrl(`${path}?${windowQuery}`);

      const [summaryRes, rpmRes, statusRes, latencyRes, loginsRes] = await Promise.all([
        fetch(endpoint("/api/v1/admin/sistema/resumen"), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/sistema/requests-por-minuto"), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/sistema/status-distribucion"), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/sistema/latencia"), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/sistema/logins"), { credentials: "include" }),
      ]);

      if (!summaryRes.ok || !rpmRes.ok || !statusRes.ok || !latencyRes.ok || !loginsRes.ok) {
        throw new Error("No se pudieron cargar las métricas del sistema.");
      }

      const [summaryData, rpmData, statusData, latencyData, loginsData] = await Promise.all([
        summaryRes.json(),
        rpmRes.json(),
        statusRes.json(),
        latencyRes.json(),
        loginsRes.json(),
      ]);

      setSummary(summaryData || null);
      setRequests(rpmData?.series || []);
      setStatusDist(statusData?.items || []);
      setLatency(latencyData || null);
      setLogins(loginsData || { totales: null, series: [] });
    } catch (err) {
      setError(err.message || "Error cargando métricas del sistema.");
    } finally {
      setLoading(false);
    }
  }, [windowQuery]);

  useEffect(() => {
    fetchSystemMetrics();
  }, [fetchSystemMetrics]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Dashboard del Sistema (refresco manual)</h3>
          <div className="flex items-center gap-2">
            <select
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white"
            >
              <option value="15" className="bg-slate-900 text-white">Ventana 15m</option>
              <option value="60" className="bg-slate-900 text-white">Ventana 1h</option>
              <option value="240" className="bg-slate-900 text-white">Ventana 4h</option>
              <option value="1440" className="bg-slate-900 text-white">Ventana 24h</option>
            </select>
            <button
              onClick={fetchSystemMetrics}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Estado operativo"
          value={summary?.estado || "-"}
          helper={`Uptime: ${formatUptime(summary?.uptime_seconds)}`}
        />
        <KpiCard
          label="Requests"
          value={summary?.requests_total ?? 0}
          helper={`Ventana ${summary?.window_minutes || Number(windowMinutes)} minutos`}
        />
        <KpiCard
          label="Error rate 5xx"
          value={`${Number(summary?.error_rate_5xx || 0).toFixed(2)}%`}
          helper={`${summary?.errores_5xx ?? 0} errores 5xx`}
        />
        <KpiCard
          label="Latencia P95"
          value={`${Number(latency?.p95_ms || 0).toFixed(1)} ms`}
          helper={`Avg ${Number(latency?.avg_ms || 0).toFixed(1)} ms`}
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-8 text-center text-white/70">Cargando métricas del sistema...</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard title="Requests por minuto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={requests}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="minute" hide />
                <YAxis stroke="#cbd5e1" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="requests" name="Requests" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución por status code">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDist} dataKey="cantidad" nameKey="status_code" outerRadius={100} label>
                  {statusDist.map((_, idx) => (
                    <Cell key={`status-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Latencia agregada (ms)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Min", valor: Number(latency?.min_ms || 0) },
                  { name: "Avg", valor: Number(latency?.avg_ms || 0) },
                  { name: "P95", valor: Number(latency?.p95_ms || 0) },
                  { name: "Max", valor: Number(latency?.max_ms || 0) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} />
                <YAxis stroke="#cbd5e1" fontSize={11} />
                <Tooltip />
                <Bar dataKey="valor" fill="#22c55e" name="Latencia ms" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Actividad de logins (exitosos/fallidos)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={logins?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="minute" hide />
                <YAxis stroke="#cbd5e1" fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="logins_exitosos" stroke="#22c55e" name="Exitosos" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="logins_fallidos" stroke="#ef4444" name="Fallidos" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/70">
              <div>Exitosos: <span className="font-semibold text-white">{logins?.totales?.logins_exitosos ?? 0}</span></div>
              <div>Fallidos: <span className="font-semibold text-white">{logins?.totales?.logins_fallidos ?? 0}</span></div>
            </div>
          </ChartCard>
        </div>
      )}

      {!loading && !requests.length && !statusDist.length ? (
        <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-8 text-center text-white/70">
          Aun no hay datos de observabilidad. Genera trafico y presiona refrescar.
        </div>
      ) : null}
    </div>
  );
}

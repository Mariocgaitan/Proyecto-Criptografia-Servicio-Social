import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Database, Zap, AlertCircle, Clock, Activity, Server, CheckCircle, XCircle } from "lucide-react";

import { apiUrl } from "@/lib/api";

function StatusIndicator({ status, text }) {
  const isOk = status === "ok" || status === true;
  return (
    <div className="flex items-center gap-2">
      {isOk ? (
        <CheckCircle className="h-4 w-4 text-green-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
      <span className={`text-sm ${isOk ? "text-green-300" : "text-red-300"}`}>{text}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtitle, colorClass = "text-sky-400" }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
          <p className={`mt-1 text-3xl font-light ${colorClass}`}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-white/50">{subtitle}</p>}
        </div>
        {Icon && <Icon className={`h-8 w-8 opacity-30 ${colorClass}`} />}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, actions }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-white/70" />}
          <h3 className="text-base font-normal text-white">{title}</h3>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function formatUptime(seconds) {
  const s = Number(seconds || 0);
  if (s === 0) return "0s";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function SystemDashboardPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeView, setActiveView] = useState("resumen");

  // Health check
  const [health, setHealth] = useState(null);
  
  // Summary metrics
  const [summary, setSummary] = useState(null);
  
  // Cache stats
  const [cacheStats, setCacheStats] = useState(null);

  // Status code distribution (2xx/4xx/5xx)
  const [statusDist, setStatusDist] = useState([]);

  // Login metrics
  const [loginStats, setLoginStats] = useState({ totales: { logins_exitosos: 0, logins_fallidos: 0, success_rate: 0 } });

  // Requests per minute series
  const [rpmSeries, setRpmSeries] = useState([]);
  
  // Recent requests (últimos 50 para debugging)
  const [recentRequests, setRecentRequests] = useState([]);
  
  // Audit logs (errores y warnings)
  const [errorLogs, setErrorLogs] = useState([]);
  const [loginEvents, setLoginEvents] = useState([]);
  const [loginPage, setLoginPage] = useState(1);
  const [loginTotalPages, setLoginTotalPages] = useState(1);
  const [loadingLogins, setLoadingLogins] = useState(false);

  const fetchLoginEvents = useCallback(async (page = 1) => {
    setLoadingLogins(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/sistema/login-eventos?page=${page}&page_size=30`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudieron cargar los eventos de login.");
      const data = await res.json();
      setLoginEvents(Array.isArray(data?.data) ? data.data : []);
      setLoginPage(Number(data?.page || page));
      setLoginTotalPages(Number(data?.pages || 1));
    } catch (err) {
      console.error("Login events fetch failed:", err);
      setLoginEvents([]);
    } finally {
      setLoadingLogins(false);
    }
  }, []);

  const fetchAllMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      // Health check (público, sin auth)
      try {
        const healthRes = await fetch(apiUrl("/api/v1/health"));
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }
      } catch (err) {
        console.error("Health check failed:", err);
        setHealth({ status: "down", db: false, redis: false });
      }

      // Summary metrics
      try {
        const summaryRes = await fetch(apiUrl("/api/v1/admin/sistema/resumen?ventana_minutos=60"), { 
          credentials: "include" 
        });
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData);
        }
      } catch (err) {
        console.error("Summary fetch failed:", err);
      }

      // Cache stats
      try {
        const cacheRes = await fetch(apiUrl("/api/v1/admin/sistema/cache-stats"), { 
          credentials: "include" 
        });
        if (cacheRes.ok) {
          const cacheData = await cacheRes.json();
          setCacheStats(cacheData);
        } else {
          console.warn("Cache stats endpoint returned:", cacheRes.status);
        }
      } catch (err) {
        console.error("Cache stats fetch failed:", err);
      }

      // Distribucion de status codes (para acumulado 404/4xx/5xx)
      try {
        const statusRes = await fetch(apiUrl("/api/v1/admin/sistema/status-distribucion?ventana_minutos=60"), {
          credentials: "include",
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatusDist(Array.isArray(statusData?.items) ? statusData.items : []);
        }
      } catch (err) {
        console.error("Status distribution fetch failed:", err);
      }

      // Actividad de logins
      try {
        const loginsRes = await fetch(apiUrl("/api/v1/admin/sistema/logins?ventana_minutos=60"), {
          credentials: "include",
        });
        if (loginsRes.ok) {
          const loginsData = await loginsRes.json();
          setLoginStats(loginsData || { totales: { logins_exitosos: 0, logins_fallidos: 0, success_rate: 0 } });
        }
      } catch (err) {
        console.error("Login metrics fetch failed:", err);
      }

      // Throughput por minuto (para picos)
      try {
        const rpmRes = await fetch(apiUrl("/api/v1/admin/sistema/requests-por-minuto?ventana_minutos=60"), {
          credentials: "include",
        });
        if (rpmRes.ok) {
          const rpmData = await rpmRes.json();
          setRpmSeries(Array.isArray(rpmData?.series) ? rpmData.series : []);
        }
      } catch (err) {
        console.error("RPM series fetch failed:", err);
      }

      // Audit logs (errores)
      try {
        const logsRes = await fetch(apiUrl("/api/v1/admin/estadisticas/logs-recientes?page_size=100"), { 
          credentials: "include" 
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const logs = Array.isArray(logsData) ? logsData : logsData?.data || logsData?.logs || [];
          // Filtrar solo errores y eventos importantes
          const errorTypes = logs.filter(log => 
            log.tipo_evento?.toLowerCase().includes("error") || 
            log.tipo_evento?.toLowerCase().includes("fallo") ||
            log.tipo_evento?.toLowerCase().includes("bloqueado")
          );
          setErrorLogs(errorTypes.slice(0, 20));
        }
      } catch (err) {
        console.error("Logs fetch failed:", err);
      }

    } catch (err) {
      setError(err.message || "Error cargando métricas del sistema.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  useEffect(() => {
    if (activeView === "logins") {
      fetchLoginEvents(1);
    }
  }, [activeView, fetchLoginEvents]);

  // Auto-refresh cada 30 segundos si está activado
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAllMetrics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllMetrics]);

  const errorRate = Number(summary?.error_rate_5xx || 0);
  const errorClass = errorRate > 5 ? "text-red-400" : errorRate > 1 ? "text-yellow-400" : "text-green-400";

  const statusAgg = statusDist.reduce(
    (acc, item) => {
      const code = Number(item?.status_code || 0);
      const count = Number(item?.cantidad || 0);
      if (code >= 200 && code < 300) acc.ok2xx += count;
      if (code >= 400 && code < 500) acc.err4xx += count;
      if (code >= 500 && code < 600) acc.err5xx += count;
      if (code === 404) acc.err404 += count;
      return acc;
    },
    { ok2xx: 0, err4xx: 0, err5xx: 0, err404: 0 }
  );

  const peakRpm = rpmSeries.length
    ? Math.max(...rpmSeries.map((item) => Number(item?.requests || 0)))
    : 0;

  const loginOk = Number(loginStats?.totales?.logins_exitosos || 0);
  const loginFail = Number(loginStats?.totales?.logins_fallidos || 0);
  const loginTotal = loginOk + loginFail;
  const loginFailRate = loginTotal ? ((loginFail / loginTotal) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-5">
      {/* Header */}
      <SectionCard 
        title="Panel Técnico del Sistema" 
        icon={Server}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 p-1">
              <button
                onClick={() => setActiveView("resumen")}
                className={`rounded-md px-2 py-1 text-xs ${activeView === "resumen" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"}`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveView("logins")}
                className={`rounded-md px-2 py-1 text-xs ${activeView === "logins" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"}`}
              >
                Logins
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-white/20"
              />
              Auto-refresh 30s
            </label>
            <button
              onClick={fetchAllMetrics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
          </div>
        }
      >
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        
        {health && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusIndicator status={health.status} text={`Sistema ${health.status === "ok" ? "operativo" : health.status}`} />
            <StatusIndicator status={health.db} text={`PostgreSQL ${health.db ? "conectado" : "desconectado"}`} />
            <StatusIndicator status={health.redis} text={`Redis ${health.redis ? "conectado" : "desconectado"}`} />
          </div>
        )}
      </SectionCard>

      {activeView === "logins" && (
        <SectionCard title="Eventos de Login" icon={Activity}>
          {loadingLogins ? (
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/70">
              Cargando eventos de login...
            </div>
          ) : loginEvents.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/70">
              No hay eventos de login para mostrar.
            </div>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/65">
                    <tr>
                      <th className="px-3 py-2 font-normal">Hora</th>
                      <th className="px-3 py-2 font-normal">Correo</th>
                      <th className="px-3 py-2 font-normal">Estatus</th>
                      <th className="px-3 py-2 font-normal">Metodo</th>
                      <th className="px-3 py-2 font-normal">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginEvents.map((item) => (
                      <tr key={item.id_log} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-3 py-2 text-white/75">
                          {item.hora
                            ? new Date(item.hora).toLocaleString("es-MX", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-white/80">{item.correo || "-"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] ${
                              item.estatus === "EXITO"
                                ? "border-green-400/30 bg-green-500/15 text-green-100"
                                : "border-red-400/30 bg-red-500/15 text-red-100"
                            }`}
                          >
                            {item.estatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/75">{item.metodo || "-"}</td>
                        <td className="px-3 py-2 font-mono text-white/75">{item.ip_origen || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => fetchLoginEvents(Math.max(1, loginPage - 1))}
                  disabled={loginPage <= 1 || loadingLogins}
                  className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-white/70">Pagina {loginPage} de {loginTotalPages}</span>
                <button
                  onClick={() => fetchLoginEvents(Math.min(loginTotalPages, loginPage + 1))}
                  disabled={loginPage >= loginTotalPages || loadingLogins}
                  className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {activeView === "resumen" && (
      <>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="Requests (última hora)"
          value={summary?.requests_total?.toLocaleString() || "0"}
          subtitle={`${((summary?.requests_total || 0) / 60).toFixed(1)} req/min promedio`}
          colorClass="text-sky-400"
        />
        <MetricCard
          icon={AlertCircle}
          label="Error rate 5xx"
          value={`${errorRate.toFixed(2)}%`}
          subtitle={`${summary?.errores_5xx || 0} errores del servidor`}
          colorClass={errorClass}
        />
        <MetricCard
          icon={Clock}
          label="Latencia P95"
          value={`${Number(summary?.latencia_p95_ms || 0).toFixed(0)} ms`}
          subtitle={`Avg: ${Number(summary?.latencia_avg_ms || 0).toFixed(0)} ms`}
          colorClass="text-green-400"
        />
        <MetricCard
          icon={Zap}
          label="Uptime"
          value={formatUptime(summary?.uptime_seconds)}
          subtitle={`Versión ${health?.version || "N/A"}`}
          colorClass="text-purple-400"
        />
      </div>

      <SectionCard title="Métricas de Prueba de Estrés (Ventana 60m)" icon={Activity}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Clock}
            label="Pico de Throughput"
            value={`${peakRpm} req/min`}
            subtitle="Máximo observado por minuto"
            colorClass="text-cyan-400"
          />
          <MetricCard
            icon={AlertCircle}
            label="Acumulado 404"
            value={statusAgg.err404.toLocaleString()}
            subtitle="Not Found en la última hora"
            colorClass={statusAgg.err404 > 0 ? "text-amber-400" : "text-green-400"}
          />
          <MetricCard
            icon={AlertCircle}
            label="Acumulado 4xx"
            value={statusAgg.err4xx.toLocaleString()}
            subtitle="Errores cliente (incluye 404)"
            colorClass={statusAgg.err4xx > 0 ? "text-amber-400" : "text-green-400"}
          />
          <MetricCard
            icon={AlertCircle}
            label="Acumulado 5xx"
            value={statusAgg.err5xx.toLocaleString()}
            subtitle="Errores servidor"
            colorClass={statusAgg.err5xx > 0 ? "text-red-400" : "text-green-400"}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <h4 className="text-xs uppercase tracking-wider text-white/60">Salud HTTP</h4>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-white/60">2xx</p>
                <p className="mt-1 text-xl text-green-300">{statusAgg.ok2xx.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-white/60">4xx</p>
                <p className="mt-1 text-xl text-amber-300">{statusAgg.err4xx.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-white/60">5xx</p>
                <p className="mt-1 text-xl text-red-300">{statusAgg.err5xx.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-white/60">404</p>
                <p className="mt-1 text-xl text-amber-200">{statusAgg.err404.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <h4 className="text-xs uppercase tracking-wider text-white/60">Autenticación</h4>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-white/60">Logins Exitosos</p>
                <p className="mt-1 text-xl text-green-300">{loginOk.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-white/60">Logins Fallidos</p>
                <p className="mt-1 text-xl text-red-300">{loginFail.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3 col-span-2">
                <p className="text-white/60">Failure Rate</p>
                <p className="mt-1 text-xl text-amber-200">{loginFailRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Cache Stats */}
      {cacheStats && (
        <SectionCard title="Estadísticas de Cache (Redis)" icon={Database}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-white/60">Total Requests</p>
              <p className="mt-1 text-2xl font-light text-white">{cacheStats.total_requests?.toLocaleString() || "0"}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Cache Hits</p>
              <p className="mt-1 text-2xl font-light text-green-400">{cacheStats.hits?.toLocaleString() || "0"}</p>
              <p className="text-xs text-white/50">{cacheStats.hit_rate || "0%"} hit rate</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Cache Misses</p>
              <p className="mt-1 text-2xl font-light text-amber-400">{cacheStats.misses?.toLocaleString() || "0"}</p>
              <p className="text-xs text-white/50">{cacheStats.miss_rate || "0%"} miss rate</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Tiempo ahorrado</p>
              <p className="mt-1 text-2xl font-light text-sky-400">{cacheStats.time_saved || "0s"}</p>
              <p className="text-xs text-white/50">por cache hits</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Errores y alertas recientes */}
      {errorLogs.length > 0 && (
        <SectionCard title="Errores y Alertas Recientes" icon={AlertCircle}>
          <div className="overflow-auto rounded-lg border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/5 text-white/65">
                <tr>
                  <th className="px-3 py-2 font-normal">Timestamp</th>
                  <th className="px-3 py-2 font-normal">Tipo de Evento</th>
                  <th className="px-3 py-2 font-normal">Usuario</th>
                  <th className="px-3 py-2 font-normal">IP Origen</th>
                </tr>
              </thead>
              <tbody>
                {errorLogs.map((log) => (
                  <tr key={log.id_log} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-3 py-2 text-white/75">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("es-MX", { 
                        month: "short", 
                        day: "numeric", 
                        hour: "2-digit", 
                        minute: "2-digit", 
                        second: "2-digit" 
                      }) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-100">
                        {log.tipo_evento || "N/A"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-white/75">{log.id_matricula || "-"}</td>
                    <td className="px-3 py-2 font-mono text-white/75">{log.ip_origen || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Info adicional */}
      <SectionCard title="Información Técnica">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-normal uppercase tracking-wider text-white/60">Endpoints más usados</h4>
            <div className="space-y-1 text-sm text-white/80">
              <p>• <code className="rounded bg-white/10 px-1 text-xs">/api/v1/auth/login</code></p>
              <p>• <code className="rounded bg-white/10 px-1 text-xs">/api/v1/admin/proyectos</code></p>
              <p>• <code className="rounded bg-white/10 px-1 text-xs">/api/v1/alumno/inscripciones</code></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-normal uppercase tracking-wider text-white/60">Configuración</h4>
            <div className="space-y-1 text-sm text-white/80">
              <p>• Entorno: <span className="text-white">Production</span></p>
              <p>• Rate limit: <span className="text-white">100 req/min</span></p>
              <p>• JWT expiry: <span className="text-white">15 min</span></p>
            </div>
          </div>
        </div>
      </SectionCard>
      </>
      )}
    </div>
  );
}

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

const CHART_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{helper}</p>
    </div>
  );
}

function ChartCard({ title, children, className = "", headerRight = null }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-black/35 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        {headerRight}
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-8 text-center text-white/70">
      <p className="text-sm font-semibold text-white/85">{title}</p>
      <p className="mt-1 text-xs text-white/55">{description}</p>
    </div>
  );
}

function fmtPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatTimelineLabel(timestamp, timelineRange) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "-";

  if (timelineRange === "1h" || timelineRange === "24h") {
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString("es-MX", { month: "2-digit", day: "2-digit" });
}

export default function EstadisticasPanel({ eventos = [], empresas = [] }) {
  const [subTab, setSubTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    eventoId: "",
    empresaId: "",
    proyectoId: "",
    carrera: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [timelineRange, setTimelineRange] = useState("24h");

  const [generalData, setGeneralData] = useState(null);
  const [particularData, setParticularData] = useState(null);
  const [timelineGeneralData, setTimelineGeneralData] = useState([]);
  const [timelineParticularData, setTimelineParticularData] = useState([]);

  const generalQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    return params.toString();
  }, [filters.eventoId, filters.fechaInicio, filters.fechaFin]);

  const particularQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.empresaId) params.set("empresa_id", filters.empresaId);
    if (filters.proyectoId) params.set("proyecto_id", filters.proyectoId);
    if (filters.carrera) params.set("carrera", filters.carrera);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    return params.toString();
  }, [filters]);

  const endpoint = useCallback((path, query) => apiUrl(`${path}${query ? `?${query}` : ""}`), []);

  const fetchGeneral = useCallback(async () => {
    const res = await fetch(endpoint("/api/v1/admin/estadisticas/general", generalQuery), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la vista general de estadísticas.");
    const data = await res.json();
    setGeneralData(data || null);
  }, [endpoint, generalQuery]);

  const fetchParticular = useCallback(async () => {
    const res = await fetch(endpoint("/api/v1/admin/estadisticas/particular", particularQuery), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la vista particular de estadísticas.");
    const data = await res.json();
    setParticularData(data || null);
  }, [endpoint, particularQuery]);

  const fetchActiveView = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (subTab === "general") {
        await fetchGeneral();
      } else {
        await fetchParticular();
      }
    } catch (err) {
      setError(err.message || "Error cargando estadísticas.");
    } finally {
      setLoading(false);
    }
  }, [fetchGeneral, fetchParticular, subTab]);

  useEffect(() => {
    fetchActiveView();
  }, [fetchActiveView]);

  const fetchTimelineGeneral = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.carrera) params.set("carrera", filters.carrera);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    params.set("ventana", timelineRange);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/inscripciones-timeline", params.toString()), {
      credentials: "include",
    });
    if (!res.ok) throw new Error("No se pudo cargar el timeline de inscripciones.");
    const data = await res.json();
    setTimelineGeneralData(Array.isArray(data) ? data : []);
  }, [endpoint, filters.eventoId, filters.carrera, filters.fechaInicio, filters.fechaFin, timelineRange]);

  const fetchTimelineParticular = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.empresaId) params.set("empresa_id", filters.empresaId);
    if (filters.proyectoId) params.set("proyecto_id", filters.proyectoId);
    if (filters.carrera) params.set("carrera", filters.carrera);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    params.set("ventana", timelineRange);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/inscripciones-timeline", params.toString()), {
      credentials: "include",
    });
    if (!res.ok) throw new Error("No se pudo cargar el timeline de inscripciones.");
    const data = await res.json();
    setTimelineParticularData(Array.isArray(data) ? data : []);
  }, [endpoint, filters.eventoId, filters.empresaId, filters.proyectoId, filters.carrera, filters.fechaInicio, filters.fechaFin, timelineRange]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        if (subTab === "general") {
          await fetchTimelineGeneral();
          return;
        }
        await fetchTimelineParticular();
      } catch {
        if (isMounted) {
          if (subTab === "general") setTimelineGeneralData([]);
          else setTimelineParticularData([]);
        }
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [subTab, fetchTimelineGeneral, fetchTimelineParticular]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveView();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveView]);

  const proyectosParticular = particularData?.series?.proyectos_cupo || [];
  const proyectosByEmpresa = useMemo(
    () => proyectosParticular.filter((item) => String(item.id_empresa) === String(filters.empresaId)),
    [proyectosParticular, filters.empresaId]
  );

  useEffect(() => {
    if (!filters.empresaId) {
      if (filters.proyectoId) {
        setFilters((prev) => ({ ...prev, proyectoId: "" }));
      }
      return;
    }

    const exists = proyectosByEmpresa.some((item) => String(item.id_proyecto) === String(filters.proyectoId));
    if (!exists && filters.proyectoId) {
      setFilters((prev) => ({ ...prev, proyectoId: "" }));
    }
  }, [filters.empresaId, filters.proyectoId, proyectosByEmpresa]);

  const carrerasGeneral = useMemo(() => {
    const rows = generalData?.series?.alumnos_por_carrera || [];
    return rows.map((item) => item.carrera).filter(Boolean);
  }, [generalData]);

  const carrerasParticular = useMemo(() => {
    const series = particularData?.series?.ratio_inscritos || [];
    if (!series.length) return carrerasGeneral;
    return carrerasGeneral;
  }, [particularData, carrerasGeneral]);

  const timelineGeneral = useMemo(
    () =>
      (timelineGeneralData || []).map((item) => ({
        ...item,
        label: formatTimelineLabel(item.timestamp, timelineRange),
      })),
    [timelineGeneralData, timelineRange]
  );

  const timelineParticular = useMemo(
    () =>
      (timelineParticularData || []).map((item) => ({
        ...item,
        label: formatTimelineLabel(item.timestamp, timelineRange),
      })),
    [timelineParticularData, timelineRange]
  );

  const generalKpis = generalData?.kpis || {};
  const particularSummary = particularData?.resumen || {};

  const isGeneralEmpty = !loading && !error && !Object.keys(generalKpis).length;
  const isParticularEmpty = !loading && !error && !Object.keys(particularSummary).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1">
            <button
              onClick={() => setSubTab("general")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${subTab === "general" ? "bg-blue-500/25 text-white" : "text-white/70 hover:text-white"}`}
            >
              General
            </button>
            <button
              onClick={() => setSubTab("particular")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${subTab === "particular" ? "bg-blue-500/25 text-white" : "text-white/70 hover:text-white"}`}
            >
              Particular
            </button>
          </div>

          <button
            onClick={fetchActiveView}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <select
            value={filters.eventoId}
            onChange={(e) => setFilters((prev) => ({ ...prev, eventoId: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="" className="bg-slate-900 text-white">Todos los eventos</option>
            {eventos.map((ev) => (
              <option key={ev.id_evento} value={ev.id_evento} className="bg-slate-900 text-white">
                {ev.nombre} ({ev.anio})
              </option>
            ))}
          </select>

          <select
            value={filters.empresaId}
            onChange={(e) => setFilters((prev) => ({ ...prev, empresaId: e.target.value, proyectoId: "" }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
            disabled={subTab !== "particular"}
          >
            <option value="" className="bg-slate-900 text-white">Todas las empresas</option>
            {empresas.map((em) => (
              <option key={em.id_empresa} value={em.id_empresa} className="bg-slate-900 text-white">
                {em.nombre_empresa}
              </option>
            ))}
          </select>

          <select
            value={filters.proyectoId}
            onChange={(e) => setFilters((prev) => ({ ...prev, proyectoId: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
            disabled={subTab !== "particular" || !filters.empresaId}
          >
            <option value="" className="bg-slate-900 text-white">Todos los proyectos</option>
            {proyectosByEmpresa.map((item) => (
              <option key={item.id_proyecto} value={item.id_proyecto} className="bg-slate-900 text-white">
                {item.proyecto}
              </option>
            ))}
          </select>

          <select
            value={filters.carrera}
            onChange={(e) => setFilters((prev) => ({ ...prev, carrera: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="" className="bg-slate-900 text-white">Todas las carreras</option>
            {(subTab === "general" ? carrerasGeneral : carrerasParticular).map((name) => (
              <option key={name} value={name} className="bg-slate-900 text-white">
                {name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.fechaInicio}
            onChange={(e) => setFilters((prev) => ({ ...prev, fechaInicio: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          />

          <input
            type="date"
            value={filters.fechaFin}
            onChange={(e) => setFilters((prev) => ({ ...prev, fechaFin: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          />

        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      {subTab === "general" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Alumnos Registrados" value={generalKpis.total_alumnos_registrados ?? 0} helper="Evento y ventana seleccionada" />
            <KpiCard label="Inscritos" value={generalKpis.total_inscritos ?? 0} helper="Total confirmado" />
            <KpiCard label="Ocupación Promedio" value={fmtPct(generalKpis.ocupacion_promedio ?? 0)} helper="Capacidad global" />
            <KpiCard label="Lista de Espera" value={generalKpis.en_lista_espera ?? 0} helper="Pendientes por asignar" />
            <KpiCard label="Empresas" value={generalKpis.empresas_participantes ?? 0} helper="Con proyectos activos" />
          </div>

          {loading ? (
            <EmptyState title="Cargando vista General" description="Estamos consultando los indicadores agregados de negocio." />
          ) : isGeneralEmpty ? (
            <EmptyState title="Sin datos en vista General" description="Ajusta filtros o registra actividad de negocio para visualizar métricas." />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ChartCard title="Ocupación por Evento">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={generalData?.series?.ocupacion_eventos || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="evento" stroke="#cbd5e1" fontSize={11} />
                    <YAxis stroke="#cbd5e1" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="inscritos" fill="#0ea5e9" name="Inscritos" />
                    <Bar dataKey="capacidad" fill="#22c55e" name="Capacidad" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Distribución de Alumnos por Carrera">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={generalData?.series?.alumnos_por_carrera || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis type="number" stroke="#cbd5e1" fontSize={11} />
                    <YAxis dataKey="carrera" type="category" width={140} stroke="#cbd5e1" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={`Tendencia de Inscripciones (${timelineRange.toUpperCase()})`}
                className="xl:col-span-2"
                headerRight={(
                  <select
                    value={timelineRange}
                    onChange={(e) => setTimelineRange(e.target.value)}
                    className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs text-white"
                  >
                    <option value="1h" className="bg-slate-900 text-white">Última hora</option>
                    <option value="24h" className="bg-slate-900 text-white">Último día</option>
                    <option value="7d" className="bg-slate-900 text-white">Última semana</option>
                    <option value="30d" className="bg-slate-900 text-white">Último mes</option>
                  </select>
                )}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineGeneral}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cantidad_nueva" stroke="#22c55e" name="Nuevas" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="acumulado" stroke="#0ea5e9" name="Acumulado" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </>
      )}

      {subTab === "particular" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Registrados" value={particularSummary.total_alumnos_registrados ?? 0} helper="Filtro jerárquico aplicado" />
            <KpiCard label="Inscritos" value={particularSummary.total_inscritos ?? 0} helper="Total en alcance" />
            <KpiCard label="Ocupación" value={fmtPct(particularSummary.ocupacion_promedio ?? 0)} helper="Promedio de proyectos filtrados" />
            <KpiCard label="Lista de Espera" value={particularSummary.en_lista_espera ?? 0} helper="Alumnos en cola" />
          </div>

          {loading ? (
            <EmptyState title="Cargando vista Particular" description="Estamos aplicando filtros por evento, empresa, proyecto y carrera." />
          ) : isParticularEmpty ? (
            <EmptyState title="Sin datos en vista Particular" description="Ajusta filtros jerárquicos para encontrar resultados." />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ChartCard title="Cupo vs Inscritos por Proyecto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={particularData?.series?.proyectos_cupo || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="proyecto" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cupo_actual" fill="#0ea5e9" name="Inscritos" />
                    <Bar dataKey="capacidad_max" fill="#22c55e" name="Capacidad" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Distribución de Alumnos por Empresa">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={particularData?.series?.alumnos_por_empresa || []} dataKey="cantidad_inscritos" nameKey="empresa" outerRadius={95} label>
                      {(particularData?.series?.alumnos_por_empresa || []).map((_, idx) => (
                        <Cell key={`emp-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Ratio Inscritos por Proyecto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={particularData?.series?.ratio_inscritos || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="proyecto" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={11} />
                    <Tooltip formatter={(value) => `${Number(value || 0).toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="ratio_inscripcion" fill="#14b8a6" name="% Inscrito" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={`Inscripciones (${timelineRange.toUpperCase()})`}
                headerRight={(
                  <select
                    value={timelineRange}
                    onChange={(e) => setTimelineRange(e.target.value)}
                    className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs text-white"
                  >
                    <option value="1h" className="bg-slate-900 text-white">Última hora</option>
                    <option value="24h" className="bg-slate-900 text-white">Último día</option>
                    <option value="7d" className="bg-slate-900 text-white">Última semana</option>
                    <option value="30d" className="bg-slate-900 text-white">Último mes</option>
                  </select>
                )}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineParticular}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cantidad_nueva" stroke="#22c55e" name="Nuevas" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="acumulado" stroke="#0ea5e9" name="Acumulado" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

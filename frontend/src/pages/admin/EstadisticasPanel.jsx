import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";

import { apiUrl, downloadCsvExport } from "@/lib/api";

const DARK_TOOLTIP_PROPS = {
  contentStyle: {
    backgroundColor: "#020617",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: "10px",
    color: "#e2e8f0",
  },
  itemStyle: { color: "#e2e8f0" },
  labelStyle: { color: "#f8fafc" },
};

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-normal text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{helper}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-black/35 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${className}`}>
      <h3 className="text-sm font-normal text-white/90">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs text-white/55">{subtitle}</p> : null}
      <div className="mt-3 h-72">{children}</div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-8 text-center text-white/70">
      <p className="text-sm font-normal text-white/85">{title}</p>
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

export default function EstadisticasPanel({ eventos = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    eventoId: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const [timelineRange, setTimelineRange] = useState("24h");
  const [exportingKey, setExportingKey] = useState("");

  const [generalData, setGeneralData] = useState(null);
  const [particularData, setParticularData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [alertasData, setAlertasData] = useState({ resumen: null, items: [] });
  const [pendingData, setPendingData] = useState({ evento_id: null, total: 0, items: [] });

  const endpoint = useCallback((path, query) => apiUrl(`${path}${query ? `?${query}` : ""}`), []);

  const generalQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    return params.toString();
  }, [filters]);

  const fetchGeneral = useCallback(async () => {
    const res = await fetch(endpoint("/api/v1/admin/estadisticas/general", generalQuery), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la vista de estadisticas.");
    setGeneralData(await res.json());
  }, [endpoint, generalQuery]);

  const fetchParticular = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/particular", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar el detalle de proyectos.");
    setParticularData(await res.json());
  }, [endpoint, filters.eventoId, filters.fechaInicio, filters.fechaFin]);

  const fetchAlertas = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    params.set("min_ocupacion_pct", "40");
    params.set("ocupacion_alta_pct", "75");

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/alertas-proyectos", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudieron cargar los proyectos en foco.");
    const data = await res.json();
    setAlertasData({
      resumen: data?.resumen || null,
      items: Array.isArray(data?.items) ? data.items : [],
    });
  }, [endpoint, filters.eventoId]);

  const fetchTimeline = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    params.set("ventana", timelineRange);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/inscripciones-timeline", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la tendencia de inscripciones.");
    setTimelineData(await res.json());
  }, [endpoint, filters.eventoId, filters.fechaInicio, filters.fechaFin, timelineRange]);

  const fetchPendientes = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/alumnos-pendientes", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la lista de espera.");
    const data = await res.json();
    setPendingData({
      evento_id: data?.evento_id ?? null,
      total: Number(data?.total || 0),
      items: Array.isArray(data?.items) ? data.items : [],
    });
  }, [endpoint, filters.eventoId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchGeneral(), fetchParticular(), fetchAlertas(), fetchTimeline(), fetchPendientes()]);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las estadisticas.");
    } finally {
      setLoading(false);
    }
  }, [fetchGeneral, fetchParticular, fetchAlertas, fetchTimeline, fetchPendientes]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleClearFilters = () => {
    setFilters({ eventoId: "", fechaInicio: "", fechaFin: "" });
    setTimelineRange("24h");
  };

  const handleExport = async (dataset, title) => {
    setError("");
    setExportingKey(dataset);
    try {
      await downloadCsvExport({
        dataset,
        scope: "filtered",
        filters: {
          evento_id: filters.eventoId,
          fecha_inicio: filters.fechaInicio,
          fecha_fin: filters.fechaFin,
        },
      });
    } catch (err) {
      setError(err.message || `No se pudo exportar ${title}.`);
    } finally {
      setExportingKey("");
    }
  };

  const kpis = generalData?.kpis || {};

  const timelineRows = useMemo(
    () => (Array.isArray(timelineData) ? timelineData : []).map((item) => ({
      ...item,
      label: formatTimelineLabel(item.timestamp, timelineRange),
      nuevas: Number(item.cantidad_nueva || 0),
      acumulado: Number(item.acumulado || 0),
    })),
    [timelineData, timelineRange]
  );

  const pendingBySemesterRows = useMemo(() => {
    const items = Array.isArray(pendingData?.items) ? pendingData.items : [];
    const groups = new Map();

    items.forEach((item) => {
      const semestre = Number(item?.semestre || 0);
      const key = Number.isFinite(semestre) && semestre > 0 ? `Sem ${semestre}` : "Sem no definido";
      groups.set(key, (groups.get(key) || 0) + 1);
    });

    return Array.from(groups.entries())
      .map(([semestre, pendientes]) => ({ semestre, pendientes }))
      .sort((a, b) => {
        const aNum = Number(a.semestre.replace(/[^0-9]/g, ""));
        const bNum = Number(b.semestre.replace(/[^0-9]/g, ""));
        if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
        if (Number.isNaN(aNum)) return 1;
        if (Number.isNaN(bNum)) return -1;
        return aNum - bNum;
      });
  }, [pendingData]);

  const waitlistRows = useMemo(() => {
    const items = Array.isArray(pendingData?.items) ? pendingData.items : [];
    return [...items]
      .sort((a, b) => {
        const semA = Number(a?.semestre || 0);
        const semB = Number(b?.semestre || 0);
        if (semA !== semB) return semB - semA;
        return String(a?.nombre || "").localeCompare(String(b?.nombre || ""));
      })
      .slice(0, 12);
  }, [pendingData]);

  const proyectosEnFoco = useMemo(() => {
    const source = Array.isArray(alertasData?.items) ? alertasData.items : [];
    return [...source]
      .sort((a, b) => Number(b.ocupacion_pct || 0) - Number(a.ocupacion_pct || 0))
      .slice(0, 8);
  }, [alertasData]);

  const proyectosAltaOcupacion = useMemo(
    () => proyectosEnFoco.filter((item) => Number(item.ocupacion_pct || 0) >= 75).length,
    [proyectosEnFoco]
  );

  const proyectosBajaOcupacion = useMemo(
    () => proyectosEnFoco.filter((item) => Number(item.ocupacion_pct || 0) <= 40).length,
    [proyectosEnFoco]
  );

  const conversion = useMemo(() => {
    const inscritos = Number(kpis.total_inscritos || 0);
    const registrados = Number(kpis.total_alumnos_registrados || 0);
    if (!registrados) return 0;
    return (inscritos / registrados) * 100;
  }, [kpis.total_inscritos, kpis.total_alumnos_registrados]);

  const projectAvailabilityRows = useMemo(() => {
    const source = Array.isArray(particularData?.series?.proyectos_cupo) ? particularData.series.proyectos_cupo : [];
    return source
      .map((item) => {
        const capacidad = Number(item.capacidad_max || 0);
        const cupo = Number(item.cupo_actual || 0);
        return {
          proyecto: item.proyecto,
          disponibles: Math.max(capacidad - cupo, 0),
          capacidad,
          cupo,
        };
      })
      .filter((item) => item.capacidad > 0)
      .sort((a, b) => b.disponibles - a.disponibles)
      .slice(0, 10);
  }, [particularData]);

  const safeEventos = Array.isArray(eventos) ? eventos : [];

  const isEmpty = !loading && !error && !Object.keys(kpis).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Estadisticas operativas</p>
            <h3 className="mt-1 text-lg font-normal text-white">Lo que no se ve en el dashboard</h3>
            <p className="text-sm text-white/60">Tendencia, semestres en espera y disponibilidad real por proyecto.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-normal text-white hover:bg-white/15"
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
            </button>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-normal text-white/80 hover:bg-white/10 hover:text-white"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/50">Evento</p>
            <select
              value={filters.eventoId}
              onChange={(e) => setFilters((prev) => ({ ...prev, eventoId: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="" className="bg-slate-900 text-white">Evento activo / reciente</option>
              {safeEventos.map((ev) => (
                <option key={ev.id_evento} value={ev.id_evento} className="bg-slate-900 text-white">
                  {ev.nombre} ({ev.anio})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/50">Desde</p>
            <input
              type="date"
              value={filters.fechaInicio}
              onChange={(e) => setFilters((prev) => ({ ...prev, fechaInicio: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/50">Hasta</p>
            <input
              type="date"
              value={filters.fechaFin}
              onChange={(e) => setFilters((prev) => ({ ...prev, fechaFin: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/50">Ventana</p>
            <select
              value={timelineRange}
              onChange={(e) => setTimelineRange(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="1h" className="bg-slate-900 text-white">1 hora</option>
              <option value="24h" className="bg-slate-900 text-white">24 horas</option>
              <option value="7d" className="bg-slate-900 text-white">7 dias</option>
              <option value="30d" className="bg-slate-900 text-white">30 dias</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/50">CSV</p>
            <p className="text-xs text-white/55">Usa los botones de exportacion de abajo.</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Registrados" value={kpis.total_alumnos_registrados ?? 0} helper="Universo filtrado" />
        <KpiCard label="Inscritos" value={kpis.total_inscritos ?? 0} helper="Con proyecto asignado" />
        <KpiCard label="Conversion" value={fmtPct(conversion)} helper="Registrados a inscritos" />
        <KpiCard
          label="Lista de espera"
          value={pendingData.total || 0}
          helper={`${proyectosAltaOcupacion} alta ocupacion / ${proyectosBajaOcupacion} baja ocupacion en proyectos`}
        />
      </div>

      {loading ? (
        <EmptyState title="Cargando estadisticas" description="Estamos actualizando la lectura operativa del evento." />
      ) : isEmpty ? (
        <EmptyState title="Sin datos disponibles" description="Ajusta filtros o genera actividad para visualizar indicadores." />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard
            title={`Tendencia de inscripciones (${timelineRange.toUpperCase()})`}
            subtitle="Muestra el ritmo de nuevas inscripciones y su acumulado"
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} />
                <YAxis stroke="#cbd5e1" fontSize={10} />
                <Tooltip {...DARK_TOOLTIP_PROPS} />
                <Line type="monotone" dataKey="nuevas" stroke="#22c55e" name="Nuevas" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="acumulado" stroke="#0ea5e9" name="Acumulado" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Pendientes por semestre"
            subtitle="Cuantos alumnos siguen en lista de espera por semestre"
          >
            {!pendingBySemesterRows.length ? (
              <EmptyState title="Sin lista de espera" description="No hay alumnos pendientes en este filtro." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendingBySemesterRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                  <XAxis dataKey="semestre" stroke="#cbd5e1" fontSize={11} />
                  <YAxis stroke="#cbd5e1" fontSize={10} allowDecimals={false} />
                  <Tooltip {...DARK_TOOLTIP_PROPS} />
                  <Bar dataKey="pendientes" fill="#f59e0b" name="Pendientes" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Lista de espera prioritaria"
            subtitle="Alumnos pendientes, priorizados por semestre mas alto"
          >
            {!waitlistRows.length ? (
              <EmptyState title="Sin alumnos en espera" description="No hay alumnos pendientes para este evento." />
            ) : (
              <div className="h-full overflow-auto space-y-2 pr-1">
                {waitlistRows.map((item, idx) => (
                  <div key={`${item.matricula}-${idx}`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white/90 truncate">{item.nombre || "Alumno"}</p>
                      <span className="rounded-full border border-amber-300/40 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-100">
                        Sem {item.semestre || "-"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/60">{item.carrera || "Carrera no definida"}</p>
                    <p className="text-[11px] text-white/45 font-mono">{item.matricula || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Lugares disponibles por proyecto"
            subtitle="Top proyectos con mas cupo restante en el evento filtrado"
            className="xl:col-span-2"
          >
            {!projectAvailabilityRows.length ? (
              <EmptyState title="Sin disponibilidad" description="No hay proyectos con capacidad disponible en este filtro." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectAvailabilityRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                  <XAxis dataKey="proyecto" stroke="#cbd5e1" fontSize={10} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis stroke="#cbd5e1" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    {...DARK_TOOLTIP_PROPS}
                    formatter={(value, name, item) => {
                      if (name === "Disponibles") {
                        const row = item?.payload || {};
                        return [`${value} lugares (ocupados ${row.cupo || 0}/${row.capacidad || 0})`, name];
                      }
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="disponibles" fill="#34d399" name="Disponibles" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Exportaciones utiles</p>
        <h4 className="mt-1 text-sm text-white">Descargas explicadas para administracion</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => handleExport("inscripciones", "inscripciones")}
            disabled={!!exportingKey}
            className="rounded-xl border border-blue-400/30 bg-blue-500/15 p-3 text-left hover:bg-blue-500/25 disabled:opacity-60"
          >
            <div className="inline-flex items-center gap-1 text-blue-100 text-xs"><Download className="h-3.5 w-3.5" /> {exportingKey === "inscripciones" ? "Exportando..." : "CSV Inscripciones"}</div>
            <p className="mt-1 text-xs text-white/70">Seguimiento diario de quien se inscribio, cuando y en que proyecto.</p>
          </button>

          <button
            type="button"
            onClick={() => handleExport("proyectos", "proyectos")}
            disabled={!!exportingKey}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-3 text-left hover:bg-emerald-500/25 disabled:opacity-60"
          >
            <div className="inline-flex items-center gap-1 text-emerald-100 text-xs"><Download className="h-3.5 w-3.5" /> {exportingKey === "proyectos" ? "Exportando..." : "CSV Proyectos"}</div>
            <p className="mt-1 text-xs text-white/70">Capacidad, cupo y estado de todos los proyectos del alcance filtrado.</p>
          </button>

          <button
            type="button"
            onClick={() => handleExport("usuarios_padron", "usuarios")}
            disabled={!!exportingKey}
            className="rounded-xl border border-amber-400/30 bg-amber-500/15 p-3 text-left hover:bg-amber-500/25 disabled:opacity-60"
          >
            <div className="inline-flex items-center gap-1 text-amber-100 text-xs"><Download className="h-3.5 w-3.5" /> {exportingKey === "usuarios_padron" ? "Exportando..." : "CSV Usuarios/Padron"}</div>
            <p className="mt-1 text-xs text-white/70">Base para cruces de alumnos autorizados, registrados y pendientes de asignacion.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

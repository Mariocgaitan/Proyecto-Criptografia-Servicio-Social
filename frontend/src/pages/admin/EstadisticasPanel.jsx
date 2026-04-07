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
import { Download, RefreshCw } from "lucide-react";

import { apiUrl, downloadCsvExport } from "@/lib/api";

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-normal text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{helper}</p>
    </div>
  );
}

function ChartCard({ title, children, className = "", headerRight = null }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-black/35 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-normal text-white/90">{title}</h3>
        {headerRight}
      </div>
      <div className="h-72">{children}</div>
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

function pct(part, total) {
  const p = Number(part || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return (p / t) * 100;
}

function occupancyColor(value) {
  if (value > 90) return "#ef4444";
  if (value >= 70) return "#f59e0b";
  return "#22c55e";
}

function flagBadgeClass(flag = "") {
  const value = String(flag || "").toLowerCase();
  if (value.includes("alta")) return "border-red-400/40 bg-red-500/20 text-red-100";
  if (value.includes("baja")) return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
  if (value.includes("sin_cupo") || value.includes("lleno")) return "border-amber-400/40 bg-amber-500/20 text-amber-100";
  return "border-slate-300/30 bg-slate-500/20 text-slate-100";
}

function flagLabel(flag = "") {
  return String(flag || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeAlertasResponse(data) {
  const itemsRaw = Array.isArray(data?.items) ? data.items : [];
  return {
    resumen: data?.resumen || null,
    items: itemsRaw.map((row) => ({
      id_proyecto: row.id_proyecto,
      id_empresa: row.id_empresa,
      proyecto: row.proyecto,
      empresa: row.empresa,
      ocupacion_pct: Number(row.ocupacion_pct ?? 0),
      flags: Array.isArray(row.flags) ? row.flags : [],
    })),
  };
}

function formatTimelineLabel(timestamp, timelineRange) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "-";

  if (timelineRange === "1h" || timelineRange === "24h") {
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString("es-MX", { month: "2-digit", day: "2-digit" });
}

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
  const [selectedCarrera, setSelectedCarrera] = useState("");
  const [exportDataset, setExportDataset] = useState("inscripciones");
  const [exportScope, setExportScope] = useState("filtered");
  const [exportingCsv, setExportingCsv] = useState(false);

  const [generalData, setGeneralData] = useState(null);
  const [particularData, setParticularData] = useState(null);
  const [timelineGeneralData, setTimelineGeneralData] = useState([]);
  const [timelineParticularData, setTimelineParticularData] = useState([]);
  const [alertasData, setAlertasData] = useState({ resumen: null, items: [] });
  const [embudoData, setEmbudoData] = useState({ etapas: [], metricas: null });

  const endpoint = useCallback((path, query) => apiUrl(`${path}${query ? `?${query}` : ""}`), []);

  const generalQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    return params.toString();
  }, [filters.fechaInicio, filters.fechaFin]);

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

  const fetchGeneral = useCallback(async () => {
    const res = await fetch(endpoint("/api/v1/admin/estadisticas/general", generalQuery), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la vista general de estadísticas.");
    setGeneralData(await res.json());
  }, [endpoint, generalQuery]);

  const fetchParticular = useCallback(async () => {
    const res = await fetch(endpoint("/api/v1/admin/estadisticas/particular", particularQuery), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar la vista particular de estadísticas.");
    setParticularData(await res.json());
  }, [endpoint, particularQuery]);

  const fetchEmbudo = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (subTab === "particular" && filters.empresaId) params.set("empresa_id", filters.empresaId);
    if (subTab === "particular" && filters.proyectoId) params.set("proyecto_id", filters.proyectoId);
    if (filters.carrera) params.set("carrera", filters.carrera);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/embudo-conversion", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar el embudo de conversión.");
    const data = await res.json();
    setEmbudoData({
      etapas: Array.isArray(data?.etapas) ? data.etapas : [],
      metricas: data?.metricas || null,
    });
  }, [endpoint, filters.eventoId, filters.empresaId, filters.proyectoId, filters.carrera, filters.fechaInicio, filters.fechaFin, subTab]);

  const fetchAlertas = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (subTab === "particular" && filters.empresaId) params.set("empresa_id", filters.empresaId);
    if (subTab === "particular" && filters.proyectoId) params.set("proyecto_id", filters.proyectoId);
    params.set("min_ocupacion_pct", "40");
    params.set("ocupacion_alta_pct", "75");

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/alertas-proyectos", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudieron cargar las alertas de proyectos.");
    setAlertasData(normalizeAlertasResponse(await res.json()));
  }, [endpoint, filters.eventoId, filters.empresaId, filters.proyectoId, subTab]);

  const fetchTimelineGeneral = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    params.set("ventana", timelineRange);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/inscripciones-timeline", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar el timeline de inscripciones.");
    setTimelineGeneralData(await res.json());
  }, [endpoint, filters.fechaInicio, filters.fechaFin, timelineRange]);

  const fetchTimelineParticular = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.eventoId) params.set("evento_id", filters.eventoId);
    if (filters.empresaId) params.set("empresa_id", filters.empresaId);
    if (filters.proyectoId) params.set("proyecto_id", filters.proyectoId);
    if (filters.carrera) params.set("carrera", filters.carrera);
    if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
    if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
    params.set("ventana", timelineRange);

    const res = await fetch(endpoint("/api/v1/admin/estadisticas/inscripciones-timeline", params.toString()), { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar el timeline de inscripciones.");
    setTimelineParticularData(await res.json());
  }, [endpoint, filters.eventoId, filters.empresaId, filters.proyectoId, filters.carrera, filters.fechaInicio, filters.fechaFin, timelineRange]);

  const fetchActiveView = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (subTab === "general") {
        await Promise.all([fetchGeneral(), fetchEmbudo(), fetchAlertas(), fetchTimelineGeneral()]);
      } else {
        await Promise.all([fetchParticular(), fetchEmbudo(), fetchAlertas(), fetchTimelineParticular()]);
      }
    } catch (err) {
      setError(err.message || "Error cargando estadísticas.");
    } finally {
      setLoading(false);
    }
  }, [subTab, fetchGeneral, fetchParticular, fetchEmbudo, fetchAlertas, fetchTimelineGeneral, fetchTimelineParticular]);

  const handleExportCsv = useCallback(async () => {
    setError("");
    setExportingCsv(true);
    try {
      const filtersToSend = exportScope === "filtered"
        ? {
          evento_id: subTab === "particular" ? filters.eventoId : "",
          empresa_id: subTab === "particular" ? filters.empresaId : "",
          proyecto_id: subTab === "particular" ? filters.proyectoId : "",
          carrera: subTab === "particular" ? filters.carrera : "",
          fecha_inicio: filters.fechaInicio,
          fecha_fin: filters.fechaFin,
        }
        : {};

      await downloadCsvExport({
        dataset: exportDataset,
        scope: exportScope,
        filters: filtersToSend,
      });
    } catch (err) {
      setError(err.message || "No se pudo exportar el CSV.");
    } finally {
      setExportingCsv(false);
    }
  }, [exportDataset, exportScope, filters, subTab]);

  useEffect(() => {
    fetchActiveView();
  }, [fetchActiveView]);

  useEffect(() => {
    if (subTab !== "general") return;
    setFilters((prev) => ({
      ...prev,
      eventoId: "",
      empresaId: "",
      proyectoId: "",
      carrera: "",
    }));
  }, [subTab]);

  const particularProjects = particularData?.series?.proyectos_cupo || [];
  const projectsByCompany = useMemo(
    () => particularProjects.filter((item) => String(item.id_empresa) === String(filters.empresaId)),
    [particularProjects, filters.empresaId]
  );

  useEffect(() => {
    if (!filters.empresaId) {
      if (filters.proyectoId) setFilters((prev) => ({ ...prev, proyectoId: "" }));
      return;
    }

    const exists = projectsByCompany.some((item) => String(item.id_proyecto) === String(filters.proyectoId));
    if (!exists && filters.proyectoId) setFilters((prev) => ({ ...prev, proyectoId: "" }));
  }, [filters.empresaId, filters.proyectoId, projectsByCompany]);

  const generalKpis = generalData?.kpis || {};
  const particularSummary = particularData?.resumen || {};

  const generalTimeline = useMemo(
    () => (Array.isArray(timelineGeneralData) ? timelineGeneralData : []).map((item) => ({ ...item, label: formatTimelineLabel(item.timestamp, timelineRange) })),
    [timelineGeneralData, timelineRange]
  );

  const particularTimeline = useMemo(
    () => (Array.isArray(timelineParticularData) ? timelineParticularData : []).map((item) => ({ ...item, label: formatTimelineLabel(item.timestamp, timelineRange) })),
    [timelineParticularData, timelineRange]
  );

  const embudoEtapas = useMemo(() => {
    if (embudoData?.etapas?.length) return embudoData.etapas;
    const registrados = Number(generalKpis.total_alumnos_registrados || 0);
    const inscritos = Number(generalKpis.total_inscritos || 0);
    return [
      { key: "registrados", etapa: "Registrados", valor: registrados },
      { key: "inscritos", etapa: "Inscritos", valor: inscritos },
      { key: "sin_asignar", etapa: "Sin Asignar", valor: Math.max(registrados - inscritos, 0) },
    ];
  }, [embudoData, generalKpis.total_alumnos_registrados, generalKpis.total_inscritos]);

  const conversionGeneral = useMemo(
    () => Number(embudoData?.metricas?.conversion_pct ?? pct(generalKpis.total_inscritos, generalKpis.total_alumnos_registrados)),
    [embudoData, generalKpis.total_inscritos, generalKpis.total_alumnos_registrados]
  );

  const conversionParticular = useMemo(
    () => pct(particularSummary.total_inscritos, particularSummary.total_alumnos_registrados),
    [particularSummary.total_inscritos, particularSummary.total_alumnos_registrados]
  );

  const carreraSemestreChart = useMemo(() => {
    const raw = generalData?.series?.alumnos_por_carrera;
    const rows = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const totalRegistrados = rows.reduce((acc, row) => acc + Number(row.cantidad || 0), 0);
    const totalInscritos = rows.reduce((acc, row) => acc + Number(row.cantidad_inscritos || 0), 0);
    const data = rows.map((row) => {
      const registrados = Number(row.cantidad || 0);
      const inscritos = Number(row.cantidad_inscritos || 0);
      const registradosSinInscripcion = Number(row.cantidad_sin_proyecto ?? Math.max(registrados - inscritos, 0));
      return {
        carrera: row.carrera,
        registrados,
        inscritos,
        registrados_sin_inscripcion: registradosSinInscripcion,
        pct_inscritos_en_carrera: registrados > 0 ? (inscritos / registrados) * 100 : 0,
        pct_sin_inscripcion_en_carrera: registrados > 0 ? (registradosSinInscripcion / registrados) * 100 : 0,
        pct_carrera_total_registrados: totalRegistrados > 0 ? (registrados / totalRegistrados) * 100 : 0,
        pct_registrados: totalRegistrados > 0 ? (registrados / totalRegistrados) * 100 : 0,
        pct_inscritos: totalInscritos > 0 ? (inscritos / totalInscritos) * 100 : 0,
        total_label: `${registrados}`,
        por_semestre: Array.isArray(row.por_semestre) ? row.por_semestre : [],
      };
    });

    return data.sort((a, b) => b.registrados - a.registrados);
  }, [generalData]);

  const selectedCarreraData = useMemo(
    () => carreraSemestreChart.find((item) => item.carrera === selectedCarrera) || null,
    [carreraSemestreChart, selectedCarrera]
  );

  const semestrePieData = useMemo(() => {
    if (!selectedCarreraData) return [];
    const totalRegCarrera = Number(selectedCarreraData.registrados || 0);
    const totalInsCarrera = Number(selectedCarreraData.inscritos || 0);
    return (selectedCarreraData.por_semestre || [])
      .map((s) => {
        const registrados = Number(s.cantidad || 0);
        const inscritos = Number(s.inscritos || 0);
        return {
          name: `Sem ${Number(s.semestre || 0)}`,
          registrados,
          inscritos,
          pct_registrados: totalRegCarrera > 0 ? (registrados / totalRegCarrera) * 100 : 0,
          pct_inscritos: totalInsCarrera > 0 ? (inscritos / totalInsCarrera) * 100 : 0,
        };
      })
      .sort((a, b) => b.registrados - a.registrados);
  }, [selectedCarreraData]);

  const semestrePieRegistrados = useMemo(
    () => semestrePieData.filter((item) => Number(item.registrados || 0) > 0 && Number(item.pct_registrados || 0) > 0),
    [semestrePieData]
  );

  const semestrePieInscritos = useMemo(
    () => semestrePieData.filter((item) => Number(item.inscritos || 0) > 0 && Number(item.pct_inscritos || 0) > 0),
    [semestrePieData]
  );

  useEffect(() => {
    if (!selectedCarrera) return;
    const exists = carreraSemestreChart.some((item) => item.carrera === selectedCarrera);
    if (!exists) setSelectedCarrera("");
  }, [carreraSemestreChart, selectedCarrera]);

  const topAlertas = (alertasData?.items || []).slice(0, 8);
  const mayorDemanda = useMemo(() => {
    const source = Array.isArray(alertasData?.items) ? alertasData.items : [];
    return [...source]
      .filter((item) => Number(item.ocupacion_pct || 0) >= 75)
      .sort((a, b) => Number(b.ocupacion_pct || 0) - Number(a.ocupacion_pct || 0))
      .slice(0, 4);
  }, [alertasData]);

  const menorDemanda = useMemo(() => {
    const source = Array.isArray(alertasData?.items) ? alertasData.items : [];
    const selectedHigh = new Set(mayorDemanda.map((item) => item.id_proyecto));

    return [...source]
      .filter((item) => Number(item.ocupacion_pct || 0) <= 40)
      .filter((item) => !selectedHigh.has(item.id_proyecto))
      .sort((a, b) => Number(a.ocupacion_pct || 0) - Number(b.ocupacion_pct || 0))
      .slice(0, 4);
  }, [alertasData, mayorDemanda]);
  const isGeneralEmpty = !loading && !error && !Object.keys(generalKpis).length;
  const isParticularEmpty = !loading && !error && !Object.keys(particularSummary).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1">
            <button
              onClick={() => setSubTab("general")}
              className={`rounded-md px-3 py-1.5 text-xs font-normal transition-colors ${subTab === "general" ? "bg-blue-500/25 text-white" : "text-white/70 hover:text-white"}`}
            >
              General
            </button>
            <button
              onClick={() => setSubTab("particular")}
              className={`rounded-md px-3 py-1.5 text-xs font-normal transition-colors ${subTab === "particular" ? "bg-blue-500/25 text-white" : "text-white/70 hover:text-white"}`}
            >
              Particular
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exportDataset}
              onChange={(e) => setExportDataset(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white"
              disabled={exportingCsv}
            >
              <option value="inscripciones" className="bg-slate-900 text-white">CSV: Inscripciones</option>
              <option value="proyectos" className="bg-slate-900 text-white">CSV: Proyectos</option>
              <option value="empresas" className="bg-slate-900 text-white">CSV: Empresas</option>
              <option value="usuarios_padron" className="bg-slate-900 text-white">CSV: Usuarios/Padrón</option>
              <option value="logs" className="bg-slate-900 text-white">CSV: Logs</option>
            </select>

            <select
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white"
              disabled={exportingCsv}
            >
              <option value="all" className="bg-slate-900 text-white">Todos</option>
              <option value="filtered" className="bg-slate-900 text-white">Filtrados</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-400/30 bg-blue-500/20 px-3 py-2 text-xs font-normal text-blue-100 hover:bg-blue-500/30"
              disabled={exportingCsv}
            >
              <Download className="h-3.5 w-3.5" /> {exportingCsv ? "Exportando..." : "Exportar CSV"}
            </button>

            <button
              onClick={fetchActiveView}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-normal text-white hover:bg-white/15"
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-3 ${subTab === "general" ? "md:grid-cols-2 lg:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-6"}`}>
          {subTab === "particular" && (
            <>
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
                disabled={!filters.empresaId}
              >
                <option value="" className="bg-slate-900 text-white">Todos los proyectos</option>
                {projectsByCompany.map((item) => (
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
                {(Array.isArray(generalData?.series?.alumnos_por_carrera) ? generalData.series.alumnos_por_carrera : (generalData?.series?.alumnos_por_carrera?.data ?? [])).map((item) => (
                  <option key={item.carrera} value={item.carrera} className="bg-slate-900 text-white">
                    {item.carrera}
                  </option>
                ))}
              </select>
            </>
          )}

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Alumnos Registrados" value={generalKpis.total_alumnos_registrados ?? 0} helper="Universo: evento" />
            <KpiCard label="Inscritos Totales" value={generalKpis.total_inscritos ?? 0} helper="Universo: evento" />
            <KpiCard label="Ocupación Promedio" value={fmtPct(generalKpis.ocupacion_promedio ?? 0)} helper="Capacidad global" />
            <KpiCard label="Conversión" value={fmtPct(conversionGeneral)} helper="Registrados a inscritos" />
          </div>

          {loading ? (
            <EmptyState title="Cargando vista General" description="Estamos consultando los indicadores agregados de negocio." />
          ) : isGeneralEmpty ? (
            <EmptyState title="Sin datos en vista General" description="Ajusta filtros o registra actividad para visualizar métricas." />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ChartCard title="Embudo de Conversión">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={embudoEtapas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis type="number" stroke="#cbd5e1" fontSize={11} />
                    <YAxis dataKey="etapa" type="category" width={150} stroke="#cbd5e1" fontSize={11} />
                    <Tooltip {...DARK_TOOLTIP_PROPS} />
                    <Bar dataKey="valor" fill="#0ea5e9" name="Alumnos" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Ocupación por Evento">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(generalData?.series?.ocupacion_eventos || []).map((r) => ({ ...r, ocupacion_pct: Number(r.porcentaje || 0) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis type="number" domain={[0, 100]} stroke="#cbd5e1" fontSize={11} />
                    <YAxis dataKey="evento" type="category" width={150} stroke="#cbd5e1" fontSize={10} />
                    <Tooltip {...DARK_TOOLTIP_PROPS} formatter={(value) => `${Number(value || 0).toFixed(1)}%`} />
                    <Bar dataKey="ocupacion_pct" name="Ocupación %">
                      {(generalData?.series?.ocupacion_eventos || []).map((item, idx) => (
                        <Cell key={`occ-${item.id_evento || idx}`} fill={occupancyColor(item.porcentaje)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={`Tendencia de Inscripciones (${timelineRange.toUpperCase()})`} className="xl:col-span-2" headerRight={(
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
              )}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generalTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={10} />
                    <Tooltip {...DARK_TOOLTIP_PROPS} />
                    <Legend />
                    <Line type="monotone" dataKey="cantidad_nueva" stroke="#22c55e" name="Nuevas" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="acumulado" stroke="#0ea5e9" name="Acumulado" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Alertas de Proyectos">
                {!topAlertas.length ? (
                  <EmptyState title="Sin alertas" description="No hay proyectos fuera de los umbrales configurados." />
                ) : (
                  <div className="h-full overflow-auto rounded-lg border border-white/10">
                    <div className="grid grid-cols-2 border-b border-white/10 bg-white/5 text-[11px] uppercase tracking-wide text-white/65">
                      <div className="px-3 py-2 font-normal">Mayor demanda</div>
                      <div className="border-l border-white/10 px-3 py-2 font-normal">Menor demanda</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="space-y-2 p-2">
                        {!mayorDemanda.length ? (
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
                            Sin proyectos con ocupación mayor o igual a 75%.
                          </div>
                        ) : (
                          mayorDemanda.map((item) => (
                            <div key={`mayor-${item.id_proyecto}`} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-normal text-white/90">{item.proyecto}</p>
                                <span className="rounded-full border border-red-300/40 bg-red-500/20 px-2 py-0.5 text-[10px] text-red-100">
                                  {fmtPct(item.ocupacion_pct)}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/60">{item.empresa}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(item.flags || []).map((flag) => (
                                  <span key={`${item.id_proyecto}-${flag}`} className={`rounded-full border px-2 py-0.5 text-[10px] ${flagBadgeClass(flag)}`}>
                                    {flagLabel(flag)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2 border-l border-white/10 p-2">
                        {!menorDemanda.length ? (
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
                            Sin proyectos con ocupación menor o igual a 40%.
                          </div>
                        ) : (
                          menorDemanda.map((item) => (
                            <div key={`menor-${item.id_proyecto}`} className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-normal text-white/90">{item.proyecto}</p>
                                <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-100">
                                  {fmtPct(item.ocupacion_pct)}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/60">{item.empresa}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(item.flags || []).map((flag) => (
                                  <span key={`${item.id_proyecto}-${flag}`} className={`rounded-full border px-2 py-0.5 text-[10px] ${flagBadgeClass(flag)}`}>
                                    {flagLabel(flag)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title={selectedCarrera ? `Distribución por Semestres (Reg vs Ins) · ${selectedCarrera}` : "Registrados vs Inscritos por Carrera"}
                headerRight={selectedCarrera ? (
                  <button
                    onClick={() => setSelectedCarrera("")}
                    className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
                  >
                    Volver a carreras
                  </button>
                ) : null}
              >
                {!carreraSemestreChart.length ? (
                  <EmptyState title="Sin datos de carrera/semestre" description="No hay registros suficientes para construir esta distribución." />
                ) : selectedCarrera ? (
                  !semestrePieData.length ? (
                    <EmptyState title="Sin semestres para esta carrera" description="No hay distribución por semestre disponible para la carrera seleccionada." />
                  ) : (
                    <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <p className="mb-2 text-[11px] font-normal uppercase tracking-wide text-white/65">Registrados por semestre</p>
                        {!semestrePieRegistrados.length ? (
                          <div className="flex h-[235px] items-center justify-center text-xs text-white/60">Sin datos &gt; 0% para registrados</div>
                        ) : (
                          <ResponsiveContainer width="100%" height={235}>
                            <PieChart>
                              <Tooltip
                                {...DARK_TOOLTIP_PROPS}
                                formatter={(value, _name, item) => {
                                  const pct = Number(item?.payload?.pct_registrados || 0);
                                  return [`${Number(value || 0).toLocaleString("es-MX")} (${pct.toFixed(1)}%)`, "Registrados"];
                                }}
                              />
                              <Legend />
                              <Pie
                                data={semestrePieRegistrados}
                                dataKey="registrados"
                                nameKey="name"
                                name="Registrados"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                isAnimationActive
                                animationDuration={450}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {semestrePieRegistrados.map((entry, idx) => (
                                  <Cell key={`sem-pie-${entry.name}`} fill={["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6", "#f97316", "#38bdf8"][idx % 8]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <p className="mb-2 text-[11px] font-normal uppercase tracking-wide text-white/65">Inscritos por semestre</p>
                        {!semestrePieInscritos.length ? (
                          <div className="flex h-[235px] items-center justify-center text-xs text-white/60">Sin datos &gt; 0% para inscritos</div>
                        ) : (
                          <ResponsiveContainer width="100%" height={235}>
                            <PieChart>
                              <Tooltip
                                {...DARK_TOOLTIP_PROPS}
                                formatter={(value, _name, item) => {
                                  const pct = Number(item?.payload?.pct_inscritos || 0);
                                  return [`${Number(value || 0).toLocaleString("es-MX")} (${pct.toFixed(1)}%)`, "Inscritos"];
                                }}
                              />
                              <Legend />
                              <Pie
                                data={semestrePieInscritos}
                                dataKey="inscritos"
                                nameKey="name"
                                name="Inscritos"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                isAnimationActive
                                animationDuration={450}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {semestrePieInscritos.map((entry, idx) => (
                                  <Cell key={`sem-pie-ins-${entry.name}`} fill={["#7dd3fc", "#86efac", "#fcd34d", "#fda4af", "#c4b5fd", "#5eead4", "#fdba74", "#67e8f9"][idx % 8]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={carreraSemestreChart} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                      <XAxis type="number" stroke="#cbd5e1" fontSize={11} />
                      <YAxis type="category" dataKey="carrera" width={170} stroke="#cbd5e1" fontSize={10} />
                      <Tooltip
                        {...DARK_TOOLTIP_PROPS}
                        formatter={(value, name, item) => {
                          const row = item?.payload || {};
                          if (name === "Inscritos") {
                            return [
                              `${Number(value || 0).toLocaleString("es-MX")} (${Number(row.pct_inscritos_en_carrera || 0).toFixed(1)}% de la carrera)`,
                              name,
                            ];
                          }
                          if (name === "Registrados sin inscripción") {
                            return [
                              `${Number(value || 0).toLocaleString("es-MX")} (${Number(row.pct_sin_inscripcion_en_carrera || 0).toFixed(1)}% de la carrera)`,
                              name,
                            ];
                          }
                          return [Number(value || 0).toLocaleString("es-MX"), name];
                        }}
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload;
                          if (!row) return label;
                          return `${label} · Total registrados: ${Number(row.registrados || 0).toLocaleString("es-MX")} · Participación: ${Number(row.pct_carrera_total_registrados || 0).toFixed(1)}%`;
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="inscritos"
                        name="Inscritos"
                        stackId="totales"
                        fill="#22c55e"
                        radius={[0, 8, 8, 0]}
                        isAnimationActive
                        animationDuration={450}
                        onClick={(payload) => setSelectedCarrera(payload?.carrera || "")}
                      />
                      <Bar
                        dataKey="registrados_sin_inscripcion"
                        name="Registrados sin inscripción"
                        stackId="totales"
                        fill="#0ea5e9"
                        radius={[0, 8, 8, 0]}
                        isAnimationActive
                        animationDuration={450}
                        onClick={(payload) => setSelectedCarrera(payload?.carrera || "")}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}
        </>
      )}

      {subTab === "particular" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Registrados" value={particularSummary.total_alumnos_registrados ?? 0} helper="Filtro aplicado" />
            <KpiCard label="Inscritos" value={particularSummary.total_inscritos ?? 0} helper="Total en alcance" />
            <KpiCard label="Ocupación" value={fmtPct(particularSummary.ocupacion_promedio ?? 0)} helper="Promedio de proyectos" />
            <KpiCard label="Conversión" value={fmtPct(conversionParticular)} helper="Registrados a inscritos" />
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
                    <Tooltip {...DARK_TOOLTIP_PROPS} />
                    <Legend />
                    <Bar dataKey="cupo_actual" fill="#0ea5e9" name="Inscritos" />
                    <Bar dataKey="capacidad_max" fill="#22c55e" name="Capacidad" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Ratio Inscritos por Proyecto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={particularData?.series?.ratio_inscritos || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="proyecto" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={11} />
                    <Tooltip {...DARK_TOOLTIP_PROPS} formatter={(value) => `${Number(value || 0).toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="ratio_inscripcion" fill="#14b8a6" name="% Inscrito" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={`Inscripciones Segmentadas (${timelineRange.toUpperCase()})`}
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
                  <LineChart data={particularTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} />
                    <YAxis stroke="#cbd5e1" fontSize={10} />
                    <Tooltip {...DARK_TOOLTIP_PROPS} />
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

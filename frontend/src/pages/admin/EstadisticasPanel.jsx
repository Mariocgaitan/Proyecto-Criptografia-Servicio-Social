import { useEffect, useMemo, useState } from "react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiUrl } from "@/lib/api";

const CHART_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-black/35 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-white/90">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{helper}</p>
    </div>
  );
}

function fmtPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EstadisticasPanel({ eventos = [], empresas = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [eventoId, setEventoId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [carrera, setCarrera] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [kpis, setKpis] = useState(null);
  const [ocupacionEventos, setOcupacionEventos] = useState([]);
  const [proyectosCupo, setProyectosCupo] = useState([]);
  const [alumnosPorEmpresa, setAlumnosPorEmpresa] = useState([]);
  const [alumnosPorCarrera, setAlumnosPorCarrera] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [ratioInscritos, setRatioInscritos] = useState([]);
  const [logsRecientes, setLogsRecientes] = useState([]);
  const [empresaPie, setEmpresaPie] = useState("");
  const [proyectoPie, setProyectoPie] = useState("");

  const carrerasDisponibles = useMemo(
    () => alumnosPorCarrera.map((item) => item.carrera).filter(Boolean),
    [alumnosPorCarrera]
  );

  const empresasConProyectos = useMemo(() => {
    const unique = new Map();
    proyectosCupo.forEach((item) => {
      if (item?.id_empresa && item?.empresa) {
        unique.set(String(item.id_empresa), { id: String(item.id_empresa), nombre: item.empresa });
      }
    });
    return Array.from(unique.values());
  }, [proyectosCupo]);

  const proyectosEmpresaSeleccionada = useMemo(
    () => proyectosCupo.filter((item) => String(item.id_empresa) === empresaPie),
    [proyectosCupo, empresaPie]
  );

  const proyectoSeleccionado = useMemo(
    () => proyectosEmpresaSeleccionada.find((item) => String(item.id_proyecto) === proyectoPie) || null,
    [proyectosEmpresaSeleccionada, proyectoPie]
  );

  const pieCupoVsInscritos = useMemo(() => {
    if (!proyectoSeleccionado) return [];
    const inscritos = Number(proyectoSeleccionado.cupo_actual || 0);
    const capacidad = Number(proyectoSeleccionado.capacidad_max || 0);
    const disponibles = Math.max(capacidad - inscritos, 0);
    return [
      { name: "Inscritos", value: inscritos },
      { name: "Disponibles", value: disponibles },
    ];
  }, [proyectoSeleccionado]);

  const timelineConHoras = useMemo(
    () =>
      timeline.map((item) => {
        const raw = item?.timestamp || "";
        const dt = new Date(raw);
        if (!Number.isNaN(dt.getTime())) {
          const hh = String(dt.getHours()).padStart(2, "0");
          return { ...item, horaLabel: `${hh}:00` };
        }
        const compact = String(raw).replace("T", " ").slice(11, 13);
        return { ...item, horaLabel: compact ? `${compact}:00` : String(raw) };
      }),
    [timeline]
  );

  useEffect(() => {
    if (!empresasConProyectos.length) {
      setEmpresaPie("");
      setProyectoPie("");
      return;
    }

    const empresaExists = empresasConProyectos.some((item) => item.id === empresaPie);
    const nextEmpresa = empresaExists ? empresaPie : empresasConProyectos[0].id;
    if (nextEmpresa !== empresaPie) {
      setEmpresaPie(nextEmpresa);
      return;
    }

    const proyectos = proyectosCupo.filter((item) => String(item.id_empresa) === nextEmpresa);
    const proyectoExists = proyectos.some((item) => String(item.id_proyecto) === proyectoPie);
    if (!proyectoExists) {
      setProyectoPie(proyectos[0] ? String(proyectos[0].id_proyecto) : "");
    }
  }, [empresasConProyectos, empresaPie, proyectoPie, proyectosCupo]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (eventoId) params.set("evento_id", eventoId);
    if (empresaId) params.set("empresa_id", empresaId);
    if (carrera) params.set("carrera", carrera);
    return params.toString();
  }, [eventoId, empresaId, carrera]);

  const kpisQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (eventoId) params.set("evento_id", eventoId);
    if (fechaInicio) params.set("fecha_inicio", fechaInicio);
    if (fechaFin) params.set("fecha_fin", fechaFin);
    return params.toString();
  }, [eventoId, fechaInicio, fechaFin]);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = (path, query) => apiUrl(`${path}${query ? `?${query}` : ""}`);

      const [kpiRes, ocupacionRes, proyectosRes, empresaRes, carreraRes, timelineRes, ratioRes, logsRes] = await Promise.all([
        fetch(endpoint("/api/v1/admin/estadisticas/kpis", kpisQuery), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/ocupacion-eventos", queryString), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/proyectos-cupo", queryString), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/alumnos-por-empresa", queryString), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/alumnos-por-carrera", queryString), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/inscripciones-timeline", queryString), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/ratio-inscritos", queryString), { credentials: "include" }),
        fetch(endpoint("/api/v1/admin/estadisticas/logs-recientes", "limite=10"), { credentials: "include" }),
      ]);

      if (!kpiRes.ok || !ocupacionRes.ok || !proyectosRes.ok || !empresaRes.ok || !carreraRes.ok || !timelineRes.ok || !ratioRes.ok || !logsRes.ok) {
        throw new Error("No se pudieron cargar las estadísticas.");
      }

      const [kpiData, ocupData, proyData, empData, carrData, timeData, ratioData, logsData] = await Promise.all([
        kpiRes.json(),
        ocupacionRes.json(),
        proyectosRes.json(),
        empresaRes.json(),
        carreraRes.json(),
        timelineRes.json(),
        ratioRes.json(),
        logsRes.json(),
      ]);

      setKpis(kpiData);
      setOcupacionEventos(ocupData || []);
      setProyectosCupo(proyData || []);
      setAlumnosPorEmpresa(empData || []);
      setAlumnosPorCarrera(carrData || []);
      setTimeline(timeData || []);
      setRatioInscritos(ratioData || []);
      setLogsRecientes(logsData || []);
    } catch (err) {
      setError(err.message || "Error cargando estadísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [queryString, kpisQuery]);

  const exportCsv = () => {
    const rows = [
      ["Metrica", "Valor"],
      ["Total alumnos registrados", kpis?.total_alumnos_registrados ?? 0],
      ["Total inscritos", kpis?.total_inscritos ?? 0],
      ["Ocupacion promedio", kpis?.ocupacion_promedio ?? 0],
      ["Lista de espera", kpis?.en_lista_espera ?? 0],
      ["Empresas participantes", kpis?.empresas_participantes ?? 0],
      ["Intentos login fallido 7d", kpis?.intentos_login_fallido_7d ?? 0],
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "estadisticas_admin.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Dashboard de Estadisticas - Admin", 14, 16);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      head: [["Metrica", "Valor"]],
      body: [
        ["Total alumnos registrados", String(kpis?.total_alumnos_registrados ?? 0)],
        ["Total inscritos", String(kpis?.total_inscritos ?? 0)],
        ["Ocupacion promedio", `${kpis?.ocupacion_promedio ?? 0}%`],
        ["En lista de espera", String(kpis?.en_lista_espera ?? 0)],
        ["Empresas participantes", String(kpis?.empresas_participantes ?? 0)],
        ["Intentos login fallido 7d", String(kpis?.intentos_login_fallido_7d ?? 0)],
      ],
    });

    doc.save("estadisticas_admin.pdf");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Filtros y Exportación</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refrescar
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/15"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <select
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
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
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
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
            value={carrera}
            onChange={(e) => setCarrera(e.target.value)}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="" className="bg-slate-900 text-white">Todas las carreras</option>
            {carrerasDisponibles.map((name) => (
              <option key={name} value={name} className="bg-slate-900 text-white">
                {name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          />

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Alumnos Registrados" value={kpis?.total_alumnos_registrados ?? 0} helper="Evento seleccionado" />
        <KpiCard label="Inscritos" value={kpis?.total_inscritos ?? 0} helper="Total confirmado" />
        <KpiCard label="Ocupación Promedio" value={fmtPct(kpis?.ocupacion_promedio ?? 0)} helper="Sobre capacidad total" />
        <KpiCard label="Lista de Espera" value={kpis?.en_lista_espera ?? 0} helper="Total en cola" />
        <KpiCard label="Empresas" value={kpis?.empresas_participantes ?? 0} helper="Con proyectos en evento" />
        <KpiCard label="Login Fallido 7d" value={kpis?.intentos_login_fallido_7d ?? 0} helper="Seguridad del sistema" />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-8 text-center text-white/70">Cargando estadísticas...</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard title="Ocupación por Evento">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocupacionEventos}>
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

          <ChartCard title="Cupo vs Inscritos por Proyecto">
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={empresaPie}
                onChange={(e) => {
                  const next = e.target.value;
                  setEmpresaPie(next);
                  const first = proyectosCupo.find((item) => String(item.id_empresa) === next);
                  setProyectoPie(first ? String(first.id_proyecto) : "");
                }}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white"
              >
                {empresasConProyectos.map((item) => (
                  <option key={item.id} value={item.id} className="bg-slate-900 text-white">
                    {item.nombre}
                  </option>
                ))}
              </select>

              <select
                value={proyectoPie}
                onChange={(e) => setProyectoPie(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white"
                disabled={!proyectosEmpresaSeleccionada.length}
              >
                {proyectosEmpresaSeleccionada.map((item) => (
                  <option key={item.id_proyecto} value={item.id_proyecto} className="bg-slate-900 text-white">
                    {item.proyecto}
                  </option>
                ))}
              </select>
            </div>

            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={pieCupoVsInscritos}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  labelLine={false}
                  label={({ value }) => value}
                  isAnimationActive
                  animationDuration={900}
                  animationBegin={100}
                >
                  {pieCupoVsInscritos.map((_, idx) => (
                    <Cell key={`cupo-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución de Alumnos por Empresa">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={alumnosPorEmpresa} dataKey="cantidad_inscritos" nameKey="empresa" outerRadius={95} label>
                  {alumnosPorEmpresa.map((_, idx) => (
                    <Cell key={`emp-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Alumnos por Carrera">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alumnosPorCarrera} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis type="number" stroke="#cbd5e1" fontSize={11} />
                <YAxis dataKey="carrera" type="category" width={140} stroke="#cbd5e1" fontSize={11} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Inscripciones por Hora">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineConHoras}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="horaLabel" stroke="#cbd5e1" fontSize={10} />
                <YAxis stroke="#cbd5e1" fontSize={10} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cantidad_nueva"
                  stroke="#22c55e"
                  name="Inscripciones por hora"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1, fill: "#22c55e" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  stroke="#0ea5e9"
                  name="Acumulado"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1, fill: "#0ea5e9" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ratio: Alumnos Registrados vs Inscritos por Proyecto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratioInscritos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="proyecto" stroke="#cbd5e1" fontSize={10} />
                <YAxis stroke="#cbd5e1" fontSize={11} />
                <Tooltip formatter={(value) => `${Number(value || 0).toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="ratio_inscripcion" fill="#14b8a6" name="% Inscrito" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <div className="rounded-2xl border border-white/15 bg-black/35 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
        <h3 className="mb-3 text-sm font-semibold text-white/90">Ultimos 10 eventos registrados</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left text-white/70">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Matricula</th>
                <th className="px-3 py-2 font-semibold">IP</th>
                <th className="px-3 py-2 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logsRecientes.length ? (
                logsRecientes.map((log) => (
                  <tr key={log.id_log} className="border-b border-white/10 text-white/85">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(log.timestamp)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.tipo_evento || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.id_matricula || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.ip_origen || "-"}</td>
                    <td className="px-3 py-2">{log.detalle || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-white/55" colSpan={5}>No hay logs para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

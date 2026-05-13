import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Download,
  RefreshCw,
} from "lucide-react";

import { apiUrl } from "@/lib/api";

const CHART_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f97316", "#f87171", "#2dd4bf"];
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

function formatDateLabel(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function formatEventWindow(evento) {
  if (!evento?.fecha_inicio || !evento?.fecha_fin) return "Periodo sin fechas definidas";
  return `${formatDateLabel(evento.fecha_inicio)} - ${formatDateLabel(evento.fecha_fin)}`;
}

function formatTimelineLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-2 text-3xl font-normal tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-white/60">{helper}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, actionLabel, onAction, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-black/35 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-normal text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-wider text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function AttentionList({ title, count, tone, items, emptyText, renderItem }) {
  const toneMap = {
    red: "border-white/10 bg-white/5 text-white/70",
    amber: "border-white/10 bg-white/5 text-white/70",
    blue: "border-white/10 bg-white/5 text-white/70",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white">{title}</p>
          <p className="text-xs text-white/50">Acciones prioritarias del evento</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-normal ${toneMap[tone] || toneMap.blue}`}>
          {count}
        </span>
      </div>

      {!items.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/60">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${title}-${index}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingList({ items, valueKey, labelKey, helperKey, emptyText, formatter }) {
  if (!items.length) {
    return <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/60">{emptyText}</div>;
  }

  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const width = Math.max((value / maxValue) * 100, value > 0 ? 8 : 0);
        const opacity = Math.max(1 - index * 0.1, 0.35);
        return (
          <div key={`${item[labelKey]}-${index}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
            <span className="w-5 text-center text-xs font-medium text-white/35 tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm text-white">
                <span className="truncate">{item[labelKey]}</span>
                <span className="shrink-0 text-white/65">{formatter ? formatter(value, item) : value}</span>
              </div>
              {helperKey ? <p className="text-xs text-white/40">{item[helperKey]}</p> : null}
              <div className="h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: `rgba(96, 165, 250, ${opacity})` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOverviewPanel({ onOpenProjects, onOpenStats }) {
  const [loading, setLoading] = useState(false);
  const [exportingPendingCsv, setExportingPendingCsv] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);

  const handleExportPendingCsv = useCallback(async () => {
    setExportingPendingCsv(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/v1/admin/estadisticas/alumnos-pendientes"), { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo obtener la lista de alumnos pendientes.");

      const payload = await res.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];

      const header = ["matricula", "nombre", "correo", "carrera", "semestre"];
      const escapeCsv = (value) => {
        const safe = String(value ?? "").replaceAll('"', '""');
        return `"${safe}"`;
      };

      const csv = [
        header.join(","),
        ...rows.map((row) => [
          escapeCsv(row.matricula),
          escapeCsv(row.nombre),
          escapeCsv(row.correo),
          escapeCsv(row.carrera),
          escapeCsv(row.semestre),
        ].join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `alumnos_pendientes_evento_${payload?.evento_id || "actual"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "No se pudo exportar alumnos pendientes.");
    } finally {
      setExportingPendingCsv(false);
    }
  }, []);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/v1/admin/estadisticas/overview"), { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar el resumen del evento.");
      setOverview(await res.json());
    } catch (err) {
      setError(err.message || "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const evento = overview?.evento || null;
  const resumen = overview?.resumen || {};
  const atencion = overview?.atencion || {};
  const series = overview?.series || {};

  const timelineData = useMemo(
    () => (Array.isArray(series.inscripciones_por_dia) ? series.inscripciones_por_dia : []).map((item) => ({
      ...item,
      label: formatTimelineLabel(item.timestamp),
      nuevas: Math.max(Number(item.cantidad_nueva || 0), 0),
      acumulado: Number(item.acumulado || 0),
    })),
    [series.inscripciones_por_dia]
  );

  const progressWidth = Math.min(Math.max(Number(resumen.porcentaje_avance || 0), 0), 100);

  return (
    <div className="space-y-6">
      <SectionCard
        title={evento ? `${evento.nombre} ${evento.anio || ""}`.trim() : "Pulso del evento"}
        subtitle={evento ? `${formatEventWindow(evento)} · ${evento.activo ? "Evento activo" : "Evento inactivo"}` : "Vista general del avance del evento"}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Avance del evento</p>
                <p className="mt-2 text-2xl font-normal text-white">
                  {resumen.total_inscritos ?? 0} de {resumen.total_alumnos_registrados ?? 0} alumnos ya tienen proyecto
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {resumen.total_pendientes ?? 0} siguen pendientes por colocar.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchOverview}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
              </button>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/65">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {formatPct(resumen.porcentaje_avance)} de avance
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Building2 className="h-3.5 w-3.5" /> {resumen.empresas_participantes ?? 0} empresas activas
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <BriefcaseBusiness className="h-3.5 w-3.5" /> {resumen.cupos_disponibles ?? 0} lugares disponibles
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <KpiCard
              label="Registrados"
              value={resumen.total_alumnos_registrados ?? 0}
              helper="Alumnos que sí entraron al proceso del evento"
            />
            <KpiCard
              label="Con Proyecto"
              value={resumen.total_inscritos ?? 0}
              helper="Ya colocados en un proyecto"
            />
            <KpiCard
              label="Pendientes"
              value={resumen.total_pendientes ?? 0}
              helper="Requieren seguimiento o contacto"
            />
            <KpiCard
              label="Proyectos Disponibles"
              value={resumen.proyectos_con_cupo ?? 0}
              helper={`${resumen.proyectos_totales ?? 0} proyectos en total`}
            />
          </div>
        </div>
      </SectionCard>

      {error ? (
        <div className="rounded-2xl border border-red-700 bg-red-600 px-4 py-3 text-sm text-white shadow-md">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Atención requerida"
          subtitle="Lo que conviene revisar hoy para que el evento siga fluyendo"
          actionLabel="Ir a proyectos"
          onAction={onOpenProjects}
          className="xl:col-span-2"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">Alumnos pendientes</p>
                  <p className="text-xs text-white/50">Reporte consolidado para seguimiento masivo</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-normal text-white/70">
                  {resumen.total_pendientes ?? 0}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm text-white/85">
                  En lugar de listar alumnos aquí, descarga el CSV completo para trabajar casos masivos.
                </p>
                <button
                  type="button"
                  onClick={handleExportPendingCsv}
                  disabled={exportingPendingCsv || Number(resumen.total_pendientes || 0) === 0}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" /> {exportingPendingCsv ? "Exportando..." : "Descargar CSV pendientes"}
                </button>
              </div>
            </div>

            <AttentionList
              title="Proyectos sin movimiento"
              count={resumen.proyectos_sin_movimiento ?? 0}
              tone="amber"
              items={atencion.proyectos_sin_movimiento || []}
              emptyText="Todos los proyectos ya recibieron al menos una inscripción."
              renderItem={(item) => (
                <div>
                  <p className="text-sm text-white">{item.proyecto}</p>
                  <p className="mt-1 text-xs text-white/55">{item.empresa}</p>
                  <p className="mt-2 text-xs text-white/70">0 de {item.capacidad_max} lugares ocupados</p>
                </div>
              )}
            />

            <AttentionList
              title="Proyectos por llenarse"
              count={resumen.proyectos_por_llenarse ?? 0}
              tone="blue"
              items={atencion.proyectos_por_llenarse || []}
              emptyText="No hay proyectos cercanos al límite de cupo."
              renderItem={(item) => (
                <div>
                  <p className="text-sm text-white">{item.proyecto}</p>
                  <p className="mt-1 text-xs text-white/55">{item.empresa}</p>
                  <p className="mt-2 text-xs text-white/70">
                    {item.cupo_actual} de {item.capacidad_max} lugares ocupados · {formatPct(item.ocupacion_pct)}
                  </p>
                </div>
              )}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Contexto rápido"
          subtitle="Lectura inmediata de capacidad y cobertura"
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Capacidad total</p>
              <p className="mt-2 text-2xl font-normal text-white">{resumen.capacidad_total ?? 0}</p>
              <p className="mt-1 text-sm text-white/60">Suma de todos los lugares disponibles en proyectos.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Lugares aún libres</p>
              <p className="mt-2 text-2xl font-normal text-white">{resumen.cupos_disponibles ?? 0}</p>
              <p className="mt-1 text-sm text-white/60">Espacios disponibles para mover pendientes.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Empresas participantes</p>
              <p className="mt-2 text-2xl font-normal text-white">{resumen.empresas_participantes ?? 0}</p>
              <p className="mt-1 text-sm text-white/60">Organizaciones activas dentro del evento actual.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Comportamiento de las inscripciones"
          subtitle="Nuevas inscripciones por día para ver si el ritmo del evento sigue activo"
          actionLabel="Ver estadísticas"
          onAction={onOpenStats}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                <XAxis dataKey="label" stroke="#cbd5e1" fontSize={11} />
                <YAxis stroke="#cbd5e1" fontSize={11} allowDecimals={false} />
                <Tooltip {...DARK_TOOLTIP_PROPS} formatter={(value, name) => [value, name === "nuevas" ? "Nuevas" : "Acumulado"]} />
                <Bar dataKey="nuevas" radius={[8, 8, 0, 0]}>
                  {timelineData.map((_, index) => (
                    <Cell key={`timeline-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Proyectos con más demanda"
          subtitle="Los puestos que se están llenando más rápido"
          actionLabel="Revisar cupos"
          onAction={onOpenProjects}
        >
          <RankingList
            items={series.proyectos_con_mas_demanda || []}
            valueKey="ocupacion_pct"
            labelKey="proyecto"
            helperKey="empresa"
            emptyText="Todavía no hay suficiente movimiento en proyectos para mostrar esta vista."
            formatter={(value, item) => `${formatPct(value)} · ${item.cupo_actual}/${item.capacidad_max}`}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Carreras con más alumnos pendientes"
          subtitle="Dónde conviene concentrar seguimiento o comunicación"
        >
          <RankingList
            items={series.carreras_con_pendientes || []}
            valueKey="pendientes"
            labelKey="carrera"
            helperKey="helper"
            emptyText="No hay pendientes por carrera para mostrar."
            formatter={(value, item) => `${value} pendientes de ${item.registrados}`}
          />
        </SectionCard>

        <SectionCard
          title="Empresas con más alumnos colocados"
          subtitle="Organizaciones que más están absorbiendo inscripciones"
        >
          <RankingList
            items={series.empresas_con_mas_inscritos || []}
            valueKey="cantidad_inscritos"
            labelKey="empresa"
            emptyText="Todavía no hay inscripciones suficientes para esta vista."
          />
        </SectionCard>
      </div>
    </div>
  );
}
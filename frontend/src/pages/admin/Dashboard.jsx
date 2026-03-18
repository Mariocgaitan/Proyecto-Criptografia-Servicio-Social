import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  LogOut, Building2, Calendar, Plus, LayoutDashboard,
  Users, TrendingUp, BarChart3,
  PieChart, Activity, ChevronRight, ChevronDown, Search, SlidersHorizontal,
  PanelLeftClose, PanelLeftOpen, Command, Trash2,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import tecLogo from "@/assets/tec_logo.png";
import campusImg1 from "@/assets/login_images/ser_social_header.png";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/importancia-servicio-social-tec-monterrey.jpg.webp";
import campusImg4 from "@/assets/login_images/profesorado-promotores-formacion-programa-servicio-social-tec-monterrey.jpg";

const campusImages = [campusImg1, campusImg2, campusImg3, campusImg4];

// ─── KPI Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtitle, color, index }) {
  const toneMap = {
    orange: "text-amber-200 bg-amber-400/10 border-amber-400/20",
    blue: "text-blue-200 bg-blue-500/10 border-blue-400/20",
    teal: "text-emerald-200 bg-emerald-500/10 border-emerald-400/20",
    purple: "text-violet-200 bg-violet-500/10 border-violet-400/20",
  };
  const tone = toneMap[color] || toneMap.blue;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}>
      <div className="rounded-2xl border border-white/15 bg-black/35 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors duration-300 hover:bg-black/45">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2 text-white/55">{label}</p>
            <p className="text-3xl font-extrabold tracking-tight text-white">{value}</p>
            <p className="text-xs mt-1.5 flex items-center gap-1 text-white/55">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              {subtitle}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${tone}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chart Placeholder ───────────────────────────────────────────
function ChartPlaceholder({ title, icon: Icon, colSpan = 1, height = "h-56" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} className={colSpan === 2 ? "md:col-span-2" : ""}>
      <div className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-sm text-white">{title}</h3>
          <button className="text-[11px] uppercase tracking-wider text-blue-300 hover:text-blue-200 font-semibold transition-colors">Ver todo</button>
        </div>
        <div className={`${height} flex flex-col items-center justify-center gap-3 px-5`}>
          <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/25 bg-black/25 flex items-center justify-center">
            <Icon className="w-7 h-7 text-white/40" />
          </div>
          <p className="text-sm font-medium text-white/70">Gráfica en desarrollo</p>
          <p className="text-[11px] text-white/35">Los datos se conectarán aquí próximamente</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────
function OccupancyBar({ current, max }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono font-bold w-16 text-right text-white/70">{current}/{max}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN DASHBOARD ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [availability, setAvailability] = useState("todas");
  const [empresaFilter, setEmpresaFilter] = useState("todas");
  const [sortMode, setSortMode] = useState("demanda");
  const [proyectosView, setProyectosView] = useState("all"); // "all" | "byEmpresa"
  const [expandedEmpresa, setExpandedEmpresa] = useState(null);

  // Modals Info
  const [isCrearProyectoOpen, setIsCrearProyectoOpen] = useState(false);
  const [isCrearEmpresaOpen, setIsCrearEmpresaOpen] = useState(false);
  const [isCrearEventoOpen, setIsCrearEventoOpen] = useState(false);
  const [cupoModalInfo, setCupoModalInfo] = useState(null);

  // Forms
  const [formProyecto, setFormProyecto] = useState({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
  const [formEmpresa, setFormEmpresa] = useState({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
  const [formEvento, setFormEvento] = useState({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
  const [nuevaCapacidad, setNuevaCapacidad] = useState(0);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [deletingInscripcionId, setDeletingInscripcionId] = useState(null);
  const [deleteModalInfo, setDeleteModalInfo] = useState(null);

  const fetchData = async () => {
    try {
      const [ps, es, evs] = await Promise.all([
        fetch(apiUrl("/api/v1/admin/proyectos"), { credentials: "include" }).then(res => res.json()),
        fetch(apiUrl("/api/v1/admin/empresas"), { credentials: "include" }).then(res => res.json()),
        fetch(apiUrl("/api/v1/admin/eventos"), { credentials: "include" }).then(res => res.json())
      ]);
      setProyectos(ps); setEmpresas(es); setEventos(evs);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % campusImages.length);
    }, 20000);
    return () => clearInterval(intervalId);
  }, []);

  // === HANDLERS ===
  const handleCrearProyecto = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch(apiUrl("/api/v1/admin/proyectos"), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          id_empresa: parseInt(formProyecto.id_empresa), id_evento: parseInt(formProyecto.id_evento),
          nombre_proyecto: formProyecto.nombre, descripcion: formProyecto.desc || null,
          capacidad_max: parseInt(formProyecto.cap_max), capacidad_espera_max: parseInt(formProyecto.espera)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear");
      setIsCrearProyectoOpen(false);
      setFormProyecto({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
      fetchData();
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleCrearEmpresa = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch(apiUrl("/api/v1/admin/empresas"), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id_asociado: formEmpresa.id_asociado, nombre_empresa: formEmpresa.nombre, razon_social: formEmpresa.razon, descripcion: formEmpresa.desc || null, calle: formEmpresa.calle || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setIsCrearEmpresaOpen(false); fetchData();
      setFormEmpresa({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleCrearEvento = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch(apiUrl("/api/v1/admin/eventos"), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ nombre: formEvento.nombre, periodo: formEvento.periodo, anio: parseInt(formEvento.anio), semestre: formEvento.semestre, activo: formEvento.activo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setIsCrearEventoOpen(false); fetchData();
      setFormEvento({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleGuardarCupo = async () => {
    if (!cupoModalInfo) return;
    setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/proyectos/${cupoModalInfo.id}/capacidad`), {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ nueva_capacidad_max: parseInt(nuevaCapacidad) })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setCupoModalInfo(null); fetchData();
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleEliminarInscripcion = async (alumno) => {
    if (!alumno?.id_inscripcion) return;

    setDeleteModalInfo(alumno);
  };

  const confirmarEliminarInscripcion = async () => {
    const alumno = deleteModalInfo;
    if (!alumno?.id_inscripcion) return;

    setDeletingInscripcionId(alumno.id_inscripcion);
    setErrorText("");

    try {
      const res = await fetch(apiUrl(`/api/v1/admin/inscripciones/${alumno.id_inscripcion}`), {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.mensaje || "No se pudo eliminar la inscripción");
      setDeleteModalInfo(null);
      await fetchData();
    } catch (err) {
      setErrorText(err.message || "No se pudo eliminar la inscripción");
    } finally {
      setDeletingInscripcionId(null);
    }
  };

  // Computed stats
  const totalAlumnos = proyectos.reduce((sum, p) => sum + (p.cupo_actual || 0), 0);
  const totalCapacidad = proyectos.reduce((sum, p) => sum + (p.capacidad_max || 0), 0);
  const eventosActivos = eventos.filter(e => e.activo).length;

  // Search filtering
  const q = searchQuery.toLowerCase().trim();
  const empresasEnProyectos = useMemo(() => {
    return [...new Set(proyectos.map((p) => p.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [proyectos]);

  const filteredProyectos = useMemo(() => {
    const base = proyectos.filter((p) => {
      const matchesQuery = !q
        || p.nombre_proyecto?.toLowerCase().includes(q)
        || p.empresa?.toLowerCase().includes(q)
        || p.descripcion?.toLowerCase().includes(q);

      const remaining = Math.max((p.capacidad_max || 0) - (p.cupo_actual || 0), 0);
      const isFull = (p.cupo_actual || 0) >= (p.capacidad_max || 0);
      const matchesAvailability =
        availability === "todas"
        || (availability === "disponibles" && !isFull)
        || (availability === "ultimos" && !isFull && remaining <= 2)
        || (availability === "llenos" && isFull);

      const matchesEmpresa = empresaFilter === "todas" || p.empresa === empresaFilter;

      return matchesQuery && matchesAvailability && matchesEmpresa;
    });

    base.sort((a, b) => {
      if (sortMode === "alfabetico") {
        return (a.nombre_proyecto || "").localeCompare(b.nombre_proyecto || "");
      }
      if (sortMode === "disponibilidad") {
        const remainingA = Math.max((a.capacidad_max || 0) - (a.cupo_actual || 0), 0);
        const remainingB = Math.max((b.capacidad_max || 0) - (b.cupo_actual || 0), 0);
        return remainingA - remainingB;
      }

      const demandScore = (project) => {
        const cap = project.capacidad_max || 0;
        const current = project.cupo_actual || 0;
        const pct = cap > 0 ? Math.round((current / cap) * 100) : 0;
        const remaining = Math.max(cap - current, 0);
        const isFull = current >= cap;
        return isFull ? 1000 : (pct * 2) + (remaining <= 2 ? 40 : remaining <= 5 ? 20 : 0);
      };

      return demandScore(b) - demandScore(a);
    });

    return base;
  }, [proyectos, q, availability, empresaFilter, sortMode]);

  const filteredEmpresas = q ? empresas.filter(e => e.nombre_empresa?.toLowerCase().includes(q) || e.razon_social?.toLowerCase().includes(q) || e.id_asociado?.toLowerCase().includes(q)) : empresas;
  const filteredEventos = q ? eventos.filter(e => e.nombre?.toLowerCase().includes(q) || e.periodo?.toLowerCase().includes(q)) : eventos;

  // Group projects by empresa
  const proyectosPorEmpresa = {};
  filteredProyectos.forEach(p => {
    const key = p.empresa || "Sin Empresa";
    if (!proyectosPorEmpresa[key]) proyectosPorEmpresa[key] = [];
    proyectosPorEmpresa[key].push(p);
  });

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const sectionMeta = {
    overview: {
      title: "Dashboard",
      description: "Resumen general del sistema",
    },
    estadisticas: {
      title: "Estadísticas",
      description: "Métricas operativas y tendencias del evento activo",
    },
    proyectos: {
      title: "Directorio de Proyectos",
      description: "Oferta de plazas para el Servicio Social",
    },
    empresas: {
      title: "Empresas",
      description: "Socios formadores autorizados",
    },
    eventos: {
      title: "Eventos",
      description: "Control de semestres e inscripciones",
    },
    gestion: {
      title: "Gestión de Empresas y Eventos",
      description: "Socios formadores, periodos académicos y registro operativo",
    },
  };

  const commandItems = useMemo(() => {
    const baseItems = [
      { id: "sec-overview", label: "Ir a Dashboard", hint: "Secciones", action: () => setActiveSection("overview") },
      { id: "sec-stats", label: "Ir a Estadísticas", hint: "Secciones", action: () => setActiveSection("estadisticas") },
      { id: "sec-projects", label: "Ir a Proyectos", hint: "Secciones", action: () => setActiveSection("proyectos") },
      { id: "sec-companies", label: "Ir a Empresas", hint: "Secciones", action: () => setActiveSection("empresas") },
      { id: "sec-events", label: "Ir a Eventos", hint: "Secciones", action: () => setActiveSection("eventos") },
      { id: "sec-manage", label: "Ir a Gestión Integral", hint: "Secciones", action: () => setActiveSection("gestion") },
      { id: "act-new-project", label: "Abrir: Registrar Proyecto", hint: "Acciones", action: () => { setActiveSection("proyectos"); setIsCrearProyectoOpen(true); } },
      { id: "act-new-company", label: "Abrir: Dar de Alta Organización", hint: "Acciones", action: () => { setActiveSection("gestion"); setIsCrearEmpresaOpen(true); } },
      { id: "act-new-event", label: "Abrir: Aperturar Periodo", hint: "Acciones", action: () => { setActiveSection("gestion"); setIsCrearEventoOpen(true); } },
      { id: "act-toggle-sidebar", label: sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral", hint: "Vista", action: () => setSidebarCollapsed((prev) => !prev) },
    ];

    const normalized = commandQuery.trim().toLowerCase();
    if (!normalized) return baseItems;

    return baseItems.filter((item) =>
      item.label.toLowerCase().includes(normalized)
      || item.hint.toLowerCase().includes(normalized)
    );
  }, [commandQuery, sidebarCollapsed]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const isOpenShortcut = (event.ctrlKey || event.metaKey) && (key === "t" || key === "k");

      if (isOpenShortcut) {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        return;
      }

      if (!commandOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveCommandIndex((prev) => {
          if (!commandItems.length) return 0;
          return (prev + 1) % commandItems.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveCommandIndex((prev) => {
          if (!commandItems.length) return 0;
          return (prev - 1 + commandItems.length) % commandItems.length;
        });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selected = commandItems[activeCommandIndex];
        if (selected) {
          selected.action();
          setCommandOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, commandItems, activeCommandIndex]);

  useEffect(() => {
    if (!commandOpen) {
      setCommandQuery("");
      setActiveCommandIndex(0);
    }
  }, [commandOpen]);

  useEffect(() => {
    setActiveCommandIndex(0);
  }, [commandQuery]);

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={currentBgIndex}
            src={campusImages[currentBgIndex]}
            alt="Campus"
            className="w-full h-full object-cover absolute inset-0"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "-100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0)_45%)]" />
      </div>

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-9 sm:h-11 w-auto brightness-0 invert drop-shadow-md" />
          <div>
            <p className="text-white/70 text-xs sm:text-sm font-semibold tracking-wide uppercase">Portal Administracion</p>
            <p className="text-white/45 text-[11px] sm:text-xs">Sistema de Servicio Social</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden lg:inline-flex items-center gap-2 p-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 hover:text-white transition-colors"
            title={sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Command palette"
          >
            <Command className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Ctrl+K / Ctrl+T</span>
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 p-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-red-500/10 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-semibold">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0">
        <aside className={`${sidebarCollapsed ? "hidden" : "hidden lg:block"} w-72 shrink-0 px-4 py-6`}>
          <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-3 space-y-4">
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Principal</p>
              <div className="mt-2 space-y-1">
                <button onClick={() => handleSectionChange("overview")} className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${activeSection === "overview" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}><span className="inline-flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</span></button>
                <button onClick={() => handleSectionChange("estadisticas")} className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${activeSection === "estadisticas" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}><span className="inline-flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Estadísticas</span></button>
                <button onClick={() => handleSectionChange("proyectos")} className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${activeSection === "proyectos" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}><span className="inline-flex items-center gap-2"><List className="w-4 h-4" /> Proyectos ({proyectos.length})</span></button>
              </div>
            </div>

            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Gestión</p>
              <div className="mt-2 space-y-1">
                <button onClick={() => handleSectionChange("empresas")} className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${activeSection === "empresas" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}><span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresas ({empresas.length})</span></button>
                <button onClick={() => handleSectionChange("eventos")} className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${activeSection === "eventos" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}><span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" /> Eventos ({eventos.length})</span></button>
                <button onClick={() => handleSectionChange("gestion")} className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${activeSection === "gestion" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}><span className="inline-flex items-center gap-2"><Activity className="w-4 h-4" /> Gestión Integral</span></button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {sidebarCollapsed ? (
          <div className="hidden lg:flex mb-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/10 text-white/70 hover:text-white"
            >
              <PanelLeftOpen className="w-4 h-4" /> Mostrar barra lateral
            </button>
          </div>
        ) : null}
        <div className="w-full">
          <div className="mb-6 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-4 sm:p-5 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                {sectionMeta[activeSection]?.title}
              </h2>
              <p className="text-xs sm:text-sm mt-0.5 text-white/60">
                {sectionMeta[activeSection]?.description}
              </p>
            </div>

            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                placeholder="Buscar proyectos, empresas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl text-sm w-full bg-white/10 border border-white/15 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => handleSectionChange("overview")} className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "overview" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Dashboard</button>
            <button onClick={() => handleSectionChange("estadisticas")} className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "estadisticas" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Estadísticas</button>
            <button onClick={() => handleSectionChange("proyectos")} className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "proyectos" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Proyectos ({proyectos.length})</button>
            <button onClick={() => handleSectionChange("empresas")} className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "empresas" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Empresas ({empresas.length})</button>
            <button onClick={() => handleSectionChange("eventos")} className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "eventos" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Eventos ({eventos.length})</button>
            <button onClick={() => handleSectionChange("gestion")} className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "gestion" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Gestión</button>
          </div>
        </div>

          <AnimatePresence mode="wait">
            {/* ─── OVERVIEW ────────────────────── */}
            {(activeSection === "overview" || activeSection === "estadisticas") && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard icon={BarChart3} label="Total Proyectos" value={proyectos.length} subtitle={`${totalCapacidad} plazas totales`} color="orange" index={0} />
                  <StatCard icon={Building2} label="Empresas" value={empresas.length} subtitle="Socios formadores activos" color="blue" index={1} />
                  <StatCard icon={Calendar} label="Eventos Activos" value={eventosActivos} subtitle={`de ${eventos.length} registrados`} color="teal" index={2} />
                  <StatCard icon={Users} label="Alumnos Inscritos" value={totalAlumnos} subtitle={`de ${totalCapacidad} capacidad`} color="purple" index={3} />
                </div>

                {/* Chart Placeholders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <ChartPlaceholder title="Ocupación por Proyecto" icon={BarChart3} />
                  <ChartPlaceholder title="Distribución por Empresa" icon={PieChart} />
                  <ChartPlaceholder title="Tendencia de Inscripciones" icon={Activity} />
                </div>

                {/* Project Summary Table */}
                {activeSection === "overview" ? (
                <div className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Resumen de Proyectos</h3>
                    <button
                      onClick={() => setActiveSection("proyectos")}
                      className="text-xs text-blue-300 hover:text-blue-200 font-medium flex items-center gap-1 transition-colors"
                    >
                      Ver todos <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-6 py-3 text-white/55">Proyecto</th>
                          <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3 text-white/55">Empresa</th>
                          <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3 text-white/55">Ocupación</th>
                          <th className="text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-3 text-white/55">Estatus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProyectos.slice(0, 5).map((p) => (
                          <tr key={p.id_proyecto} className="border-b last:border-0 border-white/10 transition-colors hover:bg-white/[0.03]">
                            <td className="px-6 py-3.5">
                              <p className="text-sm font-semibold text-white">{p.nombre_proyecto}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="text-sm text-white/70">{p.empresa}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <OccupancyBar current={p.cupo_actual} max={p.capacidad_max} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {p.cupo_actual >= p.capacidad_max ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-red-300 bg-red-500/10 border border-red-500/25">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!filteredProyectos.length && (
                          <tr>
                            <td colSpan={4} className="text-center py-12 text-sm text-white/45">{q ? 'Sin resultados para la búsqueda.' : 'No hay proyectos registrados aún.'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                ) : null}
              </motion.div>
            )}

            {/* ─── PROYECTOS ───────────────────── */}
            {activeSection === "proyectos" && (
              <motion.div key="proyectos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                {/* Header with view toggle and create button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl border border-white/15 bg-black/35">
                    <button onClick={() => setProyectosView('all')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${proyectosView === 'all' ? 'bg-blue-600/25 border border-blue-400/35 text-white' : 'text-white/65 hover:text-white'}`}>
                      <List className="w-3.5 h-3.5" /> Todos
                    </button>
                    <button onClick={() => setProyectosView('byEmpresa')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${proyectosView === 'byEmpresa' ? 'bg-blue-600/25 border border-blue-400/35 text-white' : 'text-white/65 hover:text-white'}`}>
                      <Building2 className="w-3.5 h-3.5" /> Por Empresa
                    </button>
                  </div>
                  <Dialog open={isCrearProyectoOpen} onOpenChange={setIsCrearProyectoOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]">
                        <Plus className="w-4 h-4 mr-2" /> Aperturar Puesto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl bg-slate-950/92 border border-white/15 text-white shadow-2xl backdrop-blur-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold tracking-tight text-white">Nuevo Puesto de Proyecto</DialogTitle>
                        <DialogDescription className="text-white/60">Configura la empresa anfitriona, el evento y su aforo.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCrearProyecto} className="space-y-5 mt-4">
                        {errorText && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm font-medium">{errorText}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Empresa Receptora</Label>
                            <Select required onValueChange={v => setFormProyecto({...formProyecto, id_empresa: v})}>
                              <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/15 text-white">
                                {empresas.map(e => <SelectItem key={e.id_empresa} value={e.id_empresa.toString()}>{e.nombre_empresa}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Evento Activo</Label>
                            <Select required onValueChange={v => setFormProyecto({...formProyecto, id_evento: v})}>
                              <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/15 text-white">
                                {eventos.filter(e => e.activo).map(ev => <SelectItem key={ev.id_evento} value={ev.id_evento.toString()}>{ev.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Título Oficial del Proyecto</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formProyecto.nombre} onChange={e => setFormProyecto({...formProyecto, nombre: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Descripción (Opcional)</Label>
                          <Input className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formProyecto.desc} onChange={e => setFormProyecto({...formProyecto, desc: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 p-4 rounded-xl border border-white/10">
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Límite de Alumnos</Label>
                            <Input type="number" required min="1" className="bg-white/10 border-white/15 text-white font-bold text-lg text-center" value={formProyecto.cap_max} onChange={e => setFormProyecto({...formProyecto, cap_max: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Espera Máx.</Label>
                            <Input type="number" min="0" className="bg-white/10 border-white/15 text-white font-bold text-lg text-center" value={formProyecto.espera} onChange={e => setFormProyecto({...formProyecto, espera: e.target.value})} />
                          </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg">Finalizar y Crear Proyecto</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 p-3 sm:p-4 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/55 font-semibold mr-1">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
                    </div>

                    {[
                      { key: "todas", label: "Todas" },
                      { key: "disponibles", label: "Disponibles" },
                      { key: "ultimos", label: "Ultimos lugares" },
                      { key: "llenos", label: "Llenos" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAvailability(item.key)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${availability === item.key ? "bg-blue-500/25 border-blue-400/40 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex gap-2 w-max">
                          <button
                            type="button"
                            onClick={() => setEmpresaFilter("todas")}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap ${empresaFilter === "todas" ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}
                          >
                            Todas las empresas
                          </button>
                          {empresasEnProyectos.map((empresa) => (
                            <button
                              key={empresa}
                              type="button"
                              onClick={() => setEmpresaFilter(empresa)}
                              className={`px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap ${empresaFilter === empresa ? "bg-cyan-500/20 border-cyan-400/35 text-cyan-100" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}
                            >
                              {empresa}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                      className="h-9 rounded-lg bg-white/10 border border-white/20 text-white text-xs px-2.5 focus:outline-none"
                    >
                      <option value="demanda" className="text-slate-900">Ordenar: Demanda</option>
                      <option value="disponibilidad" className="text-slate-900">Ordenar: Ultimos lugares</option>
                      <option value="alfabetico" className="text-slate-900">Ordenar: A-Z</option>
                    </select>
                  </div>
                </div>

                {/* ALL VIEW */}
                {proyectosView === 'all' && (
                  <div className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 bg-black/20">
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-6 py-3.5 text-white/55">Nombre del Proyecto</th>
                            <th className="text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-3.5 text-white/55">Ocupación</th>
                            <th className="text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-3.5 text-white/55">Estatus</th>
                            <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-6 py-3.5 text-white/55">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProyectos?.map((p) => (
                            <tr key={p.id_proyecto} className="border-b last:border-0 transition-colors group border-white/10 hover:bg-white/[0.03]">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-sm transition-colors text-white group-hover:text-blue-200">{p.nombre_proyecto}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Building2 className="w-3 h-3 text-blue-400" />
                                  <p className="text-xs text-white/55">{p.empresa}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4"><div className="flex justify-center"><OccupancyBar current={p.cupo_actual} max={p.capacidad_max} /></div></td>
                              <td className="px-4 py-4 text-center">
                                {p.cupo_actual >= p.capacidad_max ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-red-300 bg-red-500/10 border border-red-500/25"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-emerald-300 bg-emerald-500/10 border border-emerald-500/25"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => { setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max }); setNuevaCapacidad(p.capacidad_max + 1); }} className="text-xs font-semibold text-blue-200 hover:text-white bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 px-3 py-1.5 rounded-lg transition-colors">+ Cupo</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!filteredProyectos.length && (
                            <tr><td colSpan={4} className="text-center py-16 text-sm text-white/45">{q ? 'Sin resultados.' : 'No hay proyectos registrados.'}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* BY EMPRESA VIEW */}
                {proyectosView === 'byEmpresa' && (
                  <div className="space-y-4">
                    {Object.entries(proyectosPorEmpresa).map(([empresaName, proys]) => (
                      <div key={empresaName} className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden transition-all">
                        <button
                          onClick={() => setExpandedEmpresa(expandedEmpresa === empresaName ? null : empresaName)}
                          className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-300 border border-blue-400/25">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm text-white">{empresaName}</p>
                              <p className="text-xs text-white/55">{proys.length} proyecto{proys.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-white/10 text-white/75 border border-white/10">
                              {proys.reduce((s, p) => s + (p.cupo_actual||0), 0)}/{proys.reduce((s, p) => s + (p.capacidad_max||0), 0)} plazas
                            </span>
                            <motion.div animate={{ rotate: expandedEmpresa === empresaName ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-white/55" />
                            </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedEmpresa === empresaName && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                              <div className="border-t border-white/10">
                                {proys.map(p => (
                                  <div key={p.id_proyecto} className="px-6 py-3.5 border-b last:border-0 transition-colors border-white/10 hover:bg-white/[0.03]">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">{p.nombre_proyecto}</p>
                                      </div>
                                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                                        <div className="w-full md:w-40"><OccupancyBar current={p.cupo_actual} max={p.capacidad_max} /></div>
                                        {p.cupo_actual >= p.capacidad_max ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full w-24 justify-center text-red-300 bg-red-500/10 border border-red-500/25"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno</span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full w-24 justify-center text-emerald-300 bg-emerald-500/10 border border-emerald-500/25"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible</span>
                                        )}
                                        <div className="flex gap-1.5">
                                          <button onClick={() => { setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max }); setNuevaCapacidad(p.capacidad_max + 1); }} className="text-xs font-semibold text-blue-200 bg-blue-500/15 border border-blue-400/30 px-2.5 py-1 rounded-lg">+ Cupo</button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 rounded-xl border border-white/10 bg-black/25 overflow-hidden">
                                      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Alumnos enrolados</p>
                                        <p className="text-xs text-white/55">{Array.isArray(p.alumnos_inscritos) ? p.alumnos_inscritos.length : 0}</p>
                                      </div>

                                      {Array.isArray(p.alumnos_inscritos) && p.alumnos_inscritos.length > 0 ? (
                                        <div className="overflow-x-auto">
                                          <table className="w-full min-w-[640px]">
                                            <thead>
                                              <tr className="border-b border-white/10">
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">Alumno</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">Matricula</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">Carrera</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">Correo</th>
                                                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">Accion</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {p.alumnos_inscritos.map((alumno) => (
                                                <tr key={alumno.id_inscripcion || `${p.id_proyecto}-${alumno.matricula}`} className="border-b last:border-0 border-white/10">
                                                  <td className="px-3 py-2 text-sm text-white/85">{alumno.nombre || "--"}</td>
                                                  <td className="px-3 py-2 text-xs font-mono text-white/70">{alumno.matricula || "--"}</td>
                                                  <td className="px-3 py-2 text-xs text-white/70">{alumno.carrera || "--"}</td>
                                                  <td className="px-3 py-2 text-xs text-white/65">{alumno.correo || "--"}</td>
                                                  <td className="px-3 py-2 text-right">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleEliminarInscripcion(alumno)}
                                                      disabled={deletingInscripcionId === alumno.id_inscripcion}
                                                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                      {deletingInscripcionId === alumno.id_inscripcion ? "Eliminando..." : "Eliminar"}
                                                    </button>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <div className="px-3 py-4 text-xs text-white/45">Este proyecto no tiene alumnos inscritos todavia.</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                    {!Object.keys(proyectosPorEmpresa).length && (
                      <div className="text-center py-16 text-sm rounded-2xl border border-white/15 bg-black/35 text-white/45">{q ? 'Sin resultados.' : 'No hay proyectos registrados.'}</div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── EMPRESAS ────────────────────── */}
            {(activeSection === "gestion" || activeSection === "empresas") && (
              <motion.div
                key="empresas"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      setActiveSection("proyectos");
                      setIsCrearProyectoOpen(true);
                    }}
                    className="border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 font-semibold px-5 py-5 rounded-xl shadow-none transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Registrar Proyecto
                  </Button>

                  <Dialog open={isCrearEmpresaOpen} onOpenChange={setIsCrearEmpresaOpen}>
                    <DialogTrigger asChild>
                      <Button className="border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 font-semibold px-5 py-5 rounded-xl shadow-none transition-colors">
                        <Building2 className="w-4 h-4 mr-2" /> Dar de Alta Organización
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
                      <DialogHeader><DialogTitle className="text-xl font-extrabold tracking-tight text-white">Registrar Socio Formador</DialogTitle></DialogHeader>
                      <form onSubmit={handleCrearEmpresa} className="space-y-4 mt-2">
                        {errorText && <div className="text-sm text-red-200 bg-red-500/10 p-2 rounded border border-red-500/30">{errorText}</div>}
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">ID Asociado / Convenio</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.id_asociado} onChange={e => setFormEmpresa({...formEmpresa, id_asociado: e.target.value})} placeholder="Ej. SF-XXX24" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Nombre Público (Comercial)</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.nombre} onChange={e => setFormEmpresa({...formEmpresa, nombre: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Denominación Legal (Razón Social)</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.razon} onChange={e => setFormEmpresa({...formEmpresa, razon: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Descripción de Giro Corporativo</Label>
                          <Input className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.desc} onChange={e => setFormEmpresa({...formEmpresa, desc: e.target.value})} />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 font-bold mt-4">Matricular Entidad</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Empresas registradas</p>
                  </div>
                  {filteredEmpresas?.map((emp, i) => (
                    <motion.div key={emp.id_empresa} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
                      <div className="px-5 py-4 border-b last:border-0 border-white/10 hover:bg-white/[0.03] transition-colors">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-300 border border-blue-400/25">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-white truncate">{emp.nombre_empresa}</p>
                              <p className="text-xs text-white/55 truncate">{emp.descripcion || "Organización receptora con convenio vigente."}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-white/65 bg-white/10 border border-white/10">#{emp.id_asociado}</span>
                            {emp.razon_social ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md text-blue-200 bg-blue-500/15 border border-blue-400/25">{emp.razon_social}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── EVENTOS ─────────────────────── */}
            {(activeSection === "gestion" || activeSection === "eventos") && (
              <motion.div
                key="eventos"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-end">
                  <Dialog open={isCrearEventoOpen} onOpenChange={setIsCrearEventoOpen}>
                    <DialogTrigger asChild>
                      <Button className="border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 font-semibold px-5 py-5 rounded-xl shadow-none transition-colors">
                        <Calendar className="w-4 h-4 mr-2" /> Aperturar Periodo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
                      <DialogHeader><DialogTitle className="text-xl font-extrabold tracking-tight text-white">Inaugurar Semestre</DialogTitle></DialogHeader>
                      <form onSubmit={handleCrearEvento} className="space-y-4 mt-2">
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Distintivo del Periodo</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEvento.nombre} onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} placeholder="Ej. Feria Institucional SJR" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Ciclo</Label>
                            <Select value={formEvento.periodo} onValueChange={v => setFormEvento({...formEvento, periodo: v})}>
                              <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue/></SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/15 text-white">
                                {["FEBRERO-JUNIO", "AGOSTO-DICIEMBRE", "VERANO", "INVIERNO"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Año</Label>
                            <Input type="number" required className="bg-white/10 border-white/15 text-white text-center font-bold" value={formEvento.anio} onChange={e => setFormEvento({...formEvento, anio: e.target.value})} />
                          </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 font-bold mt-4">Emitir Apertura Global</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Periodos y eventos</p>
                  </div>
                  {filteredEventos?.map((ev, i) => (
                    <motion.div key={ev.id_evento} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
                      <div className="px-5 py-4 border-b last:border-0 border-white/10 hover:bg-white/[0.03] transition-colors">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ev.activo ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-white/10 text-white/55 border border-white/10'}`}>
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white">{ev.nombre}</h4>
                              <p className="text-xs text-white/55 uppercase tracking-wide">{ev.periodo} {ev.anio} - {ev.semestre}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-start sm:justify-end">
                            {ev.activo ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> En Curso
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-white/55 bg-white/10 border border-white/10">
                                Archivado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      </div>

      {/* ═══════════ GLOBAL MODALS ═══════════ */}
      {/* Cupo Modal */}
      <Dialog open={!!cupoModalInfo} onOpenChange={open => !open && setCupoModalInfo(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">Ampliar Cupo</DialogTitle>
            <DialogDescription className="text-white/60">{cupoModalInfo?.nombre}</DialogDescription>
          </DialogHeader>
          {errorText && <p className="text-red-200 text-sm">{errorText}</p>}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Máximo Actual</Label>
              <Input disabled value={cupoModalInfo?.max || 0} className="bg-white/5 border-white/10 text-white/45" />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-[11px] font-semibold uppercase tracking-wider">Nueva Capacidad</Label>
              <Input type="number" min={(cupoModalInfo?.max || 0) + 1} value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} className="bg-blue-500/10 border-blue-400/30 text-blue-100 focus-visible:ring-blue-500 text-lg font-bold" />
            </div>
          </div>
          <Button onClick={handleGuardarCupo} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">Salvar Ajuste</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteModalInfo} onOpenChange={(open) => !open && setDeleteModalInfo(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">Confirmar baja de registro</DialogTitle>
            <DialogDescription className="text-white/60">Esta acción quitará al alumno del proyecto y liberará su cupo.</DialogDescription>
          </DialogHeader>
          {errorText && <p className="text-red-200 text-sm">{errorText}</p>}
          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white/80">
            <p className="font-semibold text-white">{deleteModalInfo?.nombre || "Alumno"}</p>
            <p className="text-xs text-white/60 mt-1">Matrícula: {deleteModalInfo?.matricula || "--"}</p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setDeleteModalInfo(null)}
              disabled={deletingInscripcionId === deleteModalInfo?.id_inscripcion}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="border border-red-400/35 bg-red-500/20 text-red-100 hover:bg-red-500/30"
              onClick={confirmarEliminarInscripcion}
              disabled={deletingInscripcionId === deleteModalInfo?.id_inscripcion}
            >
              {deletingInscripcionId === deleteModalInfo?.id_inscripcion ? "Eliminando..." : "Confirmar baja"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <footer className="relative z-20 border-t border-white/10 bg-black/30 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p className="text-white/50 uppercase tracking-wider font-semibold">Panel Administrativo</p>
          <p className="text-white/40">Servicio Social Tec - Ecosistema Unificado</p>
        </div>
      </footer>

      {commandOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/55 backdrop-blur-sm" onClick={() => setCommandOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  autoFocus
                  type="text"
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Buscar comando (secciones, acciones, vista)..."
                  className="w-full h-11 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {commandItems.length > 0 ? commandItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    setCommandOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${idx === activeCommandIndex ? "bg-white/12" : "hover:bg-white/10"}`}
                >
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-[11px] text-white/45 uppercase tracking-wider">{item.hint}</p>
                </button>
              )) : (
                <div className="px-3 py-6 text-sm text-white/45">Sin comandos que coincidan.</div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/10 text-[11px] text-white/45 uppercase tracking-wider">
              Navegación: ↑ ↓ Enter - Abrir: Ctrl+K / Ctrl+T - Cerrar: Esc
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

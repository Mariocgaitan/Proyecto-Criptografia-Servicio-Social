import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  LogOut, LayoutDashboard, Building2, Calendar, Plus, RefreshCw,
  Copy, Check, QrCode, Users, TrendingUp, BarChart3,
  PieChart, Activity, ChevronRight, ChevronDown, Search, Bell,
  Settings, Sun, Moon, List
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

// ─── Sidebar Nav Item ────────────────────────────────────────────
function SidebarItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
        ${active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25"
          : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-blue-400"}`} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-400"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── KPI Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtitle, color, index, dark }) {
  const lightMap = {
    orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", border: "border-orange-100" },
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-600",     border: "border-blue-100" },
    teal:   { bg: "bg-teal-50",   icon: "bg-teal-100 text-teal-600",     border: "border-teal-100" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", border: "border-purple-100" },
  };
  const darkMap = {
    orange: { bg: "bg-orange-950/30", icon: "bg-orange-900/40 text-orange-400", border: "border-orange-900/30" },
    blue:   { bg: "bg-blue-950/30",   icon: "bg-blue-900/40 text-blue-400",     border: "border-blue-900/30" },
    teal:   { bg: "bg-teal-950/30",   icon: "bg-teal-900/40 text-teal-400",     border: "border-teal-900/30" },
    purple: { bg: "bg-purple-950/30", icon: "bg-purple-900/40 text-purple-400", border: "border-purple-900/30" },
  };
  const c = (dark ? darkMap : lightMap)[color] || (dark ? darkMap : lightMap).blue;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}>
      <div className={`${c.bg} border ${c.border} rounded-2xl p-5 hover:shadow-lg transition-shadow duration-300`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
            <p className={`text-3xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>{value}</p>
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              {subtitle}
            </p>
          </div>
          <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chart Placeholder ───────────────────────────────────────────
function ChartPlaceholder({ title, icon: Icon, colSpan = 1, height = "h-56", dark }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} className={colSpan === 2 ? "md:col-span-2" : ""}>
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-semibold text-sm ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{title}</h3>
          <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">Ver todo</button>
        </div>
        <div className={`${height} flex flex-col items-center justify-center gap-3 px-5`}>
          <div className={`w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center ${dark ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <Icon className={`w-7 h-7 ${dark ? 'text-slate-500' : 'text-slate-300'}`} />
          </div>
          <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Gráfica en desarrollo</p>
          <p className={`text-[11px] ${dark ? 'text-slate-600' : 'text-slate-300'}`}>Los datos se conectarán aquí próximamente</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────
function OccupancyBar({ current, max, dark }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold w-16 text-right ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{current}/{max}</span>
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
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [proyectosView, setProyectosView] = useState("all"); // "all" | "byEmpresa"
  const [expandedEmpresa, setExpandedEmpresa] = useState(null);

  // Modals Info
  const [isCrearProyectoOpen, setIsCrearProyectoOpen] = useState(false);
  const [isCrearEmpresaOpen, setIsCrearEmpresaOpen] = useState(false);
  const [isCrearEventoOpen, setIsCrearEventoOpen] = useState(false);
  const [cupoModalInfo, setCupoModalInfo] = useState(null);
  const [credsModalInfo, setCredsModalInfo] = useState(null);

  // Forms
  const [formProyecto, setFormProyecto] = useState({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
  const [formEmpresa, setFormEmpresa] = useState({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
  const [formEvento, setFormEvento] = useState({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
  const [nuevaCapacidad, setNuevaCapacidad] = useState(0);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [copiedField, setCopiedField] = useState(null);

  const fetchData = async () => {
    try {
      const [ps, es, evs] = await Promise.all([
        fetch("http://localhost:8000/api/v1/admin/proyectos", { credentials: "include" }).then(res => res.json()),
        fetch("http://localhost:8000/api/v1/admin/empresas", { credentials: "include" }).then(res => res.json()),
        fetch("http://localhost:8000/api/v1/admin/eventos", { credentials: "include" }).then(res => res.json())
      ]);
      setProyectos(ps); setEmpresas(es); setEventos(evs);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // === HANDLERS ===
  const handleCrearProyecto = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/proyectos", {
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
      setCredsModalInfo({ nombre: data.nombre_proyecto, correo: data.credenciales.correo, password: data.credenciales.password });
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleCrearEmpresa = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/empresas", {
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
      const res = await fetch("http://localhost:8000/api/v1/admin/eventos", {
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
      const res = await fetch(`http://localhost:8000/api/v1/admin/proyectos/${cupoModalInfo.id}/capacidad`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ nueva_capacidad_max: parseInt(nuevaCapacidad) })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setCupoModalInfo(null); fetchData();
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleRegenerarCreds = async (id, nombre) => {
    if (!confirm(`¿Regenerar contraseña para: ${nombre}? La anterior dejará de funcionar.`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/proyectos/${id}/credenciales`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Fallo de red");
      const data = await res.json();
      setCredsModalInfo({ nombre, correo: data.correo, password: data.password });
    } catch(err) { alert(err.message); }
  };

  // Computed stats
  const totalAlumnos = proyectos.reduce((sum, p) => sum + (p.cupo_actual || 0), 0);
  const totalCapacidad = proyectos.reduce((sum, p) => sum + (p.capacidad_max || 0), 0);
  const eventosActivos = eventos.filter(e => e.activo).length;

  // Search filtering
  const q = searchQuery.toLowerCase().trim();
  const filteredProyectos = q ? proyectos.filter(p => p.nombre_proyecto?.toLowerCase().includes(q) || p.empresa?.toLowerCase().includes(q)) : proyectos;
  const filteredEmpresas = q ? empresas.filter(e => e.nombre_empresa?.toLowerCase().includes(q) || e.razon_social?.toLowerCase().includes(q) || e.id_asociado?.toLowerCase().includes(q)) : empresas;
  const filteredEventos = q ? eventos.filter(e => e.nombre?.toLowerCase().includes(q) || e.periodo?.toLowerCase().includes(q)) : eventos;

  // Group projects by empresa
  const proyectosPorEmpresa = {};
  filteredProyectos.forEach(p => {
    const key = p.empresa || "Sin Empresa";
    if (!proyectosPorEmpresa[key]) proyectosPorEmpresa[key] = [];
    proyectosPorEmpresa[key].push(p);
  });

  // Dark mode classes
  const dm = darkMode;

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${dm ? 'dark-dashboard' : ''}`} style={{ fontFamily: "'Geist Variable', sans-serif" }}>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside className={`w-[260px] flex-shrink-0 flex flex-col border-r transition-colors duration-300 ${dm ? 'bg-[#0a0e1a] border-slate-800' : 'bg-[#0f172a] border-slate-800'}`}>
        {/* Brand */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-none">Centro de Control</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">Servicio Social</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Principal</p>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeSection === "overview"} onClick={() => setActiveSection("overview")} />
          <SidebarItem icon={BarChart3} label="Proyectos" active={activeSection === "proyectos"} onClick={() => setActiveSection("proyectos")} badge={proyectos.length || null} />

          <p className="px-4 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Administración</p>
          <SidebarItem icon={Building2} label="Empresas" active={activeSection === "empresas"} onClick={() => setActiveSection("empresas")} badge={empresas.length || null} />
          <SidebarItem icon={Calendar} label="Eventos" active={activeSection === "eventos"} onClick={() => setActiveSection("eventos")} badge={eventosActivos || null} />
        </nav>

        {/* User Card */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {user?.nombre?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold truncate">{user?.nombre || "Admin"}</p>
              <p className="text-[10px] text-slate-500 font-medium">Superadmin</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${dm ? 'bg-[#111827]' : ''}`} style={!dm ? { backgroundColor: "#f8f6f1" } : undefined}>
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 backdrop-blur-xl border-b px-8 py-4 transition-colors duration-300 ${dm ? 'bg-[#1f2937]/80 border-slate-700' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>
                {activeSection === "overview" && "Dashboard"}
                {activeSection === "proyectos" && "Directorio de Proyectos"}
                {activeSection === "empresas" && "Afiliación Corporativa"}
                {activeSection === "eventos" && "Periodos Académicos"}
              </h2>
              <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-400'}`}>
                {activeSection === "overview" && "Resumen general del sistema"}
                {activeSection === "proyectos" && "Oferta de plazas para el Servicio Social"}
                {activeSection === "empresas" && "Socios formadores autorizados"}
                {activeSection === "eventos" && "Control de semestres e inscripciones"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar proyectos, empresas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-64 transition-all ${dm ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-700 placeholder:text-slate-400'}`}
                />
              </div>
              <button
                onClick={() => setDarkMode(!dm)}
                className={`p-2.5 rounded-xl border transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                title={dm ? 'Modo Claro' : 'Modo Oscuro'}
              >
                {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button className={`p-2.5 rounded-xl border transition-colors relative ${dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* ─── OVERVIEW ────────────────────── */}
            {activeSection === "overview" && (
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
                  <StatCard icon={BarChart3} label="Total Proyectos" value={proyectos.length} subtitle={`${totalCapacidad} plazas totales`} color="orange" index={0} dark={dm} />
                  <StatCard icon={Building2} label="Empresas" value={empresas.length} subtitle="Socios formadores activos" color="blue" index={1} dark={dm} />
                  <StatCard icon={Calendar} label="Eventos Activos" value={eventosActivos} subtitle={`de ${eventos.length} registrados`} color="teal" index={2} dark={dm} />
                  <StatCard icon={Users} label="Alumnos Inscritos" value={totalAlumnos} subtitle={`de ${totalCapacidad} capacidad`} color="purple" index={3} dark={dm} />
                </div>

                {/* Chart Placeholders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <ChartPlaceholder title="Ocupación por Proyecto" icon={BarChart3} dark={dm} />
                  <ChartPlaceholder title="Distribución por Empresa" icon={PieChart} dark={dm} />
                  <ChartPlaceholder title="Tendencia de Inscripciones" icon={Activity} dark={dm} />
                </div>

                {/* Project Summary Table */}
                <div className={`rounded-2xl border shadow-sm overflow-hidden ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className={`flex items-center justify-between px-6 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h3 className={`font-semibold ${dm ? 'text-slate-200' : 'text-slate-700'}`}>Resumen de Proyectos</h3>
                    <button
                      onClick={() => setActiveSection("proyectos")}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                    >
                      Ver todos <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-50'}`}>
                          <th className={`text-left text-[11px] font-semibold uppercase tracking-wider px-6 py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Proyecto</th>
                          <th className={`text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Empresa</th>
                          <th className={`text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Ocupación</th>
                          <th className={`text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Estatus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProyectos.slice(0, 5).map((p) => (
                          <tr key={p.id_proyecto} className={`border-b last:border-0 transition-colors ${dm ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                            <td className="px-6 py-3.5">
                              <p className={`text-sm font-semibold ${dm ? 'text-slate-200' : 'text-slate-700'}`}>{p.nombre_proyecto}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{p.empresa}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <OccupancyBar current={p.cupo_actual} max={p.capacidad_max} dark={dm} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {p.cupo_actual >= p.capacidad_max ? (
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${dm ? 'text-red-400 bg-red-900/30 border border-red-800/30' : 'text-red-600 bg-red-50 border border-red-100'}`}>
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${dm ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-800/30' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}>
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!filteredProyectos.length && (
                          <tr>
                            <td colSpan={4} className={`text-center py-12 text-sm ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{q ? 'Sin resultados para la búsqueda.' : 'No hay proyectos registrados aún.'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── PROYECTOS ───────────────────── */}
            {activeSection === "proyectos" && (
              <motion.div key="proyectos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                {/* Header with view toggle and create button */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1 p-1 rounded-xl border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    <button onClick={() => setProyectosView('all')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${proyectosView === 'all' ? (dm ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm') : (dm ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>
                      <List className="w-3.5 h-3.5" /> Todos
                    </button>
                    <button onClick={() => setProyectosView('byEmpresa')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${proyectosView === 'byEmpresa' ? (dm ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm') : (dm ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>
                      <Building2 className="w-3.5 h-3.5" /> Por Empresa
                    </button>
                  </div>
                  <Dialog open={isCrearProyectoOpen} onOpenChange={setIsCrearProyectoOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]">
                        <Plus className="w-4 h-4 mr-2" /> Aperturar Puesto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl bg-white border border-slate-200 text-slate-900 shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Nuevo Puesto de Proyecto</DialogTitle>
                        <DialogDescription className="text-slate-500">Configura la empresa anfitriona, el evento y su aforo.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCrearProyecto} className="space-y-5 mt-4">
                        {errorText && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">{errorText}</div>}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Empresa Receptora</Label>
                            <Select required onValueChange={v => setFormProyecto({...formProyecto, id_empresa: v})}>
                              <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-900">
                                {empresas.map(e => <SelectItem key={e.id_empresa} value={e.id_empresa.toString()} className="hover:bg-slate-50 cursor-pointer">{e.nombre_empresa}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Evento Activo</Label>
                            <Select required onValueChange={v => setFormProyecto({...formProyecto, id_evento: v})}>
                              <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-900">
                                {eventos.filter(e => e.activo).map(ev => <SelectItem key={ev.id_evento} value={ev.id_evento.toString()} className="hover:bg-slate-50 cursor-pointer">{ev.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 text-sm">Título Oficial del Proyecto</Label>
                          <Input required className="bg-slate-50 border-slate-200" value={formProyecto.nombre} onChange={e => setFormProyecto({...formProyecto, nombre: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 text-sm">Descripción (Opcional)</Label>
                          <Input className="bg-slate-50 border-slate-200" value={formProyecto.desc} onChange={e => setFormProyecto({...formProyecto, desc: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Límite de Alumnos</Label>
                            <Input type="number" required min="1" className="bg-white border-slate-200 font-bold text-lg text-center" value={formProyecto.cap_max} onChange={e => setFormProyecto({...formProyecto, cap_max: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Espera Máx.</Label>
                            <Input type="number" min="0" className="bg-white border-slate-200 font-bold text-lg text-center" value={formProyecto.espera} onChange={e => setFormProyecto({...formProyecto, espera: e.target.value})} />
                          </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg">Finalizar e Instanciar Credenciales</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* ALL VIEW */}
                {proyectosView === 'all' && (
                  <div className={`rounded-2xl border shadow-sm overflow-hidden ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={`border-b ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                            <th className={`text-left text-[11px] font-semibold uppercase tracking-wider px-6 py-3.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Nombre del Proyecto</th>
                            <th className={`text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-3.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Ocupación</th>
                            <th className={`text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-3.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Estatus</th>
                            <th className={`text-right text-[11px] font-semibold uppercase tracking-wider px-6 py-3.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProyectos?.map((p) => (
                            <tr key={p.id_proyecto} className={`border-b last:border-0 transition-colors group ${dm ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-blue-50/30'}`}>
                              <td className="px-6 py-4">
                                <p className={`font-semibold text-sm transition-colors ${dm ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{p.nombre_proyecto}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Building2 className="w-3 h-3 text-blue-400" />
                                  <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{p.empresa}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4"><div className="flex justify-center"><OccupancyBar current={p.cupo_actual} max={p.capacidad_max} dark={dm} /></div></td>
                              <td className="px-4 py-4 text-center">
                                {p.cupo_actual >= p.capacidad_max ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${dm ? 'text-red-400 bg-red-900/30 border border-red-800/30' : 'text-red-600 bg-red-50 border border-red-100'}`}><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno</span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${dm ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-800/30' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => { setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max }); setNuevaCapacidad(p.capacidad_max + 1); }} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors">+ Cupo</button>
                                  <button onClick={() => handleRegenerarCreds(p.id_proyecto, p.nombre_proyecto)} className="text-xs font-semibold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Re-Keys</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!filteredProyectos.length && (
                            <tr><td colSpan={4} className={`text-center py-16 text-sm ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{q ? 'Sin resultados.' : 'No hay proyectos registrados.'}</td></tr>
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
                      <div key={empresaName} className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                        <button
                          onClick={() => setExpandedEmpresa(expandedEmpresa === empresaName ? null : empresaName)}
                          className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${dm ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dm ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className={`font-bold text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>{empresaName}</p>
                              <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{proys.length} proyecto{proys.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md ${dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {proys.reduce((s, p) => s + (p.cupo_actual||0), 0)}/{proys.reduce((s, p) => s + (p.capacidad_max||0), 0)} plazas
                            </span>
                            <motion.div animate={{ rotate: expandedEmpresa === empresaName ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className={`w-4 h-4 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                            </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedEmpresa === empresaName && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                              <div className={`border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                                {proys.map(p => (
                                  <div key={p.id_proyecto} className={`flex items-center justify-between px-6 py-3.5 border-b last:border-0 transition-colors ${dm ? 'border-slate-700/50 hover:bg-slate-700/20' : 'border-slate-50 hover:bg-blue-50/20'}`}>
                                    <div className="flex-1">
                                      <p className={`text-sm font-semibold ${dm ? 'text-slate-200' : 'text-slate-700'}`}>{p.nombre_proyecto}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="w-40"><OccupancyBar current={p.cupo_actual} max={p.capacidad_max} dark={dm} /></div>
                                      {p.cupo_actual >= p.capacidad_max ? (
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full w-24 justify-center ${dm ? 'text-red-400 bg-red-900/30' : 'text-red-600 bg-red-50 border border-red-100'}`}><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno</span>
                                      ) : (
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full w-24 justify-center ${dm ? 'text-emerald-400 bg-emerald-900/30' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible</span>
                                      )}
                                      <div className="flex gap-1.5">
                                        <button onClick={() => { setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max }); setNuevaCapacidad(p.capacidad_max + 1); }} className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">+ Cupo</button>
                                        <button onClick={() => handleRegenerarCreds(p.id_proyecto, p.nombre_proyecto)} className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Re-Keys</button>
                                      </div>
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
                      <div className={`text-center py-16 text-sm rounded-2xl border ${dm ? 'text-slate-500 bg-slate-800/50 border-slate-700' : 'text-slate-400 bg-white border-slate-100'}`}>{q ? 'Sin resultados.' : 'No hay proyectos registrados.'}</div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── EMPRESAS ────────────────────── */}
            {activeSection === "empresas" && (
              <motion.div
                key="empresas"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-end">
                  <Dialog open={isCrearEmpresaOpen} onOpenChange={setIsCrearEmpresaOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]">
                        <Building2 className="w-4 h-4 mr-2" /> Dar de Alta Organización
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-white border border-slate-200 text-slate-900">
                      <DialogHeader><DialogTitle className="text-xl font-bold text-slate-800">Registrar Socio Formador</DialogTitle></DialogHeader>
                      <form onSubmit={handleCrearEmpresa} className="space-y-4 mt-2">
                        {errorText && <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{errorText}</div>}
                        <div className="space-y-1">
                          <Label className="text-slate-600 text-sm">ID Asociado / Convenio</Label>
                          <Input required className="bg-slate-50 border-slate-200" value={formEmpresa.id_asociado} onChange={e => setFormEmpresa({...formEmpresa, id_asociado: e.target.value})} placeholder="Ej. SF-XXX24" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-600 text-sm">Nombre Público (Comercial)</Label>
                          <Input required className="bg-slate-50 border-slate-200" value={formEmpresa.nombre} onChange={e => setFormEmpresa({...formEmpresa, nombre: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-600 text-sm">Denominación Legal (Razón Social)</Label>
                          <Input required className="bg-slate-50 border-slate-200" value={formEmpresa.razon} onChange={e => setFormEmpresa({...formEmpresa, razon: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-600 text-sm">Descripción de Giro Corporativo</Label>
                          <Input className="bg-slate-50 border-slate-200" value={formEmpresa.desc} onChange={e => setFormEmpresa({...formEmpresa, desc: e.target.value})} />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-4">Matricular Entidad</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredEmpresas?.map((emp, i) => (
                    <motion.div key={emp.id_empresa} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
                      <div className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dm ? 'bg-blue-900/40 text-blue-400 border border-blue-800/30' : 'bg-blue-50 border border-blue-100 text-blue-500'}`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${dm ? 'text-slate-500 bg-slate-700 border border-slate-600' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>#{emp.id_asociado}</span>
                        </div>
                        <h4 className={`font-bold text-base transition-colors ${dm ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{emp.nombre_empresa}</h4>
                        <p className={`text-sm mt-1 leading-relaxed min-h-[40px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{emp.descripcion || "Organización receptora con convenio vigente."}</p>
                        <div className={`mt-4 pt-3 border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${dm ? 'text-blue-400 bg-blue-900/30 border border-blue-800/30' : 'text-blue-600 bg-blue-50 border border-blue-100'}`}>{emp.razon_social}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── EVENTOS ─────────────────────── */}
            {activeSection === "eventos" && (
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
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                        <Calendar className="w-4 h-4 mr-2" /> Aperturar Periodo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900">
                      <DialogHeader><DialogTitle className="text-xl font-bold text-slate-800">Inaugurar Semestre</DialogTitle></DialogHeader>
                      <form onSubmit={handleCrearEvento} className="space-y-4 mt-2">
                        <div className="space-y-1">
                          <Label className="text-slate-600 text-sm">Distintivo del Periodo</Label>
                          <Input required className="bg-slate-50 border-slate-200" value={formEvento.nombre} onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} placeholder="Ej. Feria Institucional SJR" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-slate-600 text-sm">Ciclo</Label>
                            <Select value={formEvento.periodo} onValueChange={v => setFormEvento({...formEvento, periodo: v})}>
                              <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue/></SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-900">
                                {["FEBRERO-JUNIO", "AGOSTO-DICIEMBRE", "VERANO", "INVIERNO"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-slate-600 text-sm">Año</Label>
                            <Input type="number" required className="bg-slate-50 border-slate-200 text-center font-bold" value={formEvento.anio} onChange={e => setFormEvento({...formEvento, anio: e.target.value})} />
                          </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold mt-4">Emitir Apertura Global</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredEventos?.map((ev, i) => (
                    <motion.div key={ev.id_evento} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
                      <div className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative ${ev.activo ? (dm ? 'bg-slate-800/50 border-emerald-800/40' : 'bg-white border-emerald-200') : (dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100')}`}>
                        {/* Active indicator strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${ev.activo ? 'bg-gradient-to-b from-emerald-400 to-teal-500' : (dm ? 'bg-slate-700' : 'bg-slate-200')}`} />
                        <div className="pl-6 pr-5 py-5">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className={`text-lg font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{ev.nombre}</h4>
                            {ev.activo ? (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${dm ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-800/30' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> En Curso
                              </span>
                            ) : (
                              <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${dm ? 'text-slate-500 bg-slate-700 border border-slate-600' : 'text-slate-400 bg-slate-50 border border-slate-200'}`}>
                                Archivado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev.activo ? (dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-500') : (dm ? 'bg-slate-700 text-slate-500' : 'bg-slate-50 text-slate-400')}`}>
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${dm ? 'text-slate-200' : 'text-slate-700'}`}>{ev.periodo} {ev.anio}</p>
                              <p className={`text-[11px] uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Semestre {ev.semestre}</p>
                            </div>
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

      {/* ═══════════ GLOBAL MODALS ═══════════ */}
      {/* Credenciales Modal */}
      <Dialog open={!!credsModalInfo} onOpenChange={open => !open && setCredsModalInfo(null)}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-amber-500 p-6 text-white">
            <DialogTitle className="text-xl flex items-center gap-2"><QrCode className="w-6 h-6"/> Credenciales Privadas</DialogTitle>
            <DialogDescription className="text-amber-100 mt-1">Comparte esto con el representante de la empresa.</DialogDescription>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-xs bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
              <b>Atención:</b> Esta contraseña no volverá a mostrarse. Guárdala antes de cerrar.
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Correo de Acceso</Label>
              <div className="flex mt-1">
                <Input readOnly value={credsModalInfo?.correo || ""} className="font-mono bg-slate-50 border-r-0 rounded-r-none outline-none focus-visible:ring-0 text-slate-700" />
                <Button onClick={() => handleCopy(credsModalInfo?.correo, 'c')} variant="outline" className="rounded-l-none bg-slate-100 border-l-0 text-slate-500">
                  {copiedField==='c' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contraseña de Proyecto</Label>
              <div className="flex mt-1">
                <Input readOnly value={credsModalInfo?.password || ""} className="font-mono bg-emerald-50 border-emerald-200 border-r-0 rounded-r-none outline-none focus-visible:ring-0 text-emerald-700 font-bold" />
                <Button onClick={() => handleCopy(credsModalInfo?.password, 'p')} variant="outline" className="rounded-l-none bg-emerald-100 border-emerald-200 border-l-0 text-emerald-700 hover:bg-emerald-200">
                  {copiedField==='p' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => setCredsModalInfo(null)}>Confirmar Guardado</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cupo Modal */}
      <Dialog open={!!cupoModalInfo} onOpenChange={open => !open && setCupoModalInfo(null)}>
        <DialogContent className="sm:max-w-sm bg-white border border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Ampliar Cupo</DialogTitle>
            <DialogDescription className="text-slate-500">{cupoModalInfo?.nombre}</DialogDescription>
          </DialogHeader>
          {errorText && <p className="text-red-600 text-sm">{errorText}</p>}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Máximo Actual</Label>
              <Input disabled value={cupoModalInfo?.max || 0} className="bg-slate-50 border-slate-200 text-slate-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Nueva Capacidad</Label>
              <Input type="number" min={(cupoModalInfo?.max || 0) + 1} value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} className="bg-blue-50 border-blue-200 text-blue-800 focus-visible:ring-blue-500 text-lg font-bold" />
            </div>
          </div>
          <Button onClick={handleGuardarCupo} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">Salvar Ajuste</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

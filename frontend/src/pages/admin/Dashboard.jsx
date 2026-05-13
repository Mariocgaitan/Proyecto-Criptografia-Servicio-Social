import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  LogOut, Building2, Calendar, Plus, LayoutDashboard,
  Users, TrendingUp, BarChart3,
  PieChart, Activity, ChevronRight, ChevronDown, Search, SlidersHorizontal,
  Trash2, List, Sun, Moon, Command, AlertTriangle, QrCode, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl, downloadCsvExport } from "@/lib/api";
import EstadisticasPanel from "./EstadisticasPanel";
import AdminOverviewPanel from "./AdminOverviewPanel";
import SystemDashboardPanel from "./SystemDashboardPanel";
import CredencialesPanel from "./CredencialesPanel";
import tecLogo from "@/assets/tec_logo.png";

const normalizeSearchText = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const ALL_COMPANIES_FILTER = "todas";
const ADMIN_SYNC_MS = 5000;
const SYSTEM_DASHBOARD_ALLOWED_EMAILS = ["mariog@tec.mx", "alan1x@gmail.com"];

const resolveCompanyGroupKey = (companyName, groupKeys) => {
  const normalizedCompany = normalizeSearchText(companyName);
  if (!normalizedCompany) return null;

  const exactMatch = groupKeys.find((key) => normalizeSearchText(key) === normalizedCompany);
  if (exactMatch) return exactMatch;

  return groupKeys.find((key) => {
    const normalizedKey = normalizeSearchText(key);
    return normalizedKey.includes(normalizedCompany) || normalizedCompany.includes(normalizedKey);
  }) || null;
};

const isLooseSubsequence = (text, query) => {
  if (!query) return true;
  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) queryIndex += 1;
    textIndex += 1;
  }

  return queryIndex === query.length;
};

const boundedLevenshtein = (a, b, maxDistance) => {
  const lenA = a.length;
  const lenB = b.length;

  if (Math.abs(lenA - lenB) > maxDistance) return maxDistance + 1;
  if (!lenA) return lenB;
  if (!lenB) return lenA;

  let previous = Array.from({ length: lenB + 1 }, (_, idx) => idx);

  for (let i = 1; i <= lenA; i += 1) {
    const current = [i];
    let rowMin = current[0];

    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );

      current[j] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[lenB];
};

const hasNearWordMatch = (text, query) => {
  if (query.length < 4) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return false;

  const maxDistance = query.length <= 5 ? 1 : 2;
  return words.some((word) => boundedLevenshtein(word, query, maxDistance) <= maxDistance);
};

const textMatchesQuery = (value, query) => {
  if (!query) return true;
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) return false;

  return normalizedValue.includes(query)
    || isLooseSubsequence(normalizedValue, query)
    || hasNearWordMatch(normalizedValue, query);
};

const textIncludesQuery = (value, query) => {
  if (!query) return true;
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) return false;
  return normalizedValue.includes(query);
};

const buildAlumnoSearchText = (alumno) => [
  alumno?.nombre,
  alumno?.nombre_completo,
  alumno?.matricula,
  alumno?.id_matricula,
  alumno?.carrera,
  alumno?.carrera_nombre,
  alumno?.correo,
  alumno?.email,
].filter(Boolean).join(" ");

const buildProyectoSearchText = (proyecto) => [
  proyecto?.nombre_proyecto,
  proyecto?.empresa,
  proyecto?.descripcion,
  Array.isArray(proyecto?.alumnos_inscritos)
    ? proyecto.alumnos_inscritos.map((alumno) => buildAlumnoSearchText(alumno)).join(" ")
    : "",
].filter(Boolean).join(" ");

const isMatriculaQuery = (query) => /^[a-zA-Z]0\d{7}$/.test((query || "").replace(/\s+/g, ""));

const doesProjectMatchNonStudentFields = (proyecto, query) => {
  if (!query) return false;
  const projectFields = [proyecto?.nombre_proyecto, proyecto?.empresa, proyecto?.descripcion]
    .filter(Boolean)
    .join(" ");
  return textMatchesQuery(projectFields, query);
};

// ─── KPI Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtitle, color }) {
  const toneMap = {
    orange: "text-amber-200 bg-amber-400/10 border-amber-400/20",
    blue: "text-blue-200 bg-blue-500/10 border-blue-400/20",
    teal: "text-emerald-200 bg-emerald-500/10 border-emerald-400/20",
    purple: "text-violet-200 bg-violet-500/10 border-violet-400/20",
  };
  const tone = toneMap[color] || toneMap.blue;

  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-colors duration-300 hover:bg-black/45">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-normal uppercase tracking-[0.2em] mb-2 text-white/55">{label}</p>
          <p className="text-3xl font-normal tracking-tight text-white">{value}</p>
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
  );
}

// ─── Chart Placeholder ───────────────────────────────────────────
function ChartPlaceholder({ title, icon: Icon, colSpan = 1, height = "h-56" }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden ${colSpan === 2 ? "md:col-span-2" : ""}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <h3 className="font-normal text-sm text-white">{title}</h3>
        <button className="text-[11px] uppercase tracking-wider text-blue-300 hover:text-blue-200 font-normal transition-colors">Ver todo</button>
      </div>
      <div className={`${height} flex flex-col items-center justify-center gap-3 px-5`}>
        <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/25 bg-black/25 flex items-center justify-center">
          <Icon className="w-7 h-7 text-white/40" />
        </div>
        <p className="text-sm font-medium text-white/70">Gráfica en desarrollo</p>
        <p className="text-[11px] text-white/35">Los datos se conectarán aquí próximamente</p>
      </div>
    </div>
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
      <span className="text-xs font-mono font-normal w-16 text-right text-white/70">{current}/{max}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN DASHBOARD ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => localStorage.getItem("admin-theme") !== "light");
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    return () => root.classList.remove("dark");
  }, [isDark]);
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const commandInputRef = useRef(null);
  const commandItemRefs = useRef([]);
  const proyectoOptionRefs = useRef([]);
  const alumnoOptionRefs = useRef([]);
  const alumnoInputRef = useRef(null);
  const projectSearchInputRef = useRef(null);
  const hasInitializedProjectExpansionRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [availability, setAvailability] = useState("todas");
  const [empresaFilter, setEmpresaFilter] = useState(ALL_COMPANIES_FILTER);
  const [sortMode, setSortMode] = useState("demanda");
  const [expandedEmpresas, setExpandedEmpresas] = useState([]);
  const [expandedProyectos, setExpandedProyectos] = useState([]);

  // Modals Info
  const [_isCrearProyectoOpen, setIsCrearProyectoOpen] = useState(false);
  const [isCrearEmpresaOpen, setIsCrearEmpresaOpen] = useState(false);
  const [isCrearEventoOpen, setIsCrearEventoOpen] = useState(false);
  const [cupoModalInfo, setCupoModalInfo] = useState(null);
  const [isAgregarAlumnoOpen, setIsAgregarAlumnoOpen] = useState(false);
  const [isCredencialesOpen, setIsCredencialesOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [credencialGenerada, setCredencialGenerada] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvEventoId, setCsvEventoId] = useState("");
  const [csvResult, setCsvResult] = useState(null);
  const [isPreregConfirmOpen, setIsPreregConfirmOpen] = useState(false);
  const [isIniciarConfirmOpen, setIsIniciarConfirmOpen] = useState(false);
  const [iniciarTargetId, setIniciarTargetId] = useState(null);
  const [preregActionLoading, setPreregActionLoading] = useState(false);
  const [selectedProyectoForAlumno, setSelectedProyectoForAlumno] = useState(null);
  const [selectedAlumnoMatricula, setSelectedAlumnoMatricula] = useState("");
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [proyectoSearchTerm, setProyectoSearchTerm] = useState("");
  const [alumnoSearchTerm, setAlumnoSearchTerm] = useState("");
  const [proyectoActiveIndex, setProyectoActiveIndex] = useState(0);
  const [alumnoActiveIndex, setAlumnoActiveIndex] = useState(0);

  // Forms
  const [formEmpresa, setFormEmpresa] = useState({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
  const [formEvento, setFormEvento] = useState({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
  const [nuevaCapacidad, setNuevaCapacidad] = useState(0);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [deletingInscripcionId, setDeletingInscripcionId] = useState(null);
  const [deleteModalInfo, setDeleteModalInfo] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [preserveFiltersOnNextSearch, setPreserveFiltersOnNextSearch] = useState(false);

  const canAccessSystemDashboard = SYSTEM_DASHBOARD_ALLOWED_EMAILS.includes((user?.correo || "").toLowerCase());

  const proyectosConCupo = useMemo(
    () => proyectos.filter((p) => p.cupo_actual < p.capacidad_max),
    [proyectos]
  );

  const filteredProyectosForAlumno = useMemo(() => {
    const query = normalizeSearchText(proyectoSearchTerm);
    if (!query) return proyectosConCupo;
    return proyectosConCupo.filter((p) => textMatchesQuery(`${p.nombre_proyecto} ${p.empresa}`, query));
  }, [proyectosConCupo, proyectoSearchTerm]);

  const filteredAlumnosDisponibles = useMemo(() => {
    const query = normalizeSearchText(alumnoSearchTerm);
    if (!query) return alumnosDisponibles;
    return alumnosDisponibles.filter((a) => textMatchesQuery(`${a.nombre} ${a.id_matricula} ${a.carrera}`, query));
  }, [alumnosDisponibles, alumnoSearchTerm]);

  useEffect(() => {
    setProyectoActiveIndex(0);
  }, [proyectoSearchTerm, filteredProyectosForAlumno.length]);

  useEffect(() => {
    setAlumnoActiveIndex(0);
  }, [alumnoSearchTerm, filteredAlumnosDisponibles.length]);

  useEffect(() => {
    const activeOption = proyectoOptionRefs.current[proyectoActiveIndex];
    if (activeOption) {
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }, [proyectoActiveIndex, filteredProyectosForAlumno.length]);

  useEffect(() => {
    const activeOption = alumnoOptionRefs.current[alumnoActiveIndex];
    if (activeOption) {
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }, [alumnoActiveIndex, filteredAlumnosDisponibles.length]);

  const fetchData = async () => {
    try {
      const [ps, es, evs] = await Promise.all([
        fetch(apiUrl("/api/v1/admin/proyectos?page_size=100"), { credentials: "include" }).then(res => res.json()).then(d => Array.isArray(d) ? d : (d?.data ?? [])),
        fetch(apiUrl("/api/v1/admin/empresas"), { credentials: "include" }).then(res => res.json()).then(d => Array.isArray(d) ? d : (d?.data ?? [])),
        fetch(apiUrl("/api/v1/admin/eventos"), { credentials: "include" }).then(res => res.json()).then(d => Array.isArray(d) ? d : (d?.data ?? []))
      ]);
      setProyectos(ps); setEmpresas(es); setEventos(evs);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const syncIfVisible = () => {
      if (document.hidden) return;
      fetchData();
    };

    const intervalId = setInterval(syncIfVisible, ADMIN_SYNC_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) syncIfVisible();
    };

    window.addEventListener("focus", syncIfVisible);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", syncIfVisible);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);



  // === HANDLERS ===
  const handleAbreModalAgregarAlumno = async (proyecto) => {
    setSelectedProyectoForAlumno(proyecto);
    setProyectoSearchTerm(`${proyecto.nombre_proyecto} ${proyecto.empresa}`);
    setSelectedAlumnoMatricula("");
    setAlumnoSearchTerm("");
    setAlumnoActiveIndex(0);
    setErrorText("");

    requestAnimationFrame(() => {
      if (alumnoInputRef.current) {
        alumnoInputRef.current.focus();
        alumnoInputRef.current.select();
        alumnoInputRef.current.scrollIntoView({ block: "center" });
      }
    });

    try {
      const res = await fetch(apiUrl(`/api/v1/admin/alumnos-disponibles?id_evento=${proyecto.id_evento}`), {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al obtener alumnos");
      setAlumnosDisponibles(data || []);
      setIsAgregarAlumnoOpen(true);
    } catch (err) {
      setErrorText(err.message || "No se pudo cargar los alumnos disponibles");
    }
  };

  const handleAgregarAlumno = async (e) => {
    e.preventDefault();
    if (!selectedAlumnoMatricula || !selectedProyectoForAlumno) return;

    setIsSubmitting(true);
    setErrorText("");
    try {
      const res = await fetch(apiUrl("/api/v1/admin/inscripciones"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_matricula: selectedAlumnoMatricula,
          id_proyecto: selectedProyectoForAlumno.id_proyecto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al agregar alumno");
      setIsAgregarAlumnoOpen(false);
      setSelectedAlumnoMatricula("");
      setSelectedProyectoForAlumno(null);
      setProyectoSearchTerm("");
      setAlumnoSearchTerm("");
      await fetchData();
    } catch (err) {
      setErrorText(err.message || "No se pudo agregar el alumno");
    } finally {
      setIsSubmitting(false);
    }
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
    } catch (err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("admin-theme", next ? "dark" : "light");
      return next;
    });
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
    } catch (err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleOpenIniciarEvento = (idEvento) => {
    setIniciarTargetId(idEvento);
    setIsIniciarConfirmOpen(true);
  };

  const handleConfirmIniciarEvento = async () => {
    if (!iniciarTargetId) return;
    setPreregActionLoading(true);
    setErrorText("");
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/eventos/${iniciarTargetId}/iniciar`), {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo iniciar el evento");
      setIsIniciarConfirmOpen(false);
      await fetchData();
    } catch (err) {
      setErrorText(err.message);
    } finally {
      setPreregActionLoading(false);
    }
  };

  const handleOpenCredenciales = useCallback(async () => {
    setIsCredencialesOpen(true);
    setErrorText("");
    setCredencialGenerada(null);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/usuarios-empresa"), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setUsuariosEmpresa(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorText(err.message || "Error al cargar usuarios empresa");
    }
  }, []);

  const handleResetPassword = async (idMatricula) => {
    setIsSubmitting(true);
    setErrorText("");
    setCredencialGenerada(null);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/usuarios-empresa/${idMatricula}/reset-password`), {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setCredencialGenerada(data);
    } catch (err) {
      setErrorText(err.message || "Error al resetear contraseña");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrarPreregistro = async () => {
    const eventoActivo = eventos.find(e => e.activo);
    if (!eventoActivo) return;
    setPreregActionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/eventos/${eventoActivo.id_evento}/cerrar-preregistro`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setIsPreregConfirmOpen(false);
      await fetchData();
    } catch (err) {
      setErrorText(err.message || "Error al cerrar pre-registro");
    } finally {
      setPreregActionLoading(false);
    }
  };

  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile || !csvEventoId) {
      setErrorText("Selecciona un archivo CSV y un evento");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");
    setCsvResult(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch(apiUrl(`/api/v1/admin/upload-csv?id_evento=${csvEventoId}`), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setCsvResult(data);
      setCsvFile(null);
      setCsvEventoId("");
      await fetchData();
    } catch (err) {
      setErrorText(err.message || "Error al procesar CSV");
    } finally {
      setIsSubmitting(false);
    }
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
    } catch (err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleEliminarInscripcion = async (alumno) => {
    if (!alumno?.id_inscripcion) return;

    setDeleteModalInfo(alumno);
    setDeleteConfirmText("");
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

  const handleQuickExport = useCallback(async (dataset) => {
    setErrorText("");
    try {
      await downloadCsvExport({ dataset, scope: "all" });
      setActiveSection("estadisticas");
    } catch (err) {
      setErrorText(err.message || "No se pudo exportar el CSV");
    }
  }, []);

  const safeEventos = Array.isArray(eventos) ? eventos : [];

  // Search filtering
  const q = normalizeSearchText(searchQuery);
  const empresasEnProyectos = useMemo(() => {
    return [...new Set(proyectos.map((p) => p.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [proyectos]);

  const filteredProyectos = useMemo(() => {
    const base = proyectos.filter((p) => {
      const studentMatchesQuery = Array.isArray(p.alumnos_inscritos) && p.alumnos_inscritos.some((alumno) => {
        return textIncludesQuery(buildAlumnoSearchText(alumno), q);
      });

      const projectMatchesQuery = textMatchesQuery(buildProyectoSearchText(p), q);
      const matchesQuery = !q
        ? true
        : isMatriculaQuery(q)
          ? studentMatchesQuery
          : projectMatchesQuery || studentMatchesQuery;

      const remaining = Math.max((p.capacidad_max || 0) - (p.cupo_actual || 0), 0);
      const isFull = (p.cupo_actual || 0) >= (p.capacidad_max || 0);
      const matchesAvailability =
        availability === "todas"
        || (availability === "disponibles" && !isFull)
        || (availability === "ultimos" && !isFull && remaining <= 2)
        || (availability === "llenos" && isFull);

      const matchesEmpresa = empresaFilter === ALL_COMPANIES_FILTER || p.empresa === empresaFilter;

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

  const filteredEmpresas = empresas;
  const filteredEventos = q
    ? safeEventos.filter(
      (e) =>
        textMatchesQuery(e.nombre, q)
        || textMatchesQuery(e.periodo, q)
    )
    : safeEventos;

  // Group projects by empresa
  const proyectosPorEmpresa = useMemo(() => {
    const dict = {};
    filteredProyectos.forEach(p => {
      const key = p.empresa || "Sin Empresa";
      if (!dict[key]) dict[key] = [];
      dict[key].push(p);
    });
    return dict;
  }, [filteredProyectos]);
  const companyGroupKeys = useMemo(() => Object.keys(proyectosPorEmpresa), [proyectosPorEmpresa]);

  useEffect(() => {
    if (activeSection !== "proyectos") return;

    setExpandedEmpresas((prev) => {
      const sanitized = prev.filter((name) => companyGroupKeys.includes(name));

      // Solo auto-expande en la primera entrada a la sección.
      // Despues, respeta el estado manual del usuario (incluyendo colapsar todo).
      if (!hasInitializedProjectExpansionRef.current) {
        hasInitializedProjectExpansionRef.current = true;
        return sanitized.length ? sanitized : companyGroupKeys;
      }

      return sanitized;
    });
  }, [activeSection, companyGroupKeys]);

  useEffect(() => {
    const visibleProjectIds = new Set(filteredProyectos.map((project) => project.id_proyecto));
    setExpandedProyectos((prev) => prev.filter((projectId) => visibleProjectIds.has(projectId)));
  }, [filteredProyectos]);

  useEffect(() => {
    if (activeSection !== "proyectos") return;
    if (!q) return;

    setExpandedEmpresas(companyGroupKeys);
    setExpandedProyectos(filteredProyectos.map((project) => project.id_proyecto));
  }, [activeSection, q, companyGroupKeys, filteredProyectos]);

  const toggleProyectoExpanded = useCallback((projectId) => {
    setExpandedProyectos((prev) => (
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    ));
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const executeProjectSearch = (queryValue) => {
    applySearchQuery(queryValue, { preserveFilters: false });
  };

  const applySearchQuery = useCallback((nextQuery, options = {}) => {
    const { preserveFilters = false } = options;

    if (preserveFilters) {
      setPreserveFiltersOnNextSearch(true);
      setSearchQuery(nextQuery);
      return;
    }

    setPreserveFiltersOnNextSearch(false);
    setSearchQuery(nextQuery);
    setAvailability("todas");
    setEmpresaFilter(ALL_COMPANIES_FILTER);
    setExpandedEmpresas([]);
    setExpandedProyectos([]);
  }, []);

  useEffect(() => {
    if (!preserveFiltersOnNextSearch) return;
    setPreserveFiltersOnNextSearch(false);
  }, [searchQuery, preserveFiltersOnNextSearch]);

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const focusProjectSearch = useCallback(() => {
    requestAnimationFrame(() => {
      projectSearchInputRef.current?.focus();
      projectSearchInputRef.current?.select();
    });
  }, []);

  const runCommandItem = useCallback((item) => {
    if (!item) return;
    item.action();
    if (!item.keepSearchContext) {
      applySearchQuery("");
    }
    setCommandOpen(false);
  }, [applySearchQuery]);

  const studentCommandItems = useMemo(() => {
    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return [];

    const items = [];

    proyectos.forEach((proyecto) => {
      if (!Array.isArray(proyecto.alumnos_inscritos)) return;

      proyecto.alumnos_inscritos.forEach((alumno) => {
        const nombre = alumno?.nombre || alumno?.nombre_completo || "Alumno sin nombre";
        const matricula = alumno?.matricula || alumno?.id_matricula || "Sin matricula";
        const carrera = alumno?.carrera || alumno?.carrera_nombre || "";
        const correo = alumno?.correo || alumno?.email || "";

        const searchable = [
          nombre,
          matricula,
          carrera,
          correo,
          proyecto?.nombre_proyecto || "",
          proyecto?.empresa || "",
        ].map((value) => normalizeSearchText(value)).join(" ");

        if (!textMatchesQuery(searchable, normalized)) return;

        items.push({
          id: `student-${proyecto.id_proyecto}-${alumno.id_inscripcion || matricula}`,
          label: `Alumno: ${nombre}`,
          hint: `Matricula: ${matricula} · Proyecto: ${proyecto.nombre_proyecto || "Sin proyecto"}`,
          keepSearchContext: true,
          action: () => {
            const companyKey = proyecto.empresa || "Sin Empresa";
            setActiveSection("proyectos");
            setExpandedEmpresas((prev) => (prev.includes(companyKey) ? prev : [...prev, companyKey]));
            setAvailability("todas");
            setEmpresaFilter(proyecto.empresa || ALL_COMPANIES_FILTER);
            applySearchQuery(matricula || nombre, { preserveFilters: true });
            focusProjectSearch();
          },
        });
      });
    });

    return items.slice(0, 30);
  }, [proyectos, commandQuery, focusProjectSearch, applySearchQuery]);

  const projectCommandItems = useMemo(() => {
    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return [];

    return proyectos
      .filter((proyecto) => {
        const searchable = [
          proyecto?.nombre_proyecto || "",
          proyecto?.empresa || "",
          proyecto?.descripcion || "",
        ].join(" ");

        return textMatchesQuery(searchable, normalized);
      })
      .slice(0, 25)
      .map((proyecto) => ({
        id: `project-${proyecto.id_proyecto}`,
        label: `Proyecto: ${proyecto.nombre_proyecto || "Sin nombre"}`,
        hint: `Empresa: ${proyecto.empresa || "Sin Empresa"}`,
        keepSearchContext: true,
        action: () => {
          setActiveSection("proyectos");
          setAvailability("todas");
          setEmpresaFilter(ALL_COMPANIES_FILTER);
          setExpandedEmpresas([]);
          applySearchQuery(proyecto?.nombre_proyecto || "", { preserveFilters: true });
          focusProjectSearch();
        },
      }));
  }, [proyectos, commandQuery, focusProjectSearch, applySearchQuery]);

  const companyCommandItems = useMemo(() => {
    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return [];

    return empresas
      .filter((empresa) => {
        const searchable = [
          empresa?.nombre_empresa || "",
          empresa?.razon_social || "",
          empresa?.id_asociado || "",
          empresa?.descripcion || "",
        ].join(" ");

        return textMatchesQuery(searchable, normalized);
      })
      .slice(0, 25)
      .map((empresa) => ({
        id: `company-${empresa.id_empresa}`,
        label: `Empresa: ${empresa.nombre_empresa || "Sin nombre"}`,
        hint: `ID: ${empresa.id_asociado || "N/A"}`,
        keepSearchContext: true,
        action: () => {
          setActiveSection("proyectos");
          setAvailability("todas");
          const selectedCompanyName = empresa?.nombre_empresa || "";
          const companyGroupKey = resolveCompanyGroupKey(selectedCompanyName, companyGroupKeys);

          setEmpresaFilter(companyGroupKey || ALL_COMPANIES_FILTER);
          setExpandedEmpresas(companyGroupKey ? [companyGroupKey] : companyGroupKeys);
          applySearchQuery(companyGroupKey || selectedCompanyName, { preserveFilters: true });
          focusProjectSearch();
        },
      }));
  }, [empresas, commandQuery, companyGroupKeys, focusProjectSearch, applySearchQuery]);

  const commandItems = useMemo(() => {
    const baseItems = [
      {
        id: "section-overview",
        label: "Ir a Dashboard",
        hint: "Secciones",
        keepSearchContext: false,
        action: () => setActiveSection("overview"),
      },
      {
        id: "section-stats",
        label: "Ir a Estadísticas",
        hint: "Secciones",
        keepSearchContext: false,
        action: () => setActiveSection("estadisticas"),
      },
      {
        id: "section-projects",
        label: "Ir a Proyectos",
        hint: "Secciones",
        keepSearchContext: false,
        action: () => setActiveSection("proyectos"),
      },
      {
        id: "section-gestion",
        label: "Ir a Gestión",
        hint: "Secciones",
        keepSearchContext: false,
        action: () => setActiveSection("gestion"),
      },
      {
        id: "section-credenciales",
        label: "Ir a Credenciales",
        hint: "Secciones",
        keepSearchContext: false,
        action: () => setActiveSection("credenciales"),
      },
      {
        id: "act-open-credenciales-modal",
        label: "Abrir: Credenciales de Empresas",
        hint: "Acciones",
        keepSearchContext: false,
        action: () => {
          handleOpenCredenciales();
        },
      },
      {
        id: "act-add-alumno",
        label: "Abrir: Agregar Alumno a Proyecto",
        hint: "Acciones",
        keepSearchContext: false,
        action: () => {
          setActiveSection("proyectos");
          setIsAgregarAlumnoOpen(true);
          setSelectedProyectoForAlumno(null);
        },
      },
      {
        id: "act-export-ins",
        label: "Exportar CSV: Inscripciones",
        hint: "Exportación",
        keepSearchContext: false,
        action: () => {
          void handleQuickExport("inscripciones");
        },
      },
      {
        id: "act-export-proy",
        label: "Exportar CSV: Proyectos",
        hint: "Exportación",
        keepSearchContext: false,
        action: () => {
          void handleQuickExport("proyectos");
        },
      },
      {
        id: "act-export-emp",
        label: "Exportar CSV: Empresas",
        hint: "Exportación",
        keepSearchContext: false,
        action: () => {
          void handleQuickExport("empresas");
        },
      },
      {
        id: "act-export-padron",
        label: "Exportar CSV: Usuarios/Padrón",
        hint: "Exportación",
        keepSearchContext: false,
        action: () => {
          void handleQuickExport("usuarios_padron");
        },
      },
      {
        id: "act-export-logs",
        label: "Exportar CSV: Logs",
        hint: "Exportación",
        keepSearchContext: false,
        action: () => {
          void handleQuickExport("logs");
        },
      },
    ];

    if (canAccessSystemDashboard) {
      baseItems.push({
        id: "section-system",
        label: "Ir a Sistema",
        hint: "Secciones",
        keepSearchContext: false,
        action: () => setActiveSection("sistema"),
      });
    }

    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return baseItems;

    const filteredBaseItems = baseItems.filter((item) =>
      textMatchesQuery(item.label, normalized)
      || textMatchesQuery(item.hint, normalized)
    );

    return [...filteredBaseItems, ...projectCommandItems, ...companyCommandItems, ...studentCommandItems];
  }, [
    commandQuery,
    canAccessSystemDashboard,
    projectCommandItems,
    companyCommandItems,
    studentCommandItems,
    handleQuickExport,
    handleOpenCredenciales,
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const isOpenShortcut = (event.ctrlKey || event.metaKey) && key === "k";

      if (isOpenShortcut) {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (!commandOpen) return;

      if (key === "escape") {
        event.preventDefault();
        setCommandOpen(false);
        return;
      }

      if (!commandItems.length) return;

      if (key === "arrowdown") {
        event.preventDefault();
        setActiveCommandIndex((prev) => (prev + 1) % commandItems.length);
        return;
      }

      if (key === "arrowup") {
        event.preventDefault();
        setActiveCommandIndex((prev) => (prev - 1 + commandItems.length) % commandItems.length);
        return;
      }

      if (key === "enter") {
        event.preventDefault();
        runCommandItem(commandItems[activeCommandIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, commandItems, activeCommandIndex, runCommandItem]);

  useEffect(() => {
    if (!commandOpen) {
      setCommandQuery("");
      setActiveCommandIndex(0);
      return;
    }

    const frame = requestAnimationFrame(() => {
      commandInputRef.current?.focus();
      commandInputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [commandOpen]);

  useEffect(() => {
    setActiveCommandIndex(0);
  }, [commandQuery]);

  useEffect(() => {
    if (!commandOpen || !commandItems.length) return;
    const activeElement = commandItemRefs.current[activeCommandIndex];
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [commandOpen, commandItems.length, activeCommandIndex]);

  const sectionMeta = {
    overview: {
      title: "Dashboard",
      description: "Seguimiento claro del evento, alumnos pendientes y estado de los proyectos",
    },
    estadisticas: {
      title: "Estadísticas",
      description: "Métricas de negocio con vistas General y Particular",
    },
    proyectos: {
      title: "Directorio de Proyectos",
      description: "Oferta de plazas para el Servicio Social",
    },
    gestion: {
      title: "Gestión de Empresas y Eventos",
      description: "Socios formadores, periodos académicos y registro operativo",
    },
    credenciales: {
      title: "Credenciales",
      description: "Administra contraseñas de cuentas admin y empresa",
    },
    sistema: {
      title: "Sistema",
      description: "Observabilidad técnica para soporte, desarrollo y diagnóstico interno",
    },
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div
      data-admin-theme={isDark ? "dark" : "light"}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ fontFamily: "'Geist Variable', sans-serif", backgroundColor: isDark ? "#0b1120" : "#f1f5f9" }}
    >

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-slate-950/95 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <img src={tecLogo} alt="Tecnológico de Monterrey" className={`h-12 sm:h-14 w-auto drop-shadow-md ${isDark ? "brightness-0 invert" : "brightness-0"}`} />
          <div>
            <p className="text-white/70 text-xs sm:text-sm font-normal tracking-wide uppercase">Portal Administracion</p>
            <p className="text-white/45 text-[11px] sm:text-xs">Feria Servicio Social</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/10 text-white/75 hover:text-white hover:bg-white/15 transition-colors"
            title="Abrir paleta de comandos (Ctrl+K)"
          >
            <Command className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-normal">Comandos</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded border border-white/15 bg-black/30 text-[10px] font-mono text-white/60">
              Ctrl K
            </kbd>
          </button>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center p-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            title={isDark ? "Modo claro" : "Modo oscuro"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 p-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-red-500/10 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-normal">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0">
        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full">
            <div className="mb-6 rounded-2xl border border-white/15 bg-black/35 p-4 sm:p-5 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
              <div>
                <h2 className="text-lg sm:text-xl font-normal tracking-tight text-white">
                  {sectionMeta[activeSection]?.title}
                </h2>
                <p className="text-xs sm:text-sm mt-0.5 text-white/60">
                  {sectionMeta[activeSection]?.description}
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button onClick={() => handleSectionChange("overview")} className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "overview" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Dashboard</button>
                <button onClick={() => handleSectionChange("estadisticas")} className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "estadisticas" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Estadísticas</button>
                <button onClick={() => handleSectionChange("proyectos")} className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "proyectos" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Proyectos ({proyectos.length})</button>
                <button onClick={() => handleSectionChange("gestion")} className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "gestion" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Gestión</button>
                <button onClick={() => handleSectionChange("credenciales")} className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "credenciales" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Credenciales</button>
                {canAccessSystemDashboard ? (
                  <button onClick={() => handleSectionChange("sistema")} className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${activeSection === "sistema" ? "bg-blue-600/25 border-blue-400/35 text-white" : "bg-white/5 border-white/15 text-white/70 hover:text-white"}`}>Sistema</button>
                ) : null}
              </div>

            </div>

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
                  <AdminOverviewPanel
                    onOpenProjects={() => handleSectionChange("proyectos")}
                    onOpenStats={() => handleSectionChange("estadisticas")}
                  />
                </motion.div>
              )}

              {activeSection === "sistema" && canAccessSystemDashboard && (
                <motion.div
                  key="sistema"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  <SystemDashboardPanel />
                </motion.div>
              )}

              {activeSection === "credenciales" && (
                <motion.div
                  key="credenciales"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <CredencialesPanel />
                </motion.div>
              )}

              {/* ─── PROYECTOS ───────────────────── */}
              {activeSection === "proyectos" && (
                <motion.div key="proyectos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedEmpresas(companyGroupKeys)}
                        className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-[11px] font-normal uppercase tracking-wider text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Expandir empresas
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedEmpresas([])}
                        className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-[11px] font-normal uppercase tracking-wider text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Colapsar empresas
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => setIsAgregarAlumnoOpen(true)}
                        className="w-full sm:w-auto border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal px-5 py-5 rounded-xl shadow-none transition-all"
                      >
                        <Users className="w-4 h-4 mr-2" /> Asignar alumno
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/35 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/55 font-normal mr-1">
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

                      {(searchQuery || availability !== "todas" || empresaFilter !== ALL_COMPANIES_FILTER || sortMode !== "demanda") ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchDraft("");
                            setAvailability("todas");
                            setEmpresaFilter(ALL_COMPANIES_FILTER);
                            setSortMode("demanda");
                            setExpandedEmpresas([]);
                            setExpandedProyectos([]);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs border transition-colors bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        >
                          Reset filtros
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                      <form
                        className="w-full md:flex-1 md:min-w-[300px] flex items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          executeProjectSearch(searchDraft);
                        }}
                      >
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            ref={projectSearchInputRef}
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            placeholder="Buscar alumno, matricula o carrera"
                            className="h-9 pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/45"
                          />
                        </div>
                        <Button type="submit" className="h-9 px-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-xs">
                          Buscar
                        </Button>
                      </form>

                      <div className="w-full md:w-auto md:min-w-[260px]">
                        <label className="sr-only" htmlFor="empresa-filter-select">Filtrar por empresa</label>
                        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                          <SelectTrigger id="empresa-filter-select" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 text-white text-xs px-2.5">
                            <SelectValue>{(v) => v === ALL_COMPANIES_FILTER ? "Empresa: Todas" : v}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_COMPANIES_FILTER}>Empresa: Todas</SelectItem>
                            {empresasEnProyectos.map((empresa) => (
                              <SelectItem key={empresa} value={empresa}>
                                {empresa}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Select value={sortMode} onValueChange={setSortMode}>
                        <SelectTrigger className="h-9 rounded-lg bg-white/10 border border-white/20 text-white text-xs px-2.5">
                          <SelectValue>{(v) => ({ demanda: "Ordenar: Demanda", disponibilidad: "Ordenar: Ultimos lugares", alfabetico: "Ordenar: A-Z" }[v] || v)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demanda">Ordenar: Demanda</SelectItem>
                          <SelectItem value="disponibilidad">Ordenar: Ultimos lugares</SelectItem>
                          <SelectItem value="alfabetico">Ordenar: A-Z</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* BY EMPRESA VIEW */}
                  <div className="space-y-4">
                    {Object.entries(proyectosPorEmpresa).map(([empresaName, proys]) => (
                      <div key={empresaName} className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden">
                        <button
                          onClick={() => setExpandedEmpresas((prev) => prev.includes(empresaName) ? prev.filter((name) => name !== empresaName) : [...prev, empresaName])}
                          className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-left">
                              <p className="font-normal text-sm text-white">{empresaName}</p>
                              <p className="text-xs text-white/55">{proys.length} proyecto{proys.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-normal px-2 py-1 rounded-md bg-white/10 text-white/75 border border-white/10">
                              {proys.reduce((s, p) => s + (p.cupo_actual || 0), 0)}/{proys.reduce((s, p) => s + (p.capacidad_max || 0), 0)} plazas
                            </span>
                            <ChevronDown
                              className="w-4 h-4 text-white/55 transition-transform duration-200"
                              style={{ transform: expandedEmpresas.includes(empresaName) ? "rotate(180deg)" : "rotate(0deg)" }}
                            />
                          </div>
                        </button>
                        {expandedEmpresas.includes(empresaName) && (
                          <div>
                            <div className="border-t border-white/10">
                                {proys.map((p) => {
                                  const isProyectoExpanded = expandedProyectos.includes(p.id_proyecto);
                                  const inscritos = Array.isArray(p.alumnos_inscritos) ? p.alumnos_inscritos : [];
                                  const projectMatchesQuery = doesProjectMatchNonStudentFields(p, q);
                                  const inscritosVisibles = q && !projectMatchesQuery
                                    ? inscritos.filter((alumno) => textIncludesQuery(buildAlumnoSearchText(alumno), q))
                                    : inscritos;

                                  return (
                                    <div key={p.id_proyecto} className="border-b last:border-0 transition-colors border-white/10 hover:bg-white/[0.03]">
                                      <button
                                        type="button"
                                        onClick={() => toggleProyectoExpanded(p.id_proyecto)}
                                        className="w-full px-6 py-3.5 text-left"
                                      >
                                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                          <div className="flex items-start gap-3">
                                            <ChevronDown
                                              className="w-4 h-4 mt-0.5 text-white/60 transition-transform duration-200"
                                              style={{ transform: isProyectoExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-normal text-white">{p.nombre_proyecto}</p>
                                              <p className="text-[11px] mt-1 text-white/60">{inscritosVisibles.length} alumno{inscritosVisibles.length !== 1 ? "s" : ""} visible{inscritosVisibles.length !== 1 ? "s" : ""}</p>
                                            </div>
                                          </div>

                                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                                            <div className="w-full md:w-40"><OccupancyBar current={p.cupo_actual} max={p.capacidad_max} /></div>
                                            {p.cupo_actual >= p.capacidad_max ? (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2.5 py-1 rounded-full w-24 justify-center text-white/70 bg-white/5 border border-white/10"><span className="w-1.5 h-1.5 bg-white/40 rounded-full" /> Lleno</span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2.5 py-1 rounded-full w-24 justify-center text-white/70 bg-white/5 border border-white/10"><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" /> Disponible</span>
                                            )}
                                            <div className="flex gap-1.5">
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max });
                                                  setNuevaCapacidad(p.capacidad_max + 1);
                                                }}
                                                className="text-xs font-normal text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
                                              >
                                                Aumentar cupo
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </button>

                                      {isProyectoExpanded && (
                                        <div>
                                          <div className="px-6 pb-4">
                                              <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden">
                                                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                                                  <p className="text-[11px] font-normal uppercase tracking-wider text-white/60">Alumnos enrolados</p>
                                                  <p className="text-xs text-white/55">{inscritosVisibles.length}</p>
                                                </div>

                                                {inscritosVisibles.length > 0 ? (
                                                  <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[900px]">
                                                      <thead>
                                                        <tr className="border-b border-white/10">
                                                          <th className="text-left px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Alumno</th>
                                                          <th className="text-left px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Matricula</th>
                                                          <th className="text-left px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Carrera</th>
                                                          <th className="text-left px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Correo</th>
                                                          <th className="text-left px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Fecha Registro</th>
                                                          <th className="text-left px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Hora Registro</th>
                                                          <th className="text-right px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-white/50">Accion</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {inscritosVisibles.map((alumno) => {
                                                          const fecha = alumno.fecha_inscripcion ? new Date(alumno.fecha_inscripcion) : null;
                                                          const fechaStr = fecha ? fecha.toLocaleDateString("es-MX") : "--";
                                                          const horaStr = fecha ? fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--";
                                                          return (
                                                            <tr key={alumno.id_inscripcion || `${p.id_proyecto}-${alumno.matricula}`} className="border-b last:border-0 border-white/10">
                                                              <td className="px-3 py-2 text-sm text-white/85">{alumno.nombre || "--"}</td>
                                                              <td className="px-3 py-2 text-xs font-mono text-white/70">{alumno.matricula || "--"}</td>
                                                              <td className="px-3 py-2 text-xs text-white/70">{alumno.carrera || "--"}</td>
                                                              <td className="px-3 py-2 text-xs text-white/65">{alumno.correo || "--"}</td>
                                                              <td className="px-3 py-2 text-xs text-white/65">{fechaStr}</td>
                                                              <td className="px-3 py-2 text-xs font-mono text-white/60">{horaStr}</td>
                                                              <td className="px-3 py-2 text-right">
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleEliminarInscripcion(alumno)}
                                                                  disabled={deletingInscripcionId === alumno.id_inscripcion}
                                                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-normal text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                                                                >
                                                                  <Trash2 className="w-3.5 h-3.5" />
                                                                  {deletingInscripcionId === alumno.id_inscripcion ? "Eliminando..." : "Eliminar"}
                                                                </button>
                                                              </td>
                                                            </tr>
                                                          );
                                                        })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                ) : (
                                                  <div className="px-3 py-4 text-xs text-white/45">
                                                    {q && !projectMatchesQuery ? "No hay alumnos en este proyecto que coincidan con la busqueda." : "Este proyecto no tiene alumnos inscritos todavia."}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                    {!Object.keys(proyectosPorEmpresa).length && (
                      <div className="text-center py-16 text-sm rounded-2xl border border-white/15 bg-black/35 text-white/45">{q ? 'Sin resultados.' : 'No hay proyectos registrados.'}</div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeSection === "estadisticas" && (
                <motion.div
                  key="estadisticas"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <EstadisticasPanel eventos={eventos} empresas={empresas} />
                </motion.div>
              )}

              {/* ─── EMPRESAS ────────────────────── */}
              {activeSection === "gestion" && (
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
                      className="border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal px-5 py-5 rounded-xl shadow-none transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Registrar Proyecto
                    </Button>

                    <Dialog open={isCrearEmpresaOpen} onOpenChange={setIsCrearEmpresaOpen}>
                      <DialogTrigger asChild>
                        <div role="button" className="border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal px-5 py-5 rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                          <Building2 className="w-4 h-4 mr-2" /> Dar de Alta Organización
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
                        <DialogHeader><DialogTitle className="text-xl font-normal tracking-tight text-white">Registrar Socio Formador</DialogTitle></DialogHeader>
                        <form onSubmit={handleCrearEmpresa} className="space-y-4 mt-2">
                          {errorText && <div className="text-sm text-white bg-red-600 p-2 rounded border border-red-700 shadow-md">{errorText}</div>}
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">ID Asociado / Convenio</Label>
                            <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.id_asociado} onChange={e => setFormEmpresa({ ...formEmpresa, id_asociado: e.target.value })} placeholder="Ej. SF-XXX24" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Nombre Público (Comercial)</Label>
                            <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.nombre} onChange={e => setFormEmpresa({ ...formEmpresa, nombre: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Denominación Legal (Razón Social)</Label>
                            <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.razon} onChange={e => setFormEmpresa({ ...formEmpresa, razon: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Descripción de Giro Corporativo</Label>
                            <Input className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.desc} onChange={e => setFormEmpresa({ ...formEmpresa, desc: e.target.value })} />
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal mt-4">Matricular Entidad</Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Button
                      onClick={handleOpenCredenciales}
                      className="border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal px-5 py-5 rounded-xl shadow-none transition-colors"
                    >
                      <Users className="w-4 h-4 mr-2" /> Ver Credenciales de Empresas
                    </Button>

                    <Button
                      onClick={() => setIsCsvUploadOpen(true)}
                      className="border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal px-5 py-5 rounded-xl shadow-none transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Cargar CSV
                    </Button>

                    <Button
                      onClick={() => setIsPreregConfirmOpen(true)}
                      className="border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-normal px-5 py-5 rounded-xl shadow-none transition-colors"
                      disabled={!eventos.find(e => e.activo && e.preregistro_abierto)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {eventos.find(e => e.activo && e.preregistro_abierto) ? "Finalizar Pre-registro" : "Pre-registro cerrado"}
                    </Button>

                    <Button
                      onClick={() => {
                        const ev = eventos.find(e => e.activo && !e.iniciado);
                        if (ev) handleOpenIniciarEvento(ev.id_evento);
                      }}
                      className="border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-normal px-5 py-5 rounded-xl shadow-none transition-colors"
                      disabled={!eventos.find(e => e.activo && !e.iniciado)}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      {eventos.find(e => e.activo && !e.iniciado) ? "Mostrar QR" : "QR ya activado"}
                    </Button>

                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/35 overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/10">
                      <p className="text-[11px] font-normal uppercase tracking-wider text-white/55">Empresas registradas</p>
                    </div>
                    {filteredEmpresas?.map((emp) => (
                      <div key={emp.id_empresa}>
                        <div className="px-5 py-4 border-b last:border-0 border-white/10 hover:bg-white/[0.03] transition-colors">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-normal text-sm text-white truncate">{emp.nombre_empresa}</p>
                              <p className="text-xs text-white/55 truncate">{emp.descripcion || "Organización receptora con convenio vigente."}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-white/65 bg-white/10 border border-white/10">#{emp.id_asociado}</span>
                              {emp.razon_social ? (
                                <span className="text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-md text-white/60 bg-white/5 border border-white/10">{emp.razon_social}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── EVENTOS ─────────────────────── */}
              {activeSection === "gestion" && (
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
                        <div role="button" className="border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal px-5 py-5 rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                          <Calendar className="w-4 h-4 mr-2" /> Aperturar Periodo
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
                        <DialogHeader><DialogTitle className="text-xl font-normal tracking-tight text-white">Inaugurar Semestre</DialogTitle></DialogHeader>
                        <form onSubmit={handleCrearEvento} className="space-y-4 mt-2">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Distintivo del Periodo</Label>
                            <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEvento.nombre} onChange={e => setFormEvento({ ...formEvento, nombre: e.target.value })} placeholder="Ej. Feria Institucional SJR" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Ciclo</Label>
                              <Select value={formEvento.periodo} onValueChange={v => setFormEvento({ ...formEvento, periodo: v })}>
                                <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-950 border-white/15 text-white">
                                  {["FEBRERO-JUNIO", "AGOSTO-DICIEMBRE", "VERANO", "INVIERNO"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Año</Label>
                              <Input type="number" required className="bg-white/10 border-white/15 text-white text-center font-normal" value={formEvento.anio} onChange={e => setFormEvento({ ...formEvento, anio: e.target.value })} />
                            </div>
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal mt-4">Emitir Apertura Global</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/35 overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/10">
                      <p className="text-[11px] font-normal uppercase tracking-wider text-white/55">Periodos y eventos</p>
                    </div>
                    {filteredEventos?.map((ev) => (
                      <div key={ev.id_evento}>
                        <div className="px-5 py-4 border-b last:border-0 border-white/10 hover:bg-white/[0.03] transition-colors">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h4 className="text-sm font-normal text-white">{ev.nombre}</h4>
                              <p className="text-xs text-white/55 uppercase tracking-wide">{ev.periodo} {ev.anio}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                              {typeof ev.registrados === "number" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-white/65 bg-white/10 border border-white/10">
                                  {ev.iniciado ? `${ev.participantes} part.` : `${ev.registrados} reg.`}
                                </span>
                              )}
                              {ev.iniciado ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-1 rounded-full uppercase tracking-wider text-emerald-100 bg-emerald-600/20 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" /> Iniciado
                                </span>
                              ) : ev.activo ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-1 rounded-full uppercase tracking-wider text-white/70 bg-white/5 border border-white/10">
                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" /> Pre-registro
                                  </span>
                                  <Button
                                    onClick={() => handleOpenIniciarEvento(ev.id_evento)}
                                    className="border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-50 font-normal px-3 py-1.5 rounded-lg text-[11px]"
                                  >
                                    Iniciar Proyecto
                                  </Button>
                                </>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-normal px-2.5 py-1 rounded-full uppercase tracking-wider text-white/40 bg-white/5 border border-white/10">
                                  Archivado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Ampliar Cupo</DialogTitle>
            <DialogDescription className="text-white/80">{cupoModalInfo?.nombre}</DialogDescription>
          </DialogHeader>
          {errorText && <p className="text-red-200 text-sm">{errorText}</p>}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Máximo Actual</Label>
              <Input disabled value={cupoModalInfo?.max || 0} className="bg-white/5 border-white/10 text-white/45" />
            </div>
            <div className="space-y-2">
              <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Nueva Capacidad</Label>
              <Input type="number" min={(cupoModalInfo?.max || 0) + 1} value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} className="bg-blue-500/10 border-blue-400/30 text-blue-100 focus-visible:ring-blue-500 text-lg font-normal" />
            </div>
          </div>
          <Button onClick={handleGuardarCupo} disabled={isSubmitting} className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal">Salvar Ajuste</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteModalInfo} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalInfo(null);
          setDeleteConfirmText("");
          setErrorText("");
        }
      }}>
        <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight text-white">Eliminar estudiante</DialogTitle>
            <DialogDescription className="text-white/70">
              Esta acción es irreversible. El estudiante será dado de baja del proyecto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Error message */}
            {errorText && <p className="text-white text-sm rounded-lg border border-red-700 bg-red-600 p-3 shadow-md">{errorText}</p>}

            {/* Info del alumno */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="space-y-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Estudiante a eliminar</p>
                  <p className="text-lg font-semibold text-white">{deleteModalInfo?.nombre || "Alumno"}</p>
                  <p className="text-sm text-white/60">Matrícula: {deleteModalInfo?.matricula || "--"}</p>
                </div>
              </div>
            </div>

            {/* Campo de confirmación */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/50 block mb-2">
                Escribe "Eliminar" para confirmar
              </label>
              <input
                type="text"
                placeholder="Escribe aquí..."
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-red-500/30 focus:outline-none focus:ring-1 focus:ring-red-500/20"
                disabled={deletingInscripcionId === deleteModalInfo?.id_inscripcion}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => {
                setDeleteModalInfo(null);
                setDeleteConfirmText("");
                setErrorText("");
              }}
              disabled={deletingInscripcionId === deleteModalInfo?.id_inscripcion}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="border border-red-400/35 bg-red-500/20 text-red-100 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={confirmarEliminarInscripcion}
              disabled={deleteConfirmText.trim().toLowerCase() !== "eliminar" || deletingInscripcionId === deleteModalInfo?.id_inscripcion}
            >
              {deletingInscripcionId === deleteModalInfo?.id_inscripcion ? "Eliminando..." : "Eliminar estudiante"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Agregar Alumno */}
      <Dialog
        open={isAgregarAlumnoOpen}
        onOpenChange={(open) => {
          setIsAgregarAlumnoOpen(open);
          if (!open) {
            setSelectedProyectoForAlumno(null);
            setSelectedAlumnoMatricula("");
            setProyectoSearchTerm("");
            setAlumnoSearchTerm("");
            setErrorText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-slate-950/92 border border-blue-400/20 text-white backdrop-blur-md shadow-[0_24px_80px_rgba(30,64,175,0.25)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Agregar Alumno a Proyecto</DialogTitle>
            <DialogDescription className="text-blue-100/75">
              Busca y selecciona un proyecto y un alumno para registrar la inscripción.
            </DialogDescription>
          </DialogHeader>

          {errorText && <p className="text-red-200 text-sm rounded-lg border border-red-500/20 bg-red-500/5 p-3">{errorText}</p>}

          <form onSubmit={handleAgregarAlumno} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Proyecto</Label>
              <div className="relative">
                <Input
                  value={proyectoSearchTerm}
                  onChange={(e) => {
                    setProyectoSearchTerm(e.target.value);
                    setSelectedProyectoForAlumno(null);
                    setSelectedAlumnoMatricula("");
                    setAlumnosDisponibles([]);
                    setAlumnoActiveIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (!filteredProyectosForAlumno.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setProyectoActiveIndex((prev) => Math.min(prev + 1, filteredProyectosForAlumno.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setProyectoActiveIndex((prev) => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const selected = filteredProyectosForAlumno[proyectoActiveIndex];
                      if (selected) void handleAbreModalAgregarAlumno(selected);
                    }
                  }}
                  placeholder="Buscar proyecto o empresa..."
                  className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/45"
                />
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/15 bg-black/95 p-2 space-y-1">
                  {filteredProyectosForAlumno.length ? filteredProyectosForAlumno.map((p, idx) => (
                    <button
                      key={p.id_proyecto}
                      ref={(node) => {
                        proyectoOptionRefs.current[idx] = node;
                      }}
                      type="button"
                      onClick={() => handleAbreModalAgregarAlumno(p)}
                      onMouseEnter={() => setProyectoActiveIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${idx === proyectoActiveIndex ? "border-white/20 bg-white/10" : "border-transparent hover:border-white/15 hover:bg-white/10"}`}
                    >
                      <p className="text-sm text-white">{p.nombre_proyecto}</p>
                      <p className="text-xs text-white/65">{p.empresa} • {p.cupo_actual}/{p.capacidad_max}</p>
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-xs text-white/55">No hay proyectos con cupo que coincidan.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Alumno</Label>
              <div className="relative">
                <Input
                  ref={alumnoInputRef}
                  value={alumnoSearchTerm}
                  onChange={(e) => {
                    setAlumnoSearchTerm(e.target.value);
                    setSelectedAlumnoMatricula("");
                  }}
                  onKeyDown={(e) => {
                    if (!selectedProyectoForAlumno || !filteredAlumnosDisponibles.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setAlumnoActiveIndex((prev) => Math.min(prev + 1, filteredAlumnosDisponibles.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setAlumnoActiveIndex((prev) => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const selected = filteredAlumnosDisponibles[alumnoActiveIndex];
                      if (selected) {
                        setSelectedAlumnoMatricula(selected.id_matricula);
                        setAlumnoSearchTerm(`${selected.nombre} ${selected.id_matricula}`);
                      }
                    }
                  }}
                  placeholder={selectedProyectoForAlumno ? "Buscar por nombre, matrícula o carrera..." : "Primero selecciona un proyecto"}
                  disabled={!selectedProyectoForAlumno}
                  className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/45 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/15 bg-black/95 p-2 space-y-1">
                  {!selectedProyectoForAlumno ? (
                    <p className="px-3 py-2 text-xs text-white/55">Primero selecciona un proyecto para mostrar alumnos.</p>
                  ) : filteredAlumnosDisponibles.length ? filteredAlumnosDisponibles.map((a, idx) => (
                    <button
                      key={a.id_matricula}
                      ref={(node) => {
                        alumnoOptionRefs.current[idx] = node;
                      }}
                      type="button"
                      onClick={() => {
                        setSelectedAlumnoMatricula(a.id_matricula);
                        setAlumnoSearchTerm(`${a.nombre} ${a.id_matricula}`);
                      }}
                      onMouseEnter={() => setAlumnoActiveIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${idx === alumnoActiveIndex || selectedAlumnoMatricula === a.id_matricula ? "border-emerald-400/35 bg-emerald-500/15" : "border-transparent hover:border-white/15 hover:bg-white/10"}`}
                    >
                      <p className="text-sm text-white">{a.nombre}</p>
                      <p className="text-xs text-white/65">{a.id_matricula} • {a.carrera}</p>
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-xs text-white/55">No hay alumnos disponibles que coincidan.</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!selectedAlumnoMatricula || !selectedProyectoForAlumno || isSubmitting}
              className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-normal"
            >
              {isSubmitting ? "Agregando..." : "Agregar alumno"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {commandOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setCommandOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-black/75 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
            <div className="p-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  ref={commandInputRef}
                  type="text"
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Buscar comando, alumno, empresa o proyecto..."
                  role="combobox"
                  aria-expanded={commandOpen}
                  aria-controls="admin-command-list"
                  aria-activedescendant={commandItems.length ? `admin-command-item-${commandItems[activeCommandIndex]?.id}` : undefined}
                  className="w-full h-11 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
            </div>

            <div id="admin-command-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
              {commandItems.length > 0 ? commandItems.map((item, idx) => (
                <button
                  key={item.id}
                  id={`admin-command-item-${item.id}`}
                  role="option"
                  aria-selected={idx === activeCommandIndex}
                  ref={(node) => {
                    commandItemRefs.current[idx] = node;
                  }}
                  type="button"
                  onClick={() => runCommandItem(item)}
                  className={`relative w-full text-left px-3 py-2 rounded-lg transition-colors ${idx === activeCommandIndex ? "text-white" : "hover:bg-white/10"}`}
                >
                  {idx === activeCommandIndex ? (
                    <motion.span
                      layoutId="admin-command-active-highlight"
                      className="absolute inset-0 rounded-lg border border-blue-400/35 bg-gradient-to-r from-blue-500/20 via-blue-400/10 to-transparent"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  ) : null}
                  <div className="relative z-10">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-white/50 uppercase tracking-wider">{item.hint}</p>
                  </div>
                </button>
              )) : (
                <div className="px-3 py-6 text-sm text-white/45">Sin comandos que coincidan.</div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/10 text-[11px] text-white/45 uppercase tracking-wider">
              Navegación: ↑ ↓ Enter - Abrir: Ctrl+K - Cerrar: Esc - Busca alumnos, empresas y proyectos
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Ver Credenciales */}
      <Dialog open={isCredencialesOpen} onOpenChange={setIsCredencialesOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-950/92 border border-white/15 text-white backdrop-blur-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Credenciales de Empresas</DialogTitle>
            <DialogDescription className="text-white/80">
              Haz clic en "Generar Nueva Contraseña" para ver y resetear las credenciales de acceso
            </DialogDescription>
          </DialogHeader>

          {errorText && <p className="text-red-200 text-sm rounded-lg border border-red-500/20 bg-red-500/5 p-3">{errorText}</p>}

          {credencialGenerada && (
            <div className="space-y-2 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-xs uppercase tracking-widest text-white/50">Nueva contraseña generada</p>
              <p className="text-sm text-white/70"><strong>Empresa:</strong> {credencialGenerada.nombre_empresa}</p>
              <p className="text-sm text-white/70"><strong>Correo:</strong> {credencialGenerada.correo}</p>
              <p className="text-lg font-mono font-semibold text-green-100">{credencialGenerada.password}</p>
              <p className="text-xs text-white/50">⚠️ Copia esta contraseña ahora. No se volverá a mostrar.</p>
            </div>
          )}

          <div className="space-y-2">
            {usuariosEmpresa.map((usuario) => (
              <div key={usuario.id_matricula} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">{usuario.nombre_empresa || usuario.nombre}</p>
                  <p className="text-xs text-white/60">{usuario.correo}</p>
                </div>
                <Button
                  onClick={() => handleResetPassword(usuario.id_matricula)}
                  disabled={isSubmitting}
                  size="sm"
                  className="border border-blue-400/30 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30"
                >
                  Generar Nueva Contraseña
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cargar CSV */}
      <Dialog open={isCsvUploadOpen} onOpenChange={(open) => {
        setIsCsvUploadOpen(open);
        if (!open) {
          setCsvFile(null);
          setCsvEventoId("");
          setCsvResult(null);
          setErrorText("");
        }
      }}>
        <DialogContent className="sm:max-w-lg bg-slate-950/95 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Cargar CSV de Empresas y Proyectos</DialogTitle>
            <DialogDescription className="text-white/80">
              Sube un archivo CSV con el formato especificado
            </DialogDescription>
          </DialogHeader>

          {errorText && <p className="text-red-200 text-sm rounded-lg border border-red-500/20 bg-red-500/5 p-3">{errorText}</p>}

          {csvResult && (
            <div className="space-y-2 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm font-semibold text-green-100">CSV procesado correctamente</p>
              <p className="text-xs text-white/70">Empresas creadas: {csvResult.empresas_creadas}</p>
              <p className="text-xs text-white/70">Proyectos creados: {csvResult.proyectos_creados}</p>
              {csvResult.total_errores > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-200">{csvResult.total_errores} errores:</p>
                  <ul className="text-xs text-white/60 list-disc list-inside max-h-32 overflow-y-auto">
                    {csvResult.errores.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUploadCsv} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Formato esperado</Label>
              <pre className="bg-white/5 border border-white/10 rounded-lg p-3 text-[11px] font-mono text-white/70 overflow-x-auto whitespace-pre leading-relaxed">
{`nombre_empresa,logo_url,nombre_proyecto,descripcion_proyecto,capacidad_max
Cemex,https://...,Proyecto A,Descripción,50
Femsa,,Proyecto B,Otra desc,30`}
              </pre>
            </div>

            <div className="space-y-2">
              <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Evento</Label>
              <Select value={csvEventoId} onValueChange={setCsvEventoId} required>
                <SelectTrigger className="bg-white/10 border-white/15 text-white">
                  <SelectValue placeholder="Selecciona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {eventos.map((ev) => (
                    <SelectItem key={ev.id_evento} value={String(ev.id_evento)}>
                      {ev.nombre} ({ev.periodo} {ev.anio})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Archivo CSV</Label>
              <label
                htmlFor="csv-file-input"
                className="flex items-center gap-3 cursor-pointer rounded-lg border border-dashed border-white/20 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/30 transition-colors px-3 py-2.5"
              >
                <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                  Elegir archivo
                </span>
                <span className="text-xs text-white/60 truncate flex-1">
                  {csvFile ? csvFile.name : "Ningún archivo seleccionado"}
                </span>
              </label>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                required
                className="sr-only"
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !csvFile || !csvEventoId} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-normal disabled:bg-white/10 disabled:text-white/40">
              {isSubmitting ? "Procesando..." : "Cargar CSV"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <footer className="relative z-20 border-t border-white/10 bg-slate-950/95 px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p className="text-white/50 uppercase tracking-wider font-normal">Panel Administrativo</p>
          <p className="text-white/40">Servicio Social Tec - Ecosistema Unificado</p>
        </div>
      </footer>

      {/* ── Confirmar: Cerrar Pre-registro ─────────────────────────── */}
      <Dialog open={isPreregConfirmOpen} onOpenChange={setIsPreregConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950/95 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Finalizar Pre-registro
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3 text-sm text-white/70">
            <p>
              Al finalizar el pre-registro, los alumnos que se registren <span className="text-white font-medium">después</span> de este momento
              no podrán ver el QR de inscripciones aunque completen su perfil.
            </p>
            <p>
              Los alumnos que <span className="text-white font-medium">ya se registraron</span> quedarán marcados como pre-registrados y
              podrán ver el QR cuando lo actives.
            </p>
            <p className="text-amber-400/80">Esta acción no se puede deshacer desde el panel.</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsPreregConfirmOpen(false)}
              className="flex-1 border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCerrarPreregistro}
              disabled={preregActionLoading}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-normal"
            >
              {preregActionLoading ? "Procesando..." : "Sí, cerrar pre-registro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar: Iniciar Evento ───────────────────────────────── */}
      <Dialog open={isIniciarConfirmOpen} onOpenChange={setIsIniciarConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950/95 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight text-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Iniciar Evento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3 text-sm text-white/70">
            <p>
              Al iniciar el evento, solo los alumnos que hicieron <span className="text-white font-medium">pre-registro</span> recibirán
              acceso al QR de inscripciones.
            </p>
            <p>
              Los alumnos que llegaron tarde verán el mensaje <em>&ldquo;Contacta al administrador para habilitarte.&rdquo;</em>
            </p>
            <p className="text-emerald-400/80">
              El pre-registro quedará cerrado automáticamente. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsIniciarConfirmOpen(false)}
              className="flex-1 border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmIniciarEvento}
              disabled={preregActionLoading}
              className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-normal"
            >
              {preregActionLoading ? "Procesando..." : "Sí, iniciar evento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

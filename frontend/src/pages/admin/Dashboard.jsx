import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  LogOut, Building2, Calendar, Plus, LayoutDashboard,
  Users, TrendingUp, BarChart3,
  PieChart, Activity, ChevronRight, ChevronDown, Search, SlidersHorizontal,
  Command, Trash2,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl, downloadCsvExport } from "@/lib/api";
import EstadisticasPanel from "./EstadisticasPanel";
import SystemDashboardPanel from "./SystemDashboardPanel";
import tecLogo from "@/assets/tec_logo.png";
import campusImg1 from "@/assets/login_images/ser_social_header.png";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/ser_social_monterrey.jpg";
import campusImg4 from "@/assets/login_images/ser_social3.jpg";

const campusImages = [campusImg1, campusImg2, campusImg3, campusImg4];

const normalizeSearchText = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const ALL_COMPANIES_FILTER = "todas";
const ADMIN_SYNC_MS = 5000;

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
    </motion.div>
  );
}

// ─── Chart Placeholder ───────────────────────────────────────────
function ChartPlaceholder({ title, icon: Icon, colSpan = 1, height = "h-56" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} className={colSpan === 2 ? "md:col-span-2" : ""}>
      <div className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
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
      <span className="text-xs font-mono font-normal w-16 text-right text-white/70">{current}/{max}</span>
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const commandInputRef = useRef(null);
  const commandItemRefs = useRef([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [availability, setAvailability] = useState("todas");
  const [empresaFilter, setEmpresaFilter] = useState(ALL_COMPANIES_FILTER);
  const [sortMode, setSortMode] = useState("demanda");
  const [expandedEmpresas, setExpandedEmpresas] = useState([]);

  // Modals Info
  const [isCrearProyectoOpen, setIsCrearProyectoOpen] = useState(false);
  const [isCrearEmpresaOpen, setIsCrearEmpresaOpen] = useState(false);
  const [isCrearEventoOpen, setIsCrearEventoOpen] = useState(false);
  const [cupoModalInfo, setCupoModalInfo] = useState(null);
  const [isAgregarAlumnoOpen, setIsAgregarAlumnoOpen] = useState(false);
  const [selectedProyectoForAlumno, setSelectedProyectoForAlumno] = useState(null);
  const [selectedAlumnoMatricula, setSelectedAlumnoMatricula] = useState("");
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);

  // Forms
  const [formProyecto, setFormProyecto] = useState({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10 });
  const [formEmpresa, setFormEmpresa] = useState({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
  const [formEvento, setFormEvento] = useState({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
  const [nuevaCapacidad, setNuevaCapacidad] = useState(0);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [deletingInscripcionId, setDeletingInscripcionId] = useState(null);
  const [deleteModalInfo, setDeleteModalInfo] = useState(null);
  const [preserveFiltersOnNextSearch, setPreserveFiltersOnNextSearch] = useState(false);

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
          capacidad_max: parseInt(formProyecto.cap_max)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear");
      setIsCrearProyectoOpen(false);
      setFormProyecto({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10 });
      fetchData();
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAbreModalAgregarAlumno = async (proyecto) => {
    setSelectedProyectoForAlumno(proyecto);
    setSelectedAlumnoMatricula("");
    setErrorText("");
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

  const handleQuickExport = useCallback(async (dataset) => {
    setErrorText("");
    try {
      await downloadCsvExport({ dataset, scope: "all" });
      setActiveSection("estadisticas");
    } catch (err) {
      setErrorText(err.message || "No se pudo exportar el CSV");
    }
  }, []);

  // Computed stats
  const totalAlumnos = proyectos.reduce((sum, p) => sum + (p.cupo_actual || 0), 0);
  const totalCapacidad = proyectos.reduce((sum, p) => sum + (p.capacidad_max || 0), 0);
  const eventosActivos = eventos.filter(e => e.activo).length;

  // Search filtering
  const q = normalizeSearchText(searchQuery);
  const empresasEnProyectos = useMemo(() => {
    return [...new Set(proyectos.map((p) => p.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [proyectos]);

  const filteredProyectos = useMemo(() => {
    const base = proyectos.filter((p) => {
      const alumnoMatchesQuery = Array.isArray(p.alumnos_inscritos) && p.alumnos_inscritos.some((alumno) => {
        return textMatchesQuery(alumno?.nombre, q)
          || textMatchesQuery(alumno?.matricula, q)
          || textMatchesQuery(alumno?.carrera, q)
          || textMatchesQuery(alumno?.correo, q);
      });

      const matchesQuery = !q
        || textMatchesQuery(p.nombre_proyecto, q)
        || textMatchesQuery(p.empresa, q)
        || textMatchesQuery(p.descripcion, q)
        || alumnoMatchesQuery;

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
    ? eventos.filter(
        (e) =>
          textMatchesQuery(e.nombre, q)
          || textMatchesQuery(e.periodo, q)
      )
    : eventos;

  // Group projects by empresa
  const proyectosPorEmpresa = {};
  filteredProyectos.forEach(p => {
    const key = p.empresa || "Sin Empresa";
    if (!proyectosPorEmpresa[key]) proyectosPorEmpresa[key] = [];
    proyectosPorEmpresa[key].push(p);
  });
  const companyGroupKeys = Object.keys(proyectosPorEmpresa);

  useEffect(() => {
    if (activeSection !== "proyectos") return;
    setExpandedEmpresas((prev) => {
      if (!prev.length) return companyGroupKeys;
      return prev.filter((name) => companyGroupKeys.includes(name));
    });
  }, [activeSection, filteredProyectos]);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const applySearchQuery = (nextQuery, options = {}) => {
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
  };

  useEffect(() => {
    if (!preserveFiltersOnNextSearch) return;
    setPreserveFiltersOnNextSearch(false);
  }, [searchQuery, preserveFiltersOnNextSearch]);

  const sectionMeta = {
    overview: {
      title: "Dashboard",
      description: "Observabilidad del sistema: salud, requests, latencia y actividad de login",
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
  };

  const studentCommandItems = useMemo(() => {
    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return [];

    const items = [];

    proyectos.forEach((proyecto) => {
      if (!Array.isArray(proyecto.alumnos_inscritos)) return;

      proyecto.alumnos_inscritos.forEach((alumno) => {
        const nombre = alumno?.nombre || "Alumno sin nombre";
        const matricula = alumno?.matricula || "Sin matrícula";
        const carrera = alumno?.carrera || "";
        const correo = alumno?.correo || "";

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
          hint: `Proyecto: ${proyecto.nombre_proyecto || "Sin proyecto"} - ${proyecto.empresa || "Sin Empresa"}`,
          keepSearchContext: true,
          action: () => {
            setActiveSection("proyectos");
            setExpandedEmpresas((prev) => {
              const companyKey = proyecto.empresa || "Sin Empresa";
              if (prev.includes(companyKey)) return prev;
              return [...prev, companyKey];
            });
            setAvailability("todas");
            setEmpresaFilter(proyecto.empresa || ALL_COMPANIES_FILTER);
            applySearchQuery(alumno?.matricula || alumno?.nombre || "", { preserveFilters: true });
          },
        });
      });
    });

    return items.slice(0, 30);
  }, [proyectos, commandQuery]);

  const projectCommandItems = useMemo(() => {
    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return [];

    const items = proyectos
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
        },
      }));

    return items;
  }, [proyectos, commandQuery]);

  const companyCommandItems = useMemo(() => {
    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return [];

    const items = empresas
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
        },
      }));

    return items;
  }, [empresas, commandQuery, companyGroupKeys]);

  const commandItems = useMemo(() => {
    const baseItems = [
      { id: "sec-overview", label: "Ir a Dashboard", hint: "Secciones", keepSearchContext: false, action: () => setActiveSection("overview") },
      { id: "sec-stats", label: "Ir a Estadísticas", hint: "Secciones", keepSearchContext: false, action: () => setActiveSection("estadisticas") },
      { id: "sec-projects", label: "Ir a Proyectos", hint: "Secciones", keepSearchContext: false, action: () => setActiveSection("proyectos") },
      { id: "sec-manage", label: "Ir a Gestión Integral", hint: "Secciones", keepSearchContext: false, action: () => setActiveSection("gestion") },
      { id: "act-new-project", label: "Abrir: Registrar Proyecto", hint: "Acciones", keepSearchContext: false, action: () => { setActiveSection("proyectos"); setIsCrearProyectoOpen(true); } },
      { id: "act-new-company", label: "Abrir: Dar de Alta Organización", hint: "Acciones", keepSearchContext: false, action: () => { setActiveSection("gestion"); setIsCrearEmpresaOpen(true); } },
      { id: "act-new-event", label: "Abrir: Aperturar Periodo", hint: "Acciones", keepSearchContext: false, action: () => { setActiveSection("gestion"); setIsCrearEventoOpen(true); } },
      { id: "act-add-alumno", label: "Abrir: Agregar Alumno a Proyecto", hint: "Acciones", keepSearchContext: false, action: () => { setActiveSection("proyectos"); setIsAgregarAlumnoOpen(true); setSelectedProyectoForAlumno(null); } },
      { id: "act-export-ins", label: "Exportar CSV: Inscripciones", hint: "Exportación", keepSearchContext: false, action: () => { void handleQuickExport("inscripciones"); } },
      { id: "act-export-proy", label: "Exportar CSV: Proyectos", hint: "Exportación", keepSearchContext: false, action: () => { void handleQuickExport("proyectos"); } },
      { id: "act-export-emp", label: "Exportar CSV: Empresas", hint: "Exportación", keepSearchContext: false, action: () => { void handleQuickExport("empresas"); } },
      { id: "act-export-padron", label: "Exportar CSV: Usuarios/Padrón", hint: "Exportación", keepSearchContext: false, action: () => { void handleQuickExport("usuarios_padron"); } },
      { id: "act-export-logs", label: "Exportar CSV: Logs", hint: "Exportación", keepSearchContext: false, action: () => { void handleQuickExport("logs"); } },
    ];

    const normalized = normalizeSearchText(commandQuery);
    if (!normalized) return baseItems;

    const filteredBaseItems = baseItems.filter((item) =>
      textMatchesQuery(item.label, normalized)
      || textMatchesQuery(item.hint, normalized)
    );

    return [...filteredBaseItems, ...projectCommandItems, ...companyCommandItems, ...studentCommandItems];
  }, [commandQuery, studentCommandItems, projectCommandItems, companyCommandItems, handleQuickExport]);

  const runCommandItem = (item) => {
    if (!item) return;

    item.action();
    if (!item.keepSearchContext) {
      applySearchQuery("");
    }
    setCommandOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const isOpenShortcut = (event.ctrlKey || event.metaKey) && key === "k";

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
          runCommandItem(selected);
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
    if (!commandOpen) return;

    const activeElement = commandItemRefs.current[activeCommandIndex];
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [commandOpen, activeCommandIndex]);

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={currentBgIndex}
            src={campusImages[currentBgIndex]}
            alt="Campus"
            className="w-full h-full object-cover fixed inset-0 blur-[4px] scale-105"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "-100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0)_45%)]" />
      </div>

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-9 sm:h-11 w-auto brightness-0 invert drop-shadow-md" />
          <div>
            <p className="text-white/70 text-xs sm:text-sm font-normal tracking-wide uppercase">Portal Administracion</p>
            <p className="text-white/45 text-[11px] sm:text-xs">Sistema de Servicio Social</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Command palette"
          >
            <Command className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-normal">Ctrl+K</span>
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
          <div className="mb-6 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-4 sm:p-5 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
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
                <SystemDashboardPanel />
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
                      Expandir todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedEmpresas([])}
                      className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-[11px] font-normal uppercase tracking-wider text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Colapsar todas
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => setIsAgregarAlumnoOpen(true)}
                      className="w-full sm:w-auto border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 font-normal px-5 py-5 rounded-xl shadow-none transition-all"
                    >
                      <Users className="w-4 h-4 mr-2" /> Agregar Alumno
                    </Button>
                    <Dialog open={isCrearProyectoOpen} onOpenChange={setIsCrearProyectoOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 font-normal px-5 py-5 rounded-xl shadow-none transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Aperturar Puesto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl bg-slate-950/92 border border-white/15 text-white shadow-2xl backdrop-blur-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-normal tracking-tight text-white">Nuevo Puesto de Proyecto</DialogTitle>
                        <DialogDescription className="text-white/60">Configura la empresa anfitriona, el evento y su aforo.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCrearProyecto} className="space-y-5 mt-4">
                        {errorText && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm font-medium">{errorText}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Empresa Receptora</Label>
                            <Select required onValueChange={v => setFormProyecto({...formProyecto, id_empresa: v})}>
                              <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/15 text-white">
                                {empresas.map(e => <SelectItem key={e.id_empresa} value={e.id_empresa.toString()}>{e.nombre_empresa}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Evento Activo</Label>
                            <Select required onValueChange={v => setFormProyecto({...formProyecto, id_evento: v})}>
                              <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/15 text-white">
                                {eventos.filter(e => e.activo).map(ev => <SelectItem key={ev.id_evento} value={ev.id_evento.toString()}>{ev.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Título Oficial del Proyecto</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formProyecto.nombre} onChange={e => setFormProyecto({...formProyecto, nombre: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Descripción (Opcional)</Label>
                          <Input className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formProyecto.desc} onChange={e => setFormProyecto({...formProyecto, desc: e.target.value})} />
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                          <div className="space-y-2">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Límite de Alumnos</Label>
                            <Input type="number" required min="1" className="bg-white/10 border-white/15 text-white font-normal text-lg text-center" value={formProyecto.cap_max} onChange={e => setFormProyecto({...formProyecto, cap_max: e.target.value})} />
                          </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 font-normal shadow-none">Finalizar y Crear Proyecto</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 p-3 sm:p-4 backdrop-blur-sm">
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
                  </div>

                  <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    <div className="w-full md:w-auto md:min-w-[260px]">
                      <label className="sr-only" htmlFor="empresa-filter-select">Filtrar por empresa</label>
                      <select
                        id="empresa-filter-select"
                        value={empresaFilter}
                        onChange={(e) => setEmpresaFilter(e.target.value)}
                        className="h-9 w-full rounded-lg bg-white/10 border border-white/20 text-white text-xs px-2.5 focus:outline-none"
                      >
                        <option value={ALL_COMPANIES_FILTER} className="bg-slate-900 text-white">Empresa: Todas</option>
                        {empresasEnProyectos.map((empresa) => (
                          <option key={empresa} value={empresa} className="bg-slate-900 text-white">
                            {empresa}
                          </option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                      className="h-9 rounded-lg bg-white/10 border border-white/20 text-white text-xs px-2.5 focus:outline-none"
                    >
                      <option value="demanda" className="bg-slate-900 text-white">Ordenar: Demanda</option>
                      <option value="disponibilidad" className="bg-slate-900 text-white">Ordenar: Ultimos lugares</option>
                      <option value="alfabetico" className="bg-slate-900 text-white">Ordenar: A-Z</option>
                    </select>
                  </div>
                </div>

                {/* BY EMPRESA VIEW */}
                <div className="space-y-4">
                    {Object.entries(proyectosPorEmpresa).map(([empresaName, proys]) => (
                      <div key={empresaName} className="rounded-2xl border border-white/15 bg-black/35 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden transition-all">
                        <button
                          onClick={() => setExpandedEmpresas((prev) => prev.includes(empresaName) ? prev.filter((name) => name !== empresaName) : [...prev, empresaName])}
                          className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-300 border border-blue-400/25">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="font-normal text-sm text-white">{empresaName}</p>
                              <p className="text-xs text-white/55">{proys.length} proyecto{proys.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-normal px-2 py-1 rounded-md bg-white/10 text-white/75 border border-white/10">
                              {proys.reduce((s, p) => s + (p.cupo_actual||0), 0)}/{proys.reduce((s, p) => s + (p.capacidad_max||0), 0)} plazas
                            </span>
                            <motion.div animate={{ rotate: expandedEmpresas.includes(empresaName) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-white/55" />
                            </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedEmpresas.includes(empresaName) && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                              <div className="border-t border-white/10">
                                {proys.map(p => (
                                  <div key={p.id_proyecto} className="px-6 py-3.5 border-b last:border-0 transition-colors border-white/10 hover:bg-white/[0.03]">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-normal text-white">{p.nombre_proyecto}</p>
                                      </div>
                                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                                        <div className="w-full md:w-40"><OccupancyBar current={p.cupo_actual} max={p.capacidad_max} /></div>
                                        {p.cupo_actual >= p.capacidad_max ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2.5 py-1 rounded-full w-24 justify-center text-red-300 bg-red-500/10 border border-red-500/25"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Lleno</span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2.5 py-1 rounded-full w-24 justify-center text-emerald-300 bg-emerald-500/10 border border-emerald-500/25"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponible</span>
                                        )}
                                        <div className="flex gap-1.5">
                                          <button onClick={() => { setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max }); setNuevaCapacidad(p.capacidad_max + 1); }} className="text-xs font-normal text-blue-200 bg-blue-500/15 border border-blue-400/30 px-2.5 py-1 rounded-lg">+ Cupo</button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 rounded-xl border border-white/10 bg-black/25 overflow-hidden">
                                      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                                        <p className="text-[11px] font-normal uppercase tracking-wider text-white/60">Alumnos enrolados</p>
                                        <p className="text-xs text-white/55">{Array.isArray(p.alumnos_inscritos) ? p.alumnos_inscritos.length : 0}</p>
                                      </div>

                                      {Array.isArray(p.alumnos_inscritos) && p.alumnos_inscritos.length > 0 ? (
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
                                              {p.alumnos_inscritos.map((alumno) => {
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
                    className="border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 font-normal px-5 py-5 rounded-xl shadow-none transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Registrar Proyecto
                  </Button>

                  <Dialog open={isCrearEmpresaOpen} onOpenChange={setIsCrearEmpresaOpen}>
                    <DialogTrigger asChild>
                      <Button className="border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 font-normal px-5 py-5 rounded-xl shadow-none transition-colors">
                        <Building2 className="w-4 h-4 mr-2" /> Dar de Alta Organización
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
                      <DialogHeader><DialogTitle className="text-xl font-normal tracking-tight text-white">Registrar Socio Formador</DialogTitle></DialogHeader>
                      <form onSubmit={handleCrearEmpresa} className="space-y-4 mt-2">
                        {errorText && <div className="text-sm text-red-200 bg-red-500/10 p-2 rounded border border-red-500/30">{errorText}</div>}
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">ID Asociado / Convenio</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.id_asociado} onChange={e => setFormEmpresa({...formEmpresa, id_asociado: e.target.value})} placeholder="Ej. SF-XXX24" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Nombre Público (Comercial)</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.nombre} onChange={e => setFormEmpresa({...formEmpresa, nombre: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Denominación Legal (Razón Social)</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.razon} onChange={e => setFormEmpresa({...formEmpresa, razon: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Descripción de Giro Corporativo</Label>
                          <Input className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEmpresa.desc} onChange={e => setFormEmpresa({...formEmpresa, desc: e.target.value})} />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 font-normal mt-4">Matricular Entidad</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10">
                    <p className="text-[11px] font-normal uppercase tracking-wider text-white/55">Empresas registradas</p>
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
                              <p className="font-normal text-sm text-white truncate">{emp.nombre_empresa}</p>
                              <p className="text-xs text-white/55 truncate">{emp.descripcion || "Organización receptora con convenio vigente."}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-white/65 bg-white/10 border border-white/10">#{emp.id_asociado}</span>
                            {emp.razon_social ? (
                              <span className="text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-md text-blue-200 bg-blue-500/15 border border-blue-400/25">{emp.razon_social}</span>
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
                      <Button className="border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 font-normal px-5 py-5 rounded-xl shadow-none transition-colors">
                        <Calendar className="w-4 h-4 mr-2" /> Aperturar Periodo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
                      <DialogHeader><DialogTitle className="text-xl font-normal tracking-tight text-white">Inaugurar Semestre</DialogTitle></DialogHeader>
                      <form onSubmit={handleCrearEvento} className="space-y-4 mt-2">
                        <div className="space-y-1">
                          <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Distintivo del Periodo</Label>
                          <Input required className="bg-white/10 border-white/15 text-white placeholder:text-white/45" value={formEvento.nombre} onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} placeholder="Ej. Feria Institucional SJR" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Ciclo</Label>
                            <Select value={formEvento.periodo} onValueChange={v => setFormEvento({...formEvento, periodo: v})}>
                              <SelectTrigger className="bg-white/10 border-white/15 text-white"><SelectValue/></SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/15 text-white">
                                {["FEBRERO-JUNIO", "AGOSTO-DICIEMBRE", "VERANO", "INVIERNO"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70 text-[11px] font-normal uppercase tracking-wider">Año</Label>
                            <Input type="number" required className="bg-white/10 border-white/15 text-white text-center font-normal" value={formEvento.anio} onChange={e => setFormEvento({...formEvento, anio: e.target.value})} />
                          </div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 font-normal mt-4">Emitir Apertura Global</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10">
                    <p className="text-[11px] font-normal uppercase tracking-wider text-white/55">Periodos y eventos</p>
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
                              <h4 className="text-sm font-normal text-white">{ev.nombre}</h4>
                              <p className="text-xs text-white/55 uppercase tracking-wide">{ev.periodo} {ev.anio} - {ev.semestre}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-start sm:justify-end">
                            {ev.activo ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-1 rounded-full uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> En Curso
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-normal px-2.5 py-1 rounded-full uppercase tracking-wider text-white/55 bg-white/10 border border-white/10">
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
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Ampliar Cupo</DialogTitle>
            <DialogDescription className="text-white/60">{cupoModalInfo?.nombre}</DialogDescription>
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
          <Button onClick={handleGuardarCupo} disabled={isSubmitting} className="w-full border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 font-normal">Salvar Ajuste</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteModalInfo} onOpenChange={(open) => !open && setDeleteModalInfo(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Confirmar baja de registro</DialogTitle>
            <DialogDescription className="text-white/60">Esta acción quitará al alumno del proyecto y liberará su cupo.</DialogDescription>
          </DialogHeader>
          {errorText && <p className="text-red-200 text-sm">{errorText}</p>}
          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white/80">
            <p className="font-normal text-white">{deleteModalInfo?.nombre || "Alumno"}</p>
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

      {/* Modal Agregar Alumno */}
      <Dialog open={isAgregarAlumnoOpen} onOpenChange={setIsAgregarAlumnoOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal tracking-tight text-white">Agregar Alumno a Proyecto</DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedProyectoForAlumno ? selectedProyectoForAlumno.nombre_proyecto : "Selecciona un proyecto"}
            </DialogDescription>
          </DialogHeader>
          {errorText && <p className="text-red-200 text-sm">{errorText}</p>}
          
          {!selectedProyectoForAlumno ? (
            <div className="space-y-3">
              <p className="text-sm text-white/70">Selecciona un proyecto:</p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {proyectos.filter(p => p.cupo_actual < p.capacidad_max).map(p => (
                  <button
                    key={p.id_proyecto}
                    onClick={() => handleAbreModalAgregarAlumno(p)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{p.nombre_proyecto}</p>
                    <p className="text-xs text-white/60">{p.empresa} • {p.cupo_actual}/{p.capacidad_max}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleAgregarAlumno} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white text-[11px] font-normal uppercase tracking-wider">Alumno</Label>
                <select
                  value={selectedAlumnoMatricula}
                  onChange={e => setSelectedAlumnoMatricula(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/15 bg-slate-950 text-white placeholder-white/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent"
                >
                  <option value="">-- Selecciona un alumno --</option>
                  {alumnosDisponibles.map(a => (
                    <option key={a.id_matricula} value={a.id_matricula}>
                      {a.nombre} ({a.id_matricula}) - {a.carrera}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setSelectedProyectoForAlumno(null);
                    setSelectedAlumnoMatricula("");
                  }}
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedAlumnoMatricula || isSubmitting}
                  className="flex-1 border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 font-normal"
                >
                  {isSubmitting ? "Agregando..." : "Agregar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <footer className="relative z-20 border-t border-white/10 bg-black/30 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p className="text-white/50 uppercase tracking-wider font-normal">Panel Administrativo</p>
          <p className="text-white/40">Servicio Social Tec - Ecosistema Unificado</p>
        </div>
      </footer>

      {commandOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCommandOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-black/75 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  ref={commandInputRef}
                  type="text"
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
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
                    <p className="text-sm font-normal text-white">{item.label}</p>
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
    </div>
  );
}

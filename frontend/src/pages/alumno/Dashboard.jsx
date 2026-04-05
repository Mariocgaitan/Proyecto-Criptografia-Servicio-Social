import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, QrCode, CheckCircle2, User, Building2, Calendar, HardHat, AlertTriangle, Users, Search, SlidersHorizontal, Flame, Info } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { StudentProfileForm } from "@/components/alumno/StudentProfileForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import tecLogo from "@/assets/tec_logo.png";
import campusImg1 from "@/assets/login_images/ser_social_header.png";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/ser_social_monterrey.jpg";
import campusImg4 from "@/assets/login_images/ser_social3.jpg";

function SocialIcon({ children, href = "#" }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all duration-200">
      {children}
    </a>
  );
}

const campusImages = [campusImg1, campusImg2, campusImg3, campusImg4];
const ENROLLMENT_POLL_MS = 3000;

function getProjectMetrics(project) {
  const pct = project.capacidad_max > 0 ? Math.round((project.cupo_actual / project.capacidad_max) * 100) : 0;
  const remaining = Math.max((project.capacidad_max || 0) - (project.cupo_actual || 0), 0);
  const demandScore = project.lleno ? 1000 : (pct * 2) + (remaining <= 2 ? 40 : remaining <= 5 ? 20 : 0);

  let demandLabel = "Disponible";
  let demandTone = "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";

  if (project.lleno) {
    demandLabel = "Agotado";
    demandTone = "text-red-300 border-red-500/30 bg-red-500/10";
  } else if (remaining <= 2 || pct >= 85) {
    demandLabel = "Alta demanda";
    demandTone = "text-amber-300 border-amber-500/30 bg-amber-500/10";
  } else if (pct >= 60) {
    demandLabel = "Interes alto";
    demandTone = "text-sky-300 border-sky-500/30 bg-sky-500/10";
  }

  return { pct, remaining, demandScore, demandLabel, demandTone };
}

// ─── Project Card (catalog style) ────────────────────────────────
function ProjectCard({ project, index, rankByDemand }) {
  const { pct, remaining, demandLabel, demandTone } = getProjectMetrics(project);
  const barColor = project.lleno ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Card className={cn(
        "relative overflow-hidden pt-0 bg-black/30 border-white/15 text-white hover:bg-black/35 hover:border-blue-400/35 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)]",
        project.lleno && "opacity-40 grayscale pointer-events-none"
      )}>

        <CardHeader className="pb-3">
          <CardAction>
            <div className="flex items-center gap-2">
              {rankByDemand && !project.lleno && (
                <Badge className="bg-white/10 border-white/20 text-white/85 text-[10px] font-normal uppercase tracking-wider">
                  #{rankByDemand}
                </Badge>
              )}
              <Badge className={cn("text-[10px] font-normal uppercase tracking-wider border", demandTone)}>
                {demandLabel}
              </Badge>
            </div>
          </CardAction>

          <CardTitle className="text-white font-normal text-[17px] leading-tight group-hover:text-blue-200 transition-colors">
            {project.nombre_proyecto}
          </CardTitle>
          <CardDescription className="text-white/50 pt-1">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
              <span className="text-blue-200/75 text-[11px] font-normal tracking-wide uppercase truncate">
                {project.empresa}
              </span>
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-4">
          {project.descripcion && (
            <p className="text-white/45 text-xs leading-relaxed line-clamp-2 group-hover:text-white/60 transition-colors">
              {project.descripcion}
            </p>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/45 uppercase tracking-wider font-normal">Ocupacion</span>
              <span className="text-[10px] text-white/70 font-mono font-normal">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ delay: index * 0.05 + 0.2, duration: 0.7, ease: "easeOut" }}
                className={`h-full ${barColor} rounded-full`}
              />
            </div>
            <div className="mt-2 text-[11px] text-white/55">
              {project.cupo_actual}/{project.capacidad_max} ocupados
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-white/10 bg-white/[0.03] py-3 flex items-center justify-between">
          <span className="text-[11px] text-white/55 font-medium">
            {project.lleno ? "Sin lugares disponibles" : `${remaining} lugar(es) disponible(s)`}
          </span>
          {!project.lleno && remaining <= 2 && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-normal text-amber-300">
              <Flame className="w-3 h-3" /> Ultimos lugares
            </span>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// ─── Project Grid V2 ─────────────────────────────────────────────
function ProjectGrid({ proyectos }) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("todas");
  const [empresaFilter, setEmpresaFilter] = useState("todas");
  const [sortMode, setSortMode] = useState("demanda");

  const empresas = useMemo(() => {
    if (!proyectos) return [];
    return [...new Set(proyectos.map((p) => p.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [proyectos]);

  const filteredProjects = useMemo(() => {
    if (!proyectos) return [];

    const normalizedQuery = query.trim().toLowerCase();

    const result = proyectos.filter((project) => {
      const { remaining } = getProjectMetrics(project);
      const matchesQuery = !normalizedQuery
        || project.nombre_proyecto?.toLowerCase().includes(normalizedQuery)
        || project.empresa?.toLowerCase().includes(normalizedQuery)
        || project.descripcion?.toLowerCase().includes(normalizedQuery);

      const matchesAvailability =
        availability === "todas"
        || (availability === "disponibles" && !project.lleno)
        || (availability === "ultimos" && !project.lleno && remaining <= 2)
        || (availability === "llenos" && project.lleno);

      const matchesEmpresa = empresaFilter === "todas" || project.empresa === empresaFilter;
      return matchesQuery && matchesAvailability && matchesEmpresa;
    });

    result.sort((a, b) => {
      if (sortMode === "alfabetico") {
        return (a.nombre_proyecto || "").localeCompare(b.nombre_proyecto || "");
      }
      if (sortMode === "disponibilidad") {
        return getProjectMetrics(a).remaining - getProjectMetrics(b).remaining;
      }
      return getProjectMetrics(b).demandScore - getProjectMetrics(a).demandScore;
    });

    return result;
  }, [proyectos, query, availability, empresaFilter, sortMode]);

  if (!proyectos || proyectos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <HardHat className="w-12 h-12 text-white/15 mb-4" />
        <p className="text-white/40 text-sm font-medium">No hay proyectos disponibles en este evento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar proyecto o empresa"
              className="w-full h-10 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/55 font-normal mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
            </div>

            {["todas", "disponibles", "ultimos", "llenos"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAvailability(item)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border transition-colors",
                  availability === item
                    ? "bg-blue-500/25 border-blue-400/40 text-white"
                    : "bg-white/5 border-white/15 text-white/70 hover:text-white"
                )}
              >
                {item === "todas" && "Todas"}
                {item === "disponibles" && "Disponibles"}
                {item === "ultimos" && "Ultimos lugares"}
                {item === "llenos" && "Llenos"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
            <SelectTrigger className="w-full h-10 rounded-xl bg-white/5 border-white/15 text-white/85 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/30">
              {empresaFilter === "todas" ? "Empresa: Todas" : `Empresa: ${empresaFilter}`}
            </SelectTrigger>
            <SelectContent className="bg-black/95 border-white/15 text-white backdrop-blur-md">
              <SelectItem value="todas" className="text-white focus:bg-white/10 focus:text-white">Empresa: Todas</SelectItem>
              {empresas.map((empresa) => (
                <SelectItem key={empresa} value={empresa} className="text-white focus:bg-white/10 focus:text-white">{empresa}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={setSortMode}>
            <SelectTrigger className="w-full h-10 rounded-xl bg-white/5 border-white/15 text-white/85 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/30">
              {sortMode === "demanda" && "Ordenar: Demanda"}
              {sortMode === "disponibilidad" && "Ordenar: Ultimos lugares"}
              {sortMode === "alfabetico" && "Ordenar: A-Z"}
            </SelectTrigger>
            <SelectContent className="bg-black/95 border-white/15 text-white backdrop-blur-md">
              <SelectItem value="demanda" className="text-white focus:bg-white/10 focus:text-white">Ordenar: Demanda</SelectItem>
              <SelectItem value="disponibilidad" className="text-white focus:bg-white/10 focus:text-white">Ordenar: Ultimos lugares</SelectItem>
              <SelectItem value="alfabetico" className="text-white focus:bg-white/10 focus:text-white">Ordenar: A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>



      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-black/20 p-8 text-center text-white/65 text-sm">
          No encontramos proyectos con esos filtros. Prueba otra combinacion.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((p, i) => (
            <ProjectCard
              key={p.id_proyecto}
              project={p}
              index={i}
              rankByDemand={sortMode === "demanda" && !p.lleno ? i + 1 : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ProfileForm has been moved to its own component in src/components/alumno/StudentProfileForm.jsx

// ─── QR Credential Tab Content ───────────────────────────────────
function QRCredentialView({ evento, qrPayload, timeLeft, perfilIncompleto, onProfileUpdate, initialProfileData, isEditing, onToggleEdit }) {
  const [qrSize, setQrSize] = useState(400);
  const [qrLogoSize, setQrLogoSize] = useState(50);
  const TOTAL_QR_SECONDS = 30;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / TOTAL_QR_SECONDS) * 100));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setQrSize(240);
        setQrLogoSize(30);
      } else {
        setQrSize(400);
        setQrLogoSize(50);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full h-full font-sans flex flex-col">
      {perfilIncompleto || isEditing ? (
        <StudentProfileForm 
          initialData={initialProfileData} 
          onSubmit={() => {
            onProfileUpdate();
            onToggleEdit(false);
          }} 
          onCancel={isEditing ? () => onToggleEdit(false) : null}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 w-full flex justify-center items-center"
        >
          <div className="flex flex-col items-center justify-center gap-8 text-center">
            {qrPayload ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-white p-6 rounded-3xl shadow-2xl flex items-center justify-center"
              >
                <QRCodeSVG
                  value={qrPayload}
                  size={qrSize}
                  level="H"
                  marginSize={4}
                  imageSettings={{
                    src: "/ser_social.svg",
                    width: qrLogoSize,
                    height: qrLogoSize,
                    excavate: true,
                  }}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-white/30">
                <QrCode className="w-16 h-16 stroke-[1]" />
                <p className="text-xs font-normal tracking-widest uppercase">Generando Llave...</p>
              </div>
            )}

            {/* Event Info */}
            <div className="w-full max-w-2xl flex flex-col justify-center py-2">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h3 className="text-3xl font-normal text-white mb-2 tracking-tight">{evento.nombre}</h3>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 flex flex-col items-center gap-3"
              >
                <div className="relative group">
                  <Button
                    variant="outline"
                    onClick={() => onToggleEdit(true)}
                    className="h-11 px-8 rounded-xl bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all gap-2 font-normal text-sm"
                  >
                    <User className="w-4 h-4" />
                    Editar Información
                  </Button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white/80 uppercase tracking-[0.2em] font-light whitespace-nowrap shadow-lg">
                    Al editar se generará una nueva llave
                  </div>
                </div>

                <div className="w-full max-w-md mt-2">
                  <div className="text-center text-[11px] sm:text-xs tracking-[0.18em] uppercase text-white/70 mb-2">
                    {timeLeft.toString().padStart(2, "0")}s
                  </div>
                  <div className="h-2 w-full rounded-full border border-white/15 bg-white/8 overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.02, ease: "linear" }}
                      className={cn(
                        "h-full rounded-full",
                        timeLeft <= 5 ? "bg-tec-denim/80" : "bg-tec-primary"
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Enrolled View ───────────────────────────────────────────────
function EnrolledView({ inscripcion, eventoNombre }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-emerald-500/[0.06] border border-emerald-500/20 p-8 backdrop-blur-xl"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/15 rounded-full blur-[60px] -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/10 rounded-full blur-[50px] -ml-16 -mb-16" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-normal text-emerald-300">{eventoNombre}</h3>
            <p className="text-emerald-500 font-normal tracking-widest text-[10px] uppercase mt-1">
              Inscripción Completada Exitosamente
            </p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-black/20 p-5 rounded-2xl border border-emerald-500/10">
            <p className="text-[10px] text-emerald-500 uppercase font-normal tracking-widest mb-2">Empresa Anfitriona</p>
            <p className="font-normal text-emerald-100 flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-emerald-400" /> {inscripcion.empresa}
            </p>
          </div>
          <div className="bg-black/20 p-5 rounded-2xl border border-emerald-500/10">
            <p className="text-[10px] text-emerald-500 uppercase font-normal tracking-widest mb-2">Proyecto Asignado</p>
            <p className="font-medium text-emerald-200/80 leading-snug text-base">{inscripcion.nombre_proyecto}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Event Card (orchestrator) ───────────────────────────────────
const EventCard = ({ evento, onEnrollmentDetected }) => {
  const [qrPayload, setQrPayload] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState("credencial");
  const [perfilIncompleto, setPerfilIncompleto] = useState(false);
  const [initialProfileData, setInitialProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchQR = useCallback(async () => {
    if (evento.inscrito) return;
    try {
      const res = await fetch(apiUrl(`/api/v1/alumno/qr-payload?id_evento=${evento.id_evento}`), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.ya_inscrito) {
          setQrPayload(null);
          setTimeLeft(0);
          onEnrollmentDetected?.();
        } else if (data.perfil_incompleto) {
          setPerfilIncompleto(true);
          setInitialProfileData(data.datos_actuales);
          setQrPayload(null);
          setTimeLeft(data.expira_en_segundos);
        } else {
          setPerfilIncompleto(false);
          setQrPayload(data.qr_data);
          setTimeLeft(data.expira_en_segundos);
          if (data.datos_actuales) setInitialProfileData(data.datos_actuales);
        }
      }
    } catch (err) {
      setTimeout(fetchQR, 5000);
    }
  }, [evento.id_evento, evento.inscrito, onEnrollmentDetected]);

  useEffect(() => {
    fetchQR();
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { fetchQR(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchQR]);

  // If already enrolled, show the enrolled view
  if (evento.inscrito && evento.inscripcion) {
    return <EnrolledView inscripcion={evento.inscripcion} eventoNombre={evento.nombre} />;
  }

  return (
    <div className="[perspective:1000px] relative flex flex-col w-full items-start justify-start">
      <div className="w-full flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("credencial")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-normal transition-colors border",
            activeTab === "credencial"
              ? "bg-blue-600/30 border-blue-500/40 text-white"
              : "bg-white/5 border-white/10 text-white/70 hover:text-white"
          )}
        >
          QR Dinamico
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("proyectos")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-normal transition-colors border",
            activeTab === "proyectos"
              ? "bg-blue-600/30 border-blue-500/40 text-white"
              : "bg-white/5 border-white/10 text-white/70 hover:text-white"
          )}
        >
          Oferta de Servicios
        </button>
      </div>

      <div className="w-full mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "credencial" ? (
            <motion.div
              key="credencial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full p-6 sm:p-8"
            >
              <QRCredentialView
                evento={evento}
                qrPayload={qrPayload}
                timeLeft={timeLeft}
                perfilIncompleto={perfilIncompleto}
                initialProfileData={initialProfileData}
                isEditing={isEditing}
                onToggleEdit={setIsEditing}
                onProfileUpdate={() => fetchQR()}
              />
            </motion.div>
          ) : (
            <motion.div
              key="proyectos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full rounded-3xl bg-black/25 border border-white/15 backdrop-blur-md p-4 sm:p-6"
            >
              <div className="mb-5" />
              <ProjectGrid proyectos={evento.proyectos} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN DASHBOARD ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const navigate = useNavigate();

  const refreshEnrollmentStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/alumno/estado-inscripcion"), { credentials: "include" });
      if (!res.ok) return;

      const latest = await res.json();
      const latestEventos = Array.isArray(latest?.eventos) ? latest.eventos : [];
      const latestByEventId = new Map(latestEventos.map((e) => [e.id_evento, e]));

      setData((prev) => {
        if (!prev?.eventos?.length) return prev;

        let changed = false;

        const nextEventos = prev.eventos.map((evento) => {
          const latestEvento = latestByEventId.get(evento.id_evento);
          if (!latestEvento) return evento;
          
          if (!latestEvento.inscrito && evento.inscrito) {
            changed = true;
            return {
              ...evento,
              inscrito: false,
              inscripcion: null
            };
          }

          if (!latestEvento.inscrito) return evento;

          const nextInscripcion = latestEvento.proyecto
            ? {
                id_proyecto: evento.inscripcion?.id_proyecto ?? null,
                nombre_proyecto: latestEvento.proyecto.nombre,
                empresa: latestEvento.proyecto.empresa,
                descripcion: latestEvento.proyecto.descripcion,
                timestamp: latestEvento.timestamp || evento.inscripcion?.timestamp || null,
              }
            : evento.inscripcion;

          const wasInscrito = Boolean(evento.inscrito);
          const sameNombreProyecto = (evento.inscripcion?.nombre_proyecto || null) === (nextInscripcion?.nombre_proyecto || null);
          const sameEmpresa = (evento.inscripcion?.empresa || null) === (nextInscripcion?.empresa || null);
          const sameTimestamp = (evento.inscripcion?.timestamp || null) === (nextInscripcion?.timestamp || null);

          if (wasInscrito && sameNombreProyecto && sameEmpresa && sameTimestamp) {
            return evento;
          }

          changed = true;
          return {
            ...evento,
            inscrito: true,
            inscripcion: nextInscripcion,
          };
        });

        return changed ? { ...prev, eventos: nextEventos } : prev;
      });
    } catch {
      // Best-effort polling to keep enrollment status fresh.
    }
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/v1/alumno/dashboard"), { credentials: "include" })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) throw new Error("Acceso denegado. Por favor, re-autentícate.");
          throw new Error("Error obteniendo datos del servidor.");
        }
        return res.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => {
        setApiError(err.message);
        setLoading(false);
      });
  }, []);



  useEffect(() => {
    if (!data?.eventos?.length) return undefined;

    refreshEnrollmentStatus();
    const pollId = setInterval(refreshEnrollmentStatus, ENROLLMENT_POLL_MS);

    return () => clearInterval(pollId);
  }, [data?.eventos, refreshEnrollmentStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black" />
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 max-w-md text-center backdrop-blur-md"
        >
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-normal text-white mb-2">Error de Sesión</h2>
          <p className="text-red-200/80 text-sm mb-6">{apiError}</p>
          <Button onClick={() => { logout(); navigate("/login"); }} className="w-full bg-tec-primary hover:bg-tec-denim text-white font-normal rounded-xl">
            Volver al Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-dvh min-h-screen relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={campusImg1}
          alt="Campus"
          className="w-full h-full object-cover absolute inset-0 blur-[4px] scale-105"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0)_45%)]" />
      </div>

      <motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-9 sm:h-11 w-auto brightness-0 invert drop-shadow-md" />
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur-sm min-w-0">
            <div className="leading-tight min-w-0">
              <p className="text-white text-xs sm:text-sm font-normal truncate max-w-[150px] sm:max-w-none">{data?.nombre || "Alumno"}</p>
              <p className="text-white/60 text-[10px] sm:text-[11px] font-medium truncate max-w-[220px] sm:max-w-none">
                {(data?.carrera || "N/A")} | Semestre {data?.semestre || "-"} | {data?.matricula || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <SocialIcon href="https://www.facebook.com/TecCCM">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://www.instagram.com/serviciosocial.ccm/">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://www.youtube.com/watch?v=Z2SOyRZ0qUI">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://x.com/TecdeMonterrey">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 fill-current"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
            </SocialIcon>
          </div>
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-xl"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </motion.nav>

      <div className="relative z-10 flex-1 min-h-0 px-4 py-8 sm:px-6 lg:px-8 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <motion.main
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="mb-6 flex justify-end">
            <div className="relative group">
              <button
                type="button"
                aria-label="Información de la feria"
                className="w-9 h-9 rounded-full bg-black/40 border border-white/20 text-white/80 hover:text-white hover:bg-black/55 hover:border-white/35 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              >
                <Info className="w-4 h-4" />
              </button>

              <div className="pointer-events-none absolute right-0 top-11 z-30 w-[300px] sm:w-[380px] rounded-xl bg-black/80 border border-white/20 backdrop-blur-md p-3 shadow-2xl opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
                <p className="text-white text-sm font-medium">Feria Servicio Social</p>
                <p className="text-white/80 mt-1 text-xs sm:text-sm leading-relaxed">
                  Explora el catálogo de proyectos y usa tu llave dinámica para inscribirte presencialmente durante la feria de servicio social.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {!data?.eventos || data.eventos.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/35 backdrop-blur-md rounded-3xl border border-white/15 p-16 flex flex-col items-center justify-center text-center shadow-2xl">
                <Calendar className="w-16 h-16 text-white/20 mb-6" />
                <h3 className="text-xl font-normal text-white tracking-wide mb-2">Sin Asignación a Eventos</h3>
                <p className="text-white/65 max-w-sm text-sm">No estás habilitado para ningún evento de Servicio Social en curso. Consulta con tu coordinador de carrera.</p>
              </motion.div>
            ) : (
              data.eventos.map((evento, i) => (
                <motion.div key={evento.id_evento} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                  <EventCard evento={evento} onEnrollmentDetected={refreshEnrollmentStatus} />
                </motion.div>
              ))
            )}
          </div>
        </motion.main>
      </div>

      <motion.footer
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
        className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-t border-white/5"
      >
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a href="https://tec.mx/es/avisos-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-normal uppercase tracking-wider hover:text-white/80 transition-colors">
            Aviso de Privacidad
          </a>
          <a href="https://letica.mx/ethos?locale=es" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-normal uppercase tracking-wider hover:text-white/80 transition-colors">
            Ethos
          </a>
        </div>
        <p className="text-white/40 text-[11px] font-medium text-center">
          © {new Date().getFullYear()} {" "}
          <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Tecnológico de Monterrey</a>
        </p>
      </motion.footer>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, QrCode, CheckCircle2, User, Building2, Calendar, HardHat, AlertTriangle, Shield, Clock, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Spotlight } from "@/components/ui/spotlight";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─── Project Card (shadcn Card style) ────────────────────────────
function ProjectCard({ project, index }) {
  const pct = project.capacidad_max > 0 ? Math.round((project.cupo_actual / project.capacidad_max) * 100) : 0;
  const barColor = project.lleno ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const empresaInitial = project.empresa ? project.empresa.charAt(0).toUpperCase() : "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <Card className={cn(
        "relative overflow-hidden pt-0 bg-white/[0.03] border-white/[0.08] text-white ring-0 hover:bg-white/[0.06] hover:border-blue-500/20 transition-all duration-300 group",
        project.lleno && "opacity-40 grayscale pointer-events-none"
      )}>
        {/* Color banner at top */}
        <div className={cn(
          "h-2 w-full",
          project.lleno ? "bg-red-500/60" : pct >= 70 ? "bg-amber-500/60" : "bg-gradient-to-r from-blue-500/60 to-indigo-500/60"
        )} />

        <CardHeader>
          <CardAction>
            {project.lleno ? (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/30">
                Agotado
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 font-mono text-xs hover:bg-emerald-500/20">
                {project.cupo_actual}/{project.capacidad_max}
              </Badge>
            )}
          </CardAction>
          <CardTitle className="text-white font-bold text-[15px] leading-tight group-hover:text-blue-300 transition-colors">
            {project.nombre_proyecto}
          </CardTitle>
          <CardDescription className="text-white/40">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-blue-300/70 text-[11px] font-semibold tracking-wide uppercase truncate">
                {project.empresa}
              </span>
            </span>
          </CardDescription>
        </CardHeader>

        {(project.descripcion || !project.lleno) && (
          <CardContent className="space-y-3">
            {project.descripcion && (
              <p className="text-white/30 text-xs leading-relaxed line-clamp-2 group-hover:text-white/45 transition-colors">
                {project.descripcion}
              </p>
            )}
            {!project.lleno && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Ocupación</span>
                  <span className="text-[10px] text-white/50 font-mono font-bold">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ delay: index * 0.06 + 0.3, duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${barColor} rounded-full`}
                  />
                </div>
              </div>
            )}
          </CardContent>
        )}

        <CardFooter className="border-white/[0.05] bg-white/[0.02] py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-300">
              {empresaInitial}
            </div>
            <span className="text-[10px] text-white/30 font-medium">
              {project.lleno ? "Sin lugares disponibles" : `${project.capacidad_max - project.cupo_actual} lugar(es) disponible(s)`}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// ─── Project Grid ────────────────────────────────────────────────
function ProjectGrid({ proyectos }) {
  if (!proyectos || proyectos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <HardHat className="w-12 h-12 text-white/15 mb-4" />
        <p className="text-white/40 text-sm font-medium">No hay proyectos disponibles en este evento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {proyectos.map((p, i) => (
        <ProjectCard key={p.id_proyecto} project={p} index={i} />
      ))}
    </div>
  );
}

// ─── QR Credential Tab Content ───────────────────────────────────
function QRCredentialView({ evento, qrPayload, timeLeft }) {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
          {/* QR Section — 3D-ish Card */}
          <motion.div
            whileHover={{ rotateY: 5, rotateX: -3, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="shrink-0"
            style={{ perspective: 1000 }}
          >
            <div className="relative w-72 h-72 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.4)] border border-white/10 p-6 flex flex-col items-center justify-center overflow-hidden group">
              {/* Animated accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-all duration-500" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/15 rounded-full blur-[50px] group-hover:bg-blue-400/25 transition-all" />

              {qrPayload ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white p-4 rounded-2xl relative z-10 shadow-2xl"
                >
                  <QRCodeSVG value={qrPayload} size={200} level="H" />
                </motion.div>
              ) : (
                <div className="animate-pulse flex flex-col items-center gap-4 text-white/30 relative z-10">
                  <QrCode className="w-16 h-16 stroke-[1]" />
                  <p className="text-xs font-bold tracking-widest uppercase">Generando Llave...</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Event Info */}
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left py-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{evento.nombre}</h3>
              <p className="text-blue-200/50 font-medium text-sm mb-8 flex items-center justify-center lg:justify-start gap-2">
                <Calendar className="w-4 h-4" /> Semestre {evento.periodo} {evento.anio}
              </p>

              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <h4 className="text-white font-bold text-sm">QR Dinámico Encriptado</h4>
                  </div>
                  <p className="text-blue-200/40 text-xs leading-relaxed">
                    Muestra este código al representante de la empresa para separar tu lugar al instante. La llave cambia cada 30 segundos usando TOTP.
                  </p>
                </div>

                <div className="flex justify-center lg:justify-start">
                  <motion.div
                    animate={timeLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5, repeat: timeLeft <= 5 ? Infinity : 0 }}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono tracking-widest text-sm px-6 py-3 border-0 shadow-lg rounded-xl",
                        timeLeft <= 5
                          ? "bg-red-500 text-white shadow-red-500/30"
                          : "bg-white/[0.05] text-blue-300 font-bold border border-blue-500/20 backdrop-blur-md"
                      )}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      EXPIRA EN: {timeLeft.toString().padStart(2, "0")}s
                    </Badge>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
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
            <h3 className="text-2xl font-extrabold text-emerald-300">{eventoNombre}</h3>
            <p className="text-emerald-500 font-black tracking-widest text-[10px] uppercase mt-1">
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
            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-2">Empresa Anfitriona</p>
            <p className="font-bold text-emerald-100 flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-emerald-400" /> {inscripcion.empresa}
            </p>
          </div>
          <div className="bg-black/20 p-5 rounded-2xl border border-emerald-500/10">
            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-2">Proyecto Asignado</p>
            <p className="font-medium text-emerald-200/80 leading-snug text-base">{inscripcion.nombre_proyecto}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Event Card (orchestrator) ───────────────────────────────────
const EventCard = ({ evento }) => {
  const [qrPayload, setQrPayload] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const fetchQR = useCallback(async () => {
    if (evento.inscrito) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/alumno/qr-payload?id_evento=${evento.id_evento}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.ya_inscrito) {
          window.location.reload();
        } else {
          setQrPayload(data.qr_data);
          setTimeLeft(data.expira_en_segundos);
        }
      }
    } catch (err) {
      setTimeout(fetchQR, 5000);
    }
  }, [evento]);

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

  // Build tabs
  const tabs = [
    {
      title: "QR Dinámico",
      value: "credencial",
      content: (
        <div className="w-full rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md p-6 sm:p-8">
          <QRCredentialView evento={evento} qrPayload={qrPayload} timeLeft={timeLeft} />
        </div>
      ),
    },
    {
      title: "Oferta de Servicios",
      value: "proyectos",
      content: (
        <div className="w-full rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider">Ofertas Disponibles</h4>
            </div>
            {evento.proyectos && (
              <Badge variant="outline" className="bg-white/5 text-blue-300 border-blue-500/20 text-xs font-mono">
                <Users className="w-3 h-3 mr-1" /> {evento.proyectos.length} proyectos
              </Badge>
            )}
          </div>
          <ProjectGrid proyectos={evento.proyectos} />
        </div>
      ),
    },
  ];

  return (
    <div className="[perspective:1000px] relative flex flex-col w-full items-start justify-start">
      <Tabs
        tabs={tabs}
        containerClassName="justify-center sm:justify-start mb-0"
        activeTabClassName="bg-blue-600/30 backdrop-blur-md"
        tabClassName="text-white/60 hover:text-white text-sm font-semibold px-5 py-2.5"
        contentClassName="mt-8"
      />
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

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/alumno/dashboard", { credentials: "include" })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-tec-deep flex flex-col items-center justify-center gap-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,57,166,0.15)_0,rgba(0,0,0,0)_50%)]" />
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <QrCode className="w-12 h-12 text-tec-light stroke-[1.5]" />
        </motion.div>
        <p className="font-bold tracking-widest uppercase text-blue-200/60 text-sm animate-pulse">Cargando credencial...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-tec-deep flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 max-w-md text-center backdrop-blur-md"
        >
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error de Sesión</h2>
          <p className="text-red-200/80 text-sm mb-6">{apiError}</p>
          <Button onClick={() => { logout(); navigate("/login"); }} className="w-full bg-tec-primary hover:bg-tec-denim text-white font-bold rounded-xl">
            Volver al Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tec-deep relative overflow-hidden">
      {/* Spotlight */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#0039A6" />

      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] rounded-full bg-tec-primary/10 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, -40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[0%] -left-[20%] w-[60%] h-[60%] rounded-full bg-tec-denim/10 blur-[100px]" />
      </div>

      <div className="relative z-10 pb-16">
        {/* Navbar */}
        <nav className="bg-white/[0.03] backdrop-blur-2xl border-b border-white/[0.06] sticky top-0 z-40 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.05, rotate: 3 }} className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 border border-white/10">
                  <User className="w-6 h-6 text-white" />
                </motion.div>
                <div className="hidden sm:block">
                  <span className="font-bold text-white text-lg block leading-tight">{data?.nombre || "Alumno No Identificado"}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-600/20 text-blue-300 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20">{data?.carrera || "N/A"}</span>
                    <span className="text-white/40 text-xs font-medium">Semestre {data?.semestre || "-"}</span>
                    <span className="text-white/20">|</span>
                    <span className="font-mono text-white/50 text-xs">{data?.matricula || ""}</span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-xl" onClick={logout}>
                <LogOut className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <motion.main initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="mb-10 text-center sm:text-left">
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300">
                Expediente Digital
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-blue-200/50 mt-3 text-sm max-w-xl mx-auto sm:mx-0 leading-relaxed"
            >
              Explora el catálogo de proyectos y usa tu llave dinámica para inscribirte presencialmente durante la feria de servicio social.
            </motion.p>
          </div>

          <div className="flex flex-col gap-12">
            {!data?.eventos || data.eventos.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/5 p-16 flex flex-col items-center justify-center text-center shadow-inner">
                <Calendar className="w-16 h-16 text-white/15 mb-6" />
                <h3 className="text-xl font-bold text-white tracking-wide mb-2">Sin Asignación a Eventos</h3>
                <p className="text-blue-200/40 max-w-sm text-sm">No estás habilitado para ningún evento de Servicio Social en curso. Consulta con tu coordinador de carrera.</p>
              </motion.div>
            ) : (
              data.eventos.map((evento, i) => (
                <motion.div key={evento.id_evento} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                  <EventCard evento={evento} />
                </motion.div>
              ))
            )}
          </div>

        </motion.main>
      </div>
    </div>
  );
}

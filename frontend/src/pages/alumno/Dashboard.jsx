import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, QrCode, CheckCircle2, User, Building2, Calendar, HardHat, AlertTriangle, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

  if (evento.inscrito && evento.inscripcion) {
    const i = evento.inscripcion;
    return (
      <Card className="h-full bg-emerald-500/10 border-emerald-500/20 shadow-[-10px_-10px_30px_4px_rgba(16,185,129,0.1),_10px_10px_30px_4px_rgba(45,212,191,0.15)] backdrop-blur-xl relative overflow-hidden group transition-all duration-300 rounded-3xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
        <CardHeader className="pb-4 border-b border-emerald-500/20 mb-4 z-10 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-emerald-300 drop-shadow-md">{evento.nombre}</CardTitle>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          </div>
          <CardDescription className="text-emerald-500 font-black tracking-widest text-[10px] uppercase">
            INSCRIPCIÓN COMPLETADA EXITOSAMENTE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 z-10 relative">
          <div className="bg-black/20 p-4 rounded-2xl border border-emerald-500/10">
            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-1.5">Empresa Anfitriona</p>
            <p className="font-bold text-emerald-100 flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-emerald-400" /> {i.empresa}
            </p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-emerald-500/10">
            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-1.5">Proyecto Asignado Oficial</p>
            <p className="font-medium text-emerald-200/80 leading-snug">{i.nombre_proyecto}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Credencial QR Card */}
      <Card className="bg-white/[0.03] backdrop-blur-xl border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden relative group rounded-3xl hover:bg-white/[0.05] transition-colors p-6 gap-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] -mr-16 -mt-16 group-hover:bg-blue-400/30 transition-colors"></div>
        
        {/* QR Section */}
        <div className="shrink-0 flex justify-center items-center">
          <div className="relative z-20 w-64 h-64 bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 p-5 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
            {qrPayload ? (
              <div className="bg-white p-3 rounded-xl relative z-10 animate-in zoom-in duration-500 shadow-xl">
                <QRCodeSVG value={qrPayload} size={200} level="H" />
              </div>
            ) : (
              <div className="animate-pulse flex flex-col items-center gap-4 text-blue-400/50">
                <QrCode className="w-16 h-16 stroke-[1]" />
                <p className="text-xs font-bold tracking-widest uppercase">Generando Llave...</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 flex flex-col justify-center text-center md:text-left z-10">
          <h3 className="text-2xl font-extrabold text-white mb-2">{evento.nombre}</h3>
          <p className="text-blue-200/60 font-medium text-sm mb-6 flex items-center justify-center md:justify-start gap-1.5">
            <Calendar className="w-4 h-4" /> Semestre {evento.periodo} {evento.anio}
          </p>
          
          <div className="mb-6">
            <h4 className="text-white font-bold mb-1">QR Dinámico Encriptado</h4>
            <p className="text-blue-200/50 text-xs max-w-sm mx-auto md:mx-0 leading-relaxed">
              Muestra este código al representante de la empresa para separar tu lugar al instante. La llave cambia cada 30 segundos usando TOTP.
            </p>
          </div>

          <div className="flex justify-center md:justify-start">
            <Badge variant="outline" className={`font-mono tracking-widest text-xs px-5 py-2 border-0 shadow-lg ${timeLeft <= 5 ? 'bg-red-500 text-white shadow-red-500/20 animate-pulse' : 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30'}`}>
              EXPIRA EN: {timeLeft.toString().padStart(2, '0')}s
            </Badge>
          </div>
        </div>
      </Card>

      {/* Proyectos Disponibles */}
      {evento.proyectos && evento.proyectos.length > 0 && (
        <div className="mt-4">
          <h4 className="text-blue-200/60 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-blue-400" /> Catálogo de Proyectos
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evento.proyectos.map(p => (
              <Card key={p.id_proyecto} className={`bg-white/[0.02] border-white/5 backdrop-blur-md transition-all ${p.lleno ? 'opacity-50 grayscale' : 'hover:bg-white/[0.04] hover:border-white/10'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate">{p.nombre_proyecto}</p>
                      <p className="text-blue-300 text-[10px] mt-0.5 font-bold tracking-wider uppercase">{p.empresa}</p>
                      {p.descripcion && <p className="text-white/40 text-xs mt-2 line-clamp-2 leading-snug">{p.descripcion}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {p.lleno ? (
                        <div className="bg-red-500/20 border border-red-500/30 px-2 py-1 rounded text-[10px] font-bold text-red-400 uppercase tracking-widest">
                          Agotado
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-center">
                          <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-0.5">Cupo</p>
                          <p className="text-sm font-black text-emerald-300 font-mono tracking-tight">{p.cupo_actual}<span className="text-emerald-500/50">/{p.capacidad_max}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
      <div className="min-h-screen bg-[#001D4A] flex flex-col items-center justify-center gap-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0,rgba(0,0,0,0)_50%)]"></div>
        <QrCode className="w-12 h-12 text-blue-400 animate-pulse stroke-[1.5]" />
        <p className="font-bold tracking-widest uppercase text-blue-200/60 text-sm animate-pulse">Cargando credencial...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-[#001D4A] flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center backdrop-blur-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error de Sesión</h2>
          <p className="text-red-200/80 text-sm mb-6">{apiError}</p>
          <Button onClick={() => { logout(); navigate("/login"); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold">Volver al Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001D4A] relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, -40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[0%] -left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 pb-16">
        {/* Navbar */}
        <nav className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-40 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                  <User className="w-6 h-6 text-white" />
                </motion.div>
                <div className="hidden sm:block">
                  <span className="font-bold text-white text-lg block leading-tight">{data?.nombre || "Alumno No Identificado"}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-blue-500/20">{data?.carrera || "N/A"}</span>
                    <span className="text-white/40 text-xs font-medium">Semestre {data?.semestre || "-"}</span>
                    <span className="text-white/20">|</span>
                    <span className="font-mono text-white/50 text-xs">{data?.matricula || ""}</span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 transition-colors" onClick={logout}>
                <LogOut className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <motion.main initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Expediente Digital
            </h2>
            <p className="text-blue-200/60 mt-2 text-sm max-w-xl mx-auto sm:mx-0 leading-relaxed">
              Explora el catálogo de proyectos y usa tu llave dinámica para inscribirte presencialmente durante la feria de servicio social.
            </p>
          </div>

          <div className="flex flex-col gap-12">
            {!data?.eventos || data.eventos.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/5 p-16 flex flex-col items-center justify-center text-center shadow-inner">
                <Calendar className="w-16 h-16 text-white/20 mb-6 drop-shadow-md" />
                <h3 className="text-xl font-bold text-white tracking-wide mb-2">Sin Asignación a Eventos</h3>
                <p className="text-blue-200/50 max-w-sm text-sm">No estás habilitado para ningún evento de Servicio Social en curso. Consulta con tu coordinador de carrera.</p>
              </motion.div>
            ) : (
              data.eventos.map((evento, i) => (
                <motion.div key={evento.id_evento} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i*0.1, duration: 0.5 }}>
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

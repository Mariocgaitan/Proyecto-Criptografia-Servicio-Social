import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, QrCode, CheckCircle2, User, Building2, Calendar, LayoutDashboard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
          <div className="flex justify-between items-center bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20">
            <p className="text-[10px] text-emerald-500/80 uppercase font-bold tracking-widest">Sello de Tiempo</p>
            <p className="text-[11px] font-mono text-emerald-300 font-bold">
              {new Date(i.timestamp).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-white/[0.03] backdrop-blur-xl border-white/10 shadow-2xl flex flex-col overflow-hidden relative group rounded-3xl hover:bg-white/[0.05] transition-colors">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] -mr-16 -mt-16 group-hover:bg-blue-400/30 transition-colors"></div>
      
      <CardHeader className="border-b border-white/5 pb-5 z-10">
        <CardTitle className="text-xl font-extrabold text-white">{evento.nombre}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-blue-200/60 font-medium text-xs mt-1">
          <Calendar className="w-3.5 h-3.5" /> Semestre {evento.periodo} {evento.anio}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center py-10 flex-grow relative z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-20 w-full max-w-[220px] aspect-square bg-slate-900/80 backdrop-blur-md rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 p-5 flex flex-col items-center justify-center transition-transform group-hover:scale-[1.03] duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          {qrPayload ? (
            <div className="bg-white p-2 rounded-xl relative z-10 animate-in zoom-in duration-500">
              <QRCodeSVG value={qrPayload} size={180} level="M" />
            </div>
          ) : (
            <div className="animate-pulse flex flex-col items-center gap-4 text-blue-400/50">
              <QrCode className="w-16 h-16 stroke-[1]" />
              <p className="text-xs font-bold tracking-widest uppercase">Generando ID...</p>
            </div>
          )}
        </div>
        
        <Badge variant="outline" className={`mt-8 z-20 font-mono tracking-widest text-[11px] px-4 py-1.5 border-0 shadow-lg ${timeLeft <= 5 ? 'bg-red-500 text-white shadow-red-500/20 animate-pulse' : 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30'}`}>
          EXPIRA EN: {timeLeft.toString().padStart(2, '0')}s
        </Badge>

        <p className="text-center text-xs text-blue-200/60 mt-6 z-20 max-w-[260px] leading-relaxed">
          Muestra este QR dinámico al escaner de la empresa para separar tu lugar instantáneamente.
        </p>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/alumno/dashboard", { credentials: "include" })
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => console.error(err));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001D4A] flex flex-col items-center justify-center gap-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0,rgba(0,0,0,0)_50%)]"></div>
        <QrCode className="w-12 h-12 text-blue-400 animate-pulse stroke-[1.5]" />
        <p className="font-bold tracking-widest uppercase text-blue-200/60 text-sm animate-pulse">Obteniendo credenciales...</p>
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
        <nav className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                  <User className="w-6 h-6 text-white" />
                </motion.div>
                <div className="hidden sm:block">
                  <span className="font-bold text-white text-lg block leading-tight">{data?.nombre}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-blue-500/20">{data?.carrera}</span>
                    <span className="text-white/40 text-xs font-medium">Semestre {data?.semestre}</span>
                    <span className="text-white/20">|</span>
                    <span className="font-mono text-white/50 text-xs">{data?.matricula}</span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 transition-colors" onClick={logout}>
                <LogOut className="w-5 h-5 mr-2" /> <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">Credencial Digital</h2>
            <p className="text-blue-200/60 mt-2 text-sm max-w-xl mx-auto sm:mx-0 leading-relaxed">
              Utiliza tu llave dinámica para inscribirte a proyectos en vivo durante la feria. El escaner de la empresa leerá tu matrícula de forma encriptada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data?.eventos?.map((evento, i) => (
              <motion.div key={evento.id_evento} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i*0.1, duration: 0.5 }}>
                <EventCard evento={evento} />
              </motion.div>
            ))}
            
            {data?.eventos?.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/5 p-16 flex flex-col items-center justify-center text-center shadow-inner">
                <Calendar className="w-16 h-16 text-white/20 mb-6 drop-shadow-md" />
                <h3 className="text-xl font-bold text-white tracking-wide">Sin Asignación a Eventos</h3>
                <p className="text-blue-200/50 mt-3 max-w-sm text-sm">No estás habilitado para ningún evento de Servicio Social en curso. Consulta con la coordinación.</p>
              </motion.div>
            )}
          </div>

        </motion.main>
      </div>
    </div>
  );
}

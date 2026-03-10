import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, QrCode, CheckCircle2, User, Building2, Calendar, LayoutDashboard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EventCard = ({ evento }) => {
  const [qrPayload, setQrPayload] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const fetchQR = useCallback(async () => {
    if (evento.inscrito) return; // Si ya está inscrito, no necesitamos QR
    try {
      const res = await fetch(`http://localhost:8000/api/v1/alumno/qr-payload?id_evento=${evento.id_evento}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ya_inscrito) {
          window.location.reload(); // Recargar para mostrar el estado actualizado
        } else {
          setQrPayload(data.qr_data);
          setTimeLeft(data.expira_en_segundos);
        }
      }
    } catch (err) {
      console.error("Fallo obteniendo QR", err);
      // Intentar de nuevo pronto
      setTimeout(fetchQR, 5000);
    }
  }, [evento]);

  useEffect(() => {
    fetchQR();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchQR();
          return 0; // Se actualizará con la nueva info
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchQR]);

  if (evento.inscrito && evento.inscripcion) {
    const i = evento.inscripcion;
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-md h-full">
        <CardHeader className="pb-3 border-b border-emerald-500/10 mb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-emerald-900">{evento.nombre}</CardTitle>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <CardDescription className="text-emerald-700 font-medium tracking-wide">
            INSCRIPCIÓN COMPLETADA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-emerald-600 uppercase font-bold tracking-wider mb-1">Empresa Destino</p>
            <p className="font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" /> 
              {i.empresa}
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 uppercase font-bold tracking-wider mb-1">Proyecto Asignado</p>
            <p className="text-sm text-slate-700">{i.nombre_proyecto}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg border border-emerald-500/10">
            <p className="text-xs text-slate-500">Fecha de confirmación:</p>
            <p className="text-xs font-mono text-emerald-700 font-bold">
              {new Date(i.timestamp).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-t-4 border-t-blue-600 flex flex-col h-full overflow-hidden relative group">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
        <CardTitle className="text-xl text-slate-800">{evento.nombre}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-slate-500">
          <Calendar className="w-4 h-4" /> Semestre {evento.periodo} {evento.anio}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center py-10 flex-grow relative bg-white">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 w-full max-w-[240px] aspect-square bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-4 flex flex-col items-center justify-center transition-transform group-hover:scale-105 duration-300">
          {qrPayload ? (
            <QRCodeSVG value={qrPayload} size={200} level="M" />
          ) : (
            <div className="animate-pulse flex flex-col items-center gap-3 text-slate-400">
              <QrCode className="w-12 h-12 stroke-[1.5]" />
              <p className="text-sm font-medium">Generando credencial...</p>
            </div>
          )}
        </div>
        
        <Badge 
          variant="outline" 
          className={`mt-6 z-10 font-mono tracking-widest text-xs px-3 py-1 border-0 ${timeLeft <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-50 text-blue-700'}`}
        >
          EXPIRA EN: {timeLeft.toString().padStart(2, '0')}s
        </Badge>

        <p className="text-center text-sm text-slate-500 mt-6 z-10 max-w-[280px]">
          Muéstrale este código dinámico al representante en el evento para asegurar tu lugar.
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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4 text-blue-900">
        <LayoutDashboard className="w-8 h-8 animate-pulse text-blue-600" />
        <p className="font-medium animate-pulse">Armando tu escritorio escolar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER NAVBAR */}
      <nav className="bg-gradient-to-r from-blue-900 to-blue-800 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg block leading-tight">{data?.nombre}</span>
                <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                  <span className="bg-blue-700 px-1.5 py-0.5 rounded uppercase">{data?.carrera}</span>
                  <span>Semestre {data?.semestre}</span>
                  <span>|</span>
                  <span className="font-mono">{data?.matricula}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-white/20"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold hidden md:block">Cerrar Sesión</span>
            </button>
            
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Mis Eventos</h2>
          <p className="text-slate-500 mt-1 h-6">Gestiona tus códigos de acceso e inscripciones activas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {data?.eventos?.map(evento => (
            <div key={evento.id_evento} className="h-full">
              <EventCard evento={evento} />
            </div>
          ))}
          
          {data?.eventos?.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
              <Calendar className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No hay eventos registrados</h3>
              <p className="text-slate-500 mt-2 max-w-sm">Acércate a la coordinación de tu carrera administrativa para revisar tus accesos al próximo evento SID.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, ScanLine, AlertCircle, CheckCircle2, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";

export default function EmpresaEscaner() {
  const { user, logout } = useAuth();
  const [proyecto, setProyecto] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    fetch(apiUrl("/api/v1/empresa/proyecto"), { credentials: "include" })
      .then(res => res.json())
      .then(data => setProyecto(data))
      .catch(err => console.error(err));
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (result && result.status === 'loading') return;
    setResult({ status: 'loading', message: 'Verificando firmas criptográficas...', icon: '⌛' });

    try {
      const res = await fetch(apiUrl("/api/v1/empresa/escanear"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: decodedText }), credentials: "include"
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setResult({ status: 'ok', name: data.nombre_alumno || 'Alumno Autorizado', message: data.mensaje });
        if (data.cupo_actual !== undefined && proyecto) {
          setProyecto(prev => ({ ...prev, cupo_actual: data.cupo_actual }));
        }
      } else {
        setResult({ status: 'error', name: data.nombre_alumno || 'Desconocido', message: data.detail || data.mensaje });
      }
    } catch (err) {
      setResult({ status: 'error', name: 'Alerta SS', message: 'Fallo de conexión segura' });
    }
    setTimeout(() => setResult(null), 4000);
  };

  const toggleScanner = async () => {
    if (scanning) {
      if (scannerRef.current) await scannerRef.current.stop();
      setScanning(false);
    } else {
      scannerRef.current = new Html5Qrcode("reader");
      Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
          const cam = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[cameras.length - 1];
          scannerRef.current.start(cam.id, { fps: 15, qrbox: { width: 280, height: 280 } }, onScanSuccess).catch(e => console.error(e));
          setScanning(true);
        }
      }).catch(e => console.error(e));
    }
  };

  useEffect(() => {
    toggleScanner();
    return () => { if (scannerRef.current && scanning) { scannerRef.current.stop().catch(() => { }); } };
    // eslint-disable-next-line
  }, []);

  if (!proyecto) {
    return (
      <div className="min-h-screen bg-tec-deep flex flex-col items-center justify-center text-white space-y-4">
        <ScanLine className="w-12 h-12 animate-pulse text-emerald-400" />
        <p className="font-bold tracking-widest text-emerald-200/50 uppercase text-sm animate-pulse">Iniciando Terminal Óptica...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tec-deep pb-10 relative overflow-hidden">
      {/* Background Dynamics */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="absolute -top-[20%] -right-[10%] w-[80%] h-[80%] rounded-full bg-emerald-600/10 blur-[130px]" />
        <motion.div animate={{ scale: [1, 1.1, 1], x: [0, 50, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[0%] -left-[20%] w-[60%] h-[60%] rounded-full bg-tec-denim/10 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <nav className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-40 shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                  <ScanLine className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <span className="font-bold text-white text-lg tracking-tight block leading-tight">{proyecto.empresa}</span>
                  <span className="text-emerald-300/80 text-xs font-medium tracking-widest uppercase mt-0.5 block">{proyecto.nombre_proyecto}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Ocupación</p>
                  <p className="font-mono text-sm font-black text-emerald-400">
                    {proyecto.cupo_actual} <span className="text-white/30 text-xs">/ {proyecto.capacidad_max}</span>
                  </p>
                </div>
                <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 transition-colors" onClick={logout}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto px-4 mt-8 space-y-6">

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl shadow-xl rounded-2xl">
              <CardContent className="p-4 sm:p-5 text-center flex flex-col items-center justify-center">
                <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Confirmados</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">{proyecto.cupo_actual}</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-xl shadow-xl rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/20 rounded-full blur-[20px] -mr-8 -mt-8"></div>
              <CardContent className="p-4 sm:p-5 text-center flex flex-col items-center justify-center relative z-10">
                <p className="text-emerald-400/70 text-[10px] uppercase font-bold tracking-widest mb-1">Vacantes</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{proyecto.capacidad_max - proyecto.cupo_actual}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl shadow-xl rounded-2xl">
              <CardContent className="p-4 sm:p-5 text-center flex flex-col items-center justify-center">
                <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Capacidad Total</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-white/30">{proyecto.capacidad_max}</p>
              </CardContent>
            </Card>
          </div>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.3 }}>
                <div className={`p-5 rounded-2xl border backdrop-blur-md flex items-center gap-5 shadow-2xl relative overflow-hidden
                  ${result.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    result.status === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}
                `}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${result.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : result.status === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-amber-500'}`}></div>

                  {result.status === 'ok' && <CheckCircle2 className="w-10 h-10 text-emerald-400 drop-shadow-md z-10" />}
                  {result.status === 'error' && <AlertCircle className="w-10 h-10 text-red-400 drop-shadow-md z-10" />}
                  {result.status === 'loading' && <QrCode className="w-10 h-10 text-amber-400 animate-pulse z-10" />}

                  <div className="z-10">
                    <p className="font-extrabold text-white text-lg tracking-tight">{result.name}</p>
                    <p className={`text-sm font-medium mt-0.5 ${result.status === 'ok' ? 'text-emerald-200' : result.status === 'error' ? 'text-red-200' : 'text-amber-200'}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanner Viewport */}
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-2xl overflow-hidden shadow-2xl rounded-3xl">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-tec-surface/60">
              <div>
                <h2 className="text-white font-bold flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    {scanning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${scanning ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`}></span>
                  </span>
                  Cámara
                </h2>
              </div>
              <Button
                onClick={toggleScanner}
                className={`font-bold transition-all shadow-lg rounded-xl px-6 ${!scanning ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/20" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"}`}
              >
                {scanning ? "Pausar Lente" : "Activar Escáner"}
              </Button>
            </div>
            <div className="p-6 bg-black/60 flex justify-center">
              <div id="reader" className="rounded-2xl overflow-hidden [&_video]:rounded-2xl [&_video]:w-full border-none shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] max-w-sm w-full mx-auto"></div>
            </div>
            <div className="bg-tec-surface/80 py-3 text-center border-t border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Apunte el código QR dinámico del alumno hacia el cuadro central</p>
            </div>
          </Card>

        </motion.div>
      </div>
    </div>
  );
}

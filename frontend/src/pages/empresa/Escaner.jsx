import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, ScanLine, AlertCircle, CheckCircle2, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmpresaEscaner() {
  const { user, logout } = useAuth();
  const [proyecto, setProyecto] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Fetch project info
    fetch("http://localhost:8000/api/v1/empresa/proyecto", { credentials: "include" })
      .then(res => res.json())
      .then(data => setProyecto(data))
      .catch(err => console.error(err));
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (result && result.status === 'loading') return;
    setResult({ status: 'loading', message: 'Procesando...', icon: '⌛' });

    try {
      const res = await fetch("http://localhost:8000/api/v1/empresa/escanear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: decodedText }),
        credentials: "include"
      });
      const data = await res.json();
      
      if (res.ok && data.ok) {
        setResult({ status: 'ok', name: data.nombre_alumno || 'Alumno', message: data.mensaje });
        if (data.cupo_actual !== undefined && proyecto) {
          setProyecto(prev => ({ ...prev, cupo_actual: data.cupo_actual }));
        }
      } else {
        setResult({ status: 'error', name: data.nombre_alumno || 'Alumno', message: data.detail || data.mensaje });
      }
    } catch (err) {
      setResult({ status: 'error', name: 'Error', message: 'Fallo de conexión' });
    }

    setTimeout(() => setResult(null), 3500);
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
          scannerRef.current.start(cam.id, { fps: 10, qrbox: { width: 280, height: 280 } }, onScanSuccess);
          setScanning(true);
        }
      });
    }
  };

  useEffect(() => {
    // Auto start on mount
    toggleScanner();
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!proyecto) {
    return <div className="min-h-screen bg-[#001D4A] flex items-center justify-center text-white">Cargando escáner...</div>;
  }

  return (
    <div className="min-h-screen bg-[#001D4A] pb-10">
      <nav className="bg-white/10 backdrop-blur-xl border border-white/20 sticky top-0 md:top-6 z-40 md:mx-auto max-w-3xl md:rounded-2xl mb-6 shadow-2xl">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <ScanLine className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide">{proyecto.empresa}</span>
              <p className="text-white/60 text-xs">{proyecto.nombre_proyecto}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white/40 text-xs uppercase tracking-wider">Cupo</p>
              <p className="font-mono text-sm font-bold text-emerald-400">
                {proyecto.cupo_actual}/{proyecto.capacidad_max}
              </p>
            </div>
            <button onClick={logout} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Inscritos</p>
              <p className="text-3xl font-bold text-white">{proyecto.cupo_actual}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <p className="text-emerald-400/60 text-[10px] uppercase font-bold tracking-wider mb-1">Disponibles</p>
              <p className="text-3xl font-bold text-emerald-400">{proyecto.capacidad_max - proyecto.cupo_actual}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Capacidad</p>
              <p className="text-3xl font-bold text-white/40">{proyecto.capacidad_max}</p>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Result Banner */}
        {result && (
          <div className={`p-4 rounded-xl border backdrop-blur-md flex items-center gap-4 animate-in fade-in slide-in-from-top-2
            ${result.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30' : 
              result.status === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}
          `}>
            {result.status === 'ok' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
            {result.status === 'error' && <AlertCircle className="w-8 h-8 text-red-400" />}
            {result.status === 'loading' && <QrCode className="w-8 h-8 text-amber-400 animate-pulse" />}
            <div>
              <p className="font-bold text-white">{result.name}</p>
              <p className={`text-sm ${result.status === 'ok' ? 'text-emerald-200' : result.status === 'error' ? 'text-red-200' : 'text-amber-200'}`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* Scanner Viewport */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div>
              <h2 className="text-white font-bold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {scanning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${scanning ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                </span>
                Cámara en vivo
              </h2>
            </div>
            <Button 
              variant={scanning ? "destructive" : "default"} 
              size="sm" 
              onClick={toggleScanner}
              className={!scanning ? "bg-emerald-600 hover:bg-emerald-500" : ""}
            >
              {scanning ? "Detener" : "Activar"}
            </Button>
          </div>
          <div className="p-4 bg-black/40">
            <div id="reader" className="rounded-xl overflow-hidden [&>video]:rounded-xl [&>video]:w-full border-none"></div>
          </div>
        </Card>

      </div>
    </div>
  );
}

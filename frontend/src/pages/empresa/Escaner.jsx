import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  LogOut,
  QrCode,
  ScanLine,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import tecLogo from "@/assets/tec_logo.png";
import campusImg1 from "@/assets/login_images/ser_social_header.png";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/importancia-servicio-social-tec-monterrey.jpg.webp";
import campusImg4 from "@/assets/login_images/profesorado-promotores-formacion-programa-servicio-social-tec-monterrey.jpg";

const campusImages = [campusImg1, campusImg2, campusImg3, campusImg4];

const SCANNER_CONFIG = {
  bgRotationMs: 20000,
  resultAutoHideMs: 4500,
  fps: 20,
  qrBoxSize: 320,
  qrBoxMinSize: 200,
  preferredCameraLabel: "back",
  scanCooldownMs: 2200,
  duplicateQrIgnoreMs: 6000,
};

const CAMERA_ERRORS = {
  insecureContext: "La camara en celular requiere HTTPS (o localhost). Abre esta pagina con https://.",
  permissionDenied: "Permiso de camara denegado. Habilitalo en el navegador y vuelve a intentar.",
  noCamera: "No se encontro una camara disponible en este dispositivo.",
  generic: "No se pudo iniciar la camara. Verifica permisos y vuelve a intentar.",
};

function StatCard({ label, value, tone = "default" }) {
  const toneMap = {
    default: "border-white/15 bg-black/30 text-white",
    accent: "border-blue-400/20 bg-blue-500/10 text-white",
    success: "border-emerald-500/20 bg-emerald-500/10 text-white",
    warn: "border-amber-500/20 bg-amber-500/10 text-white",
  };

  return (
    <Card className={cn("rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.2)]", toneMap[tone])}>
      <CardContent className="p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OccupancyMeter({ current, max, percent }) {
  const barTone = percent >= 100 ? "bg-red-500" : percent >= 75 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="rounded-2xl border border-white/15 bg-black/30 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Capacidad operativa</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{current}/{max}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Ocupacion</p>
          <p className="text-2xl font-semibold text-white">{percent}%</p>
        </div>
      </div>

      <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden">
        <div style={{ width: `${Math.min(percent, 100)}%` }} className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barTone)} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/55">
        <span>Disponibles: {Math.max(max - current, 0)}</span>
        <span>{percent >= 100 ? "Cupo completo" : percent >= 75 ? "Demanda alta" : "Recepcion abierta"}</span>
      </div>
    </div>
  );
}

function ResultBanner({ result }) {
  if (!result) return null;

  const isSuccess = result.status === "ok";

  const styles = {
    ok: {
      wrapper: "border-emerald-500/25 bg-emerald-500/10",
      icon: <CheckCircle2 className="h-8 w-8 text-emerald-300" />,
      text: "text-emerald-100",
    },
    error: {
      wrapper: "border-red-500/25 bg-red-500/10",
      icon: <AlertCircle className="h-8 w-8 text-red-300" />,
      text: "text-red-100",
    },
    loading: {
      wrapper: "border-amber-500/25 bg-amber-500/10",
      icon: <QrCode className="h-8 w-8 text-amber-300 animate-pulse" />,
      text: "text-amber-100",
    },
  };

  const currentStyle = styles[result.status] || styles.loading;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-2xl border p-4",
        currentStyle.wrapper,
        isSuccess && "border-emerald-300/55 bg-emerald-500/20 p-6 sm:p-7 shadow-[0_0_35px_rgba(16,185,129,0.35)]"
      )}
    >
      <div className="flex items-start gap-3">
        <Motion.div
          className="mt-0.5"
          animate={isSuccess ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.45, repeat: isSuccess ? 2 : 0 }}
        >
          {currentStyle.icon}
        </Motion.div>
        <div>
          {result.status === "ok" ? (
            <p className="mb-2 inline-flex rounded-full border border-emerald-300/45 bg-emerald-300/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-50">
              Registro exitoso
            </p>
          ) : null}
          <p className={cn("text-base font-semibold text-white", isSuccess && "text-xl sm:text-2xl font-extrabold tracking-tight")}>{result.name}</p>
          <p className={cn("mt-1 text-sm leading-relaxed", currentStyle.text, isSuccess && "mt-2 text-base sm:text-lg text-emerald-50")}>{result.message}</p>
        </div>
      </div>
    </Motion.div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors border",
        active
          ? "bg-blue-600/30 border-blue-500/40 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:text-white"
      )}
    >
      {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export default function EmpresaEscaner() {
  const { logout } = useAuth();
  const [proyecto, setProyecto] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [proyectosEmpresa, setProyectosEmpresa] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [switchingProject, setSwitchingProject] = useState(false);
  const [result, setResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingInscripcionId, setDeletingInscripcionId] = useState(null);
  const [deleteModalInfo, setDeleteModalInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("sensor");
  const [lastSync, setLastSync] = useState(null);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const scannerRef = useRef(null);
  const scannerMountingRef = useRef(false);
  const activeProjectIdRef = useRef(null);
  const switchingProjectRef = useRef(false);
    const resolveCameraError = useCallback((error) => {
      const msg = String(error?.message || "").toLowerCase();
      const name = String(error?.name || "").toLowerCase();

      if (msg.includes("secure") || msg.includes("https") || !window.isSecureContext) {
        return CAMERA_ERRORS.insecureContext;
      }
      if (name.includes("notallowed") || msg.includes("permission") || msg.includes("denied")) {
        return CAMERA_ERRORS.permissionDenied;
      }
      if (name.includes("notfound") || msg.includes("not found") || msg.includes("no cameras")) {
        return CAMERA_ERRORS.noCamera;
      }
      return CAMERA_ERRORS.generic;
    }, []);

  const scanLockUntilRef = useRef(0);
  const lastDecodedRef = useRef({ text: "", at: 0 });

  useEffect(() => {
    activeProjectIdRef.current = selectedProjectId || proyecto?.id_proyecto || null;
  }, [proyecto?.id_proyecto, selectedProjectId]);

  useEffect(() => {
    switchingProjectRef.current = switchingProject;
  }, [switchingProject]);

  const loadProyecto = useCallback(async (projectId = null) => {
    try {
      const query = projectId ? `?id_proyecto=${projectId}` : "";
      const res = await fetch(apiUrl(`/api/v1/empresa/proyecto${query}`), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo cargar el proyecto");
      setProyecto(data);
      setSelectedProjectId(data.id_proyecto);
      setLastSync(new Date());
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const loadProyectosEmpresa = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/empresa/proyectos"), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudieron cargar los proyectos");

      const proyectos = Array.isArray(data.proyectos) ? data.proyectos : [];
      setProyectosEmpresa(proyectos);
      const preferredProjectId = proyectos[0]?.id_proyecto || null;
      await loadProyecto(preferredProjectId);
    } catch (err) {
      console.error(err);
      await loadProyecto();
    } finally {
      setInitializing(false);
    }
  }, [loadProyecto]);

  useEffect(() => {
    loadProyectosEmpresa();
  }, [loadProyectosEmpresa]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % campusImages.length);
    }, SCANNER_CONFIG.bgRotationMs);
    return () => clearInterval(intervalId);
  }, []);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) {
      setScanning(false);
      return;
    }

    try {
      await scannerRef.current.stop();
    } catch {
      // Ignore stop failures when the camera is already inactive.
    }

    try {
      await scannerRef.current.clear();
    } catch {
      // Ignore clear failures on partially initialized instances.
    }

    scannerRef.current = null;
    setScanning(false);
  }, []);

  const onScanSuccess = useCallback(async (decodedText) => {
    if (switchingProjectRef.current) return;

    const now = Date.now();
    const normalizedText = (decodedText || "").trim();
    const projectIdForScan = activeProjectIdRef.current;

    if (!normalizedText) return;
    if (!projectIdForScan) return;
    if (now < scanLockUntilRef.current) return;
    if (
      lastDecodedRef.current.text === normalizedText
      && now - lastDecodedRef.current.at < SCANNER_CONFIG.duplicateQrIgnoreMs
    ) {
      return;
    }

    scanLockUntilRef.current = now + SCANNER_CONFIG.scanCooldownMs;
    lastDecodedRef.current = { text: normalizedText, at: now };

    if (result?.status === "loading") return;

    setResult({
      status: "loading",
      name: "Sensor verificando",
      message: "Validando QR y disponibilidad del proyecto...",
    });

    try {
      const res = await fetch(apiUrl("/api/v1/empresa/escanear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: normalizedText, id_proyecto: projectIdForScan }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setResult({
          status: "ok",
          name: data.nombre_alumno || "Alumno validado",
          message: data.mensaje,
        });
        await loadProyecto(projectIdForScan);
      } else {
        setResult({
          status: "error",
          name: data.nombre_alumno || "Lectura rechazada",
          message: data.detail || data.mensaje || "No fue posible procesar el QR.",
        });
      }
    } catch {
      setResult({
        status: "error",
        name: "Conectividad",
        message: "No se pudo comunicar el sensor con el servidor.",
      });
    }

    setTimeout(() => setResult(null), SCANNER_CONFIG.resultAutoHideMs);
  }, [loadProyecto, result?.status]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current || scannerMountingRef.current) return;

    if (!window.isSecureContext) {
      setResult({
        status: "error",
        name: "Camara no disponible",
        message: CAMERA_ERRORS.insecureContext,
      });
      setScanning(false);
      return;
    }

    scannerMountingRef.current = true;

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) throw new Error(CAMERA_ERRORS.noCamera);

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      const cameraCandidates = [
        { facingMode: { exact: "environment" } },
        { facingMode: "environment" },
      ];
      const preferredCamera = cameras.find((camera) => camera.label.toLowerCase().includes(SCANNER_CONFIG.preferredCameraLabel));

      if (preferredCamera?.id) cameraCandidates.push(preferredCamera.id);
      if (cameras[0]?.id) cameraCandidates.push(cameras[0].id);

      let started = false;
      let lastError = null;

      for (const cameraConfig of cameraCandidates) {
        try {
          await scanner.start(
            cameraConfig,
            {
              fps: SCANNER_CONFIG.fps,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const maxByViewport = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
                const size = Math.max(
                  SCANNER_CONFIG.qrBoxMinSize,
                  Math.min(maxByViewport, SCANNER_CONFIG.qrBoxSize)
                );
                return { width: size, height: size };
              },
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            },
            onScanSuccess,
            () => {}
          );
          started = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!started) {
        throw lastError || new Error(CAMERA_ERRORS.generic);
      }

      setResult(null);
      setScanning(true);
    } catch (error) {
      console.error(error);
      setResult({
        status: "error",
        name: "Camara no disponible",
        message: resolveCameraError(error),
      });
      setScanning(false);

      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch {
          // Ignore cleanup errors after failed starts.
        }
        scannerRef.current = null;
      }
    } finally {
      scannerMountingRef.current = false;
    }
  }, [onScanSuccess, resolveCameraError]);

  const toggleScanner = useCallback(async () => {
    if (scanning) {
      await stopScanner();
      return;
    }
    await startScanner();
  }, [scanning, startScanner, stopScanner]);

  const onSelectProject = useCallback(async (event) => {
    const nextId = Number(event.target.value);
    if (!nextId || nextId === selectedProjectId) return;

    switchingProjectRef.current = true;
    activeProjectIdRef.current = nextId;
    setSelectedProjectId(nextId);
    setSwitchingProject(true);
    setResult(null);
    setSearchQuery("");
    scanLockUntilRef.current = 0;
    lastDecodedRef.current = { text: "", at: 0 };
    await stopScanner();
    await loadProyecto(nextId);

    if (activeTab === "sensor") {
      await startScanner();
    }

    switchingProjectRef.current = false;
    setSwitchingProject(false);
  }, [activeTab, loadProyecto, selectedProjectId, startScanner, stopScanner]);

  const handleEliminarInscripcion = useCallback(async (alumno) => {
    if (!alumno?.id_inscripcion) return;

    setDeleteModalInfo(alumno);
  }, []);

  const confirmarEliminarInscripcion = useCallback(async () => {
    const alumno = deleteModalInfo;
    if (!alumno?.id_inscripcion) return;

    setDeletingInscripcionId(alumno.id_inscripcion);
    setResult({
      status: "loading",
      name: "Actualizando roster",
      message: "Eliminando inscripción del proyecto...",
    });

    try {
      const idProyecto = selectedProjectId || proyecto?.id_proyecto;
      const res = await fetch(
        apiUrl(`/api/v1/empresa/inscripciones/${alumno.id_inscripcion}?id_proyecto=${idProyecto}`),
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.mensaje || "No se pudo eliminar la inscripción");
      }

      setResult({
        status: "ok",
        name: data.nombre_alumno || alumno.nombre || "Alumno actualizado",
        message: data.mensaje || "Inscripción eliminada correctamente",
      });
      setDeleteModalInfo(null);
      await loadProyecto(idProyecto);
    } catch (error) {
      setResult({
        status: "error",
        name: "No se pudo eliminar",
        message: error?.message || "Error inesperado al eliminar la inscripción",
      });
    } finally {
      setDeletingInscripcionId(null);
      setTimeout(() => setResult(null), SCANNER_CONFIG.resultAutoHideMs);
    }
  }, [deleteModalInfo, loadProyecto, proyecto?.id_proyecto, selectedProjectId]);

  useEffect(() => {
    if (activeTab === "sensor") {
      startScanner();
      return undefined;
    }

    stopScanner();
    return undefined;
  }, [activeTab, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const alumnosFiltrados = useMemo(() => {
    const alumnos = proyecto?.alumnos_inscritos || [];
    const q = searchQuery.trim().toLowerCase();

    if (!q) return alumnos;

    return alumnos.filter((alumno) =>
      [alumno.nombre, alumno.matricula, alumno.correo, alumno.carrera]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [proyecto, searchQuery]);

  if (initializing) {
    return null;
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-white relative overflow-hidden px-4 text-center">
        <div className="absolute inset-0 bg-black" />
        <AlertCircle className="relative z-10 w-9 h-9 text-blue-200/70" />
        <p className="relative z-10 font-semibold tracking-wide uppercase text-blue-100/80 text-sm">No se encontro un proyecto activo para esta empresa</p>
      </div>
    );
  }

  return (
    <div className="h-dvh min-h-screen relative flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="sync" initial={false}>
          <Motion.img
            key={currentBgIndex}
            src={campusImages[currentBgIndex]}
            alt="Campus"
            className="w-full h-full object-cover absolute inset-0"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "-100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0)_45%)]" />
      </div>

      {/* Nav */}
      <Motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-9 sm:h-11 w-auto brightness-0 invert drop-shadow-md" />
          <p className="text-white/70 text-xs sm:text-sm font-semibold tracking-wide uppercase">Portal Empresa</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-xl"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </Motion.nav>

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0 px-4 py-6 sm:px-6 lg:px-8 overflow-y-auto overscroll-contain">
        <Motion.main
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          <div className="space-y-5">
            {/* Hero Section */}
            <div className="rounded-3xl bg-black/35 border border-white/15 backdrop-blur-md shadow-2xl p-5 sm:p-6">
              <div className="space-y-5">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge
                    className={cn(
                      "rounded-full hover:bg-transparent",
                      proyecto.evento_activo
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    )}
                  >
                    {proyecto.evento_activo ? "Evento activo" : "Evento cerrado"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.95fr]">
                  <div className="max-w-3xl">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Proyecto seleccionado</p>
                      <p className="mt-1 text-base font-semibold text-white">{proyecto.nombre_proyecto}</p>
                      <p className="mt-1 text-sm text-white/55">Ultima sincronizacion: {lastSync ? lastSync.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Eventos y proyectos de la empresa</p>
                    <select
                      value={selectedProjectId || ""}
                      onChange={onSelectProject}
                      disabled={switchingProject || !proyectosEmpresa.length}
                      className="mt-4 h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 disabled:opacity-60"
                    >
                      {proyectosEmpresa.map((item) => (
                        <option key={item.id_proyecto} value={item.id_proyecto} className="text-slate-900">
                          {item.evento} - {item.nombre_proyecto}
                        </option>
                      ))}
                    </select>
                    <p className="mt-3 text-xs text-white/50">
                      {proyectosEmpresa.length} proyecto(s) asociado(s) a tu empresa.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex justify-center rounded-3xl border border-white/15 bg-black/25 p-3 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <TabButton active={activeTab === "sensor"} onClick={() => setActiveTab("sensor")} icon={ScanLine}>
                  Lectura QR
                </TabButton>
                <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={Activity}>
                  Informacion
                </TabButton>
              </div>
            </div>

            {/* Dashboard Tab */}
            {activeTab === "dashboard" ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-3xl border border-white/15 bg-black/30 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-md">
                    <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Roster del proyecto</p>
                        <h3 className="mt-1 text-lg font-bold text-white">Alumnos registrados</h3>
                      </div>
                      <div className="relative w-full lg:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar por nombre, matricula o carrera"
                          className="h-10 rounded-xl border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/45 focus-visible:ring-blue-400/30"
                        />
                      </div>
                    </div>

                    {alumnosFiltrados.length ? (
                      <div className="overflow-x-auto">
                        <Table className="min-w-[760px]">
                          <TableHeader>
                            <TableRow className="border-white/10 hover:bg-transparent">
                              <TableHead className="px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Alumno</TableHead>
                              <TableHead className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Matricula</TableHead>
                              <TableHead className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Carrera</TableHead>
                              <TableHead className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Semestre</TableHead>
                              <TableHead className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Contacto</TableHead>
                              <TableHead className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45 text-right">Accion</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alumnosFiltrados.map((alumno) => (
                              <TableRow key={alumno.id_inscripcion} className="border-white/10 hover:bg-white/[0.03]">
                                <TableCell className="px-5 py-4">
                                  <div>
                                    <p className="font-medium text-white">{alumno.nombre}</p>
                                    <p className="mt-1 text-xs text-white/45">{alumno.fecha_inscripcion ? new Date(alumno.fecha_inscripcion).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha"}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-4 font-mono text-white/80">{alumno.matricula}</TableCell>
                                <TableCell className="px-4 py-4 text-white/80">{alumno.carrera}</TableCell>
                                <TableCell className="px-4 py-4 text-white/80">{alumno.semestre}</TableCell>
                                <TableCell className="px-4 py-4 text-white/65">{alumno.correo}</TableCell>
                                <TableCell className="px-4 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarInscripcion(alumno)}
                                    disabled={deletingInscripcionId === alumno.id_inscripcion}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {deletingInscripcionId === alumno.id_inscripcion ? "Eliminando..." : "Eliminar"}
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="px-6 py-16 text-center">
                        <Users className="mx-auto h-10 w-10 text-white/20" />
                        <p className="mt-4 font-medium text-white/70">{searchQuery ? "No hay coincidencias con esa busqueda." : "Aun no hay alumnos registrados en este proyecto."}</p>
                        <p className="mt-2 text-sm text-white/45">El roster se actualiza automaticamente despues de cada lectura valida del sensor.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-5 xl:sticky xl:top-6">
                  <OccupancyMeter
                    current={proyecto.cupo_actual || 0}
                    max={proyecto.capacidad_max || 0}
                    percent={proyecto.ocupacion_porcentaje || 0}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard label="Alumnos inscritos" value={proyecto.inscripciones_totales} />
                    <StatCard label="Espacios libres" value={proyecto.cupos_disponibles} tone="success" />
                    <StatCard label="Capacidad total" value={proyecto.capacidad_max} tone="accent" />
                    <StatCard label="Lista de espera" value={proyecto.capacidad_espera_max ?? 0} tone="warn" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/15 bg-black/30 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-md sm:p-5">
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Modulo de lectura</p>
                      <h3 className="mt-1 text-xl font-bold text-white">Escaneo QR en sitio</h3>
                    </div>
                    <Button
                      onClick={toggleScanner}
                      className={cn(
                        "rounded-xl px-5 font-semibold shadow-none",
                        scanning
                          ? "border border-red-400/25 bg-red-500/15 text-red-100 hover:bg-red-500/25"
                          : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      )}
                    >
                      <ScanLine className="mr-2 h-4 w-4" />
                      {scanning ? "Pausar sensor" : "Activar sensor"}
                    </Button>
                  </div>

                  <div className="relative min-h-[420px] sm:min-h-[520px] lg:min-h-[620px] xl:min-h-[70vh] overflow-hidden rounded-2xl border border-white/15 bg-black/40 p-3 sm:p-4">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%)]" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                      <div className="flex h-[84%] w-[94%] sm:h-[80%] sm:w-[86%] items-center justify-center rounded-[24px] sm:rounded-[28px] border border-dashed border-blue-300/35">
                        <div className="h-[92%] w-[92%] rounded-[22px] border border-white/10" />
                      </div>
                    </div>
                    <div id="reader" className="relative z-10 h-full overflow-hidden rounded-xl [&_video]:h-full [&_video]:w-full [&_video]:rounded-xl [&_video]:object-cover" />

                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
                      <div className="w-full max-w-3xl">
                        <AnimatePresence mode="wait">{result ? <ResultBanner result={result} /> : null}</AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-white/45">Mantener la credencial dentro del marco para validacion inmediata</p>
                </div>

              </div>
            )}
          </div>
        </Motion.main>
      </div>

      {/* Footer */}
      <Motion.footer
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
        className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-t border-white/5"
      >
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a href="https://tec.mx/es/avisos-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
            Aviso de Privacidad
          </a>
          <a href="https://letica.mx/ethos?locale=es" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
            Ethos
          </a>
        </div>
        <p className="text-white/40 text-[11px] font-medium text-center">
          © {new Date().getFullYear()}{" "}
          <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Tecnológico de Monterrey</a>
        </p>
      </Motion.footer>

      <Dialog open={!!deleteModalInfo} onOpenChange={(open) => !open && setDeleteModalInfo(null)}>
        <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">Confirmar baja de registro</DialogTitle>
            <DialogDescription className="text-white/70">
              Esta acción quitará al alumno del proyecto y liberará su cupo.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white/80">
            <p className="font-semibold text-white">{deleteModalInfo?.nombre || "Alumno"}</p>
            <p className="text-xs text-white/60 mt-1">Matrícula: {deleteModalInfo?.matricula || "--"}</p>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
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
    </div>
  );
}

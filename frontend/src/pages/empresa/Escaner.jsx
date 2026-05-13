import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Download,
  LogOut,
  Moon,
  QrCode,
  ScanLine,
  Search,
  Sun,
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
import { apiUrl, downloadCsvExport } from "@/lib/api";
import { cn } from "@/lib/utils";
import tecLogo from "@/assets/tec_logo.png";

const SCANNER_CONFIG = {
  bgRotationMs: 20000,
  resultAutoHideMs: 4500,
  liveSyncMs: 5000,
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

function StatCard({ label, value }) {
  return (
    <Card className="rounded-2xl border border-white/15 bg-black/30 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/55">{label}</p>
        <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-normal tracking-tight text-white">{value}</p>
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
          <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/55">Capacidad operativa</p>
          <p className="mt-3 text-3xl font-normal tracking-tight text-white">{current}/{max}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/45">Ocupacion</p>
          <p className="text-2xl font-normal text-white">{percent}%</p>
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

  const icons = {
    ok: <CheckCircle2 className="h-8 w-8 text-white/70" />,
    error: <AlertCircle className="h-8 w-8 text-white/70" />,
    loading: <QrCode className="h-8 w-8 text-white/70 animate-pulse" />,
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/15 bg-black/30 p-4"
    >
      <div className="flex items-center gap-4">
        <Motion.div
          animate={isSuccess ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.45, repeat: isSuccess ? 2 : 0 }}
        >
          {icons[result.status] || icons.loading}
        </Motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={cn("text-base font-normal text-white truncate", isSuccess && "text-xl tracking-tight")}>
              {result.name}
            </p>
            {isSuccess && result.matricula && (
              <Badge variant="outline" className="bg-white/10 border-white/20 text-white/70 font-mono py-0 text-[10px]">
                {result.matricula}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm font-light text-white/55">
            {result.status === "ok" ? "Registro procesado correctamente" : result.message}
          </p>
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
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-normal transition-colors border",
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
  const [isDark, setIsDark] = useState(() => localStorage.getItem("empresa-theme") !== "light");
  const toggleTheme = () => setIsDark(prev => {
    const next = !prev;
    localStorage.setItem("empresa-theme", next ? "dark" : "light");
    return next;
  });
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [activeTab, setActiveTab] = useState("sensor");
  const [lastSync, setLastSync] = useState(null);
  const [expandedAlumnoId, setExpandedAlumnoId] = useState(null);

  const [exportDataset, setExportDataset] = useState("inscripciones");
  const [exportScope, setExportScope] = useState("filtered");
  const [exportingCsv, setExportingCsv] = useState(false);
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
    if (initializing || !proyecto) return undefined;

    let cancelled = false;
    const syncProyectoActivo = async () => {
      if (cancelled || document.hidden || switchingProjectRef.current) return;

      const currentProjectId = activeProjectIdRef.current || selectedProjectId || proyecto?.id_proyecto || null;
      if (!currentProjectId) return;

      await loadProyecto(currentProjectId);
    };

    const intervalId = setInterval(syncProyectoActivo, SCANNER_CONFIG.liveSyncMs);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncProyectoActivo();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [initializing, loadProyecto, proyecto, selectedProjectId]);



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

  const isProcessingRef = useRef(false);

  const onScanSuccess = useCallback(async (decodedText) => {
    if (switchingProjectRef.current || isProcessingRef.current) return;

    const now = Date.now();
    const normalizedText = (decodedText || "").trim();
    const projectIdForScan = activeProjectIdRef.current;

    if (!normalizedText || !projectIdForScan) return;
    if (now < scanLockUntilRef.current) return;
    if (
      lastDecodedRef.current.text === normalizedText
      && now - lastDecodedRef.current.at < SCANNER_CONFIG.duplicateQrIgnoreMs
    ) {
      return;
    }

    scanLockUntilRef.current = now + SCANNER_CONFIG.scanCooldownMs;
    lastDecodedRef.current = { text: normalizedText, at: now };
    isProcessingRef.current = true;

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
          matricula: data.matricula_alumno,
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
    } finally {
      isProcessingRef.current = false;
      setTimeout(() => setResult(null), SCANNER_CONFIG.resultAutoHideMs);
    }
  }, [loadProyecto]);

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
    setDeleteConfirmText("");
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

  const handleExportCsv = useCallback(async () => {
    setExportingCsv(true);
    try {
      const activeProjectId = selectedProjectId || proyecto?.id_proyecto || "";
      const filters = exportScope === "filtered"
        ? {
            proyecto_id: activeProjectId,
            evento_id: proyecto?.id_evento || "",
          }
        : {};

      await downloadCsvExport({
        dataset: exportDataset,
        scope: exportScope,
        filters,
      });
    } catch (error) {
      setResult({
        status: "error",
        name: "Exportación fallida",
        message: error?.message || "No se pudo exportar el CSV",
      });
      setTimeout(() => setResult(null), SCANNER_CONFIG.resultAutoHideMs);
    } finally {
      setExportingCsv(false);
    }
  }, [exportDataset, exportScope, proyecto?.id_evento, proyecto?.id_proyecto, selectedProjectId]);

  if (initializing) {
    return null;
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-white relative overflow-hidden px-4 text-center">
        <div className="absolute inset-0 bg-black" />
        <AlertCircle className="relative z-10 w-9 h-9 text-blue-200/70" />
        <p className="relative z-10 font-normal tracking-wide uppercase text-blue-100/80 text-sm">No se encontro un proyecto activo para esta empresa</p>
      </div>
    );
  }

  return (
    <div
      data-admin-theme={isDark ? "dark" : "light"}
      className="h-dvh min-h-screen relative flex flex-col overflow-hidden"
      style={{ backgroundColor: isDark ? "#0b1120" : "#f1f5f9" }}
    >
      {/* Nav */}
      <Motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img src={tecLogo} alt="Tecnológico de Monterrey" className={`h-12 sm:h-14 w-auto drop-shadow-md ${isDark ? "brightness-0 invert" : "brightness-0"}`} />
          <p className="text-white/70 text-xs sm:text-sm font-normal tracking-wide uppercase">Portal Empresa</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
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
      </Motion.nav>

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto overscroll-contain">
        <Motion.main
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          <div className="space-y-5">
            {/* Hero Section */}
            <div className="rounded-2xl sm:rounded-3xl bg-black/35 border border-white/15 backdrop-blur-md shadow-2xl p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge
                    className={cn(
                      "rounded-full hover:bg-transparent",
                      proyecto.evento_activo
                        ? "border-white/10 bg-white/5 text-white/70"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    )}
                  >
                    {proyecto.evento_activo ? "Evento activo" : "Evento cerrado"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.95fr]">
                  <div className="max-w-3xl">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4">
                      <p className="text-[10px] font-normal uppercase tracking-[0.18em] text-white/45">Proyecto seleccionado</p>
                      <p className="mt-1 text-base font-normal text-white">{proyecto.nombre_proyecto}</p>
                      <p className="mt-1 text-sm text-white/55">Ultima sincronizacion: {lastSync ? lastSync.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4">
                    <p className="text-[10px] font-normal uppercase tracking-[0.18em] text-white/45">Eventos y proyectos de la empresa</p>
                    <select
                      value={selectedProjectId || ""}
                      onChange={onSelectProject}
                      disabled={switchingProject || !proyectosEmpresa.length}
                      style={{ colorScheme: "dark" }}
                      className="mt-4 h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 disabled:opacity-60"
                    >
                      {proyectosEmpresa.map((item) => (
                        <option key={item.id_proyecto} value={item.id_proyecto} className="bg-slate-900 text-white">
                          {item.evento} - {item.nombre_proyecto}
                        </option>
                      ))}
                    </select>
                    <p className="mt-3 text-xs text-white/50">
                      {proyectosEmpresa.length} proyecto(s) asociado(s) a tu empresa.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <select
                        value={exportDataset}
                        onChange={(e) => setExportDataset(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white focus:outline-none"
                        disabled={exportingCsv}
                      >
                        <option value="inscripciones" className="bg-slate-900 text-white">CSV: Inscripciones</option>
                        <option value="proyectos" className="bg-slate-900 text-white">CSV: Proyectos</option>
                        <option value="empresas" className="bg-slate-900 text-white">CSV: Empresas</option>
                      </select>

                      <select
                        value={exportScope}
                        onChange={(e) => setExportScope(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white focus:outline-none"
                        disabled={exportingCsv}
                      >
                        <option value="all" className="bg-slate-900 text-white">Todos</option>
                        <option value="filtered" className="bg-slate-900 text-white">Filtrados</option>
                      </select>

                      <Button
                        onClick={handleExportCsv}
                        disabled={exportingCsv}
                        className="h-10 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {exportingCsv ? "Exportando..." : "Exportar CSV"}
                      </Button>
                    </div>
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
                    <div className="flex flex-col gap-3 sm:gap-4 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/45">Roster del proyecto</p>
                        <h3 className="mt-1 text-lg font-normal text-white">Alumnos registrados</h3>
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
                      <>
                      {/* Mobile: card list */}
                      <div className="md:hidden divide-y divide-white/10">
                        {alumnosFiltrados.map((alumno) => {
                          const isExpanded = expandedAlumnoId === alumno.id_inscripcion;
                          return (
                            <div key={alumno.id_inscripcion} className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setExpandedAlumnoId(isExpanded ? null : alumno.id_inscripcion)}
                                className="w-full text-left"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white truncate">{alumno.nombre}</p>
                                    <p className="mt-0.5 text-xs font-mono text-white/55">{alumno.matricula}</p>
                                    <p className="mt-1 text-xs text-white/65 truncate">{alumno.carrera} · Sem {alumno.semestre}</p>
                                    <p className="mt-0.5 text-xs text-white/45 truncate">{alumno.correo}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleEliminarInscripcion(alumno); }}
                                    disabled={deletingInscripcionId === alumno.id_inscripcion}
                                    className="shrink-0 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 disabled:opacity-60"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {isExpanded && (
                                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-3">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1">Contacto alterno</p>
                                      <p className="text-xs text-white/80">{alumno.correo_alterno || "No proporcionado"}</p>
                                      <p className="text-xs text-blue-300">{alumno.celular || "Sin número"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1">Aportación</p>
                                      <p className="text-xs italic text-white/65 leading-relaxed">"{alumno.descripcion_personal || "Sin descripción"}"</p>
                                    </div>
                                  </div>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {/* Desktop: table */}
                      <div className="hidden md:block overflow-x-auto">
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
                            {alumnosFiltrados.map((alumno) => {
                              const isExpanded = expandedAlumnoId === alumno.id_inscripcion;
                              return (
                                <Fragment key={alumno.id_inscripcion}>
                                  <TableRow 
                                    className={cn(
                                      "border-white/10 transition-colors cursor-pointer",
                                      isExpanded ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                                    )}
                                    onClick={() => setExpandedAlumnoId(isExpanded ? null : alumno.id_inscripcion)}
                                  >
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEliminarInscripcion(alumno);
                                        }}
                                        disabled={deletingInscripcionId === alumno.id_inscripcion}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-normal text-white/70 hover:bg-white/10 disabled:opacity-60 transition-all"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {deletingInscripcionId === alumno.id_inscripcion ? "Eliminando..." : "Eliminar"}
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                  
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <TableRow className="border-none hover:bg-transparent">
                                        <TableCell colSpan={6} className="p-0 border-none bg-white/[0.02]">
                                          <Motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                          >
                                            <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-white/5">
                                              <div className="space-y-4">
                                                <div>
                                                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium mb-2">Contacto Alternativo</p>
                                                  <div className="flex flex-col gap-1">
                                                    <p className="text-sm text-white font-medium">{alumno.correo_alterno || "No proporcionado"}</p>
                                                    <p className="text-sm text-blue-400">{alumno.celular || "Sin número registrado"}</p>
                                                  </div>
                                                </div>
                                              </div>
                                              <div>
                                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium mb-2">Habilidades y Aportación</p>
                                                <p className="text-sm text-white/70 italic leading-relaxed">
                                                  "{alumno.descripcion_personal || "El alumno no ha proporcionado una descripción detallada todavía."}"
                                                </p>
                                              </div>
                                            </div>
                                          </Motion.div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </AnimatePresence>
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      </>
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

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <StatCard label="Alumnos inscritos" value={proyecto.inscripciones_totales} />
                    <StatCard label="Espacios libres" value={proyecto.cupos_disponibles} />
                    <StatCard label="Capacidad total" value={proyecto.capacidad_max} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl sm:rounded-3xl border border-white/15 bg-black/30 p-3 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-md">
                  <div className="mb-3 sm:mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/45">Modulo de lectura</p>
                      <h3 className="mt-1 text-lg sm:text-xl font-normal text-white">Escaneo QR en sitio</h3>
                    </div>
                    <Button
                      onClick={toggleScanner}
                      className={cn(
                        "rounded-xl px-5 font-normal shadow-none",
                        scanning
                          ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          : "border border-white/10 bg-white/10 text-white/80 hover:bg-white/15"
                      )}
                    >
                      <ScanLine className="mr-2 h-4 w-4" />
                      {scanning ? "Pausar sensor" : "Activar Camara"}
                    </Button>
                  </div>

                  <div className="relative min-h-[340px] sm:min-h-[520px] lg:min-h-[620px] xl:min-h-[70vh] overflow-hidden rounded-2xl border border-white/15 bg-black/40 p-2 sm:p-4">
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                      <div className="flex h-[84%] w-[94%] sm:h-[80%] sm:w-[86%] items-center justify-center rounded-[24px] sm:rounded-[28px] border border-dashed border-white/15">
                        <div className="h-[92%] w-[92%] rounded-[22px] border border-white/8" />
                      </div>
                    </div>
                    <div id="reader" className="relative z-10 h-full overflow-hidden rounded-xl [&_video]:h-full [&_video]:w-full [&_video]:rounded-xl [&_video]:object-cover" />

                    <AnimatePresence mode="wait">
                      {result ? (
                        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
                          <div className="w-full max-w-lg">
                            <ResultBanner result={result} />
                          </div>
                        </div>
                      ) : null}
                    </AnimatePresence>
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
          <a href="https://tec.mx/es/avisos-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-normal uppercase tracking-wider hover:text-white/80 transition-colors">
            Aviso de Privacidad
          </a>
          <a href="https://letica.mx/ethos?locale=es" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-normal uppercase tracking-wider hover:text-white/80 transition-colors">
            Ethos
          </a>
        </div>
        <p className="text-white/40 text-[11px] font-medium text-center">
          © {new Date().getFullYear()}{" "}
          <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Tecnológico de Monterrey</a>
        </p>
      </Motion.footer>

      <Dialog open={!!deleteModalInfo} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalInfo(null);
          setDeleteConfirmText("");
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
            {/* Info del alumno */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
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
              }}
              disabled={deletingInscripcionId === deleteModalInfo?.id_inscripcion}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={confirmarEliminarInscripcion}
              disabled={deleteConfirmText.trim().toLowerCase() !== "eliminar" || deletingInscripcionId === deleteModalInfo?.id_inscripcion}
            >
              {deletingInscripcionId === deleteModalInfo?.id_inscripcion ? "Eliminando..." : "Eliminar estudiante"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

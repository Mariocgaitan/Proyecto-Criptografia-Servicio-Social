import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, LayoutDashboard, Building2, Calendar, Plus, RefreshCw, Copy, Check, QrCode } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [activeTab, setActiveTab] = useState("proyectos");

  // Modals Info
  const [isCrearProyectoOpen, setIsCrearProyectoOpen] = useState(false);
  const [isCrearEmpresaOpen, setIsCrearEmpresaOpen] = useState(false);
  const [isCrearEventoOpen, setIsCrearEventoOpen] = useState(false);
  const [cupoModalInfo, setCupoModalInfo] = useState(null);
  const [credsModalInfo, setCredsModalInfo] = useState(null);

  // Forms
  const [formProyecto, setFormProyecto] = useState({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
  const [formEmpresa, setFormEmpresa] = useState({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
  const [formEvento, setFormEvento] = useState({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
  const [nuevaCapacidad, setNuevaCapacidad] = useState(0);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [copiedField, setCopiedField] = useState(null);

  const fetchData = async () => {
    try {
      const [ps, es, evs] = await Promise.all([
        fetch("http://localhost:8000/api/v1/admin/proyectos", { credentials: "include" }).then(res => res.json()),
        fetch("http://localhost:8000/api/v1/admin/empresas", { credentials: "include" }).then(res => res.json()),
        fetch("http://localhost:8000/api/v1/admin/eventos", { credentials: "include" }).then(res => res.json())
      ]);
      setProyectos(ps); setEmpresas(es); setEventos(evs);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // === HANDLERS ===
  const handleCrearProyecto = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/proyectos", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          id_empresa: parseInt(formProyecto.id_empresa), id_evento: parseInt(formProyecto.id_evento),
          nombre_proyecto: formProyecto.nombre, descripcion: formProyecto.desc || null,
          capacidad_max: parseInt(formProyecto.cap_max), capacidad_espera_max: parseInt(formProyecto.espera)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear");
      setIsCrearProyectoOpen(false);
      setFormProyecto({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
      fetchData();
      setCredsModalInfo({ nombre: data.nombre_proyecto, correo: data.credenciales.correo, password: data.credenciales.password });
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleCrearEmpresa = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/empresas", {
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
      const res = await fetch("http://localhost:8000/api/v1/admin/eventos", {
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
      const res = await fetch(`http://localhost:8000/api/v1/admin/proyectos/${cupoModalInfo.id}/capacidad`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ nueva_capacidad_max: parseInt(nuevaCapacidad) })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setCupoModalInfo(null); fetchData();
    } catch(err) { setErrorText(err.message); } finally { setIsSubmitting(false); }
  };

  const handleRegenerarCreds = async (id, nombre) => {
    if (!confirm(`¿Regenerar contraseña para: ${nombre}? La anterior dejará de funcionar.`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/proyectos/${id}/credenciales`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Fallo de red");
      const data = await res.json();
      setCredsModalInfo({ nombre, correo: data.correo, password: data.password });
    } catch(err) { alert(err.message); }
  };

  // Animations
  const pageVariants = { initial: { opacity: 0, scale: 0.98 }, in: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } }, out: { opacity: 0, scale: 1.02 } };
  const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" } }) };

  return (
    <div className="min-h-screen bg-[#001D4A] relative overflow-hidden pb-12">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="font-bold text-white text-xl tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                    Centro de Control Máster
                  </h1>
                  <p className="text-blue-300 text-xs font-medium tracking-widest uppercase mt-1">Servicio Social SID</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden md:block text-right">
                  <p className="text-white text-sm font-semibold">{user?.nombre}</p>
                  <p className="text-blue-300/60 text-xs tracking-wider">Superadmin</p>
                </div>
                <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 transition-colors" onClick={logout}>
                  <LogOut className="w-5 h-5 mr-2" /> Salir
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Multi-Modals */}
        <Dialog open={!!credsModalInfo} onOpenChange={open => !open && setCredsModalInfo(null)}>
          <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl p-0 overflow-hidden">
            <div className="bg-amber-500 p-6 text-white">
              <DialogTitle className="text-xl flex items-center gap-2"><QrCode className="w-6 h-6"/> Credenciales Privadas</DialogTitle>
              <DialogDescription className="text-amber-100 mt-1">Comparte esto con el representante de la empresa.</DialogDescription>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
                <b>Atención:</b> Esta contraseña no volverá a mostrarse. Guárdala antes de cerrar.
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Correo de Acceso</Label>
                <div className="flex mt-1">
                  <Input readOnly value={credsModalInfo?.correo || ""} className="font-mono bg-slate-50 border-r-0 rounded-r-none outline-none focus-visible:ring-0 text-slate-700" />
                  <Button onClick={() => handleCopy(credsModalInfo?.correo, 'c')} variant="outline" className="rounded-l-none bg-slate-100 border-l-0 text-slate-500">
                    {copiedField==='c' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contraseña de Proyecto</Label>
                <div className="flex mt-1">
                  <Input readOnly value={credsModalInfo?.password || ""} className="font-mono bg-emerald-50 border-emerald-200 border-r-0 rounded-r-none outline-none focus-visible:ring-0 text-emerald-700 font-bold" />
                  <Button onClick={() => handleCopy(credsModalInfo?.password, 'p')} variant="outline" className="rounded-l-none bg-emerald-100 border-emerald-200 border-l-0 text-emerald-700 hover:bg-emerald-200">
                    {copiedField==='p' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => setCredsModalInfo(null)}>Confirmar Guardado</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!cupoModalInfo} onOpenChange={open => !open && setCupoModalInfo(null)}>
          <DialogContent className="sm:max-w-sm bg-slate-900 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Ampliar Cupo</DialogTitle>
              <DialogDescription className="text-white/50">{cupoModalInfo?.nombre}</DialogDescription>
            </DialogHeader>
            {errorText && <p className="text-red-400 text-sm">{errorText}</p>}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-white/70">Máximo Actual</Label>
                <Input disabled value={cupoModalInfo?.max || 0} className="bg-white/5 border-white/10 text-white/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Nueva Capacidad</Label>
                <Input type="number" min={(cupoModalInfo?.max || 0) + 1} value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} className="bg-white/10 border-blue-500/50 text-white focus-visible:ring-blue-500 text-lg font-bold" />
              </div>
            </div>
            <Button onClick={handleGuardarCupo} disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-0">Salvar Ajuste</Button>
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <motion.main initial="initial" animate="in" exit="out" variants={pageVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-2xl flex w-fit max-w-full overflow-x-auto shadow-xl backdrop-blur-md">
              <TabsTrigger value="proyectos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white text-white/60 hover:text-white transition-all">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Proyectos
              </TabsTrigger>
              <TabsTrigger value="empresas" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white text-white/60 hover:text-white transition-all">
                <Building2 className="w-4 h-4 mr-2" /> Empresas
              </TabsTrigger>
              <TabsTrigger value="eventos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white text-white/60 hover:text-white transition-all">
                <Calendar className="w-4 h-4 mr-2" /> Eventos Semestrales
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {activeTab === "proyectos" && (
                <motion.div key="proyectos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                    <div>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">Directorio de Proyectos</h2>
                      <p className="text-blue-200/60 mt-1">Oferta de plazas para el Servicio Social.</p>
                    </div>
                    
                    <Dialog open={isCrearProyectoOpen} onOpenChange={setIsCrearProyectoOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-white text-blue-900 hover:bg-blue-50 font-bold px-6 py-6 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-105">
                          <Plus className="w-5 h-5 mr-2"/> Aperturar Puesto
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl bg-slate-900 border border-white/10 text-white shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">Nuevo Puesto de Proyecto</DialogTitle>
                          <DialogDescription className="text-white/50">Configura la empresa anfitriona, el evento y su aforo.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCrearProyecto} className="space-y-5 mt-4">
                          {errorText && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-medium">{errorText}</div>}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-white/70">Empresa Receptora</Label>
                              <Select required onValueChange={v => setFormProyecto({...formProyecto, id_empresa: v})}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                  {empresas.map(e => <SelectItem key={e.id_empresa} value={e.id_empresa.toString()} className="hover:bg-slate-700 cursor-pointer">{e.nombre_empresa}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-white/70">Evento Activo</Label>
                              <Select required onValueChange={v => setFormProyecto({...formProyecto, id_evento: v})}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                  {eventos.filter(e => e.activo).map(ev => <SelectItem key={ev.id_evento} value={ev.id_evento.toString()} className="hover:bg-slate-700 cursor-pointer">{ev.nombre}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Título Oficial del Proyecto</Label>
                            <Input required className="bg-white/5 border-white/10" value={formProyecto.nombre} onChange={e => setFormProyecto({...formProyecto, nombre: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Descripción u Observaciones (Opcional)</Label>
                            <Input className="bg-white/5 border-white/10" value={formProyecto.desc} onChange={e => setFormProyecto({...formProyecto, desc: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="space-y-2">
                              <Label className="text-white/70">Límite de Alumnos (Cupo)</Label>
                              <Input type="number" required min="1" className="bg-black/20 border-white/10 font-bold text-lg text-center" value={formProyecto.cap_max} onChange={e => setFormProyecto({...formProyecto, cap_max: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-white/70">Espera Max. (Overbooking)</Label>
                              <Input type="number" min="0" className="bg-black/20 border-white/10 font-bold text-lg text-center" value={formProyecto.espera} onChange={e => setFormProyecto({...formProyecto, espera: e.target.value})} />
                            </div>
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-900 font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20">Finalizar e Instanciar Credenciales</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Card className="bg-white/[0.03] backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden rounded-3xl">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-white/[0.02]">
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-white/60 font-semibold uppercase tracking-widest text-[10px] pl-6 h-14">Nombre del Proyecto</TableHead>
                            <TableHead className="text-white/60 font-semibold uppercase tracking-widest text-[10px] text-center">Tasa Ocupación</TableHead>
                            <TableHead className="text-white/60 font-semibold uppercase tracking-widest text-[10px] text-center">Estatus</TableHead>
                            <TableHead className="text-white/60 font-semibold uppercase tracking-widest text-[10px] text-right pr-6">Acciones Privilegiadas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {proyectos?.map((p, idx) => (
                            <TableRow key={p.id_proyecto} className="border-white/5 hover:bg-white/[0.04] transition-colors group">
                              <TableCell className="pl-6 py-5">
                                <p className="font-bold text-white text-base leading-tight group-hover:text-blue-300 transition-colors">{p.nombre_proyecto}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Building2 className="w-3 h-3 text-blue-400" />
                                  <p className="text-xs text-blue-200/60 font-medium">{p.empresa}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-mono text-xl font-black text-white">{p.cupo_actual}</span>
                                  <span className="text-[10px] text-white/40 uppercase tracking-widest border-t border-white/10 pt-1 w-full text-center">de {p.capacidad_max}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {p.cupo_actual >= p.capacidad_max ? (
                                  <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30 font-bold px-3 py-1">Lleno</Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30 font-bold px-3 py-1 animate-pulse">Disponible</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6 space-x-2">
                                <Button variant="ghost" size="sm" className="h-9 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white border border-blue-500/20 text-xs px-4 rounded-xl"
                                  onClick={() => { setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max }); setNuevaCapacidad(p.capacidad_max + 1); }}>
                                  + Cupo Extra
                                </Button>
                                <Button variant="ghost" size="sm" className="h-9 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white border border-amber-500/20 text-xs px-3 rounded-xl"
                                  onClick={() => handleRegenerarCreds(p.id_proyecto, p.nombre_proyecto)}>
                                  <RefreshCw className="w-3 h-3 mr-1.5" /> Re-Keys
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!proyectos.length && (
                            <TableRow><TableCell colSpan={4} className="text-center py-16 text-white/40">La bóveda de proyectos está vacía.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "empresas" && (
                <motion.div key="empresas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                    <div>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">Afiliación Corporativa</h2>
                      <p className="text-blue-200/60 mt-1">Socios formadores autorizados para impartir plazas.</p>
                    </div>
                    <Dialog open={isCrearEmpresaOpen} onOpenChange={setIsCrearEmpresaOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-6 py-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:scale-105">
                          <Building2 className="w-5 h-5 mr-2"/> Dar de Alta Organización
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-slate-900 border border-white/10 text-white">
                        <DialogHeader><DialogTitle className="text-xl">Registrar Socio Formador</DialogTitle></DialogHeader>
                        <form onSubmit={handleCrearEmpresa} className="space-y-4 mt-2">
                          {errorText && <div className="text-sm text-red-400 text-center bg-red-900/20 p-2 rounded">{errorText}</div>}
                          <div className="space-y-1">
                            <Label className="text-white/70">ID Asociado / Convenio</Label>
                            <Input required className="bg-white/5 border-white/10" value={formEmpresa.id_asociado} onChange={e => setFormEmpresa({...formEmpresa, id_asociado: e.target.value})} placeholder="Ej. SF-XXX24" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70">Nombre Público (Comercial)</Label>
                            <Input required className="bg-white/5 border-white/10" value={formEmpresa.nombre} onChange={e => setFormEmpresa({...formEmpresa, nombre: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70">Denominación Legal (Razón Social)</Label>
                            <Input required className="bg-white/5 border-white/10" value={formEmpresa.razon} onChange={e => setFormEmpresa({...formEmpresa, razon: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/70">Descripción de Giro Corporativo</Label>
                            <Input className="bg-white/5 border-white/10" value={formEmpresa.desc} onChange={e => setFormEmpresa({...formEmpresa, desc: e.target.value})} />
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 mt-4">Matricular Entidad</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {empresas?.map((emp, i) => (
                      <motion.div key={emp.id_empresa} custom={i} variants={cardVariants} initial="hidden" animate="visible" className="group">
                        <Card className="h-full bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all rounded-3xl overflow-hidden shadow-2xl">
                          <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="flex justify-between items-start">
                              <span className="font-extrabold text-lg text-white group-hover:text-cyan-300 transition-colors">{emp.nombre_empresa}</span>
                              <Badge variant="outline" className="bg-white/5 border-white/10 text-white/50 font-mono text-[10px] px-2.5">#{emp.id_asociado}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <p className="text-sm text-blue-100/60 leading-relaxed min-h-[40px]">{emp.descripcion || "Organización receptora con convenio vigente."}</p>
                            <div className="mt-5 pt-4 border-t border-white/5">
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-300 border-0 hover:bg-blue-500/20">{emp.razon_social}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "eventos" && (
                <motion.div key="eventos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                    <div>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">Periodos Académicos</h2>
                      <p className="text-blue-200/60 mt-1">Control de semestres e inscripciones históricas.</p>
                    </div>
                    <Dialog open={isCrearEventoOpen} onOpenChange={setIsCrearEventoOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 py-6 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all hover:scale-105">
                          <Calendar className="w-5 h-5 mr-2"/> Aperturar Periodo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-slate-900 border border-white/10 text-white">
                        <DialogHeader><DialogTitle className="text-xl">Inaugurar Semestre</DialogTitle></DialogHeader>
                        <form onSubmit={handleCrearEvento} className="space-y-4 mt-2">
                          <div className="space-y-1">
                            <Label className="text-white/70">Distintivo del Periodo</Label>
                            <Input required className="bg-white/5 border-white/10" value={formEvento.nombre} onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} placeholder="Ej. Feria Institucional SJR" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-white/70">Ciclo</Label>
                              <Select value={formEvento.periodo} onValueChange={v => setFormEvento({...formEvento, periodo: v})}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue/></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                  {["FEBRERO-JUNIO", "AGOSTO-DICIEMBRE", "VERANO", "INVIERNO"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-white/70">Año Numérico</Label>
                              <Input type="number" required className="bg-white/5 border-white/10 text-center font-bold" value={formEvento.anio} onChange={e => setFormEvento({...formEvento, anio: e.target.value})} />
                            </div>
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-500 hover:bg-indigo-400 mt-4 font-bold text-white">Emitir Apertura Global</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {eventos?.map((ev, i) => (
                      <motion.div key={ev.id_evento} custom={i} variants={cardVariants} initial="hidden" animate="visible" className="relative group">
                        <Card className="h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-3xl relative">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${ev.activo ? 'bg-gradient-to-b from-emerald-400 to-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                          <CardHeader className="pl-8 border-b border-white/5 pb-4">
                            <CardTitle className="flex justify-between items-start">
                              <span className="text-xl font-bold text-white tracking-tight">{ev.nombre}</span>
                              {ev.activo ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] px-3 py-1 uppercase text-[10px] tracking-widest font-bold">En Curso</Badge>
                              ) : (
                                <Badge className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 uppercase text-[10px] tracking-widest">Archivado</Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pl-8 pt-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white/80">{ev.periodo} {ev.anio}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">Semestre {ev.semestre}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Tabs>
        </motion.main>
      </div>
    </div>
  );
}

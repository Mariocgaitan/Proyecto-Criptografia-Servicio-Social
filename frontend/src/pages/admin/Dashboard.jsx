import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, LayoutDashboard, Building2, Users, Calendar, Plus, RefreshCw, Copy, Check, Hash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [eventos, setEventos] = useState([]);

  // States for Modals
  const [isCrearProyectoOpen, setIsCrearProyectoOpen] = useState(false);
  const [isCrearEmpresaOpen, setIsCrearEmpresaOpen] = useState(false);
  const [isCrearEventoOpen, setIsCrearEventoOpen] = useState(false);
  const [cupoModalInfo, setCupoModalInfo] = useState(null); // { id, nombre, actual, max }
  const [credsModalInfo, setCredsModalInfo] = useState(null); // { nombre, correo, password }

  // Form states
  const [formProyecto, setFormProyecto] = useState({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
  const [formEmpresa, setFormEmpresa] = useState({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
  const [formEvento, setFormEvento] = useState({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
  const [nuevaCapacidad, setNuevaCapacidad] = useState(0);

  // Error/Loading states
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
    } catch (err) {
      console.error("Error fetching admin data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCrearProyecto = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setErrorText("");
    
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_empresa: parseInt(formProyecto.id_empresa),
          id_evento: parseInt(formProyecto.id_evento),
          nombre_proyecto: formProyecto.nombre,
          descripcion: formProyecto.desc || null,
          capacidad_max: parseInt(formProyecto.cap_max),
          capacidad_espera_max: parseInt(formProyecto.espera)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear proyecto");
      
      setIsCrearProyectoOpen(false);
      setFormProyecto({ id_empresa: "", id_evento: "", nombre: "", desc: "", cap_max: 10, espera: 0 });
      fetchData();
      
      // Mostrar modal de credenciales
      setCredsModalInfo({
        nombre: data.nombre_proyecto,
        correo: data.credenciales.correo,
        password: data.credenciales.password
      });

    } catch(err) {
      setErrorText(err.message);
    } finally { setIsSubmitting(false); }
  };

  const handleCrearEmpresa = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_asociado: formEmpresa.id_asociado,
          nombre_empresa: formEmpresa.nombre,
          razon_social: formEmpresa.razon,
          descripcion: formEmpresa.desc || null,
          calle: formEmpresa.calle || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear empresa");
      setIsCrearEmpresaOpen(false);
      setFormEmpresa({ id_asociado: "", nombre: "", razon: "", desc: "", calle: "" });
      fetchData();
    } catch(err) { setErrorText(err.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleCrearEvento = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: formEvento.nombre,
          periodo: formEvento.periodo,
          anio: parseInt(formEvento.anio),
          semestre: formEvento.semestre,
          activo: formEvento.activo
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear evento");
      setIsCrearEventoOpen(false);
      setFormEvento({ nombre: "", periodo: "FEBRERO-JUNIO", anio: new Date().getFullYear(), semestre: "primavera", activo: true });
      fetchData();
    } catch(err) { setErrorText(err.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleGuardarCupo = async () => {
    if (!cupoModalInfo) return;
    setIsSubmitting(true); setErrorText("");
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/proyectos/${cupoModalInfo.id}/capacidad`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nueva_capacidad_max: parseInt(nuevaCapacidad) })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Error");
      }
      setCupoModalInfo(null);
      fetchData();
    } catch(err) { setErrorText(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleRegenerarCreds = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de regenerar la contraseña para el proyecto: ${nombre}? Esta acción invalidará la contraseña actual instantáneamente.`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/proyectos/${id}/credenciales`, {
        method: "POST", credentials: "include"
      });
      if (!res.ok) throw new Error("Fallo de red");
      const data = await res.json();
      setCredsModalInfo({ nombre, correo: data.correo, password: data.password });
    } catch (err) {
      alert("No se pudieron regenerar las credenciales: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg leading-tight">Panel Administrador</span>
                <p className="text-slate-500 text-xs font-medium">Servicio Social SID</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-slate-900 text-sm font-semibold">{user?.nombre}</p>
              </div>
              <Button variant="ghost" className="text-slate-500" onClick={logout}>
                <LogOut className="w-5 h-5 mr-2" /> Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        
        {/* === MODAL: Credenciales === */}
        <Dialog open={!!credsModalInfo} onOpenChange={(open) => !open && setCredsModalInfo(null)}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl overflow-hidden p-0">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white border-b border-white/10">
              <DialogTitle className="text-xl">Credenciales de Acceso</DialogTitle>
              <DialogDescription className="text-slate-300 mt-1">Guarda estas credenciales para {credsModalInfo?.nombre}.</DialogDescription>
            </div>
            <div className="p-6 space-y-5 bg-white">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-800 text-xs font-medium">⚠️ La contraseña es generada automáticamente y <strong>no volverá a mostrarse en texto plano</strong> por seguridad una vez cerrado este modal.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Correo Vinculado</Label>
                  <div className="flex mt-1">
                    <Input readOnly value={credsModalInfo?.correo || ""} className="font-mono bg-slate-50 border-r-0 rounded-r-none" />
                    <Button onClick={() => handleCopy(credsModalInfo?.correo, 'correo')} variant="outline" className="rounded-l-none bg-slate-100 hover:bg-slate-200">
                      {copiedField === 'correo' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Contraseña de Proyecto</Label>
                  <div className="flex mt-1">
                    <Input readOnly value={credsModalInfo?.password || ""} className="font-mono bg-emerald-50 text-emerald-700 font-bold border-r-0 rounded-r-none border-emerald-200" />
                    <Button onClick={() => handleCopy(credsModalInfo?.password, 'pwd')} variant="outline" className="rounded-l-none border-emerald-200 bg-emerald-100 hover:bg-emerald-200 hover:text-emerald-800 text-emerald-700">
                      {copiedField === 'pwd' ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <Button onClick={() => setCredsModalInfo(null)} className="w-full bg-blue-600 hover:bg-blue-700">He guardado las credenciales</Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* === MODAL: Ampliar Cupo === */}
        <Dialog open={!!cupoModalInfo} onOpenChange={(open) => !open && setCupoModalInfo(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Ampliar Cupo</DialogTitle>
              <DialogDescription>Ajusta el cupo máximo de {cupoModalInfo?.nombre}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {errorText && <p className="text-sm text-red-600 font-medium">{errorText}</p>}
              <div className="space-y-2">
                <Label>Capacidad Actual Maxima</Label>
                <Input disabled value={cupoModalInfo?.max || 0} className="bg-slate-100" />
              </div>
              <div className="space-y-2">
                <Label>Nueva Capacidad</Label>
                <Input type="number" min={(cupoModalInfo?.max || 0) + 1} value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleGuardarCupo} disabled={isSubmitting} className="w-full">
              Guardar Cambios
            </Button>
          </DialogContent>
        </Dialog>


        <Tabs defaultValue="proyectos" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
            <TabsTrigger value="proyectos" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Proyectos
            </TabsTrigger>
            <TabsTrigger value="empresas" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Building2 className="w-4 h-4 mr-2" /> Empresas
            </TabsTrigger>
            <TabsTrigger value="eventos" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Calendar className="w-4 h-4 mr-2" /> Eventos
            </TabsTrigger>
          </TabsList>

          {/* === PANEL: PROYECTOS === */}
          <TabsContent value="proyectos" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Directorio de Proyectos</h3>
                <p className="text-slate-500 text-sm">Gestiona la oferta para los alumnos.</p>
              </div>
              
              <Dialog open={isCrearProyectoOpen} onOpenChange={setIsCrearProyectoOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2"/> Crear Proyecto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Proyecto</DialogTitle>
                    <DialogDescription>Asigna una empresa y evento activo.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCrearProyecto} className="space-y-4">
                    {errorText && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{errorText}</p>}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Empresa</Label>
                        <Select required onValueChange={v => setFormProyecto({...formProyecto, id_empresa: v})}>
                          <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                          <SelectContent>
                            {empresas.map(e => <SelectItem key={e.id_empresa} value={e.id_empresa.toString()}>{e.nombre_empresa}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Evento</Label>
                        <Select required onValueChange={v => setFormProyecto({...formProyecto, id_evento: v})}>
                          <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                          <SelectContent>
                            {eventos.filter(e => e.activo).map(ev => <SelectItem key={ev.id_evento} value={ev.id_evento.toString()}>{ev.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Nombre del Proyecto</Label>
                      <Input required value={formProyecto.nombre} onChange={e => setFormProyecto({...formProyecto, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label>Descripción Corta</Label>
                      <Input value={formProyecto.desc} onChange={e => setFormProyecto({...formProyecto, desc: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Cupo Máx (Lugares)</Label>
                        <Input type="number" required min="1" value={formProyecto.cap_max} onChange={e => setFormProyecto({...formProyecto, cap_max: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label>Espera Máx</Label>
                        <Input type="number" min="0" value={formProyecto.espera} onChange={e => setFormProyecto({...formProyecto, espera: e.target.value})} />
                      </div>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">Registrar Proyecto</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="border-0 shadow-md">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Proyecto y Empresa</TableHead>
                      <TableHead className="text-center">Cupo</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proyectos?.map((p) => (
                      <TableRow key={p.id_proyecto} className="hover:bg-slate-50/50 group">
                        <TableCell>
                          <p className="font-bold text-slate-900 leading-tight">{p.nombre_proyecto}</p>
                          <p className="text-xs text-slate-500">{p.empresa}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-[11px] px-2">
                            <span className="text-blue-600 font-bold">{p.cupo_actual}</span> / {p.capacidad_max}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.cupo_actual >= p.capacidad_max ? (
                            <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">Lleno</Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Disponible</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" size="sm" 
                            className="h-8 text-[11px] hover:border-blue-400"
                            onClick={() => {
                              setCupoModalInfo({ id: p.id_proyecto, nombre: p.nombre_proyecto, actual: p.cupo_actual, max: p.capacidad_max });
                              setNuevaCapacidad(p.capacidad_max + 1);
                            }}
                          >
                            + Cupo
                          </Button>
                          <Button 
                            variant="outline" size="sm" 
                            className="h-8 text-[11px] hover:border-amber-400 hover:text-amber-700"
                            onClick={() => handleRegenerarCreds(p.id_proyecto, p.nombre_proyecto)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Reset Creds
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!proyectos.length && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Sin datos registrados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === PANEL: EMPRESAS === */}
          <TabsContent value="empresas" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Directorio Empresarial</h3>
              </div>
              
              <Dialog open={isCrearEmpresaOpen} onOpenChange={setIsCrearEmpresaOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700"><Building2 className="w-4 h-4 mr-2"/> Alta de Empresa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Entidad Receptora</DialogTitle></DialogHeader>
                  <form onSubmit={handleCrearEmpresa} className="space-y-4">
                    {errorText && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{errorText}</p>}
                    <div className="space-y-1">
                      <Label>Clave de Asociado (Única)</Label>
                      <Input required value={formEmpresa.id_asociado} onChange={e => setFormEmpresa({...formEmpresa, id_asociado: e.target.value})} placeholder="Socio Formador ID..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Nombre Comercial</Label>
                      <Input required value={formEmpresa.nombre} onChange={e => setFormEmpresa({...formEmpresa, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label>Razón Social</Label>
                      <Input required value={formEmpresa.razon} onChange={e => setFormEmpresa({...formEmpresa, razon: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label>Descripción de Giro</Label>
                      <Input value={formEmpresa.desc} onChange={e => setFormEmpresa({...formEmpresa, desc: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">Registrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {empresas?.map((emp) => (
                <Card key={emp.id_empresa} className="border-0 shadow-sm">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="flex justify-between items-start text-base">
                      <span className="font-bold">{emp.nombre_empresa}</span>
                      <div className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-500 font-mono">
                        #{emp.id_asociado}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-xs text-slate-500 mb-3">{emp.descripcion || "Sin descripción corta"}</p>
                    <Badge variant="outline" className="text-[10px] text-slate-500 font-normal border-slate-200">{emp.razon_social}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* === PANEL: EVENTOS === */}
          <TabsContent value="eventos" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Gestión de Eventos</h3>
              </div>
              
              <Dialog open={isCrearEventoOpen} onOpenChange={setIsCrearEventoOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700"><Calendar className="w-4 h-4 mr-2"/> Nuevo Evento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Crear Periodo de Inscripción</DialogTitle></DialogHeader>
                  <form onSubmit={handleCrearEvento} className="space-y-4">
                    {errorText && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{errorText}</p>}
                    <div className="space-y-1">
                      <Label>Nombre Edición</Label>
                      <Input required value={formEvento.nombre} onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} placeholder="Ej. Feria de Organizaciones Verano" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Periodo</Label>
                        <Select value={formEvento.periodo} onValueChange={v => setFormEvento({...formEvento, periodo: v})}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FEBRERO-JUNIO">FEBRERO-JUNIO</SelectItem>
                            <SelectItem value="AGOSTO-DICIEMBRE">AGOSTO-DICIEMBRE</SelectItem>
                            <SelectItem value="VERANO">VERANO</SelectItem>
                            <SelectItem value="INVIERNO">INVIERNO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Año</Label>
                        <Input type="number" required value={formEvento.anio} onChange={e => setFormEvento({...formEvento, anio: e.target.value})} />
                      </div>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">Aperturar Evento</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eventos?.map((ev) => (
                <Card key={ev.id_evento} className="border-0 shadow-sm relative overflow-hidden">
                  {ev.activo && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                  <CardHeader className="p-5">
                    <CardTitle className="flex justify-between items-start text-base">
                      <span>{ev.nombre}</span>
                      <Badge className={ev.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}>
                        {ev.activo ? "Activo para registro" : "Cerrado"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {ev.periodo} {ev.anio} ({ev.semestre})
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}

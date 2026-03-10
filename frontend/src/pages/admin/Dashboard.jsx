import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, LayoutDashboard, Building2, Users, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    // In a real app we would use react-query, but fetch works for this skeleton
    const fetchData = async () => {
      try {
        const [ps, es, evs] = await Promise.all([
          fetch("http://localhost:8000/api/v1/admin/proyectos", { credentials: "include" }).then(res => res.json()),
          fetch("http://localhost:8000/api/v1/admin/empresas", { credentials: "include" }).then(res => res.json()),
          fetch("http://localhost:8000/api/v1/admin/eventos", { credentials: "include" }).then(res => res.json())
        ]);
        setProyectos(ps);
        setEmpresas(es);
        setEventos(evs);
      } catch (err) {
        console.error("Error fetching admin data", err);
      }
    };
    fetchData();
  }, []);

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
                <span className="font-bold text-slate-900 text-lg">Panel Administrador</span>
                <p className="text-slate-500 text-xs font-medium">Servicio Social SID</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-slate-900 text-sm font-semibold">{user?.nombre}</p>
                <p className="text-slate-500 text-xs">Administrador SID</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:block">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        <Tabs defaultValue="proyectos" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
            <TabsTrigger value="proyectos" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Proyectos
            </TabsTrigger>
            <TabsTrigger value="empresas" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Building2 className="w-4 h-4 mr-2" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="eventos" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Calendar className="w-4 h-4 mr-2" />
              Eventos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proyectos" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
                <CardTitle className="text-lg text-slate-800">Directorio de Proyectos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-center">Cupo</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proyectos?.map((p) => (
                      <TableRow key={p.id_proyecto} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">{p.nombre_proyecto}</TableCell>
                        <TableCell className="text-slate-600">{p.empresa}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {p.cupo_actual} / {p.capacidad_max}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.cupo_actual >= p.capacidad_max ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0">Lleno</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Disponible</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!proyectos.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          Cargando proyectos...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="empresas">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {empresas?.map((emp) => (
                <Card key={emp.id_empresa} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="text-lg">{emp.nombre_empresa}</span>
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 mb-4">{emp.descripcion || "Sin descripción corporativa"}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600">{emp.razon_social}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="eventos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eventos?.map((ev) => (
                <Card key={ev.id_evento} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="text-lg">{ev.nombre}</span>
                      <Badge className={ev.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                        {ev.activo ? "Activo" : "Cerrado"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      Semestre {ev.semestre} {ev.anio}
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

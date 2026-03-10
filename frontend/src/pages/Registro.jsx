import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Registro() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    matricula: "",
    carrera: "",
    semestre: "",
    password: "",
    password_confirm: "",
    eventos_seleccionados: [],
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/auth/eventos")
      .then(res => res.json())
      .then(data => setEventos(data))
      .catch(err => console.error("Error fetching events:", err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEventoToggle = (id_evento) => {
    setFormData(prev => {
      const selected = prev.eventos_seleccionados;
      if (selected.includes(id_evento)) {
        return { ...prev, eventos_seleccionados: selected.filter(id => id !== id_evento) };
      } else {
        if (selected.length >= 2) return prev; // Max 2 events
        return { ...prev, eventos_seleccionados: [...selected, id_evento] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password !== formData.password_confirm) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    if (formData.eventos_seleccionados.length === 0) {
      setError("Debes seleccionar al menos un evento");
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        semestre: parseInt(formData.semestre, 10),
      };

      const res = await fetch("http://localhost:8000/api/v1/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en el registro");

      // Si todo sale bien, re-dirigimos al login con mensaje de éxito (podemos pasar estado)
      navigate("/login", { state: { message: "Registro exitoso. Ya puedes iniciar sesión." } });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Encabezado fuera de la tarjeta */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Crea tu cuenta</h1>
          <p className="text-slate-500 mt-2 text-lg">Inscripción al Servicio Social y Eventos Tec</p>
        </div>

        <Card className="border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-600 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Datos del Alumno</CardTitle>
                <CardDescription className="text-blue-100 mt-1">
                  Ingresa tu información escolar oficial tal como aparece en mitec.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {error && (
              <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre" className="text-slate-700">Nombre Completo</Label>
                    <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required className="bg-slate-50" placeholder="Ej. Juan Pérez" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="matricula" className="text-slate-700">Matrícula</Label>
                    <Input id="matricula" name="matricula" value={formData.matricula} onChange={handleChange} required className="bg-slate-50" placeholder="A0..." />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="correo" className="text-slate-700">Correo Institucional</Label>
                    <Input id="correo" type="email" name="correo" value={formData.correo} onChange={handleChange} required className="bg-slate-50" placeholder="A0...@tec.mx" />
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="carrera" className="text-slate-700">Carrera (Siglas)</Label>
                    <Input id="carrera" name="carrera" value={formData.carrera} onChange={handleChange} required className="bg-slate-50 uppercase" placeholder="Ej. ITC" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="semestre" className="text-slate-700">Semestre Actual</Label>
                    <Input id="semestre" type="number" min="1" max="12" name="semestre" value={formData.semestre} onChange={handleChange} required className="bg-slate-50" placeholder="1-12" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-slate-700 text-xs">Contraseña</Label>
                      <Input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required className="bg-slate-50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password_confirm" className="text-slate-700 text-xs">Confirmar</Label>
                      <Input id="password_confirm" type="password" name="password_confirm" value={formData.password_confirm} onChange={handleChange} required className="bg-slate-50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selección de Eventos */}
              <div className="pt-6 border-t border-slate-100">
                <Label className="text-slate-900 text-base font-bold mb-3 block">Selecciona tus Eventos (Max. 2)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eventos.map(ev => {
                    const isSelected = formData.eventos_seleccionados.includes(ev.id_evento);
                    const isDisabled = !isSelected && formData.eventos_seleccionados.length >= 2;
                    return (
                      <div 
                        key={ev.id_evento}
                        onClick={() => !isDisabled && handleEventoToggle(ev.id_evento)}
                        className={`
                          p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden
                          ${isSelected ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-blue-300 bg-white"}
                          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                      >
                        {isSelected && <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>}
                        <h3 className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{ev.nombre}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Semestre {ev.semestre} {ev.anio}</p>
                      </div>
                    )
                  })}
                  {!eventos.length && <p className="text-sm text-slate-500">Cargando eventos disponibles...</p>}
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-sm text-slate-500">
                  ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Inicia sesión</Link>
                </p>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-600/25 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Completar Registro
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

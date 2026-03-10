import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function Registro() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "", correo: "", matricula: "", carrera: "", semestre: "", password: "", password_confirm: "", eventos_seleccionados: [],
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/auth/eventos")
      .then(res => res.json())
      .then(data => setEventos(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEventoToggle = (id_evento) => {
    setFormData(prev => {
      const selected = prev.eventos_seleccionados;
      if (selected.includes(id_evento)) {
        return { ...prev, eventos_seleccionados: selected.filter(id => id !== id_evento) };
      } else {
        if (selected.length >= 2) return prev;
        return { ...prev, eventos_seleccionados: [...selected, id_evento] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);

    if (formData.password !== formData.password_confirm) {
      setError("Las contraseñas no coinciden. Intenta de nuevo.");
      setIsLoading(false); return;
    }
    if (formData.eventos_seleccionados.length === 0) {
      setError("Requiere la selección de al menos un evento académico oficial.");
      setIsLoading(false); return;
    }

    try {
      const payload = { ...formData, semestre: parseInt(formData.semestre, 10) };
      const res = await fetch("http://localhost:8000/api/v1/auth/registro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en el alta del sistema.");
      navigate("/login", { state: { message: "Alta en el sistema exitosa. Autentícate." } });
    } catch (err) { setError(err.message); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#001D4A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Dynamics */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[130px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[0%] -left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-3xl relative z-10 py-10">
        
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="mx-auto w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight">Alta en el Sistema</h1>
          <p className="text-blue-200/50 mt-3 text-lg font-medium tracking-wide">Plataforma Oficial de Servicio Social y Extensión</p>
        </div>

        <Card className="border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-white/[0.02] backdrop-blur-2xl overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-black/20 p-8 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                <UserPlus className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white tracking-tight">Expediente Alumno</CardTitle>
                <CardDescription className="text-blue-200/50 mt-1">
                  Tu información debe coincidir exactamente con tus registros de MiTec.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <div className="w-1.5 h-full absolute left-0 top-0 bottom-0 bg-red-500 rounded-l-xl"></div>
                <p className="text-red-300 text-sm font-bold pl-2">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Izquierda */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Nombre Completo</Label>
                    <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-blue-500" placeholder="Ej. Juan Pérez" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="matricula" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Matrícula Institucional</Label>
                    <Input id="matricula" name="matricula" value={formData.matricula} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-blue-500" placeholder="A0..." />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="correo" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Correo Electrónico Oficial</Label>
                    <Input id="correo" type="email" name="correo" value={formData.correo} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-blue-500" placeholder="A0...@tec.mx" />
                  </div>
                </div>

                {/* Derecha */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="carrera" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Carrera (Siglas)</Label>
                    <Input id="carrera" name="carrera" value={formData.carrera} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-blue-500 uppercase" placeholder="Ej. ITC" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="semestre" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Semestre Actual (Numérico)</Label>
                    <Input id="semestre" type="number" min="1" max="15" name="semestre" value={formData.semestre} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-blue-500" placeholder="1-12" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Llave Segura</Label>
                      <Input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required className="bg-black/40 border-white/10 text-white focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password_confirm" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Verificar Llave</Label>
                      <Input id="password_confirm" type="password" name="password_confirm" value={formData.password_confirm} onChange={handleChange} required className="bg-black/40 border-white/10 text-white focus-visible:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Eventos */}
              <div className="pt-8 border-t border-white/5">
                <Label className="text-white text-lg font-bold mb-4 block">Autorización de Eventos (Máximo 2)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {eventos.map(ev => {
                    const isSelected = formData.eventos_seleccionados.includes(ev.id_evento);
                    const isDisabled = !isSelected && formData.eventos_seleccionados.length >= 2;
                    return (
                      <motion.div 
                        whileHover={!isDisabled ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        key={ev.id_evento}
                        onClick={() => !isDisabled && handleEventoToggle(ev.id_evento)}
                        className={`
                          p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden backdrop-blur-md
                          ${isSelected ? "border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-white/10 hover:border-white/30 bg-white/5"}
                          ${isDisabled ? "opacity-40 cursor-not-allowed grayscale" : ""}
                        `}
                      >
                        {isSelected && <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></div>}
                        <h3 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-blue-100/80'}`}>{ev.nombre}</h3>
                        <p className={`text-xs mt-1 flex items-center gap-1 font-mono uppercase tracking-widest ${isSelected ? 'text-blue-300' : 'text-white/40'}`}>
                          Semestre {ev.semestre} {ev.anio}
                        </p>
                      </motion.div>
                    )
                  })}
                  {!eventos.length && <div className="col-span-full p-8 text-center text-white/30 font-medium border border-white/5 border-dashed rounded-2xl">Buscando eventos vigentes en el servidor...</div>}
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-6 items-center justify-between">
                <p className="text-sm text-blue-200/50">
                  ¿Ya estás afiliado? <br className="sm:hidden" />
                  <Link to="/login" className="text-blue-400 font-bold hover:text-blue-300 underline-offset-4 hover:underline transition-colors ml-1">Regresa al portal de acceso</Link>
                </p>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full sm:w-auto h-14 px-10 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-xl font-bold transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] flex items-center gap-2 hover:scale-[1.02]"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin border-0" /> : (
                    <>
                      Procesar Alta Oficial
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

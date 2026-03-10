import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import tecLogo from "@/assets/logo_tec.png";
import campus1 from "@/assets/campus_1.png";
import campus2 from "@/assets/campus_2.png";
import campus3 from "@/assets/campus_3.png";

const images = [campus1, campus2, campus3];

export default function Registro() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [formData, setFormData] = useState({
    nombre: "", correo: "", matricula: "", carrera: "", semestre: "", password: "", password_confirm: "", eventos_seleccionados: [],
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/auth/eventos")
      .then(res => res.json())
      .then(data => setEventos(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
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
      setError("Las contraseñas no coinciden."); setIsLoading(false); return;
    }
    if (formData.eventos_seleccionados.length === 0) {
      setError("Selecciona al menos un evento."); setIsLoading(false); return;
    }

    try {
      const payload = { ...formData, semestre: parseInt(formData.semestre, 10) };
      const res = await fetch("http://localhost:8000/api/v1/auth/registro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en el registro.");
      navigate("/login", { state: { message: "Registro exitoso. Inicia sesión." } });
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-tec-deep flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] rounded-full bg-tec-primary/10 blur-[130px]" />
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[0%] -left-[20%] w-[60%] h-[60%] rounded-full bg-tec-denim/8 blur-[100px]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[1050px] bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden flex min-h-[640px]"
      >
        {/* Left Panel - Image Carousel */}
        <div className="hidden lg:block w-[40%] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImage}
              src={images[currentImage]}
              alt="Tec de Monterrey"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-tec-deep/40" />
          <div className="absolute inset-0 bg-tec-deep/20" />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrentImage(i)}
                className={`h-2 rounded-full transition-all duration-500 ${i === currentImage ? "w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "w-2 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 px-8 sm:px-10 py-10 overflow-y-auto max-h-[90vh]">
          {/* Logo + Heading */}
          <div className="mb-6">
            <motion.img initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              src={tecLogo} alt="Tec de Monterrey" className="h-20 w-auto mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            />
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Alta de <span className="bg-clip-text text-transparent bg-gradient-to-r from-tec-light to-blue-300">Alumno</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-white/40 border-b-2 border-transparent hover:text-white/70 hover:border-white/20 transition-colors">
              Ingresar
            </Link>
            <Link to="/registro" className="px-5 py-2 text-sm font-bold text-white border-b-2 border-tec-light transition-colors">
              Registro
            </Link>
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 relative overflow-hidden">
                <div className="w-1 h-full absolute left-0 top-0 bottom-0 bg-red-500 rounded-l-xl" />
                <p className="text-red-300 text-sm font-semibold pl-2">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Nombre Completo</Label>
                <Input name="nombre" value={formData.nombre} onChange={handleChange} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" placeholder="Juan Pérez" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Matrícula</Label>
                <Input name="matricula" value={formData.matricula} onChange={handleChange} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" placeholder="A0..." />
              </div>
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Correo Institucional</Label>
              <Input type="email" name="correo" value={formData.correo} onChange={handleChange} required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" placeholder="A0...@tec.mx" />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Carrera (Siglas)</Label>
                <Input name="carrera" value={formData.carrera} onChange={handleChange} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 uppercase hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" placeholder="ITC" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Semestre</Label>
                <Input type="number" min="1" max="15" name="semestre" value={formData.semestre} onChange={handleChange} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" placeholder="1-12" />
              </div>
            </div>

            {/* Row 4 - Passwords */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Contraseña</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required
                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 pr-10 hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Confirmar</Label>
                <Input type={showPassword ? "text" : "password"} name="password_confirm" value={formData.password_confirm} onChange={handleChange} required
                  className="bg-white/5 border-white/10 text-white rounded-xl h-11 hover:bg-white/[0.07] focus-visible:ring-tec-primary/60" />
              </div>
            </div>

            {/* Eventos */}
            <div className="pt-3 border-t border-white/5">
              <Label className="text-white text-sm font-bold mb-3 block">Eventos Disponibles <span className="text-white/40 font-normal">(máx. 2)</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eventos.map(ev => {
                  const isSelected = formData.eventos_seleccionados.includes(ev.id_evento);
                  const isDisabled = !isSelected && formData.eventos_seleccionados.length >= 2;
                  return (
                    <motion.div
                      whileHover={!isDisabled ? { scale: 1.02 } : {}}
                      whileTap={!isDisabled ? { scale: 0.98 } : {}}
                      key={ev.id_evento}
                      onClick={() => !isDisabled && handleEventoToggle(ev.id_evento)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all backdrop-blur-sm relative overflow-hidden
                        ${isSelected ? "border-tec-primary bg-tec-primary/15 shadow-[0_0_15px_rgba(0,57,166,0.3)]" : "border-white/10 hover:border-white/25 bg-white/[0.03]"}
                        ${isDisabled ? "opacity-35 cursor-not-allowed grayscale" : ""}
                      `}
                    >
                      {isSelected && <div className="absolute top-0 right-0 w-1.5 h-full bg-tec-primary" />}
                      <h3 className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-blue-100/70'}`}>{ev.nombre}</h3>
                      <p className={`text-[10px] mt-1 font-mono uppercase tracking-widest ${isSelected ? 'text-blue-300' : 'text-white/35'}`}>
                        Semestre {ev.semestre} {ev.anio}
                      </p>
                    </motion.div>
                  );
                })}
                {!eventos.length && <div className="col-span-full py-6 text-center text-white/25 text-sm border border-dashed border-white/10 rounded-2xl">Buscando eventos vigentes...</div>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
              <Button type="submit" disabled={isLoading}
                className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-tec-primary to-tec-denim hover:from-tec-denim hover:to-tec-primary text-white rounded-xl font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,57,166,0.5)] flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Completar Registro <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

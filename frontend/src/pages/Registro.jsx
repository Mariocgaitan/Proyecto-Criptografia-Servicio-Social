import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Eye, EyeOff, User, Mail, Lock, Hash, GraduationCap, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import tecLogo from "@/assets/tec_logo.png";
import serSocialLogo from "@/assets/ser_social.png";
import campusImg1 from "@/assets/login_images/ser_social_header.png";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/importancia-servicio-social-tec-monterrey.jpg.webp";
import campusImg4 from "@/assets/login_images/profesorado-promotores-formacion-programa-servicio-social-tec-monterrey.jpg";

function SocialIcon({ children, href = "#" }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all duration-200">
      {children}
    </a>
  );
}

const campusImages = [campusImg1, campusImg2, campusImg3, campusImg4];

const bounceIn = (delay = 0) => ({
  initial: { y: -80, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { type: "spring", stiffness: 120, damping: 14, delay },
});

const bounceUp = (delay = 0) => ({
  initial: { y: 80, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { type: "spring", stiffness: 120, damping: 14, delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.8, ease: "easeOut", delay },
});

export default function Registro() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
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
      setCurrentBgIndex(prev => (prev + 1) % campusImages.length);
    }, 20000);
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
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
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
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <motion.nav
        {...bounceIn(0)}
        className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4 bg-black/30 backdrop-blur-md border-b border-white/5"
      >
        <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-10 sm:h-12 w-auto brightness-0 invert drop-shadow-md" />
        <div className="hidden sm:flex items-center gap-3">
          <SocialIcon href="https://www.facebook.com/TecCCM">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z"/></svg>
          </SocialIcon>
          <SocialIcon href="https://www.instagram.com/serviciosocial.ccm/">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </SocialIcon>
          <SocialIcon href="https://www.youtube.com/watch?v=Z2SOyRZ0qUI">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
          </SocialIcon>
        </div>
      </motion.nav>

      <div className="flex-1 flex items-start justify-center relative z-10 px-4 py-8 overflow-y-auto">
        <motion.div {...fadeIn(0.3)} className="w-full max-w-[560px] flex flex-col items-center">
          <motion.div {...fadeIn(0.4)} className="mb-6 px-4 py-3 rounded-2xl bg-black/45 backdrop-blur-md border border-white/25 shadow-2xl flex flex-col items-center">
            <div className="px-4 py-2 rounded-xl bg-white/95 ring-1 ring-white/70 shadow-xl">
              <img src={serSocialLogo} alt="Ser Social" className="h-16 sm:h-20 w-auto" />
            </div>
            <p className="mt-2 text-white/95 text-[10px] font-semibold tracking-[0.15em] uppercase text-center">
              Feria de Servicio Social
            </p>
          </motion.div>

          <motion.div {...fadeIn(0.5)} className="w-full bg-black/45 backdrop-blur-md border border-white/25 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex gap-1 border-b border-white/10 mb-2">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-white/45 border-b-2 border-transparent hover:text-white/70 transition-colors -mb-px">
                Ingresar
              </Link>
              <Link to="/registro" className="px-4 py-2 text-sm font-bold text-white border-b-2 border-white/70 transition-colors -mb-px">
                Registro
              </Link>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-3 overflow-hidden"
                >
                  <p className="text-red-200 text-sm font-semibold text-center">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                    <User className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input name="nombre" value={formData.nombre} onChange={handleChange} required
                    placeholder="Nombre completo"
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                    <Hash className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input name="matricula" value={formData.matricula} onChange={handleChange} required
                    placeholder="Matrícula (A0...)"
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-700/90" />
                </div>
                <Input type="email" name="correo" value={formData.correo} onChange={handleChange} required
                  placeholder="Correo institucional (A0...@tec.mx)"
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                    <GraduationCap className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input name="carrera" value={formData.carrera} onChange={handleChange} required
                    placeholder="Carrera (ITC...)"
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 uppercase focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                    <BookOpen className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input type="number" min="1" max="15" name="semestre" value={formData.semestre} onChange={handleChange} required
                    placeholder="Semestre"
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required
                    placeholder="Contraseña"
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 pr-10 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700/80 hover:text-slate-900 transition-colors z-10">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10 pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input type={showPassword ? "text" : "password"} name="password_confirm" value={formData.password_confirm} onChange={handleChange} required
                    placeholder="Confirmar"
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100" />
                </div>
              </div>

              <div className="pt-2 border-t border-white/15">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3">
                  Eventos disponibles <span className="text-white/40 font-normal normal-case">(max. 2)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eventos.map(ev => {
                    const isSelected = formData.eventos_seleccionados.includes(ev.id_evento);
                    const isDisabled = !isSelected && formData.eventos_seleccionados.length >= 2;
                    return (
                      <motion.div
                        whileHover={!isDisabled ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        key={ev.id_evento}
                        onClick={() => !isDisabled && handleEventoToggle(ev.id_evento)}
                        className={[
                          "p-3 rounded-xl border cursor-pointer transition-all backdrop-blur-sm relative overflow-hidden select-none",
                          isSelected ? "border-white/50 bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]" : "border-white/20 hover:border-white/35 bg-white/5",
                          isDisabled ? "opacity-35 cursor-not-allowed grayscale" : "",
                        ].join(" ")}
                      >
                        <h3 className="font-bold text-sm text-white leading-tight">{ev.nombre}</h3>
                        <p className="text-[10px] mt-0.5 font-mono uppercase tracking-widest text-white/50">
                          Semestre {ev.semestre} · {ev.anio}
                        </p>
                      </motion.div>
                    );
                  })}
                  {!eventos.length && (
                    <div className="col-span-full py-4 text-center text-white/30 text-xs border border-dashed border-white/15 rounded-xl">
                      Buscando eventos vigentes...
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={isLoading}
                className="w-full h-12 bg-white/20 hover:bg-white/30 border border-white/35 text-white font-bold text-base rounded-lg backdrop-blur-md shadow-lg shadow-black/25 transition-all duration-200 hover:shadow-black/35 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><ArrowRight className="w-4 h-4" /> Completar Registro</>
                }
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </div>

      <motion.footer
        {...bounceUp(0.2)}
        className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4 bg-black/30 backdrop-blur-md border-t border-white/5"
      >
        <div className="flex items-center gap-6">
          <a href="https://tec.mx/es/avisos-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
            Aviso de Privacidad
          </a>
          <a href="https://letica.mx/ethos?locale=es" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
            Ethos
          </a>
        </div>
        <p className="text-white/40 text-[11px] font-medium">
          © {new Date().getFullYear()} {" "}
          <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
            Tecnologico de Monterrey.
          </a>
        </p>
      </motion.footer>
    </div>
  );
}

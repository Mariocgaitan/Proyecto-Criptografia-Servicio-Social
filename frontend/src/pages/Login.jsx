import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import tecLogo from "@/assets/logo_tec.png";
import campus1 from "@/assets/campus_1.png";
import campus2 from "@/assets/campus_2.png";
import campus3 from "@/assets/campus_3.png";

const images = [campus1, campus2, campus3];

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (user) {
    if (user.rol === "admin") navigate("/admin/dashboard", { replace: true });
    if (user.rol === "empresa") navigate("/empresa/escaner", { replace: true });
    if (user.rol === "alumno") navigate("/dashboard", { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const result = await login(correo, password);
    if (!result.success) setError(result.error);
    setIsLoading(false);
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
        className="relative z-10 w-full max-w-[920px] bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden flex min-h-[560px]"
      >
        {/* Left Panel - Image Carousel */}
        <div className="hidden md:block w-[45%] relative overflow-hidden">
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

          {/* Image Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`h-2 rounded-full transition-all duration-500 ${i === currentImage ? "w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "w-2 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-12">
          {/* Logo + Heading */}
          <div className="mb-10">
            <motion.img
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              src={tecLogo}
              alt="Tec de Monterrey"
              className="h-24 w-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            />
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Feria de<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-tec-light to-blue-300">Servicio Social</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8">
            <Link to="/login" className="px-5 py-2 text-sm font-bold text-white border-b-2 border-tec-light transition-colors">
              Ingresar
            </Link>
            <Link to="/registro" className="px-5 py-2 text-sm font-medium text-white/40 border-b-2 border-transparent hover:text-white/70 hover:border-white/20 transition-colors">
              Registro
            </Link>
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 relative overflow-hidden">
                <div className="w-1 h-full absolute left-0 top-0 bottom-0 bg-red-500 rounded-l-xl" />
                <p className="text-red-300 text-sm font-semibold pl-2">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="correo" className="text-white/50 text-xs font-semibold uppercase tracking-widest">Correo Institucional</Label>
              <Input
                id="correo" type="email" value={correo}
                onChange={(e) => setCorreo(e.target.value)} required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 focus-visible:ring-tec-primary/60 transition-colors hover:bg-white/[0.07]"
                placeholder="ejemplo@tec.mx"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/50 text-xs font-semibold uppercase tracking-widest">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 pr-12 focus-visible:ring-tec-primary/60 transition-colors hover:bg-white/[0.07]"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit" disabled={isLoading}
              className="w-full h-13 bg-gradient-to-r from-tec-primary to-tec-denim hover:from-tec-denim hover:to-tec-primary rounded-xl font-bold text-base text-white transition-all transform hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,57,166,0.5)] mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
            </Button>

          </form>
        </div>
      </motion.div>
    </div>
  );
}

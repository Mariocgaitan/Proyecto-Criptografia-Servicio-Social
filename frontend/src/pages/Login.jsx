import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import tecLogo from "@/assets/tec_logo.png";
import serSocialLogo from "@/assets/ser_social_negro.jpg";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/ser_social_monterrey.jpg";
import campusImg4 from "@/assets/login_images/ser_social3.jpg";
import campusImg1 from "@/assets/login_images/ser_social_header.png";

// ─── Social icon button ─────────────────────────────────────────
function SocialIcon({ children, href = "#" }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all duration-200">
      {children}
    </a>
  );
}

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const shakeControls = useAnimationControls();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const campusImages = [campusImg1, campusImg2, campusImg3, campusImg4];

  const normalizeLoginIdentifier = (value) => {
    const trimmed = value.trim();
    if (/^[aA]0\d{7}$/.test(trimmed)) {
      return `${trimmed.toLowerCase()}@tec.mx`;
    }
    return trimmed;
  };

  const triggerErrorAnimation = () => {
    shakeControls.start({
      x: [0, -6, 6, -4, 4, 0],
      transition: { duration: 0.28, ease: "easeInOut" },
    });
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % campusImages.length);
    }, 20000);

    return () => clearInterval(intervalId);
  }, [campusImages.length]);

  if (user) {
    if (user.rol === "admin") navigate("/admin/dashboard", { replace: true });
    if (user.rol === "empresa") navigate("/empresa/escaner", { replace: true });
    if (user.rol === "alumno") navigate("/dashboard", { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const normalizedEmail = normalizeLoginIdentifier(correo);
    
    // Validar que el correo no esté vacío
    if (!normalizedEmail.trim()) {
      setError("Ingresa tu correo o matrícula.");
      triggerErrorAnimation();
      return;
    }

    // Validar que la contraseña no esté vacía
    if (!password.trim()) {
      setError("Se requiere contraseña.");
      triggerErrorAnimation();
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail) {
      setError("Ingresa un correo válido o una matrícula con formato A0 + 7 dígitos.");
      triggerErrorAnimation();
      return;
    }

    if (normalizedEmail !== correo) {
      setCorreo(normalizedEmail);
    }

    setIsLoading(true);
    setError(null);
    const result = await login(normalizedEmail, password);
    if (!result.success) {
      // Manejar error como string para evitar "[object Object]"
      const errorMessage = typeof result.error === "string" 
        ? result.error 
        : result.error?.detail || result.error?.message || "Error al iniciar sesión.";
      setError(errorMessage);
      triggerErrorAnimation();
    }
    setIsLoading(false);
  };

  // Spring bounce config
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

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden select-none cursor-default">
      {/* ─── Full-screen Background Image ─── */}
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
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* ─── Top Navigation Bar (bounces from top) ─── */}
      <motion.nav
        {...bounceIn(0)}
        className="relative z-20 flex items-center justify-between px-4 sm:px-10 py-4 bg-black/30 backdrop-blur-md border-b border-white/5"
      >
        <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-10 sm:h-12 w-auto brightness-0 invert drop-shadow-md" />
        <div className="flex items-center gap-2 sm:gap-3">
          <SocialIcon href="https://www.facebook.com/TecCCM">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z"/></svg>
          </SocialIcon>
          <SocialIcon href="https://www.instagram.com/serviciosocial.ccm/">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </SocialIcon>
          <SocialIcon href="https://www.youtube.com/watch?v=Z2SOyRZ0qUI">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
          </SocialIcon>
          <SocialIcon href="https://x.com/TecdeMonterrey">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 fill-current"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
          </SocialIcon>
        </div>
      </motion.nav>

      {/* ─── Center Content (login form) ─── */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <motion.div
          {...fadeIn(0.3)}
          className="w-full max-w-[400px] flex flex-col items-center"
        >
          {/* Brand logo */}
          <motion.div
            {...fadeIn(0.4)}
            className="mb-8 px-5 py-4 rounded-2xl bg-black/45 backdrop-blur-md border border-white/25 shadow-2xl flex flex-col items-center"
          >
            <div className="px-5 py-3 rounded-xl bg-white/95 ring-1 ring-white/70 shadow-xl">
              <img src={serSocialLogo} alt="Ser Social" className="h-24 sm:h-28 w-auto" />
            </div>
            <p className="mt-3 text-white/95 text-[11px] sm:text-xs font-normal tracking-[0.15em] uppercase text-center">
              Feria de Servicio Social
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.div className="w-full space-y-4" animate={shakeControls}>
            {/* Error */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-3 overflow-hidden"
                >
                  <p className="text-red-200 text-sm font-normal text-center">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate className="space-y-3 flex flex-col items-center">
              {/* Login input */}
              <motion.div {...fadeIn(0.5)}>
                <div className="relative w-full max-w-md mx-auto">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10">
                    <Mail className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input
                    id="correo"
                    type="text"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    onBlur={() => setCorreo((prev) => normalizeLoginIdentifier(prev))}
                    required
                    className="w-full bg-white/18 border border-white/35 text-slate-900 rounded-full h-12 pl-11 pr-4 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100"
                    placeholder="Correo o matrícula (A01234567)"
                  />
                </div>
              </motion.div>

              {/* Password input */}
              <motion.div {...fadeIn(0.6)}>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center z-10">
                    <Lock className="w-4 h-4 text-slate-700/90" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/18 border border-white/35 text-slate-900 rounded-lg h-12 pl-11 pr-12 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:border-white/60 text-sm font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90 [&::placeholder]:opacity-100"
                    placeholder="Contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700/80 hover:text-slate-900 transition-colors z-10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Submit button */}
              <motion.div {...fadeIn(0.7)}>
                <div className="w-full max-w-md mx-auto">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-white/20 hover:bg-white/30 border border-white/35 text-white font-normal text-base rounded-full backdrop-blur-md shadow-lg shadow-black/25 transition-all duration-200 hover:shadow-black/35 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isLoading ? "Ingresando..." : "Ingresar"}
                  </Button>
                </div>
              </motion.div>
            </form>

            {/* Help links */}
            <motion.div {...fadeIn(0.8)} className="text-center pt-2">
              <p className="text-white/60 text-xs font-normal uppercase tracking-wider transition-colors">
                <Link to="/registro" className="text-blue-300 hover:text-blue-200">Regístrate</Link>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Bottom Footer Bar (bounces from bottom) ─── */}
      <motion.footer
        {...bounceUp(0.2)}
        className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-10 py-4 bg-black/30 backdrop-blur-md border-t border-white/5"
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
          © {new Date().getFullYear()} <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Tecnológico de Monterrey.</a>
        </p>
      </motion.footer>
    </div>
  );
}

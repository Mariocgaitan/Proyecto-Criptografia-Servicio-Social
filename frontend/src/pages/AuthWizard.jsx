import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, User, Hash, GraduationCap, BookOpen, ChevronDown } from "lucide-react";
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

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0
  })
};

export default function AuthWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    totpCode: "",
    nombre: "",
    matricula: "",
    carrera: "",
    semestre: ""
  });

  const handleGoogleSuccess = async (tokenResponse) => {
    setIsLoading(true);
    try {
      console.log("Google Auth Token:", tokenResponse.access_token);
      setTimeout(() => {
        setIsLoading(false);
        setStep(3); // Después de Google, validamos TOTP (Mock)
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Error al procesar Google Login.");
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError("La autenticación con Google ha fallado.")
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % campusImages.length);
    }, 20000);
    return () => clearInterval(intervalId);
  }, []);

  const nextStep = () => {
    setDirection(1);
    setError(null);
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!authData.email.trim()) {
      setError("Por favor, ingresa tu correo.");
      return;
    }
    // TODO: Verify email format
    nextStep();
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!authData.password.trim()) {
      setError("Ingresa tu contraseña.");
      return;
    }
    // Simulate auth check
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      nextStep();
    }, 700);
  };

  const handleStep3Submit = (e) => {
    e.preventDefault();
    if (authData.totpCode.length < 6) {
      setError("El código debe ser de 6 dígitos.");
      return;
    }
    // Simulate TOTP check
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Simulate checking if user needs profile completion
      const isNewUser = false; // Mock
      if (isNewUser) {
        nextStep(); // Go to step 4
      } else {
        alert("Login completado! Redirigiendo a dashboard...");
        // navigate("/dashboard");
      }
    }, 800);
  };

  const handleStep4Submit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert("Registro completado! Redirigiendo a dashboard...");
      // navigate("/dashboard");
    }, 800);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleStep1Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
                {isLogin ? "Inicia sesión" : "Crea tu cuenta"}
              </h2>
              <p className="text-white/60 text-base">Ingresa tu correo institucional para continuar.</p>
            </div>
            
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center z-10">
                <Mail className="w-5 h-5 text-slate-700/90" />
              </div>
              <Input
                type="email"
                placeholder="A01234567@tec.mx"
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-14 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full h-14 bg-white/20 hover:bg-white/30 border border-white/35 text-white font-bold text-lg rounded-xl backdrop-blur-md shadow-lg shadow-black/25 transition-all">
              Continuar
            </Button>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/20"></div>
              <span className="flex-shrink-0 mx-4 text-white/50 text-sm font-medium uppercase">o</span>
              <div className="flex-grow border-t border-white/20"></div>
            </div>

            <Button type="button" onClick={() => loginWithGoogle()} className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-bold text-base rounded-full shadow-lg transition-all flex items-center justify-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </Button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleStep2Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Ingresa tu contraseña</h2>
              <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full border border-white/10 mt-1">
                <span className="text-white/80 text-sm font-mono">{authData.email}</span>
                <button type="button" onClick={prevStep} className="text-blue-300 hover:text-blue-200 text-sm font-bold uppercase tracking-wider">
                  Editar
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center z-10">
                <Lock className="w-5 h-5 text-slate-700/90" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-14 pr-14 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                autoFocus
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700/80 hover:text-slate-900 z-10">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-bold text-lg rounded-full shadow-lg transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Iniciar Sesión"}
            </Button>
            
            <div className="text-center pt-2">
              <button type="button" className="text-white/60 text-sm hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        );

      case 3:
        return (
          <form onSubmit={handleStep3Submit} className="space-y-6 w-full">
            <div className="text-center mb-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 text-blue-300 rounded-full flex items-center justify-center border border-blue-500/30 mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Verificación en dos pasos</h2>
              <p className="text-white/70 text-base leading-relaxed max-w-[300px] mx-auto">
                Ingresa el código de 6 dígitos generado por tu aplicación Authenticator.
              </p>
            </div>

            <div className="relative flex justify-center py-2">
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={authData.totpCode}
                onChange={(e) => setAuthData({...authData, totpCode: e.target.value.replace(/\D/g, '')})}
                className="bg-white/10 border border-white/30 text-white text-center text-4xl tracking-[0.5em] rounded-2xl h-20 w-[240px] focus-visible:ring-2 focus-visible:ring-blue-400 placeholder:tracking-normal placeholder:text-white/20"
                autoFocus
              />
            </div>

            <Button type="submit" disabled={isLoading || authData.totpCode.length < 6} className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-full shadow-lg shadow-blue-500/25 transition-all">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verificar Código"}
            </Button>

            <div className="text-center pt-3">
              <button type="button" onClick={prevStep} className="text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center mx-auto gap-2">
                <ArrowLeft className="w-4 h-4" /> Regresar
              </button>
            </div>
          </form>
        );

      case 4:
        return (
          <form onSubmit={handleStep4Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Completa tu perfil</h2>
              <p className="text-white/60 text-base">Necesitamos unos datos extra para finalizar tu registro.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <User className="w-5 h-5 text-slate-700/90" />
                </div>
                <Input placeholder="Nombre completo" value={authData.nombre} onChange={(e) => setAuthData({...authData, nombre: e.target.value})}
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                />
              </div>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <Hash className="w-5 h-5 text-slate-700/90" />
                </div>
                <Input placeholder="Matrícula" value={authData.matricula} onChange={(e) => setAuthData({...authData, matricula: e.target.value})}
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <GraduationCap className="w-5 h-5 text-slate-700/90" />
                </div>
                <select value={authData.carrera} onChange={(e) => setAuthData({...authData, carrera: e.target.value})}
                  className="w-full appearance-none bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus:ring-2 focus:ring-white/45 text-base font-medium backdrop-blur-md"
                >
                  <option value="" className="text-slate-700">Carrera...</option>
                  <option value="ITC" className="text-slate-900">ITC</option>
                  <option value="ISD" className="text-slate-900">ISD</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700/90 z-10 pointer-events-none" />
              </div>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <BookOpen className="w-5 h-5 text-slate-700/90" />
                </div>
                <Input type="number" placeholder="Semestre" value={authData.semestre} onChange={(e) => setAuthData({...authData, semestre: e.target.value})}
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-bold text-lg rounded-full shadow-lg transition-all mt-4 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Finalizar Registro"}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Background Image Carousel */}
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
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/80 backdrop-blur-[2px]" />
      </div>

      {/* Top Nav */}
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-10 py-4 bg-black/20 backdrop-blur-md border-b border-white/5">
        <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-10 sm:h-12 w-auto brightness-0 invert drop-shadow-md" />
        <div className="flex items-center gap-2 sm:gap-3">
          <SocialIcon href="#"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z"/></svg></SocialIcon>
          <SocialIcon href="#"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204... "/></svg></SocialIcon>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-8">
        
        {/* Form area: Integrated style, no bounding box backdrop */}
        <div className="w-full max-w-[560px] p-4 sm:p-2 relative z-10 my-auto flex flex-col justify-center">
          
          <div className="flex justify-center mb-12 w-full">
            <div className="px-8 py-5 rounded-[2rem] bg-white/95 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <img src={serSocialLogo} alt="Ser Social" className="h-24 sm:h-28 w-auto drop-shadow-md" />
            </div>
          </div>

          {!isLogin && step > 1 && (
            <div className="w-full bg-white/10 h-2 rounded-full mb-10 overflow-hidden shadow-inner flex">
              <motion.div 
                className="bg-blue-500 h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" 
                initial={{ width: 0 }}
                animate={{ width: `${((step - 1) / 3) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          )}

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3"
              >
                <p className="text-red-200 text-sm font-semibold text-center">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated Form Steps */}
          <div className="relative min-h-[220px]">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                className="absolute inset-0 flex"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
          
        </div>

        {/* Global Links Footer */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
            {isLogin ? (
              <Link to="/registro" className="text-white/60 hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
                ¿No tienes cuenta? Regístrate
              </Link>
            ) : (
              <Link to="/login" className="text-white/60 hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
                ¿Ya tienes cuenta? Iniciar sesión
              </Link>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-10 py-4 bg-black/30 backdrop-blur-md border-t border-white/5">
        <p className="text-white/40 text-[11px] font-medium text-center mx-auto">
          © {new Date().getFullYear()} <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Tecnológico de Monterrey.</a>
        </p>
      </footer>
    </div>
  );
}

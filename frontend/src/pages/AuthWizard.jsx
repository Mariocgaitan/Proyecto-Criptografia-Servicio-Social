import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, User, Hash, GraduationCap, BookOpen, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProgressIndicator from "@/components/ui/progress-indicator";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/api";
import { Component as Enable2FACard } from "@/components/ui/enable-2fa-card";

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
  const { login, fetchUser } = useAuth();
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
    semestre: "",
    tempToken: "",
    totpQrCode: null
  });

  const normalizeLoginIdentifier = (value) => {
    const trimmed = value.trim();
    if (/^[aA]0\d{7}$/.test(trimmed)) {
      return `${trimmed.toLowerCase()}@tec.mx`;
    }
    return trimmed.toLowerCase();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError(null);
    try {
      // Usar la ruta relativa para aprovechar el proxy configurado en vite.config.js
      // Esto previene los bloqueos CORS del navegador y problemas con COOP
      const response = await fetch(apiUrl("/api/v1/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al autenticar con Google");
      }

      if (data.status === "requires_2fa") {
        setAuthData(prev => ({
          ...prev,
          tempToken: data.temp_token,
          totpQrCode: data.totp_qr_code || null
        }));
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "La autenticación con Google ha fallado.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % campusImages.length);
    }, 20000);
    return () => clearInterval(intervalId);
  }, []);

  const nextStep = () => {
    setDirection(1);
    setError(null);
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setDirection(-1);
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    const normalizedIdentifier = normalizeLoginIdentifier(authData.email);
    if (!normalizedIdentifier) {
      setError("Por favor, ingresa tu correo o matrícula.");
      return;
    }
    setAuthData((prev) => ({ ...prev, email: normalizedIdentifier }));
    nextStep();
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!authData.password.trim()) {
      setError("Ingresa tu contraseña.");
      return;
    }

    const doLogin = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const normalizedEmail = normalizeLoginIdentifier(authData.email);
        const result = await login(normalizedEmail, authData.password);
        if (!result.success) {
          throw new Error(result.error || "No se pudo iniciar sesión.");
        }

        const usuario = result.user || await fetchUser();
        const targetByRole = {
          admin: "/admin/dashboard",
          empresa: "/empresa/escaner",
          alumno: "/dashboard",
        };
        navigate(targetByRole[usuario?.rol] || "/dashboard", { replace: true });
      } catch (err) {
        console.error(err);
        setError(err.message || "No se pudo iniciar sesión.");
      } finally {
        setIsLoading(false);
      }
    };

    void doLogin();
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (authData.totpCode.length < 6) {
      setError("El código debe ser de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Usar ruta relativa
      const response = await fetch(apiUrl("/api/v1/auth/verify-totp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_token: authData.tempToken,
          totp_code: authData.totpCode
        }),
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Código TOTP inválido.");
      }

      const usuario = await fetchUser();
      const targetByRole = {
        admin: "/admin/dashboard",
        empresa: "/empresa/escaner",
        alumno: "/dashboard",
      };
      navigate(data.redirect_url || targetByRole[usuario?.rol] || "/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al verificar código TOTP.");
    } finally {
      setIsLoading(false);
    }
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
          <form id="auth-wizard-form" onSubmit={handleStep1Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
                {isLogin ? "Inicia sesión" : "Crea tu cuenta"}
              </h2>
              <p className="text-white/60 text-base">Ingresa tu correo o matrícula para continuar.</p>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center z-10">
                <Mail className="w-5 h-5 text-slate-700/90" />
              </div>
              <Input
                type="text"
                placeholder="Correo o matrícula (A01234567)"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                onBlur={() => setAuthData((prev) => ({ ...prev, email: normalizeLoginIdentifier(prev.email) }))}
                className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-14 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md [&::placeholder]:text-slate-700/90"
                autoFocus
              />
            </div>

          </form>
        );

      case 2:
        return (
          <form id="auth-wizard-form" onSubmit={handleStep2Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Ingresa tu contraseña</h2>
              <div className="inline-flex items-center bg-black/20 px-4 py-2 rounded-full border border-white/10 mt-1">
                <span className="text-white/80 text-sm font-mono">{authData.email}</span>
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
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-14 pr-14 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                autoFocus
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700/80 hover:text-slate-900 z-10">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

          </form>
        );

      case 3:
        return (
          <form id="auth-wizard-form" onSubmit={handleStep3Submit} className="space-y-6 w-full flex justify-center">
            <Enable2FACard 
              qrCodeData={authData.totpQrCode} 
              otpCode={authData.totpCode}
              onOtpChange={(val) => setAuthData({ ...authData, totpCode: val })}
            />
          </form>
        );

      case 4:
        return (
          <form id="auth-wizard-form" onSubmit={handleStep4Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Completa tu perfil</h2>
              <p className="text-white/60 text-base">Necesitamos unos datos extra para finalizar tu registro.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <User className="w-5 h-5 text-slate-700/90" />
                </div>
                <Input placeholder="Nombre completo" value={authData.nombre} onChange={(e) => setAuthData({ ...authData, nombre: e.target.value })}
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                />
              </div>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <Hash className="w-5 h-5 text-slate-700/90" />
                </div>
                <Input placeholder="Matrícula" value={authData.matricula} onChange={(e) => setAuthData({ ...authData, matricula: e.target.value })}
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10">
                  <GraduationCap className="w-5 h-5 text-slate-700/90" />
                </div>
                <select value={authData.carrera} onChange={(e) => setAuthData({ ...authData, carrera: e.target.value })}
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
                <Input type="number" placeholder="Semestre" value={authData.semestre} onChange={(e) => setAuthData({ ...authData, semestre: e.target.value })}
                  className="bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-12 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md"
                />
              </div>
            </div>

          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] w-full relative flex flex-col overflow-hidden bg-black">
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
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/5">
        <img src={tecLogo} alt="Tecnológico de Monterrey" className="h-10 sm:h-12 w-auto brightness-0 invert drop-shadow-md" />
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <SocialIcon href="https://www.facebook.com/TecCCM">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z" /></svg>
          </SocialIcon>
          <SocialIcon href="https://www.instagram.com/serviciosocial.ccm/">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
          </SocialIcon>
          <SocialIcon href="https://www.youtube.com/watch?v=Z2SOyRZ0qUI">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
          </SocialIcon>
          <SocialIcon href="https://x.com/TecdeMonterrey">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 fill-current"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
          </SocialIcon>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-8 sm:py-10 overflow-y-auto no-visible-scrollbar">

        {/* Form area: Integrated style, no bounding box backdrop */}
        <div className="w-full max-w-[560px] p-4 sm:p-2 relative z-10 my-auto flex flex-col justify-center min-h-[600px] sm:min-h-[560px]">


          <div className="flex flex-col items-center justify-center mb-8 w-full">
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
          <div 
            className="relative w-full transition-all duration-300 ease-in-out"
            style={{ 
              minHeight: step === 1 || step === 2 ? '160px' : step === 3 ? 'auto' : '200px'
            }}
          >
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                className="w-full flex"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="w-full flex flex-col items-center mt-6 z-20">
            <ProgressIndicator 
              step={step} 
              totalSteps={3} 
              text={step === 1 ? 'Continuar' : step === 2 ? 'Iniciar Sesión' : step === 3 ? 'Verificar Código' : 'Finalizar Registro'} 
              isLoading={isLoading} 
              onBack={prevStep} 
              formId="auth-wizard-form"
            />
            
            <motion.div 
              animate={{ height: step === 1 || step === 2 ? 100 : 0, opacity: step === 1 || step === 2 ? 1 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full flex justify-center relative mt-2 overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step-1-footer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-sm absolute top-0"
                  >
                    <div className="relative flex items-center py-4">
                      <div className="flex-grow border-t border-white/20"></div>
                      <span className="flex-shrink-0 mx-4 text-white/50 text-sm font-medium uppercase">o</span>
                      <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    <div className="flex justify-center w-full rounded-full transition-colors items-center mt-2 relative z-50">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("La autenticación con Google ha fallado.")}
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        text="continue_with"
                        width="100%"
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2-footer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-6"
                  >
                    <button type="button" className="text-white/60 text-sm hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-t border-white/5">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a href="https://tec.mx/es/avisos-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
            Aviso de Privacidad
          </a>
          <a href="https://letica.mx/ethos?locale=es" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
            Ethos
          </a>
        </div>
        <p className="text-white/40 text-[11px] font-medium text-center">
          © {new Date().getFullYear()} {" "}
          <a href="https://tec.mx/es" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Tecnológico de Monterrey</a>
        </p>
      </footer>
    </div>
  );
}

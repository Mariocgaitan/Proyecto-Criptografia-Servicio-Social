import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProgressIndicator from "@/components/ui/progress-indicator";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, prefetchNonce, clearNoncePrefetch } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/api";
import { Component as Enable2FACard } from "@/components/ui/enable-2fa-card";

import tecLogo from "@/assets/tec_logo.png";
import serSocialLogo from "@/assets/ser_social_negro.jpg";
import campusImg1 from "@/assets/login_images/ser_social_header.png";
import campusImg2 from "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp";
import campusImg3 from "@/assets/login_images/ser_social_monterrey.jpg";
import campusImg4 from "@/assets/login_images/ser_social3.jpg";

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
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [googleNonce, setGoogleNonce] = useState(null);

  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    totpCode: "",
    tempToken: "",
    totpQrCode: null,
    totpSecret: null,
    carrera: "",
    semestre: "",
    periodo: ""
  });

  const fetchNonce = async () => {
    try {
      // Use prefetched nonce if available, otherwise fetch fresh
      const nonce = await prefetchNonce();
      if (nonce) {
        setGoogleNonce(nonce);
        clearNoncePrefetch();
        return;
      }
      // Fallback: fetch directly
      const response = await fetch(apiUrl("/api/v1/auth/google/nonce"), {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setGoogleNonce(data.nonce);
      }
    } catch (err) {
      console.error("Error al obtener nonce de Google:", err);
    }
  };

  // Obtener nonce cuando el componente monta (para Google OAuth)
  useEffect(() => {
    fetchNonce();
  }, []);

  // Mostrar mensaje de sesión expirada si viene redirigido
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("expired") === "true") {
      setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
      // Limpiar el parámetro de la URL sin recargar
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location.search]);

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
    
    // Validar que tenemos un nonce válido
    if (!googleNonce) {
      setError("No se pudo obtener el nonce de seguridad. Por favor, recarga la página e intenta de nuevo.");
      setIsLoading(false);
      return;
    }
    
    try {
      // Usar la ruta relativa para aprovechar el proxy configurado en vite.config.js
      // Esto previene los bloqueos CORS del navegador y problemas con COOP
      const response = await fetch(apiUrl("/api/v1/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id_token: credentialResponse.credential,
          nonce: googleNonce
        }),
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
          totpQrCode: data.totp_qr_code || null,
          totpSecret: data.totp_secret || null
        }));
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "La autenticación con Google ha fallado.");
      clearNoncePrefetch();
      fetchNonce();
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

      if (data.needs_profile) {
        setStep(4);
        return;
      }

      const usuario = await fetchUser();
      const targetByRole = {
        admin: "/admin/dashboard",
        empresa: "/empresa/escaner",
        alumno: "/dashboard",
      };
      const fallback = targetByRole[usuario?.rol] || "/dashboard";
      const redirect = data.redirect_url;
      const safeUrl = (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//"))
        ? redirect
        : fallback;
      navigate(safeUrl, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al verificar código TOTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4Submit = async (e) => {
    e.preventDefault();
    if (!authData.carrera || !authData.semestre || !authData.periodo) {
      setError("Por favor completa todos los campos (Carrera, Semestre, Periodo).");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/v1/auth/complete-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrera: authData.carrera.toUpperCase().trim(),
          semestre: parseInt(authData.semestre, 10),
          periodo: authData.periodo
        }),
        credentials: "include"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al completar perfil.");
      }

      const usuario = await fetchUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al completar perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form id="auth-wizard-form" onSubmit={handleStep1Submit} className="space-y-5 w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl sm:text-5xl font-normal text-white mb-4 tracking-tight">
                Inicia sesion
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
              <h2 className="text-4xl sm:text-5xl font-normal text-white mb-4 tracking-tight">Ingresa tu contraseña</h2>
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
              totpSecret={authData.totpSecret}
              otpCode={authData.totpCode}
              onOtpChange={(val) => setAuthData({ ...authData, totpCode: val })}
            />
          </form>
        );

      case 4:
        return (
          <form id="auth-wizard-form" onSubmit={handleStep4Submit} className="space-y-4 sm:space-y-5 w-full flex flex-col justify-center">
            <div className="text-center mb-2">
              <h3 className="text-xl sm:text-2xl font-normal text-white">Completar Perfil</h3>
              <p className="text-sm text-white/50 mt-1">Queremos conocerte para asignarte los mejores proyectos.</p>
            </div>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <GraduationCap className="w-5 h-5 text-slate-700/90" />
              </div>
              <select
                value={authData.carrera}
                onChange={(e) => setAuthData({ ...authData, carrera: e.target.value })}
                className="w-full bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 pl-14 pr-4 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md outline-none appearance-none"
                style={{ backgroundImage: "none" }}
              >
                <option value="" disabled className="text-slate-500">Carrera...</option>
                <option value="ITC" className="text-black">Ingeniería en Tecnologías Computacionales (ITC)</option>
                <option value="ISC" className="text-black">Ingeniería en Sistemas Computacionales (ISC)</option>
                <option value="ICI" className="text-black">Ingeniería Civil (ICI)</option>
                <option value="IIA" className="text-black">Ingeniería en Inteligencia Artificial (IIA)</option>
                <option value="IIS" className="text-black">Ingeniería Industrial y de Sistemas (IIS)</option>
                <option value="IMT" className="text-black">Ingeniería Mecatrónica (IMT)</option>
              </select>
            </div>
            <div className="relative w-full flex gap-3">
              <div className="relative w-1/2">
                <select
                  value={authData.semestre}
                  onChange={(e) => setAuthData({ ...authData, semestre: e.target.value })}
                  className="w-full bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 px-4 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md outline-none appearance-none"
                  style={{ backgroundImage: "none" }}
                >
                  <option value="" disabled className="text-slate-500">Semestre...</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num} className="text-black">{num}º Semestre</option>
                  ))}
                </select>
              </div>
              <div className="relative w-1/2">
                <select
                  value={authData.periodo}
                  onChange={(e) => setAuthData({ ...authData, periodo: e.target.value })}
                  className="w-full bg-white/18 border border-white/35 text-slate-900 rounded-xl h-14 px-4 focus-visible:ring-2 focus-visible:ring-white/45 text-base font-medium backdrop-blur-md outline-none appearance-none"
                  style={{ backgroundImage: "none" }}
                >
                  <option value="" disabled className="text-slate-500">Periodo...</option>
                  <option value="INVIERNO" className="text-black">Invierno</option>
                  <option value="FEB_JUN" className="text-black">Febrero-Junio</option>
                  <option value="VERANO" className="text-black">Verano</option>
                  <option value="AGO_DIC" className="text-black">Agosto-Diciembre</option>
                </select>
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

        {/* Form area: Glassmorphism container */}
        <div className="w-full max-w-[560px] p-6 sm:p-10 relative z-10 my-auto flex flex-col justify-center min-h-[600px] sm:min-h-[560px] bg-black/40 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl">


          <div className="flex flex-col items-center justify-center mb-8 w-full">
            <div className="h-20 sm:h-24 w-[200px] sm:w-[240px] rounded-3xl overflow-hidden shadow-2xl bg-black flex items-center justify-center relative">
              <img src={serSocialLogo} alt="Ser Social" className="absolute inset-0 w-full h-full object-cover scale-[1.25] sm:scale-[1.3]" />
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3"
              >
                <p className="text-red-200 text-sm font-normal text-center">{error}</p>
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
              totalSteps={step >= 4 ? 4 : 3}
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
                      {googleNonce ? (
                        <GoogleLogin
                          key={googleNonce}
                          nonce={googleNonce}
                          onSuccess={handleGoogleSuccess}
                          onError={() => setError("La autenticación con Google ha fallado.")}
                          theme="filled_black"
                          shape="pill"
                          size="large"
                          text="continue_with"
                          width="100%"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-10 text-white/30 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Cargando...
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-black/30 backdrop-blur-md border-t border-white/5">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a href="https://tec.mx/es/avisos-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-normal uppercase tracking-wider hover:text-white/80 transition-colors">
            Aviso de Privacidad
          </a>
          <a href="https://letica.mx/ethos?locale=es" target="_blank" rel="noopener noreferrer" className="text-white/50 text-[11px] font-normal uppercase tracking-wider hover:text-white/80 transition-colors">
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

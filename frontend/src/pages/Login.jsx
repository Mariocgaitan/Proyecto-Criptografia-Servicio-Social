import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

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
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#001D4A] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Dynamics (matches Registro) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[130px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, -40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[0%] -left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      <div className="w-full max-w-md relative z-10 py-10">
        
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="mx-auto w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight">Acceso Global</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-blue-200/50 mt-2 text-sm font-medium tracking-wide">Alumnos, Formadores y Master Admins</motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Card className="border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-white/[0.02] backdrop-blur-2xl overflow-hidden rounded-[2rem]">
            
            <CardHeader className="bg-black/20 p-8 border-b border-white/5 text-center">
              <CardTitle className="text-xl font-bold text-white tracking-tight">Autenticación Segura</CardTitle>
              <CardDescription className="text-blue-200/50 mt-1">Ingresa tus credenciales autorizadas</CardDescription>
            </CardHeader>

            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden">
                    <div className="w-1.5 h-full absolute left-0 top-0 bottom-0 bg-red-500"></div>
                    <p className="text-red-300 text-sm font-bold pl-2">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="correo" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Identificador (Correo / Proyecto)</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 focus-visible:ring-blue-500"
                    placeholder="ejemplo@tec.mx"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-blue-200/60 font-bold uppercase tracking-widest text-[10px]">Llave de Acceso</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 focus-visible:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-xl font-bold text-base transition-all transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] text-white flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar e Ingresar"}
                  </Button>
                </div>
                <div className="text-center pt-2">
                  <p className="text-blue-200/40 text-sm">
                    ¿Estudiante de nuevo ingreso?{" "}
                    <Link to="/registro" className="text-blue-400 font-bold hover:text-blue-300 hover:underline transition-all ml-1 underline-offset-4">
                      Obtener Alta
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

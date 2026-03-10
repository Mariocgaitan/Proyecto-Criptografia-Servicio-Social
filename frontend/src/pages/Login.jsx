import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect based on role
  if (user) {
    if (user.rol === "admin") navigate("/admin/dashboard", { replace: true });
    if (user.rol === "empresa") navigate("/empresa/escaner", { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await login(correo, password);
    if (!result.success) {
      setError(result.error);
    }
    // Note: React will re-render due to AuthContext update, and the check above will trigger navigation.
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#001D4A] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur-xl text-white">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-t-xl pb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg shadow-black/20">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Acceso SID</CardTitle>
                <CardDescription className="text-blue-100 mt-1 font-medium">
                  Portal Administrativo y de Empresas
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="correo" className="text-white/80">Correo Institucional / Proyecto</Label>
                <Input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl h-12 focus-visible:ring-blue-400"
                  placeholder="ejemplo@tec.mx"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl h-12 focus-visible:ring-blue-400"
                  placeholder="Tu contraseña secreta"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 rounded-xl font-bold text-base transition-all transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

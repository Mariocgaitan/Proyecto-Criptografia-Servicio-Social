import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user) {
      const targetByRole = {
        admin: "/admin/dashboard",
        empresa: "/empresa/escaner",
        alumno: "/dashboard",
      };
      navigate(targetByRole[user.rol] || "/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <p className="text-8xl font-bold text-white/10 select-none">404</p>
        <h1 className="text-2xl font-light text-white mt-4 tracking-tight">
          Pagina no encontrada
        </h1>
        <p className="text-sm text-white/40 mt-2">
          La pagina que buscas no existe o fue movida.
        </p>
        <Button
          onClick={handleGoBack}
          className="mt-8 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full px-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>
      </motion.div>
    </div>
  );
}

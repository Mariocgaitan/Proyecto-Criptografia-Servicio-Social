import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api";

export function StudentProfileForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    correo_alterno: initialData?.correo_alterno || "",
    celular: initialData?.celular || "",
    descripcion_personal: initialData?.descripcion_personal || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/alumno/perfil"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      if (res.ok) {
        onSubmit();
      } else {
        const data = await res.json();
        setError(data.detail || "Error al actualizar perfil");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative overflow-hidden rounded-3xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {/* Glow accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />

        <div className="relative z-10 p-8 sm:p-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-xl font-normal text-white tracking-tight">Perfil del Alumno</h2>
            <p className="text-[10px] text-white/35 uppercase tracking-[0.3em] font-medium mt-1">
              Información adicional
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input fields row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {/* Email */}
              <div className="space-y-2.5">
                <Label htmlFor="correo_alterno" className="text-[11px] text-white/45 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5 ml-0.5">
                  <Mail className="w-3 h-3 text-blue-400/70" />
                  Email alternativo
                </Label>
                <Input
                  id="correo_alterno"
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  value={formData.correo_alterno}
                  onChange={(e) => setFormData({ ...formData, correo_alterno: e.target.value })}
                  className="h-11 rounded-xl bg-white/[0.08] border-white/15 text-white placeholder:text-white/25 text-sm px-4 focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 hover:border-white/20 transition-all duration-200"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2.5">
                <Label htmlFor="celular" className="text-[11px] text-white/45 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5 ml-0.5">
                  <Phone className="w-3 h-3 text-blue-400/70" />
                  Número celular
                </Label>
                <Input
                  id="celular"
                  type="tel"
                  required
                  placeholder="10 dígitos"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  className="h-11 rounded-xl bg-white/[0.08] border-white/15 text-white placeholder:text-white/25 text-sm px-4 focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 hover:border-white/20 transition-all duration-200"
                />
              </div>
            </motion.div>

            {/* Textarea */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2.5"
            >
              <Label htmlFor="descripcion_personal" className="text-[11px] text-white/45 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5 ml-0.5">
                <FileText className="w-3 h-3 text-blue-400/70" />
                Sobre ti / Habilidades
              </Label>
              <Textarea
                id="descripcion_personal"
                required
                placeholder="Cuéntanos brevemente sobre tus habilidades y lo que puedes aportar..."
                value={formData.descripcion_personal}
                onChange={(e) => setFormData({ ...formData, descripcion_personal: e.target.value })}
                className="min-h-[120px] rounded-xl bg-white/[0.08] border-white/15 text-white placeholder:text-white/25 text-sm p-4 resize-none leading-relaxed focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 hover:border-white/20 transition-all duration-200"
              />
              <p className="text-[10px] text-white/25 ml-0.5">Máximo 500 caracteres</p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center justify-between gap-4 pt-2"
            >
              {onCancel ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  className="text-white/40 hover:text-white/70 hover:bg-white/5 text-xs gap-1.5 transition-all duration-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Regresar
                </Button>
              ) : <div />}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 hover:border-white/25 transition-all duration-200 text-[11px] uppercase tracking-[0.2em] font-medium shadow-none disabled:opacity-50 cursor-pointer gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Perfil"
                )}
              </Button>
            </motion.div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

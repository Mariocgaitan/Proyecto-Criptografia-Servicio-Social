import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto w-full px-6"
    >
      <div className="bg-zinc-950/70 backdrop-blur-3xl border border-white/10 rounded-[32px] p-10 sm:p-14 shadow-2xl">
        <div className="mb-12">
          <h2 className="text-2xl font-light text-white tracking-tight leading-none mb-2">Perfil del Alumno</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-medium">Información Adicional</p>
        </div>

        {error && (
          <div className="mb-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] uppercase tracking-widest text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Form grid to make it wider and balanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-3">
              <Label className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium ml-1">Email Alternativo</Label>
              <Input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={formData.correo_alterno}
                onChange={(e) => setFormData({ ...formData, correo_alterno: e.target.value })}
                className="bg-white/[0.03] border-white/10 h-12 rounded-2xl focus:ring-1 focus:ring-white/20 text-white placeholder:text-white/10 text-sm px-5"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium ml-1">Número Celular</Label>
              <Input
                type="tel"
                required
                placeholder="10 dígitos"
                value={formData.celular}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                className="bg-white/[0.03] border-white/10 h-12 rounded-2xl focus:ring-1 focus:ring-white/20 text-white placeholder:text-white/10 text-sm px-5"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <Label className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium ml-1">Sobre ti / Habilidades</Label>
              <Textarea
                required
                placeholder="Cuéntanos brevemente tus aportes..."
                value={formData.descripcion_personal}
                onChange={(e) => setFormData({ ...formData, descripcion_personal: e.target.value })}
                className="bg-white/[0.03] border-white/10 min-h-[140px] rounded-2xl focus:ring-1 focus:ring-white/20 text-white placeholder:text-white/10 text-sm p-5 resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between gap-8 flex-col sm:flex-row">
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="text-white/20 hover:text-white/50 hover:bg-white/5 text-[10px] uppercase tracking-[0.4em] font-medium transition-all"
              >
                Regresar
              </Button>
            ) : <div className="hidden sm:block" />}
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[200px] h-12 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all rounded-full text-[11px] uppercase tracking-[0.3em] font-medium shadow-none"
            >
              {isSubmitting ? "Guardando..." : "Guardar Perfil"}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

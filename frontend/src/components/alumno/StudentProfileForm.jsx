import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Calendar, Mail, Phone, FileText, ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import { apiUrl } from "@/lib/api";

// ─── Opciones estáticas ────────────────────────────────────────────
const CARRERAS = [
  "ITC", "IIS", "IRS", "IMT", "IMD",
  "LAF", "LAE", "LIN", "LDI", "LLE",
  "MC",  "MCA", "MF",  "MBIT",
  "IBT", "IQ",  "IC",  "IBQ", "IA",
  "LC",  "CP",  "LAD", "LBC",
];

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIODOS = [
  { label: "Febrero – Junio 2026",    value: "FEB_JUN"  },
  { label: "Agosto – Diciembre 2026", value: "AGO_DIC"  },
  { label: "Invierno 2026",           value: "INVIERNO" },
];

// ─── Componente ────────────────────────────────────────────────────
export function StudentProfileForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    // Datos académicos
    carrera:              initialData?.carrera              || "",
    semestre:             initialData?.semestre             || "",
    periodo:              initialData?.periodo              || "FEB_JUN",
    // Datos de contacto
    correo_alterno:       initialData?.correo_alterno       || "",
    celular:              initialData?.celular              || "",
    descripcion_personal: initialData?.descripcion_personal || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.carrera || !formData.semestre || !formData.periodo) {
      setError("Completa los datos académicos para continuar.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Guardar datos académicos + periodo (registra el evento)
      const profileRes = await fetch(apiUrl("/api/v1/auth/complete-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrera:  formData.carrera,
          semestre: parseInt(formData.semestre, 10),
          periodo:  formData.periodo,
        }),
        credentials: "include",
      });

      if (!profileRes.ok) {
        const d = await profileRes.json();
        throw new Error(d.detail || "Error al guardar perfil académico.");
      }

      // 2. Guardar datos de contacto (si alguno fue llenado)
      const contactPayload = {};
      if (formData.correo_alterno)       contactPayload.correo_alterno       = formData.correo_alterno;
      if (formData.celular)              contactPayload.celular              = formData.celular;
      if (formData.descripcion_personal) contactPayload.descripcion_personal = formData.descripcion_personal;

      if (Object.keys(contactPayload).length > 0) {
        const contactRes = await fetch(apiUrl("/api/v1/alumno/perfil"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactPayload),
          credentials: "include",
        });
        if (!contactRes.ok) {
          const d = await contactRes.json();
          throw new Error(d.detail || "Error al guardar datos de contacto.");
        }
      }

      onSubmit();
    } catch (err) {
      setError(err.message || "Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const field   = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));
  const inputCls = "h-11 rounded-xl bg-white/[0.08] border-white/15 text-white placeholder:text-white/25 text-sm px-4 focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 hover:border-white/20 transition-all duration-200 w-full border outline-none";
  const selectCls = "w-full h-11 rounded-xl bg-white/[0.08] border border-white/15 text-white text-sm px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 hover:border-white/20 transition-all duration-200";
  const labelCls  = "text-[11px] text-white/45 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5 ml-0.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative overflow-hidden rounded-3xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />

        <div className="relative z-10 p-8 sm:p-10">
          <div className="mb-6">
            <h2 className="text-xl font-normal text-white tracking-tight">Completa tu perfil</h2>
            <p className="text-[10px] text-white/35 uppercase tracking-[0.3em] font-medium mt-1">Información académica y de contacto</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Sección académica ── */}
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">Datos académicos</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Carrera */}
              <div className="space-y-2">
                <label className={labelCls}><GraduationCap className="w-3 h-3 text-blue-400/70" />Carrera</label>
                <div className="relative">
                  <select required value={formData.carrera} onChange={e => field("carrera", e.target.value)} className={selectCls}>
                    <option value="" disabled className="bg-zinc-900">Selecciona tu carrera</option>
                    {CARRERAS.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                </div>
              </div>

              {/* Semestre */}
              <div className="space-y-2">
                <label className={labelCls}><BookOpen className="w-3 h-3 text-blue-400/70" />Semestre</label>
                <div className="relative">
                  <select required value={formData.semestre} onChange={e => field("semestre", e.target.value)} className={selectCls}>
                    <option value="" disabled className="bg-zinc-900">Semestre</option>
                    {SEMESTRES.map(s => <option key={s} value={s} className="bg-zinc-900">Semestre {s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                </div>
              </div>
            </div>

            {/* Periodo */}
            <div className="space-y-2">
              <label className={labelCls}><Calendar className="w-3 h-3 text-blue-400/70" />Periodo de Servicio Social</label>
              <div className="relative">
                <select required value={formData.periodo} onChange={e => field("periodo", e.target.value)} className={selectCls}>
                  {PERIODOS.map(p => <option key={p.value} value={p.value} className="bg-zinc-900">{p.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              </div>
            </div>

            {/* ── Separador ── */}
            <div className="border-t border-white/10 pt-5">
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4">Datos de contacto</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Correo alterno */}
                <div className="space-y-2">
                  <label className={labelCls}><Mail className="w-3 h-3 text-blue-400/70" />Email alternativo</label>
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={formData.correo_alterno}
                    onChange={e => field("correo_alterno", e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Celular */}
                <div className="space-y-2">
                  <label className={labelCls}><Phone className="w-3 h-3 text-blue-400/70" />Número celular</label>
                  <input
                    type="tel"
                    placeholder="10 dígitos"
                    value={formData.celular}
                    onChange={e => field("celular", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2 mt-5">
                <label className={labelCls}><FileText className="w-3 h-3 text-blue-400/70" />Sobre ti / Habilidades</label>
                <textarea
                  placeholder="Cuéntanos brevemente sobre tus habilidades y lo que puedes aportar..."
                  value={formData.descripcion_personal}
                  onChange={e => field("descripcion_personal", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-white/[0.08] border border-white/15 text-white placeholder:text-white/25 text-sm p-4 resize-none leading-relaxed focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 hover:border-white/20 transition-all duration-200 outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              {onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel}
                  className="text-white/40 hover:text-white/70 hover:bg-white/5 text-xs gap-1.5 cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" />Regresar
                </Button>
              ) : <div />}

              <Button type="submit" disabled={isSubmitting}
                className="h-11 px-8 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 hover:border-white/25 transition-all text-[11px] uppercase tracking-[0.2em] font-medium shadow-none disabled:opacity-50 cursor-pointer gap-2">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Guardar y Continuar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

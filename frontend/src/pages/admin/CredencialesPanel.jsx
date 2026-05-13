import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchWithAuth, formatApiError } from "@/lib/api";

const ROL_LABELS = {
  admin: "Administrador",
  empresa: "Empresa",
};

const ROL_BADGE_STYLES = {
  admin: "bg-white/[0.06] text-white/85 border-white/15",
  empresa: "bg-white/[0.03] text-white/60 border-white/10",
};

export default function CredencialesPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [rolFilter, setRolFilter] = useState("todos");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [copied, setCopied] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/v1/admin/credenciales");
      if (!res.ok) {
        throw new Error(await formatApiError(res, "No se pudo cargar la lista"));
      }
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (rolFilter !== "todos" && u.rol !== rolFilter) return false;
      if (!q) return true;
      return (
        u.nombre?.toLowerCase().includes(q) ||
        u.correo?.toLowerCase().includes(q) ||
        u.nombre_empresa?.toLowerCase().includes(q)
      );
    });
  }, [usuarios, query, rolFilter]);

  const handleReset = useCallback(async () => {
    if (!confirmTarget) return;
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetchWithAuth(
        `/api/v1/admin/credenciales/${encodeURIComponent(confirmTarget.id_matricula)}/reset-password`,
        { method: "POST" },
      );
      if (!res.ok) {
        throw new Error(await formatApiError(res, "No se pudo resetear la contraseña"));
      }
      const data = await res.json();
      setResultData({ ...data, nombre: confirmTarget.nombre, rol: confirmTarget.rol });
      setConfirmTarget(null);
    } catch (err) {
      setResetError(err.message || "Error inesperado");
    } finally {
      setResetting(false);
    }
  }, [confirmTarget]);

  const handleCopy = useCallback(async () => {
    if (!resultData?.password) return;
    try {
      await navigator.clipboard.writeText(resultData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [resultData]);

  const closeResultDialog = () => {
    setResultData(null);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60 max-w-xl leading-relaxed">
          Genera una contraseña nueva para administradores y empresas. La contraseña
          se muestra una sola vez.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={cargarUsuarios}
          disabled={loading}
          className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o empresa..."
            className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/40"
          />
        </div>
        <div className="flex gap-1 bg-white/5 border border-white/15 rounded-lg p-1">
          {[
            { value: "todos", label: "Todos" },
            { value: "admin", label: "Admin" },
            { value: "empresa", label: "Empresa" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRolFilter(opt.value)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition-colors ${
                rolFilter === opt.value
                  ? "bg-blue-600/25 border border-blue-400/35 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/50">
                <th className="px-4 py-3 font-normal">Nombre</th>
                <th className="px-4 py-3 font-normal">Correo</th>
                <th className="px-4 py-3 font-normal">Rol</th>
                <th className="px-4 py-3 font-normal text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                    Cargando credenciales...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                    {usuarios.length === 0
                      ? "No hay usuarios admin/empresa registrados."
                      : "Ningún resultado coincide con el filtro."}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((u) => (
                  <tr
                    key={u.id_matricula}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 text-white">
                      <div className="font-normal">{u.nombre}</div>
                      {u.nombre_empresa && u.nombre_empresa !== u.nombre && (
                        <div className="text-[11px] text-white/50">{u.nombre_empresa}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/75 break-all">{u.correo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-[10px] font-normal uppercase tracking-[0.12em] px-2 py-0.5 rounded border ${
                          ROL_BADGE_STYLES[u.rol] || "bg-white/[0.03] text-white/60 border-white/10"
                        }`}
                      >
                        {ROL_LABELS[u.rol] || u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResetError(null);
                          setConfirmTarget(u);
                        }}
                        className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-2" />
                        Resetear contraseña
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmación */}
      <Dialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
            setResetError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight">
              Resetear contraseña
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Se generará una contraseña nueva para{" "}
              <span className="text-white font-medium">{confirmTarget?.nombre}</span>.
              Sus sesiones activas se cerrarán y deberá iniciar sesión con la nueva
              contraseña.
            </DialogDescription>
          </DialogHeader>
          {resetError && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {resetError}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmTarget(null)}
              disabled={resetting}
              className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReset}
              disabled={resetting}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {resetting ? "Generando..." : "Generar nueva contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resultado: muestra password una sola vez */}
      <Dialog
        open={Boolean(resultData)}
        onOpenChange={(open) => {
          if (!open) closeResultDialog();
        }}
      >
        <DialogContent className="sm:max-w-md bg-slate-950/92 border border-white/15 text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight">
              Contraseña generada
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Cópiala y entrégala al usuario. <span className="text-amber-300">No se mostrará de nuevo.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Usuario</div>
              <div className="text-white">{resultData?.nombre}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Correo</div>
              <div className="text-white break-all">{resultData?.correo}</div>
            </div>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-amber-200 mb-2">
                Nueva contraseña
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-base text-white bg-black/40 px-3 py-2 rounded select-all break-all">
                  {resultData?.password}
                </code>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopy}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={closeResultDialog}
              className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

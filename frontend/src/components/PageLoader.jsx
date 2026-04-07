export default function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
          style={{ animation: "spin 0.8s linear infinite" }}
        />
        <p className="text-sm text-white/60">Cargando...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import Registro from "./pages/Registro";
import AlumnoDashboard from "./pages/alumno/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import EmpresaEscaner from "./pages/empresa/Escaner";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center">
        <div className="text-sm text-white/80">Cargando sesion...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Legacy Login Redirects */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/empresa/login" element={<Navigate to="/login" replace />} />

      {/* Alumno Routes */}
      <Route element={<ProtectedRoute allowedRoles={["alumno"]} />}>
        <Route path="/dashboard" element={<AlumnoDashboard />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>

      {/* Empresa Routes */}
      <Route element={<ProtectedRoute allowedRoles={["empresa"]} />}>
        <Route path="/empresa/escaner" element={<EmpresaEscaner />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

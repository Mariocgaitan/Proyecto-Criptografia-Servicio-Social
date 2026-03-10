import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import EmpresaEscaner from "./pages/empresa/Escaner";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen bg-[#242424] flex items-center justify-center text-white">Iniciando plataforma...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

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

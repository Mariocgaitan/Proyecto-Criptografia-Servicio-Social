import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import PageLoader from "./components/PageLoader";

import AuthWizard from "./pages/AuthWizard";
import AlumnoDashboard from "./pages/alumno/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import EmpresaEscaner from "./pages/empresa/Escaner";
import NotFound from "./pages/NotFound";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthWizard />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Legacy Login Redirects */}
      <Route path="/registro" element={<Navigate to="/login" replace />} />
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

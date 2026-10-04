import {Routes, Route, Navigate} from "react-router-dom";
import {ProtectedRoute} from "./components/ProtectedRoute";
import {useAuth} from "./hooks/useAuth";
import PageLoader from "./components/PageLoader";

import AuthWizard from "./pages/AuthWizard";
import AlumnoDashboard from "./pages/alumno/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import SocioformadorEscaner from "./pages/socioformador/Escaner";
import NotFound from "./pages/NotFound";
import Terminos from "./pages/Terminos";
import {LogIn} from "lucide-react";

function App() {
    const {loading} = useAuth();

    if (loading) {
        return <PageLoader />;
    }

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<AuthWizard />} />
            <Route path="/admin" element={<AuthWizard />} />
            <Route path="/terminos" element={<Terminos />} />

            {/* Legacy Login Redirects */}
            <Route path="/registro" element={<Navigate to="/login" replace />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/socioformador/login" element={<Navigate to="/login" replace />} />

            {/* Alumno Routes */}
            <Route element={<ProtectedRoute allowedRoles={["alumno"]} />}>
                <Route path="/dashboard" element={<AlumnoDashboard />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Socioformador Routes */}
            <Route element={<ProtectedRoute allowedRoles={["socioformador"]} />}>
                <Route path="/socioformador/escaner" element={<SocioformadorEscaner />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;

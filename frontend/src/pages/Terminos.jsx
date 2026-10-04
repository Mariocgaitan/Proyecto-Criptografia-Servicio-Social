import {useNavigate} from "react-router-dom";
import {ArrowLeft} from "lucide-react";
import {Button} from "@/components/ui/button";

export default function Terminos() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:py-16">
            <div className="mx-auto w-full max-w-3xl">
                <Button
                    onClick={() => navigate("/login")}
                    className="mb-8 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full px-5">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al inicio de sesión
                </Button>

                <h1 className="text-3xl sm:text-4xl font-light tracking-tight">Términos y Condiciones</h1>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 text-white/80 leading-relaxed">
                    {/* TODO: Agregar contenido de Términos y Condiciones */}
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Baby, LogIn, ShieldCheck, Clock, Users, CheckCircle2, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, authError, clearAuthError, loading } = useAuth();

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Baby className="w-8 h-8" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">
          Nanny<span className="text-amber-600">Pay</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-2 mb-6">
          Lleva el control exacto de horarios, tarifa por hora y cuánto depositarle a la niñera semana a semana.
        </p>

        {authError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="block leading-relaxed">{authError}</span>
              {authError.includes('Firebase Console') && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <a
                    href="https://console.firebase.google.com/project/esoteric-bus-6gmzr/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
                  >
                    Abrir Configuración en Firebase ↗
                  </a>
                </div>
              )}
              <button
                type="button"
                onClick={clearAuthError}
                className="text-[11px] underline block mt-2 font-semibold text-rose-800 hover:text-rose-950"
              >
                Cerrar mensaje
              </button>
            </div>
          </div>
        )}

        {/* Feature points */}
        <div className="space-y-2.5 text-left mb-6 bg-stone-50 border border-stone-200/80 rounded-xl p-4 text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cálculo automático de horas según llegada y salida.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tarifa congelada por día: el historial no se altera.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Roles compartidos con Google: Admin, Super Usuario y Lectura.</span>
          </div>
        </div>

        {/* Login Button */}
        <button
          type="button"
          id="btn-login-google-center"
          disabled={loading}
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z"
            />
          </svg>
          <span>Iniciar Sesión con Google</span>
        </button>

        <p className="text-[11px] text-stone-600 mt-4">
          Accede de forma segura con tu cuenta de Gmail.
        </p>
      </div>
    </div>
  );
};

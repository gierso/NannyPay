import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Baby,
  ShieldCheck,
  UserCheck,
  Eye,
  Settings,
  Users,
  LogOut,
  LogIn,
  History,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'week' | 'history';
  onViewChange: (view: 'week' | 'history') => void;
  onOpenSettings: () => void;
  onOpenUsers: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenSettings,
  onOpenUsers,
}) => {
  const { currentUser, userProfile, role, isAdmin, canEdit, loginWithGoogle, logout } = useAuth();
  const { settings } = useApp();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrador
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Super Usuario
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
            <Eye className="w-3.5 h-3.5" />
            Solo Lectura
          </span>
        );
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-xs">
              <Baby className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-stone-900">
                  Nanny<span className="text-amber-600">Pay</span>
                </span>
                <span className="hidden sm:inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  {settings.nannyName}
                </span>
              </div>
              <p className="text-xs text-stone-600 hidden sm:block">
                Control semanal y cálculo de pagos a niñera
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Semana Actual vs Historial) */}
          {currentUser && (
            <nav className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200 text-sm">
              <button
                type="button"
                id="tab-current-week"
                onClick={() => onViewChange('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  currentView === 'week'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Semana Actual</span>
              </button>
              <button
                type="button"
                id="tab-history"
                onClick={() => onViewChange('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  currentView === 'history'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Historial</span>
              </button>
            </nav>
          )}

          {/* Right Area: Rates indicator, Settings, User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                {/* Current Hourly Rate Badge */}
                <button
                  type="button"
                  id="btn-rate-settings-quick"
                  onClick={onOpenSettings}
                  title="Haz clic para modificar la tarifa por hora"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors"
                >
                  <span className="text-stone-600">Tarifa actual:</span>
                  <span className="font-semibold text-stone-900">
                    {settings.currency}{settings.currentHourlyRate}/h
                  </span>
                  {canEdit && <Settings className="w-3.5 h-3.5 text-stone-600 ml-0.5" />}
                </button>

                {/* Admin-only Users Management button */}
                {isAdmin && (
                  <button
                    type="button"
                    id="btn-open-users-management"
                    onClick={onOpenUsers}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
                    title="Administrar usuarios y permisos"
                  >
                    <Users className="w-4 h-4 text-stone-600" />
                    <span className="hidden lg:inline">Usuarios</span>
                  </button>
                )}

                {/* Settings button */}
                <button
                  type="button"
                  id="btn-open-settings"
                  onClick={onOpenSettings}
                  className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors"
                  title="Configuración de tarifa y niñera"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* User Profile Pill */}
                <div className="relative">
                  <button
                    type="button"
                    id="btn-user-profile-menu"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 rounded-lg hover:bg-stone-100 border border-stone-200 transition-colors"
                  >
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt={userProfile.displayName}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover border border-stone-300"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                        {(userProfile?.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-semibold text-stone-900 leading-tight truncate max-w-[120px]">
                        {userProfile?.displayName || 'Usuario'}
                      </span>
                      <span className="text-[10px] text-stone-600 truncate max-w-[120px]">
                        {currentUser.email}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div
                      id="dropdown-user-menu"
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50 animate-in fade-in duration-150"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-xs text-stone-600 font-medium">Sesión iniciada con Google:</p>
                        <p className="text-sm font-semibold text-stone-900 truncate">
                          {userProfile?.displayName || currentUser.email}
                        </p>
                        <p className="text-xs text-stone-600 truncate">{currentUser.email}</p>
                        <div className="mt-2">{getRoleBadge()}</div>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          id="menu-open-settings"
                          onClick={onOpenSettings}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50"
                        >
                          <Settings className="w-4 h-4 text-stone-600" />
                          <span>Configuración de Tarifa</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            id="menu-open-users"
                            onClick={onOpenUsers}
                            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50"
                          >
                            <Users className="w-4 h-4 text-stone-600" />
                            <span>Gestionar Familiares / Permisos</span>
                          </button>
                        )}

                        <div className="border-t border-stone-100 my-1" />

                        <button
                          type="button"
                          id="btn-menu-logout"
                          onClick={logout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                id="btn-login-google-header"
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Acceder con Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

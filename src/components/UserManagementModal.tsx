import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  X,
  Users,
  ShieldCheck,
  UserCheck,
  Eye,
  Plus,
  Mail,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { allUsersList, updateUserRole, addOrInviteUser } = useApp();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateUserRole(uid, newRole);
      setMessage({ type: 'success', text: 'Rol actualizado y guardado exitosamente.' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cambiar rol.' });
    }
  };

  const handlePreAuthorizeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    setMessage(null);

    try {
      const cleanEmail = inviteEmail.toLowerCase().trim();
      const displayName = inviteName.trim() || cleanEmail.split('@')[0];

      await addOrInviteUser({
        email: cleanEmail,
        displayName,
        role: inviteRole,
      });

      setMessage({
        type: 'success',
        text: `Se autorizó a ${displayName} (${cleanEmail}) con rol ${
          inviteRole === 'admin' ? 'Administrador' : inviteRole === 'editor' ? 'Super Usuario' : 'Solo Lectura'
        }. El permiso está guardado de forma permanente.`,
      });

      setInviteEmail('');
      setInviteName('');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al guardar usuario.',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Gestión de Usuarios y Permisos Compartidos
              </h3>
              <p className="text-xs text-stone-500">
                Control de acceso con cuentas de Google (Admin, Super Usuario, Invitados)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Role Explanations Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Administrador</span>
              </div>
              <p className="text-stone-600 text-[11px]">
                Control total, configuración de tarifas, agregar/editar turnos y administración de permisos de usuarios.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Super Usuario</span>
              </div>
              <p className="text-stone-600 text-[11px]">
                (Ideal para pareja/esposa): Puede registrar y editar días, modificar tarifas y marcar pagos.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
              <div className="flex items-center gap-1.5 font-bold text-sky-900 mb-1">
                <Eye className="w-4 h-4 text-sky-600" />
                <span>Solo Lectura</span>
              </div>
              <p className="text-stone-600 text-[11px]">
                (Invitados/familiares): Pueden ver la tabla semanal, historial y cálculos sin permiso de modificación.
              </p>
            </div>
          </div>

          {/* Pre-Authorize / Invite Form */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              Autorizar / Invitar Correo de Google
            </h4>
            <form onSubmit={handlePreAuthorizeUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Nombre o Apodo
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Ej. Esposa / Abuela"
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Correo Gmail *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nombre@gmail.com"
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="editor">Super Usuario (Editor)</option>
                    <option value="viewer">Solo Lectura (Invitado)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {inviteLoading ? 'Asignando...' : 'Asignar Permiso'}
                </button>
              </div>
            </form>
          </div>

          {/* Current Users List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Usuarios Registrados ({allUsersList.length})
            </h4>

            {allUsersList.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-lg text-center">
                Aún no hay otros usuarios registrados en el sistema.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                {allUsersList.map((user) => {
                  const isCurrent = user.email === currentUser?.email;
                  const isMasterAdmin = user.email.toLowerCase() === 'gierso@gmail.com';

                  return (
                    <div
                      key={user.uid}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-stone-900">
                              {user.displayName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm">
                                Tú
                              </span>
                            )}
                            {isMasterAdmin && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm">
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500">{user.email}</p>
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="w-full sm:w-auto flex items-center justify-end">
                        {isMasterAdmin ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin Principal
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.uid, e.target.value as UserRole)
                            }
                            className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          >
                            <option value="admin">Administrador</option>
                            <option value="editor">Super Usuario (Editor)</option>
                            <option value="viewer">Solo Lectura</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

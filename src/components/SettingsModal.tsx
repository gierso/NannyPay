import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { X, Settings, AlertCircle, Check, DollarSign, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useApp();
  const { canEdit } = useAuth();

  const [hourlyRate, setHourlyRate] = useState<number>(settings.currentHourlyRate);
  const [currency, setCurrency] = useState<string>(settings.currency);
  const [nannyName, setNannyName] = useState<string>(settings.nannyName);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSubmitting(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await updateSettings({
        currentHourlyRate: Number(hourlyRate),
        currency: currency.trim() || '$',
        nannyName: nannyName.trim() || 'Niñera',
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Configuración de NannyPay</h3>
              <p className="text-xs text-stone-500">Tarifa general y datos base</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* CRITICAL NOTICE ACCORDING TO USER REQUIREMENT */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Regla de Historial de Tarifas:</strong>
              Cualquier cambio en el precio por hora{' '}
              <span className="font-semibold underline">solo afectará a los nuevos días registrados</span> a partir de ahora.
              Todos los días pasados en el historial conservan de forma permanente el precio con el que fueron guardados.
            </div>
          </div>

          {/* Current Hourly Rate */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Precio por Hora Activo *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.5"
                required
                disabled={!canEdit}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-base font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-60"
              />
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Tarifa que se asignará por defecto a los nuevos turnos que agregues.
            </span>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Moneda o Símbolo
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="$ o MXN o USD"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-60"
            />
          </div>

          {/* Nanny Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre de la Niñera
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={nannyName}
              onChange={(e) => setNannyName(e.target.value)}
              placeholder="Ej. María Pérez"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-60"
            />
          </div>

          {!canEdit && (
            <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl flex items-center gap-2 text-xs text-stone-600">
              <ShieldAlert className="w-4 h-4 text-stone-500" />
              <span>Tu rol es de Solo Lectura. No puedes cambiar la tarifa configurada.</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cerrar
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Guardado!</span>
                  </>
                ) : submitting ? (
                  'Guardando...'
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

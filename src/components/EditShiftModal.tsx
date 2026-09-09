import React, { useState } from 'react';
import { Shift } from '../types';
import { useApp } from '../context/AppContext';
import { calculateHoursWorked, formatCurrency } from '../lib/dateUtils';
import { X, Clock, Edit2 } from 'lucide-react';

interface EditShiftModalProps {
  shift: Shift | null;
  onClose: () => void;
}

export const EditShiftModal: React.FC<EditShiftModalProps> = ({ shift, onClose }) => {
  const { settings, updateShift } = useApp();

  if (!shift) return null;

  const [date, setDate] = useState<string>(shift.date);
  const [startTime, setStartTime] = useState<string>(shift.startTime);
  const [endTime, setEndTime] = useState<string>(shift.endTime);
  const [breakMinutes, setBreakMinutes] = useState<number>(shift.breakMinutes || 0);
  const [hourlyRate, setHourlyRate] = useState<number>(shift.hourlyRate);
  const [notes, setNotes] = useState<string>(shift.notes || '');
  const [status, setStatus] = useState<'pending' | 'paid'>(shift.status);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { hours, formattedDuration } = calculateHoursWorked(startTime, endTime, breakMinutes);
  const totalAmount = Math.round(hours * (hourlyRate || 0) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift.id) return;
    if (!date || !startTime || !endTime) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }
    if (hours <= 0) {
      setError('Las horas calculadas deben ser mayores a 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateShift(shift.id, {
        date,
        startTime,
        endTime,
        breakMinutes: Number(breakMinutes) || 0,
        hourlyRate: Number(hourlyRate),
        totalAmount,
        hoursWorked: hours,
        notes,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el registro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Editar Día Registrado</h3>
              <p className="text-xs text-stone-500">Modifica los detalles u horas del día</p>
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

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Fecha de Trabajo *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hora de Llegada *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hora de Salida *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Break & Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Descanso (minutos)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Precio por Hora ({settings.currency}) *
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Status radio */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Estado del Pago
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-stone-800 cursor-pointer">
                <input
                  type="radio"
                  name="edit-status"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Pendiente</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-stone-800 cursor-pointer">
                <input
                  type="radio"
                  name="edit-status"
                  value="paid"
                  checked={status === 'paid'}
                  onChange={() => setStatus('paid')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Pagado / Depositado</span>
              </label>
            </div>
          </div>

          {/* Live Calculation Preview Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-600 font-medium block">
                Nuevo cálculo:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-stone-900">
                  {formattedDuration}
                </span>
                <span className="text-xs text-stone-500">
                  ({hours} hrs)
                </span>
                <span className="text-xs text-stone-400">×</span>
                <span className="text-xs font-semibold text-stone-700">
                  {settings.currency}{hourlyRate}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase font-bold tracking-wider text-stone-600 block">
                Total corregido
              </span>
              <span className="text-xl font-extrabold text-stone-900">
                {formatCurrency(totalAmount, settings.currency)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Observaciones o Notas
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Actualizar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

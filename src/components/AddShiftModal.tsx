import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateISO, calculateHoursWorked, formatCurrency } from '../lib/dateUtils';
import { X, Calendar, Clock, DollarSign, FileText, User, Sparkles } from 'lucide-react';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddShiftModal: React.FC<AddShiftModalProps> = ({ isOpen, onClose }) => {
  const { settings, addShift, selectedWeek } = useApp();

  // Default date to today, or if today is not in selectedWeek, default to selectedWeek's startDate
  const todayStr = formatDateISO(new Date());
  const initialDate =
    todayStr >= selectedWeek.startDate && todayStr <= selectedWeek.endDate
      ? todayStr
      : selectedWeek.startDate;

  const [date, setDate] = useState<string>(initialDate);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(settings.currentHourlyRate);
  const [notes, setNotes] = useState<string>('');
  const [nannyName, setNannyName] = useState<string>(settings.nannyName);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const { hours, formattedDuration } = calculateHoursWorked(startTime, endTime, breakMinutes);
  const totalAmount = Math.round(hours * (hourlyRate || 0) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      setError('Por favor completa la fecha y las horas de llegada y salida.');
      return;
    }
    if (hours <= 0) {
      setError('Las horas calculadas deben ser mayores a 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addShift({
        date,
        startTime,
        endTime,
        breakMinutes: Number(breakMinutes) || 0,
        hourlyRate: Number(hourlyRate) || settings.currentHourlyRate,
        notes,
        nannyName,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el día de trabajo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Registrar Día de Niñera</h3>
              <p className="text-xs text-stone-500">Agrega el horario y cálculo para este día</p>
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
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Time Inputs Grid */}
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

          {/* Break time & Hourly rate */}
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
                placeholder="0"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
              <span className="text-[10px] text-stone-500">Se resta de las horas trabajadas</span>
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
              <span className="text-[10px] text-stone-500">
                Se guardará congelado para este día
              </span>
            </div>
          </div>

          {/* Live Calculation Preview Card */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-900 font-medium block">
                Cálculo automático:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-stone-800">
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
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-800 block">
                Total del día
              </span>
              <span className="text-xl font-extrabold text-amber-900">
                {formatCurrency(totalAmount, settings.currency)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Observaciones o Notas (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Cuidó con fiebre, horas extra, etc."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Footer buttons */}
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
              {submitting ? 'Guardando...' : 'Guardar Día'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

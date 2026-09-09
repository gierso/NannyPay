import React from 'react';
import { Shift } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDateHuman, formatCurrency } from '../lib/dateUtils';
import {
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock3,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface ShiftTableProps {
  shifts: Shift[];
  onEditShift: (shift: Shift) => void;
  onOpenAddModal: () => void;
  title?: string;
  emptyMessage?: string;
}

export const ShiftTable: React.FC<ShiftTableProps> = ({
  shifts,
  onEditShift,
  onOpenAddModal,
  title = 'Días Registrados en la Semana',
  emptyMessage = 'No hay días registrados para este período.',
}) => {
  const { settings, deleteShift, toggleShiftStatus } = useApp();
  const { canEdit, isViewer } = useAuth();

  const handleDelete = async (shift: Shift) => {
    if (!shift.id) return;
    const { dayName, formattedDate } = formatDateHuman(shift.date);
    const confirm = window.confirm(
      `¿Estás seguro de eliminar el registro del ${dayName} ${formattedDate}?`
    );
    if (confirm) {
      await deleteShift(shift.id);
    }
  };

  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-8 sm:p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-stone-900 mb-1">
          {emptyMessage}
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mb-6">
          Registra la hora de llegada y salida de la niñera para calcular automáticamente las horas y el monto total a pagar.
        </p>
        {canEdit ? (
          <button
            type="button"
            id="btn-empty-add-shift"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primer Día</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5" />
            Modo solo lectura: Consulta el historial de pagos.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Table Header / Title */}
      <div className="px-4 py-3 sm:px-6 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-900">{title}</h3>
          <p className="text-xs text-stone-600">
            {shifts.length} {shifts.length === 1 ? 'día registrado' : 'días registrados'} con tarifa individual congelada
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            id="btn-table-add-shift"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Día</span>
          </button>
        )}
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Día / Fecha</th>
              <th className="py-3 px-4">Horario</th>
              <th className="py-3 px-4 text-center">Horas</th>
              <th className="py-3 px-4 text-right">Tarifa Aplicada</th>
              <th className="py-3 px-4 text-right">Total a Pagar</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4">Observaciones</th>
              {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {shifts.map((shift) => {
              const { dayName, formattedDate } = formatDateHuman(shift.date);
              const isPaid = shift.status === 'paid';

              return (
                <tr
                  key={shift.id || shift.date}
                  className="hover:bg-stone-50/70 transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-stone-900">{dayName}</div>
                    <div className="text-[11px] text-stone-600">{formattedDate}</div>
                  </td>

                  {/* Arrival & Departure */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-600" />
                      <span>{shift.startTime}</span>
                      <span className="text-stone-600">→</span>
                      <span>{shift.endTime}</span>
                    </div>
                    {shift.breakMinutes && shift.breakMinutes > 0 ? (
                      <span className="text-[10px] text-stone-600">
                        (-{shift.breakMinutes} min descanso)
                      </span>
                    ) : null}
                  </td>

                  {/* Hours Worked */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-xs">
                      {shift.hoursWorked} hrs
                    </span>
                  </td>

                  {/* Hourly Rate (Frozen at creation time) */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="font-semibold text-stone-700">
                      {settings.currency}{shift.hourlyRate}/h
                    </div>
                    {shift.hourlyRate !== settings.currentHourlyRate && (
                      <span className="text-[10px] text-amber-600" title="Tarifa histórica o personalizada del día">
                        Histórico
                      </span>
                    )}
                  </td>

                  {/* Total Amount */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="text-sm font-extrabold text-stone-900">
                      {formatCurrency(shift.totalAmount, settings.currency)}
                    </span>
                  </td>

                  {/* Status (Clickable toggle if canEdit) */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleShiftStatus(shift)}
                      title={canEdit ? 'Haz clic para alternar estado' : undefined}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      } ${canEdit ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'}`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Depositado</span>
                        </>
                      ) : (
                        <>
                          <Clock3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pendiente</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Notes */}
                  <td className="py-3.5 px-4 max-w-[180px] truncate text-stone-600">
                    {shift.notes ? (
                      <span className="text-xs" title={shift.notes}>
                        {shift.notes}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  {canEdit && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditShift(shift)}
                          title="Editar día"
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(shift)}
                          title="Eliminar día"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {/* Table Footer Totals */}
          <tfoot>
            <tr className="bg-stone-50 border-t-2 border-stone-200 font-bold text-stone-900">
              <td className="py-3 px-4" colSpan={2}>
                Total de la tabla ({shifts.length} {shifts.length === 1 ? 'día' : 'días'})
              </td>
              <td className="py-3 px-4 text-center">
                {Math.round(shifts.reduce((acc, s) => acc + s.hoursWorked, 0) * 100) / 100} hrs
              </td>
              <td className="py-3 px-4 text-right text-stone-500 font-normal">
                Subtotal
              </td>
              <td className="py-3 px-4 text-right text-base text-amber-700 font-extrabold">
                {formatCurrency(
                  shifts.reduce((acc, s) => acc + s.totalAmount, 0),
                  settings.currency
                )}
              </td>
              <td colSpan={canEdit ? 3 : 2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

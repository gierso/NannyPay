import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/dateUtils';
import {
  DollarSign,
  Clock,
  CalendarCheck,
  Plus,
  CheckCircle2,
  Share2,
  AlertCircle,
} from 'lucide-react';

interface WeeklySummaryProps {
  onOpenAddModal: () => void;
  onOpenShareModal: () => void;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  onOpenAddModal,
  onOpenShareModal,
}) => {
  const { currentWeekSummary, currentWeekShifts, settings, markWeekAsPaid } = useApp();
  const { canEdit } = useAuth();

  const hasPendingShifts = currentWeekShifts.some((s) => s.status === 'pending');
  const allPaid = currentWeekShifts.length > 0 && !hasPendingShifts;

  const handleMarkAllPaid = async () => {
    if (!hasPendingShifts) return;
    const confirm = window.confirm(
      `¿Deseas marcar todos los días pendientes de esta semana (${formatCurrency(
        currentWeekSummary.pendingAmount,
        settings.currency
      )}) como pagados/depositados?`
    );
    if (confirm) {
      await markWeekAsPaid(currentWeekShifts);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Weekly Pay */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Total Semana
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {formatCurrency(currentWeekSummary.totalAmount, settings.currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
            <span>
              Pendiente:{' '}
              <strong className="text-amber-700 font-semibold">
                {formatCurrency(currentWeekSummary.pendingAmount, settings.currency)}
              </strong>
            </span>
            <span>
              Pagado:{' '}
              <strong className="text-emerald-700 font-semibold">
                {formatCurrency(currentWeekSummary.paidAmount, settings.currency)}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 2: Hours Worked */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Horas Trabajadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {currentWeekSummary.totalHours}{' '}
              <span className="text-base font-normal text-stone-600">hrs</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
            En base a horarios de llegada y salida
          </p>
        </div>

        {/* Card 3: Days Logged */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Días Trabajados
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {currentWeekSummary.totalShifts}{' '}
              <span className="text-base font-normal text-stone-600">
                {currentWeekSummary.totalShifts === 1 ? 'día' : 'días'}
              </span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs pt-2 border-t border-stone-100">
            {allPaid ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Semana 100% liquidada
              </span>
            ) : hasPendingShifts ? (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Por depositar al cierre
              </span>
            ) : (
              <span className="text-stone-600">Sin registros esta semana</span>
            )}
          </div>
        </div>

        {/* Card 4: Base Rate */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Tarifa Activa
            </span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <span className="text-xs font-bold">{settings.currency}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {settings.currency}
              {settings.currentHourlyRate}{' '}
              <span className="text-base font-normal text-stone-600">/hr</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] text-stone-600 pt-2 border-t border-stone-100 truncate">
            Para la niñera: <span className="font-medium text-stone-800">{settings.nannyName}</span>
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 bg-stone-50 rounded-xl border border-stone-200">
        <div className="text-xs sm:text-sm text-stone-600">
          {currentWeekShifts.length === 0 ? (
            <span>No hay días registrados para esta semana. Haz clic en "Registrar Día".</span>
          ) : (
            <span>
              Total a depositar:{' '}
              <strong className="text-stone-900 font-bold">
                {formatCurrency(currentWeekSummary.pendingAmount, settings.currency)}
              </strong>{' '}
              ({currentWeekSummary.totalHours} hrs acumuladas)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Share button */}
          {currentWeekShifts.length > 0 && (
            <button
              type="button"
              id="btn-share-week-summary"
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-colors shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span>Enviar Resumen / WhatsApp</span>
            </button>
          )}

          {/* Mark week as paid */}
          {canEdit && hasPendingShifts && (
            <button
              type="button"
              id="btn-mark-week-paid"
              onClick={handleMarkAllPaid}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Marcar Semana Depositada</span>
            </button>
          )}

          {/* Add Shift Button */}
          {canEdit && (
            <button
              type="button"
              id="btn-add-shift-main"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Día</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

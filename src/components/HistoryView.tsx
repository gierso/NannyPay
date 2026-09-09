import React, { useState, useMemo } from 'react';
import { Shift } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateHuman, getWeekPeriod } from '../lib/dateUtils';
import {
  History,
  Search,
  Filter,
  DollarSign,
  Clock,
  Calendar,
  CheckCircle2,
  Clock3,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';

interface HistoryViewProps {
  onEditShift: (shift: Shift) => void;
  onSelectWeek: (weekKey: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onEditShift,
  onSelectWeek,
}) => {
  const { shifts, settings, toggleShiftStatus } = useApp();
  const { canEdit } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Group shifts by weekKey
  const groupedByWeek = useMemo(() => {
    const map = new Map<string, Shift[]>();

    const filtered = shifts.filter((shift) => {
      const matchesStatus =
        statusFilter === 'all' ? true : shift.status === statusFilter;
      const matchesSearch =
        searchTerm === ''
          ? true
          : (shift.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              shift.date.includes(searchTerm) ||
              shift.nannyName?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });

    for (const shift of filtered) {
      const key = shift.weekKey || 'other';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(shift);
    }

    // Sort weeks descending
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [shifts, searchTerm, statusFilter]);

  // Overall statistics
  const overallStats = useMemo(() => {
    let totalPay = 0;
    let totalHours = 0;
    let pendingPay = 0;
    let paidPay = 0;

    for (const s of shifts) {
      totalPay += s.totalAmount;
      totalHours += s.hoursWorked;
      if (s.status === 'paid') paidPay += s.totalAmount;
      else pendingPay += s.totalAmount;
    }

    return {
      totalPay: Math.round(totalPay * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      pendingPay: Math.round(pendingPay * 100) / 100,
      paidPay: Math.round(paidPay * 100) / 100,
      totalShifts: shifts.length,
    };
  }, [shifts]);

  return (
    <div className="space-y-6">
      {/* Historical Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 block">
            Total Histórico Pagado / Por Pagar
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900">
            {formatCurrency(overallStats.totalPay, settings.currency)}
          </div>
          <p className="mt-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
            Suma de todos los registros históricos
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 block">
            Saldo Pendiente por Depositar
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-700">
            {formatCurrency(overallStats.pendingPay, settings.currency)}
          </div>
          <p className="mt-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
            Días marcados como pendientes
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 block">
            Total Horas Acumuladas
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900">
            {overallStats.totalHours} <span className="text-base font-normal text-stone-600">hrs</span>
          </div>
          <p className="mt-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
            En {overallStats.totalShifts} días de trabajo
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 block">
            Total Ya Depositado
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700">
            {formatCurrency(overallStats.paidPay, settings.currency)}
          </div>
          <p className="mt-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
            Historial de transferencias realizadas
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-600 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por notas o fecha..."
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-stone-600 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Estado:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Todos ({shifts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Depositados
          </button>
        </div>
      </div>

      {/* Weeks Grouped Accordion / List */}
      {groupedByWeek.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-xs">
          <History className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            No se encontraron registros en el historial
          </h3>
          <p className="text-xs text-stone-600">
            Intenta cambiar los filtros de búsqueda o registra días en la vista de Semana Actual.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByWeek.map(([weekKey, weekShifts]) => {
            const [y, m, d] = weekKey.split('-').map(Number);
            const weekPeriod = getWeekPeriod(new Date(y, m - 1, d));
            const weekTotal = weekShifts.reduce((acc, s) => acc + s.totalAmount, 0);
            const weekHours = weekShifts.reduce((acc, s) => acc + s.hoursWorked, 0);
            const hasPending = weekShifts.some((s) => s.status === 'pending');

            return (
              <div
                key={weekKey}
                className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden"
              >
                {/* Week Header */}
                <div className="p-4 bg-stone-50/90 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-xs">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">
                        {weekPeriod.label}
                      </h4>
                      <div className="text-[11px] text-stone-600 flex items-center gap-2">
                        <span>{weekShifts.length} {weekShifts.length === 1 ? 'día' : 'días'}</span>
                        <span>•</span>
                        <span>{Math.round(weekHours * 100) / 100} hrs trabajadas</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600 block">
                        Total Semana
                      </span>
                      <span className="text-base font-extrabold text-stone-900">
                        {formatCurrency(weekTotal, settings.currency)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectWeek(weekKey)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 transition-colors shadow-xs"
                    >
                      <span>Ver Semana</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
                    </button>
                  </div>
                </div>

                {/* Shifts inside this week */}
                <div className="divide-y divide-stone-100">
                  {weekShifts.map((shift) => {
                    const { dayName, formattedDate } = formatDateHuman(shift.date);
                    return (
                      <div
                        key={shift.id || shift.date}
                        className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50/50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-24">
                            <span className="font-bold text-stone-900 block">{dayName}</span>
                            <span className="text-[11px] text-stone-600">{formattedDate}</span>
                          </div>

                          <div className="flex items-center gap-2 text-stone-700">
                            <Clock className="w-3.5 h-3.5 text-stone-600" />
                            <span>
                              {shift.startTime} → {shift.endTime}
                            </span>
                            <span className="font-bold px-2 py-0.5 rounded-sm bg-stone-100 text-stone-800 text-[11px]">
                              {shift.hoursWorked} hrs
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          {/* Frozen Rate Indicator */}
                          <div className="text-stone-600 text-[11px]">
                            Tarifa:{' '}
                            <strong className="text-stone-800">
                              {settings.currency}{shift.hourlyRate}/h
                            </strong>
                          </div>

                          {/* Shift Total */}
                          <div className="text-right">
                            <span className="font-bold text-stone-900 text-sm">
                              {formatCurrency(shift.totalAmount, settings.currency)}
                            </span>
                          </div>

                          {/* Status */}
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => toggleShiftStatus(shift)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                              shift.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {shift.status === 'paid' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Depositado</span>
                              </>
                            ) : (
                              <>
                                <Clock3 className="w-3 h-3 text-amber-600" />
                                <span>Pendiente</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from 'lucide-react';
import { getWeekPeriod } from '../lib/dateUtils';

export const WeekNavigator: React.FC = () => {
  const { selectedWeek, goToPreviousWeek, goToNextWeek, goToCurrentWeek } = useApp();

  const currentCalendarWeek = getWeekPeriod(new Date());
  const isCurrentWeek = selectedWeek.weekKey === currentCalendarWeek.weekKey;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Week Title & Period */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
          <CalendarDays className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Período de Nómina
            </span>
            {isCurrentWeek && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                Semana en curso
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            {selectedWeek.label}
          </h2>
        </div>
      </div>

      {/* Week Navigation Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {!isCurrentWeek && (
          <button
            type="button"
            id="btn-go-current-week"
            onClick={goToCurrentWeek}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Volver a hoy</span>
          </button>
        )}

        <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50">
          <button
            type="button"
            id="btn-prev-week"
            onClick={goToPreviousWeek}
            aria-label="Semana anterior"
            className="p-1.5 rounded-md hover:bg-white text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="btn-next-week"
            onClick={goToNextWeek}
            aria-label="Semana siguiente"
            className="p-1.5 rounded-md hover:bg-white text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

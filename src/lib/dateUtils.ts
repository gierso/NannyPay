import { WeekPeriod } from '../types';

/**
 * Format date to YYYY-MM-DD in local time
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get Monday and Sunday for the given reference date
 */
export function getWeekPeriod(referenceDate: Date = new Date()): WeekPeriod {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startDateStr = formatDateISO(monday);
  const endDateStr = formatDateISO(sunday);
  
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const mStart = monthNames[monday.getMonth()];
  const mEnd = monthNames[sunday.getMonth()];
  const yStart = monday.getFullYear();
  const yEnd = sunday.getFullYear();

  let label = '';
  if (yStart === yEnd) {
    if (mStart === mEnd) {
      label = `${monday.getDate()} al ${sunday.getDate()} de ${mStart} ${yStart}`;
    } else {
      label = `${monday.getDate()} ${mStart} al ${sunday.getDate()} ${mEnd} ${yStart}`;
    }
  } else {
    label = `${monday.getDate()} ${mStart} ${yStart} al ${sunday.getDate()} ${mEnd} ${yEnd}`;
  }

  return {
    weekKey: startDateStr,
    startDate: startDateStr,
    endDate: endDateStr,
    label,
  };
}

/**
 * Get week key (Monday ISO string) for any specific date
 */
export function getWeekKeyForDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return getWeekPeriod(date).weekKey;
}

/**
 * Calculate hours worked between startTime and endTime (format "HH:mm")
 * Supports break minutes deduction.
 * Supports overnight shifts if endTime < startTime.
 */
export function calculateHoursWorked(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): { hours: number; formattedDuration: string } {
  if (!startTime || !endTime) {
    return { hours: 0, formattedDuration: '0h 00m' };
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (
    isNaN(startH) ||
    isNaN(startM) ||
    isNaN(endH) ||
    isNaN(endM)
  ) {
    return { hours: 0, formattedDuration: '0h 00m' };
  }

  let startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  // Overnight shift handling (e.g. 21:00 to 05:00)
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const netMinutes = Math.max(0, endTotalMinutes - startTotalMinutes - (breakMinutes || 0));
  const rawHours = netMinutes / 60;
  // Round to 2 decimal places
  const roundedHours = Math.round(rawHours * 100) / 100;

  const displayHours = Math.floor(netMinutes / 60);
  const displayMinutes = netMinutes % 60;
  const formattedDuration = `${displayHours}h ${String(displayMinutes).padStart(2, '0')}m`;

  return {
    hours: roundedHours,
    formattedDuration,
  };
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string = '$'): string {
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currency} ${formatted}`;
}

/**
 * Format date in Spanish for tables and details (e.g. "Lunes 07 Sep")
 */
export function formatDateHuman(dateStr: string): { dayName: string; formattedDate: string } {
  if (!dateStr) return { dayName: '', formattedDate: '' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const dayName = days[date.getDay()];
  const formattedDate = `${d} de ${months[date.getMonth()]}`;

  return { dayName, formattedDate };
}

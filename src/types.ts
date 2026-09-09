export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppSettings {
  currentHourlyRate: number;
  currency: string;
  nannyName: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Shift {
  id?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes?: number; // default 0
  hoursWorked: number; // calculated decimal, e.g. 8.5
  hourlyRate: number; // rate frozen at creation time
  totalAmount: number; // hoursWorked * hourlyRate
  nannyName?: string;
  notes?: string;
  status: 'pending' | 'paid';
  paidAt?: string;
  weekKey: string; // e.g. "2026-W37" or Monday date "2026-09-07"
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeekPeriod {
  weekKey: string;
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  label: string; // e.g. "7 - 13 de Septiembre, 2026"
}

export interface WeekSummary {
  totalHours: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  totalShifts: number;
}

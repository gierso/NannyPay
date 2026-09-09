import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AppSettings, Shift, WeekPeriod, WeekSummary } from '../types';
import { getWeekPeriod, getWeekKeyForDate, calculateHoursWorked } from '../lib/dateUtils';
import { useAuth } from './AuthContext';

interface AppContextType {
  settings: AppSettings;
  shifts: Shift[];
  loadingShifts: boolean;
  selectedWeek: WeekPeriod;
  setSelectedWeek: (week: WeekPeriod) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  currentWeekShifts: Shift[];
  currentWeekSummary: WeekSummary;
  addShift: (data: {
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    hourlyRate?: number;
    notes?: string;
    nannyName?: string;
  }) => Promise<void>;
  updateShift: (shiftId: string, data: Partial<Shift>) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  markWeekAsPaid: (weekShifts: Shift[]) => Promise<void>;
  toggleShiftStatus: (shift: Shift) => Promise<void>;
  allUsersList: { uid: string; email: string; displayName: string; role: string; photoURL?: string }[];
  updateUserRole: (uid: string, newRole: 'admin' | 'editor' | 'viewer') => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  currentHourlyRate: 100, // e.g. 100 pesos/usd
  currency: '$',
  nannyName: 'Niñera',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, canEdit, isAdmin } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(true);
  const [selectedWeek, setSelectedWeek] = useState<WeekPeriod>(getWeekPeriod(new Date()));
  const [allUsersList, setAllUsersList] = useState<{ uid: string; email: string; displayName: string; role: string; photoURL?: string }[]>([]);

  // 1. Listen to global settings
  useEffect(() => {
    if (!currentUser) return;

    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(
      settingsRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          setSettings({
            currentHourlyRate: Number(data.currentHourlyRate) || 100,
            currency: data.currency || '$',
            nannyName: data.nannyName || 'Niñera',
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
        } else {
          // Initialize default settings doc if missing and user can edit
          if (canEdit) {
            try {
              await setDoc(settingsRef, {
                ...DEFAULT_SETTINGS,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.email,
              });
            } catch (err) {
              console.warn('Could not initialize settings document:', err);
            }
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/config');
      }
    );

    return () => unsubscribe();
  }, [currentUser, canEdit]);

  // 2. Listen to shifts
  useEffect(() => {
    if (!currentUser) {
      setShifts([]);
      setLoadingShifts(false);
      return;
    }

    setLoadingShifts(true);
    const shiftsQuery = query(collection(db, 'shifts'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        const items: Shift[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            breakMinutes: data.breakMinutes || 0,
            hoursWorked: Number(data.hoursWorked) || 0,
            hourlyRate: Number(data.hourlyRate) || 0,
            totalAmount: Number(data.totalAmount) || 0,
            nannyName: data.nannyName || 'Niñera',
            notes: data.notes || '',
            status: data.status || 'pending',
            paidAt: data.paidAt,
            weekKey: data.weekKey || getWeekKeyForDate(data.date),
            createdBy: data.createdBy || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setShifts(items);
        setLoadingShifts(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'shifts');
        setLoadingShifts(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Listen to all registered users (for admin user management)
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const users: { uid: string; email: string; displayName: string; role: string; photoURL?: string }[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          users.push({
            uid: docSnap.id,
            email: d.email || '',
            displayName: d.displayName || 'Usuario',
            role: d.role || 'viewer',
            photoURL: d.photoURL,
          });
        });
        setAllUsersList(users);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  // Navigation functions for weeks
  const goToPreviousWeek = () => {
    const [y, m, d] = selectedWeek.startDate.split('-').map(Number);
    const currMonday = new Date(y, m - 1, d);
    currMonday.setDate(currMonday.getDate() - 7);
    setSelectedWeek(getWeekPeriod(currMonday));
  };

  const goToNextWeek = () => {
    const [y, m, d] = selectedWeek.startDate.split('-').map(Number);
    const currMonday = new Date(y, m - 1, d);
    currMonday.setDate(currMonday.getDate() + 7);
    setSelectedWeek(getWeekPeriod(currMonday));
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(getWeekPeriod(new Date()));
  };

  // Filter shifts for currently selected week
  const currentWeekShifts = useMemo(() => {
    return shifts
      .filter((s) => s.weekKey === selectedWeek.weekKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shifts, selectedWeek.weekKey]);

  // Summary for selected week
  const currentWeekSummary = useMemo<WeekSummary>(() => {
    let totalHours = 0;
    let totalAmount = 0;
    let pendingAmount = 0;
    let paidAmount = 0;

    for (const shift of currentWeekShifts) {
      totalHours += shift.hoursWorked;
      totalAmount += shift.totalAmount;
      if (shift.status === 'paid') {
        paidAmount += shift.totalAmount;
      } else {
        pendingAmount += shift.totalAmount;
      }
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      totalShifts: currentWeekShifts.length,
    };
  }, [currentWeekShifts]);

  // Actions
  const addShift = async (data: {
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    hourlyRate?: number;
    notes?: string;
    nannyName?: string;
  }) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para registrar días.');
    }

    const { hours } = calculateHoursWorked(data.startTime, data.endTime, data.breakMinutes || 0);
    // VITAL REQUIREMENT: The hourly rate is frozen into this shift item at the time of creation
    const rateToApply = data.hourlyRate !== undefined ? data.hourlyRate : settings.currentHourlyRate;
    const totalAmount = Math.round(hours * rateToApply * 100) / 100;
    const weekKey = getWeekKeyForDate(data.date);

    const shiftPayload = {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes || 0,
      hoursWorked: hours,
      hourlyRate: rateToApply, // Frozen rate for this shift
      totalAmount,
      nannyName: data.nannyName?.trim() || settings.nannyName,
      notes: data.notes?.trim() || '',
      status: 'pending',
      weekKey,
      createdBy: currentUser.email || currentUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    };

    const newDocRef = doc(collection(db, 'shifts'));
    try {
      await setDoc(newDocRef, shiftPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shifts');
    }
  };

  const updateShift = async (shiftId: string, data: Partial<Shift>) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para modificar este registro.');
    }

    const existing = shifts.find((s) => s.id === shiftId);
    if (!existing) return;

    const updatedDate = data.date || existing.date;
    const updatedStart = data.startTime || existing.startTime;
    const updatedEnd = data.endTime || existing.endTime;
    const updatedBreak = data.breakMinutes !== undefined ? data.breakMinutes : existing.breakMinutes;
    const updatedRate = data.hourlyRate !== undefined ? data.hourlyRate : existing.hourlyRate;

    const { hours } = calculateHoursWorked(updatedStart, updatedEnd, updatedBreak);
    const totalAmount = Math.round(hours * updatedRate * 100) / 100;
    const weekKey = getWeekKeyForDate(updatedDate);

    const updatePayload: Record<string, any> = {
      ...data,
      date: updatedDate,
      startTime: updatedStart,
      endTime: updatedEnd,
      breakMinutes: updatedBreak,
      hoursWorked: hours,
      hourlyRate: updatedRate,
      totalAmount,
      weekKey,
      updatedAt: new Date().toISOString(),
    };

    const shiftRef = doc(db, 'shifts', shiftId);
    try {
      await updateDoc(shiftRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shifts/${shiftId}`);
    }
  };

  const deleteShift = async (shiftId: string) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para eliminar este registro.');
    }

    const shiftRef = doc(db, 'shifts', shiftId);
    try {
      await deleteDoc(shiftRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shifts/${shiftId}`);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para modificar la configuración.');
    }

    const settingsRef = doc(db, 'settings', 'config');
    const payload = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email || currentUser.uid,
    };

    try {
      await setDoc(settingsRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/config');
    }
  };

  const markWeekAsPaid = async (weekShifts: Shift[]) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para marcar pagos.');
    }

    const now = new Date().toISOString();
    for (const shift of weekShifts) {
      if (shift.id && shift.status !== 'paid') {
        const shiftRef = doc(db, 'shifts', shift.id);
        try {
          await updateDoc(shiftRef, {
            status: 'paid',
            paidAt: now,
            updatedAt: now,
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `shifts/${shift.id}`);
        }
      }
    }
  };

  const toggleShiftStatus = async (shift: Shift) => {
    if (!currentUser || !canEdit || !shift.id) return;
    const newStatus = shift.status === 'paid' ? 'pending' : 'paid';
    const shiftRef = doc(db, 'shifts', shift.id);
    try {
      await updateDoc(shiftRef, {
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shifts/${shift.id}`);
    }
  };

  const updateUserRole = async (uid: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!currentUser || !isAdmin) {
      throw new Error('Solo los administradores pueden cambiar roles de usuario.');
    }

    const targetUserRef = doc(db, 'users', uid);
    try {
      await updateDoc(targetUserRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        shifts,
        loadingShifts,
        selectedWeek,
        setSelectedWeek,
        goToPreviousWeek,
        goToNextWeek,
        goToCurrentWeek,
        currentWeekShifts,
        currentWeekSummary,
        addShift,
        updateShift,
        deleteShift,
        updateSettings,
        markWeekAsPaid,
        toggleShiftStatus,
        allUsersList,
        updateUserRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

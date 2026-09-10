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

const LOCAL_STORAGE_SHIFTS_KEY = 'nannypay_shifts_cache';
const LOCAL_STORAGE_SETTINGS_KEY = 'nannypay_settings_cache';

const getInitialLocalShifts = (): Shift[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SHIFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveShiftsToLocalStorage = (shiftsToSave: Shift[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_SHIFTS_KEY, JSON.stringify(shiftsToSave));
  } catch (e) {
    console.debug('Error saving local shifts cache:', e);
  }
};

const getInitialLocalSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettingsToLocalStorage = (newSettings: AppSettings) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
  } catch (e) {
    console.debug('Error saving local settings cache:', e);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, canEdit, isAdmin } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getInitialLocalSettings);
  const [shifts, setShifts] = useState<Shift[]>(getInitialLocalShifts);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekPeriod>(getWeekPeriod(new Date()));
  const [allUsersList, setAllUsersList] = useState<{ uid: string; email: string; displayName: string; role: string; photoURL?: string }[]>([]);

  // 1. Listen to global settings
  useEffect(() => {
    if (!currentUser) return;

    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          const merged: AppSettings = {
            currentHourlyRate: Number(data.currentHourlyRate) || 100,
            currency: data.currency || '$',
            nannyName: data.nannyName || 'Niñera',
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          };
          setSettings(merged);
          saveSettingsToLocalStorage(merged);
        } else {
          // Initialize default settings doc if missing and user can edit
          if (canEdit) {
            setDoc(settingsRef, {
              ...DEFAULT_SETTINGS,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.email,
            }).catch((err) => console.debug('Could not initialize settings document:', err));
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
      return;
    }

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

        setShifts((prevLocal) => {
          // Merge remote cloud items with any local items that might not have reached cloud yet
          const map = new Map<string, Shift>();
          prevLocal.forEach((s) => map.set(s.id, s));
          items.forEach((s) => map.set(s.id, s));
          const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
          saveShiftsToLocalStorage(merged);
          return merged;
        });
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

    // Generate real Firestore document reference ID
    const newDocRef = doc(collection(db, 'shifts'));
    const shiftId = newDocRef.id;

    const newShift: Shift = {
      id: shiftId,
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
    };

    // 1. UPDATE LOCAL STATE AND STORAGE IMMEDIATELY (0ms latency, zero freezing)
    setShifts((prev) => {
      const updated = [newShift, ...prev.filter((s) => s.id !== shiftId)];
      saveShiftsToLocalStorage(updated);
      return updated;
    });

    // 2. BACKGROUND CLOUD SYNC (Non-blocking)
    setDoc(newDocRef, {
      ...newShift,
      serverTimestamp: serverTimestamp(),
    }).catch((error) => {
      console.warn('Background shift sync notice (saved locally):', error);
    });
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

    const updatedShift: Shift = {
      ...existing,
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

    // 1. UPDATE LOCAL STATE IMMEDIATELY
    setShifts((prev) => {
      const updated = prev.map((s) => (s.id === shiftId ? updatedShift : s));
      saveShiftsToLocalStorage(updated);
      return updated;
    });

    // 2. BACKGROUND CLOUD SYNC
    const shiftRef = doc(db, 'shifts', shiftId);
    updateDoc(shiftRef, {
      ...updatedShift,
      updatedAt: new Date().toISOString(),
    }).catch((error) => {
      console.warn('Background update sync notice:', error);
    });
  };

  const deleteShift = async (shiftId: string) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para eliminar este registro.');
    }

    // 1. Remove from local state immediately
    setShifts((prev) => {
      const updated = prev.filter((s) => s.id !== shiftId);
      saveShiftsToLocalStorage(updated);
      return updated;
    });

    // 2. BACKGROUND CLOUD SYNC
    const shiftRef = doc(db, 'shifts', shiftId);
    deleteDoc(shiftRef).catch((error) => {
      console.warn('Background delete sync notice:', error);
    });
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para modificar la configuración.');
    }

    const payload: AppSettings = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email || currentUser.uid,
    };

    // 1. Save locally immediately
    setSettings(payload);
    saveSettingsToLocalStorage(payload);

    // 2. Background cloud sync
    const settingsRef = doc(db, 'settings', 'config');
    setDoc(settingsRef, payload, { merge: true }).catch((error) => {
      console.warn('Background settings sync notice:', error);
    });
  };

  const markWeekAsPaid = async (weekShifts: Shift[]) => {
    if (!currentUser || !canEdit) {
      throw new Error('No tienes permisos para marcar pagos.');
    }

    const now = new Date().toISOString();
    const paidIds = new Set(weekShifts.map((s) => s.id));

    // 1. Update locally immediately
    setShifts((prev) => {
      const updated = prev.map((s) =>
        paidIds.has(s.id) && s.status !== 'paid' ? { ...s, status: 'paid' as const, paidAt: now, updatedAt: now } : s
      );
      saveShiftsToLocalStorage(updated);
      return updated;
    });

    // 2. Background sync
    for (const shift of weekShifts) {
      if (shift.id && shift.status !== 'paid') {
        const shiftRef = doc(db, 'shifts', shift.id);
        updateDoc(shiftRef, {
          status: 'paid',
          paidAt: now,
          updatedAt: now,
        }).catch((err) => console.warn('Sync paid status notice:', err));
      }
    }
  };

  const toggleShiftStatus = async (shift: Shift) => {
    if (!currentUser || !canEdit || !shift.id) return;
    const newStatus = shift.status === 'paid' ? 'pending' : 'paid';
    const now = new Date().toISOString();

    // 1. Update locally immediately
    setShifts((prev) => {
      const updated = prev.map((s) =>
        s.id === shift.id
          ? { ...s, status: newStatus as 'pending' | 'paid', paidAt: newStatus === 'paid' ? now : null, updatedAt: now }
          : s
      );
      saveShiftsToLocalStorage(updated);
      return updated;
    });

    // 2. Background sync
    const shiftRef = doc(db, 'shifts', shift.id);
    updateDoc(shiftRef, {
      status: newStatus,
      paidAt: newStatus === 'paid' ? now : null,
      updatedAt: now,
    }).catch((err) => console.warn('Sync toggle status notice:', err));
  };

  const updateUserRole = async (uid: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!currentUser || !isAdmin) {
      throw new Error('Solo los administradores pueden cambiar roles de usuario.');
    }

    setAllUsersList((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
    );

    const targetUserRef = doc(db, 'users', uid);
    updateDoc(targetUserRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    }).catch((error) => {
      console.warn('Background user role sync notice:', error);
    });
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

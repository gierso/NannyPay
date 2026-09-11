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
import { AppSettings, Shift, WeekPeriod, WeekSummary, UserRole } from '../types';
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
  allUsersList: AppUserItem[];
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
  addOrInviteUser: (user: { email: string; displayName: string; role: UserRole }) => Promise<void>;
}

export interface AppUserItem {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  isPreAuthorized?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  currentHourlyRate: 100, // default fallback
  currency: '$',
  nannyName: 'Niñera',
};

const LOCAL_STORAGE_SHIFTS_KEY = 'nannypay_shifts_cache';
const LOCAL_STORAGE_SETTINGS_KEY = 'nannypay_settings_cache';
const LOCAL_STORAGE_USERS_KEY = 'nannypay_users_cache';

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
    if (raw) {
      const parsed = JSON.parse(raw);
      const parsedRate = typeof parsed.currentHourlyRate === 'number'
        ? parsed.currentHourlyRate
        : Number(parsed.currentHourlyRate);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        currentHourlyRate: !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : DEFAULT_SETTINGS.currentHourlyRate,
      };
    }
    return DEFAULT_SETTINGS;
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

const getInitialLocalUsers = (): AppUserItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveUsersToLocalStorage = (users: AppUserItem[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.debug('Error saving local users cache:', e);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, canEdit, isAdmin, userProfile } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getInitialLocalSettings);
  const [shifts, setShifts] = useState<Shift[]>(getInitialLocalShifts);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekPeriod>(getWeekPeriod(new Date()));
  const [allUsersList, setAllUsersList] = useState<AppUserItem[]>(getInitialLocalUsers);

  // Guarantee current logged in user is in allUsersList immediately
  useEffect(() => {
    if (!currentUser) return;
    const cleanEmail = currentUser.email?.toLowerCase().trim() || '';
    const isMaster = cleanEmail === 'gierso@gmail.com';

    setAllUsersList((prev) => {
      const map = new Map<string, AppUserItem>();
      prev.forEach((u) => {
        if (u.email) map.set(u.email.toLowerCase().trim(), u);
      });

      const existing = map.get(cleanEmail);
      const userItem: AppUserItem = {
        uid: currentUser.uid,
        email: cleanEmail,
        displayName: existing?.displayName || currentUser.displayName || cleanEmail.split('@')[0] || 'Usuario',
        role: isMaster ? 'admin' : (existing?.role || userProfile?.role || 'viewer'),
        photoURL: currentUser.photoURL || existing?.photoURL || undefined,
      };

      map.set(cleanEmail, userItem);
      const merged = Array.from(map.values());
      saveUsersToLocalStorage(merged);
      return merged;
    });
  }, [currentUser, userProfile]);

  // 1. Listen to global settings (with robust conflict resolution)
  useEffect(() => {
    if (!currentUser) return;

    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          const currentLocal = getInitialLocalSettings();

          // Compare timestamps to prevent older server data from clobbering user's latest rate change
          const localUpdated = currentLocal.updatedAt ? new Date(currentLocal.updatedAt).getTime() : 0;
          const remoteUpdated = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

          if (localUpdated > remoteUpdated) {
            // Local change is more recent: keep local and sync to Firestore
            setDoc(settingsRef, currentLocal, { merge: true }).catch((e) =>
              console.debug('Syncing newer local settings to cloud:', e)
            );
            return;
          }

          const rate = typeof data.currentHourlyRate === 'number'
            ? data.currentHourlyRate
            : Number(data.currentHourlyRate);

          const merged: AppSettings = {
            currentHourlyRate: !isNaN(rate) && rate > 0 ? rate : currentLocal.currentHourlyRate,
            currency: data.currency || currentLocal.currency || '$',
            nannyName: data.nannyName || currentLocal.nannyName || 'Niñera',
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          };
          setSettings(merged);
          saveSettingsToLocalStorage(merged);
        } else {
          // Document does not exist in Firestore: seed with current local settings
          const currentLocal = getInitialLocalSettings();
          setDoc(settingsRef, {
            ...currentLocal,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email || 'system',
          }).catch((err) => console.debug('Could not initialize settings document:', err));
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

  // 3. Listen to all registered users (for family user management and sharing)
  useEffect(() => {
    if (!currentUser) return;

    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const remoteUsers: AppUserItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const email = (d.email || '').toLowerCase().trim();
          if (!email) return;

          remoteUsers.push({
            uid: docSnap.id,
            email,
            displayName: d.displayName || email.split('@')[0] || 'Usuario',
            role: (email === 'gierso@gmail.com' ? 'admin' : (d.role || 'viewer')) as UserRole,
            photoURL: d.photoURL,
            isPreAuthorized: d.isPreAuthorized || false,
          });
        });

        setAllUsersList((prevLocal) => {
          const map = new Map<string, AppUserItem>();

          // 1. Start with previous local cache
          prevLocal.forEach((u) => {
            if (u.email) {
              map.set(u.email.toLowerCase().trim(), u);
            }
          });

          // 2. Merge remote users, deduplicating invites vs real Google profiles
          remoteUsers.forEach((ru) => {
            const emailKey = ru.email.toLowerCase().trim();
            const existing = map.get(emailKey);
            if (!existing) {
              map.set(emailKey, ru);
            } else {
              const isInvite = ru.uid.startsWith('invite_');
              // If we have a real UID, prefer it over an invite_ placeholder
              const finalUid = isInvite && !existing.uid.startsWith('invite_') ? existing.uid : ru.uid;
              map.set(emailKey, {
                ...existing,
                ...ru,
                uid: finalUid,
                displayName: ru.displayName || existing.displayName,
                photoURL: ru.photoURL || existing.photoURL,
                role: emailKey === 'gierso@gmail.com' ? 'admin' : (ru.role || existing.role),
              });
            }
          });

          // 3. Guarantee current user is always included
          if (currentUser?.email) {
            const curEmail = currentUser.email.toLowerCase().trim();
            const existingSelf = map.get(curEmail);
            map.set(curEmail, {
              uid: currentUser.uid,
              email: curEmail,
              displayName: currentUser.displayName || existingSelf?.displayName || curEmail.split('@')[0] || 'Usuario',
              role: curEmail === 'gierso@gmail.com' ? 'admin' : (existingSelf?.role || userProfile?.role || 'viewer'),
              photoURL: currentUser.photoURL || existingSelf?.photoURL || undefined,
            });
          }

          const merged = Array.from(map.values());
          saveUsersToLocalStorage(merged);
          return merged;
        });
      },
      (error) => {
        console.debug('Users listener note:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userProfile]);

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

  const addOrInviteUser = async (userToInvite: {
    email: string;
    displayName: string;
    role: UserRole;
  }) => {
    const cleanEmail = userToInvite.email.toLowerCase().trim();
    if (!cleanEmail) return;

    const docId = `invite_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userItem: AppUserItem = {
      uid: docId,
      email: cleanEmail,
      displayName: userToInvite.displayName.trim() || cleanEmail.split('@')[0],
      role: userToInvite.role,
      isPreAuthorized: true,
    };

    // 1. Update state and localStorage immediately (0ms delay)
    setAllUsersList((prev) => {
      const map = new Map<string, AppUserItem>();
      prev.forEach((u) => {
        if (u.email) map.set(u.email.toLowerCase().trim(), u);
      });
      map.set(cleanEmail, userItem);
      const updated = Array.from(map.values());
      saveUsersToLocalStorage(updated);
      return updated;
    });

    // 2. Sync to Firestore in background
    const userRef = doc(db, 'users', docId);
    setDoc(userRef, {
      ...userItem,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firestoreTimestamp: serverTimestamp(),
    }).catch((err) => {
      console.warn('Background invite user sync notice:', err);
    });
  };

  const updateUserRole = async (uidOrEmail: string, newRole: UserRole) => {
    // 1. Update locally immediately
    setAllUsersList((prev) => {
      const updated = prev.map((u) => {
        if (u.uid === uidOrEmail || u.email.toLowerCase().trim() === uidOrEmail.toLowerCase().trim()) {
          return { ...u, role: newRole };
        }
        return u;
      });
      saveUsersToLocalStorage(updated);
      return updated;
    });

    // 2. Background sync
    const target = allUsersList.find(
      (u) => u.uid === uidOrEmail || u.email.toLowerCase().trim() === uidOrEmail.toLowerCase().trim()
    );
    const targetDocId = target?.uid || uidOrEmail;
    const targetUserRef = doc(db, 'users', targetDocId);
    setDoc(
      targetUserRef,
      {
        role: newRole,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((error) => {
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
        addOrInviteUser,
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

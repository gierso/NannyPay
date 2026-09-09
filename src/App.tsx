import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { WeekNavigator } from './components/WeekNavigator';
import { WeeklySummary } from './components/WeeklySummary';
import { ShiftTable } from './components/ShiftTable';
import { HistoryView } from './components/HistoryView';
import { AddShiftModal } from './components/AddShiftModal';
import { EditShiftModal } from './components/EditShiftModal';
import { SettingsModal } from './components/SettingsModal';
import { UserManagementModal } from './components/UserManagementModal';
import { WeeklyShareModal } from './components/WeeklyShareModal';
import { LoginView } from './components/LoginView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { Shift } from './types';
import { getWeekPeriod } from './lib/dateUtils';
import { Baby, Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { currentWeekShifts, setSelectedWeek } = useApp();

  const [currentView, setCurrentView] = useState<'week' | 'history'>('week');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
            <Baby className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-stone-600 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>Cargando NannyPay...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <InstallAppPrompt />
        <div className="flex-1 flex items-center justify-center">
          <LoginView />
        </div>
      </div>
    );
  }

  const handleSelectWeekFromHistory = (weekKey: string) => {
    const [y, m, d] = weekKey.split('-').map(Number);
    setSelectedWeek(getWeekPeriod(new Date(y, m - 1, d)));
    setCurrentView('week');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      <InstallAppPrompt />
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUsers={() => setIsUsersOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentView === 'week' ? (
          <>
            {/* Week Navigator */}
            <WeekNavigator />

            {/* Weekly KPI Overview Cards & Quick Actions */}
            <WeeklySummary
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenShareModal={() => setIsShareOpen(true)}
            />

            {/* Daily Shifts Table for the selected week */}
            <ShiftTable
              shifts={currentWeekShifts}
              onEditShift={(shift) => setEditingShift(shift)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              title="Días de Trabajo en Esta Semana"
              emptyMessage="No hay días registrados para esta semana"
            />
          </>
        ) : (
          /* Comprehensive Multi-week History View */
          <HistoryView
            onEditShift={(shift) => setEditingShift(shift)}
            onSelectWeek={handleSelectWeekFromHistory}
          />
        )}
      </main>

      {/* Modals */}
      <AddShiftModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditShiftModal
        shift={editingShift}
        onClose={() => setEditingShift(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <UserManagementModal
        isOpen={isUsersOpen}
        onClose={() => setIsUsersOpen(false)}
      />

      <WeeklyShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <MainContent />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

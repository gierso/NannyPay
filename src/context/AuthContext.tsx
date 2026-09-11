import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  canEdit: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BOOTSTRAP_ADMIN_EMAIL = 'gierso@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Failsafe timer: NEVER let the app be stuck on loading for more than 1.5 seconds under any network circumstance
    const failsafeTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      clearTimeout(failsafeTimer);
      setCurrentUser(user);
      setAuthError(null);

      if (user) {
        const cleanEmail = user.email?.toLowerCase().trim() || '';
        const isBootstrapAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL;

        // Check if there is an existing role in local users cache
        let preassignedRole: UserRole = isBootstrapAdmin ? 'admin' : 'viewer';
        try {
          const cachedUsersRaw = localStorage.getItem('nannypay_users_cache');
          if (cachedUsersRaw) {
            const cachedUsers = JSON.parse(cachedUsersRaw);
            const match = cachedUsers.find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
            if (match && match.role) {
              preassignedRole = match.role;
            }
          }
        } catch {
          // ignore
        }

        const initialProfile: UserProfile = {
          uid: user.uid,
          email: cleanEmail,
          displayName: user.displayName || cleanEmail.split('@')[0] || 'Usuario',
          photoURL: user.photoURL || undefined,
          role: isBootstrapAdmin ? 'admin' : preassignedRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Immediately grant profile so UI displays instantly without waiting for network/Firestore roundtrip
        setUserProfile(initialProfile);
        setLoading(false);

        const userRef = doc(db, 'users', user.uid);
        const inviteDocId = `invite_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const inviteRef = doc(db, 'users', inviteDocId);

        try {
          // Listen to user profile in background
          unsubscribeProfile = onSnapshot(
            userRef,
            async (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setUserProfile({
                  uid: user.uid,
                  email: cleanEmail,
                  displayName: data.displayName || user.displayName || 'Usuario',
                  photoURL: data.photoURL || user.photoURL || undefined,
                  role: cleanEmail === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : (data.role || preassignedRole),
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                });
              } else {
                // If user document doesn't exist yet, check if there is an invite document
                let inheritedRole: UserRole = isBootstrapAdmin ? 'admin' : preassignedRole;
                try {
                  const inviteSnap = await getDoc(inviteRef);
                  if (inviteSnap.exists()) {
                    const invData = inviteSnap.data();
                    if (invData.role) {
                      inheritedRole = invData.role as UserRole;
                    }
                  }
                } catch (e) {
                  console.debug('Invite check note:', e);
                }

                const profileToPersist = {
                  ...initialProfile,
                  role: isBootstrapAdmin ? 'admin' : inheritedRole,
                };

                setUserProfile(profileToPersist);

                setDoc(userRef, {
                  ...profileToPersist,
                  firestoreTimestamp: serverTimestamp(),
                }).catch((err) => {
                  console.debug('User profile initial creation note:', err);
                });
              }
            },
            (err) => {
              console.warn('Profile listener note:', err);
            }
          );
        } catch (err) {
          console.debug('Error attaching profile listener:', err);
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafeTimer);
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('La ventana de inicio de sesión fue cerrada.');
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError('El navegador bloqueó la ventana emergente. Por favor permite popups.');
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setAuthError(
          `El dominio "${currentDomain}" aún no está autorizado en Firebase Authentication. Agrega "${currentDomain}" en Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setAuthError(error.message || 'Error al iniciar sesión con Google.');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  const isBootstrap = currentUser?.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
  const role: UserRole = isBootstrap ? 'admin' : (userProfile?.role || 'viewer');
  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isViewer = role === 'viewer';
  const canEdit = isAdmin || isEditor;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isAdmin,
        isEditor,
        isViewer,
        canEdit,
        loading,
        loginWithGoogle,
        logout,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

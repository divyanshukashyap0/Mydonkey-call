import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { auth, googleProvider } from '../config/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { syncUserClient } from '../services/firestoreClientSync';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  initAuth: () => void;
  loginWithGoogle: () => Promise<User>;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<User>;
  loginAsGuest: (displayName?: string) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('mydonkey_token'),
  isLoading: true,
  error: null,

  initAuth: () => {
    // 500ms safety timer guaranteeing instant website render
    const safetyTimer = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false });
      }
    }, 500);

    try {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            const idToken = await result.user.getIdToken();
            localStorage.setItem('mydonkey_token', idToken);

            const appUser: User = {
              id: result.user.uid,
              displayName: result.user.displayName || 'Google User',
              email: result.user.email || null,
              avatarUrl: result.user.photoURL || null,
              isGuest: false,
            };

            const syncedRes = await api.syncFirebaseUser(appUser).catch(() => null);
            if (syncedRes?.user?.role) {
              appUser.role = syncedRes.user.role;
            }
            syncUserClient(appUser).catch(() => {});

            clearTimeout(safetyTimer);
            set({ user: appUser, token: idToken, isLoading: false, error: null });
            connectSocket(idToken);
          }
        })
        .catch((err) => {
          const errStr = String(err?.message || err?.code || err || '');
          if (
            errStr.includes('argument-error') ||
            errStr.includes('closing') ||
            errStr.includes('hidden')
          ) {
            return;
          }
          console.warn('Firebase redirect auth result notice:', err);
        });
    } catch {
      // Ignore synchronous init errors
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('mydonkey_token', idToken);

          const appUser: User = {
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
            email: firebaseUser.email || null,
            avatarUrl: firebaseUser.photoURL || null,
            isGuest: firebaseUser.isAnonymous,
          };

          // Sync profile document with backend / Firestore
          const syncedRes = await api.syncFirebaseUser(appUser).catch(() => null);
          if (syncedRes?.user?.role) {
            appUser.role = syncedRes.user.role;
          }
          syncUserClient(appUser).catch(() => {});

          set({ user: appUser, token: idToken, isLoading: false, error: null });
          connectSocket(idToken);
        } catch (err: any) {
          console.warn('Firebase token retrieval error:', err);
          set({ isLoading: false });
        }
      } else {
        const savedToken = localStorage.getItem('mydonkey_token');
        if (savedToken) {
          api
            .getMe()
            .then(({ user }) => {
              set({ user, token: savedToken, isLoading: false });
              connectSocket(savedToken);
            })
            .catch(() => {
              localStorage.removeItem('mydonkey_token');
              set({ user: null, token: null, isLoading: false });
            });
        } else {
          set({ user: null, token: null, isLoading: false });
        }
      }
    });
  },

  loginWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      localStorage.setItem('mydonkey_token', idToken);

      const appUser: User = {
        id: result.user.uid,
        displayName: result.user.displayName || 'Google User',
        email: result.user.email || null,
        avatarUrl: result.user.photoURL || null,
        isGuest: false,
      };

      await api.syncFirebaseUser(appUser).catch(() => {});

      set({ user: appUser, token: idToken, isLoading: false });
      connectSocket(idToken);
      return appUser;
    } catch (err: any) {
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.message?.includes('Cross-Origin-Opener-Policy') ||
        err.message?.includes('closed')
      ) {
        console.warn('Popup blocked or hindered by COOP policy, attempting signInWithRedirect fallback...', err);
        await signInWithRedirect(auth, googleProvider);
        return null as any;
      }
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  loginWithEmail: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      localStorage.setItem('mydonkey_token', idToken);

      const appUser: User = {
        id: result.user.uid,
        displayName: result.user.displayName || (email.split('@')[0]),
        email: result.user.email,
        isGuest: false,
      };

      await api.syncFirebaseUser(appUser).catch(() => {});

      set({ user: appUser, token: idToken, isLoading: false });
      connectSocket(idToken);
      return appUser;
    } catch (err: any) {
      // Fallback to REST login API
      try {
        const res = await api.login({ email, password });
        localStorage.setItem('mydonkey_token', res.token);
        set({ user: res.user, token: res.token, isLoading: false });
        connectSocket(res.token);
        return res.user;
      } catch (fallbackErr: any) {
        set({ error: err.message || fallbackErr.message, isLoading: false });
        throw err;
      }
    }
  },

  registerWithEmail: async (email, password, displayName) => {
    try {
      set({ isLoading: true, error: null });
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });

      const idToken = await result.user.getIdToken();
      localStorage.setItem('mydonkey_token', idToken);

      const appUser: User = {
        id: result.user.uid,
        displayName,
        email,
        isGuest: false,
      };

      await api.syncFirebaseUser(appUser).catch(() => {});

      set({ user: appUser, token: idToken, isLoading: false });
      connectSocket(idToken);
      return appUser;
    } catch (err: any) {
      // Fallback to REST register API
      try {
        const res = await api.register({ email, password, displayName });
        localStorage.setItem('mydonkey_token', res.token);
        set({ user: res.user, token: res.token, isLoading: false });
        connectSocket(res.token);
        return res.user;
      } catch (fallbackErr: any) {
        set({ error: err.message || fallbackErr.message, isLoading: false });
        throw err;
      }
    }
  },

  loginAsGuest: async (displayName) => {
    try {
      set({ isLoading: true, error: null });
      const name = displayName?.trim() || `Guest-${Math.floor(1000 + Math.random() * 9000)}`;

      let appUser: User;
      let tokenStr: string;

      try {
        const result = await signInAnonymously(auth);
        await updateProfile(result.user, { displayName: name });
        tokenStr = await result.user.getIdToken();

        appUser = {
          id: result.user.uid,
          displayName: name,
          isGuest: true,
        };
      } catch (fbErr: any) {
        const errMsg = fbErr?.message || fbErr?.toString?.() || '';
        if (errMsg.includes('closing') || errMsg.includes('hidden')) {
          console.info('IndexedDB closing/hidden during guest auth. Falling back to backend guest session API...');
        } else {
          console.warn('Firebase Anonymous auth fallback to backend guest session API:', errMsg);
        }
        const res = await api.guest(name);
        tokenStr = res.token;
        appUser = res.user;
      }

      localStorage.setItem('mydonkey_token', tokenStr);
      await api.syncFirebaseUser(appUser).catch(() => {});

      set({ user: appUser, token: tokenStr, isLoading: false });
      connectSocket(tokenStr);
      return appUser;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await firebaseSignOut(auth).catch(() => {});
    localStorage.removeItem('mydonkey_token');
    disconnectSocket();
    set({ user: null, token: null, isLoading: false, error: null });
  },
}));

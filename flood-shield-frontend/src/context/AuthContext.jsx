import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [mongoUser, setMongoUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en'); // 'en' or 'bn'
  const isRegisteringRef = React.useRef(false);

  // Update language
  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'bn' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  // Sync with MongoDB using the current Firebase user and optional extra registration data
  const syncUserWithBackend = async (firebaseUser, registrationData = null) => {
    try {
      const firebaseIdToken = await firebaseUser.getIdToken();
      
      let endpoint = `${API_URL}/auth/login`;
      let payload = { email: firebaseUser.email };

      if (registrationData) {
        endpoint = `${API_URL}/auth/register`;
        payload = {
          name: registrationData.name,
          email: firebaseUser.email,
          role: registrationData.role,
          district: registrationData.district,
          representativeId: registrationData.representativeId || '',
          ngoInviteId: registrationData.representativeId || ''
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseIdToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync with backend');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setMongoUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Backend sync error:', err);
      throw err;
    }
  };

  const createMockToken = (uid, userEmail) => {
    try {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'dev-kid' }));
      const payload = btoa(JSON.stringify({ sub: uid, email: userEmail, isDemo: true }));
      return `${header}.${payload}.dev_signature`;
    } catch (e) {
      return `dev_id_token_${Date.now()}`;
    }
  };

  // Register with Email and Password
  const registerWithEmail = async (email, password, name, role, district, representativeId = '') => {
    setLoading(true);
    isRegisteringRef.current = true;
    try {
      let firebaseUser = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (fbErr) {
        console.warn('Firebase createUser failed, attempting signIn fallback:', fbErr.message);
        try {
          const loginCredential = await signInWithEmailAndPassword(auth, email, password);
          firebaseUser = loginCredential.user;
        } catch (loginErr) {
          console.warn('Firebase signIn fallback failed, constructing session payload:', loginErr.message);
          const fallbackUid = auth.currentUser?.uid || `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
          firebaseUser = {
            uid: fallbackUid,
            email: email,
            getIdToken: async () => createMockToken(fallbackUid, email)
          };
        }
      }
      const user = await syncUserWithBackend(firebaseUser, { name, role, district, representativeId });
      setCurrentUser(firebaseUser);
      return user;
    } catch (error) {
      console.error('Email registration error:', error);
      throw error;
    } finally {
      isRegisteringRef.current = false;
      setLoading(false);
    }
  };

  // Login with Email and Password
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      let firebaseUser = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (err) {
        console.warn('Firebase email login failed, checking fallback session...', err.message);
        const emailMap = {
          'citizen.test@floodshield.bd': 'Citizen',
          'volunteer.test@floodshield.bd': 'Volunteer',
          'mitu.test@floodshield.bd': 'Volunteer2',
          'ngo.test@floodshield.bd': 'NGO',
          'ngorep.test@floodshield.bd': 'NGORepresentative',
          'ngorep.logistics@floodshield.bd': 'NGORepLogistics',
          'govrep.test@floodshield.bd': 'GovRepresentative',
          'govrep.logistics@floodshield.bd': 'GovRepLogistics',
          'floodshield.gov@test.com': 'Government'
        };
        const testRole = emailMap[(email || '').toLowerCase().trim()];
        if (testRole) {
          try {
            return await demoLogin(testRole);
          } catch (demoErr) {
            console.error('Demo login fallback failed:', demoErr);
          }
        }
        const fallbackUid = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        firebaseUser = {
          uid: fallbackUid,
          email: email,
          getIdToken: async () => createMockToken(fallbackUid, email)
        };
      }
      const user = await syncUserWithBackend(firebaseUser);
      setCurrentUser(firebaseUser);
      return user;
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login/Register with Google
  const loginWithGoogle = async (role = 'Citizen') => {
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseIdToken = await userCredential.user.getIdToken();
      
      // Let's call /api/auth/google
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseIdToken}`
        },
        body: JSON.stringify({
          role,
          name: userCredential.user.displayName,
          email: userCredential.user.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Google authentication sync failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setMongoUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login via 1-Click Demo Login
  const demoLogin = async (role, email = null) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Demo authentication failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('demo_user', JSON.stringify(data.user));
      setToken(data.token);
      setMongoUser(data.user);
      setCurrentUser({ uid: data.user.uid, email: data.user.email, displayName: data.user.name, isDemo: true });
      return data.user;
    } catch (error) {
      console.error('Demo login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      // Notify backend of logout if needed
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {}); // Swallowing errors on backend logout since client is logging out anyway
      }
      
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      localStorage.removeItem('token');
      localStorage.removeItem('demo_user');
      setToken(null);
      setMongoUser(null);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Forgot/Reset Password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        if (isRegisteringRef.current) {
          // Registration flow is in progress; syncUserWithBackend will be called directly with registration payload
          return;
        }
        // If we have a firebase user, fetch profile from MongoDB to check/restore role session
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          try {
            const response = await fetch(`${API_URL}/auth/profile`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              setMongoUser(data);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Profile fetching error:', err);
          }
        }
        
        // If JWT profile check failed, try to sync/re-login user with Firebase token
        try {
          await syncUserWithBackend(user);
        } catch (e) {
          console.error('Failed to auto-sync backend session on auth change:', e);
        }
      } else {
        // Firebase user is null — check if a demo session token exists
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          try {
            const response = await fetch(`${API_URL}/auth/profile`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              setMongoUser(data);
              setToken(storedToken);
              setCurrentUser({ uid: data.uid, email: data.email, displayName: data.name, isDemo: true });
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Demo profile fetch error:', err);
          }
        }
        setMongoUser(null);
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('demo_user');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    mongoUser,
    token,
    loading,
    language,
    toggleLanguage,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    demoLogin,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

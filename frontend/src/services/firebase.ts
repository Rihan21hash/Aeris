/**
 * Firebase Client Initialization for AERIS
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCIACP8n8grcqDMwAzkULtOZBwnWkr1x2F0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'aeris-41aed.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'aeris-41aed',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'aeris-41aed.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '927429093172',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:927429093172:web:d9afcfb4b9c840145aa761',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your-') &&
  firebaseConfig.apiKey !== 'demo-key'
);

// Prevent duplicate Firebase app initialization
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

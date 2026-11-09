/**
 * Firebase Client Initialization
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCIACP8n8grcqDMwAzkULtOZBwnWkr1x2F0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'aeris-41aed.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'aeris-41aed',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'aeris-41aed.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '927429093172',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:927429093172:web:d9afcfb4b9c840145aa761',
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });


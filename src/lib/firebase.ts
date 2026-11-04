import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const SYSTEM_SETTINGS_ADMIN_UID = 'dQtjIk9jVyg347foJj1mqcznI2x2';
export function firebaseServices() {
  const apiKey=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if(!apiKey) throw new Error('Firebase 웹 API 키가 설정되지 않았습니다. .env.local의 NEXT_PUBLIC_FIREBASE_API_KEY를 확인해주세요.');
  const app=getApps().length ? getApp() : initializeApp({
    apiKey,
    projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'frc-staff-juwon-20260226',
    authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'frc-staff-juwon-20260226.firebaseapp.com',
    appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:251272354309:web:5de5887f1f52d07b249a6c',
    messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '251272354309',
  });
  return {auth:getAuth(app),database:getFirestore(app)};
}
export function isDemoMode() { return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE==='true'; }

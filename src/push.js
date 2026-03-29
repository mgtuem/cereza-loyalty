import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import supabase from './supabase';

const firebaseConfig = {
  apiKey: "AIzaSyCnxIoJ9v5Wlutk59fc8aMTARss1S78xbc",
  authDomain: "cereza-loyalty.firebaseapp.com",
  projectId: "cereza-loyalty",
  storageBucket: "cereza-loyalty.firebasestorage.app",
  messagingSenderId: "684783511032",
  appId: "1:684783511032:web:8951cb96551d350209220d"
};

const VAPID_KEY = "BLTPvtkf-HFJ5y1kMoCPxAqriPCIA0xQp3mR1bjo3Cgt-s2el6QCiuZdp2sJR7OHtS1IbBSwFC1Vz5B0GcjKGP0";

let app, messaging;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (e) {
  console.warn('Firebase init failed:', e);
}

// Service Worker registrieren (nötig für Background Push)
const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('SW registered:', reg.scope);
      return reg;
    } catch (e) {
      console.error('SW registration failed:', e);
    }
  }
  return null;
};

// Request permission and get FCM token
export const requestPushPermission = async (userId) => {
  try {
    if (!messaging) return null;
    if (!('Notification' in window)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // SW registrieren bevor Token angefordert wird
    const swReg = await registerSW();

    const tokenOptions = { vapidKey: VAPID_KEY };
    if (swReg) tokenOptions.serviceWorkerRegistration = swReg;

    const token = await getToken(messaging, tokenOptions);
    if (token && userId) {
      await supabase.from('profiles').update({ fcm_token: token }).eq('id', userId);
    }
    return token;
  } catch (e) {
    console.error('Push permission error:', e);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

// Send notification via Supabase Edge Function (server-side FCM)
export const sendPushToUser = async (targetUserId, title, body) => {
  const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', targetUserId).single();
  if (!profile?.fcm_token) return false;
  try {
    await supabase.functions.invoke('send-push', {
      body: { tokens: [profile.fcm_token], title, body }
    });
    return true;
  } catch (e) {
    console.error('sendPushToUser error:', e);
    return false;
  }
};

// Send to all users (admin broadcast) via Edge Function
export const sendPushToAll = async (title, body) => {
  const { data: profiles } = await supabase.from('profiles')
    .select('fcm_token')
    .not('fcm_token', 'is', null)
    .neq('fcm_token', '');
  if (!profiles?.length) return 0;

  const tokens = profiles.map(p => p.fcm_token).filter(Boolean);
  if (!tokens.length) return 0;

  try {
    // In Batches von 500 senden (FCM Limit)
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await supabase.functions.invoke('send-push', {
        body: { tokens: batch, title, body }
      });
    }
    // Notification-Log speichern
    await supabase.from('admin_notifications').insert({ title, body, sent_to: tokens.length });
    return tokens.length;
  } catch (e) {
    console.error('sendPushToAll error:', e);
    return 0;
  }
};

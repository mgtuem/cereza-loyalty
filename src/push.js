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

// Request permission and get FCM token
export const requestPushPermission = async (userId) => {
  try {
    if (!messaging) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token && userId) {
      // Save token to Supabase profile
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

// Send notification via Supabase Edge Function or direct FCM
// For now, we store notification requests in a table and process them
export const sendPushToUser = async (targetUserId, title, body) => {
  // Get target user's FCM token
  const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', targetUserId).single();
  if (!profile?.fcm_token) return false;

  // Store in notifications table for processing
  await supabase.from('push_queue').insert({
    target_token: profile.fcm_token,
    title,
    body,
    sent: false
  });
  return true;
};

// Send to all users (admin broadcast)
export const sendPushToAll = async (title, body) => {
  const { data: profiles } = await supabase.from('profiles').select('fcm_token').not('fcm_token', 'is', null).neq('fcm_token', '');
  if (!profiles?.length) return 0;

  const inserts = profiles.map(p => ({
    target_token: p.fcm_token,
    title,
    body,
    sent: false
  }));
  await supabase.from('push_queue').insert(inserts);
  return profiles.length;
};

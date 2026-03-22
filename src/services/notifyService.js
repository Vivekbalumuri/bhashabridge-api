// src/services/notifyService.js
// Sends FCM push notifications via Firebase Admin SDK.
// Called by the daily reminder cron job in jobs/index.js
// and by notify.js route handlers.

import admin from 'firebase-admin';

// ── Firebase Admin — initialise once ─────────────────────────────────────────
let initialised = false;
function ensureFirebase() {
  if (initialised) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      // Render stores \n literally — unescape them
      privateKey:  process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  initialised = true;
}

// ── Greeting word by target language ─────────────────────────────────────────
// direction format: "source-target" e.g. "en-te", "ta-en"
// The language the user is LEARNING is the second part of the direction.
const GREETINGS = {
  te: 'నమస్కారం',
  ta: 'வணக்கம்',
  ml: 'നമസ്കാരം',
  kn: 'ನಮಸ್ಕಾರ',
  en: 'Hello',
};

function getGreeting(direction = 'te-en') {
  const targetLang = direction?.split('-')[0] ?? 'te';
  return GREETINGS[targetLang] ?? 'నమస్కారం';
}

// ── Android notification defaults ────────────────────────────────────────────
const ANDROID_CONFIG = {
  notification: {
    icon:      'ic_notification',
    color:     '#E8621A',       // BhashaBridge Saffron
    channelId: 'daily_reminder',
    priority:  'high',
  },
};

// ── Send to a single FCM token ────────────────────────────────────────────────
export async function sendPushNotification({ token, title, body, data = {} }) {
  ensureFirebase();

  const message = {
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    android: ANDROID_CONFIG,
  };

  return admin.messaging().send(message);
}

// ── Send daily reminders to all users with an FCM token ───────────────────────
// Uses each user's native_lang to pick the localised greeting.
// Falls back to Telugu greeting if native_lang is missing.
export async function sendDailyReminders(supabase) {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, display_name, fcm_token, native_lang')
    .not('fcm_token', 'is', null)
    .neq('fcm_token', '');

  if (error) {
    console.error('[notify] Failed to fetch users:', error.message);
    return { sent: 0, failed: 0 };
  }

  const messages = buildReminderMessages(users);
  if (!messages.length) return { sent: 0, failed: 0 };

  ensureFirebase();

  // FCM sendEach handles up to 500 messages per call
  const chunks = chunkArray(messages, 500);
  let sent = 0, failed = 0;

  for (const chunk of chunks) {
    const response = await admin.messaging().sendEach(chunk);
    sent   += response.successCount;
    failed += response.failureCount;

    // Clean up invalid/unregistered tokens from the DB
    const invalidTokens = response.responses
      .map((r, i) => ({ r, msg: chunk[i] }))
      .filter(({ r }) =>
        !r.success &&
        ['messaging/invalid-registration-token',
         'messaging/registration-token-not-registered'].includes(r.error?.code)
      )
      .map(({ msg }) => msg.token);

    if (invalidTokens.length) {
      await supabase
        .from('users')
        .update({ fcm_token: null })
        .in('fcm_token', invalidTokens);
      console.log(`[notify] Removed ${invalidTokens.length} stale FCM tokens`);
    }
  }

  console.log(`[notify] Daily reminders — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}

// ── Send story-unlocked notification to a single user ────────────────────────
// Called after a free user upgrades to premium AND has already completed
// the Greetings lesson (checked server-side in progress.js or paywall handler).
export async function sendStoryUnlockedNotification({ fcmToken, displayName, storyTitle = "Ravi's First Day" }) {
  if (!fcmToken) return;
  const firstName = displayName?.split(' ')[0] ?? 'Learner';
  return sendPushNotification({
    token: fcmToken,
    title: '📖 A new story unlocked!',
    body:  `"${storyTitle}" is now available. Tap to read Ravi's journey.`,
    data:  { screen: 'home' },
  });
}

// ── Build FCM message objects for all users ───────────────────────────────────
function buildReminderMessages(users) {
  return users
    .filter(u => u.fcm_token)
    .map(u => {
      // native_lang is the language the user speaks natively.
      // direction for greeting = native_lang-en as a best-effort default.
      // e.g. native=te → direction=te-en → greeting=నమస్కారం
      const direction = u.native_lang ? `${u.native_lang}-en` : 'te-en';
      const greeting  = getGreeting(direction);
      const firstName = u.display_name?.split(' ')[0] ?? 'Learner';

      return {
        token: u.fcm_token,
        notification: {
          title: `${greeting}! Good morning, ${firstName}.`,
          body:  'Start your day with a lesson. Every word you learn bridges a new connection.',
        },
        data:    { screen: 'lessons' },
        android: ANDROID_CONFIG,
      };
    });
}

// ── Utility: split array into chunks of `size` ────────────────────────────────
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
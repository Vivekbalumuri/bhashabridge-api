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
    color:     '#E8621A',
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

  const chunks = chunkArray(messages, 500);
  let sent = 0, failed = 0;

  for (const chunk of chunks) {
    const response = await admin.messaging().sendEach(chunk);
    sent   += response.successCount;
    failed += response.failureCount;

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

// ── Streak-lost reminders ─────────────────────────────────────────────────────
// Runs at 03:30 UTC (09:00 IST) — finds users whose streak broke overnight.
// last_activity = yesterday → they were active yesterday but missed today.
export async function sendStreakLostReminders(supabase) {
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

  const { data: streaks, error } = await supabase
    .from('streaks')
    .select(`
      user_id,
      current_streak,
      last_activity,
      users (
        fcm_token,
        display_name,
        native_lang
      )
    `)
    .eq('last_activity', yesterday)
    .not('users.fcm_token', 'is', null)

  if (error) {
    console.error('[notify] streak-lost fetch error:', error.message)
    return { sent: 0, failed: 0 }
  }

  if (!streaks || streaks.length === 0) {
    console.log('[notify] streak-lost: no broken streaks found')
    return { sent: 0, failed: 0 }
  }

  const results = await Promise.allSettled(
    streaks
      .filter(s => s.users?.fcm_token)
      .map(async s => {
        const name        = (s.users.display_name ?? 'friend').split(' ')[0]
        const streakCount = s.current_streak > 0 ? s.current_streak : 1

        const result = await sendPushNotification({
          token: s.users.fcm_token,
          title: 'Streak gone, but not forgotten. 💔',
          body:  `Your ${streakCount}-day streak is over, but your progress isn't. Come back stronger, ${name}!`,
          data:  { screen: 'home', type: 'streak_lost', streak_count: String(streakCount) },
        })

        // Clear stale token from DB
        if (result?.error?.code === 'messaging/registration-token-not-registered') {
          await supabase
            .from('users')
            .update({ fcm_token: null })
            .eq('id', s.user_id)
        }

        return result
      })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  console.log(`[notify] streak-lost: sent=${sent} failed=${failed}`)
  return { sent, failed }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function buildReminderMessages(users) {
  return users
    .filter(u => u.fcm_token)
    .map(u => {
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

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
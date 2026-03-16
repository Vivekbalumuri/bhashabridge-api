// src/services/notifyService.js
// Sends FCM push notifications via Firebase Admin SDK.
// Called by the daily reminder cron job in jobs/index.js.

import admin from 'firebase-admin';

// Initialise Firebase Admin once (idempotent)
let initialised = false;
function ensureFirebase() {
  if (initialised) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      // newlines in env vars need to be unescaped
      privateKey:  process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  initialised = true;
}

// ── Send to a single FCM token ────────────────────────────────────────────────
export async function sendPushNotification({ token, title, body, data = {} }) {
  ensureFirebase();

  const message = {
    token,
    notification: { title, body },
    data:         Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    android: {
      notification: {
        icon:  'ic_notification',
        color: '#E8621A',      // Saffron
        channelId: 'daily_reminder',
        priority: 'high',
      },
    },
  };

  return admin.messaging().send(message);
}

// ── Send daily reminders to all users who have a stored FCM token ─────────────
export async function sendDailyReminders(supabase) {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, display_name, fcm_token')
    .not('fcm_token', 'is', null)
    .neq('fcm_token', '');

  if (error) {
    console.error('[notify] Failed to fetch users:', error.message);
    return { sent: 0, failed: 0 };
  }

  const messages = buildReminderMessages(users);
  if (!messages.length) return { sent: 0, failed: 0 };

  ensureFirebase();

  // FCM sendEach handles up to 500 per call
  const chunks  = chunkArray(messages, 500);
  let sent = 0, failed = 0;

  for (const chunk of chunks) {
    const response = await admin.messaging().sendEach(chunk);
    sent   += response.successCount;
    failed += response.failureCount;

    // Remove invalid tokens from the DB
    const invalidTokens = response.responses
      .map((r, i) => ({ r, msg: chunk[i] }))
      .filter(({ r }) => !r.success &&
        ['messaging/invalid-registration-token',
         'messaging/registration-token-not-registered'].includes(r.error?.code))
      .map(({ msg }) => msg.token);

    if (invalidTokens.length) {
      await supabase
        .from('users')
        .update({ fcm_token: null })
        .in('fcm_token', invalidTokens);
      console.log(`[notify] Removed ${invalidTokens.length} invalid tokens`);
    }
  }

  console.log(`[notify] Daily reminders — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}

// ── Build notification messages ───────────────────────────────────────────────
function buildReminderMessages(users) {
  const hour   = new Date().getUTCHours();
  const greet  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const prompts = [
    "Your streak is waiting 🔥 — keep it alive today!",
    "5 minutes of Telugu today keeps the forgetting away 📖",
    "Your daily word is ready — come see it 🌟",
    "Don't break your streak! Learn something new today 🎯",
    "Tamil lessons unlocked — practice now to stay sharp ✨",
    "A new lesson is waiting for you — tap to start 🚀",
  ];
  const pick = () => prompts[Math.floor(Math.random() * prompts.length)];

  return users
    .filter(u => u.fcm_token)
    .map(u => ({
      token: u.fcm_token,
      notification: {
        title: `${greet}, ${u.display_name?.split(' ')[0] ?? 'Learner'}! 👋`,
        body:  pick(),
      },
      data: { screen: 'lessons' },
      android: {
        notification: {
          icon:      'ic_notification',
          color:     '#E8621A',
          channelId: 'daily_reminder',
          priority:  'high',
        },
      },
    }));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
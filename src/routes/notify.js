// src/routes/notify.js
// Handles all push notification logic for BhashaBridge
// POST /notify/test  — manual test push (all envs allowed, auth required)
// NOTE: PATCH /auth/me/fcm-token is handled in auth.js — not duplicated here

// ── Greeting by target language ───────────────────────────────────────────────
const GREETINGS = {
  te: 'నమస్కారం',
  ta: 'வணக்கம்',
  ml: 'നമസ്കാരം',
  kn: 'ನಮಸ್ಕಾರ',
  en: 'Hello',
};

// ── Notification copy ─────────────────────────────────────────────────────────
// direction format: "te-en", "ta-en" etc.  target lang = split('-')[0]
function getGreeting(direction = 'te-en') {
  const targetLang = direction.split('-')[0];
  return GREETINGS[targetLang] ?? 'నమస్కారం';
}

export function buildDailyReminder(direction) {
  return {
    title: `${getGreeting(direction)}! Good morning.`,
    body:  'Start your day with a lesson. Every word you learn bridges a new connection.',
    data:  { screen: 'lessons' },
  };
}

export function buildStreakAtRisk(streak) {
  return {
    title: `${streak} days — don't lose it!`,
    body:  "You're just hours away from losing your streak. One quick lesson saves it.",
    data:  { screen: 'lessons' },
  };
}

export function buildStreakLost(streak) {
  return {
    title: 'Streak gone, but not forgotten.',
    body:  `Your ${streak}-day streak is over, but your progress isn't. Come back stronger!`,
    data:  { screen: 'home' },
  };
}

export function buildLessonUnlocked(lessonName) {
  return {
    title: 'New lesson unlocked!',
    body:  `"${lessonName}" is now available. Keep the momentum going!`,
    data:  { screen: 'lessons' },
  };
}

export function buildLivesRefilled() {
  return {
    title: 'Fully charged ❤️❤️❤️',
    body:  "Your lives have refilled. Head back to your lessons — you're ready!",
    data:  { screen: 'lessons' },
  };
}

export function buildStoryUnlocked(storyTitle) {
  return {
    title: '📖 A new story unlocked!',
    body:  `"${storyTitle}" is now available. Tap to read Ravi's journey.`,
    data:  { screen: 'home' },
  };
}

// ── Route plugin ──────────────────────────────────────────────────────────────
export default async function notifyRoutes(fastify) {

  // ── POST /notify/test ──────────────────────────────────────────────────────
  // Sends a real test push to the calling user. Available in all envs.
  fastify.post(
    '/notify/test',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const userId = request.user?.sub ?? request.user?.id;

      const { data: user, error } = await fastify.supabase
        .from('users')
        .select('fcm_token, display_name, native_lang')
        .eq('supabase_uid', userId)
        .single();

      if (error || !user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (!user.fcm_token) {
        return reply.status(404).send({ error: 'No FCM token on file for this user. Open the app and log in first.' });
      }

      const { sendPushNotification } = await import('../services/notifyService.js');
      const firstName = user.display_name?.split(' ')[0] ?? 'Learner';

      await sendPushNotification({
        token: user.fcm_token,
        title: `Hey ${firstName}! 👋`,
        body:  'This is a test notification from BhashaBridge 🎉',
        data:  { screen: 'lessons' },
      });

      return reply.send({ success: true, message: `Test notification sent to ${firstName}` });
    }
  );

  // ── POST /notify/daily-reminder ────────────────────────────────────────────
  // Called by the daily cron job in jobs.js at 08:00 UTC
  // Sends to ALL users who have an FCM token
  fastify.post(
    '/notify/daily-reminder',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { data: users, error } = await fastify.supabase
        .from('users')
        .select('fcm_token, display_name, native_lang')
        .not('fcm_token', 'is', null);

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch users' });
      }

      const { sendPushNotification } = await import('../services/notifyService.js');

      // Get active direction per user from lesson_progress or fall back to native_lang
      // For simplicity we derive direction from native_lang stored on the user row
      const results = await Promise.allSettled(
        users.map(async (user) => {
          // native_lang is the SOURCE language; target is the language being learned
          // We pick a sensible default: if native is 'en' → teach 'te', else → teach 'en'
          const direction = user.native_lang
            ? `${user.native_lang}-en`
            : 'te-en';
          const payload = buildDailyReminder(direction);
          return sendPushNotification({ token: user.fcm_token, ...payload });
        })
      );

      const sent   = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return reply.send({ success: true, sent, failed });
    }
  );

  // ── POST /notify/streak-at-risk ────────────────────────────────────────────
  // Called by cron — send to users who haven't done a lesson today
  fastify.post(
    '/notify/streak-at-risk',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      // Fetch users with active streaks who have NOT done a lesson today
      const today = new Date().toISOString().split('T')[0];

      const { data: streaks, error } = await fastify.supabase
        .from('streaks')
        .select('user_id, current_streak, last_activity, users(fcm_token, display_name)')
        .gt('current_streak', 0)
        .neq('last_activity', today);

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch streaks' });
      }

      const { sendPushNotification } = await import('../services/notifyService.js');

      const results = await Promise.allSettled(
        streaks
          .filter(s => s.users?.fcm_token)
          .map(s => {
            const payload = buildStreakAtRisk(s.current_streak);
            return sendPushNotification({ token: s.users.fcm_token, ...payload });
          })
      );

      const sent   = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return reply.send({ success: true, sent, failed });
    }
  );

  // ── POST /notify/lives-refilled ────────────────────────────────────────────
  // Called when the server detects a user's lives have refilled (optional webhook)
  // More commonly triggered client-side — this is for server-side use
  fastify.post(
    '/notify/lives-refilled',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const userId = request.user?.sub ?? request.user?.id;

      const { data: user } = await fastify.supabase
        .from('users')
        .select('fcm_token, display_name')
        .eq('supabase_uid', userId)
        .single();

      if (!user?.fcm_token) {
        return reply.status(404).send({ error: 'No FCM token for this user' });
      }

      const { sendPushNotification } = await import('../services/notifyService.js');
      const payload = buildLivesRefilled();
      await sendPushNotification({ token: user.fcm_token, ...payload });

      return reply.send({ success: true });
    }
  );

  // ── POST /notify/story-unlocked ────────────────────────────────────────────
  // Called after progress/complete-quiz detects Greetings lesson completed
  // Body: { userId: string, storyTitle: string }
  fastify.post(
    '/notify/story-unlocked',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { userId, storyTitle = "Ravi's First Day" } = request.body ?? {};

      if (!userId) {
        return reply.status(400).send({ error: 'userId required' });
      }

      const { data: user } = await fastify.supabase
        .from('users')
        .select('fcm_token, display_name')
        .eq('supabase_uid', userId)
        .single();

      if (!user?.fcm_token) {
        return reply.status(404).send({ error: 'No FCM token for this user' });
      }

      const { sendPushNotification } = await import('../services/notifyService.js');
      const payload = buildStoryUnlocked(storyTitle);
      await sendPushNotification({ token: user.fcm_token, ...payload });

      return reply.send({ success: true });
    }
  );
}
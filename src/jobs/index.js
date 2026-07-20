/**
 * src/jobs/index.js
 *
 * All background cron jobs for BhashaBridge backend.
 * Call registerJobs(fastify) once after the server starts listening.
 *
 * Schedule summary (all times UTC):
 *   Every 10 min  — self-ping to keep Render.com warm
 *   02:30 UTC     — daily reminder push (08:00 AM IST)
 *   18:30 UTC     — streak-at-risk push (midnight IST)
 *   03:30 UTC     — streak-lost push    (09:00 AM IST)
 *   18:30 Sun UTC — weekly league reset (Monday 00:00 IST)
 */

import cron from 'node-cron'
import admin from 'firebase-admin'
import { scheduleLeagueReset } from './leagueReset.js'

export function registerJobs(fastify) {

  // ── Self-ping — keeps Render free tier warm ───────────────────────────────
  cron.schedule('*/10 * * * *', async () => {
    try {
      const url = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL
      if (!url) return
      await fetch(`${url}/health`).catch(() => {})
      fastify.log.debug('Self-ping OK')
    } catch (_) {}
  })

  // ── Daily reminder — 08:00 AM IST (02:30 UTC) ────────────────────────────
  cron.schedule('30 2 * * *', async () => {
    fastify.log.info('Job: daily-reminder')
    try {
      await sendDailyReminders(fastify)
    } catch (err) {
      fastify.log.error({ err }, 'daily-reminder job failed')
    }
  }, { timezone: 'UTC' })

  // ── Streak-at-risk — midnight IST (18:30 UTC) ─────────────────────────────
  cron.schedule('30 18 * * *', async () => {
    fastify.log.info('Job: streak-at-risk')
    try {
      await sendStreakAtRisk(fastify)
    } catch (err) {
      fastify.log.error({ err }, 'streak-at-risk job failed')
    }
  }, { timezone: 'UTC' })

  // ── Streak-lost — 09:00 AM IST (03:30 UTC) ───────────────────────────────
  cron.schedule('30 3 * * *', async () => {
    fastify.log.info('Job: streak-lost')
    try {
      await sendStreakLost(fastify)
    } catch (err) {
      fastify.log.error({ err }, 'streak-lost job failed')
    }
  }, { timezone: 'UTC' })

  // ── Daily reminder 8:00 PM (20:00) Server Time ──────────────────────────────
  cron.schedule('0 20 * * *', async () => {
    fastify.log.info('Running daily reminder cron job (8:00 PM)...');

    // Ensure Firebase Admin is initialized
    if (admin.apps.length === 0) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId:   process.env.FCM_PROJECT_ID,
            clientEmail: process.env.FCM_CLIENT_EMAIL,
            privateKey:  process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      } catch (err) {
        fastify.log.error(err, 'Failed to initialize Firebase Admin in cron job');
        return;
      }
    }

    // Logic: Fetch all users with non-null fcm_token from Supabase
    const { data: users, error } = await fastify.supabase
      .from('users')
      .select('fcm_token')
      .not('fcm_token', 'is', null);

    if (error) {
      fastify.log.error(error, 'Failed to fetch FCM tokens for 8:00 PM cron job');
      return;
    }

    const tokens = users.map(u => u.fcm_token).filter(Boolean);

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: 'BhashaBridge 🎯',
          body: "Don't lose your streak! Spend 5 minutes practicing today."
        },
        data: {
          screen: 'home'
        },
        tokens: tokens
      };

      try {
        const response = typeof admin.messaging().sendEachForMulticast === 'function'
          ? await admin.messaging().sendEachForMulticast(message)
          : await admin.messaging().sendMulticast(message);
        fastify.log.info(`Sent notifications: ${response.successCount}`);
      } catch (err) {
        fastify.log.error(err, 'Error sending multicast message');
      }
    }
  });

  // ── Weekly league reset — Monday 00:00 IST (Sunday 18:30 UTC) ────────────
  scheduleLeagueReset(fastify)

  fastify.log.info('All background jobs registered')
}

// ── Notification helpers ───────────────────────────────────────────────────────

async function sendDailyReminders(fastify) {
  const db = fastify.supabase
  const todayStr = new Date().toISOString().slice(0, 10)

  const { data: users } = await db
    .from('users')
    .select('id, display_name, fcm_token')
    .not('fcm_token', 'is', null)

  if (!users?.length) return

  const { data: activeToday } = await db
    .from('lesson_progress')
    .select('user_id')
    .eq('quiz_completed', true)
    .gte('completed_at', `${todayStr}T00:00:00Z`)

  const activeTodayIds = new Set((activeToday ?? []).map(r => r.user_id))
  const toNotify = users.filter(u => !activeTodayIds.has(u.id) && u.fcm_token)

  fastify.log.info(`Daily reminder: sending to ${toNotify.length} users`)
  await sendFcmBatch(fastify, toNotify, {
    title: '🌟 Time to learn!',
    body:  'Your daily lesson is waiting. Keep your streak alive!',
  })
}

async function sendStreakAtRisk(fastify) {
  const db = fastify.supabase
  const todayStr = new Date().toISOString().slice(0, 10)

  const { data: streakUsers } = await db
    .from('streaks')
    .select('user_id, current_streak, users!inner(fcm_token, display_name)')
    .gt('current_streak', 0)
    .not('users.fcm_token', 'is', null)

  if (!streakUsers?.length) return

  const { data: activeToday } = await db
    .from('lesson_progress')
    .select('user_id')
    .eq('quiz_completed', true)
    .gte('completed_at', `${todayStr}T00:00:00Z`)

  const activeTodayIds = new Set((activeToday ?? []).map(r => r.user_id))

  const atRisk = streakUsers
    .filter(s => !activeTodayIds.has(s.user_id) && s.users?.fcm_token)
    .map(s => ({
      id:           s.user_id,
      display_name: s.users.display_name,
      fcm_token:    s.users.fcm_token,
      streak:       s.current_streak,
    }))

  fastify.log.info(`Streak-at-risk: notifying ${atRisk.length} users`)
  for (const user of atRisk) {
    await sendFcmBatch(fastify, [user], {
      title: `🔥 ${user.streak}-day streak at risk!`,
      body:  'Study now before midnight to keep your streak alive.',
    })
  }
}

async function sendStreakLost(fastify) {
  const db = fastify.supabase
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const cutoffStr = twoDaysAgo.toISOString().slice(0, 10)

  const { data: lostUsers } = await db
    .from('streaks')
    .select('user_id, current_streak, users!inner(fcm_token, display_name)')
    .gt('current_streak', 0)
    .lte('last_activity', cutoffStr)
    .not('users.fcm_token', 'is', null)

  if (!lostUsers?.length) return

  const userIds = lostUsers.map(u => u.user_id)
  await db.from('streaks').update({ current_streak: 0 }).in('user_id', userIds)

  const toNotify = lostUsers.map(s => ({
    id:           s.user_id,
    display_name: s.users.display_name,
    fcm_token:    s.users.fcm_token,
  }))

  fastify.log.info(`Streak-lost: notifying ${toNotify.length} users`)
  await sendFcmBatch(fastify, toNotify, {
    title: '💔 Your streak ended',
    body:  "Don't give up! Start a new streak today — every lesson counts.",
  })
}

async function sendFcmBatch(fastify, users, notification) {
  const FCM_KEY = process.env.FCM_SERVER_KEY
  if (!FCM_KEY) {
    fastify.log.warn('FCM_SERVER_KEY not set — skipping notifications')
    return
  }

  for (const user of users) {
    if (!user.fcm_token) continue
    try {
      const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
        method:  'POST',
        headers: {
          'Authorization': `key=${FCM_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          to:           user.fcm_token,
          notification: { title: notification.title, body: notification.body, sound: 'default' },
          data:         { click_action: 'FLUTTER_NOTIFICATION_CLICK' }
        })
      })
      if (!resp.ok) {
        fastify.log.warn({ userId: user.id, status: resp.status }, 'FCM send failed')
      }
    } catch (err) {
      fastify.log.error({ err, userId: user.id }, 'FCM send error')
    }
  }
}
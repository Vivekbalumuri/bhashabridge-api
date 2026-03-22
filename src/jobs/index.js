// src/jobs/index.js
// Background jobs — registered once when the Fastify server starts.
// Uses node-cron (add to package.json: "node-cron": "^3.0.3")

import cron from 'node-cron';
import { sendDailyReminders } from '../services/notifyService.js';

export function registerJobs(fastify) {

  // ── Self-ping every 14 min — prevents Render free tier cold starts ─────────
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL;
  if (SELF_URL) {
    cron.schedule('*/14 * * * *', async () => {
      try {
        await fetch(`${SELF_URL}/health`);
        fastify.log.info('[jobs] Self-ping OK');
      } catch (err) {
        fastify.log.warn('[jobs] Self-ping failed:', err.message);
      }
    });
    fastify.log.info(`[jobs] Self-ping registered — hitting ${SELF_URL}/health every 14 min`);
  } else {
    fastify.log.warn('[jobs] RENDER_EXTERNAL_URL not set — self-ping disabled');
  }

  // ── Daily reminder — 02:30 UTC = 08:00 AM IST every day ───────────────────
  cron.schedule('30 2 * * *', async () => {
    fastify.log.info('[jobs] Running daily reminder job');
    try {
      const result = await sendDailyReminders(fastify.supabase);
      fastify.log.info(`[jobs] Daily reminders done — ${result.sent} sent, ${result.failed} failed`);
    } catch (err) {
      fastify.log.error('[jobs] Daily reminder error:', err.message);
    }
  }, {
    timezone: 'UTC',
  });

  fastify.log.info('[jobs] Daily reminder cron registered (02:30 UTC = 08:00 AM IST)');

  // ── Streak-at-risk — 18:30 UTC = 00:00 midnight IST ───────────────────────
  // Warns users who haven't done a lesson today before their streak resets
  cron.schedule('30 18 * * *', async () => {
    fastify.log.info('[jobs] Running streak-at-risk job');
    try {
      const result = await sendStreakAtRiskReminders(fastify.supabase);
      fastify.log.info(`[jobs] Streak-at-risk done — ${result.sent} sent, ${result.failed} failed`);
    } catch (err) {
      fastify.log.error('[jobs] Streak-at-risk error:', err.message);
    }
  }, {
    timezone: 'UTC',
  });

  fastify.log.info('[jobs] Streak-at-risk cron registered (18:30 UTC = 00:00 midnight IST)');
}

// ── Streak-at-risk sender ─────────────────────────────────────────────────────
// Fetches users with an active streak who haven't done a lesson today
async function sendStreakAtRiskReminders(supabase) {
  const { sendPushNotification } = await import('./notifyService.js').catch(
    () => import('../services/notifyService.js')
  );

  const today = new Date().toISOString().split('T')[0];

  const { data: streaks, error } = await supabase
    .from('streaks')
    .select('user_id, current_streak, last_activity, users(fcm_token, display_name)')
    .gt('current_streak', 0)
    .neq('last_activity', today);

  if (error) {
    console.error('[jobs] streak-at-risk fetch error:', error.message);
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    (streaks ?? [])
      .filter(s => s.users?.fcm_token)
      .map(s =>
        sendPushNotification({
          token: s.users.fcm_token,
          title: `${s.current_streak} days — don't lose it!`,
          body:  "You're just hours away from losing your streak. One quick lesson saves it.",
          data:  { screen: 'lessons' },
        })
      )
  );

  return {
    sent:   results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}
// src/jobs/index.js
// Background jobs — registered once when the Fastify server starts.
// Uses node-cron (add to package.json: "node-cron": "^3.0.3")

import cron from 'node-cron';
import { sendDailyReminders } from '../services/notifyService.js';

export function registerJobs(fastify) {

  // ── Self-ping every 14 min — prevents Render free tier cold starts ────────
  // Render free tier sleeps after 15 min of inactivity. Pinging /health
  // every 14 min keeps the server warm. Remove this if you upgrade to paid.
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

  // ── Daily reminder — fires every day at 8:00 AM UTC ──────────────────────
  cron.schedule('0 8 * * *', async () => {
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

  fastify.log.info('[jobs] Daily reminder cron registered (08:00 UTC)');
}
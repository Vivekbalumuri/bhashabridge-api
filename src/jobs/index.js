// src/jobs/index.js
// Background jobs — registered once when the Fastify server starts.
// Uses node-cron (add to package.json: "node-cron": "^3.0.3")

import cron from 'node-cron';
import { sendDailyReminders } from '../services/notifyService.js';

export function registerJobs(fastify) {

  // ── Daily reminder — fires every day at 8:00 AM UTC ──────────────────────
  // Adjust the cron expression to match your target timezone if needed.
  // '0 8 * * *' = minute 0, hour 8, every day
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
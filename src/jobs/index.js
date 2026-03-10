import cron from 'node-cron';
import { recalcRanks } from '../services/leaderService.js';

export function startCronJobs() {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  const headers = { 'x-service-key': process.env.SUPABASE_SERVICE_KEY };

  // 1. Daily word notification — 8:00 AM IST = 2:30 AM UTC
  cron.schedule('30 2 * * *', async () => {
    try {
      await fetch(`${baseUrl}/notify/daily-word`, { method: 'POST', headers });
    } catch (error) {
      console.error('Job error - daily-word', error);
    }
  });

  // 2. Streak alert — 7:00 PM IST = 1:30 PM UTC
  cron.schedule('30 13 * * *', async () => {
    try {
      await fetch(`${baseUrl}/notify/streak-alert`, { method: 'POST', headers });
    } catch (error) {
      console.error('Job error - streak-alert', error);
    }
  });

  // 3. Weekly leaderboard recalc — Sunday midnight IST
  cron.schedule('30 18 * * 0', async () => {
    try {
      await recalcRanks();
    } catch (error) {
      console.error('Job error - recalcRanks', error);
    }
  });
}

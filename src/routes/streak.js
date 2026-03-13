import { supabase } from '../db.js';

export default async function streakRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET /streak ────────────────────────────────────────
  // FIX #2: was returning raw snake_case DB keys (current_streak, total_xp)
  // Android StreakData model expects camelCase (currentStreak, totalXp)
  fastify.get('/', async (request, reply) => {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });

    // FIX #3 (partial): if no streak row exists, upsert a default one
    // so new users always have a row after first GET /streak call
    const { data: streakRow, error } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak, total_xp, level, last_activity_date')
      .eq('user_id', userProfile.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return reply.code(400).send({ error: error.message });
    }

    // If no row found, create one so future upserts work correctly
    if (!streakRow) {
      await supabase
        .from('streaks')
        .upsert({ user_id: userProfile.id }, { onConflict: 'user_id' });
    }

    // Always return camelCase keys to match Android StreakData model:
    // streak, current_streak, last_activity, level, total_xp
    return {
      streak:         streakRow?.current_streak  || 0,
      current_streak: streakRow?.current_streak  || 0,
      longest_streak: streakRow?.longest_streak  || 0,
      last_activity:  streakRow?.last_activity_date || null,
      level:          streakRow?.level           || 1,
      total_xp:       streakRow?.total_xp        || 0,
    };
  });

  // ── GET /streak/history ────────────────────────────────
  // FIX #1: was querying non-existent `progress` table
  // Correct table is `lesson_progress`, correct date field is `completed_at`
  fastify.get('/history', async (request, reply) => {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // FIX: was `from('progress').select('updated_at, status')`
    // Correct: `from('lesson_progress').select('completed_at, quiz_completed')`
    const { data: progressRows, error } = await supabase
      .from('lesson_progress')
      .select('completed_at, quiz_completed')
      .eq('user_id', userProfile.id)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: false });

    if (error) return reply.code(400).send({ error: error.message });

    const historyMap = {};
    (progressRows || []).forEach(row => {
      if (!row.completed_at) return;
      const dbDate = row.completed_at.split('T')[0];
      if (!historyMap[dbDate] || historyMap[dbDate] !== true) {
        historyMap[dbDate] = row.quiz_completed === true;
      }
    });

    const results = Object.keys(historyMap).map(date => ({
      date,
      completed: historyMap[date]
    }));

    return results;
  });
}
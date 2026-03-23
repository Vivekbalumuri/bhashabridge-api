import { supabase } from '../db.js';

// XP thresholds per level — matches the progression shown in ProgressScreen
const XP_PER_LEVEL = 500;
function xpToLevel(totalXp) {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

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
      streak:         streakRow?.current_streak    || 0,
      current_streak: streakRow?.current_streak    || 0,
      longest_streak: streakRow?.longest_streak    || 0,
      last_activity:  streakRow?.last_activity_date || null,
      level:          streakRow?.level             || 1,
      total_xp:       streakRow?.total_xp          || 0,
    };
  });

  // ── POST /streak/add-xp ────────────────────────────────
  // Called by Android after a story chapter is completed.
  // Body: { chapter_id: Int, direction: String, xp_earned: Int }
  // Adds xp_earned to total_xp, recalculates level, and updates last_activity.
  fastify.post('/add-xp', async (request, reply) => {
    const { xp_earned, chapter_id, direction } = request.body;

    if (typeof xp_earned !== 'number' || xp_earned <= 0) {
      return reply.code(400).send({ error: 'xp_earned must be a positive number' });
    }

    // Resolve internal user id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });

    // Fetch current streak row (or start from zero if missing)
    const { data: streakRow } = await supabase
      .from('streaks')
      .select('total_xp, level, current_streak, longest_streak, last_activity_date')
      .eq('user_id', userProfile.id)
      .single();

    const prevXp      = streakRow?.total_xp          || 0;
    const prevStreak  = streakRow?.current_streak     || 0;
    const prevLongest = streakRow?.longest_streak     || 0;
    const newXp       = prevXp + xp_earned;
    const newLevel    = xpToLevel(newXp);

    // Update streak day if this is the first activity today
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = streakRow?.last_activity_date || null;
    let newStreak  = prevStreak;
    let newLongest = prevLongest;

    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      newStreak  = lastActivity === yesterdayStr ? prevStreak + 1 : 1;
      newLongest = Math.max(newStreak, prevLongest);
    }

    const { error: upsertError } = await supabase
      .from('streaks')
      .upsert(
        {
          user_id:            userProfile.id,
          total_xp:           newXp,
          level:              newLevel,
          current_streak:     newStreak,
          longest_streak:     newLongest,
          last_activity_date: today,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) return reply.code(500).send({ error: upsertError.message });

    return {
      success:        true,
      total_xp:       newXp,
      level:          newLevel,
      current_streak: newStreak,
      longest_streak: newLongest,
      xp_added:       xp_earned,
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
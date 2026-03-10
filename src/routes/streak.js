import { supabase } from '../db.js';

export default async function streakRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    const { data: streakRow, error } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak, total_xp, level, last_activity_date')
      .eq('user_id', userProfile.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return reply.code(400).send({ error: error.message });
    }

    return streakRow || {
      currentStreak: 0, longestStreak: 0, totalXp: 0, level: 1, lastActivityDate: null
    };
  });

  fastify.get('/history', async (request, reply) => {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: progressRows, error } = await supabase
      .from('progress')
      .select('updated_at, status')
      .eq('user_id', userProfile.id)
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false });

    if (error) return reply.code(400).send({ error: error.message });

    const historyMap = {};
    progressRows.forEach(row => {
      const dbDate = row.updated_at.split('T')[0];
      if (!historyMap[dbDate] || historyMap[dbDate] !== true) {
        historyMap[dbDate] = row.status === 'completed';
      }
    });

    const results = Object.keys(historyMap).map(date => ({
      date,
      completed: historyMap[date]
    }));

    return results;
  });
}

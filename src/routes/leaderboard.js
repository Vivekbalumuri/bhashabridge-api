import { supabase } from '../db.js';

export default async function leaderboardRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/weekly', async (request, reply) => {
    const { limit = 50 } = request.query;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, is_premium')
      .eq('supabase_uid', request.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });
    if (!userProfile.is_premium) {
      return reply.code(403).send({ error: "Premium feature only" });
    }

    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date.setDate(diff)).toISOString().split('T')[0];

    const { data: entries, error } = await supabase
      .from('leaderboard')
      .select('rank, weekly_xp, users(display_name)')
      .eq('week_start', weekStart)
      .order('rank', { ascending: true })
      .limit(parseInt(limit, 10));

    if (error) return reply.code(400).send({ error: error.message });

    const formattedEntries = entries.map(e => ({
      rank: e.rank,
      displayName: e.users?.display_name || 'Anonymous',
      weeklyXp: e.weekly_xp
    }));

    const { data: userRankRow } = await supabase
      .from('leaderboard')
      .select('rank')
      .eq('week_start', weekStart)
      .eq('user_id', userProfile.id)
      .single();

    return {
      entries: formattedEntries,
      userRank: userRankRow?.rank || null
    };
  });
}

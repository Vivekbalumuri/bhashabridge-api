// src/routes/leaderboard.js
import { supabase } from '../db.js';
import { getLeaderboard } from '../services/leaderService.js';

export default async function leaderboardRoutes(fastify) {

  fastify.get(
    '/leaderboard',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const currentUserId = request.user?.sub ?? request.user?.id ?? null;
        const limit = Math.min(parseInt(request.query.limit ?? '50'), 100);

        const result = await getLeaderboard(supabase, currentUserId, limit);  // pass supabase directly
        return reply.send(result);

      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to load leaderboard' });
      }
    }
  );
}
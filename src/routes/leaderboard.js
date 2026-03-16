// src/routes/leaderboard.js
// GET /leaderboard  — returns top 50 users by XP with current user's rank

import { getLeaderboard } from '../services/leaderService.js';

export default async function leaderboardRoutes(fastify) {

  fastify.get(
    '/leaderboard',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const currentUserId = request.user?.sub ?? request.user?.id ?? null;
        const limit = Math.min(parseInt(request.query.limit ?? '50'), 100);

        const result = await getLeaderboard(fastify.supabase, currentUserId, limit);
        return reply.send(result);

      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to load leaderboard' });
      }
    }
  );
}
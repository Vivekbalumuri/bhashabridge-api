import fp from 'fastify-plugin';
import { supabase } from '../db.js';

export const authPlugin = fp(async function (fastify, options) {
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing or invalid token' });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
      }

      request.user = user;
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
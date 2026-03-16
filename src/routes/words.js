// src/routes/words.js
// Registered in server.js with prefix: '/words'
// So paths here must NOT include '/words' — just '/daily', '/', '/:id'
import { supabase } from '../db.js';
import { getDailyWord } from '../services/wordOfDayService.js';

export default async function wordRoutes(fastify) {

  // ── GET /words/daily ──────────────────────────────────────────────────────
  // MUST be registered before /:id — otherwise Fastify's wildcard catches
  // the literal string "daily" as an :id param and this handler is skipped.
  // ?direction=te-en  (optional — defaults to te-en)
  fastify.get(
    '/daily',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const direction = request.query.direction ?? 'te-en';
        const word = await getDailyWord(supabase, direction);

        if (!word) {
          return reply.status(404).send({ error: 'No word found' });
        }

        return reply.send({ word });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to fetch daily word' });
      }
    }
  );

  // ── GET /words ────────────────────────────────────────────────────────────
  // ?lesson_id=<uuid>
  fastify.get(
    '/',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { lesson_id } = request.query;

      if (!lesson_id) {
        return reply.status(400).send({ error: 'lesson_id is required' });
      }

      const { data: words, error } = await supabase
        .from('words')
        .select('*')
        .eq('lesson_id', lesson_id)
        .order('sort_order');

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch words' });
      }

      return reply.send({ words, total: words.length });
    }
  );

  // ── GET /words/:id ────────────────────────────────────────────────────────
  // Registered LAST so it never shadows /daily or /
  fastify.get(
    '/:id',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { id } = request.params;

      const { data: word, error } = await supabase
        .from('words')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !word) {
        return reply.status(404).send({ error: 'Word not found' });
      }

      return reply.send({ word });
    }
  );
}
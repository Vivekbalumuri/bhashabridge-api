// src/routes/words.js
// GET /words/daily   — deterministic daily word based on UTC date + direction
// GET /words         — all words for a lesson_id
// GET /words/:id     — single word

import { getDailyWord } from '../services/wordOfDayService.js';

export default async function wordRoutes(fastify) {

  // ── GET /words/daily ────────────────────────────────────────────────────
  // ?direction=te-en  (optional — falls back to user's stored direction or te-en)
  fastify.get(
    '/words/daily',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        // Direction from query param, or fall back to te-en
        const direction = request.query.direction ?? 'te-en';
        const word = await getDailyWord(fastify.supabase, direction);

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

  // ── GET /words ───────────────────────────────────────────────────────────
  // ?lesson_id=<uuid>  returns all words for that lesson
  fastify.get(
    '/words',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { lesson_id } = request.query;

      if (!lesson_id) {
        return reply.status(400).send({ error: 'lesson_id is required' });
      }

      const { data: words, error } = await fastify.supabase
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

  // ── GET /words/:id ───────────────────────────────────────────────────────
  fastify.get(
    '/words/:id',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { id } = request.params;

      const { data: word, error } = await fastify.supabase
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
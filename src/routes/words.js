// src/routes/words.js
import { supabase } from '../db.js';
import { getDailyWord, getDailySet } from '../services/wordOfDayService.js';

export default async function wordRoutes(fastify) {

  fastify.get('/daily/set', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const direction = request.query.direction ?? 'te-en';
      const words = await getDailySet(supabase, direction);
      if (!words?.length) return reply.status(404).send({ error: 'No words found' });
      return reply.send({ words, total: words.length });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch daily set' });
    }
  });

  fastify.get('/daily', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const direction = request.query.direction ?? 'te-en';
      const word = await getDailyWord(supabase, direction);
      if (!word) return reply.status(404).send({ error: 'No word found' });
      return reply.send({ word });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch daily word' });
    }
  });

  fastify.get('/', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { lesson_id } = request.query;
    if (!lesson_id) return reply.status(400).send({ error: 'lesson_id is required' });
    const { data: words, error } = await supabase
      .from('words').select('*').eq('lesson_id', lesson_id).order('sort_order');
    if (error) return reply.status(500).send({ error: 'Failed to fetch words' });
    return reply.send({ words, total: words.length });
  });

  fastify.get('/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params;
    const { data: word, error } = await supabase
      .from('words').select('*').eq('id', id).single();
    if (error || !word) return reply.status(404).send({ error: 'Word not found' });
    return reply.send({ word });
  });
}
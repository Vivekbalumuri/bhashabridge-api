import { supabase } from '../db.js';

export default async function lessonsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;
    if (!direction) return reply.code(400).send({ error: "direction is required" });

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('direction', direction)
      .order('module_order', { ascending: true });

    if (error) return reply.code(400).send({ error: error.message });
    return { lessons };
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError) return reply.code(400).send({ error: lessonError.message });

    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    return { lesson, words };
  });
}

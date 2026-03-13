import { supabase } from '../db.js';

export default async function wordsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── GET /words/daily ─────────────────────────────────────────────────────
  // MUST be registered BEFORE /:id — otherwise "daily" is parsed as a UUID
  fastify.get('/daily', async (request, reply) => {
    // Pick word of the day based on date (same word for everyone each day)
    const today = new Date();
    const dayOfYear = Math.floor(
      (today - new Date(today.getFullYear(), 0, 0)) / 86400000
    );

    // Fetch from te-en lessons only — avoids returning duplicate english words
    // across the 6 direction copies in the words table
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('direction', 'te-en')
      .limit(50);

    if (!lessons || lessons.length === 0) {
      return reply.code(404).send({ error: 'No lessons found' });
    }

    const lessonIds = lessons.map(l => l.id);

    const { data: words, error } = await supabase
      .from('words')
      .select('id, english, tamil, telugu, translit_tamil, translit_telugu, dravidian_note, category')
      .in('lesson_id', lessonIds)
      .order('created_at', { ascending: true })
      .limit(300);

    if (error || !words || words.length === 0) {
      return reply.code(404).send({ error: 'No words found' });
    }

    const word = words[dayOfYear % words.length];
    return { word };
  });

  // ─── GET /words/:id ───────────────────────────────────────────────────────
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;

    const { data: word, error } = await supabase
      .from('words')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return reply.code(404).send({ error: 'Word not found' });
    return { word };
  });
}
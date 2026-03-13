import { supabase } from '../db.js';

export default async function wordsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── GET /words/daily ─────────────────────────────────────────────────────
  // MUST be registered BEFORE /:id — otherwise "daily" is parsed as a UUID
  fastify.get('/daily', async (request, reply) => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today - new Date(today.getFullYear(), 0, 0)) / 86400000
    );

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

  // ─── GET /words?direction= ────────────────────────────────────────────────
  // FIX: new endpoint for CardsScreen — returns all words for a direction.
  // Must be registered BEFORE /:id so "direction" param isn't parsed as a UUID.
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;

    if (!direction) {
      return reply.code(400).send({ error: 'direction query param is required' });
    }

    // Fetch all lessons for this direction
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('direction', direction);

    if (lessonsError) return reply.code(400).send({ error: lessonsError.message });
    if (!lessons || lessons.length === 0) {
      return { words: [], total: 0 };
    }

    const lessonIds = lessons.map(l => l.id);

    const { data: words, error } = await supabase
      .from('words')
      .select('id, english, tamil, telugu, translit_tamil, translit_telugu, dravidian_note, category, difficulty')
      .in('lesson_id', lessonIds)
      .order('created_at', { ascending: true });

    if (error) return reply.code(400).send({ error: error.message });

    return { words: words || [], total: words?.length ?? 0 };
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
import { supabase } from '../db.js';

// Helper: get source/target text from a word row based on direction
function getLangText(word, langCode) {
  switch (langCode) {
    case 'te': return { text: word.telugu  || '', translit: word.translit_telugu  || null };
    case 'ta': return { text: word.tamil   || '', translit: word.translit_tamil   || null };
    case 'ml': return { text: word.malayalam || '', translit: word.translit_malayalam || null };
    default:   return { text: word.english || '', translit: null };
  }
}

// Helper: pick the "also" (third bonus) language — not source, not target
function getAlsoLang(sourceLang, targetLang) {
  const all = ['te', 'ta', 'ml', 'en'];
  return all.find(l => l !== sourceLang && l !== targetLang) || 'en';
}

// Helper: deduplicate words by english field — keep first occurrence
function dedupWords(words) {
  const seen = new Set();
  return words.filter(w => {
    if (seen.has(w.english)) return false;
    seen.add(w.english);
    return true;
  });
}

export default async function lessonRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET /lessons?direction= ───────────────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;

    let query = supabase
      .from('lessons')
      .select('id, title, description, direction, module_order, order_index, is_premium, skill_type, word_count, tier, xp_reward')
      .order('module_order', { ascending: true });

    if (direction) query = query.eq('direction', direction);

    const { data: lessons, error } = await query;
    if (error) return reply.code(400).send({ error: error.message });

    return { lessons: lessons || [] };
  });

  // ── GET /lessons/:id/learn ────────────────────────────────────────────────
  fastify.get('/:id/learn', async (request, reply) => {
    const { id } = request.params;

    // Fetch the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError || !lesson) {
      return reply.code(404).send({ error: 'Lesson not found' });
    }

    // Fetch words for this lesson
    const { data: rawWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('created_at', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    // DEDUP — prevents 500 from duplicate word rows
    const words = dedupWords(rawWords || []);

    if (words.length === 0) {
      return reply.code(404).send({ error: 'No words found for this lesson' });
    }

    // Parse direction to get source and target language codes
    const direction  = lesson.direction || 'te-en';
    const parts      = direction.split('-');
    const sourceLang = parts[0]; // language being learned (front of card)
    const targetLang = parts[1]; // user's base language   (back of card)
    const alsoLang   = getAlsoLang(sourceLang, targetLang);

    // Build flashcards
    const flashcards = words.map((word, index) => {
      const front = getLangText(word, sourceLang);
      const back  = getLangText(word, targetLang);
      const also  = getLangText(word, alsoLang);

      return {
        index,
        word_id: word.id,
        front: {
          text:            front.text,
          translit:        front.translit,
          lang:            sourceLang,
          audio_text:      front.text,
          audio_lang_code: sourceLang,
        },
        back: {
          text:            back.text,
          translit:        back.translit,
          lang:            targetLang,
          audio_text:      back.text,
          audio_lang_code: targetLang,
        },
        also: {
          text:            also.text,
          translit:        also.translit,
          lang:            alsoLang,
          audio_text:      also.text,
          audio_lang_code: alsoLang,
        },
        dravidian_note: word.dravidian_note || null,
      };
    });

    return {
      lesson,
      phase:       'learn',
      base_lang:   targetLang,
      learn_lang:  sourceLang,
      total_cards: flashcards.length,
      flashcards,
    };
  });

  // ── GET /lessons/:id/quiz ─────────────────────────────────────────────────
  fastify.get('/:id/quiz', async (request, reply) => {
    const { id } = request.params;

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError || !lesson) {
      return reply.code(404).send({ error: 'Lesson not found' });
    }

    const { data: rawWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('created_at', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    // DEDUP — prevents 500 from duplicate word rows
    const words = dedupWords(rawWords || []);

    if (words.length === 0) {
      return reply.code(404).send({ error: 'No words found for this lesson' });
    }

    const direction  = lesson.direction || 'te-en';
    const parts      = direction.split('-');
    const sourceLang = parts[0];
    const targetLang = parts[1];

    // Build MCQ questions — question is source lang, options are target lang
    const questions = words.map((word, index) => {
      const questionSide = getLangText(word, sourceLang);
      const correctSide  = getLangText(word, targetLang);

      // Pick 3 wrong options from other words in the lesson
      const otherWords = words.filter(w => w.id !== word.id);
      const shuffled   = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
      const wrongOptions = shuffled.map(w => ({
        id:      w.id + '_wrong',
        text:    getLangText(w, targetLang).text,
        correct: false,
      }));

      // Insert correct option at random position
      const correctOption = {
        id:      word.id + '_correct',
        text:    correctSide.text,
        correct: true,
      };
      const insertAt = Math.floor(Math.random() * 4);
      const options  = [...wrongOptions];
      options.splice(insertAt, 0, correctOption);

      return {
        index,
        word_id: word.id,
        question: {
          text:            questionSide.text,
          translit:        questionSide.translit,
          lang:            sourceLang,
          audio_text:      questionSide.text,
          audio_lang_code: sourceLang,
        },
        options,
      };
    });

    return {
      lesson,
      phase:           'quiz',
      base_lang:       targetLang,
      learn_lang:      sourceLang,
      total_questions: questions.length,
      questions,
    };
  });
}

import { supabase } from '../db.js';

export default async function lessonsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /lessons?direction=te-en
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;
    if (!direction) return reply.code(400).send({ error: 'direction is required' });

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('direction', direction)
      .order('module_order', { ascending: true });

    if (error) return reply.code(400).send({ error: error.message });
    return { lessons };
  });

  // GET /lessons/:id
  // Returns lesson + words (unchanged, keep Android compat)
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

  // ─── NEW ────────────────────────────────────────────────────────────────────
  // GET /lessons/:id/learn
  // Returns flashcard-ready learn phase — one card per word with both scripts
  // and transliterations for pronunciation display.
  //
  // Response shape:
  // {
  //   lesson: { id, title, direction, ... },
  //   phase: "learn",
  //   total_cards: 10,
  //   flashcards: [
  //     {
  //       index: 0,
  //       word_id: "uuid",
  //       front: { text: "నమస్కారం", translit: "Namaskāraṁ", lang: "telugu" },
  //       back:  { text: "Hello",    translit: null,           lang: "english" },
  //       also:  { text: "வணக்கம்",  translit: "Vaṇakkam",    lang: "tamil" },
  //       dravidian_note: "..." | null
  //     }, ...
  //   ]
  // }
  fastify.get('/:id/learn', async (request, reply) => {
    const { id } = request.params;

    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError) return reply.code(404).send({ error: 'Lesson not found' });

    // Fetch words ordered for learning
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });
    if (!words || words.length === 0)
      return reply.code(404).send({ error: 'No words found for this lesson' });

    // direction e.g. "te-en", "ta-te", "en-ta"
    const [fromLang, toLang] = (lesson.direction || 'te-en').split('-');

    // Map language code → word field names
    const fieldMap = {
      te: { text: 'telugu',  translit: 'translit_telugu' },
      ta: { text: 'tamil',   translit: 'translit_tamil'  },
      en: { text: 'english', translit: null               },
    };

    const langName = { te: 'telugu', ta: 'tamil', en: 'english' };

    // Third language = the one that is neither from nor to
    const allLangs   = ['te', 'ta', 'en'];
    const thirdLang  = allLangs.find(l => l !== fromLang && l !== toLang);

    const flashcards = words.map((word, index) => {
      const fromField = fieldMap[fromLang];
      const toField   = fieldMap[toLang];
      const alsoField = fieldMap[thirdLang];

      return {
        index,
        word_id: word.id,
        front: {
          text:    word[fromField.text]    || '',
          translit: fromField.translit ? (word[fromField.translit] || null) : null,
          lang:    langName[fromLang],
        },
        back: {
          text:    word[toField.text]      || '',
          translit: toField.translit ? (word[toField.translit] || null) : null,
          lang:    langName[toLang],
        },
        also: {
          text:    word[alsoField.text]    || '',
          translit: alsoField.translit ? (word[alsoField.translit] || null) : null,
          lang:    langName[thirdLang],
        },
        dravidian_note: word.dravidian_note || null,
      };
    });

    return {
      lesson,
      phase:       'learn',
      total_cards: flashcards.length,
      flashcards,
    };
  });

  // ─── NEW ────────────────────────────────────────────────────────────────────
  // GET /lessons/:id/quiz
  // Returns quiz questions AFTER learn phase.
  // Each question has 1 correct answer + 3 wrong options (shuffled).
  //
  // Response shape:
  // {
  //   lesson: { ... },
  //   phase: "quiz",
  //   total_questions: 10,
  //   questions: [
  //     {
  //       index: 0,
  //       word_id: "uuid",
  //       question: { text: "నమస్కారం", translit: "Namaskāraṁ", lang: "telugu" },
  //       options: [
  //         { id: "uuid", text: "Hello",    correct: true  },
  //         { id: "uuid", text: "Thank you",correct: false },
  //         { id: "uuid", text: "Goodbye",  correct: false },
  //         { id: "uuid", text: "Yes",      correct: false },
  //       ]
  //     }, ...
  //   ]
  // }
  fastify.get('/:id/quiz', async (request, reply) => {
    const { id } = request.params;

    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError) return reply.code(404).send({ error: 'Lesson not found' });

    // Fetch all words for this lesson
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });
    if (!words || words.length === 0)
      return reply.code(404).send({ error: 'No words found for this lesson' });

    const [fromLang, toLang] = (lesson.direction || 'te-en').split('-');

    const fieldMap = {
      te: { text: 'telugu',  translit: 'translit_telugu' },
      ta: { text: 'tamil',   translit: 'translit_tamil'  },
      en: { text: 'english', translit: null               },
    };
    const langName = { te: 'telugu', ta: 'tamil', en: 'english' };

    const fromField = fieldMap[fromLang];
    const toField   = fieldMap[toLang];

    // Build questions — for each word, pick 3 wrong answers from other words
    const questions = words.map((word, index) => {
      const otherWords = words.filter(w => w.id !== word.id);

      // Shuffle and take 3 distractors
      const distractors = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Build options array and shuffle
      const options = [
        { id: word.id, text: word[toField.text] || '', correct: true },
        ...distractors.map(d => ({
          id:      d.id,
          text:    d[toField.text] || '',
          correct: false,
        })),
      ].sort(() => Math.random() - 0.5);

      return {
        index,
        word_id: word.id,
        question: {
          text:     word[fromField.text]    || '',
          translit: fromField.translit ? (word[fromField.translit] || null) : null,
          lang:     langName[fromLang],
        },
        options,
      };
    });

    return {
      lesson,
      phase:           'quiz',
      total_questions: questions.length,
      questions,
    };
  });
}
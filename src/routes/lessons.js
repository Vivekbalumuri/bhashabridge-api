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

  // ─── GET /lessons/:id/learn ─────────────────────────────────────────────────
  // Flashcard teaching phase.
  // front = language being learned (toLang)
  // back  = user's base language (fromLang) — what they already know
  // script is included for all but hidden by Android for free users
  //
  // Each card also carries `audio_text` + `audio_lang` so Android TTS
  // can speak the word using:
  //   val locale = Locale("te") / Locale("ta") / Locale("en")
  //   tts.language = locale
  //   tts.speak(card.audio_text, ...)
  //
  // Response:
  // {
  //   lesson, phase:"learn", total_cards,
  //   base_lang: "telugu",        ← user knows this already
  //   learn_lang: "english",      ← user is learning this
  //   flashcards: [{
  //     index, word_id,
  //     front: { text, translit, lang, audio_text, audio_lang_code },
  //     back:  { text, translit, lang },
  //     also:  { text, translit, lang },
  //     dravidian_note
  //   }]
  // }
  fastify.get('/:id/learn', async (request, reply) => {
    const { id } = request.params;

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError) return reply.code(404).send({ error: 'Lesson not found' });

    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });
    if (!words || words.length === 0)
      return reply.code(404).send({ error: 'No words found for this lesson' });

    // direction = "te-en" means user knows Telugu, learning English
    const [fromLang, toLang] = (lesson.direction || 'te-en').split('-');

    const fieldMap = {
      te: { text: 'telugu',  translit: 'translit_telugu', tts_code: 'te' },
      ta: { text: 'tamil',   translit: 'translit_tamil',  tts_code: 'ta' },
      en: { text: 'english', translit: null,               tts_code: 'en' },
    };
    const langName = { te: 'telugu', ta: 'tamil', en: 'english' };
    const allLangs  = ['te', 'ta', 'en'];
    const thirdLang = allLangs.find(l => l !== fromLang && l !== toLang);

    const flashcards = words.map((word, index) => {
      const from  = fieldMap[fromLang];
      const to    = fieldMap[toLang];
      const also  = fieldMap[thirdLang];

      return {
        index,
        word_id: word.id,
        // FRONT — the word being learned (toLang)
        front: {
          text:           word[to.text]    || '',
          translit:       to.translit      ? (word[to.translit] || null) : null,
          lang:           langName[toLang],
          audio_text:     word[to.text]    || '',   // feed directly to TTS
          audio_lang_code: to.tts_code,             // "te" / "ta" / "en"
        },
        // BACK — user's base language (what they already know)
        back: {
          text:     word[from.text]   || '',
          translit: from.translit     ? (word[from.translit] || null) : null,
          lang:     langName[fromLang],
        },
        // ALSO — third language (always shown as bonus)
        also: {
          text:     word[also.text]   || '',
          translit: also.translit     ? (word[also.translit] || null) : null,
          lang:     langName[thirdLang],
        },
        dravidian_note: word.dravidian_note || null,
      };
    });

    return {
      lesson,
      phase:       'learn',
      base_lang:   langName[fromLang],
      learn_lang:  langName[toLang],
      total_cards: flashcards.length,
      flashcards,
    };
  });

  // ─── GET /lessons/:id/quiz ──────────────────────────────────────────────────
  // Quiz phase — only accessible after listen is completed.
  // question = word in learn_lang (what they just studied)
  // options  = 4 choices in base_lang (what they know)
  // Enforces: must have listen_completed = true in lesson_progress
  //
  // Response:
  // {
  //   lesson, phase:"quiz", total_questions,
  //   questions: [{
  //     index, word_id,
  //     question: { text, translit, lang, audio_text, audio_lang_code },
  //     options:  [{ id, text, correct }, ...]   ← shuffled
  //   }]
  // }
  fastify.get('/:id/quiz', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;

    // Enforce: user must have completed listen phase first
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('listen_completed')
      .eq('user_id', userId)
      .eq('lesson_id', id)
      .single();

    if (!progress?.listen_completed) {
      return reply.code(403).send({
        error:   'listen_required',
        message: 'You must complete the listen phase before taking the quiz.',
      });
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError) return reply.code(404).send({ error: 'Lesson not found' });

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
      te: { text: 'telugu',  translit: 'translit_telugu', tts_code: 'te' },
      ta: { text: 'tamil',   translit: 'translit_tamil',  tts_code: 'ta' },
      en: { text: 'english', translit: null,               tts_code: 'en' },
    };
    const langName = { te: 'telugu', ta: 'tamil', en: 'english' };

    const from = fieldMap[fromLang];
    const to   = fieldMap[toLang];

    const questions = words.map((word, index) => {
      const distractors = words
        .filter(w => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [
        { id: word.id, text: word[from.text] || '', correct: true },
        ...distractors.map(d => ({
          id:      d.id,
          text:    d[from.text] || '',
          correct: false,
        })),
      ].sort(() => Math.random() - 0.5);

      return {
        index,
        word_id: word.id,
        // Question shows the learned language word
        question: {
          text:            word[to.text]    || '',
          translit:        to.translit      ? (word[to.translit] || null) : null,
          lang:            langName[toLang],
          audio_text:      word[to.text]    || '',
          audio_lang_code: to.tts_code,
        },
        // Options are in base language (what user knows)
        options,
      };
    });

    return {
      lesson,
      phase:           'quiz',
      base_lang:       langName[fromLang],
      learn_lang:      langName[toLang],
      total_questions: questions.length,
      questions,
    };
  });
}
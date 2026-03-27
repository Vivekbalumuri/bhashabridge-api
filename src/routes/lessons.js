import { supabase } from '../db.js';

function getLangText(word, langCode) {
  switch (langCode) {
    case 'te': return { text: word.telugu     || '', translit: word.translit_telugu     || null };
    case 'ta': return { text: word.tamil      || '', translit: word.translit_tamil      || null };
    case 'ml': return { text: word.malayalam  || '', translit: word.translit_malayalam  || null };
    case 'kn': return { text: word.kannada    || '', translit: word.translit_kannada    || null };
    default:   return { text: word.english    || '', translit: null };
  }
}

function resolveText(langData, langCode, word) {
  if (langData.text) return langData;
  if (langCode === 'en') return langData;
  return { text: word.english || '', translit: langData.translit };
}

function getAlsoLang(sourceLang, targetLang) {
  const all = ['te', 'ta', 'ml', 'kn', 'en'];
  return all.find(l => l !== sourceLang && l !== targetLang) || 'en';
}

function dedupById(words) {
  const seen = new Set();
  return words.filter(w => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}

function getQuizType(index, isPremium) {
  if (!isPremium) return 'mcq';
  const types = ['mcq', 'mcq', 'true_false', 'mcq', 'tap_correct',
                 'mcq', 'true_false', 'tap_correct', 'mcq', 'mcq'];
  return types[index % types.length];
}

// distractorPool is always the SESSION words (same 10 shown in learn phase)
function buildTrueFalseOptions(word, distractorPool, targetLang) {
  const showCorrect = Math.random() > 0.5;
  if (showCorrect) {
    const ld = resolveText(getLangText(word, targetLang), targetLang, word);
    return [{ id: word.id + '_tf', text: ld.text, correct: true }];
  }
  const wrong = distractorPool[Math.floor(Math.random() * distractorPool.length)];
  const ld = resolveText(getLangText(wrong || word, targetLang), targetLang, wrong || word);
  return [{ id: (wrong?.id || word.id) + '_tf', text: ld.text, correct: false }];
}

function buildTapCorrectOptions(word, distractorPool, targetLang) {
  const correctLd = resolveText(getLangText(word, targetLang), targetLang, word);
  const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
  const wrongPool = [...distractorPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map(w => {
      const ld = resolveText(getLangText(w, targetLang), targetLang, w);
      return { id: w.id + '_wrong', text: ld.text, correct: false };
    });
  const options = [...wrongPool];
  options.splice(Math.floor(Math.random() * options.length), 0, correctOption);
  return options.slice(0, 6);
}

async function getUserIsPremium(supabaseUid) {
  try {
    const { data } = await supabase
      .from('users')
      .select('is_premium')
      .eq('supabase_uid', supabaseUid)
      .single();
    return data?.is_premium === true;
  } catch (_) {
    return false;
  }
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
    const [lessonResult, isPremium] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', id).single(),
      getUserIsPremium(request.user.id),
    ]);
    const { data: lesson, error: lessonError } = lessonResult;
    if (lessonError || !lesson) return reply.code(404).send({ error: 'Lesson not found' });
    if (lesson.is_premium && !isPremium) return reply.code(403).send({ error: 'Premium lesson' });

    const { data: rawWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });
    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    const allWords = dedupById(rawWords || []);
    if (allWords.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    const isScriptLesson = lesson.module_order >= 1 && lesson.module_order <= 18;
    const words = isScriptLesson
      ? [...allWords].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)).slice(0, 10)
      : [...allWords].sort(() => Math.random() - 0.5).slice(0, 10);

    const direction = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');
    const alsoLang = getAlsoLang(sourceLang, targetLang);

    const flashcards = words.map((word, index) => {
      const rawFront = getLangText(word, sourceLang);
      const rawBack  = getLangText(word, targetLang);
      const rawAlso  = getLangText(word, alsoLang);

      const front = resolveText(rawFront, sourceLang, word);
      const back  = resolveText(rawBack,  targetLang, word);
      const also  = resolveText(rawAlso,  alsoLang,   word);

      return {
        index,
        word_id: word.id,
        front: {
          text:            front.text,
          translit:        rawFront.translit,
          lang:            sourceLang,
          audio_text:      rawFront.text || word.english,
          audio_lang_code: sourceLang,
        },
        back: {
          text:            back.text,
          translit:        rawBack.translit,
          lang:            targetLang,
          audio_text:      rawBack.text || word.english,
          audio_lang_code: targetLang,
        },
        also: {
          text:            also.text,
          translit:        rawAlso.translit,
          lang:            alsoLang,
          audio_text:      rawAlso.text || word.english,
          audio_lang_code: alsoLang,
        },
        dravidian_note: word.dravidian_note || null,
      };
    });

    return {
      lesson,
      phase:           'learn',
      base_lang:       targetLang,
      learn_lang:      sourceLang,
      total_cards:     flashcards.length,
      flashcards,
      is_premium_user: isPremium,
    };
  });

  // ── GET /lessons/:id/quiz ─────────────────────────────────────────────────
  fastify.get('/:id/quiz', async (request, reply) => {
    const { id } = request.params;

    const [lessonResult, isPremium] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', id).single(),
      getUserIsPremium(request.user.id),
    ]);
    const { data: lesson, error: lessonError } = lessonResult;
    if (lessonError || !lesson) return reply.code(404).send({ error: 'Lesson not found' });
    if (lesson.is_premium && !isPremium) return reply.code(403).send({ error: 'Premium lesson' });

    const { data: rawWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });
    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    const allWords = dedupById(rawWords || []);
    if (allWords.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    // KEY FIX: pick the session words first (same 10 the user saw in learn phase).
    // ALL questions AND ALL distractor options come ONLY from these 10 words.
    // This means the user is never tested on or shown words they haven't seen yet.
    const isScriptLesson = lesson.module_order >= 1 && lesson.module_order <= 18;
    const sessionWords = isScriptLesson
      ? [...allWords].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)).slice(0, 10)
      : [...allWords].sort(() => Math.random() - 0.5).slice(0, 10);

    // Shuffle the session words so question order differs from learn order
    const words = [...sessionWords].sort(() => Math.random() - 0.5);

    const direction = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');

    const questions = words.map((word, index) => {
      const rawQuestion = getLangText(word, sourceLang);
      const question    = resolveText(rawQuestion, sourceLang, word);
      const type        = getQuizType(index, isPremium);

      // ONLY use other words from the same 10-word session as distractors.
      // Never pull from allWords (full lesson) — that would show unseen words.
      const distractorPool = sessionWords.filter(w => w.id !== word.id);

      let options;
      switch (type) {
        case 'true_false':
          options = buildTrueFalseOptions(word, distractorPool, targetLang);
          break;

        case 'tap_correct':
          options = buildTapCorrectOptions(word, distractorPool, targetLang);
          break;

        default: { // mcq
          const shuffledDistractors = [...distractorPool]
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

          const wrongOptions = shuffledDistractors.map(w => {
            const ld = resolveText(getLangText(w, targetLang), targetLang, w);
            return { id: w.id + '_wrong', text: ld.text, correct: false };
          });

          // Pad only if session has fewer than 4 words (very small lessons)
          while (wrongOptions.length < 3) {
            wrongOptions.push({ id: `pad_${wrongOptions.length}`, text: '—', correct: false });
          }

          const correctLd     = resolveText(getLangText(word, targetLang), targetLang, word);
          const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
          const insertAt      = Math.floor(Math.random() * 4);
          options = [...wrongOptions];
          options.splice(insertAt, 0, correctOption);
          break;
        }
      }

      return {
        index,
        word_id: word.id,
        type,
        question: {
          text:            question.text,
          translit:        rawQuestion.translit,
          lang:            sourceLang,
          audio_text:      rawQuestion.text || word.english,
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
      is_premium_user: isPremium,
    };
  });

  // ── GET /lessons/final-exam/:direction ────────────────────────────────────
  fastify.get('/final-exam/:direction', async (request, reply) => {
    const { direction } = request.params;
    const isPremium = await getUserIsPremium(request.user.id);

    const { data: lessonRows, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('direction', direction)
      .gte('module_order', 1)
      .lte('module_order', 18);

    if (lessonError) return reply.code(400).send({ error: lessonError.message });
    if (!lessonRows?.length) {
      return reply.code(404).send({ error: 'No alphabet lessons found for this direction' });
    }

    const lessonIds = lessonRows.map(l => l.id);

    const { data: rawWords, error } = await supabase
      .from('words')
      .select(`
        id, english, telugu, tamil, malayalam, kannada,
        translit_telugu, translit_tamil, translit_malayalam, translit_kannada,
        dravidian_note, sort_order
      `)
      .in('lesson_id', lessonIds);

    if (error) return reply.code(400).send({ error: error.message });

    const allWords = dedupById(rawWords || []);
    if (allWords.length === 0) {
      return reply.code(404).send({ error: 'No alphabet words found for this direction' });
    }

    // Final exam: pick 15 words — distractors from the same 15
    const examWords = [...allWords].sort(() => Math.random() - 0.5).slice(0, 15);
    const [sourceLang, targetLang] = direction.split('-');

    const questions = examWords.map((word, index) => {
      const rawQuestion = getLangText(word, sourceLang);
      const question    = resolveText(rawQuestion, sourceLang, word);
      const type        = getQuizType(index, isPremium);

      // Distractors only from the 15 exam words — same principle
      const distractorPool = examWords.filter(w => w.id !== word.id);

      let options;
      switch (type) {
        case 'true_false':
          options = buildTrueFalseOptions(word, distractorPool, targetLang);
          break;

        case 'tap_correct':
          options = buildTapCorrectOptions(word, distractorPool, targetLang);
          break;

        default: {
          const shuffled = [...distractorPool]
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

          const wrongOptions = shuffled.map(w => {
            const ld = resolveText(getLangText(w, targetLang), targetLang, w);
            return { id: w.id + '_wrong', text: ld.text, correct: false };
          });

          while (wrongOptions.length < 3) {
            wrongOptions.push({ id: `pad_${wrongOptions.length}`, text: '—', correct: false });
          }

          const correctLd    = resolveText(getLangText(word, targetLang), targetLang, word);
          const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
          options = [...wrongOptions];
          options.splice(Math.floor(Math.random() * 4), 0, correctOption);
          break;
        }
      }

      return {
        index,
        word_id: word.id,
        type,
        question: {
          text:            question.text,
          translit:        rawQuestion.translit,
          lang:            sourceLang,
          audio_text:      rawQuestion.text || word.english,
          audio_lang_code: sourceLang,
        },
        options,
      };
    });

    return {
      lesson: {
        id:           `final-exam-${direction}`,
        title:        'Final Exam',
        description:  'Test everything you have learned — all alphabets and phonics',
        direction,
        module_order: 19,
        skill_type:   'final_exam',
        is_premium:   false,
        word_count:   questions.length,
      },
      phase:           'quiz',
      base_lang:       targetLang,
      learn_lang:      sourceLang,
      total_questions: questions.length,
      questions,
      is_premium_user: isPremium,
    };
  });
}
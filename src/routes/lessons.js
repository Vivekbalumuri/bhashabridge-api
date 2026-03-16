import { supabase } from '../db.js';

// Helper: get source/target text from a word row based on direction
function getLangText(word, langCode) {
  switch (langCode) {
    case 'te': return { text: word.telugu     || '', translit: word.translit_telugu     || null };
    case 'ta': return { text: word.tamil      || '', translit: word.translit_tamil      || null };
    case 'ml': return { text: word.malayalam  || '', translit: word.translit_malayalam  || null };
    default:   return { text: word.english    || '', translit: null };
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

// Helper: assign quiz type based on question index
// Rotates through types so a 10-word lesson gets variety
function getQuizType(index) {
  const types = ['mcq', 'mcq', 'true_false', 'mcq', 'fill_blank', 'mcq', 'true_false', 'tap_correct', 'mcq', 'fill_blank'];
  return types[index % types.length];
}

// Helper: build options for true_false
// Single option — correct=true means the shown translation IS correct
function buildTrueFalseOptions(word, otherWords, targetLang) {
  const showCorrect = Math.random() > 0.5;
  if (showCorrect) {
    return [{ id: word.id + '_tf', text: getLangText(word, targetLang).text, correct: true }];
  }
  const wrong = otherWords[Math.floor(Math.random() * otherWords.length)];
  return [{ id: (wrong?.id || word.id) + '_tf', text: getLangText(wrong || word, targetLang).text, correct: false }];
}

// Helper: build options for tap_correct
// 6 chips — 1 correct, 5 wrong
function buildTapCorrectOptions(word, otherWords, targetLang) {
  const correctOption = { id: word.id + '_correct', text: getLangText(word, targetLang).text, correct: true };
  const wrongPool = otherWords
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map(w => ({ id: w.id + '_wrong', text: getLangText(w, targetLang).text, correct: false }));
  const options = [...wrongPool];
  options.splice(Math.floor(Math.random() * options.length), 0, correctOption);
  return options.slice(0, 6);
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

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonError || !lesson) return reply.code(404).send({ error: 'Lesson not found' });

    const { data: rawWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    const words = dedupWords(rawWords || []);
    if (words.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    const direction  = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');
    const alsoLang   = getAlsoLang(sourceLang, targetLang);

    const flashcards = words.map((word, index) => {
      const front = getLangText(word, sourceLang);
      const back  = getLangText(word, targetLang);
      const also  = getLangText(word, alsoLang);
      return {
        index,
        word_id: word.id,
        front: { text: front.text, translit: front.translit, lang: sourceLang, audio_text: front.text, audio_lang_code: sourceLang },
        back:  { text: back.text,  translit: back.translit,  lang: targetLang, audio_text: back.text,  audio_lang_code: targetLang },
        also:  { text: also.text,  translit: also.translit,  lang: alsoLang,   audio_text: also.text,  audio_lang_code: alsoLang },
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

    if (lessonError || !lesson) return reply.code(404).send({ error: 'Lesson not found' });

    const { data: rawWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });

    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    const words = dedupWords(rawWords || []);
    if (words.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    const direction  = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');

    const questions = words.map((word, index) => {
      const questionSide = getLangText(word, sourceLang);
      const otherWords   = words.filter(w => w.id !== word.id);
      const type         = getQuizType(index);

      let options;

      switch (type) {
        case 'true_false':
          options = buildTrueFalseOptions(word, otherWords, targetLang);
          break;

        case 'tap_correct':
          options = buildTapCorrectOptions(word, otherWords, targetLang);
          break;

        case 'fill_blank':
          // Only the correct answer needed — Android handles the text input
          options = [{
            id:      word.id + '_correct',
            text:    getLangText(word, targetLang).text,
            correct: true,
          }];
          break;

        default: // mcq — 4 options, 1 correct
          const shuffled     = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);
          const wrongOptions = shuffled.map(w => ({
            id:      w.id + '_wrong',
            text:    getLangText(w, targetLang).text,
            correct: false,
          }));
          const correctOption = {
            id:      word.id + '_correct',
            text:    getLangText(word, targetLang).text,
            correct: true,
          };
          const insertAt = Math.floor(Math.random() * 4);
          options = [...wrongOptions];
          options.splice(insertAt, 0, correctOption);
          break;
      }

      return {
        index,
        word_id: word.id,
        type,        // ← FIX: Android QuizQuestionDispatcher reads this field
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
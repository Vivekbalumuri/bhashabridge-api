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

// No script gate — everyone sees native script.
// Falls back to english if script is empty (alphabet lessons).
function resolveText(langData, langCode, word) {
  if (langData.text) return langData;
  if (langCode === 'en') return langData;
  return { text: word.english || '', translit: langData.translit };
}

function getAlsoLang(sourceLang, targetLang) {
  const all = ['te', 'ta', 'ml', 'kn', 'en'];
  return all.find(l => l !== sourceLang && l !== targetLang) || 'en';
}

function dedupWords(words) {
  const seen = new Set();
  return words.filter(w => {
    if (seen.has(w.english)) return false;
    seen.add(w.english);
    return true;
  });
}

// Free users get MCQ only.
// Premium users get MCQ + TrueFalse + TapCorrect.
// FillBlank removed entirely.
function getQuizType(index, isPremium) {
  if (!isPremium) return 'mcq';
  const types = ['mcq', 'mcq', 'true_false', 'mcq', 'tap_correct',
                 'mcq', 'true_false', 'tap_correct', 'mcq', 'mcq'];
  return types[index % types.length];
}

function buildTrueFalseOptions(word, otherWords, targetLang) {
  const showCorrect = Math.random() > 0.5;
  if (showCorrect) {
    const ld = resolveText(getLangText(word, targetLang), targetLang, word);
    return [{ id: word.id + '_tf', text: ld.text, correct: true }];
  }
  const wrong = otherWords[Math.floor(Math.random() * otherWords.length)];
  const ld = resolveText(getLangText(wrong || word, targetLang), targetLang, wrong || word);
  return [{ id: (wrong?.id || word.id) + '_tf', text: ld.text, correct: false }];
}

function buildTapCorrectOptions(word, otherWords, targetLang) {
  const correctLd = resolveText(getLangText(word, targetLang), targetLang, word);
  const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
  const wrongPool = otherWords
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

  // GET /lessons?direction=
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

  // GET /lessons/:id/learn
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
      .from('words').select('*').eq('lesson_id', id).order('sort_order', { ascending: true });
    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    const allWords = dedupWords(rawWords || []);
    if (allWords.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    // Shuffle and limit to 10 words per session
    const words = allWords.sort(() => Math.random() - 0.5).slice(0, 10);

    const direction = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');
    const alsoLang = getAlsoLang(sourceLang, targetLang);

    const flashcards = words.map((word, index) => {
      const rawFront = getLangText(word, sourceLang);
      const rawBack  = getLangText(word, targetLang);
      const rawAlso  = getLangText(word, alsoLang);

      // Always show native script — fallback to english if empty
      const front = resolveText(rawFront, sourceLang, word);
      const back  = resolveText(rawBack,  targetLang, word);
      const also  = resolveText(rawAlso,  alsoLang,   word);

      return {
        index,
        word_id: word.id,
        front: {
          text:            front.text,
          translit:        rawFront.translit,   // always included as helper
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
      phase:       'learn',
      base_lang:   targetLang,
      learn_lang:  sourceLang,
      total_cards: flashcards.length,
      flashcards,
      is_premium_user: isPremium,
    };
  });

  // GET /lessons/:id/quiz
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
      .from('words').select('*').eq('lesson_id', id).order('sort_order', { ascending: true });
    if (wordsError) return reply.code(400).send({ error: wordsError.message });

    const allWords = dedupWords(rawWords || []);
    if (allWords.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    // Shuffle and limit to 10 questions per session
    const words = allWords.sort(() => Math.random() - 0.5).slice(0, 10);

    const direction = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');

    const questions = words.map((word, index) => {
      const rawQuestion = getLangText(word, sourceLang);
      const question    = resolveText(rawQuestion, sourceLang, word);
      const otherWords  = words.filter(w => w.id !== word.id);
      const type        = getQuizType(index, isPremium);

      let options;
      switch (type) {
        case 'true_false':
          options = buildTrueFalseOptions(word, otherWords, targetLang);
          break;
        case 'tap_correct':
          options = buildTapCorrectOptions(word, otherWords, targetLang);
          break;
        default: { // mcq
          const shuffled = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);
          const wrongOptions = shuffled.map(w => {
            const ld = resolveText(getLangText(w, targetLang), targetLang, w);
            return { id: w.id + '_wrong', text: ld.text, correct: false };
          });
          const correctLd = resolveText(getLangText(word, targetLang), targetLang, word);
          const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
          const insertAt = Math.floor(Math.random() * 4);
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
          translit:        rawQuestion.translit,  // always included as helper
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
}
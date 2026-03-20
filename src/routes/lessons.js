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

function applyScriptGate(langData, langCode, isPremium) {
  if (isPremium) return langData;
  if (langCode === 'en') return langData;
  if (!langData.translit) return langData;
  return { text: langData.translit, translit: langData.translit };
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

// Free users only get MCQ — premium users get all types
function getQuizType(index, isPremium) {
  if (!isPremium) return 'mcq';
  const types = ['mcq', 'mcq', 'true_false', 'mcq', 'fill_blank', 'mcq', 'true_false', 'tap_correct', 'mcq', 'fill_blank'];
  return types[index % types.length];
}

function buildTrueFalseOptions(word, otherWords, targetLang, isPremium) {
  const showCorrect = Math.random() > 0.5;
  if (showCorrect) {
    const ld = applyScriptGate(getLangText(word, targetLang), targetLang, isPremium);
    return [{ id: word.id + '_tf', text: ld.text, correct: true }];
  }
  const wrong = otherWords[Math.floor(Math.random() * otherWords.length)];
  const ld = applyScriptGate(getLangText(wrong || word, targetLang), targetLang, isPremium);
  return [{ id: (wrong?.id || word.id) + '_tf', text: ld.text, correct: false }];
}

function buildTapCorrectOptions(word, otherWords, targetLang, isPremium) {
  const correctLd = applyScriptGate(getLangText(word, targetLang), targetLang, isPremium);
  const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
  const wrongPool = otherWords
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map(w => {
      const ld = applyScriptGate(getLangText(w, targetLang), targetLang, isPremium);
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

    const words = dedupWords(rawWords || []);
    if (words.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    const direction = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');
    const alsoLang = getAlsoLang(sourceLang, targetLang);

    const flashcards = words.map((word, index) => {
      const rawFront = getLangText(word, sourceLang);
      const rawBack  = getLangText(word, targetLang);
      const rawAlso  = getLangText(word, alsoLang);
      const front = applyScriptGate(rawFront, sourceLang, isPremium);
      const back  = applyScriptGate(rawBack,  targetLang, isPremium);
      const also  = applyScriptGate(rawAlso,  alsoLang,   isPremium);
      return {
        index,
        word_id: word.id,
        front: { text: front.text, translit: rawFront.translit, lang: sourceLang, audio_text: rawFront.text, audio_lang_code: sourceLang },
        back:  { text: back.text,  translit: rawBack.translit,  lang: targetLang, audio_text: rawBack.text,  audio_lang_code: targetLang },
        also:  { text: also.text,  translit: rawAlso.translit,  lang: alsoLang,   audio_text: rawAlso.text,  audio_lang_code: alsoLang },
        dravidian_note: word.dravidian_note || null,
        script_locked: !isPremium,
      };
    });

    return { lesson, phase: 'learn', base_lang: targetLang, learn_lang: sourceLang, total_cards: flashcards.length, flashcards, is_premium_user: isPremium };
  });

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

    const words = dedupWords(rawWords || []);
    if (words.length === 0) return reply.code(404).send({ error: 'No words found for this lesson' });

    const direction = lesson.direction || 'te-en';
    const [sourceLang, targetLang] = direction.split('-');

    const questions = words.map((word, index) => {
      const rawQuestion = getLangText(word, sourceLang);
      const gatedQuestion = applyScriptGate(rawQuestion, sourceLang, isPremium);
      const otherWords = words.filter(w => w.id !== word.id);
      const type = getQuizType(index, isPremium);  // MCQ only for free users

      let options;
      switch (type) {
        case 'true_false':
          options = buildTrueFalseOptions(word, otherWords, targetLang, isPremium);
          break;
        case 'tap_correct':
          options = buildTapCorrectOptions(word, otherWords, targetLang, isPremium);
          break;
        case 'fill_blank': {
          const ld = applyScriptGate(getLangText(word, targetLang), targetLang, isPremium);
          options = [{ id: word.id + '_correct', text: ld.text, correct: true }];
          break;
        }
        default: {
          const shuffled = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);
          const wrongOptions = shuffled.map(w => {
            const ld = applyScriptGate(getLangText(w, targetLang), targetLang, isPremium);
            return { id: w.id + '_wrong', text: ld.text, correct: false };
          });
          const correctLd = applyScriptGate(getLangText(word, targetLang), targetLang, isPremium);
          const correctOption = { id: word.id + '_correct', text: correctLd.text, correct: true };
          const insertAt = Math.floor(Math.random() * 4);
          options = [...wrongOptions];
          options.splice(insertAt, 0, correctOption);
          break;
        }
      }

      return {
        index, word_id: word.id, type,
        question: { text: gatedQuestion.text, translit: rawQuestion.translit, lang: sourceLang, audio_text: rawQuestion.text, audio_lang_code: sourceLang },
        options,
      };
    });

    return { lesson, phase: 'quiz', base_lang: targetLang, learn_lang: sourceLang, total_questions: questions.length, questions, is_premium_user: isPremium };
  });
}
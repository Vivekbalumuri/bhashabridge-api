import { supabase } from '../db.js';
import { recordActivity } from '../services/streakService.js';

export default async function progressRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── GET /progress/summary?direction=te-en ─────────────────────────────────
  // Must be registered BEFORE /:lessonId to avoid route conflict
  fastify.get('/summary', async (request, reply) => {
    const { direction } = request.query;
    const userId = request.user.id;

    // Total lessons for this direction
    let lessonsQuery = supabase.from('lessons').select('id', { count: 'exact', head: true });
    if (direction) lessonsQuery = lessonsQuery.eq('direction', direction);
    const { count: totalLessons } = await lessonsQuery;

    // Completed lessons (quiz_completed = true)
    let progressQuery = supabase
      .from('lesson_progress')
      .select('quiz_score, quiz_completed', { count: 'exact' })
      .eq('user_id', userId)
      .eq('quiz_completed', true);
    if (direction) progressQuery = progressQuery.eq('direction', direction);
    const { data: completedRows, count: completed } = await progressQuery;

    // Words learned = sum of actual word counts from completed lessons
    let wordsQuery = supabase
      .from('lesson_progress')
      .select('lesson_id, quiz_score, quiz_total, lessons(word_count)', { count: 'exact' })
      .eq('user_id', userId)
      .eq('quiz_completed', true);
    if (direction) wordsQuery = wordsQuery.eq('direction', direction);
    const { data: completedData } = await wordsQuery;

    const wordsLearned = (completedData || []).reduce((sum, r) => {
      return sum + (r.lessons?.word_count || 10);
    }, 0);

    // Accuracy = average of (score/total)*100 per lesson
    const accuracyScores = (completedData || [])
      .filter(r => r.quiz_total > 0)
      .map(r => Math.round((r.quiz_score / r.quiz_total) * 100));
    const accuracy = accuracyScores.length > 0
      ? Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length)
      : 0;

    // XP from streak table
    let xp = 0;
    try {
      const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', userId).single();
      if (userRow) {
        const { data: streakRow } = await supabase.from('streaks').select('total_xp').eq('user_id', userRow.id).single();
        xp = streakRow?.total_xp || 0;
      }
    } catch (_) {}

    return {
      total:         totalLessons || 0,
      total_lessons: totalLessons || 0,
      completed:     completed    || 0,
      words_learned: wordsLearned,
      accuracy,
      xp,
    };
  });

  // ─── GET /progress?direction=te-en ─────────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;
    if (!direction) return reply.code(400).send({ error: 'direction is required' });

    const userId = request.user.id;

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, module_order, is_premium, skill_type, word_count, tier')
      .eq('direction', direction)
      .order('module_order', { ascending: true });

    if (lessonsError) return reply.code(400).send({ error: lessonsError.message });
    if (!lessons || lessons.length === 0)
      return reply.code(404).send({ error: 'No lessons found for this direction' });

    const { data: progressRows } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('direction', direction);

    const progressMap = {};
    (progressRows || []).forEach(p => { progressMap[p.lesson_id] = p; });

    let foundCurrent = false;
    const result = lessons.map((lesson, index) => {
      const progress   = progressMap[lesson.id];
      const isFirst    = index === 0;
      const prevLesson = index > 0 ? lessons[index - 1] : null;
      const prevDone   = prevLesson
        ? progressMap[prevLesson.id]?.quiz_completed === true
        : true;

      const unlocked         = isFirst || prevDone || progress?.unlocked === true;
      const listen_completed = progress?.listen_completed || false;
      const quiz_completed   = progress?.quiz_completed   || false;
      const fully_completed  = listen_completed && quiz_completed;

      const is_current = unlocked && !fully_completed && !foundCurrent;
      if (is_current) foundCurrent = true;

      return {
        lesson_id:        lesson.id,
        title:            lesson.title,
        module_order:     lesson.module_order,
        is_premium:       lesson.is_premium,
        skill_type:       lesson.skill_type,
        word_count:       lesson.word_count,
        unlocked,
        listen_completed,
        quiz_completed,
        fully_completed,
        is_current,
      };
    });

    return { direction, lessons: result };
  });

  // ─── POST /progress/complete-listen ────────────────────────────────────────
  fastify.post('/complete-listen', async (request, reply) => {
    const { lesson_id, direction } = request.body;
    if (!lesson_id || !direction)
      return reply.code(400).send({ error: 'lesson_id and direction are required' });

    const userId = request.user.id;

    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lesson_id)
      .single();

    let error;
    if (existing) {
      const { error: updateErr } = await supabase
        .from('lesson_progress')
        .update({ listen_completed: true, direction })
        .eq('user_id', userId)
        .eq('lesson_id', lesson_id);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('lesson_progress')
        .insert({ user_id: userId, lesson_id, direction, listen_completed: true, unlocked: true });
      error = insertErr;
    }

    if (error) return reply.code(400).send({ error: error.message });
    return { success: true, message: 'Listen phase completed' };
  });

  // ─── POST /progress/complete-quiz ──────────────────────────────────────────
  fastify.post('/complete-quiz', async (request, reply) => {
    const { lesson_id, direction, score, total } = request.body;
    if (!lesson_id || !direction)
      return reply.code(400).send({ error: 'lesson_id and direction are required' });

    const userId = request.user.id;

    // ── 1. Upsert lesson progress ───────────────────────────────────────────
    const { data: existingQuiz } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lesson_id)
      .single();

    let progressError;
    if (existingQuiz) {
      const { error: updateErr } = await supabase
        .from('lesson_progress')
        .update({
          direction,
          quiz_completed: true,
          quiz_score:     score || 0,
          quiz_total:     total || 0,
          completed_at:   new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('lesson_id', lesson_id);
      progressError = updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('lesson_progress')
        .insert({
          user_id:          userId,
          lesson_id,
          direction,
          listen_completed: true,
          quiz_completed:   true,
          quiz_score:       score || 0,
          quiz_total:       total || 0,
          completed_at:     new Date().toISOString(),
          unlocked:         true,
        });
      progressError = insertErr;
    }

    if (progressError) return reply.code(400).send({ error: progressError.message });

    // ── 2. Unlock next lesson ───────────────────────────────────────────────
    const { data: currentLesson } = await supabase
      .from('lessons')
      .select('module_order')
      .eq('id', lesson_id)
      .single();

    let next_lesson_unlocked = false;
    let next_lesson_id       = null;

    if (currentLesson) {
      const { data: nextLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('direction', direction)
        .eq('module_order', currentLesson.module_order + 1)
        .single();

      if (nextLesson) {
        next_lesson_id = nextLesson.id;

        const { data: existingNext } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('user_id', userId)
          .eq('lesson_id', nextLesson.id)
          .single();

        let unlockError;
        if (existingNext) {
          const { error: ue } = await supabase
            .from('lesson_progress')
            .update({ unlocked: true, direction })
            .eq('user_id', userId)
            .eq('lesson_id', nextLesson.id);
          unlockError = ue;
        } else {
          const { error: ue } = await supabase
            .from('lesson_progress')
            .insert({ user_id: userId, lesson_id: nextLesson.id, direction, unlocked: true });
          unlockError = ue;
        }
        if (!unlockError) next_lesson_unlocked = true;
      }
    }

    // ── 3. Update streak via streakService (fixes silent failure bug) ───────
    // OLD code used update() which silently skipped users with no streak row.
    // streakService uses upsert() so it works for ALL users including new ones.
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_uid', userId)
        .single();

      if (userProfile) {
        const xpGained = Math.max(5, Math.round((score / (total || 1)) * 50));
        await recordActivity(userProfile.id, xpGained);
      }
    } catch (_) { /* streak update is non-critical, never block the response */ }

    // ── 4. Return result ────────────────────────────────────────────────────
    return {
      success:              true,
      message:              'Quiz completed',
      score:                score || 0,
      total:                total || 0,
      next_lesson_id,
      next_lesson_unlocked,
    };
  });

  // ─── GET /progress/:lessonId ────────────────────────────────────────────────
  fastify.get('/:lessonId', async (request, reply) => {
    const { lessonId } = request.params;
    const userId = request.user.id;

    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (error && error.code !== 'PGRST116')
      return reply.code(400).send({ error: error.message });

    return {
      progress: progress || {
        user_id:          userId,
        lesson_id:        lessonId,
        listen_completed: false,
        quiz_completed:   false,
        quiz_score:       0,
        unlocked:         false,
      },
    };
  });

  // ─── POST /progress/reset ───────────────────────────────────────────────────
  fastify.post('/reset', async (request, reply) => {
    const { lesson_id } = request.body;
    if (!lesson_id) return reply.code(400).send({ error: 'lesson_id is required' });

    const userId = request.user.id;

    const { error } = await supabase
      .from('lesson_progress')
      .update({
        listen_completed: false,
        quiz_completed:   false,
        quiz_score:       0,
        completed_at:     null,
      })
      .eq('user_id', userId)
      .eq('lesson_id', lesson_id);

    if (error) return reply.code(400).send({ error: error.message });
    return { success: true, message: 'Progress reset' };
  });
}
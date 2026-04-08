import { supabase } from '../db.js';
import { recordActivity } from '../services/streakService.js';

export default async function progressRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── GET /progress/summary?direction= ─────────────────────────────────────
  fastify.get('/summary', async (request, reply) => {
    const { direction } = request.query;
    const userId = request.user.id;

    let lessonsQuery = supabase.from('lessons').select('id', { count: 'exact', head: true });
    if (direction) lessonsQuery = lessonsQuery.eq('direction', direction);
    const { count: totalLessons } = await lessonsQuery;

    let progressQuery = supabase
      .from('lesson_progress')
      .select('quiz_score, quiz_completed', { count: 'exact' })
      .eq('user_id', userId)
      .eq('quiz_completed', true);
    if (direction) progressQuery = progressQuery.eq('direction', direction);
    const { data: completedRows, count: completed } = await progressQuery;

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

    const accuracyScores = (completedData || [])
      .filter(r => r.quiz_total > 0)
      .map(r => Math.round((r.quiz_score / r.quiz_total) * 100));
    const accuracy = accuracyScores.length > 0
      ? Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length)
      : 0;

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

  // ─── GET /progress?direction= ──────────────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;
    if (!direction) return reply.code(400).send({ error: 'direction is required' });

    const userId = request.user.id;

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, module_order, is_premium, skill_type, word_count, tier')
      .or(`direction.eq.${direction},direction.eq.both`)
      .order('module_order', { ascending: true });

    if (lessonsError) return reply.code(400).send({ error: lessonsError.message });
    if (!lessons || lessons.length === 0) return { direction, lessons: [] };

    const { data: progressRows } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('direction', direction);

    const progressMap = {};
    (progressRows || []).forEach(p => { progressMap[p.lesson_id] = p; });

    let foundCurrent = false;
    const result = lessons.map((lesson, index) => {
      const progress  = progressMap[lesson.id];
      const isFirst   = index === 0;
      const prevLesson = index > 0 ? lessons[index - 1] : null;

      // FIX: unlock is STRICTLY sequential — a lesson unlocks only when the
      // previous lesson's quiz is completed. We do NOT trust the stored
      // progress.unlocked flag because old migration data left stale rows
      // with unlocked=true on lessons the user never actually reached.
      const prevDone = prevLesson
        ? progressMap[prevLesson.id]?.quiz_completed === true
        : true;

      // Only the first lesson or lessons whose predecessor is done are unlocked.
      // The stored unlocked flag is intentionally ignored to prevent stale data
      // from unlocking lessons out of order.
      const unlocked        = isFirst || prevDone;
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

    // FIX: find the next lesson by position in the ordered list, NOT by
    // module_order + 1. This handles gaps in module_order (e.g. 10 → 12).
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, module_order')
      .or(`direction.eq.${direction},direction.eq.both`)
      .order('module_order', { ascending: true });

    let next_lesson_unlocked = false;
    let next_lesson_id       = null;

    if (allLessons) {
      const currentIndex = allLessons.findIndex(l => l.id === lesson_id);
      // Next lesson is the one immediately after in sorted order
      const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1
        ? allLessons[currentIndex + 1]
        : null;

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
    } catch (_) {}

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

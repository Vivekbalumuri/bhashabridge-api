import { supabase } from '../db.js';

export default async function progressRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── HELPER ────────────────────────────────────────────────────────────────
  // Get or create a progress row for a user+lesson
  async function getOrCreateProgress(userId, lessonId, direction) {
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('lesson_progress')
      .insert({ user_id: userId, lesson_id: lessonId, direction, unlocked: false })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created;
  }

  // ─── GET /progress?direction=te-en ─────────────────────────────────────────
  // Returns all lessons for a direction with lock/unlock/completion status.
  // First lesson of each direction is always unlocked.
  //
  // Response:
  // {
  //   direction: "te-en",
  //   lessons: [
  //     {
  //       lesson_id, title, module_order,
  //       unlocked: true,
  //       listen_completed: false,
  //       quiz_completed: false,
  //       is_current: true      ← the one they should do next
  //     }, ...
  //   ]
  // }
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;
    if (!direction) return reply.code(400).send({ error: 'direction is required' });

    const userId = request.user.id;

    // Fetch all lessons for this direction in order
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, module_order, is_premium, skill_type, word_count, tier')
      .eq('direction', direction)
      .order('module_order', { ascending: true });

    if (lessonsError) return reply.code(400).send({ error: lessonsError.message });
    if (!lessons || lessons.length === 0)
      return reply.code(404).send({ error: 'No lessons found for this direction' });

    // Fetch all progress rows for this user+direction
    const { data: progressRows } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('direction', direction);

    const progressMap = {};
    (progressRows || []).forEach(p => { progressMap[p.lesson_id] = p; });

    // Build response — first lesson always unlocked
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

      // Current = first unlocked but not fully completed
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
  // Call this when user has heard all words at least once.
  // Body: { lesson_id, direction }
  fastify.post('/complete-listen', async (request, reply) => {
    const { lesson_id, direction } = request.body;
    if (!lesson_id || !direction)
      return reply.code(400).send({ error: 'lesson_id and direction are required' });

    const userId = request.user.id;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id:          userId,
          lesson_id,
          direction,
          listen_completed: true,
        },
        { onConflict: 'user_id,lesson_id' }
      );

    if (error) return reply.code(400).send({ error: error.message });

    return { success: true, message: 'Listen phase completed' };
  });

  // ─── POST /progress/complete-quiz ──────────────────────────────────────────
  // Call this when user passes the quiz.
  // Automatically unlocks the next lesson.
  // Body: { lesson_id, direction, score, total }
  fastify.post('/complete-quiz', async (request, reply) => {
    const { lesson_id, direction, score, total } = request.body;
    if (!lesson_id || !direction)
      return reply.code(400).send({ error: 'lesson_id and direction are required' });

    const userId = request.user.id;

    // Mark this lesson quiz as complete
    const { error: progressError } = await supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id:          userId,
          lesson_id,
          direction,
          quiz_completed:   true,
          quiz_score:       score || 0,
          completed_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      );

    if (progressError) return reply.code(400).send({ error: progressError.message });

    // Find and unlock the next lesson in this direction
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

        const { error: unlockError } = await supabase
          .from('lesson_progress')
          .upsert(
            {
              user_id:   userId,
              lesson_id: nextLesson.id,
              direction,
              unlocked:  true,
            },
            { onConflict: 'user_id,lesson_id' }
          );

        if (!unlockError) next_lesson_unlocked = true;
      }
    }

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
  // Get progress for a single lesson
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

    // Return default if no progress yet
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

  // ─── POST /progress/reset ──────────────────────────────────────────────────
  // Reset progress for a lesson (retry from scratch)
  // Body: { lesson_id }
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
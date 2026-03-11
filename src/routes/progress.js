import { supabase } from '../db.js';
import { recordActivity } from '../services/streakService.js';
import { addXp } from '../services/leaderService.js';

export default async function progressRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /progress?direction=te-en
  // Returns progress rows for the user, filtered by direction (required)
  fastify.get('/', async (request, reply) => {
    const { direction } = request.query;
    if (!direction) return reply.code(400).send({ error: "direction is required" });

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    const { data: progress, error } = await supabase
      .from('progress')
      .select('*, lessons(*)')
      .eq('user_id', userProfile.id)
      .eq('direction', direction);

    if (error) return reply.code(400).send({ error: error.message });
    return { progress };
  });

  // POST /progress/:lessonId
  // Records lesson completion. direction must be sent in request body.
  // Streak is recorded globally (not per direction) via recordActivity.
  fastify.post('/:lessonId', async (request, reply) => {
    const { lessonId } = request.params;
    const { scorePct, xpEarned, completed, direction } = request.body;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    const userId = userProfile.id;

    const { data: existingProgress } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    const insertData = {
      user_id: userId,
      lesson_id: lessonId,
      direction: direction,
      status: completed ? 'completed' : 'in_progress',
      score_pct: scorePct,
      xp_earned: xpEarned,
      attempts: (existingProgress?.attempts || 0) + 1,
      updated_at: new Date().toISOString()
    };
    
    if (completed) insertData.completed_at = new Date().toISOString();
    if (existingProgress) insertData.id = existingProgress.id;

    const { error: upsertError } = await supabase
      .from('progress')
      .upsert(insertData, { onConflict: 'user_id, lesson_id' });

    if (upsertError) return reply.code(400).send({ error: upsertError.message });

    let streakRes = null;
    if (completed) {
      streakRes = await recordActivity(userId, xpEarned);
      await addXp(userId, xpEarned);
    }
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
      
    if (updateError) return reply.code(400).send({ error: updateError.message });

    return { success: true, streak: streakRes };
  });

  // GET /progress/summary?direction=te-en  (direction is optional)
  // If direction is provided → stats scoped to that direction only.
  // If omitted → stats across all directions (used by "All Directions" view).
  fastify.get('/summary', async (request, reply) => {
    const { direction } = request.query;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    let query = supabase
      .from('progress')
      .select('*')
      .eq('user_id', userProfile.id);

    // Apply direction filter only when provided
    if (direction) {
      query = query.eq('direction', direction);
    }

    const { data: progressRows, error } = await query;

    if (error) return reply.code(400).send({ error: error.message });

    const totalLessons = progressRows.length;
    const completed = progressRows.filter(r => r.status === 'completed').length;
    const avgAccuracy = progressRows.length > 0 
      ? progressRows.reduce((sum, r) => sum + (r.score_pct || 0), 0) / progressRows.length
      : 0;
    
    const wordsLearned = completed * 10; 
    const daysActive = new Set(progressRows.map(r => r.updated_at.split('T')[0])).size;

    return {
      direction: direction || 'all',
      totalLessons,
      completed,
      accuracy: Math.round(avgAccuracy),
      wordsLearned,
      daysActive
    };
  });
}
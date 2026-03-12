import { supabase } from '../db.js';

export default async function authRoutes(fastify) {

  // ── POST /register ─────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    const { email, password, nativeLang, learningLangs, displayName } = request.body;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) return reply.code(400).send({ error: signUpError.message });
    if (!authData.user) return reply.code(400).send({ error: 'User creation failed' });

    const { data: profile, error: userError } = await supabase
      .from('users')
      .insert({
        supabase_uid:   authData.user.id,
        email,
        display_name:   displayName,
        native_lang:    nativeLang,
        learning_langs: learningLangs
      })
      .select()
      .single();

    if (userError) return reply.code(400).send({ error: userError.message });

    const { error: streakError } = await supabase
      .from('streaks')
      .insert({ user_id: profile.id });

    if (streakError) return reply.code(400).send({ error: streakError.message });

    // ── Return `token` (not `jwt`) so Android AuthResponse matches ──
    return reply.code(201).send({
      token: authData.session?.access_token || null,
      user:  profile
    });
  });

  // ── POST /login ────────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) return reply.code(401).send({ error: signInError.message });

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', authData.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });

    // ── Return `token` (not `jwt`) so Android AuthResponse matches ──
    return { token: authData.session?.access_token, user: profile };
  });

  // ── POST /forgot-password ──────────────────────────────
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body;

    if (!email) return reply.code(400).send({ error: 'Email is required' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'bhashabridge://reset-password'
    });

    if (error) fastify.log.warn(`Password reset for ${email}: ${error.message}`);

    return reply.code(200).send({
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  });

  // ── GET /me ────────────────────────────────────────────
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', request.user.id)
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return profile;
  });

  // ── PATCH /me ──────────────────────────────────────────
  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { displayName, dailyGoalMin, fcmToken } = request.body;

    const updateData = {};
    if (displayName  !== undefined) updateData.display_name   = displayName;
    if (dailyGoalMin !== undefined) updateData.daily_goal_min = dailyGoalMin;
    if (fcmToken     !== undefined) updateData.fcm_token      = fcmToken;

    const { data: profile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('supabase_uid', request.user.id)
      .select()
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return { user: profile };
  });

  // ── DELETE /me ─────────────────────────────────────────
  fastify.delete('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const uid = request.user.id;

    const { error: authError } = await supabase.auth.admin.deleteUser(uid);
    if (authError) return reply.code(400).send({ error: authError.message });

    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('supabase_uid', uid);

    if (dbError) return reply.code(400).send({ error: dbError.message });

    return { success: true };
  });
}
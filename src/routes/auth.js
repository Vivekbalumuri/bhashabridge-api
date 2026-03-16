import { supabase } from '../db.js';

export default async function authRoutes(fastify) {

  // ── POST /register ─────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    const { email, password, nativeLang, learningLangs, displayName } = request.body;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });

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
      .upsert(
        { user_id: profile.id, current_streak: 0, longest_streak: 0, total_xp: 0, level: 1, last_activity_date: null },
        { onConflict: 'user_id' }
      );

    if (streakError) {
      fastify.log.warn(`Streak row creation failed for user ${profile.id}: ${streakError.message}`);
    }

    return reply.code(201).send({
      token:         authData.session?.access_token  || null,
      refresh_token: authData.session?.refresh_token || null,
      user:          profile
    });
  });

  // ── POST /login ────────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return reply.code(401).send({ error: signInError.message });

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', authData.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });

    // Ensure streak row exists — covers users who registered before streak fix
    const { data: existingStreak } = await supabase
      .from('streaks')
      .select('user_id')
      .eq('user_id', profile.id)
      .single();

    if (!existingStreak) {
      await supabase
        .from('streaks')
        .upsert(
          { user_id: profile.id, current_streak: 0, longest_streak: 0, total_xp: 0, level: 1, last_activity_date: null },
          { onConflict: 'user_id' }
        );
    }

    return {
      token:         authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      user:          profile
    };
  });

  // ── POST /forgot-password ──────────────────────────────
  // FIX: redirectTo must match a URL whitelisted in Supabase dashboard.
  // Go to: Supabase → Authentication → URL Configuration → Redirect URLs
  // Add:   bhashabridge://reset-password
  // Without this Supabase silently drops the email.
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body;
    if (!email) return reply.code(400).send({ error: 'Email is required' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'bhashabridge://reset-password'
    });

    // Always return 200 — never reveal whether the email exists
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

  // ── PATCH /me/fcm-token ────────────────────────────────
  // Dedicated endpoint for FCM token updates from the Android app
  fastify.patch('/me/fcm-token', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { fcm_token } = request.body ?? {};
    if (!fcm_token || typeof fcm_token !== 'string') {
      return reply.code(400).send({ error: 'fcm_token is required' });
    }

    const { error } = await supabase
      .from('users')
      .update({ fcm_token })
      .eq('supabase_uid', request.user.id);

    if (error) return reply.code(400).send({ error: error.message });
    return { success: true };
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

  // ── POST /refresh ──────────────────────────────────────
  fastify.post('/refresh', async (request, reply) => {
    const { refresh_token } = request.body;
    if (!refresh_token) return reply.code(400).send({ error: 'refresh_token required' });

    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token });
      if (error || !data.session) return reply.code(401).send({ error: 'Invalid or expired refresh token' });
      return {
        token:         data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
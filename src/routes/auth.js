import { supabase } from '../db.js';

// ── Supabase admin client — needed for resend verification ────────────────────
// Uses SUPABASE_SERVICE_ROLE_KEY (set this on Render dashboard).
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Deep-link base that Supabase will append the verification token to.
// After the user taps the link the app opens via the bhashabridge:// scheme.
const APP_REDIRECT = 'bhashabridge://verify';

export default async function authRoutes(fastify) {

  // ── POST /register ─────────────────────────────────────────────────────────
  // FIX (Issue 3): added emailRedirectTo so Supabase sends a real verification
  // email with a deep-link back into the app instead of a generic web URL.
  fastify.post('/register', async (request, reply) => {
    const { email, password, nativeLang, learningLangs, displayName } = request.body;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This tells Supabase where to redirect after the user taps the link.
        // The app must handle bhashabridge://verify via its deep-link intent filter.
        emailRedirectTo: APP_REDIRECT,
      },
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
        learning_langs: learningLangs,
        // FIX: store initial verification state from Supabase
        is_email_verified: authData.user.email_confirmed_at != null,
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
      user:          { ...profile, is_email_verified: authData.user.email_confirmed_at != null }
    });
  });

  // ── POST /login ────────────────────────────────────────────────────────────
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

    // Ensure streak row exists
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

    // FIX (Issue 3): include is_email_verified from Supabase auth record
    // so the Android app knows whether to show the verification gate.
    const isEmailVerified = authData.user.email_confirmed_at != null;

    // Sync back to users table if it changed (e.g. user verified between logins)
    if (profile.is_email_verified !== isEmailVerified) {
      await supabase
        .from('users')
        .update({ is_email_verified: isEmailVerified })
        .eq('id', profile.id);
    }

    return {
      token:         authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      user:          { ...profile, is_email_verified: isEmailVerified }
    };
  });

  // ── POST /resend-verification ──────────────────────────────────────────────
  // FIX (Issue 3): NEW endpoint — resends the Supabase verification email.
  // Uses the service-role key so it can call admin auth methods.
  fastify.post('/resend-verification', async (request, reply) => {
    const { email } = request.body ?? {};
    if (!email) return reply.code(400).send({ error: 'email is required' });

    // Use supabaseAdmin (service role) to resend the signup confirmation
    const { error } = await supabaseAdmin.auth.resend({
      type:  'signup',
      email,
      options: { emailRedirectTo: APP_REDIRECT },
    });

    if (error) {
      fastify.log.warn(`resend-verification for ${email}: ${error.message}`);
      // Don't reveal whether the email exists — always 200
    }

    return reply.code(200).send({ message: 'Verification email sent if account exists.' });
  });

  // ── POST /forgot-password ──────────────────────────────────────────────────
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

  // ── POST /reset-password ───────────────────────────────────────────────────
  fastify.post('/reset-password', async (request, reply) => {
    const { token, password } = request.body ?? {};

    if (!token)    return reply.code(400).send({ error: 'token is required' });
    if (!password) return reply.code(400).send({ error: 'password is required' });
    if (password.length < 6) return reply.code(422).send({ error: 'Password must be at least 6 characters' });

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token:  token,
      refresh_token: token
    });

    if (sessionError) {
      fastify.log.warn(`Reset password session error: ${sessionError.message}`);
      return reply.code(400).send({ error: 'Reset link has expired or is invalid. Please request a new one.' });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      fastify.log.warn(`Reset password update error: ${updateError.message}`);
      return reply.code(400).send({ error: updateError.message });
    }

    return reply.code(200).send({ success: true, message: 'Password updated successfully' });
  });

  // ── POST /auth/google ──────────────────────────────────────────────────────
  fastify.post('/google', async (request, reply) => {
    const { id_token } = request.body ?? {};
    if (!id_token) return reply.code(400).send({ error: 'id_token is required' });

    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    });

    if (authError || !authData?.user) {
      fastify.log.warn(`Google sign-in failed: ${authError?.message}`);
      return reply.code(401).send({ error: authError?.message ?? 'Google sign-in failed' });
    }

    const supabaseUid = authData.user.id;

    const { data: profile, error: upsertError } = await supabase
      .from('users')
      .upsert({
        supabase_uid:      supabaseUid,
        email:             authData.user.email,
        display_name:      authData.user.user_metadata?.full_name
                        ?? authData.user.user_metadata?.name
                        ?? authData.user.email?.split('@')[0],
        // Google accounts are always verified
        is_email_verified: true,
      }, { onConflict: 'supabase_uid' })
      .select()
      .single();

    if (upsertError) return reply.code(400).send({ error: upsertError.message });

    await supabase
      .from('streaks')
      .upsert(
        { user_id: profile.id, current_streak: 0, longest_streak: 0,
          total_xp: 0, level: 1, last_activity_date: null },
        { onConflict: 'user_id' }
      );

    return reply.send({
      token:         authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      user:          { ...profile, is_email_verified: true },
    });
  });

  // ── GET /me ────────────────────────────────────────────────────────────────
  // FIX (Issue 3): now reads is_email_verified from Supabase auth (source of truth)
  // instead of trusting only the users table value.
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', request.user.id)
      .single();

    if (error) return reply.code(400).send({ error: error.message });

    // Auto-expire premium if past expiry date
    let isPremium = profile.is_premium;
    if (isPremium && profile.premium_expires_at) {
      const expired = new Date(profile.premium_expires_at) < new Date();
      if (expired) {
        isPremium = false;
        await supabase
          .from('users')
          .update({ is_premium: false })
          .eq('id', profile.id);
      }
    }

    // FIX: fetch the live verification state from Supabase auth
    // so /me always returns the correct value even after the user clicks the link.
    let isEmailVerified = profile.is_email_verified ?? false;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.supabase_uid);
      if (authUser?.user) {
        isEmailVerified = authUser.user.email_confirmed_at != null;
        // Sync to users table if it changed
        if (profile.is_email_verified !== isEmailVerified) {
          await supabase
            .from('users')
            .update({ is_email_verified: isEmailVerified })
            .eq('id', profile.id);
        }
      }
    } catch (e) {
      fastify.log.warn(`Could not fetch auth user for verification check: ${e.message}`);
    }

    return {
      ...profile,
      is_premium:          isPremium,
      premium_expires_at:  profile.premium_expires_at ?? null,
      is_email_verified:   isEmailVerified,
    };
  });

  // ── PATCH /me ──────────────────────────────────────────────────────────────
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

  // ── PATCH /me/fcm-token ────────────────────────────────────────────────────
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

  // ── DELETE /me ─────────────────────────────────────────────────────────────
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

  // ── POST /refresh ──────────────────────────────────────────────────────────
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
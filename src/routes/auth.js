import { supabase } from '../db.js';

export default async function authRoutes(fastify) {
  fastify.post('/register', async (request, reply) => {
    const { email, password, nativeLang, learningLangs, displayName } = request.body;
    
    // 1. supabase.auth.signUp
    const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password 
    });
    
    if (signUpError) return reply.code(400).send({ error: signUpError.message });
    if (!authData.user) return reply.code(400).send({ error: "User creation failed" });

    // 2. Insert into users table
    const { data: profile, error: userError } = await supabase
      .from('users')
      .insert({
        supabase_uid: authData.user.id,
        email: email,
        display_name: displayName,
        native_lang: nativeLang,
        learning_langs: learningLangs
      })
      .select()
      .single();

    if (userError) return reply.code(400).send({ error: userError.message });

    // 3. Insert into streaks table
    const { error: streakError } = await supabase
      .from('streaks')
      .insert({ user_id: profile.id });
      
    if (streakError) return reply.code(400).send({ error: streakError.message });

    return reply.code(201).send({ jwt: authData.session?.access_token || null, user: profile });
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email, password
    });
    
    if (signInError) return reply.code(401).send({ error: signInError.message });
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', authData.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });
      
    return { jwt: authData.session?.access_token, user: profile };
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (error) return reply.code(400).send({ error: error.message });
    return { user: profile };
  });

  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { displayName, dailyGoalMin, fcmToken } = request.body;
    
    const updateData = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (dailyGoalMin !== undefined) updateData.daily_goal_min = dailyGoalMin;
    if (fcmToken !== undefined) updateData.fcm_token = fcmToken;
    
    const { data: profile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('supabase_uid', request.user.id)
      .select()
      .single();
      
    if (error) return reply.code(400).send({ error: error.message });
    return { user: profile };
  });

  fastify.delete('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const uid = request.user.id;
    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(uid);
    if (authError) return reply.code(400).send({ error: authError.message });
    
    // Delete from users table
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('supabase_uid', uid);
      
    if (dbError) return reply.code(400).send({ error: dbError.message });
    
    return { success: true };
  });
}

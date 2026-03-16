// src/routes/notify.js
// PATCH /auth/me/fcm-token  — saves FCM registration token for the logged-in user
// POST  /notify/test        — sends a test notification to the calling user (dev only)

export default async function notifyRoutes(fastify) {

  // ── PATCH /auth/me/fcm-token ────────────────────────────────────────────────
  fastify.patch(
    '/auth/me/fcm-token',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { fcm_token } = request.body ?? {};
      if (!fcm_token || typeof fcm_token !== 'string') {
        return reply.status(400).send({ error: 'fcm_token is required' });
      }

      const userId = request.user?.sub ?? request.user?.id;
      const { error } = await fastify.supabase
        .from('users')
        .update({ fcm_token })
        .eq('supabase_uid', userId);

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to save FCM token' });
      }

      return reply.send({ success: true });
    }
  );

  // ── POST /notify/test ──────────────────────────────────────────────────────
  // Only available in non-production — sends a test push to the calling user
  fastify.post(
    '/notify/test',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      if (process.env.NODE_ENV === 'production') {
        return reply.status(403).send({ error: 'Not available in production' });
      }

      const userId = request.user?.sub ?? request.user?.id;
      const { data: user } = await fastify.supabase
        .from('users')
        .select('fcm_token, display_name')
        .eq('supabase_uid', userId)
        .single();

      if (!user?.fcm_token) {
        return reply.status(404).send({ error: 'No FCM token on file for this user' });
      }

      const { sendPushNotification } = await import('../services/notifyService.js');
      await sendPushNotification({
        token: user.fcm_token,
        title: `Hey ${user.display_name?.split(' ')[0] ?? 'Learner'}! 👋`,
        body:  'This is a test notification from BhashaBridge 🎉',
        data:  { screen: 'lessons' },
      });

      return reply.send({ success: true, message: 'Test notification sent' });
    }
  );
}
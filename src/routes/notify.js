// src/routes/notify.js
// POST /notify/test — sends a test push notification to the calling user (dev only)
// NOTE: PATCH /auth/me/fcm-token is already handled in auth.js — do NOT duplicate it here

export default async function notifyRoutes(fastify) {

  // ── POST /notify/test ──────────────────────────────────────────────────────
  // Only available in non-production environments
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
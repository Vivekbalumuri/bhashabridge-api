import { supabase } from '../db.js';
import { sendToAll } from '../services/notifyService.js';

export default async function notifyRoutes(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    const serviceKey = request.headers['x-service-key'];
    if (serviceKey !== process.env.SUPABASE_SERVICE_KEY) {
      return reply.code(403).send({ error: "Forbidden: Invalid service key" });
    }
  });

  fastify.post('/daily-word', async (request, reply) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const { data: dailyWordMap } = await supabase
      .from('daily_words')
      .select('*, words(tamil, telugu, english)')
      .eq('show_date', todayStr)
      .single();
      
    if (!dailyWordMap) {
      return reply.code(404).send({ error: "No daily word found for today" });
    }

    const word = dailyWordMap.words;
    const { data: users } = await supabase
      .from('users')
      .select('fcm_token')
      .not('fcm_token', 'is', null);

    if (!users || users.length === 0) return { sent: 0 };

    const tokens = users.map(u => u.fcm_token).filter(t => t);
    
    const result = await sendToAll(tokens, {
      title: "Today's Word in BhashaBridge! 📚",
      body: `Learn to say '${word.english}' in Tamil (${word.tamil}) and Telugu (${word.telugu})!`,
      data: { route: 'daily-word' }
    });

    return { sent: result.successCount };
  });

  fastify.post('/streak-alert', async (request, reply) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: users, error } = await supabase
      .from('users')
      .select('id, fcm_token, last_active_at')
      .not('fcm_token', 'is', null);

    if (error) return reply.code(400).send({ error: error.message });

    const tokensToAlert = users
      .filter(u => !u.last_active_at || !u.last_active_at.startsWith(todayStr))
      .map(u => u.fcm_token)
      .filter(t => t);

    if (tokensToAlert.length === 0) return { sent: 0 };

    const result = await sendToAll(tokensToAlert, {
      title: "Don't break your streak! 🔥",
      body: "Keep learning on BhashaBridge today to maintain your streak.",
      data: { route: 'streak' }
    });

    return { sent: result.successCount };
  });
}

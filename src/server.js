import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { supabase } from './db.js';
import authRoutes     from './routes/auth.js';
import lessonRoutes   from './routes/lessons.js';
import wordRoutes     from './routes/words.js';
import progressRoutes from './routes/progress.js';
import streakRoutes   from './routes/streak.js';

const fastify = Fastify({ logger: true });

// ── CORS ──────────────────────────────────────────────────
await fastify.register(cors, { origin: true });

// ── Rate limiting ─────────────────────────────────────────
await fastify.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute'
});

// ── Auth decorator ────────────────────────────────────────
// Uses supabase.auth.getUser() to verify the Supabase ES256 JWT.
// Replaces @fastify/jwt which only supports HS256 and rejects all
// valid Supabase tokens with "Invalid token".
fastify.decorate('authenticate', async function (request, reply) {
  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  }

  // Make user available in all route handlers as request.user
  request.user = user;
});

// ── Health check ──────────────────────────────────────────
fastify.get('/health', async () => ({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────
fastify.register(authRoutes,     { prefix: '/auth' });
fastify.register(lessonRoutes,   { prefix: '/lessons' });
fastify.register(wordRoutes,     { prefix: '/words' });
fastify.register(progressRoutes, { prefix: '/progress' });
fastify.register(streakRoutes,   { prefix: '/streak' });
fastify.register(import('./routes/leaderboard.js'))
fastify.register(import('./routes/notify.js'))
fastify.register(import('./routes/referral.js'), { prefix: '/referral' })


// ── Start ─────────────────────────────────────────────────
try {
  await fastify.listen({
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
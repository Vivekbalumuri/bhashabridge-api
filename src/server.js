import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { authPlugin } from './plugins/auth.js';
import { startCronJobs } from './jobs/index.js';

import authRoutes from './routes/auth.js';
import wordsRoutes from './routes/words.js';
import lessonsRoutes from './routes/lessons.js';
import progressRoutes from './routes/progress.js';
import streakRoutes from './routes/streak.js';
import purchaseRoutes from './routes/purchase.js';
import leaderboardRoutes from './routes/leaderboard.js';
import notifyRoutes from './routes/notify.js';

const fastify = Fastify({ logger: true });

async function start() {
  await fastify.register(cors, {
    origin: '*' 
  });

  await fastify.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute'
  });

  await fastify.register(authPlugin);

  fastify.register(async function (protectedFastify) {
    protectedFastify.register(authRoutes, { 
      prefix: '/auth',
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    });
    protectedFastify.register(purchaseRoutes, { 
      prefix: '/purchase',
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
    });
  });

  fastify.register(wordsRoutes, { prefix: '/words' });
  fastify.register(lessonsRoutes, { prefix: '/lessons' });
  fastify.register(progressRoutes, { prefix: '/progress' });
  fastify.register(streakRoutes, { prefix: '/streak' });
  fastify.register(leaderboardRoutes, { prefix: '/leaderboard' });
  fastify.register(notifyRoutes, { prefix: '/notify' });

  fastify.get('/health', async () => {
    return { status: 'ok', app: 'BhashaBridge API', timestamp: new Date() };
  });

  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${port}`);
    
    startCronJobs();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
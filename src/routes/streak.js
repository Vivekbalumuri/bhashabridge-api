/**
 * src/routes/streak.js
 *
 * GET  /streak           — current streak + XP + level
 * GET  /streak/history   — last 30 days of activity
 * POST /streak/add-xp    — awards XP, updates streak, bumps weekly_xp
 */

const XP_PER_LEVEL = 500

function xpToLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

function xpToLeague(xp) {
  if (xp >= 10_000) return 'diamond'
  if (xp >=  3_000) return 'gold'
  if (xp >=  1_000) return 'silver'
  return 'bronze'
}

async function streakRoutes(fastify, _opts) {
  const db = fastify.supabase

  async function getUserId(supabaseUid) {
    const { data, error } = await db
      .from('users')
      .select('id')
      .eq('supabase_uid', supabaseUid)
      .single()
    if (error || !data) return null
    return data.id
  }

  // ── GET /streak ───────────────────────────────────────────────────────────
  fastify.get('/streak', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = await getUserId(request.user.sub)
    if (!userId) return reply.code(404).send({ error: 'User not found.' })

    const { data: streak, error } = await db
      .from('streaks')
      .select('current_streak, last_activity, total_xp, level')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      fastify.log.error({ error }, 'GET /streak error')
      return reply.code(500).send({ error: 'Failed to load streak.' })
    }

    if (!streak) {
      return reply.send({ current_streak: 0, last_activity: null, total_xp: 0, level: 1 })
    }

    return reply.send({
      current_streak: streak.current_streak ?? 0,
      last_activity:  streak.last_activity  ?? null,
      total_xp:       streak.total_xp       ?? 0,
      level:          streak.level          ?? xpToLevel(streak.total_xp ?? 0)
    })
  })

  // ── GET /streak/history ───────────────────────────────────────────────────
  fastify.get('/streak/history', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = await getUserId(request.user.sub)
    if (!userId) return reply.code(404).send({ error: 'User not found.' })

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const { data: rows, error } = await db
      .from('lesson_progress')
      .select('completed_at, lessons ( xp_reward )')
      .eq('user_id', userId)
      .eq('quiz_completed', true)
      .gte('completed_at', cutoff.toISOString())
      .order('completed_at', { ascending: true })

    if (error) {
      fastify.log.error({ error }, 'GET /streak/history error')
      return reply.code(500).send({ error: 'Failed to load streak history.' })
    }

    const byDate = {}
    for (const row of rows ?? []) {
      if (!row.completed_at) continue
      const date = row.completed_at.slice(0, 10)
      const xp   = row.lessons?.xp_reward ?? 20
      if (!byDate[date]) byDate[date] = { date, xp: 0, lessons_completed: 0 }
      byDate[date].xp               += xp
      byDate[date].lessons_completed += 1
    }

    const history = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    return reply.send({ history })
  })

  // ── POST /streak/add-xp ───────────────────────────────────────────────────
  fastify.post(
    '/streak/add-xp',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: {
          type:       'object',
          required:   ['xp_earned'],
          properties: {
            chapter_id: { type: 'integer' },
            direction:  { type: 'string'  },
            xp_earned:  { type: 'integer', minimum: 0, maximum: 500 }
          }
        }
      }
    },
    async (request, reply) => {
      const { xp_earned } = request.body
      const userId = await getUserId(request.user.sub)
      if (!userId) return reply.code(404).send({ error: 'User not found.' })

      const { data: current, error: fetchErr } = await db
        .from('streaks')
        .select('current_streak, last_activity, total_xp')
        .eq('user_id', userId)
        .single()

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        return reply.code(500).send({ error: 'Failed to read streak.' })
      }

      const todayStr   = new Date().toISOString().slice(0, 10)
      const lastStr    = current?.last_activity ?? ''
      const prevStreak = current?.current_streak ?? 0
      const prevXp     = current?.total_xp ?? 0

      let newStreak = prevStreak
      if (lastStr !== todayStr) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)
        newStreak = (lastStr === yesterdayStr) ? prevStreak + 1 : 1
      }

      const newXp    = prevXp + xp_earned
      const newLevel = xpToLevel(newXp)

      const { error: upsertErr } = await db
        .from('streaks')
        .upsert(
          { user_id: userId, current_streak: newStreak, last_activity: todayStr, total_xp: newXp, level: newLevel },
          { onConflict: 'user_id' }
        )

      if (upsertErr) {
        fastify.log.error({ upsertErr }, 'POST /streak/add-xp upsert error')
        return reply.code(500).send({ error: 'Failed to update streak.' })
      }

      // Bump weekly_xp — best effort, non-blocking
      const league = xpToLeague(newXp)
      db.rpc('increment_weekly_xp', { p_user_id: userId, p_xp: xp_earned })
        .then(({ error }) => {
          if (error) {
            // Row may not exist yet — upsert it first then retry
            return db
              .from('user_leagues')
              .upsert({ user_id: userId, league, weekly_xp: xp_earned }, { onConflict: 'user_id', ignoreDuplicates: false })
          }
        })
        .catch(err => fastify.log.warn({ err }, 'weekly_xp bump failed (non-critical)'))

      return reply.send({ current_streak: newStreak, total_xp: newXp, level: newLevel })
    }
  )
}

export default streakRoutes
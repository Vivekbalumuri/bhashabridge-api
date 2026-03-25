/**
 * src/jobs/leagueReset.js
 *
 * Weekly league reset + promotion/demotion.
 * Cron: Sunday 18:30 UTC = Monday 00:00 IST
 *
 * Requires the user_leagues table — run migration_leagues.sql first.
 */

import cron from 'node-cron'

const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'diamond']

function xpToLeague(totalXp) {
  if (totalXp >= 10_000) return 'diamond'
  if (totalXp >=  3_000) return 'gold'
  if (totalXp >=  1_000) return 'silver'
  return 'bronze'
}

const PROMO_PERCENTILE     = 0.70   // top 30% → promoted
const DEMOTION_PERCENTILE  = 0.20   // bottom 20% → demoted
const DEMOTION_FLOOR_XP    = 10     // < 10 weekly XP always at risk of demotion

export async function runLeagueReset(fastify) {
  const log = fastify.log.child({ job: 'league-reset' })
  log.info('Starting weekly league reset')

  const db  = fastify.supabase
  const now = new Date().toISOString()

  // 1. Fetch all premium users + streak + current league
  const { data: users, error: usersErr } = await db
    .from('users')
    .select(`
      id,
      streaks ( total_xp ),
      user_leagues ( league, weekly_xp )
    `)
    .eq('is_premium', true)

  if (usersErr) throw new Error(`fetch users: ${usersErr.message}`)
  if (!users?.length) {
    log.info('No premium users — skipping reset')
    return
  }

  log.info(`Processing ${users.length} premium users`)

  // 2. Build per-league weekly-XP buckets for threshold computation
  const leagueBuckets = { bronze: [], silver: [], gold: [], diamond: [] }

  const processed = users.map(u => {
    const totalXp      = u.streaks?.total_xp       ?? 0
    const weeklyXp     = u.user_leagues?.weekly_xp  ?? 0
    const currentLeague = u.user_leagues?.league    ?? xpToLeague(totalXp)
    leagueBuckets[currentLeague]?.push(weeklyXp)
    return { id: u.id, totalXp, weeklyXp, currentLeague }
  })

  // 3. Compute promotion / demotion thresholds per league
  const promoThresholds    = {}
  const demotionThresholds = {}

  for (const league of LEAGUE_ORDER) {
    const bucket = [...leagueBuckets[league]].sort((a, b) => b - a)
    const n      = bucket.length
    if (!n) continue

    if (league !== 'diamond') {
      const idx = Math.floor(n * PROMO_PERCENTILE)
      promoThresholds[league] = bucket[Math.min(idx, n - 1)] ?? 0
    }
    if (league !== 'bronze') {
      const idx = Math.floor(n * (1 - DEMOTION_PERCENTILE))
      demotionThresholds[league] = bucket[Math.min(idx, n - 1)] ?? 0
    }
  }

  log.info({ promoThresholds, demotionThresholds }, 'Thresholds computed')

  // 4. Decide new league for every user
  const upsertRows = []
  let promoted = 0, demoted = 0, unchanged = 0

  for (const { id, totalXp, weeklyXp, currentLeague } of processed) {
    const xpLeague   = xpToLeague(totalXp)
    const currentIdx = LEAGUE_ORDER.indexOf(currentLeague)

    let newLeague  = currentLeague
    let promotedAt = null
    let demotedAt  = null

    const promoThreshold = promoThresholds[currentLeague]
    if (
      currentLeague !== 'diamond'
      && promoThreshold !== undefined
      && weeklyXp >= promoThreshold
      && weeklyXp > 0
    ) {
      newLeague  = LEAGUE_ORDER[Math.min(currentIdx + 1, LEAGUE_ORDER.length - 1)]
      promotedAt = now
      promoted++
    } else {
      const demoteThreshold = demotionThresholds[currentLeague]
      if (
        currentLeague !== 'bronze'
        && demoteThreshold !== undefined
        && (weeklyXp < demoteThreshold || weeklyXp < DEMOTION_FLOOR_XP)
      ) {
        newLeague = LEAGUE_ORDER[Math.max(currentIdx - 1, 0)]
        demotedAt = now
        demoted++
      } else {
        unchanged++
      }
    }

    // XP floor: never drop below the tier their total XP earns
    if (LEAGUE_ORDER.indexOf(newLeague) < LEAGUE_ORDER.indexOf(xpLeague)) {
      newLeague = xpLeague
      demotedAt = null
    }

    upsertRows.push({
      user_id:       id,
      league:        newLeague,
      weekly_xp:     0,
      promoted_at:   promotedAt,
      demoted_at:    demotedAt,
      last_reset_at: now,
    })
  }

  // 5. Upsert in batches of 500
  const BATCH = 500
  for (let i = 0; i < upsertRows.length; i += BATCH) {
    const { error } = await db
      .from('user_leagues')
      .upsert(upsertRows.slice(i, i + BATCH), { onConflict: 'user_id' })
    if (error) throw new Error(`upsert batch ${i}: ${error.message}`)
  }

  log.info({ total: processed.length, promoted, demoted, unchanged }, 'League reset complete')
}

export function scheduleLeagueReset(fastify) {
  cron.schedule('30 18 * * 0', async () => {
    try {
      await runLeagueReset(fastify)
    } catch (err) {
      fastify.log.error({ err }, 'Scheduled league reset threw')
    }
  }, { timezone: 'UTC' })

  fastify.log.info('League reset cron scheduled: Sunday 18:30 UTC')
}
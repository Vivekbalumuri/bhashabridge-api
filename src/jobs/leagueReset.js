/**
 * Weekly League Reset Job
 * =======================
 * Runs every Sunday at 18:30 UTC (Monday 00:00 IST).
 *
 * What it does:
 *   1. Reads every premium user's current total_xp from the streaks table.
 *   2. Computes their league tier from XP (bronze / silver / gold / diamond).
 *   3. Writes the new league into a `user_leagues` table (see schema below).
 *   4. Promotes users who earned ≥ PROMO_THRESHOLD XP this week.
 *   5. Demotes users who earned < DEMOTION_THRESHOLD XP this week (bottom 20%).
 *   6. Resets weekly_xp to 0 for all users.
 *   7. Logs a summary.
 *
 * League XP thresholds (same as Android CacheRepository):
 *   bronze  : 0 – 999 total XP
 *   silver  : 1,000 – 2,999 total XP
 *   gold    : 3,000 – 9,999 total XP
 *   diamond : 10,000+ total XP
 *
 * REQUIRED Supabase table — run this migration once:
 * ─────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS user_leagues (
 *   user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 *   league         TEXT    NOT NULL DEFAULT 'bronze',
 *   weekly_xp      INTEGER NOT NULL DEFAULT 0,
 *   promoted_at    TIMESTAMPTZ,
 *   demoted_at     TIMESTAMPTZ,
 *   last_reset_at  TIMESTAMPTZ
 * );
 *
 * CREATE INDEX IF NOT EXISTS idx_user_leagues_league ON user_leagues(league);
 * ─────────────────────────────────────────────────
 *
 * This file exports:
 *   scheduleLeagueReset(fastify) — call once from src/jobs/index.js
 */

'use strict'

const LEAGUE_ORDER  = ['bronze', 'silver', 'gold', 'diamond']

// XP thresholds — must match Android CacheRepository.xpToLeague()
function xpToLeague(totalXp) {
  if (totalXp >= 10_000) return 'diamond'
  if (totalXp  >= 3_000) return 'gold'
  if (totalXp  >= 1_000) return 'silver'
  return 'bronze'
}

// Promotion: top 30% of weekly XP earners in a league move up
const PROMO_PERCENTILE    = 0.70   // top 30% → promoted
// Demotion: bottom 20% of weekly XP earners (min 10 XP to avoid punishing inactivity)
const DEMOTION_PERCENTILE = 0.20   // bottom 20% → demoted
const DEMOTION_FLOOR_XP   = 10     // users with < 10 weekly XP are always at risk

async function runLeagueReset(fastify) {
  const log = fastify.log.child({ job: 'league-reset' })
  log.info('Starting weekly league reset')

  const db = fastify.supabase
  const now = new Date().toISOString()

  try {
    // ── 1. Fetch all premium users + their streak + current league ──────────
    const { data: users, error: usersErr } = await db
      .from('users')
      .select(`
        id,
        streaks ( total_xp ),
        user_leagues ( league, weekly_xp )
      `)
      .eq('is_premium', true)

    if (usersErr) throw new Error(`fetch users: ${usersErr.message}`)
    if (!users || users.length === 0) {
      log.info('No premium users found — skipping reset')
      return
    }

    log.info(`Processing ${users.length} premium users`)

    // ── 2. Build per-league buckets of weekly XP ────────────────────────────
    // Used to compute promotion / demotion percentile cutoffs.
    const leagueBuckets = { bronze: [], silver: [], gold: [], diamond: [] }

    const processedUsers = users.map(u => {
      const totalXp  = u.streaks?.total_xp   ?? 0
      const weeklyXp = u.user_leagues?.weekly_xp ?? 0
      const currentLeague = u.user_leagues?.league ?? xpToLeague(totalXp)

      leagueBuckets[currentLeague]?.push(weeklyXp)

      return { id: u.id, totalXp, weeklyXp, currentLeague }
    })

    // ── 3. Compute promotion / demotion thresholds per league ───────────────
    const promoThresholds   = {}
    const demotionThresholds = {}

    for (const league of LEAGUE_ORDER) {
      const bucket = leagueBuckets[league].sort((a, b) => b - a)   // descending
      const n      = bucket.length
      if (n === 0) continue

      // Promotion cutoff: top 30% (only if league is not diamond)
      if (league !== 'diamond') {
        const promoIdx         = Math.floor(n * PROMO_PERCENTILE)
        promoThresholds[league] = bucket[Math.min(promoIdx, n - 1)] ?? 0
      }

      // Demotion cutoff: bottom 20% (only if league is not bronze)
      if (league !== 'bronze') {
        const demoteIdx           = Math.floor(n * (1 - DEMOTION_PERCENTILE))
        demotionThresholds[league] = bucket[Math.min(demoteIdx, n - 1)] ?? 0
      }
    }

    log.info({ promoThresholds, demotionThresholds }, 'League thresholds computed')

    // ── 4. Determine new league for each user ───────────────────────────────
    const upsertRows = []
    let promoted = 0, demoted = 0, unchanged = 0

    for (const user of processedUsers) {
      const { id, totalXp, weeklyXp, currentLeague } = user

      // Base league from total XP (source of truth — prevents permanent wrong tier)
      const xpLeague     = xpToLeague(totalXp)
      const currentIdx   = LEAGUE_ORDER.indexOf(currentLeague)
      const xpIdx        = LEAGUE_ORDER.indexOf(xpLeague)

      let newLeague  = currentLeague
      let promotedAt = null
      let demotedAt  = null

      // Promotion check (can't promote beyond diamond)
      const promoThreshold = promoThresholds[currentLeague]
      if (
        currentLeague !== 'diamond'
        && promoThreshold !== undefined
        && weeklyXp >= promoThreshold
        && weeklyXp > 0
      ) {
        const nextIdx = Math.min(currentIdx + 1, LEAGUE_ORDER.length - 1)
        newLeague     = LEAGUE_ORDER[nextIdx]
        promotedAt    = now
        promoted++
      }
      // Demotion check (can't demote below bronze)
      else {
        const demoteThreshold = demotionThresholds[currentLeague]
        if (
          currentLeague !== 'bronze'
          && demoteThreshold !== undefined
          && (weeklyXp < demoteThreshold || weeklyXp < DEMOTION_FLOOR_XP)
        ) {
          const prevIdx = Math.max(currentIdx - 1, 0)
          newLeague     = LEAGUE_ORDER[prevIdx]
          demotedAt     = now
          demoted++
        } else {
          unchanged++
        }
      }

      // XP-based floor: never put someone in a league below their XP tier
      // (e.g. a diamond-XP user can't be demoted to bronze)
      if (LEAGUE_ORDER.indexOf(newLeague) < xpIdx) {
        newLeague  = xpLeague
        demotedAt  = null   // not really a demotion, just a correction
      }

      upsertRows.push({
        user_id:       id,
        league:        newLeague,
        weekly_xp:     0,         // reset for next week
        promoted_at:   promotedAt,
        demoted_at:    demotedAt,
        last_reset_at: now,
      })
    }

    // ── 5. Upsert new league rows in batches of 500 ─────────────────────────
    const BATCH = 500
    for (let i = 0; i < upsertRows.length; i += BATCH) {
      const batch = upsertRows.slice(i, i + BATCH)
      const { error: upsertErr } = await db
        .from('user_leagues')
        .upsert(batch, { onConflict: 'user_id' })

      if (upsertErr) {
        log.error({ upsertErr, batchStart: i }, 'Upsert batch failed')
        throw new Error(`upsert batch ${i}: ${upsertErr.message}`)
      }
    }

    log.info(
      { total: processedUsers.length, promoted, demoted, unchanged },
      'League reset complete'
    )

  } catch (err) {
    log.error({ err }, 'League reset job failed')
    throw err
  }
}

/**
 * Call this once from src/jobs/index.js during server startup.
 * Cron: "30 18 * * 0" = Sunday 18:30 UTC = Monday 00:00 IST
 */
function scheduleLeagueReset(fastify) {
  const cron = require('node-cron')

  cron.schedule('30 18 * * 0', async () => {
    try {
      await runLeagueReset(fastify)
    } catch (err) {
      fastify.log.error({ err }, 'Scheduled league reset threw')
    }
  }, { timezone: 'UTC' })

  fastify.log.info('League reset cron scheduled: Sunday 18:30 UTC (Monday 00:00 IST)')
}

module.exports = { scheduleLeagueReset, runLeagueReset }
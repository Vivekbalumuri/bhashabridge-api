/**
 * POST /auth/resend-verification
 *
 * Sends a fresh verification email to the requesting user.
 *
 * Auth: Bearer token required (user must have logged in once even
 *       without verifying — the JWT is issued at login regardless).
 *
 * Flow:
 *   1. Decode JWT to get supabase_uid (no DB round-trip needed).
 *   2. Call Supabase Admin API resend to trigger a new verification email.
 *   3. Return success regardless of whether email was already verified
 *      (idempotent — harmless to re-send).
 *
 * Rate limit: enforced by Supabase on their side (max 1 per minute).
 * We add a lightweight 60-second in-memory cooldown per uid to avoid
 * hammering Supabase if the Android client retries aggressively.
 */

'use strict'

// In-memory cooldown: uid → timestamp of last resend
const cooldowns = new Map()
const COOLDOWN_MS = 60 * 1000  // 60 seconds

async function resendVerificationRoutes(fastify, _opts) {

  fastify.post(
    '/auth/resend-verification',
    { onRequest: [fastify.authenticate] },   // verifies JWT, sets request.user
    async (request, reply) => {
      const uid   = request.user.sub          // Supabase user UUID from JWT
      const email = request.user.email        // included in Supabase JWT claims

      if (!uid || !email) {
        return reply.code(400).send({ error: 'Could not determine user identity from token.' })
      }

      // ── Cooldown check ────────────────────────────────────────────────────
      const lastSent = cooldowns.get(uid) ?? 0
      const elapsed  = Date.now() - lastSent
      if (elapsed < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        return reply.code(429).send({
          error: `Please wait ${waitSec}s before requesting another verification email.`
        })
      }

      // ── Call Supabase Admin API to resend verification ────────────────────
      // Uses the service-role key (set in env: SUPABASE_SERVICE_ROLE_KEY).
      // This is the only way to trigger a new email without the user's password.
      const supabaseUrl    = process.env.SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        fastify.log.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
        return reply.code(500).send({ error: 'Server configuration error.' })
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${uid}`,
          {
            method: 'PUT',
            headers: {
              'apikey':        serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type':  'application/json',
            },
            // Resend by "touching" the user with resend: true.
            // Alternatively call /auth/v1/resend directly (works for email type).
            body: JSON.stringify({ email_confirm: false })
          }
        )

        // Use the public resend endpoint which is simpler and available without admin:
        // POST /auth/v1/resend with type=signup triggers a new confirmation email.
        const resendResp = await fetch(
          `${supabaseUrl}/auth/v1/resend`,
          {
            method: 'POST',
            headers: {
              'apikey':        process.env.SUPABASE_ANON_KEY,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({ type: 'signup', email })
          }
        )

        if (!resendResp.ok) {
          const body = await resendResp.json().catch(() => ({}))
          fastify.log.warn({ uid, email, status: resendResp.status, body }, 'Supabase resend failed')
          // Still return 200 — don't leak internal errors to client
          return reply.send({ message: 'If your email is registered, a verification link has been sent.' })
        }

        // Record successful send time for cooldown
        cooldowns.set(uid, Date.now())
        // Prune old entries periodically to avoid memory leak
        if (cooldowns.size > 10_000) {
          const cutoff = Date.now() - COOLDOWN_MS * 10
          for (const [k, v] of cooldowns) {
            if (v < cutoff) cooldowns.delete(k)
          }
        }

        fastify.log.info({ uid, email }, 'Verification email resent')
        return reply.send({ message: 'Verification email sent. Check your inbox.' })

      } catch (err) {
        fastify.log.error({ err }, 'resend-verification: network error')
        return reply.code(500).send({ error: 'Failed to send verification email. Try again shortly.' })
      }
    }
  )
}

module.exports = resendVerificationRoutes
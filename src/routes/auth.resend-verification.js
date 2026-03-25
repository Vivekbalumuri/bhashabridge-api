/**
 * src/routes/auth.resend-verification.js
 * POST /auth/resend-verification
 *
 * Triggers a new Supabase verification email for the authenticated user.
 * Uses the public /auth/v1/resend endpoint (no service-role key needed).
 *
 * Rate limit: 60s in-memory cooldown per user UID.
 */

const cooldowns = new Map()
const COOLDOWN_MS = 60_000

async function resendVerificationRoutes(fastify, _opts) {

  fastify.post(
    '/auth/resend-verification',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const uid   = request.user.sub
      const email = request.user.email

      if (!uid || !email) {
        return reply.code(400).send({ error: 'Could not determine user identity from token.' })
      }

      // Cooldown check
      const elapsed = Date.now() - (cooldowns.get(uid) ?? 0)
      if (elapsed < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        return reply.code(429).send({
          error: `Please wait ${waitSec}s before requesting another verification email.`
        })
      }

      const supabaseUrl = process.env.SUPABASE_URL
      const anonKey     = process.env.SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        fastify.log.error('SUPABASE_URL or SUPABASE_ANON_KEY not set')
        return reply.code(500).send({ error: 'Server configuration error.' })
      }

      try {
        const resp = await fetch(`${supabaseUrl}/auth/v1/resend`, {
          method:  'POST',
          headers: {
            'apikey':       anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'signup', email })
        })

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}))
          fastify.log.warn({ uid, email, status: resp.status, body }, 'Supabase resend failed')
          // Return 200 — don't leak whether the email exists
        } else {
          cooldowns.set(uid, Date.now())
          // Prune stale entries
          if (cooldowns.size > 10_000) {
            const cutoff = Date.now() - COOLDOWN_MS * 10
            for (const [k, v] of cooldowns) {
              if (v < cutoff) cooldowns.delete(k)
            }
          }
          fastify.log.info({ uid, email }, 'Verification email resent')
        }

        return reply.send({ message: 'If your email is registered, a verification link has been sent.' })

      } catch (err) {
        fastify.log.error({ err }, 'resend-verification: network error')
        return reply.code(500).send({ error: 'Failed to send verification email. Try again shortly.' })
      }
    }
  )
}

export default resendVerificationRoutes
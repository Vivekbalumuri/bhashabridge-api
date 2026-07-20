import { supabase } from '../db.js';
import { sendReferralRewardEmail } from '../services/emailService.js';

const REFERRER_REWARD_DAYS = 7;
const REFERRED_REWARD_DAYS = 3;

// ── Helper: get users.id from supabase_uid ────────────────────────────────────
async function getUserRow(supabaseUid) {
  const { data } = await supabase
    .from('users')
    .select('id, display_name, referral_code, referral_count, is_premium, premium_expires_at')
    .eq('supabase_uid', supabaseUid)
    .single();
  return data;
}

// ── Helper: grant premium days to a user ─────────────────────────────────────
async function grantPremiumDays(userId, days) {
  // Get current expiry
  const { data: user } = await supabase
    .from('users')
    .select('premium_expires_at, is_premium')
    .eq('id', userId)
    .single();

  const now = new Date();
  // If already premium and not expired, extend from expiry; otherwise from now
  const base = user?.premium_expires_at && new Date(user.premium_expires_at) > now
    ? new Date(user.premium_expires_at)
    : now;

  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + days);

  await supabase
    .from('users')
    .update({
      is_premium:         true,
      premium_expires_at: newExpiry.toISOString(),
    })
    .eq('id', userId);

  return newExpiry.toISOString();
}

export default async function referralRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET /referral/me ──────────────────────────────────────────────────────
  // Returns the current user's referral code + stats
  fastify.get('/me', async (request, reply) => {
    const user = await getUserRow(request.user.id);
    if (!user) return reply.code(404).send({ error: 'User not found' });

    return {
      referral_code:        user.referral_code,
      referral_count:       user.referral_count || 0,
      is_premium:           user.is_premium || false,
      premium_expires_at:   user.premium_expires_at || null,
      referrer_reward_days: REFERRER_REWARD_DAYS,
      referred_reward_days: REFERRED_REWARD_DAYS,
    };
  });

  // ── GET /referral/validate/:code ──────────────────────────────────────────
  // Validates a referral code and returns the referrer's display name
  fastify.get('/validate/:code', async (request, reply) => {
    const { code } = request.params;
    if (!code) return reply.code(400).send({ error: 'code is required' });

    const { data: referrer } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('referral_code', code.toUpperCase().trim())
      .single();

    if (!referrer) return { valid: false, referrer_name: null };

    // Make sure user isn't trying to use their own code
    const self = await getUserRow(request.user.id);
    if (self && self.id === referrer.id) {
      return { valid: false, referrer_name: null };
    }

    return { valid: true, referrer_name: referrer.display_name || 'A friend' };
  });

  // ── POST /referral/apply ──────────────────────────────────────────────────
  // Called after registration when user enters a referral code
  fastify.post('/apply', async (request, reply) => {
    const { referral_code } = request.body;
    if (!referral_code) return reply.code(400).send({ error: 'referral_code is required' });

    const code = referral_code.toUpperCase().trim();

    // Get current user
    const self = await getUserRow(request.user.id);
    if (!self) return reply.code(404).send({ error: 'User not found' });

    // Check not already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', self.id)
      .single();

    if (existingReferral) {
      return reply.code(400).send({ error: 'You have already used a referral code' });
    }

    // Find referrer
    const { data: referrer } = await supabase
      .from('users')
      .select('id, display_name, email')
      .eq('referral_code', code)
      .single();

    if (!referrer) return reply.code(404).send({ error: 'Invalid referral code' });
    if (referrer.id === self.id) return reply.code(400).send({ error: 'Cannot use your own referral code' });

    // Record referral
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id:   referrer.id,
        referred_id:   self.id,
        referral_code: code,
        reward_days:   REFERRER_REWARD_DAYS,
      });

    if (referralError) return reply.code(400).send({ error: referralError.message });

    // Grant rewards
    const [referrerExpiry, referredExpiry] = await Promise.all([
      grantPremiumDays(referrer.id, REFERRER_REWARD_DAYS),  // referrer gets 7 days
      grantPremiumDays(self.id,     REFERRED_REWARD_DAYS),  // new user gets 3 days
    ]);

    // Increment referrer's count
    await supabase
      .from('users')
      .update({ referral_count: (await supabase.from('users').select('referral_count').eq('id', referrer.id).single()).data?.referral_count + 1 || 1 })
      .eq('id', referrer.id);

    // Send referral reward email to the referrer in background
    if (referrer.email) {
      sendReferralRewardEmail(referrer.email, REFERRER_REWARD_DAYS).catch(err => {
        fastify.log.error({ err }, `Failed to send referral reward email to ${referrer.email}`);
      });
    }

    return {
      success:              true,
      message:              `You got ${REFERRED_REWARD_DAYS} days of Premium free!`,
      referred_reward_days: REFERRED_REWARD_DAYS,
      premium_expires_at:   referredExpiry,
    };
  });
}
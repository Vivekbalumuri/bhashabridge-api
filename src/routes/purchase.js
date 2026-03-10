import { supabase } from '../db.js';
import { google } from 'googleapis';

const androidpublisher = google.androidpublisher('v3');

async function verifyWithGooglePlay(purchaseToken, productId) {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
  });

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'production') {
    return {
      paymentState: 1,
      expiryTimeMillis: Date.now() + 30 * 24 * 60 * 60 * 1000,
      acknowledgementState: 1
    };
  }

  const client = await auth.getClient();
  google.options({ auth: client });

  const res = await androidpublisher.purchases.subscriptions.get({
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    subscriptionId: productId,
    token: purchaseToken
  });

  return res.data;
}

export default async function purchaseRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/verify', async (request, reply) => {
    const { purchaseToken, productId } = request.body;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    try {
      const receipt = await verifyWithGooglePlay(purchaseToken, productId);
      
      if (receipt.paymentState !== 1) {
        return reply.code(400).send({ error: 'Payment not received' });
      }

      const expiresAt = new Date(parseInt(receipt.expiryTimeMillis, 10)).toISOString();

      const { error: upsertError } = await supabase
        .from('purchases')
        .upsert({
          user_id: userProfile.id,
          purchase_token: purchaseToken,
          product_id: productId,
          purchase_state: receipt.paymentState,
          is_acknowledged: receipt.acknowledgementState === 1,
          expires_at: expiresAt,
          raw_receipt: receipt
        }, { onConflict: 'purchase_token' });

      if (upsertError) return reply.code(400).send({ error: upsertError.message });

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ is_premium: true, premium_expires_at: expiresAt })
        .eq('id', userProfile.id);

      if (userUpdateError) return reply.code(400).send({ error: userUpdateError.message });

      return { success: true, isPremium: true, expiresAt };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.get('/status', async (request, reply) => {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, premium_expires_at')
      .eq('supabase_uid', request.user.id)
      .single();
      
    if (profileError) return reply.code(400).send({ error: profileError.message });

    const isPremium = userProfile.premium_expires_at 
      ? new Date(userProfile.premium_expires_at) > new Date()
      : false;

    const { data: purchase } = await supabase
      .from('purchases')
      .select('product_id, expires_at')
      .eq('user_id', userProfile.id)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    return { 
      isPremium, 
      productId: purchase?.product_id, 
      expiresAt: purchase?.expires_at 
    };
  });

  fastify.post('/restore', async (request, reply) => {
    const { purchaseToken } = request.body;
    
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('purchase_token', purchaseToken)
      .single();
      
    if (purchaseError) return reply.code(400).send({ error: purchaseError.message });

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', request.user.id)
      .single();

    try {
      const receipt = await verifyWithGooglePlay(purchaseToken, purchase.product_id);
      
      const expiresAt = new Date(parseInt(receipt.expiryTimeMillis, 10)).toISOString();
      const isPremium = new Date(expiresAt) > new Date();

      await supabase
        .from('users')
        .update({ is_premium: isPremium, premium_expires_at: expiresAt })
        .eq('id', userProfile.id);

      return { success: true, isPremium, expiresAt };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });
}

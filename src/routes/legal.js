export default async function legalRoutes(fastify, _opts) {
  
  // GET /legal/terms
  // Returns dynamic User Agreement terms and conditions text
  fastify.get('/terms', async (request, reply) => {
    return reply.send({
      text: "1. Introduction\nWelcome to BhashaBridge! By accessing or using our service, you agree to be bound by these Terms of Service.\n\n2. User Accounts\nYou must create an account to access our South Indian language learning curriculum. You are responsible for keeping your login credentials confidential.\n\n3. Subscription & Payments\nCertain features (such as enhanced metrics, premium story panels, and larger streak freeze caps) require a premium subscription processed securely through Google Play Store billing.\n\n4. Streak Preservation\nFree users may hold up to 3 streak freezes, and premium users may hold up to 5. Freezes can be used manually to protect your streak after missing an activity day.\n\n5. Governing Law\nThese terms shall be governed by and construed in accordance with local regulations and user rights guidelines."
    });
  });
}

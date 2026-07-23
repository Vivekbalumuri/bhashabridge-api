export default async function configRoutes(fastify, _opts) {
  
  // GET /config
  // Returns global application configuration metadata
  fastify.get('/', async (request, reply) => {
    return reply.send({
      directions: [
        { slug: "te-en", from: "From", langs: "Telugu\n→ English", hint: "తెలుగు to English" },
        { slug: "ta-en", from: "From", langs: "Tamil\n→ English", hint: "தமிழ் to English" },
        { slug: "ml-en", from: "From", langs: "Malayalam\n→ English", hint: "മലയാളം to English" },
        { slug: "kn-en", from: "From", langs: "Kannada\n→ English", hint: "ಕನ್ನಡ to English" }
      ],
      language_directions: [
        { code: "te-en", label: "Telugu to English", source: "te", target: "en" },
        { code: "ta-en", label: "Tamil to English", source: "ta", target: "en" },
        { code: "ml-en", label: "Malayalam to English", source: "ml", target: "en" },
        { code: "kn-en", label: "Kannada to English", source: "kn", target: "en" }
      ],
      xp_milestones: {
        xp_per_level: 500,
        leagues: [
          { id: "bronze", name: "Bronze League", min_xp: 0 },
          { id: "silver", name: "Silver League", min_xp: 1000 },
          { id: "gold", name: "Gold League", min_xp: 3000 },
          { id: "diamond", name: "Diamond League", min_xp: 10000 }
        ]
      },
      global_settings: {
        daily_goal_options_min: [5, 10, 15, 30, 45],
        streak_freeze_caps: {
          free_user: 3,
          premium_user: 5
        }
      }
    });
  });
}

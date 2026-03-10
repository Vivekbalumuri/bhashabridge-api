import { supabase } from '../db.js';

export default async function wordsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/daily', async (request, reply) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Query daily_words table where show_date = today
    // 2. Join with words table to get full word data
    const { data: dailyWordMap, error: dailyError } = await supabase
      .from('daily_words')
      .select('*, words(*)')
      .eq('show_date', todayStr)
      .single();
      
    if (dailyWordMap && !dailyError) {
      return { word: dailyWordMap.words };
    }
    
    // 3. If no word for today, pick a random free word and insert it
    const { data: freeWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('tier', 'free');
      
    if (wordsError) return reply.code(400).send({ error: wordsError.message });
    if (!freeWords || freeWords.length === 0) return reply.code(404).send({ error: "No free words available" });
    
    const randomWord = freeWords[Math.floor(Math.random() * freeWords.length)];
    
    const { error: insertError } = await supabase
      .from('daily_words')
      .insert({ word_id: randomWord.id, show_date: todayStr });
      
    if (insertError) return reply.code(400).send({ error: insertError.message });
    
    return { word: randomWord };
  });

  fastify.get('/', async (request, reply) => {
    const { lesson_id, tier } = request.query;
    if (!lesson_id) return reply.code(400).send({ error: "lesson_id is required" });

    // 1. Fetch words where lesson_id matches
    let query = supabase.from('words').select('*').eq('lesson_id', lesson_id);
    if (tier) query = query.eq('tier', tier);

    const { data: words, error } = await query;
    if (error) return reply.code(400).send({ error: error.message });

    // 2. Filter premium words if user is not premium
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_premium')
      .eq('supabase_uid', request.user.id)
      .single();

    if (profileError) return reply.code(400).send({ error: profileError.message });

    const isPremium = userProfile?.is_premium;
    const finalWords = isPremium ? words : words.filter(w => w.tier !== 'premium');

    return { words: finalWords, total: finalWords.length };
  });

  fastify.get('/search', async (request, reply) => {
    const { q, lang } = request.query;
    if (!q) return reply.code(400).send({ error: "q is required" });

    let query = supabase.from('words').select('*');
    if (lang) {
      query = query.ilike(lang, `%${q}%`);
    } else {
      query = query.or(`tamil.ilike.%${q}%,telugu.ilike.%${q}%,english.ilike.%${q}%`);
    }

    const { data: words, error } = await query;
    if (error) return reply.code(400).send({ error: error.message });

    return { words };
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const { data: word, error } = await supabase.from('words').select('*').eq('id', id).single();
    
    if (error) return reply.code(400).send({ error: error.message });
    return { word };
  });
}

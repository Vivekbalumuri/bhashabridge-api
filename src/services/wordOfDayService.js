// src/services/wordOfDayService.js
// Returns a deterministic word of the day for a given direction.
// Same word shown to all users on the same UTC day for the same direction.
// Rotates through all free-tier words, cycling back when exhausted.

/**
 * getDailyWord(supabase, direction)
 * supabase — the client imported from db.js (NOT fastify.supabase)
 */
export async function getDailyWord(supabase, direction) {

  // ── 1. Get lesson IDs for this direction ─────────────────────────────────
  const lessonIds = await getLessonIdsForDirection(supabase, direction);
  if (!lessonIds.length) return getFallbackWord(supabase);

  // ── 2. Count free words for this direction ────────────────────────────────
  const { count, error: countErr } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'free')
    .in('lesson_id', lessonIds);

  if (countErr || !count) return getFallbackWord(supabase);

  // ── 3. Deterministic offset based on UTC date ─────────────────────────────
  const epoch  = new Date('2024-01-01T00:00:00Z').getTime();
  const today  = new Date();
  const utcDay = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - epoch)
    / 86_400_000
  );
  const offset = utcDay % count;

  // ── 4. Fetch the word at that offset ──────────────────────────────────────
  const { data: words, error: wordErr } = await supabase
    .from('words')
    .select('*')
    .eq('tier', 'free')
    .in('lesson_id', lessonIds)
    .order('id')           // stable sort so offset is consistent
    .range(offset, offset)
    .limit(1);

  if (wordErr || !words?.length) return getFallbackWord(supabase);

  return words[0];
}

async function getLessonIdsForDirection(supabase, direction) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id')
    .eq('direction', direction)
    .eq('is_premium', false);

  if (error || !data?.length) return [];
  return data.map(l => l.id);
}

async function getFallbackWord(supabase) {
  const { data } = await supabase
    .from('words')
    .select('*')
    .limit(1)
    .single();
  return data ?? null;
}
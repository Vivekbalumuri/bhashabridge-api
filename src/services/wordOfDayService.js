// src/services/wordOfDayService.js
// Returns a deterministic "word of the day" for a given direction.
// The same word is shown to all users on the same day for the same direction.
// Rotates through all free-tier words, cycling back when exhausted.

/**
 * getDailyWord(supabase, direction)
 * Returns one Word row. Never random — deterministic based on UTC date.
 */
export async function getDailyWord(supabase, direction) {

  // ── 1. Count all free words for this direction ────────────────────────────
  const { count, error: countErr } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'free')
    .in('lesson_id', await getLessonIdsForDirection(supabase, direction));

  if (countErr || !count) {
    // Fallback — return any word
    return getFallbackWord(supabase);
  }

  // ── 2. Deterministic offset based on UTC date ─────────────────────────────
  // epoch days since 2024-01-01 so offset cycles slowly
  const epoch   = new Date('2024-01-01T00:00:00Z').getTime();
  const today   = new Date();
  const utcDay  = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - epoch)
    / 86_400_000
  );
  const offset  = utcDay % count;

  // ── 3. Fetch the word at that offset ─────────────────────────────────────
  const { data: words, error: wordErr } = await supabase
    .from('words')
    .select('*')
    .eq('tier', 'free')
    .in('lesson_id', await getLessonIdsForDirection(supabase, direction))
    .order('id')           // stable sort so offset is consistent
    .range(offset, offset)
    .limit(1);

  if (wordErr || !words?.length) {
    return getFallbackWord(supabase);
  }

  return words[0];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
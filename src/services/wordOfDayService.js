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
  console.log(`[daily-word] direction=${direction} lessonIds=${JSON.stringify(lessonIds)}`);

  if (!lessonIds.length) {
    console.log(`[daily-word] no lessons found for direction=${direction}, trying fallback`);
    return getFallbackWord(supabase);
  }

  // ── 2. Count free words for this direction ────────────────────────────────
  const { count, error: countErr } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'free')
    .in('lesson_id', lessonIds);

  console.log(`[daily-word] count=${count} countErr=${JSON.stringify(countErr)}`);

  if (countErr) {
    console.log(`[daily-word] count query error: ${JSON.stringify(countErr)}, trying fallback`);
    return getFallbackWord(supabase);
  }

  // ── FIX: count can legitimately be 0 — treat separately from error ────────
  // The original code did `if (countErr || !count)` which also catches count=0
  // but also incorrectly falls through to fallback even when count is valid.
  // More importantly: Supabase count queries return count=null on RLS block,
  // not an error — so we must check for null explicitly.
  if (count === null || count === 0) {
    console.log(`[daily-word] count is ${count}, trying fallback`);
    return getFallbackWord(supabase);
  }

  // ── 3. Deterministic offset based on UTC date ─────────────────────────────
  const epoch  = new Date('2024-01-01T00:00:00Z').getTime();
  const today  = new Date();
  const utcDay = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - epoch)
    / 86_400_000
  );
  const offset = utcDay % count;
  console.log(`[daily-word] utcDay=${utcDay} count=${count} offset=${offset}`);

  // ── 4. Fetch the word at that offset ──────────────────────────────────────
  const { data: words, error: wordErr } = await supabase
    .from('words')
    .select('*')
    .eq('tier', 'free')
    .in('lesson_id', lessonIds)
    .order('id')           // stable sort so offset is consistent
    .range(offset, offset)
    .limit(1);

  console.log(`[daily-word] words=${JSON.stringify(words)} wordErr=${JSON.stringify(wordErr)}`);

  if (wordErr) {
    console.log(`[daily-word] word fetch error: ${JSON.stringify(wordErr)}, trying fallback`);
    return getFallbackWord(supabase);
  }

  if (!words?.length) {
    console.log(`[daily-word] no words returned for offset=${offset}, trying fallback`);
    return getFallbackWord(supabase);
  }

  console.log(`[daily-word] returning word id=${words[0].id}`);
  return words[0];
}

async function getLessonIdsForDirection(supabase, direction) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id')
    .eq('direction', direction)
    .eq('is_premium', false);

  console.log(`[daily-word] getLessonIds data=${JSON.stringify(data)} error=${JSON.stringify(error)}`);

  if (error || !data?.length) return [];
  return data.map(l => l.id);
}

async function getFallbackWord(supabase) {
  // FIX: .single() throws if 0 or >1 rows — use maybeSingle() instead which
  // returns null safely when no rows exist, and the first row when multiple exist.
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .limit(1)
    .maybeSingle();

  console.log(`[daily-word] fallback data=${JSON.stringify(data?.id)} error=${JSON.stringify(error)}`);
  return data ?? null;
}
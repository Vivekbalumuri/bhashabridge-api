// src/services/wordOfDayService.js
// Deterministic daily word(s) — same for all users on the same UTC day.

const DAILY_SET_SIZE = 10;

// ── Shared helpers ────────────────────────────────────────────────────────────

async function getLessonIdsForDirection(supabase, direction) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id')
    .eq('direction', direction)
    .eq('is_premium', false);

  if (error || !data?.length) return [];
  return data.map(l => l.id);
}

// UTC day index since epoch — same value for all users on the same calendar day
function utcDayIndex() {
  const epoch = new Date('2024-01-01T00:00:00Z').getTime();
  const today = new Date();
  return Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - epoch)
    / 86_400_000
  );
}

async function getFallbackWords(supabase, limit = 1) {
  const { data } = await supabase
    .from('words')
    .select('*')
    .limit(limit);
  return data ?? [];
}

// ── getDailyWord ──────────────────────────────────────────────────────────────
// Returns a single deterministic word for the day for the given direction.
export async function getDailyWord(supabase, direction) {
  const lessonIds = await getLessonIdsForDirection(supabase, direction);
  if (!lessonIds.length) {
    const fallback = await getFallbackWords(supabase, 1);
    return fallback[0] ?? null;
  }

  const { count, error: countErr } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'free')
    .in('lesson_id', lessonIds);

  if (countErr || count === null || count === 0) {
    const fallback = await getFallbackWords(supabase, 1);
    return fallback[0] ?? null;
  }

  const offset = utcDayIndex() % count;

  const { data: words, error: wordErr } = await supabase
    .from('words')
    .select('*')
    .eq('tier', 'free')
    .in('lesson_id', lessonIds)
    .order('id')
    .range(offset, offset)
    .limit(1);

  if (wordErr || !words?.length) {
    const fallback = await getFallbackWords(supabase, 1);
    return fallback[0] ?? null;
  }

  return words[0];
}

// ── getDailySet ───────────────────────────────────────────────────────────────
// Returns DAILY_SET_SIZE (10) deterministic words for the day.
// The set rotates daily — each day's offset moves forward by DAILY_SET_SIZE,
// cycling back to the start when all words have been shown.
export async function getDailySet(supabase, direction) {
  const lessonIds = await getLessonIdsForDirection(supabase, direction);
  if (!lessonIds.length) {
    return getFallbackWords(supabase, DAILY_SET_SIZE);
  }

  const { count, error: countErr } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'free')
    .in('lesson_id', lessonIds);

  if (countErr || count === null || count === 0) {
    return getFallbackWords(supabase, DAILY_SET_SIZE);
  }

  // Start index for today's set — advances by DAILY_SET_SIZE each day
  const dayIndex   = utcDayIndex();
  const startIndex = (dayIndex * DAILY_SET_SIZE) % count;
  const endIndex   = startIndex + DAILY_SET_SIZE - 1;

  if (endIndex < count) {
    // Simple case — set fits within bounds
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .eq('tier', 'free')
      .in('lesson_id', lessonIds)
      .order('id')
      .range(startIndex, endIndex);

    if (error || !words?.length) return getFallbackWords(supabase, DAILY_SET_SIZE);
    return words;
  } else {
    // Wrap-around case — fetch tail then head and concatenate
    const tail = count - startIndex;
    const head = DAILY_SET_SIZE - tail;

    const [r1, r2] = await Promise.all([
      supabase
        .from('words')
        .select('*')
        .eq('tier', 'free')
        .in('lesson_id', lessonIds)
        .order('id')
        .range(startIndex, count - 1),
      supabase
        .from('words')
        .select('*')
        .eq('tier', 'free')
        .in('lesson_id', lessonIds)
        .order('id')
        .range(0, head - 1),
    ]);

    const combined = [
      ...(r1.data ?? []),
      ...(r2.data ?? []),
    ];

    if (!combined.length) return getFallbackWords(supabase, DAILY_SET_SIZE);
    return combined;
  }
}
// src/services/leaderService.js
// Leaderboard logic — weekly XP rankings with current-user rank injection.

export async function getLeaderboard(supabase, currentUserId, limit = 50) {

  // ── 1. Pull top N users by total_xp from streaks ──────────────────────────
  const { data: rows, error } = await supabase
    .from('streaks')
    .select(`
      user_id,
      total_xp,
      current_streak,
      level,
      users (
        id,
        display_name,
        supabase_uid
      )
    `)
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // ── 2. Shape into leaderboard entries ─────────────────────────────────────
  const entries = rows
    .filter(r => r.users)       // skip orphaned streak rows
    .map((r, index) => ({
      user_id:        r.users.id,
      display_name:   r.users.display_name ?? 'Learner',
      total_xp:       r.total_xp       ?? 0,
      current_streak: r.current_streak  ?? 0,
      level:          r.level           ?? 1,
      rank:           index + 1,
      is_current_user: r.users.supabase_uid === currentUserId ||
                       r.users.id           === currentUserId,
    }));

  // ── 3. Find current user's rank (may be outside top N) ────────────────────
  let currentUserRank = null;
  const currentInList = entries.find(e => e.is_current_user);

  if (currentInList) {
    currentUserRank = currentInList.rank;
  } else if (currentUserId) {
    // User isn't in top N — find their actual rank
    const { count, error: rankErr } = await supabase
      .from('streaks')
      .select('user_id', { count: 'exact', head: true })
      .gt('total_xp', await getUserXp(supabase, currentUserId));

    if (!rankErr && count != null) {
      currentUserRank = count + 1;
    }
  }

  return { entries, currentUserRank };
}

// Helper — get a single user's total_xp
async function getUserXp(supabase, userId) {
  const { data } = await supabase
    .from('streaks')
    .select('total_xp')
    .or(`user_id.eq.${userId}`)
    .single();
  return data?.total_xp ?? 0;
}
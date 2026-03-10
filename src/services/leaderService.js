import { supabase } from '../db.js';

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
}

export async function addXp(userId, xpEarned) {
  const weekStart = getMonday(new Date());
  
  const { data: existing, error: fetchError } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();

  let weeklyXp = xpEarned;
  let rowId = null;

  if (existing) {
    weeklyXp += existing.weekly_xp;
    rowId = existing.id;
  }

  const upsertData = {
    user_id: userId,
    week_start: weekStart,
    weekly_xp: weeklyXp
  };
  
  if (rowId) upsertData.id = rowId;

  const { data, error } = await supabase
    .from('leaderboard')
    .upsert(upsertData, { onConflict: 'user_id, week_start' })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Error adding XP: ${error.message}`);
  }
  
  return data;
}

export async function recalcRanks() {
  const weekStart = getMonday(new Date());
  
  const { data: rows, error: fetchError } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('week_start', weekStart)
    .order('weekly_xp', { ascending: false });
    
  if (fetchError) {
    throw new Error(`Error fetching leaderboard: ${fetchError.message}`);
  }
  
  let updatedCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const rank = i + 1;
    if (rows[i].rank !== rank) {
      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({ rank })
        .eq('id', rows[i].id);
        
      if (!updateError) {
        updatedCount++;
      }
    }
  }
  
  return { updated: updatedCount };
}

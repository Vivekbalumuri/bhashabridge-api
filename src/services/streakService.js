import { supabase } from '../db.js';

export async function recordActivity(userId, xpEarned) {
  const { data: streakRow, error: fetchError } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Error fetching streak: ${fetchError.message}`);
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  let currentStreak = streakRow?.current_streak || 0;
  let longestStreak = streakRow?.longest_streak || 0;
  let totalXp = streakRow?.total_xp || 0;
  let lastActivityDate = streakRow?.last_activity_date;
  
  if (lastActivityDate === todayStr) {
    // no change
  } else if (lastActivityDate === yesterdayStr) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }
  
  totalXp += xpEarned;
  
  let level = 1;
  if (totalXp >= 6000) level = 5;
  else if (totalXp >= 3000) level = 4;
  else if (totalXp >= 1500) level = 3;
  else if (totalXp >= 500) level = 2;
  
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }
  
  const { data: updatedStreak, error: upsertError } = await supabase
    .from('streaks')
    .upsert({
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: todayStr,
      total_xp: totalXp,
      level: level,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()
    .single();
    
  if (upsertError) {
    throw new Error(`Error updating streak: ${upsertError.message}`);
  }
  
  return {
    currentStreak: updatedStreak.current_streak,
    longestStreak: updatedStreak.longest_streak,
    totalXp: updatedStreak.total_xp,
    level: updatedStreak.level
  };
}

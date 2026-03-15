// seed_all.js
// Usage:  node seed_all.js words_all.json
// Env:    SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase settings. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) in your .env.");
  console.error("Example .env:\nSUPABASE_URL=https://xyz.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const file = process.argv[2];
if (!file) {
  console.error("Usage: node seed_all.js <json_file>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
console.log(`\nDirections found: ${data.directions.length}`);

let totalLessons = 0;
let totalWords   = 0;
let totalErrors  = 0;

for (const dirBlock of data.directions) {
  const direction = dirBlock.direction;
  console.log(`\n── ${direction} (${dirBlock.lessons.length} lessons) ──`);

  for (const lesson of dirBlock.lessons) {

    // ── 1. Insert lesson ────────────────────────────────
    const { data: lessonRow, error: lessonErr } = await supabase
      .from("lessons")
      .insert({
        direction,
        title:        lesson.title,
        description:  lesson.description,
        module_order: lesson.module_order,
        order_index:  lesson.module_order,
        skill_type:   lesson.skill_type,
        is_premium:   lesson.is_premium,
        tier:         lesson.tier,
        xp_reward:    lesson.xp_reward,
        word_count:   lesson.word_count,
      })
      .select("id")
      .single();

    if (lessonErr) {
      console.error(`  ✗ [${direction}] "${lesson.title}":`, lessonErr.message);
      totalErrors++;
      continue;
    }

    const lessonId = lessonRow.id;
    totalLessons++;

    // ── 2. Insert words ─────────────────────────────────
    const wordRows = lesson.words.map((w) => ({
      lesson_id:          lessonId,
      english:            w.english,
      telugu:             w.telugu,
      tamil:              w.tamil,
      malayalam:          w.malayalam          ?? "",
      translit_telugu:    w.translit_telugu    ?? null,
      translit_tamil:     w.translit_tamil     ?? null,
      translit_malayalam: w.translit_malayalam ?? null,
      category:           w.category,
      difficulty:         w.difficulty,
      tier:               w.tier,
      sort_order:         w.sort_order,
      dravidian_note:     w.dravidian_note     ?? null,
    }));

    const { error: wordErr } = await supabase.from("words").insert(wordRows);

    if (wordErr) {
      console.error(`    ✗ words for "${lesson.title}":`, wordErr.message);
      totalErrors++;
    } else {
      totalWords += wordRows.length;
      console.log(`  ✓ "${lesson.title}" → ${lessonId} (${wordRows.length} words)`);
    }
  }
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Lessons inserted : ${totalLessons}`);
console.log(`Words inserted   : ${totalWords}`);
console.log(`Errors           : ${totalErrors}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
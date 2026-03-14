// seed_words.js
// Usage:
//   1. Run the prompt in Claude, save the JSON output to words_output.json
//   2. Run: node seed_words.js
//
// Requires: @supabase/supabase-js, dotenv
// Install:  npm install @supabase/supabase-js dotenv

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!process.env.SUPABASE_URL || !supabaseKey) {
  console.error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).');
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey
);

// ── Config ────────────────────────────────────────────────
// Map category → lesson title, difficulty → which lessons to assign words to
// Words will be assigned to ALL lesson directions for the matching category

const CATEGORY_TO_LESSON_TITLE = {
  greetings:   'Basic Greetings',
  numbers:     'Numbers',
  colors:      'Colors',
  family:      'Family',
  food:        'Food & Drink',
  body:        'Body Parts',
  animals:     'Animals',
  days:        'Days & Time',
  months:      'Months',
  home:        'Home',
  transport:   'Transport',
  clothes:     'Clothes',
  school:      'School',
  work:        'Work',
  health:      'Health',
  nature:      'Nature',
  emotions:    'Emotions',
  verbs:       'Verbs',
  adjectives:  'Adjectives',
  shopping:    'Shopping',
  directions:  'Directions',
  festivals:   'Festivals',
  phrases:     'Phrases',
  weather:     'Weather',
};

const ALL_DIRECTIONS = [
  'te-en','en-te','ta-en','en-ta','te-ta','ta-te',
  'ml-en','en-ml','ml-te','te-ml','ml-ta','ta-ml'
];

async function seed() {
  // Load Claude output
  const raw = readFileSync('./words_output.json', 'utf8');
  const words = JSON.parse(raw);
  console.log(`Loaded ${words.length} words`);

  // Fetch all lessons so we can map category → lesson_id per direction
  const { data: lessons, error: lErr } = await supabase
    .from('lessons')
    .select('id, direction, title');
  if (lErr) { console.error('Failed to fetch lessons:', lErr.message); process.exit(1); }

  // Build lookup: direction + category → lesson_id
  const lessonMap = {};
  for (const lesson of lessons) {
    const titleLower = lesson.title.toLowerCase();
    for (const [cat, titleMatch] of Object.entries(CATEGORY_TO_LESSON_TITLE)) {
      if (titleLower.includes(titleMatch.toLowerCase().split(' ')[0])) {
        const key = `${lesson.direction}::${cat}`;
        lessonMap[key] = lesson.id;
      }
    }
  }

  // Build rows — one word row per direction
  const rows = [];
  for (const word of words) {
    for (const direction of ALL_DIRECTIONS) {
      const key = `${direction}::${word.category}`;
      const lessonId = lessonMap[key];
      if (!lessonId) continue; // skip if no lesson exists for this direction+category

      rows.push({
        lesson_id:          lessonId,
        english:            word.english,
        telugu:             word.telugu,
        tamil:              word.tamil,
        malayalam:          word.malayalam,
        translit_telugu:    word.translit_telugu,
        translit_tamil:     word.translit_tamil,
        translit_malayalam: word.translit_malayalam,
        category:           word.category,
        difficulty:         word.difficulty,
        dravidian_note:     word.dravidian_note || null,
      });
    }
  }

  console.log(`Inserting ${rows.length} word rows across all directions...`);

  // Batch insert in chunks of 500
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('words').upsert(chunk, {
      onConflict: 'lesson_id,english',
      ignoreDuplicates: true,
    });
    if (error) {
      console.error(`Chunk ${i}–${i+CHUNK} failed:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`  Inserted ${inserted}/${rows.length}`);
    }
  }

  console.log('Done!');
}

seed().catch(console.error);
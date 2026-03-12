import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const wordBank = {
  greetings: [
    { tamil: 'வணக்கம்',          telugu: 'నమస్కారం',         english: 'Hello / Greetings',    translit_tamil: 'Vaṇakkam',          translit_telugu: 'Namaskāraṁ',      category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'நன்றி',            telugu: 'ధన్యవాదాలు',       english: 'Thank you',             translit_tamil: 'Naṉṟi',             translit_telugu: 'Dhanyavādālu',    category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'மன்னிக்கவும்',      telugu: 'క్షమించండి',       english: 'Sorry / Excuse me',     translit_tamil: 'Maṉṉikkavum',       translit_telugu: 'Kṣamincaṇḍi',    category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஆம்',              telugu: 'అవును',            english: 'Yes',                   translit_tamil: 'Ām',                translit_telugu: 'Avunu',           category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'இல்லை',            telugu: 'కాదు',             english: 'No',                    translit_tamil: 'Illai',             translit_telugu: 'Kādu',            category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'எப்படி இருக்கீங்க', telugu: 'మీరు ఎలా ఉన్నారు', english: 'How are you?',          translit_tamil: 'Eppaṭi irukkīṅka', translit_telugu: 'Mīru elā unnāru', category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'நல்லா இருக்கேன்',   telugu: 'నేను బాగున్నాను',  english: 'I am fine',             translit_tamil: 'Nallā irukkēṉ',    translit_telugu: 'Nēnu bāgunnānu', category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பெயர் என்ன',        telugu: 'పేరు ఏమిటి',       english: 'What is your name?',    translit_tamil: 'Peyar eṉṉa',       translit_telugu: 'Pēru ēmiṭi',     category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'விடைபெறுகிறேன்',    telugu: 'వీడ్కోలు',         english: 'Goodbye',               translit_tamil: 'Viṭaipeṟukiṟēṉ',  translit_telugu: 'Vīḍkōlu',        category: 'greetings', difficulty: 'beginner', tier: 'free' },
    { tamil: 'வாருங்கள்',         telugu: 'రండి',             english: 'Please come / Welcome', translit_tamil: 'Vāruṅkaḷ',         translit_telugu: 'Raṇḍi',          category: 'greetings', difficulty: 'beginner', tier: 'free' },
  ],
  numbers: [
    { tamil: 'ஒன்று',  telugu: 'ఒకటి',    english: 'One',   translit_tamil: 'Oṉṟu',   translit_telugu: 'Okaṭi',   category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'இரண்டு', telugu: 'రెండు',    english: 'Two',   translit_tamil: 'Iraṇṭu', translit_telugu: 'Reṇḍu',   category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'மூன்று', telugu: 'మూడు',     english: 'Three', translit_tamil: 'Mūṉṟu',  translit_telugu: 'Mūḍu',    category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'நான்கு', telugu: 'నాలుగు',   english: 'Four',  translit_tamil: 'Nāṉku',  translit_telugu: 'Nālugu',  category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஐந்து',  telugu: 'ఐదు',     english: 'Five',  translit_tamil: 'Aintu',   translit_telugu: 'Aidu',    category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஆறு',    telugu: 'ఆరు',     english: 'Six',   translit_tamil: 'Āṟu',    translit_telugu: 'Āru',     category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஏழு',    telugu: 'ఏడు',     english: 'Seven', translit_tamil: 'Ēḻu',    translit_telugu: 'Ēḍu',     category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'எட்டு',  telugu: 'ఎనిమిది',  english: 'Eight', translit_tamil: 'Eṭṭu',   translit_telugu: 'Enimidi', category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஒன்பது', telugu: 'తొమ్మిది', english: 'Nine',  translit_tamil: 'Oṉpatu', translit_telugu: 'Tommidi', category: 'numbers', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பத்து',  telugu: 'పది',      english: 'Ten',   translit_tamil: 'Pattu',   translit_telugu: 'Padi',    category: 'numbers', difficulty: 'beginner', tier: 'free' },
  ],
  food: [
    { tamil: 'சாதம்',    telugu: 'అన్నం',      english: 'Rice',       translit_tamil: 'Cātam',    translit_telugu: 'Annaṁ',      category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'தண்ணீர்',  telugu: 'నీళ్ళు',     english: 'Water',      translit_tamil: 'Taṇṇīr',  translit_telugu: 'Nīḷḷu',      category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பால்',     telugu: 'పాలు',       english: 'Milk',       translit_tamil: 'Pāl',      translit_telugu: 'Pālu',       category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'இட்லி',    telugu: 'ఇడ్లీ',      english: 'Idli',       translit_tamil: 'Iṭli',     translit_telugu: 'Iḍlī',       category: 'food', difficulty: 'beginner', tier: 'free', dravidian_note: 'Popular breakfast dish across South India' },
    { tamil: 'தோசை',     telugu: 'దోసె',       english: 'Dosa',       translit_tamil: 'Tōcai',    translit_telugu: 'Dōse',       category: 'food', difficulty: 'beginner', tier: 'free', dravidian_note: 'Crispy fermented crepe — Dravidian staple' },
    { tamil: 'சாம்பார்', telugu: 'సాంబారు',    english: 'Sambar',     translit_tamil: 'Cāmbār',   translit_telugu: 'Sāmbāru',    category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பழம்',     telugu: 'పండు',       english: 'Fruit',      translit_tamil: 'Paḻam',    translit_telugu: 'Paṇḍu',      category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'காய்கறி',  telugu: 'కూరగాయలు',   english: 'Vegetables', translit_tamil: 'Kāykaṟi',  translit_telugu: 'Kūragāyalu', category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'இனிப்பு',  telugu: 'స్వీట్',     english: 'Sweet',      translit_tamil: 'Iṉippu',   translit_telugu: 'Svīṭ',       category: 'food', difficulty: 'beginner', tier: 'free' },
    { tamil: 'காபி',     telugu: 'కాఫీ',       english: 'Coffee',     translit_tamil: 'Kāpi',     translit_telugu: 'Kāphī',      category: 'food', difficulty: 'beginner', tier: 'free' },
  ],
  family: [
    { tamil: 'அம்மா',  telugu: 'అమ్మ',     english: 'Mother',         translit_tamil: 'Ammā',    translit_telugu: 'Amma',    category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'அப்பா',  telugu: 'నాన్న',    english: 'Father',         translit_tamil: 'Appā',    translit_telugu: 'Nānna',   category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'அண்ணன்', telugu: 'అన్న',     english: 'Elder brother',  translit_tamil: 'Aṇṇaṉ',  translit_telugu: 'Anna',    category: 'family', difficulty: 'beginner', tier: 'free', dravidian_note: 'Dravidian languages distinguish elder/younger siblings' },
    { tamil: 'தங்கை',  telugu: 'చెల్లి',   english: 'Younger sister', translit_tamil: 'Taṅkai',  translit_telugu: 'Celli',   category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'தாத்தா', telugu: 'తాత',      english: 'Grandfather',    translit_tamil: 'Tāttā',   translit_telugu: 'Tāta',    category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பாட்டி', telugu: 'అమ్మమ్మ', english: 'Grandmother',    translit_tamil: 'Pāṭṭi',   translit_telugu: 'Ammamma', category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'மகன்',   telugu: 'కొడుకు',   english: 'Son',            translit_tamil: 'Makaṉ',   translit_telugu: 'Koḍuku',  category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'மகள்',   telugu: 'కూతురు',   english: 'Daughter',       translit_tamil: 'Makaḷ',   translit_telugu: 'Kūturu',  category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'கணவன்',  telugu: 'భర్త',     english: 'Husband',        translit_tamil: 'Kaṇavaṉ', translit_telugu: 'Bharta',  category: 'family', difficulty: 'beginner', tier: 'free' },
    { tamil: 'மனைவி',  telugu: 'భార్య',    english: 'Wife',           translit_tamil: 'Maṉaivi', translit_telugu: 'Bhārya',  category: 'family', difficulty: 'beginner', tier: 'free' },
  ],
  colors: [
    { tamil: 'சிவப்பு',     telugu: 'ఎరుపు',  english: 'Red',    translit_tamil: 'Civappu',      translit_telugu: 'Erupu',   category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'நீலம்',       telugu: 'నీలం',   english: 'Blue',   translit_tamil: 'Nīlam',        translit_telugu: 'Nīlaṁ',  category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பச்சை',       telugu: 'పచ్చ',   english: 'Green',  translit_tamil: 'Paccai',       translit_telugu: 'Pacca',   category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'மஞ்சள்',      telugu: 'పసుపు',  english: 'Yellow', translit_tamil: 'Mañcaḷ',       translit_telugu: 'Pasuppu', category: 'colors', difficulty: 'beginner', tier: 'free', dravidian_note: 'Also means turmeric in both languages' },
    { tamil: 'வெள்ளை',      telugu: 'తెలుపు', english: 'White',  translit_tamil: 'Veḷḷai',       translit_telugu: 'Telupu',  category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'கருப்பு',     telugu: 'నలుపు',  english: 'Black',  translit_tamil: 'Karruppu',     translit_telugu: 'Nalupu',  category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஆரஞ்சு',      telugu: 'నారింజ', english: 'Orange', translit_tamil: 'Āraññu',       translit_telugu: 'Nāriñja', category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'இளஞ்சிவப்பு', telugu: 'గులాబీ', english: 'Pink',   translit_tamil: 'Iḷañcivappu', translit_telugu: 'Gulābī',  category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'பழுப்பு',     telugu: 'గోధుమ',  english: 'Brown',  translit_tamil: 'Paḻuppu',      translit_telugu: 'Gōdhuma', category: 'colors', difficulty: 'beginner', tier: 'free' },
    { tamil: 'ஊதா',         telugu: 'ఊదా',    english: 'Purple', translit_tamil: 'Ūtā',          translit_telugu: 'Ūdā',     category: 'colors', difficulty: 'beginner', tier: 'free' },
  ],
};

const DIRECTIONS = ['te-en', 'en-te', 'ta-en', 'en-ta', 'te-ta', 'ta-te'];

const LESSON_META = [
  { key: 'greetings', title: 'Greetings', description: 'Common greetings and polite expressions used in everyday conversation.',         skill_type: 'vocabulary', is_premium: false },
  { key: 'numbers',   title: 'Numbers',   description: 'Count from one to ten and use numbers in basic sentences.',                      skill_type: 'vocabulary', is_premium: false },
  { key: 'food',      title: 'Food',      description: 'Essential food vocabulary including traditional South Indian dishes and drinks.', skill_type: 'vocabulary', is_premium: false },
  { key: 'family',    title: 'Family',    description: 'Family relationship terms with Dravidian kinship distinctions explained.',        skill_type: 'vocabulary', is_premium: false },
  { key: 'colors',    title: 'Colors',    description: 'Learn color names and their cultural significance across Telugu and Tamil.',      skill_type: 'vocabulary', is_premium: true  },
];

function directionLabel(direction) {
  const map = { te: 'Telugu', en: 'English', ta: 'Tamil' };
  const [from, to] = direction.split('-');
  return `${map[from]} → ${map[to]}`;
}

async function seed() {
  console.log('\n🌱  BhashaBridge — Database Seed\n' + '─'.repeat(50));

  let totalLessons = 0, totalWords = 0, errors = 0;

  for (const direction of DIRECTIONS) {
    console.log(`\n📂  Direction: ${directionLabel(direction)} (${direction})`);

    for (let i = 0; i < LESSON_META.length; i++) {
      const meta  = LESSON_META[i];
      const words = wordBank[meta.key];
      const label = `[${direction}] ${meta.title}`;

      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          title:       `${meta.title} (${directionLabel(direction)})`,
          description: meta.description,
          direction,
          module_order: i + 1,
          is_premium:  meta.is_premium,
          skill_type:  meta.skill_type,
          word_count:  words.length,
        })
        .select('id')
        .single();

      if (lessonError) {
        console.error(`  ✗  ${label} — lesson failed: ${lessonError.message}`);
        errors++;
        continue;
      }

      const { error: wordError } = await supabase
        .from('words')
        .insert(
          words.map((w, idx) => ({
            tamil:           w.tamil,
            telugu:          w.telugu,
            english:         w.english,
            translit_tamil:  w.translit_tamil,
            translit_telugu: w.translit_telugu,
            category:        w.category,
            difficulty:      w.difficulty,
            tier:            w.tier,
            skill_type:      meta.skill_type,
            lesson_id:       lessonData.id,
            sort_order:      idx + 1,
            dravidian_note:  w.dravidian_note || null,
          }))
        );

      if (wordError) {
        console.error(`  ✗  ${label} — words failed: ${wordError.message}`);
        errors++;
        continue;
      }

      console.log(`  ✓  ${label} — ${words.length} words  (id: ${lessonData.id})`);
      totalLessons++;
      totalWords += words.length;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅  Done — ${totalLessons}/30 lessons, ${totalWords} words${errors ? `, ${errors} errors` : ''}\n`);
}

seed().catch(err => {
  console.error('\n💥  Fatal:', err.message);
  process.exit(1);
});
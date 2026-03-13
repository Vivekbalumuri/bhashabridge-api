/**
 * BhashaBridge — Full Curriculum Seed Script
 * seed_full.js
 *
 * Curriculum Architecture (Speaking-First, 5-Level Roadmap):
 *   Level 1 — The Commander      (Imperatives / Commands)
 *   Level 2 — The Pointer        (Demonstratives & Nouns)
 *   Level 3 — The Sticker Master (Case Endings / Suffixes)
 *   Level 4 — The Time Traveler  (Tenses)
 *   Level 5 — The Socialite      (Pronouns & Politeness)
 *   Cultural Packs               (Auto-rickshaw, Family, Dining, Refusal)
 *
 * Directions: te-en, en-te, ta-en, en-ta, te-ta, ta-te
 *
 * Usage:
 *   npm install @supabase/supabase-js dotenv
 *   node seed_full.js
 *
 * Env vars required:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=your-service-role-key
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── DIRECTIONS ─────────────────────────────────────────────────────────────
const DIRECTIONS = ["te-en", "en-te", "ta-en", "en-ta", "te-ta", "ta-te"];

// ─── CURRICULUM DATA ─────────────────────────────────────────────────────────
const CURRICULUM = [

  // ══════════════════════════════════════════════════════════════════════════
  // PHONETICS FIRST (module_order: 5)
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Phonetics: Sounds That Don't Exist in English",
    module_order: 5,
    is_premium: false,
    skill_type: "phonetics",
    words: [
      {
        english: "Dental 't' — Tooth",
        tamil: "பல்",
        telugu: "పన్ను",
        translit_tamil: "Pal",
        translit_telugu: "Pannu",
        dravidian_note: "Dental 't/d' — tongue touches the back of upper teeth (like French 't'). NOT like English 't'. This is the soft t. Tamil script has separate symbols for dental vs retroflex.",
        sort_order: 1,
      },
      {
        english: "Retroflex 'T' — Stone",
        tamil: "கல்",
        telugu: "రాయి",
        translit_tamil: "Kal",
        translit_telugu: "Raayi",
        dravidian_note: "Retroflex — tongue curls BACK to touch the roof of mouth. South Indian languages have: ṭ, ḍ, ṇ, ḷ, ṟ as retroflex consonants. English speakers must train this muscle memory.",
        sort_order: 2,
      },
      {
        english: "Tamil 'zh' — Way",
        tamil: "வழி",
        telugu: "N/A",
        translit_tamil: "Vazhi",
        translit_telugu: "—",
        dravidian_note: "The Tamil 'ழ' (zh) is unique — a retroflex lateral approximant. Tongue curls back, sides touch molars. Exists only in Tamil. 'Tamil' itself contains this sound: 'Tamiழ'.",
        sort_order: 3,
      },
      {
        english: "Long vowel — Love (vs Sea)",
        tamil: "காதல் (vs கடல்)",
        telugu: "కాలం (vs కలం)",
        translit_tamil: "Kaadhal (vs Kadal)",
        translit_telugu: "Kaalam (vs Kalam)",
        dravidian_note: "Vowel length is MEANINGFUL. 'Kadal' = sea. 'Kaadhal' = love. One extra vowel length = completely different word. Both languages have 5 short + 5 long vowels.",
        sort_order: 4,
      },
      {
        english: "Song (same word, two scripts)",
        tamil: "பாட்டு",
        telugu: "పాట",
        translit_tamil: "Paattu",
        translit_telugu: "Paata",
        dravidian_note: "South Indian 'p' is always between English p and b — unaspirated. Unlike Hindi, aspiration does not change word meaning in Tamil/Telugu. Don't stress over this — comprehension comes first.",
        sort_order: 5,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 1 — THE COMMANDER (Imperatives)
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Level 1: Basic Commands",
    module_order: 10,
    is_premium: false,
    skill_type: "vocabulary",
    words: [
      {
        english: "Come",
        tamil: "வா",
        telugu: "రా",
        translit_tamil: "Vaa",
        translit_telugu: "Raa",
        dravidian_note: "Bare imperative root — shortest, most powerful form. Use for equals/younger. 'Vaango' (Tamil) / 'Raandi' (Telugu) for elders. The -nga/-ndi suffix adds instant respect.",
        sort_order: 1,
      },
      {
        english: "Go",
        tamil: "போ",
        telugu: "వెళ్ళు",
        translit_tamil: "Po",
        translit_telugu: "Vellu",
        dravidian_note: "Informal command. To an elder: 'Ponga' (Tamil) / 'Vellandi' (Telugu). The -nga/-ndi suffix is your politeness switch for ALL commands — learn it once, apply everywhere.",
        sort_order: 2,
      },
      {
        english: "Give (me)",
        tamil: "கொடு",
        telugu: "ఇవ్వు",
        translit_tamil: "Kodu",
        translit_telugu: "Ivvu",
        dravidian_note: "Everyday command — essential for markets, restaurants. Respectful: 'Kodunga' / 'Ivvaandi'. Often combined: 'Inga kodu' = 'Give here'. Tamil 'kodu', Telugu 'ivvu' — different roots.",
        sort_order: 3,
      },
      {
        english: "Take",
        tamil: "எடு",
        telugu: "తీసుకో",
        translit_tamil: "Edu",
        translit_telugu: "Teesu ko",
        dravidian_note: "Telugu uses a compound: Teesu (take) + ko (for yourself). This reflexive 'ko' pattern is a key Telugu feature — it implies the action benefits the subject.",
        sort_order: 4,
      },
      {
        english: "Wait",
        tamil: "நில்லு",
        telugu: "ఆగు",
        translit_tamil: "Nillu",
        translit_telugu: "Aagu",
        dravidian_note: "Critical for auto-rickshaw haggling! Tamil 'Nillu' = stop/wait. Telugu 'Aagu' = stop. Different roots, same urgent need. Say firmly — drivers respond to confident commands.",
        sort_order: 5,
      },
      {
        english: "Stop",
        tamil: "நிறுத்து",
        telugu: "ఆపు",
        translit_tamil: "Niruttu",
        translit_telugu: "Aapu",
        dravidian_note: "More emphatic than wait. Use with drivers. Retroflex 'tt' in Tamil 'Niruttu' — tongue curls back. This retroflex distinction is why South Indian languages sound distinctive.",
        sort_order: 6,
      },
      {
        english: "Look / See",
        tamil: "பாரு",
        telugu: "చూడు",
        translit_tamil: "Paaru",
        translit_telugu: "Chuudu",
        dravidian_note: "COLLOQUIAL: Formal Tamil is 'Paarkka'. Spoken is 'Paaru'. Always teach spoken first — this is BhashaBridge's core principle. Telugu 'Chuudu' is already the colloquial form.",
        sort_order: 7,
      },
      {
        english: "Listen",
        tamil: "கேளு",
        telugu: "వినండి",
        translit_tamil: "Keelu",
        translit_telugu: "Vinandi",
        dravidian_note: "Tamil 'Keelu' is informal. Telugu 'Vinandi' already has polite -ndi. Both from Dravidian root meaning 'to hear'. Telugu version is already respectful — good default.",
        sort_order: 8,
      },
    ],
  },

  {
    title: "Level 1: Commands at a Shop",
    module_order: 11,
    is_premium: false,
    skill_type: "phrases",
    words: [
      {
        english: "Show me",
        tamil: "காட்டு",
        telugu: "చూపించు",
        translit_tamil: "Kaattu",
        translit_telugu: "Choopinchu",
        dravidian_note: "Double retroflex in Tamil 'Kaattu' — both the long 'aa' vowel and the 'tt' matter. Shortening either changes the word completely.",
        sort_order: 1,
      },
      {
        english: "How much?",
        tamil: "எவ்வளவு?",
        telugu: "ఎంత?",
        translit_tamil: "Evvalavu?",
        translit_telugu: "Enta?",
        dravidian_note: "The most important phrase in any market. Both start with 'E' — Dravidian question words share this E- prefix pattern (Enga, Enna, Ethu in Tamil; Ekkada, Enta, Evaru in Telugu).",
        sort_order: 2,
      },
      {
        english: "Reduce the price",
        tamil: "கம்மி பண்ணு",
        telugu: "తగ్గించు",
        translit_tamil: "Kammi pannu",
        translit_telugu: "Tagginchu",
        dravidian_note: "Tamil uses 'kammi' (less) + 'pannu' (do/make). The 'pannu' pattern makes a verb from any noun or adjective — extremely productive in spoken Tamil. 'Kammi pannu' = 'make it less'.",
        sort_order: 3,
      },
      {
        english: "Wrap it up",
        tamil: "கட்டு",
        telugu: "కట్టు",
        translit_tamil: "Kattu",
        translit_telugu: "Kattu",
        dravidian_note: "Rare case: both Tamil and Telugu share the SAME word and spelling! 'Kattu' means tie/wrap in both. Clear evidence of shared Dravidian ancestry.",
        sort_order: 4,
      },
      {
        english: "Give a bag",
        tamil: "கவர் கொடு",
        telugu: "సంచి ఇవ్వు",
        translit_tamil: "Kavar kodu",
        translit_telugu: "Sanchi ivvu",
        dravidian_note: "Tamil 'kavar' comes from English 'cover' — South Indian English loanwords are essential spoken vocabulary. Telugu 'sanchi' is the native Dravidian word for bag.",
        sort_order: 5,
      },
    ],
  },

  {
    title: "Level 1: Commands — Transport & Travel",
    module_order: 12,
    is_premium: false,
    skill_type: "phrases",
    words: [
      {
        english: "Turn left",
        tamil: "இடது பக்கம் திரும்பு",
        telugu: "ఎడమ వైపు తిరుగు",
        translit_tamil: "Idadu pakkam thirumbu",
        translit_telugu: "Edama vaipu tirugu",
        dravidian_note: "Left = 'Idadu' (Tamil) / 'Edama' (Telugu). Both from Dravidian root meaning left side. The shared ancestry is visible even when the spoken forms differ.",
        sort_order: 1,
      },
      {
        english: "Turn right",
        tamil: "வலது பக்கம் திரும்பு",
        telugu: "కుడి వైపు తిరుగు",
        translit_tamil: "Valadu pakkam thirumbu",
        translit_telugu: "Kudi vaipu tirugu",
        dravidian_note: "Right = 'Valadu' (Tamil) / 'Kudi' (Telugu). Different Dravidian roots for right vs left — memorize as a contrasting pair.",
        sort_order: 2,
      },
      {
        english: "Go straight",
        tamil: "நேரே போ",
        telugu: "నేరుగా వెళ్ళు",
        translit_tamil: "Neere po",
        translit_telugu: "Neerugaa vellu",
        dravidian_note: "'Neeru/Neeruga' = straight/direct in both. One of the clearest shared Dravidian words. The -gaa suffix in Telugu marks adverbs (like English -ly).",
        sort_order: 3,
      },
      {
        english: "Stop here",
        tamil: "இங்க நிறுத்து",
        telugu: "ఇక్కడ ఆపు",
        translit_tamil: "Inga niruttu",
        translit_telugu: "Ikkada aapu",
        dravidian_note: "Combining Level 1 command with Level 2 location word. Tamil 'Inga' (here) and Telugu 'Ikkada' (here) — preview of the I-/A-/E- demonstrative system coming in Level 2.",
        sort_order: 4,
      },
      {
        english: "Faster",
        tamil: "வேகமா போ",
        telugu: "వేగంగా వెళ్ళు",
        translit_tamil: "Vegamaa po",
        translit_telugu: "Vegangaa vellu",
        dravidian_note: "'Vegam' = speed in BOTH languages — identical word! Tamil and Telugu share this. The -maa (Tamil) and -ngaa (Telugu) turn nouns into adverbs. 'Speed-fully go!'",
        sort_order: 5,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 2 — THE POINTER (Demonstratives & Nouns)
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Level 2: This, That, Here, There",
    module_order: 20,
    is_premium: false,
    skill_type: "vocabulary",
    words: [
      {
        english: "This (thing near me)",
        tamil: "இது",
        telugu: "ఇది",
        translit_tamil: "Idhu",
        translit_telugu: "Idi",
        dravidian_note: "Near demonstrative. The I- prefix marks nearness in both languages consistently: Idhu/Idi (this), Inga/Ikkada (here), Ivan/Veede (this person). Master the I-/A-/E- system!",
        sort_order: 1,
      },
      {
        english: "That (thing far from me)",
        tamil: "அது",
        telugu: "అది",
        translit_tamil: "Adhu",
        translit_telugu: "Adi",
        dravidian_note: "Far demonstrative. A- prefix = far in both. Adhu/Adi (that), Anga/Akkada (there), Avan/Vaadu (that person). The two-vowel system I-/A- is one of Dravidian's most elegant features.",
        sort_order: 2,
      },
      {
        english: "This person — informal male",
        tamil: "இவன்",
        telugu: "వీడు",
        translit_tamil: "Ivan",
        translit_telugu: "Veedu",
        dravidian_note: "Use for a boy/man nearby. Slightly disrespectful if overused for elders. Tamil keeps I- prefix; Telugu uses V- (derived from same root). Social context matters more than grammar here.",
        sort_order: 3,
      },
      {
        english: "That person — informal male",
        tamil: "அவன்",
        telugu: "వాడు",
        translit_tamil: "Avan",
        translit_telugu: "Vaadu",
        dravidian_note: "Far informal male. Use for males younger/equal to you. Saying 'Avan/Vaadu' about an elder is rude. Social context rules: always check age/status before choosing a pronoun.",
        sort_order: 4,
      },
      {
        english: "This person — respectful",
        tamil: "இவங்க",
        telugu: "ఇతను / వీరు",
        translit_tamil: "Ivanga",
        translit_telugu: "Ithanu / Veeru",
        dravidian_note: "Colloquial respectful. Tamil 'Ivanga' (spoken) vs formal 'Ivar'. Telugu 'Veeru' is very formal. When in doubt, use the respectful form — it's never wrong.",
        sort_order: 5,
      },
      {
        english: "Here",
        tamil: "இங்க",
        telugu: "ఇక్కడ",
        translit_tamil: "Inga",
        translit_telugu: "Ikkada",
        dravidian_note: "Spoken Tamil 'Inga' (formal: 'Ingae'). Telugu 'Ikkada'. Both from I- (near) root. Used constantly for giving directions and pointing things out.",
        sort_order: 6,
      },
      {
        english: "There",
        tamil: "அங்க",
        telugu: "అక్కడ",
        translit_tamil: "Anga",
        translit_telugu: "Akkada",
        dravidian_note: "Spoken Tamil 'Anga' (formal: 'Angae'). Telugu 'Akkada'. The -k/-kk intensifier in Telugu is characteristic. Notice how -k- marks the location suffix in both.",
        sort_order: 7,
      },
      {
        english: "Which? (question demonstrative)",
        tamil: "எது?",
        telugu: "ఏది?",
        translit_tamil: "Edhu?",
        translit_telugu: "Eedi?",
        dravidian_note: "This completes the 3-way system: I- (near), A- (far), E- (question). 'Edhu/Eedi' = which one? Master these three rows and half of Dravidian demonstratives click into place.",
        sort_order: 8,
      },
    ],
  },

  {
    title: "Level 2: Question Words — The 5 Ws",
    module_order: 21,
    is_premium: false,
    skill_type: "vocabulary",
    words: [
      {
        english: "What?",
        tamil: "என்ன?",
        telugu: "ఏమిటి?",
        translit_tamil: "Enna?",
        translit_telugu: "Eemiti?",
        dravidian_note: "Tamil 'Enna' starts with E- (question prefix). Telugu 'Eemiti' also starts with Ee-. In spoken Telugu, often shortened to just 'Em?'. The E- pattern links all question words.",
        sort_order: 1,
      },
      {
        english: "Where?",
        tamil: "எங்க?",
        telugu: "ఎక్కడ?",
        translit_tamil: "Enga?",
        translit_telugu: "Ekkada?",
        dravidian_note: "Tamil 'Enga' = 'Inga' (here) with E- question prefix! Telugu 'Ekkada' mirrors 'Ikkada' (here) with E-. The system: I- here, A- there, E- where? It's elegant and logical.",
        sort_order: 2,
      },
      {
        english: "Who?",
        tamil: "யாரு?",
        telugu: "ఎవరు?",
        translit_tamil: "Yaaru?",
        translit_telugu: "Evaru?",
        dravidian_note: "Tamil 'Yaaru' breaks the E- pattern — from Dravidian root *yaar. Telugu 'Evaru' keeps the E- prefix. Both extremely common. 'Yaaru idhu?' = 'Who is this?'",
        sort_order: 3,
      },
      {
        english: "When?",
        tamil: "எப்போ?",
        telugu: "ఎప్పుడు?",
        translit_tamil: "Eppo?",
        translit_telugu: "Eppudu?",
        dravidian_note: "Tamil spoken 'Eppo' (formal: 'Eppothu'). Telugu 'Eppudu'. Both clearly from the same Dravidian root — one of the most transparent shared words between the two languages.",
        sort_order: 4,
      },
      {
        english: "Why?",
        tamil: "ஏன்?",
        telugu: "ఎందుకు?",
        translit_tamil: "Een?",
        translit_telugu: "Enduku?",
        dravidian_note: "Tamil 'Een' is short and emphatic. Telugu 'Enduku' often contracted to 'Endu' in speech. Both E- question words. 'Een?' alone as a full sentence = 'Why?!' with strong emphasis.",
        sort_order: 5,
      },
      {
        english: "How?",
        tamil: "எப்படி?",
        telugu: "ఎలా?",
        translit_tamil: "Eppadi?",
        translit_telugu: "Elaa?",
        dravidian_note: "Tamil 'Eppadi' = 'in what way/manner'. Telugu 'Elaa' is simpler. Both E- words. 'Eppadi irukka?' = 'How are you?' — the most common Tamil greeting after learning someone's name.",
        sort_order: 6,
      },
    ],
  },

  {
    title: "Level 2: Essential Nouns — Daily Life",
    module_order: 22,
    is_premium: false,
    skill_type: "vocabulary",
    words: [
      {
        english: "Water",
        tamil: "தண்ணீர்",
        telugu: "నీళ్ళు",
        translit_tamil: "Thanneer",
        translit_telugu: "Neellu",
        dravidian_note: "Tamil spoken: 'Thaanni'. Telugu 'Neellu' uses plural for liquids — Telugu often pluralizes mass nouns. Both from Dravidian *nīr (water). Critical survival vocabulary.",
        sort_order: 1,
      },
      {
        english: "Food / Meal",
        tamil: "சாப்பாடு",
        telugu: "అన్నం / తిండి",
        translit_tamil: "Saappaadu",
        translit_telugu: "Annam / Tindi",
        dravidian_note: "Tamil 'Saappaadu' implies a full rice-based meal. Telugu 'Annam' = cooked rice specifically; 'Tindi' = food generally. These cultural distinctions matter for dining conversations.",
        sort_order: 2,
      },
      {
        english: "House / Home",
        tamil: "வீடு",
        telugu: "ఇల్లు",
        translit_tamil: "Veedu",
        translit_telugu: "Illu",
        dravidian_note: "Both from Dravidian *viṭu (dwelling). Tamil preserved 'V', Telugu softened to 'I'. These words will transform in Level 3 when we add case suffixes — 'to the house', 'in the house'.",
        sort_order: 3,
      },
      {
        english: "Road / Way",
        tamil: "வழி",
        telugu: "దారి",
        translit_tamil: "Vazhi",
        translit_telugu: "Daari",
        dravidian_note: "Tamil 'Vazhi' has the retroflex 'zh' sound — unique to Tamil among major world languages. Telugu 'Daari'. Both used for 'show me the way' directions.",
        sort_order: 4,
      },
      {
        english: "Shop / Store",
        tamil: "கடை",
        telugu: "దుకాణం",
        translit_tamil: "Kadai",
        translit_telugu: "Dukanam",
        dravidian_note: "Tamil 'Kadai' is native Dravidian. Telugu 'Dukanam' borrowed from Persian/Urdu (dukaan) — reflecting Hyderabad's Mughal influence. Language reveals history!",
        sort_order: 5,
      },
      {
        english: "Auto-rickshaw",
        tamil: "ஆட்டோ",
        telugu: "ఆటో",
        translit_tamil: "Aatto",
        translit_telugu: "Aato",
        dravidian_note: "Both just say 'Auto'! English loanword fully absorbed. The auto-rickshaw is central to urban South Indian life. An entire Cultural Pack is built around auto negotiation.",
        sort_order: 6,
      },
      {
        english: "Price / Cost",
        tamil: "விலை",
        telugu: "ధర",
        translit_tamil: "Vilai",
        translit_telugu: "Dhara",
        dravidian_note: "Tamil 'Vilai' is native Dravidian. Telugu 'Dhara' comes from Sanskrit — this Sanskrit influence is noticeably stronger in Telugu than Tamil, reflecting different historical contact.",
        sort_order: 7,
      },
      {
        english: "Mobile phone",
        tamil: "போன்",
        telugu: "ఫోన్",
        translit_tamil: "Pon",
        translit_telugu: "Phon",
        dravidian_note: "Both use English 'phone'. Modern loanwords are identical across languages. 'Enna number?' and 'Meeru number ekkuva?' (What's your number?) are daily interactions.",
        sort_order: 8,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 3 — THE STICKER MASTER (Case Endings)
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Level 3: The 'To' Suffix — Dative Case",
    module_order: 30,
    is_premium: false,
    skill_type: "grammar",
    words: [
      {
        english: "To me / For me",
        tamil: "எனக்கு",
        telugu: "నాకు",
        translit_tamil: "Enakku",
        translit_telugu: "Naaku",
        dravidian_note: "Dative suffix: -kku (Tamil) / -ku (Telugu). 'En' (I, Tamil) + '-akku' = 'Enakku'. 'Naa' (I, Telugu) + '-ku' = 'Naaku'. This suffix STICKS to the noun — no separate word like English 'to'.",
        sort_order: 1,
      },
      {
        english: "To you (informal)",
        tamil: "உனக்கு",
        telugu: "నీకు",
        translit_tamil: "Unakku",
        translit_telugu: "Neeku",
        dravidian_note: "Informal 'to you'. Tamil 'Un' (your) + '-akku'. Telugu 'Nee' (you) + '-ku'. Use for friends and equals only. The same suffix works on every pronoun — learn the suffix once!",
        sort_order: 2,
      },
      {
        english: "To the shop",
        tamil: "கடைக்கு",
        telugu: "దుకాణానికి",
        translit_tamil: "Kadaikku",
        translit_telugu: "Dukaananiki",
        dravidian_note: "Telugu has a longer dative for nouns: '-niki'. 'Dukaanamu' → 'Dukaananiki'. Tamil uses '-kku'. This is the fundamental direction marker — replaces English 'to'. Critical for navigation.",
        sort_order: 3,
      },
      {
        english: "To the house",
        tamil: "வீட்டுக்கு",
        telugu: "ఇంటికి",
        translit_tamil: "Veettukku",
        translit_telugu: "Intiki",
        dravidian_note: "Root changes when adding suffixes! Tamil 'Veedu' → 'Veettu-kku'. Telugu 'Illu' → 'Inti-ki'. These sound changes (sandhi) at word boundaries are a key feature of Dravidian languages.",
        sort_order: 4,
      },
      {
        english: "I'm going to the shop",
        tamil: "நான் கடைக்கு போறேன்",
        telugu: "నేను దుకాణానికి వెళ్తున్నాను",
        translit_tamil: "Naan kadaikku pooreen",
        translit_telugu: "Nenu dukaananiki veltunnaanu",
        dravidian_note: "SOV sentence! 'I shop-TO going' — verb comes LAST always. Notice 'pooreen' (going, Tamil) and 'veltunnaanu' (going, Telugu) are fully agglutinated single words. Lego blocks!",
        sort_order: 5,
      },
    ],
  },

  {
    title: "Level 3: The 'From' Suffix — Ablative Case",
    module_order: 31,
    is_premium: false,
    skill_type: "grammar",
    words: [
      {
        english: "From here",
        tamil: "இங்கிருந்து",
        telugu: "ఇక్కడ నుండి",
        translit_tamil: "Ingirundu",
        translit_telugu: "Ikkada nundi",
        dravidian_note: "Ablative 'from': '-irundu' (Tamil) / '-nundi' (Telugu). Tamil fuses into one word. Telugu keeps them slightly separate. Both mean 'starting from this point'.",
        sort_order: 1,
      },
      {
        english: "From Chennai",
        tamil: "சென்னையிலிருந்து",
        telugu: "చెన్నై నుండి",
        translit_tamil: "Chennaiyilirundu",
        translit_telugu: "Chennai nundi",
        dravidian_note: "Tamil agglutination: 'Chennai' + '-yil' (in) + '-irundu' (from) = one word. Telugu separates them. This stacking of suffixes is the key to Tamil sentence building.",
        sort_order: 2,
      },
      {
        english: "From which station?",
        tamil: "எந்த ஸ்டேஷனிலிருந்து?",
        telugu: "ఏ స్టేషన్ నుండి?",
        translit_tamil: "Endha station-ilirundu?",
        translit_telugu: "Ee station nundi?",
        dravidian_note: "'Endha' (Tamil) / 'Ee' (Telugu) = which. Add '-irundu/nundi' to any place name to ask 'from where'. Practical for train and bus travel questions.",
        sort_order: 3,
      },
    ],
  },

  {
    title: "Level 3: The 'In/At' Suffix — Locative Case",
    module_order: 32,
    is_premium: false,
    skill_type: "grammar",
    words: [
      {
        english: "In the house",
        tamil: "வீட்டுல",
        telugu: "ఇంట్లో",
        translit_tamil: "Veettula",
        translit_telugu: "Intlo",
        dravidian_note: "Locative 'in/at': Tamil spoken '-ul' or '-la'. Telugu '-lo'. 'Veedu' → 'Veettula'. 'Illu' → 'Intlo'. One of the most useful suffixes — indicates where something is located.",
        sort_order: 1,
      },
      {
        english: "In Chennai",
        tamil: "சென்னையில",
        telugu: "చెన్నైలో",
        translit_tamil: "Chennaiyila",
        translit_telugu: "Chennailo",
        dravidian_note: "Just add '-la' (Tamil) or '-lo' (Telugu) to any city or place name. One of the most productive suffixes — works on almost any noun. 'Bengaluruila/Bengalurulo' = In Bangalore.",
        sort_order: 2,
      },
      {
        english: "In my hand",
        tamil: "என் கையில",
        telugu: "నా చేతిలో",
        translit_tamil: "En kaiyila",
        translit_telugu: "Naa chetilo",
        dravidian_note: "Tamil 'Kai' (hand) vs Telugu 'Cheti' (hand) — completely different words! Key vocabulary contrast. Adding '-ila/-lo' gives 'in the hand'.",
        sort_order: 3,
      },
      {
        english: "I'm staying at a hotel",
        tamil: "ஹோட்டல்ல இருக்கேன்",
        telugu: "హోటల్‌లో ఉన్నాను",
        translit_tamil: "Hotel-la irukkeen",
        translit_telugu: "Hotel-lo unnaanu",
        dravidian_note: "Full SOV sentence: 'Hotel-IN am-staying'. 'Irukkeen' (Tamil) / 'Unnaanu' (Telugu) = I am/exist here. 'Iru/Unu' is the existential verb — one of the most used verbs in the language.",
        sort_order: 4,
      },
    ],
  },

  {
    title: "Level 3: The 'With' Suffix — Comitative Case",
    module_order: 33,
    is_premium: false,
    skill_type: "grammar",
    words: [
      {
        english: "With me",
        tamil: "என்னோட",
        telugu: "నాతో",
        translit_tamil: "Ennoda",
        translit_telugu: "Naatho",
        dravidian_note: "Comitative 'with': Tamil spoken '-oda'. Telugu '-tho'. 'Ennoda' = with me (Tamil). 'Naatho' = with me (Telugu). Used for both accompaniment ('come with me') and instruments ('cut with knife').",
        sort_order: 1,
      },
      {
        english: "Come with me",
        tamil: "என்னோட வா",
        telugu: "నాతో రా",
        translit_tamil: "Ennoda vaa",
        translit_telugu: "Naatho raa",
        dravidian_note: "Level 1 command + Level 3 suffix combined! SOV: 'Me-WITH come.' This is how you build complexity — each level stacks on previous ones. The curriculum is modular by design.",
        sort_order: 2,
      },
      {
        english: "Eating with spoon",
        tamil: "ஸ்பூன்ல சாப்பிடு",
        telugu: "చెంచాతో తినండి",
        translit_tamil: "Spoon-la saapidu",
        translit_telugu: "Chencha-tho tinandi",
        dravidian_note: "Tamil uses locative '-la' for instruments. Telugu uses '-tho'. Cultural note: traditional South Indian dining uses HANDS not spoons. 'Kaiyaala saapidu' = eat with your hand — the preferred form.",
        sort_order: 3,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 4 — THE TIME TRAVELER (Tenses)
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Level 4: Present Tense — 'I am doing'",
    module_order: 40,
    is_premium: false,
    skill_type: "grammar",
    words: [
      {
        english: "I am going",
        tamil: "நான் போறேன்",
        telugu: "నేను వెళ్తున్నాను",
        translit_tamil: "Naan pooreen",
        translit_telugu: "Nenu veltunnaanu",
        dravidian_note: "Present progressive. Tamil 'pooreen' = po + -r- (present) + -een (I). Telugu 'veltunnaanu' = vellu + -tunna- (present) + -anu (I). The present marker stacks onto the verb root.",
        sort_order: 1,
      },
      {
        english: "I am eating",
        tamil: "நான் சாப்பிட்றேன்",
        telugu: "నేను తింటున్నాను",
        translit_tamil: "Naan saappitreen",
        translit_telugu: "Nenu tintunnaanu",
        dravidian_note: "Spoken Tamil contracts 'saappidukiREEN' → 'saappitreen'. Telugu '-tunna-' present marker is very regular — add it to any verb root. Colloquial forms are the ones to teach.",
        sort_order: 2,
      },
      {
        english: "I am coming",
        tamil: "நான் வர்றேன்",
        telugu: "నేను వస్తున్నాను",
        translit_tamil: "Naan varreen",
        translit_telugu: "Nenu vastunnaanu",
        dravidian_note: "Spoken Tamil contracts 'varugiREEN' → 'varreen'. Telugu 'vastaanu'. Colloquial contractions are essential — teach these, not the textbook forms that nobody actually says.",
        sort_order: 3,
      },
      {
        english: "What are you doing?",
        tamil: "என்ன பண்ற?",
        telugu: "ఏం చేస్తున్నావు?",
        translit_tamil: "Enna panra?",
        translit_telugu: "Em chestunnaavu?",
        dravidian_note: "Most common conversation opener. Tamil 'panra' = do + present + you (informal). 'Pannu' (do) in Tamil is incredibly versatile — nearly any noun + pannu = a verb. A grammar cheat code.",
        sort_order: 4,
      },
      {
        english: "He is sleeping",
        tamil: "அவன் தூங்கிட்றான்",
        telugu: "వాడు నిద్రపోతున్నాడు",
        translit_tamil: "Avan thoongitraan",
        translit_telugu: "Vaadu nidrapotunaadu",
        dravidian_note: "Verb ending agrees with subject. Tamil '-aan' = informal he. Telugu '-aadu' = informal he. The verb ending changes to match who's doing the action — called verb agreement.",
        sort_order: 5,
      },
    ],
  },

  {
    title: "Level 4: Past Tense — 'I did'",
    module_order: 41,
    is_premium: false,
    skill_type: "grammar",
    words: [
      {
        english: "I went",
        tamil: "நான் போனேன்",
        telugu: "నేను వెళ్ళాను",
        translit_tamil: "Naan pooneen",
        translit_telugu: "Nenu vellaanu",
        dravidian_note: "Past tense. Tamil: po + '-n-' (past marker) + '-een' (I). Telugu: vellu + '-aa-' (past marker) + '-nu' (I). Memorize the past markers: -n- for Tamil, -aa- for Telugu.",
        sort_order: 1,
      },
      {
        english: "I ate",
        tamil: "நான் சாப்பிட்டேன்",
        telugu: "నేను తిన్నాను",
        translit_tamil: "Naan saappitteen",
        translit_telugu: "Nenu tinnaanu",
        dravidian_note: "Tamil past often uses consonant doubling: -tt- marks past tense. Telugu: 'tinna' (ate) + '-anu'. The past tense root sometimes changes shape (ablaut) — common verbs must be memorized.",
        sort_order: 2,
      },
      {
        english: "I came",
        tamil: "நான் வந்தேன்",
        telugu: "నేను వచ్చాను",
        translit_tamil: "Naan vandheen",
        translit_telugu: "Nenu vacchaanu",
        dravidian_note: "'Come' is irregular in both. Tamil 'va-' → 'vandh-' (past). Telugu 'va-' → 'vacche-' (past). Irregular verbs need memorization — but they're among the most frequently used words.",
        sort_order: 3,
      },
      {
        english: "They came (colloquial spoken)",
        tamil: "அவங்க வந்துட்டாங்க",
        telugu: "వాళ్ళు వచ్చారు",
        translit_tamil: "Avanga vandhuttaanga",
        translit_telugu: "Vaallu vacchaaru",
        dravidian_note: "COLLOQUIAL SWITCH: Formal Tamil = 'Vandhuvittaargal'. Spoken = 'Vandhuttaanga'. This is the signature diglossia of Tamil — the gap between written and spoken is enormous. Always teach spoken.",
        sort_order: 4,
      },
      {
        english: "Did you eat? (yes/no question)",
        tamil: "சாப்பிட்டியா?",
        telugu: "తిన్నావా?",
        translit_tamil: "Saappittiyaa?",
        translit_telugu: "Tinnaavaa?",
        dravidian_note: "Yes/No question formula: add '-aa' to the end! 'Saappittiyaa?' / 'Tinnaavaa?' — the question suffix '-aa' is the same in both languages. One rule for all yes/no questions.",
        sort_order: 5,
      },
    ],
  },

  {
    title: "Level 4: Future Tense — 'I will'",
    module_order: 42,
    is_premium: true,
    skill_type: "grammar",
    words: [
      {
        english: "I will go",
        tamil: "நான் போவேன்",
        telugu: "నేను వెళ్తాను",
        translit_tamil: "Naan pooveen",
        translit_telugu: "Nenu veltaanu",
        dravidian_note: "Future tense. Tamil: po + '-v-' (future) + '-een' = 'pooveen'. Telugu: vellu + '-taa-' (future) + '-nu' = 'veltaanu'. Future markers: -v- (Tamil), -taa- (Telugu).",
        sort_order: 1,
      },
      {
        english: "I will come",
        tamil: "நான் வருவேன்",
        telugu: "నేను వస్తాను",
        translit_tamil: "Naan varuveen",
        translit_telugu: "Nenu vastaanu",
        dravidian_note: "Very common — used when replying to invitations. Also used as a polite soft refusal: 'Varuveen' said flatly or vaguely = 'maybe, maybe not'. Tone and context override literal meaning.",
        sort_order: 2,
      },
      {
        english: "I will see about it (soft no)",
        tamil: "பாக்கிறேன்",
        telugu: "చూస్తాను",
        translit_tamil: "Paakireen",
        translit_telugu: "Choostaanu",
        dravidian_note: "CULTURAL: 'I will see/look' = polite way to say NO. 'Paakireen' (Tamil) / 'Choostaanu' (Telugu) = 'I'll see...' = soft refusal. Reading this subtext is an essential social skill.",
        sort_order: 3,
      },
      {
        english: "It will happen / OK / Fine",
        tamil: "ஆகும்",
        telugu: "అవుతుంది",
        translit_tamil: "Aagum",
        translit_telugu: "Avutundi",
        dravidian_note: "'Aagum' (Tamil) = 'it will happen / ok / possible / fine'. 'Aagaadhu' = 'not possible / no'. One of Tamil's most versatile words. Telugu 'Avutundi' = 'it will happen/become'.",
        sort_order: 4,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 5 — THE SOCIALITE (Pronouns & Politeness)
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Level 5: The Respect Toggle",
    module_order: 50,
    is_premium: false,
    skill_type: "vocabulary",
    words: [
      {
        english: "You — informal (friends/younger only)",
        tamil: "நீ",
        telugu: "నువ్వు",
        translit_tamil: "Nee",
        translit_telugu: "Nuvvu",
        dravidian_note: "Use ONLY for: close friends, children, people clearly younger than you. Using this for an elder or stranger is very rude. Social error, not just grammatical error. When in doubt — use formal.",
        sort_order: 1,
      },
      {
        english: "You — formal (elders/strangers/default)",
        tamil: "நீங்க",
        telugu: "మీరు",
        translit_tamil: "Neenga",
        translit_telugu: "Meeru",
        dravidian_note: "Always use for: strangers, elders, bosses, anyone you just met. Tamil spoken 'Neenga' (formal: 'Neengal'). Telugu 'Meeru'. This form is NEVER wrong — it's the safe default.",
        sort_order: 2,
      },
      {
        english: "He — informal male",
        tamil: "அவன்",
        telugu: "వాడు",
        translit_tamil: "Avan",
        translit_telugu: "Vaadu",
        dravidian_note: "Use for males equal to or younger than you. Using 'Avan/Vaadu' for an elder or respected person is insulting. South Indian grammar encodes social hierarchy — ignore it at your peril!",
        sort_order: 3,
      },
      {
        english: "He/She — respectful",
        tamil: "அவங்க",
        telugu: "ఆయన / ఆవిడ",
        translit_tamil: "Avanga",
        translit_telugu: "Aayana / Aavida",
        dravidian_note: "Tamil colloquial 'Avanga' = respectful he/she/they (singular!). Telugu 'Aayana' = he (respectful), 'Aavida' = she (respectful). Use for elders, teachers, strangers of uncertain age.",
        sort_order: 4,
      },
      {
        english: "We — inclusive (you and I both)",
        tamil: "நாம்",
        telugu: "మనం",
        translit_tamil: "Naam",
        translit_telugu: "Manam",
        dravidian_note: "Inclusive 'we' — means 'you and I together'. Tamil 'Naam', Telugu 'Manam'. This distinction between inclusive/exclusive 'we' exists only in Dravidian and a few other language families. Rare globally!",
        sort_order: 5,
      },
      {
        english: "We — exclusive (my group, not you)",
        tamil: "நாங்க",
        telugu: "మేము",
        translit_tamil: "Naanga",
        translit_telugu: "Memu",
        dravidian_note: "Exclusive 'we' — my group, not including the listener. Tamil 'Naanga', Telugu 'Memu'. Use when talking about what your group did without the person you're speaking to. A genuinely unique feature.",
        sort_order: 6,
      },
    ],
  },

  {
    title: "Level 5: Formal vs Informal Speech Patterns",
    module_order: 51,
    is_premium: false,
    skill_type: "phrases",
    words: [
      {
        english: "Please come (formal command)",
        tamil: "வாங்க",
        telugu: "రండి",
        translit_tamil: "Vaanga",
        translit_telugu: "Randi",
        dravidian_note: "Add -nga (Tamil) / -ndi (Telugu) to ANY Level 1 command to make it respectful. 'Vaa' → 'Vaanga'. 'Raa' → 'Randi'. One suffix transforms every command. Master this and Level 1 doubles in power.",
        sort_order: 1,
      },
      {
        english: "Please sit (welcoming guests)",
        tamil: "உக்காருங்க",
        telugu: "కూర్చోండి",
        translit_tamil: "Ukkaarunga",
        translit_telugu: "Kuurchoodi",
        dravidian_note: "Welcoming gesture — offer a seat to visitors. Informal: 'Ukkaru' (Tamil) / 'Kuurcho' (Telugu). Formal adds -nga/-ndi. Master this pair for all hospitality situations.",
        sort_order: 2,
      },
      {
        english: "Have you eaten? (greeting to elders)",
        tamil: "சாப்பிட்டீங்களா?",
        telugu: "భోజనం చేశారా?",
        translit_tamil: "Saappitteengalaa?",
        translit_telugu: "Bhojanam chesaaraa?",
        dravidian_note: "CULTURAL KEY: This is how South Indians greet elders and guests. Asking about food = expressing care. 'Bhojanam' (Telugu) is Sanskrit for meal — formal register. Knowing this is social fluency.",
        sort_order: 3,
      },
      {
        english: "Please (request softener)",
        tamil: "தயவுசெஞ்சு",
        telugu: "దయచేసి",
        translit_tamil: "Thayavu senju",
        translit_telugu: "Daya chesi",
        dravidian_note: "Both literally mean 'with kindness/grace'. From 'thayavu' (Tamil) / 'daya' (Telugu), both meaning grace or mercy. Add before any request for maximum politeness.",
        sort_order: 4,
      },
      {
        english: "Thank you",
        tamil: "நன்றி",
        telugu: "ధన్యవాదాలు",
        translit_tamil: "Nandri",
        translit_telugu: "Dhanyavaadaalu",
        dravidian_note: "Cultural note: in casual South Indian settings, 'thank you' between close people can feel oddly formal — like thanking family. More natural in cities and with strangers. Colloquially: 'Super!' works too.",
        sort_order: 5,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CULTURAL PACKS
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Cultural Pack: Auto-Rickshaw Negotiation",
    module_order: 60,
    is_premium: false,
    skill_type: "cultural",
    words: [
      {
        english: "How much to [place]?",
        tamil: "[இடம்] எவ்வளவு?",
        telugu: "[చోటు] ఎంత?",
        translit_tamil: "[place] evvalavu?",
        translit_telugu: "[place] enta?",
        dravidian_note: "The opening move. Say the destination name + 'evvalavu/enta'. The driver WILL quote high. Your counter should be 40-60% of the first quote in most cities. This begins the ritual.",
        sort_order: 1,
      },
      {
        english: "That's too much",
        tamil: "அது ரொம்ப ஜாஸ்தி",
        telugu: "అది చాలా ఎక్కువ",
        translit_tamil: "Adhu romba jaasthi",
        translit_telugu: "Adi chaala ekkuva",
        dravidian_note: "'Romba' (Tamil) = very. 'Chaala' (Telugu) = very. Both among the most frequent adverbs — learn them immediately. 'Jaasthi/Ekkuva' = more/excess. Essential negotiation vocabulary.",
        sort_order: 2,
      },
      {
        english: "I will give [amount]",
        tamil: "நான் [amount] குடுக்கிறேன்",
        telugu: "నేను [amount] ఇస్తాను",
        translit_tamil: "Naan [amount] kudukkireen",
        translit_telugu: "Nenu [amount] istaanu",
        dravidian_note: "Your counter-offer. State a specific number (use Number lessons as prerequisite). Say it confidently — hesitation signals you'll pay more. 'Kudukku' is Tamil colloquial for 'give'.",
        sort_order: 3,
      },
      {
        english: "OK, deal / Agreed / Fine",
        tamil: "சரி",
        telugu: "సరే",
        translit_tamil: "Sari",
        translit_telugu: "Sare",
        dravidian_note: "'Sari' (Tamil) and 'Sare' (Telugu) — nearly identical! Both mean OK/fine/agreed. One of the most used words in daily South Indian life. Said twice for extra enthusiasm: 'Sari sari!'",
        sort_order: 4,
      },
      {
        english: "No / I don't want",
        tamil: "வேண்டாம்",
        telugu: "వద్దు",
        translit_tamil: "Vendum",
        translit_telugu: "Vaddu",
        dravidian_note: "'Vendum' (Tamil) = don't want. 'Vaddu' (Telugu) = no/don't. The negotiation trump card. Also used to stop pushy vendors. Body language: slight hand wave adds emphasis. Say it firmly.",
        sort_order: 5,
      },
      {
        english: "Start the meter",
        tamil: "மீட்டர் போடு",
        telugu: "మీటర్ వేయి",
        translit_tamil: "Meeter podu",
        translit_telugu: "Meeter veyyi",
        dravidian_note: "Tamil 'Podu' = put/place. Telugu 'Veyyi' = put. Both use English loanword 'meter'. Knowing your rights and saying this confidently often gets results — especially in Chennai and Hyderabad.",
        sort_order: 6,
      },
      {
        english: "I'll take another auto",
        tamil: "வேற ஆட்டோ பார்க்கிறேன்",
        telugu: "వేరే ఆటో చూస్తాను",
        translit_tamil: "Veera aatto paakireen",
        translit_telugu: "Veere aato choostaanu",
        dravidian_note: "The walk-away move. Say this and start walking — the driver often calls you back at a lower price. 'Veera/Veere' = different/another in both languages. Shared Dravidian root!",
        sort_order: 7,
      },
    ],
  },

  {
    title: "Cultural Pack: Family Kinship Terms",
    module_order: 61,
    is_premium: false,
    skill_type: "cultural",
    words: [
      {
        english: "Mother's younger brother (fun uncle)",
        tamil: "சித்தப்பா",
        telugu: "బాబాయి",
        translit_tamil: "Chittappa",
        translit_telugu: "Baabaayi",
        dravidian_note: "South Indian families precisely distinguish WHICH uncle. 'Chittappa' = mother's younger brother. He holds a special social role — in some traditions, even a potential father-in-law for cross-cousin marriage.",
        sort_order: 1,
      },
      {
        english: "Mother's older brother (elder uncle)",
        tamil: "பெரியப்பா",
        telugu: "పెద్దనాన్న",
        translit_tamil: "Periyappa",
        translit_telugu: "Peddanaanna",
        dravidian_note: "'Periya' (Tamil) / 'Pedda' (Telugu) = big/elder. 'Appa/Naanna' = father. This uncle receives more formal deference than Chittappa. Mixing them up at a family event is a social mistake.",
        sort_order: 2,
      },
      {
        english: "Older brother / Elder male (address term)",
        tamil: "அண்ணன்",
        telugu: "అన్న",
        translit_tamil: "Annan",
        translit_telugu: "Anna",
        dravidian_note: "Tamil and Telugu share this! 'Annan/Anna' = older brother. Also used to address any older male you want to be friendly with — calling a shop worker 'Anna!' is warm and respectful.",
        sort_order: 3,
      },
      {
        english: "Older sister (address term)",
        tamil: "அக்கா",
        telugu: "అక్క",
        translit_tamil: "Akka",
        translit_telugu: "Akka",
        dravidian_note: "Identical in both languages! 'Akka' = older sister. Also a respectful address for any older woman. One of the clearest shared Dravidian words across Tamil and Telugu.",
        sort_order: 4,
      },
      {
        english: "Younger brother (affectionate)",
        tamil: "தம்பி",
        telugu: "తమ్ముడు",
        translit_tamil: "Thambi",
        translit_telugu: "Thammudu",
        dravidian_note: "'Thambi' (Tamil) and 'Thammudu' (Telugu) — same Dravidian root! Used affectionately for any younger male. Shopkeepers often address young customers as 'Thambi/Thammudu'.",
        sort_order: 5,
      },
      {
        english: "Grandmother (paternal)",
        tamil: "பாட்டி",
        telugu: "నాన్నమ్మ",
        translit_tamil: "Paatti",
        translit_telugu: "Naanamma",
        dravidian_note: "Tamil 'Paatti' = paternal grandmother. Telugu 'Naanamma' = father's mother (Naanna = father + Amma = mother — literally 'father's mother'!). Maternal grandmother: 'Aachi' (Tamil) / 'Avva' (Telugu).",
        sort_order: 6,
      },
      {
        english: "Grandfather",
        tamil: "தாத்தா",
        telugu: "తాత",
        translit_tamil: "Thaattha",
        translit_telugu: "Thaatha",
        dravidian_note: "Nearly identical! 'Thaattha' (Tamil), 'Thaatha' (Telugu). One of the clearest shared Dravidian words. Also used respectfully for any elderly man you encounter.",
        sort_order: 7,
      },
    ],
  },

  {
    title: "Cultural Pack: Dining & Food Etiquette",
    module_order: 62,
    is_premium: false,
    skill_type: "cultural",
    words: [
      {
        english: "Enough! (when being served)",
        tamil: "போதும்",
        telugu: "చాలు",
        translit_tamil: "Potum",
        translit_telugu: "Chaalu",
        dravidian_note: "THE most important word at a South Indian meal. Hosts will keep serving until you say this firmly. Saying it softly won't work. Say 'Potum! Potum!' / 'Chaalu! Chaalu!' with a hand wave.",
        sort_order: 1,
      },
      {
        english: "Very tasty / Delicious",
        tamil: "ரொம்ப சுவையா இருக்கு",
        telugu: "చాలా రుచిగా ఉంది",
        translit_tamil: "Romba suvaiyaa irukku",
        translit_telugu: "Chaala ruchigaa undi",
        dravidian_note: "'Suvai' (Tamil) / 'Ruchi' (Telugu) = taste. The -aa/-gaa suffix makes it adverbial ('tastily'). 'Irukku/Undi' = it is. Saying this to a home cook earns enormous social goodwill.",
        sort_order: 2,
      },
      {
        english: "Give a little more",
        tamil: "கொஞ்சம் போடுங்க",
        telugu: "కొంచెం వడ్డించండి",
        translit_tamil: "Konjam podunga",
        translit_telugu: "Konchem vaddincandi",
        dravidian_note: "'Konjam/Konchem' = a little (both languages, slightly different forms!). 'Podu' (Tamil) = serve/put. 'Vaddincandi' (Telugu) = please serve. The -nga/-andi endings make it polite.",
        sort_order: 3,
      },
      {
        english: "I'll eat with my hand",
        tamil: "கையால சாப்பிடுவேன்",
        telugu: "చేత్తో తింటాను",
        translit_tamil: "Kaiyaala saappiduveen",
        translit_telugu: "Chetho tintaanu",
        dravidian_note: "Eating with the right hand is traditional — believed to enhance taste through touch. 'Kaiyaal' (Tamil) / 'Chetho' (Telugu) = with the hand. Notice the instrumental case from Level 3 in action!",
        sort_order: 4,
      },
      {
        english: "Spicy",
        tamil: "காரமா",
        telugu: "కారంగా",
        translit_tamil: "Kaaramaa",
        translit_telugu: "Kaarangaa",
        dravidian_note: "'Kaaram' — identical in both languages! From Dravidian *kāram (pungency). The most discussed food quality in South India. Always relevant.",
        sort_order: 5,
      },
      {
        english: "Not spicy please",
        tamil: "காரம் வேண்டாம்",
        telugu: "కారం వద్దు",
        translit_tamil: "Kaaram vendum",
        translit_telugu: "Kaaram vaddu",
        dravidian_note: "Essential for newcomers! But warning: 'no spice' in South India often still means mildly spicy by global standards. You may need to add 'bilkul nahi/full-a vendum' for zero heat.",
        sort_order: 6,
      },
    ],
  },

  {
    title: "Cultural Pack: Polite Refusal — Saying No",
    module_order: 63,
    is_premium: true,
    skill_type: "cultural",
    words: [
      {
        english: "I'll see about it (soft no)",
        tamil: "பாக்கிறேன்",
        telugu: "చూస్తాను",
        translit_tamil: "Paakireen",
        translit_telugu: "Choostaanu",
        dravidian_note: "The signature South Indian soft refusal. Literally 'I will look/see'. Never truly means yes. If someone says this to your invitation, they are likely not coming. Don't follow up — it would be rude.",
        sort_order: 1,
      },
      {
        english: "I'll come later (probably no)",
        tamil: "கொஞ்சம் நேரம் கழிச்சு வர்றேன்",
        telugu: "కొంచెం సేపటికి వస్తాను",
        translit_tamil: "Konjam neram kazhichu varreen",
        translit_telugu: "Konchem sepatiki vastaanu",
        dravidian_note: "'Later' is social currency. 'I'll come after some time' = maybe never. Context determines meaning: said warmly with a smile = might come. Said flatly = definitely not coming.",
        sort_order: 2,
      },
      {
        english: "I'm not feeling well (excuse)",
        tamil: "உடம்பு சரியில்ல",
        telugu: "ఒంట్లో బాగోలేదు",
        translit_tamil: "Udambu sari illa",
        translit_telugu: "Ontlo baagoleedu",
        dravidian_note: "'Udambu/Ontlo' = body. 'Sari illa/Baagoleedu' = not fine. A polite, unverifiable excuse. Tamil: 'Sari' (ok) + 'illa' (not) = standard negation. Telugu: 'Baagaa' (well) + '-leedu' (is not).",
        sort_order: 3,
      },
      {
        english: "I don't need it (firm no)",
        tamil: "வேண்டாம்",
        telugu: "వద్దు",
        translit_tamil: "Vendum",
        translit_telugu: "Vaddu",
        dravidian_note: "The direct 'no'. Use with close friends or when being firm with vendors. For hosts: use carefully — they may be offended. South Indians rarely say a direct no to family; this sounds blunt.",
        sort_order: 4,
      },
      {
        english: "I have work / I'm busy (excuse)",
        tamil: "வேலை இருக்கு",
        telugu: "పని ఉంది",
        translit_tamil: "Velai irukku",
        translit_telugu: "Pani undi",
        dravidian_note: "'Velai/Pani' = work (both from Dravidian roots). 'Irukku/Undi' = there is. The classic excuse for any unwanted social obligation. Universal, dignified, and practically unrefutable.",
        sort_order: 5,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COLLOQUIAL SWITCH PACK
  // ══════════════════════════════════════════════════════════════════════════

  {
    title: "Colloquial Switch: Spoken vs Written Forms",
    module_order: 70,
    is_premium: true,
    skill_type: "colloquial",
    words: [
      {
        english: "They have come",
        tamil: "வந்துட்டாங்க ← [formal: வந்துவிட்டார்கள்]",
        telugu: "వచ్చారు ← [formal: వచ్చియున్నారు]",
        translit_tamil: "Vandhuttaanga ← VandhuVittaargal",
        translit_telugu: "Vacchaaru ← Vachiunnaru",
        dravidian_note: "DIGLOSSIA: Written Tamil is almost a separate language from spoken. 'VandhuVittaargal' is what textbooks teach; nobody says it. Teach 'Vandhuttaanga'. This is BhashaBridge's core philosophy.",
        sort_order: 1,
      },
      {
        english: "I don't know",
        tamil: "தெரியல ← [formal: தெரியவில்லை]",
        telugu: "తెలీదు ← [formal: తెలియదు]",
        translit_tamil: "Theriyala ← Theriyavillai",
        translit_telugu: "Teleedu ← Teliyadu",
        dravidian_note: "Spoken Tamil drops '-villai' to just '-la'. Spoken Telugu contracts to '-leedu'. The full negation shortens dramatically in casual speech — master the short form, the long form handles itself.",
        sort_order: 2,
      },
      {
        english: "What happened?",
        tamil: "என்னாச்சு? ← [formal: என்ன ஆனது?]",
        telugu: "ఏమైంది? ← [formal: ఏమి అయినది?]",
        translit_tamil: "Ennaachchu? ← Enna aanadhu?",
        translit_telugu: "Emaaindi? ← Eemi ayinadi?",
        dravidian_note: "Spoken forms fuse multiple words into one. 'Ennaachchu?' = 'Enna' (what) + 'aachchu' (happened). This fusion is a hallmark of South Indian spoken language — it sounds fast because it is.",
        sort_order: 3,
      },
      {
        english: "Is it OK?",
        tamil: "சரியா? ← [formal: சரியா இருக்கிறதா?]",
        telugu: "సరేనా? ← [formal: సరే అవుతుందా?]",
        translit_tamil: "Sariyaa? ← Sariyaa irukkiradhaa?",
        translit_telugu: "Sareenaa? ← Sare avutundaa?",
        dravidian_note: "Spoken language drops the verb entirely! 'Sariyaa?' is a complete spoken sentence. Context carries the missing verb. This ellipsis is normal in spoken Dravidian — embrace it, don't fight it.",
        sort_order: 4,
      },
    ],
  },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 BhashaBridge Full Curriculum Seed Starting...\n");
  console.log(`   Curriculum lessons : ${CURRICULUM.length}`);
  console.log(`   Directions         : ${DIRECTIONS.length}`);
  console.log(`   Expected lessons   : ${CURRICULUM.length * DIRECTIONS.length}`);
  console.log(`   Expected words     : ${CURRICULUM.reduce((a, l) => a + l.words.length, 0) * DIRECTIONS.length}\n`);

  let totalLessons = 0;
  let totalWords = 0;
  let errors = 0;

  for (const direction of DIRECTIONS) {
    console.log(`\n📚 Seeding direction: ${direction}`);

    for (const lesson of CURRICULUM) {
      // ── Insert lesson ──────────────────────────────────────────────────
      const { data: lessonRow, error: lessonErr } = await supabase
        .from("lessons")
        .insert({
          title: lesson.title,
          direction: direction,
          module_order: lesson.module_order,
          is_premium: lesson.is_premium,
          skill_type: lesson.skill_type,
          word_count: lesson.words.length,
        })
        .select("id")
        .single();

      if (lessonErr) {
        console.error(
          `  ❌ Lesson "${lesson.title}" (${direction}): ${lessonErr.message}`
        );
        errors++;
        continue;
      }

      const lessonId = lessonRow.id;
      totalLessons++;

      // ── Insert words ───────────────────────────────────────────────────
      const wordsPayload = lesson.words.map((w) => ({
        lesson_id: lessonId,
        tamil: w.tamil,
        telugu: w.telugu,
        english: w.english,
        translit_tamil: w.translit_tamil,
        translit_telugu: w.translit_telugu,
        dravidian_note: w.dravidian_note,
        sort_order: w.sort_order,
      }));

      const { error: wordsErr } = await supabase
        .from("words")
        .insert(wordsPayload);

      if (wordsErr) {
        console.error(
          `  ❌ Words for "${lesson.title}" (${direction}): ${wordsErr.message}`
        );
        errors++;
      } else {
        totalWords += wordsPayload.length;
        console.log(`  ✅ "${lesson.title}" — ${wordsPayload.length} words`);
      }
    }
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("✅  SEED COMPLETE");
  console.log(`   Lessons seeded  : ${totalLessons}`);
  console.log(`   Words seeded    : ${totalWords}`);
  console.log(`   Errors          : ${errors}`);
  console.log("══════════════════════════════════════════════\n");

  if (errors > 0) {
    console.warn(`⚠️  ${errors} error(s) occurred. Check output above.`);
    process.exit(1);
  }
}

seed().catch((err) => {
  console.error("💥 Fatal seed error:", err);
  process.exit(1);
});
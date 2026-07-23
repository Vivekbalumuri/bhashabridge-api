import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'placeholder-key'
);

// Vocabulary translations for the story panels across all South Indian languages
const STORY_VOCAB = {
  HELLO: { te: "నమస్కారం", ta: "வணக்கம்", ml: "നമസ്കാരം", kn: "ನಮಸ್ಕಾರ", en: "Hello" },
  MY_NAME_IS: { te: "నా పేరు", ta: "என் பெயர்", ml: "എന്റെ പേര്", kn: "ನನ್ನ ಹೆಸರು", en: "My name is" },
  WELCOME: { te: "స్వాగతం", ta: "நல்வரவு", ml: "സ്വാഗதம்", kn: "ಸ್ವಾಗತ", en: "Welcome" },
  HOW_ARE_YOU: { te: "ఎలా ఉన్నారు", ta: "எப்படி இருக்கீங்க", ml: "எങ്ങനെയുണ്ട്", kn: "ಹೇಗಿದ್ದೀರಾ", en: "How are you" },
  I_AM_FINE: { te: "నేను బాగున్నాను", ta: "நல்லา இருக்கேன்", ml: "സുఖമാണ്", kn: "ಚೆನ್ನಾಗಿದ್ದೀನಿ", en: "I am fine" },
  THANK_YOU: { te: "ధన్యవాదాలు", ta: "நன்றி", ml: "നന്ദി", kn: "ಧನ್ಯವಾದಗಳು", en: "Thank you" },
  YES: { te: "అవును", ta: "ஆம்", ml: "അതെ", kn: "ಹೌದು", en: "Yes" },
  GOODBYE: { te: "వీడ్కోలు", ta: "விடைபெறுகிறேன்", ml: "പോയി വരാம்", kn: "ಹೋಗಿ ಬರ್ತೀನಿ", en: "Goodbye" },
  FRIEND: { te: "స్నేహితుడు", ta: "நண்பன்", ml: "கூட்டുകാരൻ", kn: "ಸ್ನೇಹಿತ", en: "friend" },
  HOW_MUCH: { te: "ఎంత", ta: "எவ்வளவு", ml: "എത്രയാണ്", kn: "ಎಷ್ಟು", en: "How much" },
  FIFTY: { te: "యాభై", ta: "ஐம்பது", ml: "അമ്പത്", kn: "ಐವತ್ತು", en: "fifty" },
  RUPEES: { te: "రూపాయలు", ta: "రూபாய்", ml: "രൂപ", kn: "ರೂಪಾಯಿ", en: "rupees" },
  TOO_EXPENSIVE: { te: "చాలా ఎక్కువ", ta: "ரொம்ப அதிகம்", ml: "വளരെ കൂടുതലാണ്", kn: "ಬಹಳ ದುಬಾರಿ", en: "too expensive" },
  THIRTY: { te: "ముప్పై", ta: "முப்பது", ml: "முப்பது", kn: "ಮೂವತ್ತು", en: "thirty" },
  FORTY: { te: "నలభై", ta: "நாற்பது", ml: "നാൽപത്", kn: "നലವತ್ತು", en: "forty" },
  TEN: { te: "పది", ta: "பத்து", ml: "பத்து", kn: "ಹತ್ತು", en: "ten" },
  TWENTY: { te: "ఇరవై", ta: "இருபது", ml: "ഇരുപത്", kn: "ಇಪ್ಪತ್ತು", en: "twenty" },
  GIVE_ME: { te: "నాకు ఇవ్వండి", ta: "எனకు கொடுங்கள்", ml: "എനിക്ക് തരൂ", kn: "ನನಗೆ ಕೊಡಿ", en: "give me" },
  FATHER: { te: "నాన్న", ta: "அப்பா", ml: "അച്ഛൻ", kn: "ತಂದೆ", en: "father" },
  MOTHER: { te: "అమ్మ", ta: "அம்மா", ml: "അമ്മ", kn: "ತಾಯಿ", en: "mother" },
  GRANDFATHER: { te: "తాతయ్య", ta: "தாத்தா", ml: "முത്തശ്ശൻ", kn: "ತಾತ", en: "grandfather" },
  GRANDMOTHER: { te: "నాయనమ్మ", ta: "பாட்டி", ml: "முத்தശ്ശി", kn: "ಅಜ್ಜಿ", en: "grandmother" },
  BROTHER: { te: "తమ్ముడు", ta: "தம்பி", ml: "അനിയൻ", kn: "ತಮ್ಮ", en: "brother" },
  SISTER: { te: "అక్క", ta: "அக்கா", ml: "ചேச்சி", kn: "ಅಕ್ಕ", en: "sister" },
  UNCLE: { te: "మామయ్య", ta: "மாமா", ml: "அമ്മാവൻ", kn: "ಮಾವ", en: "uncle" },
  RED: { te: "ఎరుపు", ta: "சிவப்பு", ml: "ചുവപ്പ്", kn: "ಕೆಂபு", en: "red" },
  SAFFRON: { te: "కాషాయం", ta: "காவி", ml: "காவி", kn: "ಕೇಸರಿ", en: "saffron" },
  GOLD: { te: "బంగారం", ta: "தங்கம்", ml: "സ്വർണ്ണം", kn: "ಚಿನ್ನ", en: "gold" },
  BLUE: { te: "నీలం", ta: "நீலம்", ml: "நീല", kn: "ನೀಲಿ", en: "blue" },
  GREEN: { te: "ఆకుపచ్చ", ta: "பச்சை", ml: "பச்ச", kn: "ಹಸಿರು", en: "green" },
  YELLOW: { te: "పసుపు", ta: "மஞ்சள்", ml: "மஞ்ச", kn: "ಹಳದಿ", en: "yellow" },
  BLACK: { te: "నలుపు", ta: "கருப்பு", ml: "கறுப்பு", kn: "ಕಪ್ಪು", en: "black" },
  WHERE_IS: { te: "ఎక్కడ ఉంది", ta: "எங்கே இருக்கிறது", ml: "எവിടെയാണ്", kn: "ಎಲ್ಲಿದೆ", en: "Where is" },
  STRAIGHT: { te: "నేరుగా", ta: "நேராக", ml: "நேരെ", kn: "ನೇರವಾಗಿ", en: "straight" },
  LEFT: { te: "ఎడమ", ta: "இடது", ml: "இடது", kn: "ಎಡ", en: "left" },
  RIGHT: { te: "కుడి", ta: "வலது", ml: "வலது", kn: "ಬಲ", en: "right" },
  FAR: { te: "దూరంగా", ta: "தொலைவில்", ml: "ദൂരെ", kn: "ದೂರ", en: "far" },
  NEAR: { te: "దగ్గరగా", ta: "அருகில்", ml: "அருகில்", kn: "ಹತ್ತಿರ", en: "near" },
  TURN: { te: "తిరగండి", ta: "திரும்புங்கள்", ml: "തിരിയുക", kn: "ತಿರುಗಿ", en: "turn" },
  STOP: { te: "ఆపండి", ta: "நிறுத்துங்கள்", ml: "நிർത്തൂ", kn: "ನಿಲ್ಲಿಸಿ", en: "stop" },
  RAINING: { te: "వర్షం పడుతోంది", ta: "மழை பெய்கிறது", ml: "மழை പെയ്യുന്നു", kn: "மழை ಬರುತ್ತಿದೆ", en: "raining" },
  COLD: { te: "చలిగా", ta: "குளிராக", ml: "തണുപ്പ്", kn: "ಚಳಿ", en: "cold" },
  HOT: { te: "వేడిగా", ta: "சூடாக", ml: "ചൂട്", kn: "ಬಿಸಿ", en: "hot" },
  SAD: { te: "బాధగా", ta: "வருத்தமாக", ml: "വിഷമം", kn: "ಬೇಸರ", en: "sad" },
  TIRED: { te: "అలసిపోయి", ta: "சோர்வாக", ml: "ക്ഷീണിതൻ", kn: "ದಣಿದ", en: "tired" },
  HAPPY: { te: "సంతోషంగా", ta: "மகிழ்ச்சியாக", ml: "சന്തোষം", kn: "ಸಂತೋಷ", en: "happy" },
  FEAR: { te: "భయం", ta: "பயம்", ml: "ഭயம்", kn: "ಭಯ", en: "fear" },
  ANGRY: { te: "కోపంగా", ta: "கோபமாக", ml: "ദേഷ്യം", kn: "ಕೋಪ", en: "angry" },
  WHITE: { te: "తెలుపు", ta: "வெள்ளை", ml: "വെള്ള", kn: "ಬಿಳಿ", en: "white" },
  PLEASE_COME: { te: "రండి", ta: "வாருங்கள்", ml: "வரூ", kn: "ಬನ್ನಿ", en: "Please come" },
  CONGRATULATIONS: { te: "అభినందనలు", ta: "வாழ்த்துகள்", ml: "அபிநந்தனங்கள்", kn: "அபிநந்தனಗಳು", en: "Congratulations" },
  BLESSINGS: { te: "ఆశీర్వాదాలు", ta: "ஆசிகள்", ml: "அனுக்கிரகங்கள்", kn: "ಆಶೀರ್ವಾದ", en: "blessings" },
  EXCUSE_ME: { te: "క్షమించండి", ta: "மன்னிக்கவும்", ml: "ക്ഷമിക്കണം", kn: "ಕ್ಷಮಿಸಿ", en: "Excuse me" },
  MADAM: { te: "గారూ", ta: "அம்மா", ml: "மேடம்", kn: "ಅಮ್ಮ", en: "Madam" },
  GREETINGS: { te: "నమస్కారం", ta: "வணக்கம்", ml: "నమస్కారం", kn: "ನಮಸ್ಕಾರ", en: "greetings" },
  PLAY: { te: "ఆడటం", ta: "விளையாட", ml: "കളിക്കുക", kn: "ಆಟವಾಡು", en: "play" },
  RUN: { te: "పరుగెత్తు", ta: "ஓடு", ml: "ഓടുക", kn: "ಓಡು", en: "Run" },
  THROW: { te: "విసరండి", ta: "வீசு", ml: "எறியுக", kn: "ಎಸೆಯಿರಿ", en: "Throw" },
  CATCH: { te: "పట్టుకోండి", ta: "பிடி", ml: "പിടിക്കുക", kn: "ಹಿಡಿಯಿರಿ", en: "Catch" },
  HIT: { te: "కొట్టండి", ta: "அடி", ml: "അടിക്കുക", kn: "ಹೊಡೆಯಿರಿ", en: "Hit" },
  JUMP: { te: "దూకడం", ta: "குதிக்க", ml: "ചാടുക", kn: "ನೆಗೆಯಲು", en: "jump" },
  WALK: { te: "నడవడానికి", ta: "நடக்க", ml: "നടക്കുക", kn: "ನಡೆಯಲು", en: "walk" },
  BEAUTIFUL: { te: "అందమైన", ta: "அழகு", ml: "മനോഹരമാണ്", kn: "ಸುಂದರ", en: "beautiful" },
  I_LOVE: { te: "నాకు చాలా ఇష్టం", ta: "எனக்கு பிடிக்கும்", ml: "എനിക്ക് ഇഷ്ടമാണ്", kn: "ನನಗೆ ಇಷ್ಟ", en: "I love" },
  HOW_MUCH_TIME: { te: "ఎంత సమయం", ta: "எவ்வளவு நேரம்", ml: "എത്ര സമയമെടുക്കും", kn: "ಎಷ್ಟು ಸಮಯ", en: "How much time" },
  SOUTH_INDIA: { te: "దక్షిణ భారతదేశం", ta: "தென்னிந்தியா", ml: "ദക്ഷിണേന്ത്യ", kn: "ದಕ್ಷಿಣ ಭಾರತ", en: "South India" },
  SEE_YOU_AGAIN: { te: "మళ్ళీ కలుద్దాం", ta: "மீண்டும் சந்திப்போம்", ml: "വീண்டும் കാണാം", kn: "ಮತ್ತೆ ಸಿಗೋಣ", en: "See you again" },
  GOOD_NIGHT: { te: "శుభ రాత్రి", ta: "இனிய இரவு", ml: "ശുഭരാത്രി", kn: "ಶುಭ ರಾತ್ರಿ", en: "Good night" }
};

// Segments a text template (like "Hello {WORLD}") into highlightable learning language segments
function segmentText(template, targetLang) {
  const segments = [];
  const regex = /\{([A-Z0-9_]+)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const plainText = template.substring(lastIndex, match.index);
    if (plainText) {
      segments.push({ text: plainText, is_vocab: false });
    }

    const key = match[1];
    const localizedWord = STORY_VOCAB[key]?.[targetLang] || key;
    segments.push({ text: localizedWord, is_vocab: true, key });
    
    lastIndex = regex.lastIndex;
  }

  const remainingText = template.substring(lastIndex);
  if (remainingText) {
    segments.push({ text: remainingText, is_vocab: false });
  }

  return segments;
}

// Segments a text template into English translation segments
function segmentBaseText(template) {
  const segments = [];
  const regex = /\{([A-Z0-9_]+)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const plainText = template.substring(lastIndex, match.index);
    if (plainText) {
      segments.push({ text: plainText, is_vocab: false });
    }

    const key = match[1];
    const englishWord = STORY_VOCAB[key]?.en || key;
    segments.push({ text: englishWord, is_vocab: true, key });
    
    lastIndex = regex.lastIndex;
  }

  const remainingText = template.substring(lastIndex);
  if (remainingText) {
    segments.push({ text: remainingText, is_vocab: false });
  }

  return segments;
}

// Replaces placeholders with target language words
function getLocalizedCaption(template, targetLang) {
  return template.replace(/\{([A-Z0-9_]+)\}/g, (match, key) => {
    return STORY_VOCAB[key]?.[targetLang] || key;
  });
}

// Replaces placeholders with English words
function getEnglishTranslation(template) {
  return template.replace(/\{([A-Z0-9_]+)\}/g, (match, key) => {
    return STORY_VOCAB[key]?.en || key;
  });
}

export default async function storiesRoutes(fastify) {
  
  // GET /stories
  // Returns all 9 chapters with their panels and unlocked state
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const supabaseUid = request.user.sub || request.user.id;

    // 1. Fetch user's total XP from streaks table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('supabase_uid', supabaseUid)
      .single();

    if (userError || !userProfile) {
      return reply.code(404).send({ error: 'User profile not found.' });
    }

    const { data: streakRow, error: streakError } = await supabaseAdmin
      .from('streaks')
      .select('total_xp')
      .eq('user_id', userProfile.id)
      .single();

    const userXp = streakRow?.total_xp ?? 0;

    // Determine target language from request query, default to Telugu ('te')
    let targetLang = 'te';
    const direction = request.query.direction || request.query.target_lang;
    if (direction) {
      const parts = direction.toLowerCase().split('-');
      if (parts.includes('te')) targetLang = 'te';
      else if (parts.includes('ta')) targetLang = 'ta';
      else if (parts.includes('ml')) targetLang = 'ml';
      else if (parts.includes('kn')) targetLang = 'kn';
    }
    // 2. Fetch all story chapters
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from('story_chapters')
      .select('*')
      .order('chapter_number', { ascending: true });

    if (chaptersError) {
      fastify.log.error({ chaptersError }, 'Failed to fetch chapters');
      return reply.code(500).send({ error: 'Failed to retrieve story chapters.' });
    }

    // 3. Fetch all story panels
    const { data: panels, error: panelsError } = await supabaseAdmin
      .from('story_panels')
      .select('*')
      .order('panel_order', { ascending: true });

    if (panelsError) {
      fastify.log.error({ panelsError }, 'Failed to fetch panels');
      return reply.code(500).send({ error: 'Failed to retrieve story panels.' });
    }

    // 4. Group panels by chapter
    const panelsByChapterId = {};
    for (const panel of panels) {
      if (!panelsByChapterId[panel.chapter_id]) {
        panelsByChapterId[panel.chapter_id] = [];
      }
      
      const vocabKey = panel.interactive_data?.vocab_key;
      
      // Parse vocab translations used in this panel template
      const vocabMap = {};
      const placeholders = [...panel.caption_template.matchAll(/\{([A-Z0-9_]+)\}/g)].map(m => m[1]);
      for (const pk of placeholders) {
        if (STORY_VOCAB[pk]) {
          vocabMap[pk] = {
            te: STORY_VOCAB[pk].te,
            ta: STORY_VOCAB[pk].ta,
            ml: STORY_VOCAB[pk].ml,
            kn: STORY_VOCAB[pk].kn
          };
        }
      }

      // Format interactive data clue, correct option, and distractors dynamically
      let interactiveData = null;
      if (panel.interactive_type && vocabKey && STORY_VOCAB[vocabKey]) {
        interactiveData = {
          clue: STORY_VOCAB[vocabKey][targetLang] || vocabKey,
          correct: STORY_VOCAB[vocabKey].en || 'Hello',
          options: panel.interactive_data.options || ['Hello', 'Bye', 'Thanks']
        };
      }

      panelsByChapterId[panel.chapter_id].push({
        id: panel.id,
        panel_order: panel.panel_order,
        image_key: panel.image_key,
        caption: panel.caption_template, // Keep raw template for flexible Android client parsing
        caption_localized: getLocalizedCaption(panel.caption_template, targetLang),
        translation: getEnglishTranslation(panel.caption_template),
        vocab: vocabMap,
        caption_segments: segmentText(panel.caption_template, targetLang),
        base_caption_segments: segmentBaseText(panel.caption_template),
        interactive_type: panel.interactive_type,
        interactive_data: interactiveData,
        cultural_note: panel.cultural_note
      });
    }

    // 5. Assemble formatted chapters
    const response = chapters.map(ch => ({
      id: ch.id,
      chapter_number: ch.chapter_number,
      title: ch.title,
      subtitle: ch.subtitle,
      xp_required: ch.xp_required ?? 0,
      unlocked: userXp >= (ch.xp_required ?? 0),
      panels: panelsByChapterId[ch.id] || []
    }));

    return reply.send(response);
  });
}

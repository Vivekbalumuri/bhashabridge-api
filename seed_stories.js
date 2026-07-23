import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('Clearing existing stories and panels from database...');
// Delete panels first due to foreign key constraints
const { error: delPanelsError } = await supabase.from('story_panels').delete().neq('id', 0);
if (delPanelsError) {
  console.error('Failed to clear story_panels:', delPanelsError.message);
  process.exit(1);
}

const { error: delChaptersError } = await supabase.from('story_chapters').delete().neq('id', 0);
if (delChaptersError) {
  console.error('Failed to clear story_chapters:', delChaptersError.message);
  process.exit(1);
}

console.log('Database tables cleared successfully.');

const chapters = [
  { chapter_number: 1, title: "Ravi's First Hello", subtitle: "Greetings · Chapter 1", xp_required: 0, unlock_lesson_type: "greetings", source_lang: "te" },
  { chapter_number: 2, title: "Bargaining at the Market", subtitle: "Numbers · Chapter 2", xp_required: 200, unlock_lesson_type: "numbers", source_lang: "te" },
  { chapter_number: 3, title: "Sunday Family Feast", subtitle: "Family · Chapter 3", xp_required: 500, unlock_lesson_type: "family", source_lang: "te" },
  { chapter_number: 4, title: "The Colorful Festival", subtitle: "Colors · Chapter 4", xp_required: 1000, unlock_lesson_type: "colors", source_lang: "te" },
  { chapter_number: 5, title: "Getting Lost in Town", subtitle: "Directions · Chapter 5", xp_required: 1500, unlock_lesson_type: "directions", source_lang: "te" },
  { chapter_number: 6, title: "Sharing Stories in the Rain", subtitle: "Weather & Feelings · Chapter 6", xp_required: 2200, unlock_lesson_type: "feelings", source_lang: "te" },
  { chapter_number: 7, title: "The Traditional Wedding", subtitle: "Formal · Chapter 7", xp_required: 3000, unlock_lesson_type: "formal", source_lang: "te" },
  { chapter_number: 8, title: "Street Cricket Champions", subtitle: "Verbs · Chapter 8", xp_required: 4000, unlock_lesson_type: "verbs", source_lang: "te" },
  { chapter_number: 9, title: "A New Friend Arrives", subtitle: "Conversational · Chapter 9", xp_required: 5000, unlock_lesson_type: "mastery", source_lang: "te" }
];

console.log('Inserting chapters...');
const { data: chRows, error: chError } = await supabase
  .from('story_chapters')
  .insert(chapters)
  .select();

if (chError) {
  console.error('Failed to insert chapters:', chError.message);
  process.exit(1);
}

const idMap = {};
for (const ch of chRows) {
  idMap[ch.chapter_number] = ch.id;
}
console.log('Chapters inserted. ID Mapping:', idMap);

const panels = [
  // Chapter 1: Greetings
  { chapter_num: 1, panel_order: 1, image_key: "RAVI_ARRIVES_TOWN", caption_template: "Ravi steps off the bus. He says {HELLO} to the town.", interactive_type: "fill_blank", interactive_data: { vocab_key: "HELLO", options: ["Hello", "Goodbye", "Excuse me"] } },
  { chapter_num: 1, panel_order: 2, image_key: "RAVI_MEETS_LAKSHMI", caption_template: 'He walks to his house and meets his landlady. He says, "{MY_NAME_IS} Ravi."', interactive_type: "fill_blank", interactive_data: { vocab_key: "MY_NAME_IS", options: ["My name is", "Thank you", "I am fine"] } },
  { chapter_num: 1, panel_order: 3, image_key: "LAKSHMI_SMILES", caption_template: 'Lakshmi Aunty smiles warmly. She says, "{WELCOME} to your new home, Ravi!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "WELCOME", options: ["Welcome", "Yes", "No"] } },
  { chapter_num: 1, panel_order: 4, image_key: "LAKSHMI_ASKING", caption_template: 'She asks him, "{HOW_ARE_YOU}?"', interactive_type: "fill_blank", interactive_data: { vocab_key: "HOW_ARE_YOU", options: ["How are you", "Hello", "Goodbye"] } },
  { chapter_num: 1, panel_order: 5, image_key: "RAVI_ANSWERS", caption_template: 'Ravi answers, "{I_AM_FINE}, Aunty. Thank you!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "I_AM_FINE", options: ["I am fine", "Welcome", "Yes"] } },
  { chapter_num: 1, panel_order: 6, image_key: "RAVI_ROOM", caption_template: 'She shows him his room. He says, "{THANK_YOU} so much."', interactive_type: "fill_blank", interactive_data: { vocab_key: "THANK_YOU", options: ["Thank you", "Excuse me", "My name is"] } },
  { chapter_num: 1, panel_order: 7, image_key: "LAKSHMI_COFFEE", caption_template: 'She asks if he wants some hot coffee. He says, "{YES}, please!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "YES", options: ["Yes", "No", "Hello"] } },
  { chapter_num: 1, panel_order: 8, image_key: "LAKSHMI_LEAVING", caption_template: 'As she leaves, she says, "{GOODBYE}, take some rest."', interactive_type: "fill_blank", interactive_data: { vocab_key: "GOODBYE", options: ["Goodbye", "Welcome", "How are you"] } },

  // Chapter 2: Numbers
  { chapter_num: 2, panel_order: 1, image_key: "RAVI_PRIYA_MARKET", caption_template: "Ravi is hungry. He goes to the local market with his friend {FRIEND}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "FRIEND", options: ["friend", "father", "mother"] } },
  { chapter_num: 2, panel_order: 2, image_key: "RAVI_ASK_PRICE", caption_template: 'He sees fresh red tomatoes. He asks the vendor, "{HOW_MUCH} for these?"', interactive_type: "fill_blank", interactive_data: { vocab_key: "HOW_MUCH", options: ["How much", "Too expensive", "Give me"] } },
  { chapter_num: 2, panel_order: 3, image_key: "VENDOR_FIFTY", caption_template: 'The vendor says, "That will be {FIFTY} rupees per kilo."', interactive_type: "fill_blank", interactive_data: { vocab_key: "FIFTY", options: ["fifty", "five", "fifteen"] } },
  { chapter_num: 2, panel_order: 4, image_key: "PRIYA_WHISPERS", caption_template: 'Priya shakes her head. She whispers, "No, that is {TOO_EXPENSIVE}!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "TOO_EXPENSIVE", options: ["too expensive", "cheap", "good"] } },
  { chapter_num: 2, panel_order: 5, image_key: "PRIYA_BARGAINS", caption_template: 'Priya says to the vendor, "No, please give them for {THIRTY} rupees."', interactive_type: "fill_blank", interactive_data: { vocab_key: "THIRTY", options: ["thirty", "three", "thirteen"] } },
  { chapter_num: 2, panel_order: 6, image_key: "VENDOR_FORTY", caption_template: 'The vendor compromises, "Okay, {FORTY} rupees per kilo."', interactive_type: "fill_blank", interactive_data: { vocab_key: "FORTY", options: ["forty", "four", "fourteen"] } },
  { chapter_num: 2, panel_order: 7, image_key: "RAVI_PAYS", caption_template: "Ravi counts {TEN} and {TWENTY} notes to pay.", interactive_type: "fill_blank", interactive_data: { vocab_key: "TWENTY", options: ["twenty", "ten", "two"] } },
  { chapter_num: 2, panel_order: 8, image_key: "RAVI_GETS_TOMATOES", caption_template: 'Ravi says, "{GIVE_ME} two kilos of tomatoes, please."', interactive_type: "fill_blank", interactive_data: { vocab_key: "GIVE_ME", options: ["give me", "take it", "too expensive"] } },

  // Chapter 3: Family
  { chapter_num: 3, panel_order: 1, image_key: "SUNDAY_LUNCH_HALL", caption_template: "Ravi is invited to a special Sunday lunch at Lakshmi Aunty's house.", interactive_type: "fill_blank", interactive_data: { vocab_key: "WELCOME", options: ["Welcome", "Hello", "Goodbye"] } },
  { chapter_num: 3, panel_order: 2, image_key: "RAVI_MEETS_FATHER", caption_template: 'He meets Lakshmi\'s husband. "This is my {FATHER}," says her son.', interactive_type: "fill_blank", interactive_data: { vocab_key: "FATHER", options: ["father", "brother", "uncle"] } },
  { chapter_num: 3, panel_order: 3, image_key: "CHOTU_AND_MOTHER", caption_template: 'He then meets her daughter-in-law. "And this is my {MOTHER}," says little Chotu.', interactive_type: "fill_blank", interactive_data: { vocab_key: "MOTHER", options: ["mother", "sister", "grandmother"] } },
  { chapter_num: 3, panel_order: 4, image_key: "GRANDFATHER_NEWSPAPER", caption_template: 'Chotu points to an older man reading a newspaper. "He is my {GRANDFATHER}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "GRANDFATHER", options: ["grandfather", "father", "brother"] } },
  { chapter_num: 3, panel_order: 5, image_key: "GRANDMOTHER_TEA", caption_template: 'Near him, an old lady is making tea. "She is my {GRANDMOTHER}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "GRANDMOTHER", options: ["grandmother", "mother", "sister"] } },
  { chapter_num: 3, panel_order: 6, image_key: "CHOTUS_BROTHER", caption_template: 'A young boy runs into the room. "He is my younger {BROTHER}," Chotu laughs.', interactive_type: "fill_blank", interactive_data: { vocab_key: "BROTHER", options: ["brother", "sister", "grandfather"] } },
  { chapter_num: 3, panel_order: 7, image_key: "CHOTUS_SISTER", caption_template: 'A girl is drawing in a notebook. "She is my elder {SISTER}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "SISTER", options: ["sister", "brother", "mother"] } },
  { chapter_num: 3, panel_order: 8, image_key: "RAVI_MEETS_UNCLE", caption_template: 'Lakshmi Aunty introduces her brother. "This is Chotu\'s {UNCLE}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "UNCLE", options: ["uncle", "father", "grandfather"] } },

  // Chapter 4: Colors
  { chapter_num: 4, panel_order: 1, image_key: "TEMPLE_FESTIVAL", caption_template: "Ravi and Priya visit a temple festival in town.", interactive_type: "fill_blank", interactive_data: { vocab_key: "FRIEND", options: ["friend", "mother", "sister"] } },
  { chapter_num: 4, panel_order: 2, image_key: "RED_CHARIOT", caption_template: "He sees a massive wooden chariot. It is decorated with a {RED} cloth.", interactive_type: "fill_blank", interactive_data: { vocab_key: "RED", options: ["red", "blue", "green"] } },
  { chapter_num: 4, panel_order: 3, image_key: "SAFFRON_FLAG", caption_template: "A large flag flies from the top. It has a beautiful {SAFFRON} color.", interactive_type: "fill_blank", interactive_data: { vocab_key: "SAFFRON", options: ["saffron", "gold", "yellow"] } },
  { chapter_num: 4, panel_order: 4, image_key: "GOLDEN_BORDER", caption_template: "The priest wears a traditional border made of {GOLD} thread.", interactive_type: "fill_blank", interactive_data: { vocab_key: "GOLD", options: ["gold", "black", "white"] } },
  { chapter_num: 4, panel_order: 5, image_key: "BLUE_SKY", caption_template: "The sky above the temple is a clear {BLUE}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "BLUE", options: ["blue", "red", "green"] } },
  { chapter_num: 4, panel_order: 6, image_key: "GREEN_LEAF", caption_template: 'Green leaves are tied near the door. "This {GREEN} leaf brings good luck," Priya says.', interactive_type: "fill_blank", interactive_data: { vocab_key: "GREEN", options: ["green", "yellow", "blue"] } },
  { chapter_num: 4, panel_order: 7, image_key: "YELLOW_GARLANDS", caption_template: "A vendor sells garlands of {YELLOW} marigolds.", interactive_type: "fill_blank", interactive_data: { vocab_key: "YELLOW", options: ["yellow", "saffron", "red"] } },
  { chapter_num: 4, panel_order: 8, image_key: "BLACK_STATUE", caption_template: "Ravi spots a statue made of shiny {BLACK} stone.", interactive_type: "fill_blank", interactive_data: { vocab_key: "BLACK", options: ["black", "white", "gold"] } },

  // Chapter 5: Directions
  { chapter_num: 5, panel_order: 1, image_key: "RAVI_ASKING_DIRECTIONS", caption_template: 'Ravi wants to find the local library. He asks, "{WHERE_IS} the library?"', interactive_type: "fill_blank", interactive_data: { vocab_key: "WHERE_IS", options: ["Where is", "Straight", "Left"] } },
  { chapter_num: 5, panel_order: 2, image_key: "GO_STRAIGHT", caption_template: 'A man points down the street. "Go {STRAIGHT} down this road."', interactive_type: "fill_blank", interactive_data: { vocab_key: "STRAIGHT", options: ["straight", "left", "right"] } },
  { chapter_num: 5, panel_order: 3, image_key: "TAKE_LEFT", caption_template: 'New to town, Ravi is advised: "At the tea shop, you must take a {LEFT}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "LEFT", options: ["left", "right", "straight"] } },
  { chapter_num: 5, panel_order: 4, image_key: "TAKE_RIGHT", caption_template: 'He is told: "Keep walking until you see a big tree, then turn {RIGHT}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "RIGHT", options: ["right", "left", "straight"] } },
  { chapter_num: 5, panel_order: 5, image_key: "RAVI_ASK_RICKSHAW", caption_template: 'Ravi walks for a while. He stops a rickshaw driver. "Is the library {FAR}?"', interactive_type: "fill_blank", interactive_data: { vocab_key: "FAR", options: ["far", "near", "straight"] } },
  { chapter_num: 5, panel_order: 6, image_key: "RICKSHAW_POINTS", caption_template: 'The driver smiles, "No, it is very {NEAR}. Just past that shop."', interactive_type: "fill_blank", interactive_data: { vocab_key: "NEAR", options: ["near", "far", "left"] } },
  { chapter_num: 5, panel_order: 7, image_key: "TURN_CORNER", caption_template: 'The driver advises: "Go to the end of the road and {TURN}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "TURN", options: ["turn", "stop", "straight"] } },
  { chapter_num: 5, panel_order: 8, image_key: "RAVI_ARRIVES_LIBRARY", caption_template: 'Ravi sees the library building. "Please {STOP} here, thank you!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "STOP", options: ["stop", "turn", "left"] } },

  // Chapter 6: Weather & Feelings
  { chapter_num: 6, panel_order: 1, image_key: "RAINY_STREET", caption_template: "The sky turns grey and it starts {RAINING} heavily.", interactive_type: "fill_blank", interactive_data: { vocab_key: "RAINING", options: ["raining", "cold", "hot"] } },
  { chapter_num: 6, panel_order: 2, image_key: "COLD_CAFE", caption_template: "Ravi sits in a small cafe. The air is damp and {COLD}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "COLD", options: ["cold", "hot", "happy"] } },
  { chapter_num: 6, panel_order: 3, image_key: "HOT_COFFEE", caption_template: "He drinks some filter coffee. It warms him up because it is {HOT}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "HOT", options: ["hot", "cold", "raining"] } },
  { chapter_num: 6, panel_order: 4, image_key: "RAVI_LOOKS_PHOTOS", caption_template: "Ravi looks at photos of home. He feels a little {SAD} and homesick.", interactive_type: "fill_blank", interactive_data: { vocab_key: "SAD", options: ["sad", "happy", "tired"] } },
  { chapter_num: 6, panel_order: 5, image_key: "PRIYA_ARRIVES_CAFE", caption_template: "Priya joins him. She sees he is {TIRED} from the long day.", interactive_type: "fill_blank", interactive_data: { vocab_key: "TIRED", options: ["tired", "angry", "sad"] } },
  { chapter_num: 6, panel_order: 6, image_key: "RAVI_PRIYA_LAUGH", caption_template: "They talk about their dreams. Sharing stories makes Ravi feel {HAPPY} again.", interactive_type: "fill_blank", interactive_data: { vocab_key: "HAPPY", options: ["happy", "sad", "angry"] } },
  { chapter_num: 6, panel_order: 7, image_key: "LOUD_THUNDER", caption_template: "A loud thunderclap shakes the windows, causing a brief moment of {FEAR}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "FEAR", options: ["fear", "happy", "tired"] } },
  { chapter_num: 6, panel_order: 8, image_key: "ANGRY_OWNER", caption_template: "The cafe owner yells at a cat stealing milk. He is {ANGRY}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "ANGRY", options: ["angry", "happy", "sad"] } },

  // Chapter 7: Formal
  { chapter_num: 7, panel_order: 1, image_key: "RAVI_WEDDING_DRESS", caption_template: "Ravi receives an invitation. He wears a traditional {WHITE} dhoti.", interactive_type: "fill_blank", interactive_data: { vocab_key: "WHITE", options: ["white", "black", "red"] } },
  { chapter_num: 7, panel_order: 2, image_key: "HOST_WELCOMES_RAVI", caption_template: 'At the wedding hall, the host welcomes him. "{PLEASE_COME} inside, Ravi."', interactive_type: "fill_blank", interactive_data: { vocab_key: "PLEASE_COME", options: ["Please come", "Thank you", "Excuse me"] } },
  { chapter_num: 7, panel_order: 3, image_key: "RAVI_CONGRATULATES", caption_template: 'He meets the bride and groom. He says, "{CONGRATULATIONS} on your wedding!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "CONGRATULATIONS", options: ["Congratulations", "Thank you", "Welcome"] } },
  { chapter_num: 7, panel_order: 4, image_key: "PRIEST_BLESSING", caption_template: "The elder priest gives them his {BLESSINGS}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "BLESSINGS", options: ["blessings", "greetings", "excuse me"] } },
  { chapter_num: 7, panel_order: 5, image_key: "GROOM_SAYS_THANKS", caption_template: 'The groom bows down to the priest and says, "{THANK_YOU}, Sir."', interactive_type: "fill_blank", interactive_data: { vocab_key: "THANK_YOU", options: ["Thank you", "Excuse me", "Please come"] } },
  { chapter_num: 7, panel_order: 6, image_key: "RAVI_APOLOGIZES", caption_template: 'Ravi accidentally steps on someone\'s foot. He says, "{EXCUSE_ME}, I am sorry."', interactive_type: "fill_blank", interactive_data: { vocab_key: "EXCUSE_ME", options: ["Excuse me", "Thank you", "Congratulations"] } },
  { chapter_num: 7, panel_order: 7, image_key: "RAVI_TALKS_MOTHER", caption_template: "He addresses the groom's mother politely as {MADAM}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "MADAM", options: ["Madam", "Sir", "Friend"] } },
  { chapter_num: 7, panel_order: 8, image_key: "RAVI_BIDS_FAREWELL", caption_template: "He bids {GREETINGS} to the newly married couple as they leave.", interactive_type: "fill_blank", interactive_data: { vocab_key: "GREETINGS", options: ["greetings", "excuse me", "please come"] } },

  // Chapter 8: Verbs
  { chapter_num: 8, panel_order: 1, image_key: "STREET_CRICKET", caption_template: "Ravi walks down the street and sees kids ready to {PLAY} cricket.", interactive_type: "fill_blank", interactive_data: { vocab_key: "PLAY", options: ["play", "run", "sit"] } },
  { chapter_num: 8, panel_order: 2, image_key: "KID_RUNNING", caption_template: 'One kid shouts to another, "{RUN} fast to the other end!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "RUN", options: ["run", "throw", "catch"] } },
  { chapter_num: 8, panel_order: 3, image_key: "KID_THROWING", caption_template: 'A fielder picks up the ball. "Now, {THROW} the ball to the wickets!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "THROW", options: ["throw", "catch", "hit"] } },
  { chapter_num: 8, panel_order: 4, image_key: "KID_CATCHING", caption_template: 'The batsman hits it high. A boy gets ready. "{CATCH} the ball!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "CATCH", options: ["catch", "hit", "run"] } },
  { chapter_num: 8, panel_order: 5, image_key: "RAVI_BATTING", caption_template: "Ravi is invited to bat. He swings the bat and tries to {HIT} a six.", interactive_type: "fill_blank", interactive_data: { vocab_key: "HIT", options: ["hit", "throw", "walk"] } },
  { chapter_num: 8, panel_order: 6, image_key: "KIDS_CHEERING", caption_template: "He hits the ball far over the wall. Everyone jumps and is {HAPPY}!", interactive_type: "fill_blank", interactive_data: { vocab_key: "HAPPY", options: ["happy", "sad", "tired"] } },
  { chapter_num: 8, panel_order: 7, image_key: "BOY_JUMP_BIKE", caption_template: "A dog chases the ball, making a boy {JUMP} over a bicycle.", interactive_type: "fill_blank", interactive_data: { vocab_key: "JUMP", options: ["jump", "walk", "sit"] } },
  { chapter_num: 8, panel_order: 8, image_key: "RAVI_WALKING_HOME", caption_template: "After the long game, Ravi wants to {WALK} back home.", interactive_type: "fill_blank", interactive_data: { vocab_key: "WALK", options: ["walk", "run", "jump"] } },

  // Chapter 9: Conversational
  { chapter_num: 9, panel_order: 1, image_key: "RAVI_POND", caption_template: "Ravi is now comfortable in his new town. He walks around the {BEAUTIFUL} pond.", interactive_type: "fill_blank", interactive_data: { vocab_key: "BEAUTIFUL", options: ["beautiful", "ugly", "far"] } },
  { chapter_num: 9, panel_order: 2, image_key: "RAVI_MEETS_TRAVELER", caption_template: "He meets a new traveler who just arrived. Ravi greets his new {FRIEND}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "FRIEND", options: ["friend", "uncle", "father"] } },
  { chapter_num: 9, panel_order: 3, image_key: "TRAVELER_AMAZED", caption_template: 'The traveler is amazed. He says, "{I_LOVE} this town!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "I_LOVE", options: ["I love", "I hate", "Where is"] } },
  { chapter_num: 9, panel_order: 4, image_key: "TRAVELER_ASKING_TIME", caption_template: 'The traveler asks, "{HOW_MUCH_TIME} does the bus take?"', interactive_type: "fill_blank", interactive_data: { vocab_key: "HOW_MUCH_TIME", options: ["How much time", "How much", "Where is"] } },
  { chapter_num: 9, panel_order: 5, image_key: "RAVI_GUIDING_TRAVELER", caption_template: "Ravi guides him warmly. He talks about his travels in {SOUTH_INDIA}.", interactive_type: "fill_blank", interactive_data: { vocab_key: "SOUTH_INDIA", options: ["South India", "North India", "Europe"] } },
  { chapter_num: 9, panel_order: 6, image_key: "TRAVELER_HAPPY", caption_template: "The traveler is {HAPPY} for the warm guidance.", interactive_type: "fill_blank", interactive_data: { vocab_key: "HAPPY", options: ["happy", "sad", "angry"] } },
  { chapter_num: 9, panel_order: 7, image_key: "TRAVELER_ON_BUS", caption_template: 'The bus arrives. As the traveler boards, Ravi says, "{SEE_YOU_AGAIN}!"', interactive_type: "fill_blank", interactive_data: { vocab_key: "SEE_YOU_AGAIN", options: ["See you again", "Goodbye", "Hello"] } },
  { chapter_num: 9, panel_order: 8, image_key: "NIGHT_TOWN", caption_template: 'Night falls over the town. Ravi heads home, thinking, "{GOOD_NIGHT}."', interactive_type: "fill_blank", interactive_data: { vocab_key: "GOOD_NIGHT", options: ["Good night", "Good morning", "Goodbye"] } }
];

console.log(`Inserting ${panels.length} panels...`);
const panelsToInsert = panels.map(p => ({
  chapter_id: idMap[p.chapter_num],
  panel_order: p.panel_order,
  image_key: p.image_key,
  caption_template: p.caption_template,
  interactive_type: p.interactive_type,
  interactive_data: p.interactive_data
}));

const { error: pInsertError } = await supabase.from('story_panels').insert(panelsToInsert);

if (pInsertError) {
  console.error('Failed to insert panels:', pInsertError.message);
  process.exit(1);
}

console.log('Successfully seeded all 9 chapters with 8 panels each.');
process.exit(0);

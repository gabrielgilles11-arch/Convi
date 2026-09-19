# German slang and the Bayern sections, as moments rather than a glossary.

PLAN = {
    # ------------------------------------------------------------------
    "de-slang-reactions": {
        # Kept as words: three one-word verdicts that are already the whole
        # reaction, and whose interest is how young each one sounds.
        "keep": ["de-slang-03", "de-slang-04", "de-slang-05"],
        "scenes": [
            scene(
                "de-slang-sc-01", "de-slang-01", "them",
                "A friend tells you they cycled across the country in four days.",
                "Vier Tage, quer durchs Land.", "Four days, right across the country.",
                "Krass.", "That's intense.",
                "War auch echt hart.", "It was genuinely hard.",
                notes="Krass covers impressive, shocking and appalling. The tone picks which, and it is the single most used slang word in German.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-02", "de-slang-02", "them",
                "Someone plays you the track they've been talking about all week.",
                "Und? Was sagst du?", "So? What do you think?",
                "Das ist geil.", "That's awesome.",
                "Wusste ich's doch.", "I knew it.",
                notes="Geil literally means horny and nobody hears that any more in this use. Still worth knowing before you say it to a colleague.",
            ),
            scene(
                "de-slang-sc-03", "de-slang-06", "them",
                "Someone you haven't seen in a while asks how things are going.",
                "Und sonst so? Alles gut bei dir?", "And otherwise? All fine with you?",
                "Läuft gut.", "It's going well.",
                "Freut mich.", "Glad to hear it.",
                notes="Läuft is the short version, and among younger people it is often the whole answer: läuft, said with a shrug.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-04", "de-slang-15", "them",
                "A friend tells you they got tickets for the sold-out show.",
                "Ich hab zwei Karten bekommen!", "I got two tickets!",
                "Hammer!", "Awesome!",
                "Ich weiß, ich freu mich so.", "I know — I'm so happy.",
                notes="Literally a hammer. Said on its own, and der Hammer as a noun does the same job: das war der Hammer.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-05", "de-slang-16", "them",
                "Someone tells you the queue for the club went round two corners.",
                "Die Schlange ging um zwei Ecken.", "The queue went round two corners.",
                "Wahnsinn.", "Unbelievable.",
                "Wir sind dann heimgegangen.", "We went home in the end.",
                notes="Wahnsinn is madness, and it works for both good and bad news. The tone is the whole difference.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "de-slang-want": {
        # Kept as words: a bracketed fragment, a clipped exclamation, and a
        # refusal whose content is how politely it dodges.
        "keep": ["de-slang-07", "de-slang-19", "de-slang-21"],
        "scenes": [
            scene(
                "de-slang-sc-06", "de-slang-08", "them",
                "A plan is coming together and everyone is saying whether they're coming.",
                "Wir fahren Samstag an den See.", "We're driving to the lake on Saturday.",
                "Ich bin dabei.", "I'm in.",
                "Super, ich schreib dir.", "Great — I'll text you.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-07", "de-slang-17", "them",
                "Somebody suggests a museum on the one afternoon you wanted to do nothing.",
                "Sollen wir ins Museum?", "Shall we go to the museum?",
                "Ich hab keinen Bock drauf.", "I can't be bothered with that.",
                "Okay, dann morgen.", "Okay — tomorrow, then.",
                notes="Bock is the word for wanting to do something at all. Keinen Bock is blunt but not rude among friends.",
            ),
            scene(
                "de-slang-sc-08", "de-slang-18", "them",
                "You've got a spare ticket and want to ask somebody along without making it a thing.",
                "Ich hab Freitag nichts vor.", "I've got nothing on Friday.",
                "Hast du Lust?", "Do you fancy it?",
                "Klar, warum nicht.", "Sure, why not.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-09", "de-slang-20", "them",
                "Someone offers you a schnapps at eleven in the morning.",
                "Einen Schnaps? Geht doch.", "A schnapps? Go on.",
                "Lieber nicht.", "I'd rather not.",
                "Auch gut.", "Fair enough.",
                notes="The softest refusal in the section: it declines the thing without declining the person.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-10", "de-slang-22", "them",
                "The group is planning a third night out in a row and counting heads.",
                "Wer kommt morgen wieder mit?", "Who's coming again tomorrow?",
                "Ich bin raus.", "Count me out.",
                "Schwächling!", "Lightweight!",
                notes="Ich bin raus is out of this particular plan, not out of the friendship. Borrowed from card games.",
                young=True,
            ),
        ],
    },
    # ------------------------------------------------------------------
    "de-slang-address": {
        # Kept as words: three slash pairs, where knowing both halves is the
        # point and neither alone is the entry.
        "keep": ["de-slang-10", "de-slang-11", "de-slang-27"],
        "scenes": [
            scene(
                "de-slang-sc-11", "de-slang-09", "them",
                "A friend tells you they left their phone in the taxi that just drove off.",
                "Mein Handy ist im Taxi.", "My phone's in the taxi.",
                "Alter, im Ernst?", "Dude, seriously?",
                "Ja, echt jetzt.", "Yes — really.",
                notes="Alter is literally 'old one' and means nothing of the kind. Tone is everything: warm it is mate, flat it is a warning.",
            ),
            scene(
                "de-slang-sc-12", "de-slang-23", "you",
                "You want the whole table's attention to say where you're going next.",
                "Leute, wir ziehen weiter!", "Guys, we're moving on!",
                "Ich zahl noch schnell.", "Let me just pay.",
                notes="Leute is the safe one for a mixed group of any age. Jungs and Mädels split it by gender; Leute never has to.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-13", "de-slang-24", "them",
                "The train you needed has been cancelled for the second time today.",
                "Der Zug fällt wieder aus.", "The train's cancelled again.",
                "Mann, nicht schon wieder.", "Man, not again.",
                "Deutsche Bahn eben.", "Deutsche Bahn for you.",
                notes="Mann here is frustration, never a word for a person. Mensch does the same job a shade more gently.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-14", "de-slang-25", "them",
                "A friend turns up with exactly the tool you needed and no explanation.",
                "Hier, hab ich mitgebracht.", "Here — I brought it along.",
                "Danke, Kollege.", "Thanks, mate.",
                "Immer gern.", "Any time.",
                notes="Not your actual colleague. Between friends it is jokey and slightly ironic, like calling somebody 'chief'.",
                young=True,
            ),
            scene(
                "de-slang-sc-15", "de-slang-26", "them",
                "Your partner has brought you coffee without being asked.",
                "Ich hab dir Kaffee gemacht.", "I made you a coffee.",
                "Danke, Schatz.", "Thanks, love.",
                "Gern geschehen.", "You're welcome.",
                notes="Schatz is treasure, and it is for partners and close family only. Said to a stranger it is either flirting or an insult.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "de-slang-micro": {
        # Kept as words: one with an arrow in it, one the entry itself warns is
        # rude, and the yes-and-no word.
        "keep": ["de-slang-12", "de-slang-14", "de-slang-32"],
        "scenes": [
            scene(
                "de-slang-sc-16", "de-slang-13", "them",
                "Nobody at the table believes the story you've just told.",
                "Das glaub ich dir nicht.", "I don't believe you.",
                "Ich schwöre.", "I swear.",
                "Na gut, erzähl weiter.", "All right — go on.",
                notes="Very young and very common. Among people over thirty it will get you a look.",
                young=True,
            ),
            scene(
                "de-slang-sc-17", "de-slang-28", "them",
                "Someone works out for themselves the thing you were trying to explain.",
                "Also erst die U-Bahn, dann der Bus?", "So the U-Bahn first, then the bus?",
                "Genau.", "Exactly.",
                "Alles klar.", "Got it.",
                notes="Also filler. A German will say genau three times while deciding what to say next, and it means nothing at all those times.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-18", "de-slang-29", "them",
                "You've been confused for five minutes and somebody finally explains why.",
                "Der Laden hat sonntags zu.", "The shop is closed on Sundays.",
                "Ach so!", "Ohh, I see!",
                "Ja, hier ist sonntags alles zu.", "Yes — everything's shut here on Sundays.",
                notes="The realisation noise, and one of the first things you'll catch yourself saying without deciding to.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-19", "de-slang-30", "them",
                "A friend says they're moving to another country in three weeks.",
                "Ich zieh in drei Wochen weg.", "I'm moving away in three weeks.",
                "Echt jetzt?", "Seriously?",
                "Ja, ist schon entschieden.", "Yes — it's decided.",
                difficulty="easy",
            ),
            scene(
                "de-slang-sc-20", "de-slang-31", "them",
                "Someone claims the beer here is cheaper than the water.",
                "Bier ist billiger als Wasser hier.", "Beer is cheaper than water here.",
                "Quatsch!", "Nonsense!",
                "Guck doch auf die Karte.", "Look at the menu, then.",
                notes="Quatsch is rubbish, said about the claim rather than the person, which is what keeps it friendly.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "de-bayern-greetings": {
        # Kept as words: the one that means both hello and goodbye (which is
        # the lesson, not a moment), a slash pair, and the group greeting that
        # would otherwise be a second answer to the same situation.
        "keep": ["de-bayern-01", "de-bayern-03", "de-bayern-12"],
        "scenes": [
            scene(
                "de-bayern-sc-01", "de-bayern-02", "them",
                "You walk into a bakery in Munich and the woman behind the counter looks up.",
                "Grüß Gott, was darf's sein?", "Good day — what can I get you?",
                "Grüß Gott!", "Good day!",
                "Also, was hätten S' gern?", "So, what would you like?",
                notes="Standard German, not dialect, and safe with absolutely anyone in the south. Hallo marks you as a northerner within one word.",
                region="bayern",
                difficulty="easy",
            ),
            scene(
                "de-bayern-sc-02", "de-bayern-08", "them",
                "A friend's grandfather greets you at the door of a village house.",
                "Ja, wer kommt denn da?", "Well, look who's here.",
                "Griaß di!", "Hello!",
                "Setz di her.", "Sit yourself down.",
                notes="Warmer and more local than Servus, and for one person only. Say it to a table and you have said the wrong thing.",
                region="bayerisch",
                difficulty="easy",
            ),
            scene(
                "de-bayern-sc-03", "de-bayern-09", "them",
                "You arrive at a table of six in a beer garden and they all look up at once.",
                "Ah, da bist du ja!", "Ah, there you are!",
                "Griaß eich!", "Hello, all of you!",
                "Setz di doch her.", "Sit yourself down with us.",
                notes="The plural of Griaß di. Bavarian keeps the singular and the plural apart where English gave up, and getting it right is noticed.",
                region="bayerisch",
                difficulty="easy",
            ),
            scene(
                "de-bayern-sc-04", "de-bayern-10", "them",
                "You're introduced to somebody's father, who puts out his hand.",
                "Das ist mein Vater.", "This is my father.",
                "Habedehre!", "Pleased to meet you!",
                "Freut mi.", "Pleasure.",
                notes="Literally 'I have the honour', squashed into one word. Old-fashioned, slightly formal, and it will make a Bavarian smile.",
                region="bayerisch",
            ),
            scene(
                "de-bayern-sc-05", "de-bayern-11", "them",
                "You're leaving a shop in a small Bavarian town with your bag.",
                "Auf Wiederschaun und schönen Tag!", "Goodbye and have a lovely day!",
                "Wiederschaun!", "Goodbye!",
                "Pfiat di!", "Bye now!",
                notes="The southern auf Wiedersehen, and what you will actually hear in a shop. Tschüss is northern and sounds it.",
                region="bayerisch",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "de-bayern-flavor": {
        # Kept as words: a particle with no translation, a sigh, and a noun for
        # a kind of person.
        "keep": ["de-bayern-04", "de-bayern-05", "de-bayern-18"],
        "scenes": [
            scene(
                "de-bayern-sc-06", "de-bayern-13", "them",
                "Somebody insists the Oktoberfest beer is watered down.",
                "Des Bier is verdünnt, sag i dir.", "That beer's watered down, I'm telling you.",
                "Schmarrn!", "Nonsense!",
                "Glaubst mir halt ned.", "You just don't believe me.",
                notes="A Schmarrn is a shredded pancake. As an exclamation it is rubbish, nonsense, and it is used far more often than the pudding is eaten.",
                region="bayerisch",
            ),
            scene(
                "de-bayern-sc-07", "de-bayern-14", "them",
                "Somebody is trying to hurry you through a meal you are enjoying.",
                "Kommst jetzt, wir müssen los!", "Come on, we've got to go!",
                "Ned hudeln!", "Don't rush!",
                "Ja ja, is ja gut.", "All right, all right.",
                notes="Two words holding an entire attitude to time. Said to anybody in a hurry, with complete sincerity.",
                region="bayerisch",
            ),
            scene(
                "de-bayern-sc-08", "de-bayern-15", "them",
                "You're asked to commit to a plan for a weekend three months away.",
                "Kommst im August mit?", "Are you coming along in August?",
                "Schaug ma moi.", "We'll see.",
                "Passt scho.", "Fair enough.",
                notes="Literally 'let's have a look'. It is the Bavarian shrug, and it is neither a yes nor a no on purpose.",
                region="bayerisch",
            ),
            scene(
                "de-bayern-sc-09", "de-bayern-16", "them",
                "Somebody is pouring and asks how much you want.",
                "Wie viel magst?", "How much would you like?",
                "Nur a bisserl.", "Just a little.",
                "Sag Bescheid, wenn's reicht.", "Say when.",
                notes="A bisserl is ein bisschen, southern. The -erl ending is all over Bavarian and makes everything smaller and fonder.",
                region="bayerisch",
                difficulty="easy",
            ),
            scene(
                "de-bayern-sc-10", "de-bayern-17", "them",
                "A friend has walked into the same glass door twice in one evening.",
                "Hast du das nicht gesehen?", "Did you not see that?",
                "I bin heut deppert.", "I'm being daft today.",
                "Des sieht ma.", "You can tell.",
                notes="Deppert is daft, and mild enough to say to a friend's face. A Depp is the person; deppert is how they are being.",
                region="bayerisch",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "de-bayern-extra": {
        # Kept as words: a motto, a pronunciation test, and a meal that is a
        # thing rather than a thing anybody says.
        "keep": ["de-bayern-19", "de-bayern-20", "de-bayern-24"],
        "scenes": [
            scene(
                "de-bayern-sc-11", "de-bayern-06", "them",
                "You've apologised twice for being forty cents short and they've stopped listening.",
                "Es fehlen vierzig Cent.", "You're forty cents short.",
                "Passt scho.", "It's fine.",
                "Dann halt beim nächsten Mal.", "Next time, then.",
                notes="The most Bavarian two words there are: it is fine, leave it, do not make it a thing. Also what you say instead of keeping the change.",
                region="bayerisch",
            ),
            scene(
                "de-bayern-sc-12", "de-bayern-07", "them",
                "It's late at the Wiesn and somebody has been waiting for you to say something.",
                "Und? Sagst nix?", "Well? Nothing to say?",
                "I mog di.", "I like you.",
                "Des is schee.", "That's lovely.",
                notes="Dialect for ich mag dich, and it carries more weight down here than the standard version does. Not a thing to say lightly.",
                region="bayerisch",
                difficulty="hard",
            ),
            scene(
                "de-bayern-sc-13", "de-bayern-21", "them",
                "You're at a Munich bakery counter and the word you learned in Berlin is the wrong one.",
                "Was darf's denn sein?", "What can I get you?",
                "Zwoa Semmeln, bitte.", "Two bread rolls, please.",
                "Sonst noch was?", "Anything else?",
                notes="A Semmel in Bayern, a Schrippe in Berlin, a Brötchen in most of the rest. Same roll, three words, and locals notice which you use.",
                region="bayerisch",
                difficulty="easy",
            ),
            scene(
                "de-bayern-sc-14", "de-bayern-22", "them",
                "You're in a beer garden and want the size the locals are drinking.",
                "A Maß?", "A litre?",
                "Na, a Hoibe bitte.", "No — a half, please.",
                "Kommt sofort.", "Coming right up.",
                notes="A Hoibe is the half-litre, and it is what most people at the table are actually drinking. The litre Maß is for the Wiesn and for tourists.",
                region="bayerisch",
                difficulty="easy",
            ),
            scene(
                "de-bayern-sc-15", "de-bayern-23", "them",
                "It's a hot afternoon and you want something you can drink two of.",
                "Und für Sie?", "And for you?",
                "A Radler, bitte.", "A shandy, please.",
                "Gern, kommt gleich.", "Of course — right away.",
                notes="Beer with lemonade, named after the cyclists it was invented for. Orderable anywhere in Bayern without a single raised eyebrow.",
                region="bayern",
                difficulty="easy",
            ),
        ],
    },
}

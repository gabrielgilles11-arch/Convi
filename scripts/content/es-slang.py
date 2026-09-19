# Spanish slang, as moments rather than a glossary.
#
# Every scene is built around one word from the list beside it, in a situation
# that word actually turns up in. The three words left in the deck per
# subsection are the ones that resist a scene: sentence-openers, fragments with
# a slash in them, and nouns for people rather than things anybody says.

PLAN = {
    # ------------------------------------------------------------------
    "slang-everyday": {
        # Kept as words: two sentence-openers and a line whose slash makes it
        # unfair to type.
        "keep": ["slang-01", "slang-12", "slang-13"],
        "scenes": [
            scene(
                "slang-sc-01", "slang-02", "them",
                "It's four in the morning and a friend dares you to get in the fountain.",
                "¿Te tiras a la fuente o qué?", "Are you getting in the fountain or what?",
                "Ni de broma.", "Not a chance.",
                "Qué aburrido eres.", "You're no fun.",
                notes="Ni de broma is a flat no — literally 'not even as a joke'. It is the polite half of the pair; ni de coña is the same thing a notch cruder.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-02", "slang-03", "them",
                "After three late nights, someone asks whether you're up for one more.",
                "¿Te apuntas otra vez esta noche?", "Are you in again tonight?",
                "Estoy a tope, vamos.", "I'm on full power — let's go.",
                "Así me gusta.", "That's what I like to hear.",
                notes="Estar a tope is being at full capacity. It works for your own energy and for a bar that's rammed, which is why it turns up everywhere.",
            ),
            scene(
                "slang-sc-03", "slang-04", "them",
                "A friend can't choose between two bars and keeps asking what you think.",
                "¿Vamos al de siempre o probamos el nuevo?", "The usual place, or shall we try the new one?",
                "Me da igual, decide tú.", "I don't mind — you pick.",
                "Pues el nuevo.", "The new one, then.",
                notes="Me da igual is genuinely neutral, not sulky. Say it with a shrug and a smile or it lands as 'whatever'.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-04", "slang-05", "them",
                "You mention the place you came to see and are told it shut down.",
                "Eso cerró el año pasado.", "That closed down last year.",
                "Qué pena, tenía muchas ganas.", "What a shame — I really wanted to see it.",
                "Te llevo a uno mejor.", "I'll take you to a better one.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-05", "slang-06", "you",
                "A friend brings you up to the rooftop bar they picked and waits for your verdict.",
                "Mola un montón este sitio.", "This place is seriously cool.",
                "¿A que sí? Lo descubrí el mes pasado.", "Right? I found it last month.",
                notes="Mola is the everyday 'it's cool', and it conjugates: me mola, te mola, molaría.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "slang-friendly": {
        # Kept as words: a slash pair, and two exclamations that are already
        # whole reactions on their own.
        "keep": ["slang-08", "slang-15", "slang-17"],
        "scenes": [
            scene(
                "slang-sc-06", "slang-07", "them",
                "Someone sorts out the table you'd been told was impossible to get.",
                "Ya está, nos guardan la mesa.", "Done — they're holding the table for us.",
                "¡Qué crack eres!", "You absolute legend!",
                "No es nada, hombre.", "It's nothing, honestly.",
                notes="Un crack is someone who is brilliant at something. Said to a friend it is pure praise; said flatly it can be sarcasm, so keep the energy up.",
            ),
            scene(
                "slang-sc-07", "slang-09", "them",
                "A friend plays you the band they've been going on about all week.",
                "Esta es la canción que te decía.", "This is the song I was telling you about.",
                "Me flipa, ponla otra vez.", "I love it — put it on again.",
                "Sabía que te iba a gustar.", "I knew you'd like it.",
                notes="Flipar is to be blown away. Me flipa is I love it; estoy flipando is I can't believe what I'm seeing.",
            ),
            scene(
                "slang-sc-08", "slang-14", "you",
                "Your team scores in the last minute and the whole bar is on its feet.",
                "¡Toma ya, en el último minuto!", "Get in — in the last minute!",
                "¡Qué remontada!", "What a comeback!",
                notes="¡Toma ya! is the noise you make when something lands. It belongs to the moment, not to the conversation afterwards.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-09", "slang-16", "them",
                "Someone tells you they queued nine hours for a ticket and you don't believe a word.",
                "Estuve nueve horas en la cola.", "I was in that queue for nine hours.",
                "¡Anda ya!", "Get out of here!",
                "Te lo juro, mira la foto.", "I swear — look at the photo.",
                notes="¡Anda ya! is friendly disbelief, not an accusation. It invites the story rather than ending it.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-10", "slang-18", "them",
                "A friend is telling a story so badly that you can't stop laughing.",
                "No te rías, que voy en serio.", "Don't laugh — I'm being serious.",
                "Es que me parto contigo.", "You're killing me, honestly.",
                "Encima te ríes.", "And now you're laughing at me.",
                notes="Partirse is to split — with laughter. Me parto is I'm in bits; me parto contigo is you're the reason.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "slang-intensifiers": {
        # Kept as words: a filler, a set phrase that needs its "es…" frame, and
        # one that changes meaning with the verb in front of it.
        "keep": ["slang-11", "slang-20", "slang-24"],
        "scenes": [
            scene(
                "slang-sc-11", "slang-10", "them",
                "Someone asks whether the neighbourhood you stayed in was any good.",
                "¿Y qué tal el barrio?", "So how was the neighbourhood?",
                "Me gustó un montón.", "I liked it a whole lot.",
                "Es de los mejores.", "It's one of the best.",
                notes="Un montón is a pile of something, used for anything you have a lot of — time, sleep, opinions.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-12", "slang-19", "them",
                "A friend asks how many people turned up to the thing you went to.",
                "¿Fue mucha gente?", "Did many people go?",
                "Había mogollón.", "There were loads.",
                "Pues me lo he perdido.", "And I missed it.",
                notes="Mogollón leans Madrid but is understood everywhere. It works alone, as here, or in front of a noun: mogollón de gente.",
                region="madrid",
            ),
            scene(
                "slang-sc-13", "slang-21", "you",
                "You get to the door of the bar, see the crowd inside, and turn to your friend.",
                "Está petado, no cabe nadie más.", "It's rammed — there's no room for anyone else.",
                "Vamos al de al lado.", "Let's go to the one next door.",
                notes="Petado is packed to bursting, for rooms and for phones. It agrees with what it describes: el bar está petado, la sala está petada.",
            ),
            scene(
                "slang-sc-14", "slang-22", "them",
                "Someone asks whether you're going to take the language thing seriously this trip.",
                "¿Vas a practicar español en serio?", "Are you going to properly practise your Spanish?",
                "Voy a saco.", "I'm going all out.",
                "Así se habla.", "Now you're talking.",
                notes="A saco is full commitment, with no half measures. It attaches to any verb: entrar a saco, ir a saco.",
            ),
            scene(
                "slang-sc-15", "slang-23", "them",
                "A friend suggests you get up on stage and sing at the karaoke bar.",
                "Sube tú primero y cantas algo.", "You go up first and sing something.",
                "Ni de coña subo yo ahí.", "There's no chance I'm going up there.",
                "Cobarde.", "Coward.",
                notes="Ni de coña is ni de broma with the safety off. Fine among friends, worth avoiding with anyone's parents.",
                young=True,
            ),
        ],
    },
    # ------------------------------------------------------------------
    "slang-glue": {
        # Kept as words: three sentence-openers. They start a line rather than
        # being one, so asking someone to produce one from a scene would be
        # asking for the wrong half of the sentence.
        "keep": ["slang-25", "slang-30", "slang-31"],
        "scenes": [
            scene(
                "slang-sc-16", "slang-26", "them",
                "The plan has fallen through and there's nothing left to arrange.",
                "Al final no hay entradas para nadie.", "In the end there are no tickets for anyone.",
                "Pues nada, otro día será.", "Ah well — another day, then.",
                "Eso, otro día.", "Exactly — another day.",
                notes="Pues nada closes a conversation without ending it badly. It is what Spaniards say instead of a long goodbye.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-17", "slang-27", "them",
                "You've said no twice to one more drink and they ask a third time.",
                "¿Seguro que no quieres otra?", "Are you sure you don't want another?",
                "Venga, va, la última.", "Oh go on then — the last one.",
                "Esa ya la he oído antes.", "I've heard that one before.",
                notes="Venga, va is giving in with good grace. The same two words nudge somebody else along, depending on who is stalling.",
            ),
            scene(
                "slang-sc-18", "slang-28", "them",
                "Someone assumes you must be finding the heat unbearable.",
                "Estarás muriéndote de calor, ¿no?", "You must be dying in this heat, no?",
                "Qué va, se está bien.", "Not at all — it's fine.",
                "Eso es que ya te has aclimatado.", "That means you've acclimatised.",
                notes="Qué va is a soft no, much gentler than ni de broma. It contradicts the idea, not the person.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-19", "slang-29", "them",
                "A friend is explaining the metro route to you for the third time.",
                "Y te bajas en la segunda parada, ¿eh?", "And you get off at the second stop, all right?",
                "Vale, vale, que ya lo tengo.", "Yeah yeah — I've got it.",
                "Es que la última vez te perdiste.", "It's just that last time you got lost.",
                notes="Doubling vale adds impatience. One vale is agreement; two is I heard you the first time.",
                difficulty="easy",
            ),
            scene(
                "slang-sc-20", "slang-32", "them",
                "Someone suggests you ring the landlord about the broken boiler yourself.",
                "Llámale tú, que es tu piso.", "You call him — it's your flat.",
                "Me da palo llamar.", "I can't face making the call.",
                "Te acompaño si quieres.", "I'll do it with you if you like.",
                notes="Dar palo is the small dread of doing something mildly awkward. There is no English word for it, which is why it gets used constantly.",
                difficulty="hard",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "slang-madrid": {
        # Kept as words: an infinitive, a noun for a kind of person, and one
        # that is a joke about being old-fashioned rather than a line.
        "keep": ["slang-37", "slang-38", "slang-40"],
        "scenes": [
            scene(
                "slang-sc-21", "slang-33", "them",
                "A friend in Madrid asks what you made of the place they sent you to.",
                "¿Qué tal el sitio que te dije?", "How was the place I told you about?",
                "Mazo bien, gracias.", "Really good, thanks.",
                "Te lo dije.", "Told you.",
                notes="Mazo is the Madrid intensifier, and it goes in front of anything: mazo bien, mazo de gente, mazo caro.",
                region="madrid",
            ),
            scene(
                "slang-sc-22", "slang-34", "them",
                "It's late, the metro has stopped, and someone asks where the party moves to.",
                "¿Y ahora dónde seguimos?", "So where do we carry on?",
                "Nos vamos a la keli.", "We're going back to mine.",
                "Yo llevo hielo.", "I'll bring ice.",
                notes="La keli is your place, from caló. Young, Madrid, and never said about somebody else's flat you don't know.",
                region="madrid",
                young=True,
                difficulty="hard",
            ),
            scene(
                "slang-sc-23", "slang-35", "them",
                "You're about to leave the bar and can't find what you came in wearing.",
                "¿Te falta algo?", "Are you missing something?",
                "No encuentro la chupa.", "I can't find my jacket.",
                "Mira detrás de la barra.", "Have a look behind the bar.",
                notes="La chupa is any jacket at all, not only a leather one, and it is what people actually say in Madrid.",
                region="madrid",
            ),
            scene(
                "slang-sc-24", "slang-36", "you",
                "Someone in the group has been quiet all night and you want to check on them warmly.",
                "¿Todo bien, tronco?", "You all right, mate?",
                "Sí, solo estoy cansado.", "Yeah — just tired.",
                notes="Tronco is retro and still heard. Tronca for a woman. It lands as affectionate rather than cool, which is the joke.",
                region="madrid",
            ),
            scene(
                "slang-sc-25", "slang-39", "you",
                "You've had enough of the night and want to tell your friends you're off.",
                "Me piro, que mañana madrugo.", "I'm off — I'm up early tomorrow.",
                "Escríbenos cuando llegues.", "Text us when you're home.",
                notes="Pirarse is to bail. Me piro is the announcement; nos piramos takes the group with you.",
                region="madrid",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "slang-catalan": {
        # Kept as words: two slash pairs and an expression with no English
        # equivalent to hang a scene on.
        "keep": ["slang-42", "slang-44", "slang-48"],
        "scenes": [
            scene(
                "slang-sc-26", "slang-41", "them",
                "You walk into a bakery in Barcelona in the morning and the owner looks up.",
                "Bon dia, què et poso?", "Morning — what can I get you?",
                "Bon dia!", "Morning!",
                "Molt bé, ara mateix.", "Great — coming right up.",
                notes="Catalan, not Spanish. Bon dia before anything else is the single highest-return thing you can say in Barcelona, and it changes how the rest of the exchange goes.",
                region="catalan",
                difficulty="easy",
            ),
            scene(
                "slang-sc-27", "slang-43", "you",
                "You're ordering in Catalan for the first time and want to get the 'please' right.",
                "Un cafè, si us plau.", "A coffee, please.",
                "Ara te'l porto.", "I'll bring it over.",
                notes="Si us plau is the Catalan please. Three words, said as one.",
                region="catalan",
            ),
            scene(
                "slang-sc-28", "slang-45", "them",
                "You're leaving a shop in Gràcia and the owner says goodbye as you go.",
                "Adéu, fins aviat!", "Bye — see you soon!",
                "Adéu!", "Bye!",
                "Fins la propera.", "Until next time.",
                notes="Adéu covers both bye and see you. Mirroring it back is all that's wanted.",
                region="catalan",
                difficulty="easy",
            ),
            scene(
                "slang-sc-29", "slang-46", "them",
                "Everyone has their coat on and one friend is still finishing their drink.",
                "Ja estem tots?", "Are we all ready?",
                "Som-hi!", "Let's go!",
                "Doncs anem.", "Off we go, then.",
                notes="Som-hi is the Catalan let's go, for setting off and for starting anything.",
                region="catalan",
            ),
            scene(
                "slang-sc-30", "slang-47", "them",
                "A friend is dragging their feet and the table is booked for ten minutes' time.",
                "Espera, que acabo això.", "Hang on, let me finish this.",
                "Vinga, que arribem tard!", "Come on — we're going to be late!",
                "Ja vaig, ja vaig.", "I'm coming, I'm coming.",
                notes="Vinga is the Catalan cousin of venga, and does the same two jobs: hurrying someone along, and giving in.",
                region="catalan",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "slang-barcelona": {
        # Kept as words: three that are about naming a kind of person or a way
        # of behaving, rather than lines anyone says out loud.
        "keep": ["slang-52", "slang-53", "slang-54"],
        "scenes": [
            scene(
                "slang-sc-31", "slang-49", "them",
                "You want a cortado in Barcelona and the waiter is waiting for the local word.",
                "Digui'm, què voldrà?", "Go ahead — what will it be?",
                "Un tallat, si us plau.", "A cortado, please.",
                "Ara mateix.", "Right away.",
                notes="Un tallat is what the menu says in Barcelona. Ask for a cortado and you'll be understood; ask for a tallat and you'll be answered in Catalan.",
                region="barcelona",
            ),
            scene(
                "slang-sc-32", "slang-50", "them",
                "You're hungry, it's four in the afternoon, and the kitchen is shut.",
                "La cuina està tancada fins al vespre.", "The kitchen is shut until the evening.",
                "¿Me pones un bikini entonces?", "Can I have a bikini, then?",
                "Eso sí, ahora te lo hago.", "That I can do — coming up.",
                notes="Un bikini is a ham-and-cheese toastie, named after the Sala Bikini. It is on every menu in Barcelona and visitors never order it.",
                region="barcelona",
            ),
            scene(
                "slang-sc-33", "slang-51", "them",
                "Someone you've been chatting to at the bar mentions they're on a break from work.",
                "A quina hora plegues?", "What time do you knock off?",
                "Plego a les vuit.", "I finish at eight.",
                "Doncs ens veiem després.", "See you afterwards, then.",
                notes="Plegar is to knock off work — folding up for the day. In Barcelona it is more common than salir or acabar.",
                region="catalan",
                difficulty="hard",
            ),
            scene(
                "slang-sc-34", "slang-55", "you",
                "You come around the corner and the whole city is laid out below you.",
                "Quina passada de vistes!", "What an incredible view!",
                "I de nit encara més.", "And even better at night.",
                notes="Quina passada is how amazing, for anything that goes beyond what you expected.",
                region="catalan",
            ),
            scene(
                "slang-sc-35", "slang-56", "them",
                "A friend starts gossiping about someone and you spot that person two tables away.",
                "Pues su novio me dijo que…", "Well, her boyfriend told me that…",
                "Calla, que hi ha roba estesa.", "Shush — there's company.",
                "Uy, perdona.", "Oops — sorry.",
                notes="Literally 'there's laundry hanging out': careful, we can be overheard. One of the most useful things you can be told in a bar.",
                region="catalan",
                difficulty="hard",
            ),
        ],
    },
}

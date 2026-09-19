# The rest of the Spanish word lists, as moments.
#
# Cuss words, flirting, going-out slang, the drunk scale and the morning after.
# Flirting is the easiest of these to convert and the most worth converting:
# the lines were already whole sentences, they were just being asked as
# vocabulary. Giving each one the moment it belongs to is the whole change.

PLAN = {
    # ------------------------------------------------------------------
    "cuss-common": {
        # Kept as words: the three child-safe swaps, which are interesting
        # precisely as words — what they stand in for is the lesson.
        "keep": ["cuss-08", "cuss-09", "cuss-10"],
        "scenes": [
            scene(
                "cuss-sc-01", "cuss-01", "them",
                "You've just been told the last train left twenty minutes ago.",
                "El último tren ya se ha ido.", "The last train has already gone.",
                "Joder, ¿en serio?", "Damn it — seriously?",
                "Te pido un taxi.", "I'll get you a taxi.",
                notes="Joder is the all-purpose Spanish swear and it is everywhere, including on the news. Strong, but not shocking.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-02", "cuss-02", "you",
                "You reach for your wallet on the way out of the bar and the pocket is empty.",
                "Mierda, me he dejado la cartera dentro.", "Crap — I've left my wallet inside.",
                "Corre, que aún están abiertos.", "Run — they're still open.",
                notes="Mierda is the everyday one, about level with 'crap'. Safe in almost any company that isn't your host's grandmother.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-03", "cuss-03", "them",
                "A friend shows you the bill for a round nobody expected to cost that much.",
                "Mira lo que nos han cobrado.", "Look what they charged us.",
                "¡Hostia, qué caro!", "Bloody hell, that's expensive!",
                "Nos han visto venir.", "They saw us coming.",
                notes="Hostia is the communion wafer, which is why it lands harder than it looks. Very Spain, and not for a first meeting with anyone religious.",
            ),
            scene(
                "cuss-sc-04", "cuss-07", "them",
                "You stub your toe in a flat where somebody's small children are listening.",
                "¡Cuidado con el escalón!", "Mind the step!",
                "¡Jolín, qué daño!", "Ouch, that hurt!",
                "¿Te has hecho algo?", "Have you hurt yourself?",
                notes="Jolín is the version you can say in front of children — the same slot as joder, none of the trouble.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-05", "cuss-11", "them",
                "You arrive to find the flat you booked double-booked and nobody at the desk.",
                "No hay nadie aquí hasta las seis.", "There's nobody here until six.",
                "¡Vaya tela!", "What a mess!",
                "Lo siento, es lo que hay.", "Sorry — it is what it is.",
                notes="Vaya tela is dismay at a situation rather than at a person, which is what makes it safe to say out loud.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "cuss-annoying": {
        # Kept as words: three nouns for a kind of person. You say them about
        # somebody, rarely to them, so there is no line to produce.
        "keep": ["cuss-12", "cuss-13", "cuss-17"],
        "scenes": [
            scene(
                "cuss-sc-06", "cuss-14", "them",
                "A friend asks how the work event you were dreading actually went.",
                "¿Y qué tal la cena de empresa?", "So how was the work dinner?",
                "Fue un rollo.", "It was a drag.",
                "Ya me lo imaginaba.", "I thought as much.",
                notes="Ser un rollo is to be tedious. Note the difference from buen rollo, which is good vibes — same word, different job.",
            ),
            scene(
                "cuss-sc-07", "cuss-15", "them",
                "The flat's hot water has been broken for a week and nobody has fixed it.",
                "Han dicho que vienen el viernes.", "They've said they'll come on Friday.",
                "Estoy hasta el gorro.", "I've had it up to here.",
                "Pues llámales otra vez.", "Then call them again.",
                notes="Literally 'up to the hat'. Estar hasta el gorro is fed up but still printable; the ruder versions swap the hat for something else.",
            ),
            scene(
                "cuss-sc-08", "cuss-16", "them",
                "Someone who never pays for a round asks you to get theirs again.",
                "¿Me pides tú la mía y ya te la paso?", "Get mine and I'll send you the money?",
                "¡Qué morro tienes!", "You've got some nerve!",
                "Que sí, que esta vez te la paso.", "I will, honestly, this time.",
                notes="Tener morro is to have cheek. Said with a laugh it is teasing; said flatly it is an accusation.",
            ),
            scene(
                "cuss-sc-09", "cuss-04", "them",
                "Someone has asked you the same question four times in ten minutes.",
                "Pero ¿seguro que no te importa?", "But are you sure you don't mind?",
                "Qué pesado eres.", "You're such a pain.",
                "Vale, ya paro.", "All right, I'll stop.",
                notes="Pesado is heavy going — someone who won't let a thing drop. It agrees with who you are talking to: pesado, pesada.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-10", "cuss-05", "them",
                "Somebody who has been needling you all evening starts again.",
                "Es que tú no te enteras de nada.", "You just don't get anything, do you.",
                "Vete a la mierda.", "Go to hell.",
                "Oye, era broma.", "Hey — I was joking.",
                notes="This ends the conversation and possibly the friendship. Worth recognising more than saying.",
                difficulty="hard",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "cuss-escape-hatch": {
        # Kept as words: three whose value is in the idiom rather than in the
        # moment — you meet them in somebody else's mouth first.
        "keep": ["cuss-19", "cuss-21", "cuss-23"],
        "scenes": [
            scene(
                "cuss-sc-11", "cuss-06", "them",
                "You swear without thinking and the table goes quiet.",
                "¿Perdona?", "Excuse me?",
                "Perdón, se me fue.", "Sorry — that slipped out.",
                "No pasa nada, hombre.", "It's fine, honestly.",
                notes="Irse is to go — here, out of your mouth before you caught it. The single most useful sentence in this whole section.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-12", "cuss-18", "them",
                "A joke you made has landed badly and the other person has stopped smiling.",
                "Pues no me ha hecho gracia.", "Well, I didn't find that funny.",
                "Era broma, ¿eh?", "It was a joke, all right?",
                "Ya, pero avisa.", "Sure — but warn me next time.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-13", "cuss-20", "them",
                "You've complained about tourists and realised too late who you're talking to.",
                "Oye, que yo también soy turista.", "Hey — I'm a tourist too.",
                "No lo decía por ti.", "I didn't mean you.",
                "Ya, ya, tranquilo.", "Sure, sure — relax.",
                difficulty="easy",
            ),
            scene(
                "cuss-sc-14", "cuss-22", "them",
                "You went further than you meant to in an argument and the room noticed.",
                "Creo que te has pasado.", "I think you went too far.",
                "Perdona, me he pasado.", "Sorry — I went too far.",
                "Gracias por decirlo.", "Thanks for saying so.",
            ),
            scene(
                "cuss-sc-15", "cuss-24", "them",
                "You said something about a friend's city that you'd like back.",
                "¿En serio piensas eso de Madrid?", "Do you really think that about Madrid?",
                "Lo retiro.", "I take it back.",
                "Menos mal.", "Just as well.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "flirting-compliments": {
        # Kept as words: three that read as observations about a person rather
        # than as an opening line.
        "keep": ["flirt-16", "flirt-18", "flirt-19"],
        "scenes": [
            scene(
                "flirt-sc-01", "flirt-01", "them",
                "Someone you like has just walked in and said hello.",
                "¡Hola! ¿Qué haces por aquí?", "Hey! What are you doing here?",
                "Qué guapa estás.", "You look beautiful.",
                "Anda ya, tú sí que vas bien.", "Oh come on — you're the one who looks good.",
                notes="Estar guapa is how you look tonight; ser guapa is how you look always. Estar is the compliment, and the safer of the two.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-02", "flirt-02", "them",
                "Someone asks what you think of the jacket they bought that afternoon.",
                "¿Qué tal me queda?", "How does it look on me?",
                "Te queda muy bien.", "It looks great on you.",
                "Pues me la quedo.", "I'm keeping it, then.",
                notes="Quedar bien is about the fit and the look of a thing on a person — safe, specific and easy to say.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-03", "flirt-03", "them",
                "You've been talking for an hour and want to say something warmer than nice shoes.",
                "¿Y qué te parece la gente de aquí?", "So what do you make of the people here?",
                "Me encanta tu estilo.", "I love your style.",
                "Gracias, qué majo.", "Thank you — that's kind.",
            ),
            scene(
                "flirt-sc-04", "flirt-04", "them",
                "They laugh at something you said and you want to say what you noticed.",
                "Ay, qué tonto eres.", "Oh, you're daft.",
                "Tienes una sonrisa preciosa.", "You have a beautiful smile.",
                "Para, que me pongo roja.", "Stop — you're making me blush.",
            ),
            scene(
                "flirt-sc-05", "flirt-17", "them",
                "The conversation has been easy all evening and you want to say so before it ends.",
                "Qué rápido se ha pasado la noche.", "The night has gone so fast.",
                "Contigo se habla muy a gusto.", "You're really easy to talk to.",
                "Pues quedamos otro día.", "Let's do it again another day, then.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "flirting-bolder": {
        # Kept as words: two that are closing lines with no reply to build on,
        # and one whose meaning is the nuance rather than the words.
        "keep": ["flirt-21", "flirt-22", "flirt-24"],
        "scenes": [
            scene(
                "flirt-sc-06", "flirt-05", "them",
                "You've been talking a while and decide to be straightforward about it.",
                "¿Y tú qué buscas exactamente?", "And what exactly are you looking for?",
                "Me pareces muy atractiva.", "I find you very attractive.",
                "Directo, me gusta.", "Straight to it — I like that.",
                notes="Pareces softens it into an opinion rather than a verdict, which is what keeps it from landing as a line.",
            ),
            scene(
                "flirt-sc-07", "flirt-06", "them",
                "They ask, half joking, why you've spent the whole night talking to them.",
                "¿Y por qué me hablas tanto?", "So why are you talking to me so much?",
                "Pues porque me gustas.", "Because I fancy you.",
                "Ya me parecía.", "I thought so.",
                notes="Me gustas is the real thing, not a compliment — say it only if you mean it, because it will be taken at face value.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-08", "flirt-07", "them",
                "Their glass is empty and you're standing near the bar.",
                "Me he quedado sin bebida.", "I've run out of drink.",
                "¿Te invito a una copa?", "Can I buy you a drink?",
                "Venga, pero la siguiente la pago yo.", "Go on — but I'm getting the next one.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-09", "flirt-20", "them",
                "The bar is too loud to talk and you'd both rather keep talking.",
                "No te oigo nada con esta música.", "I can't hear a thing with this music.",
                "¿Nos vamos a otro sitio?", "Shall we go somewhere else?",
                "Vale, conozco uno tranquilo.", "Sure — I know a quiet one.",
            ),
            scene(
                "flirt-sc-10", "flirt-23", "them",
                "You're saying goodbye and want to leave the door open.",
                "Bueno, me voy que es tardísimo.", "Right, I'm off — it's so late.",
                "¿Quedamos otro día?", "Shall we meet up another day?",
                "Sí, escríbeme.", "Yes — message me.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "flirting-checkin": {
        # Kept as words: three that read the same in any moment, and are worth
        # knowing on sight rather than producing on cue.
        "keep": ["flirt-08", "flirt-27", "flirt-30"],
        "scenes": [
            scene(
                "flirt-sc-11", "flirt-09", "them",
                "You notice they've gone quiet since you moved closer.",
                "No, no, si está bien…", "No, no, it's fine…",
                "Si te incomoda, paro.", "If this makes you uncomfortable, I'll stop.",
                "Gracias por preguntar.", "Thanks for asking.",
                notes="The single most important line in this section. Said plainly, it is never awkward — not saying it is.",
                women=True,
            ),
            scene(
                "flirt-sc-12", "flirt-25", "them",
                "You've suggested walking them to their metro stop and want to check it's welcome.",
                "Está bastante lejos, ¿eh?", "It's quite far, you know.",
                "Te acompaño, ¿te parece bien?", "I'll walk with you — is that okay?",
                "Sí, mejor acompañada.", "Yes — better with company.",
                women=True,
            ),
            scene(
                "flirt-sc-13", "flirt-26", "them",
                "Their friends have arrived and the mood has changed.",
                "Han llegado mis amigas.", "My friends are here.",
                "¿Quieres que me vaya?", "Do you want me to go?",
                "No, quédate un rato.", "No — stay a bit.",
            ),
            scene(
                "flirt-sc-14", "flirt-28", "them",
                "There's a free stool next to someone you've been talking to across the room.",
                "¿Buscas sitio?", "Looking for a seat?",
                "¿Me puedo sentar?", "Can I sit down?",
                "Claro, siéntate.", "Of course — sit down.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-15", "flirt-29", "them",
                "They've given short answers twice and you want to give them an easy way out.",
                "Perdona, estoy un poco en mi mundo.", "Sorry — I'm a bit in my own world.",
                "¿Prefieres estar sola?", "Would you rather be on your own?",
                "Un ratito sí, gracias.", "For a little while, yes — thank you.",
                notes="Offering the exit is the point. Asked once and accepted without argument, it is the difference between charming and a problem.",
                women=True,
            ),
        ],
    },
    # ------------------------------------------------------------------
    "flirting-reading": {
        # Kept as words: three whose whole content is what they really mean,
        # which is a thing to read rather than a thing to say.
        "keep": ["flirt-13", "flirt-14", "flirt-31"],
        "scenes": [
            scene(
                "flirt-sc-16", "flirt-10", "them",
                "You've been talking in a group and want to peel off with one person.",
                "Aquí no hay quien hable.", "There's no talking in here.",
                "¿Nos tomamos algo?", "Shall we get a drink?",
                "Venga, vamos a la barra.", "Sure — let's go to the bar.",
                notes="A green light when it comes back at you, and a low-risk move when you make it: worst case they say no to one drink.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-17", "flirt-11", "them",
                "It's late, you're both still there, and neither of you has mentioned leaving.",
                "¿Qué hora es? Ni idea.", "What time is it? No idea.",
                "Me lo estoy pasando genial contigo.", "I'm having a great time with you.",
                "Yo también, la verdad.", "Me too, honestly.",
            ),
            scene(
                "flirt-sc-18", "flirt-12", "them",
                "Their friends are calling them over and you have about four seconds.",
                "Me tengo que ir con ellas.", "I have to go with them.",
                "¿Me das tu Insta?", "Can I get your Instagram?",
                "Sí, búscame y te acepto.", "Sure — look me up and I'll accept.",
                notes="Lower stakes than a phone number for both of you, which is exactly why it is the normal move now.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-19", "flirt-15", "them",
                "Someone has made it clear they're not interested and you want to leave it well.",
                "Oye, mejor lo dejamos aquí.", "Listen — let's leave it here.",
                "Sin problema, que lo pases bien.", "No problem — have a good one.",
                "Igualmente, gracias.", "You too — thanks.",
                notes="Take the no cleanly and the night stays good for everybody, including you. There is no version of arguing that works.",
                difficulty="easy",
            ),
            scene(
                "flirt-sc-20", "flirt-32", "you",
                "You've decided you're done with this conversation and want out without a scene.",
                "Me voy con mi grupo, un placer.", "I'm heading back to my group — nice to meet you.",
                "Nada, que vaya bien.", "No worries — take care.",
                notes="Polite, final, and impossible to argue with. Worth having ready before you need it.",
                difficulty="easy",
                women=True,
            ),
        ],
    },
    # ------------------------------------------------------------------
    "nightlife-slang": {
        # Kept as words: two nouns for places and things, and a term of address
        # you hear rather than say.
        "keep": ["night-05", "night-08", "night-09"],
        "scenes": [
            scene(
                "night-sc-01", "night-01", "them",
                "It's Friday and someone asks what you're doing tonight.",
                "¿Qué plan tienes hoy?", "What's your plan today?",
                "Salgo de marcha.", "I'm going out on the town.",
                "Avisa y me apunto.", "Let me know and I'm in.",
                notes="La marcha is nightlife itself. Salir de marcha is going out properly, not one quiet drink.",
            ),
            scene(
                "night-sc-02", "night-02", "them",
                "It's seven in the morning and someone texts asking where on earth you are.",
                "¿Pero tú dónde andas?", "Where on earth are you?",
                "Estamos de after.", "We're at an afterparty.",
                "Vete a casa ya.", "Go home already.",
                notes="El after is the place you go when the club shuts. Estar de after says you never went to bed.",
            ),
            scene(
                "night-sc-03", "night-03", "them",
                "A friend points out the terrace on the roof of the club.",
                "Mira, hay azotea arriba.", "Look — there's a roof terrace upstairs.",
                "¡Qué guay!", "How cool!",
                "Subimos luego.", "We'll go up later.",
                difficulty="easy",
            ),
            scene(
                "night-sc-04", "night-06", "you",
                "You're putting a plan together and want to pull one more person in.",
                "Vamos al concierto, ¿te apuntas?", "We're going to the gig — you in?",
                "Me apunto, ¿a qué hora?", "I'm in — what time?",
                notes="Apuntarse is to put your name down. ¿Te apuntas? is how every plan in Spain actually gets made.",
                difficulty="easy",
            ),
            scene(
                "night-sc-05", "night-07", "them",
                "Someone you met last night wants to make an actual plan.",
                "¿Y si nos vemos el sábado?", "What about meeting on Saturday?",
                "Vale, ¿quedamos a las nueve?", "Sure — shall we meet at nine?",
                "Perfecto, en la plaza.", "Perfect — at the square.",
                notes="Quedar is to arrange to meet, and it is not reflexive: ¿quedamos? not ¿nos quedamos?, which would mean shall we stay.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "drunk-scale-levels": {
        # Kept as words: the two ends of the standard scale and the one with
        # three interchangeable nouns in it, which no single scene can carry.
        "keep": ["drunk-04", "drunk-07", "drunk-09"],
        "scenes": [
            scene(
                "drunk-sc-01", "drunk-01", "them",
                "Two glasses of wine in, someone checks how you're getting on.",
                "Llevas dos copas, ¿no?", "That's two glasses you've had, right?",
                "Voy achispado, nada más.", "Just pleasantly tipsy, nothing more.",
                "Pues vamos bien.", "We're doing well, then.",
                notes="The bottom of the scale and the nicest place on it. Achispado, achispada.",
                difficulty="easy",
            ),
            scene(
                "drunk-sc-02", "drunk-02", "them",
                "Someone's aunt asks, kindly, whether you've had a bit much at the family meal.",
                "¿Estás bien, hijo?", "Are you all right, love?",
                "Un poco piripi, nada grave.", "A bit merry — nothing serious.",
                "Bebe agua, anda.", "Have some water, go on.",
                notes="Piripi is old-fashioned and affectionate, which is exactly why it is the right word in front of somebody's family.",
                difficulty="easy",
            ),
            scene(
                "drunk-sc-03", "drunk-03", "them",
                "A friend has noticed you've gone quiet and asks whether you're still with them.",
                "¿Sigues aquí o qué?", "Are you still with us or what?",
                "Estoy puesto ya.", "I'm feeling it now.",
                "Pues agua y para.", "Water, then, and stop.",
            ),
            scene(
                "drunk-sc-04", "drunk-05", "them",
                "It's two in the morning and someone is already halfway to the bar for you.",
                "¿Te pido otra?", "Shall I get you another one?",
                "Mejor no, que llevo un pedo.", "Better not — I'm hammered.",
                "Bien pensado.", "Good call.",
                notes="Llevar un pedo and ir pedo are the same thing. Never peda, whoever is saying it — the noun does not agree with you.",
            ),
            scene(
                "drunk-sc-05", "drunk-06", "them",
                "A friend asks how last night ended, and it ended badly.",
                "¿Cómo acabaste anoche?", "How did you end up last night?",
                "Acabé ciego.", "I ended up blind drunk.",
                "Se te notaba.", "It showed.",
                notes="Ir ciego is blind drunk, and it is a step past pedo. Ciega for a woman.",
            ),
            scene(
                "drunk-sc-06", "drunk-08", "them",
                "A friend points across the bar at someone who is in no state to stay.",
                "¿Ese no venía contigo?", "Wasn't he with you?",
                "Está cocido, hay que llevarlo a casa.", "He's hammered — he needs taking home.",
                "Yo pido el taxi.", "I'll get the taxi.",
                notes="Cocido is cooked. Said about somebody else far more often than about yourself.",
            ),
            scene(
                "drunk-sc-07", "drunk-10", "them",
                "A friend from Madrid texts to ask how the night is going, and you answer in their register.",
                "¿Cómo lo llevas, tronco?", "How are you holding up, mate?",
                "Voy mazo pedo.", "I am absolutely hammered.",
                "Bebe agua ya.", "Drink some water, now.",
                notes="Mazo is the Madrid intensifier doing the job muy would do anywhere else. Outside Madrid it marks you as having learned your Spanish there.",
                region="madrid",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "resacon-morning": {
        # Kept as words: two nouns for a kind of night out and one for a thing
        # you do to a hangover — all three named rather than said.
        "keep": ["morning-03", "morning-04", "morning-08"],
        "scenes": [
            scene(
                "resacon-sc-01", "morning-01", "them",
                "You surface at two in the afternoon and your flatmate is unsympathetic.",
                "Buenos días, bella durmiente.", "Morning, sleeping beauty.",
                "Tengo un resacón horrible.", "I have a horrendous hangover.",
                "Te lo has ganado.", "You've earned it.",
                notes="Resacón is resaca with the volume up. La resaca is the hangover; el resacón is the one that ruins the day.",
                difficulty="easy",
            ),
            scene(
                "resacon-sc-02", "morning-02", "them",
                "It's the Sunday after and a friend asks why you sound so flat.",
                "¿Estás malo o qué te pasa?", "Are you ill, or what's up?",
                "Tengo bajona.", "I've got the comedown.",
                "Sal a dar una vuelta.", "Go out for a walk.",
                notes="La bajona is the dip after the high — as much a mood as a hangover, and said about Sundays in general.",
            ),
            scene(
                "resacon-sc-03", "morning-05", "them",
                "A friend catches you swearing off alcohol for what must be the hundredth time.",
                "¿Cuántas veces has dicho eso ya?", "How many times have you said that now?",
                "Esta vez no vuelvo a beber en la vida.", "This time I am never drinking again as long as I live.",
                "Nos vemos el sábado.", "See you on Saturday.",
                notes="Said with total sincerity, roughly monthly. En la vida is the part that makes it funny, and the part nobody means.",
                difficulty="easy",
            ),
            scene(
                "resacon-sc-04", "morning-06", "them",
                "Someone offers you breakfast and the thought of it is unbearable.",
                "¿Te hago unos huevos?", "Shall I make you some eggs?",
                "Tengo el cuerpo cortado.", "I feel completely wrecked.",
                "Entonces una tostada.", "Just toast, then.",
                notes="Literally a cut-up body: the faintly ill, unsettled feeling rather than the headache.",
                difficulty="hard",
            ),
            scene(
                "resacon-sc-05", "morning-07", "them",
                "You've been staring at your phone replaying everything you said last night.",
                "¿Por qué estás tan callado?", "Why are you so quiet?",
                "Tengo resaca moral.", "I've got the guilt hangover.",
                "No dijiste nada raro, tranquilo.", "You didn't say anything odd — relax.",
                notes="The guilt hangover, and the reason everybody checks their sent messages on a Sunday.",
            ),
        ],
    },
}

# The rest of the Swedish word lists, as moments.

PLAN = {
    # ------------------------------------------------------------------
    "sv-cuss-common": {
        # Kept as words: a prefix that needs a word after it, and two softened
        # oaths whose whole interest is what they stand in for.
        "keep": ["sv-cuss-03", "sv-cuss-07", "sv-cuss-10"],
        "scenes": [
            scene(
                "sv-cuss-sc-01", "sv-cuss-01", "them",
                "The doors close on the last train just as you reach the platform.",
                "Det var sista tåget.", "That was the last train.",
                "Fan också.", "Damn it.",
                "Vi tar en taxi.", "We'll take a taxi.",
                notes="Fan is the devil, and it is the workhorse Swedish swear — heard constantly and barely registering as rude.",
                difficulty="easy",
            ),
            scene(
                "sv-cuss-sc-02", "sv-cuss-02", "them",
                "A friend shows you what the round they just bought cost.",
                "Kolla vad det kostade.", "Look what that cost.",
                "Jävlar, vad dyrt.", "Bloody hell, that's expensive.",
                "Välkommen till Stockholm.", "Welcome to Stockholm.",
                notes="A step up from fan and still ordinary. Fy fan is the one to be careful with.",
            ),
            scene(
                "sv-cuss-sc-03", "sv-cuss-06", "them",
                "You drop your glove in a puddle in front of somebody's grandmother.",
                "Oj, den blev blöt.", "Oh — that got wet.",
                "Jäklar.", "Darn.",
                "Den torkar.", "It'll dry.",
                notes="Jäklar is jävlar with the teeth filed off: the version you say when you have remembered who is in the room.",
                difficulty="easy",
            ),
            scene(
                "sv-cuss-sc-04", "sv-cuss-08", "them",
                "You realise you've left your card at the bar you were in an hour ago.",
                "Har du kvar kortet?", "Have you still got your card?",
                "Sjutton, det ligger kvar.", "Drat — it's still there.",
                "Ring dem, de stänger sent.", "Call them — they close late.",
                notes="Literally 'seventeen'. Nobody knows why, and it is completely harmless.",
            ),
            scene(
                "sv-cuss-sc-05", "sv-cuss-09", "them",
                "Someone tells you how much the flat they're renting costs a month.",
                "Tjugotusen i månaden.", "Twenty thousand a month.",
                "Herregud.", "Oh my god.",
                "Ja, det är sjukt.", "Yeah — it's insane.",
                notes="Safe in any company at all, including at work and in front of children.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-cuss-aggressive": {
        # Kept as words: three nouns for a kind of person. You call somebody
        # one; there is no line to produce.
        "keep": ["sv-cuss-13", "sv-cuss-14", "sv-cuss-16"],
        "scenes": [
            scene(
                "sv-cuss-sc-06", "sv-cuss-04", "them",
                "Someone has followed you down the street after being told twice to stop.",
                "Kom igen, bara en pratstund.", "Come on — just a chat.",
                "Dra åt helvete.", "Go to hell.",
                "Lugna dig.", "Calm down.",
                notes="The real thing, and the end of the conversation. Worth knowing on sight far more than worth saying.",
                difficulty="hard",
                women=True,
            ),
            scene(
                "sv-cuss-sc-07", "sv-cuss-05", "them",
                "Somebody has been talking over you for ten minutes and starts again.",
                "Nej, nu ska du lyssna på mig.", "No — now you listen to me.",
                "Håll käften.", "Shut up.",
                "Ursäkta?", "Excuse me?",
                notes="Blunt and genuinely rude. Among close friends it can be a joke; with anybody else it is a fight.",
                difficulty="hard",
            ),
            scene(
                "sv-cuss-sc-08", "sv-cuss-11", "them",
                "A friend claims they once met the king in a queue at the supermarket.",
                "Jag träffade kungen i kön.", "I met the king in the queue.",
                "Lägg av!", "Get out of here!",
                "Jag lovar, det är sant.", "I promise — it's true.",
                notes="Two jobs in one phrase: stop it, and you're joking. The tone tells you which, and this one is the friendly one.",
                difficulty="easy",
            ),
            scene(
                "sv-cuss-sc-09", "sv-cuss-12", "them",
                "Someone in your group is being loud and rude to the staff.",
                "De kan väl skynda sig lite!", "They could hurry up a bit!",
                "Skärp dig.", "Pull yourself together.",
                "Ja ja, förlåt.", "All right, all right — sorry.",
                notes="Sharp, short, and aimed at behaviour rather than at the person. It is what a Swede says instead of a scene.",
            ),
            scene(
                "sv-cuss-sc-10", "sv-cuss-15", "them",
                "A friend tells you what happened to their bike overnight.",
                "De tog hela cykeln.", "They took the whole bike.",
                "Fy fan.", "Bloody hell.",
                "Jag vet, jag är så trött på det.", "I know — I'm so sick of it.",
                notes="Stronger spoken than it looks written. Sympathy here, but the same two words can start a fight.",
                difficulty="hard",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-cuss-escape": {
        # Kept as words: three soft insults, all nouns you call somebody rather
        # than lines you say.
        "keep": ["sv-cuss-21", "sv-cuss-22", "sv-cuss-23"],
        "scenes": [
            scene(
                "sv-cuss-sc-11", "sv-cuss-17", "them",
                "A joke you made at someone's expense has landed badly.",
                "Det där var faktiskt taskigt.", "That was actually mean.",
                "Jag skojade bara.", "I was only joking.",
                "Okej, men säg inte så.", "Okay — but don't say things like that.",
                difficulty="easy",
            ),
            scene(
                "sv-cuss-sc-12", "sv-cuss-18", "them",
                "You've said something in Swedish that came out much blunter than you meant.",
                "Menade du verkligen så?", "Did you really mean that?",
                "Förlåt, det blev fel.", "Sorry — that came out wrong.",
                "Ingen fara.", "No harm done.",
                notes="The most useful sentence here while you are still learning, because it is true most of the time.",
                difficulty="easy",
            ),
            scene(
                "sv-cuss-sc-13", "sv-cuss-19", "them",
                "You've made a remark about Swedish weather to somebody who grew up in it.",
                "Du gillar visst inte vårt väder.", "You don't much like our weather, then.",
                "Jag menade inget illa.", "I didn't mean anything by it.",
                "Jag vet, jag skämtar.", "I know — I'm teasing.",
            ),
            scene(
                "sv-cuss-sc-14", "sv-cuss-20", "them",
                "A friend has taken a general complaint about tourists as being about them.",
                "Var det riktat mot mig?", "Was that aimed at me?",
                "Ta det inte personligt.", "Don't take it personally.",
                "Okej, jag släpper det.", "All right — I'll drop it.",
            ),
            scene(
                "sv-cuss-sc-15", "sv-cuss-24", "them",
                "You've locked yourself out with the keys visible on the kitchen table.",
                "Ligger nycklarna därinne?", "Are the keys in there?",
                "Vilken dumbom jag är.", "What a fool I am.",
                "Det händer alla.", "It happens to everyone.",
                notes="Soft, slightly childish and mostly used about yourself. Calling somebody else a dumbom is nearly affectionate.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-flirt-safe": {
        # Kept as words: three that read as an observation rather than an
        # opening, and one that is a near-twin of a line taught below.
        "keep": ["sv-flirt-02", "sv-flirt-13", "sv-flirt-15"],
        "scenes": [
            scene(
                "sv-flirt-sc-01", "sv-flirt-01", "them",
                "Someone you like arrives at the pre-party and hangs their coat up.",
                "Hej! Har ni väntat länge?", "Hi! Have you been waiting long?",
                "Du är snygg.", "You look great.",
                "Tack, det var snällt.", "Thanks — that's kind.",
                notes="Snygg is the everyday compliment about how somebody looks. Said plainly and once, it lands well; said twice it does not.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-02", "sv-flirt-03", "them",
                "Someone mentions they put the outfit together from second-hand shops.",
                "Allt är från second hand faktiskt.", "It's all second-hand, actually.",
                "Jag gillar din stil.", "I like your style.",
                "Vad kul att höra.", "That's nice to hear.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-03", "sv-flirt-04", "them",
                "They laugh at something you said and you want to say what you noticed.",
                "Du är rolig, du.", "You're funny, you are.",
                "Du har ett fint leende.", "You have a nice smile.",
                "Nu blir jag blyg.", "Now you're making me shy.",
            ),
            scene(
                "sv-flirt-sc-04", "sv-flirt-12", "them",
                "You've been talking for two hours and neither of you has looked at a phone.",
                "Oj, klockan är mycket.", "Oh — it's late.",
                "Du är lätt att prata med.", "You're easy to talk to.",
                "Detsamma faktiskt.", "Same to you, actually.",
                notes="High praise in Sweden, where small talk is not the default and somebody easy to talk to is genuinely noticed.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-05", "sv-flirt-14", "them",
                "Someone has just argued the opposite of what you expected, and argued it well.",
                "Men så kan man ju också se på det.", "But you can look at it that way too.",
                "Jag gillar hur du tänker.", "I like the way you think.",
                "Då är vi två.", "That makes two of us.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-flirt-bolder": {
        # Kept as words: two closing lines with nothing to come back at them,
        # and one whose whole content is how tentative it is.
        "keep": ["sv-flirt-18", "sv-flirt-20", "sv-flirt-21"],
        "scenes": [
            scene(
                "sv-flirt-sc-06", "sv-flirt-05", "them",
                "They ask, half joking, why you keep looking over.",
                "Varför kollar du så mycket?", "Why do you keep looking over?",
                "Jag tycker du är riktigt snygg.", "I think you're really attractive.",
                "Rakt på sak. Jag gillar det.", "Straight to the point. I like that.",
            ),
            scene(
                "sv-flirt-sc-07", "sv-flirt-06", "them",
                "The group is breaking up and you'd like to see this one person again.",
                "Jag ska nog hem nu.", "I think I'm heading home now.",
                "Ska vi ta en öl nån gång?", "Want to grab a beer sometime?",
                "Gärna, hör av dig.", "I'd like that — get in touch.",
            ),
            scene(
                "sv-flirt-sc-08", "sv-flirt-16", "them",
                "They ask where this is going, directly, because it is late and nobody is pretending.",
                "Vad är det här, egentligen?", "What is this, really?",
                "Jag gillar dig.", "I like you.",
                "Skönt att du sa det.", "Good that you said it.",
                notes="Gilla is to like, and here it means it. Älska is a long way further along and not a first-night word.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-09", "sv-flirt-17", "them",
                "The music has got loud enough that you're both shouting.",
                "Jag hör inget!", "I can't hear a thing!",
                "Ska vi gå nån annanstans?", "Shall we go somewhere else?",
                "Ja, jag vet ett ställe.", "Yes — I know a place.",
            ),
            scene(
                "sv-flirt-sc-10", "sv-flirt-19", "them",
                "Their friends are leaving and you have about ten seconds.",
                "Jag måste gå med dem.", "I have to go with them.",
                "Får jag ditt nummer?", "Can I have your number?",
                "Ge mig din telefon.", "Give me your phone.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-flirt-respect": {
        # Kept as words: three closing courtesies with no reply to build on.
        "keep": ["sv-flirt-22", "sv-flirt-24", "sv-flirt-26"],
        "scenes": [
            scene(
                "sv-flirt-sc-11", "sv-flirt-07", "them",
                "You've suggested carrying on somewhere else and they've gone quiet.",
                "Jag vet inte riktigt…", "I'm not really sure…",
                "Ingen press om du inte vill.", "No pressure if you don't want to.",
                "Tack, det var skönt att höra.", "Thanks — that's good to hear.",
                women=True,
            ),
            scene(
                "sv-flirt-sc-12", "sv-flirt-08", "them",
                "You've moved closer on the sofa and want to check that was welcome.",
                "Det är lite trångt här.", "It's a bit cramped here.",
                "Säg bara till om du inte är bekväm.", "Just say if you're not comfortable.",
                "Det är lugnt, stanna.", "It's fine — stay.",
                notes="The single most important line in this section. Asked plainly it is never awkward; not asking is.",
                women=True,
            ),
            scene(
                "sv-flirt-sc-13", "sv-flirt-09", "them",
                "They tell you they're seeing somebody already.",
                "Jag träffar faktiskt nån.", "I'm actually seeing someone.",
                "Helt lugnt, jag respekterar det.", "All good — I respect that.",
                "Kul att prata ändå.", "Nice talking anyway.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-14", "sv-flirt-23", "them",
                "They've given one-word answers twice and are looking at their phone.",
                "Förlåt, jag är lite trött.", "Sorry — I'm a bit tired.",
                "Jag lämnar dig i fred.", "I'll leave you in peace.",
                "Tack för förståelsen.", "Thanks for understanding.",
                notes="Leaving cleanly is the skill. Ifred is one word here and means exactly what it says.",
                women=True,
            ),
            scene(
                "sv-flirt-sc-15", "sv-flirt-25", "them",
                "You read the evening as going one way and it was going another.",
                "Jag ville bara prata, faktiskt.", "I just wanted to talk, actually.",
                "Förlåt, jag missförstod.", "Sorry — I misread that.",
                "Ingen fara alls.", "No harm at all.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-flirt-consent": {
        # Kept as words: three that read the same in any moment and are worth
        # knowing on sight.
        "keep": ["sv-flirt-10", "sv-flirt-29", "sv-flirt-32"],
        "scenes": [
            scene(
                "sv-flirt-sc-16", "sv-flirt-11", "them",
                "Their glass is empty and you're already standing up.",
                "Jag har faktiskt slut.", "I'm actually out.",
                "Är det okej om jag bjuder dig på en drink?", "Is it okay if I buy you a drink?",
                "Gärna, tack.", "Yes please — thanks.",
            ),
            scene(
                "sv-flirt-sc-17", "sv-flirt-27", "them",
                "You've put an arm along the back of the bench they're sitting on.",
                "Hmm…", "Hmm…",
                "Är det okej så här?", "Is this okay?",
                "Ja, det är fint.", "Yes — it's nice.",
                women=True,
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-18", "sv-flirt-28", "them",
                "Their friends have arrived and the mood at the table has changed.",
                "Nu kom mina kompisar.", "My friends are here now.",
                "Vill du att jag går?", "Do you want me to go?",
                "Nej, stanna lite.", "No — stay a while.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-19", "sv-flirt-30", "them",
                "There's one free chair at the table and you've been talking across the room.",
                "Söker du en stol?", "Looking for a chair?",
                "Får jag sätta mig?", "May I sit down?",
                "Visst, varsågod.", "Of course — go ahead.",
                difficulty="easy",
            ),
            scene(
                "sv-flirt-sc-20", "sv-flirt-31", "them",
                "They've been looking out at the water rather than at the party for a while.",
                "Jag behövde lite luft bara.", "I just needed some air.",
                "Vill du hellre vara ifred?", "Would you rather be left alone?",
                "En stund till, tack.", "A little longer, thanks.",
                notes="Offering the exit is the point. Asked once and accepted without argument is the whole difference.",
                women=True,
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-nightlife-slang": {
        # Kept as words: two nouns for a place or a thing, and the one for the
        # person who decides how your night goes.
        "keep": ["sv-nightlife-18", "sv-nightlife-22", "sv-nightlife-23"],
        "scenes": [
            scene(
                "sv-night-sc-01", "sv-nightlife-17", "them",
                "Someone asks what the plan is for a Saturday with no plan.",
                "Vad gör vi på lördag?", "What are we doing on Saturday?",
                "Vi kör en krogrunda.", "Let's do a pub crawl.",
                "Jag är med.", "I'm in.",
                notes="Literally a round of the pubs. Krogrunda is the word; barrunda works too and sounds more imported.",
            ),
            scene(
                "sv-night-sc-02", "sv-nightlife-19", "them",
                "The lights have come up slightly and people are moving towards the bar.",
                "Varför står alla i kö?", "Why is everyone queuing?",
                "Det är sista beställning.", "It's last orders.",
                "Då springer jag.", "I'm running, then.",
                difficulty="easy",
            ),
            scene(
                "sv-night-sc-03", "sv-nightlife-20", "them",
                "A song everybody knows comes on and your friend is still sitting down.",
                "Älskar den här låten!", "I love this song!",
                "Kom, vi går ut på dansgolvet.", "Come on — let's get on the dance floor.",
                "Okej, en låt bara.", "Okay — one song only.",
                difficulty="easy",
            ),
            scene(
                "sv-night-sc-04", "sv-nightlife-21", "them",
                "The bar you're in has emptied out and the music has been turned down.",
                "Det är dött här nu.", "It's dead in here now.",
                "Ska vi dra vidare?", "Shall we move on?",
                "Ja, jag vet ett ställe.", "Yes — I know somewhere.",
                notes="Dra is to pull, and it does all the moving in Swedish: dra hem, dra vidare, dra iväg.",
            ),
            scene(
                "sv-night-sc-05", "sv-nightlife-24", "them",
                "Somebody you met last night messages to suggest something low-key.",
                "Har du nåt för dig ikväll?", "Are you up to anything tonight?",
                "Vi kan hänga hemma hos mig.", "We could hang out at mine.",
                "Låter bra, jag tar med fika.", "Sounds good — I'll bring something for fika.",
                notes="Hänga is the default word for doing nothing much together, and a Swedish invitation is often exactly that.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-drunk-levels": {
        # Kept as words: the formal word on the signs, a slash pair, and the
        # one whose joke is entirely in the compound.
        "keep": ["sv-drunk-02", "sv-drunk-04", "sv-drunk-07"],
        "scenes": [
            scene(
                "sv-drunk-sc-01", "sv-drunk-01", "them",
                "Two glasses into an afterwork, a colleague checks how you're getting on.",
                "Hur känns det?", "How are you feeling?",
                "Jag är lite på snusen.", "I'm a bit tipsy.",
                "Samma här.", "Same here.",
                notes="The bottom of the scale and the nicest place on it. Nothing to do with snus, despite appearances.",
            ),
            scene(
                "sv-drunk-sc-02", "sv-drunk-03", "them",
                "Somebody notices you've become much more talkative than you were an hour ago.",
                "Du är på gott humör.", "You're in a good mood.",
                "Jag är lite dragen.", "I'm a bit merry.",
                "Det märks.", "It shows.",
            ),
            scene(
                "sv-drunk-sc-03", "sv-drunk-05", "them",
                "You've been offered a second helping and want to say you've had enough to drink, not to eat.",
                "Vill du ha mer?", "Would you like some more?",
                "Nej tack, jag är full.", "No thanks — I'm drunk.",
                "Då tar vi vatten.", "Water, then.",
                notes="The trap worth knowing. Full is drunk, never fed: for that it is mätt, and saying full after dinner means something quite different.",
                difficulty="easy",
            ),
            scene(
                "sv-drunk-sc-04", "sv-drunk-06", "them",
                "A friend asks how the person asleep in the corner ended up like that.",
                "Hur gick det till?", "How did that happen?",
                "Han är helt packad.", "He's completely loaded.",
                "Vi väcker honom snart.", "We'll wake him soon.",
            ),
            scene(
                "sv-drunk-sc-05", "sv-drunk-08", "them",
                "Someone asks how last night's midsummer party ended for you.",
                "Hur slutade midsommar?", "How did midsummer end?",
                "Jag blev kanonfull.", "I got absolutely gone.",
                "Det gör alla på midsommar.", "Everyone does at midsummer.",
            ),
            scene(
                "sv-drunk-sc-06", "sv-drunk-09", "them",
                "Somebody in your group has stopped answering and needs to go home now.",
                "Ska vi ringa en taxi åt honom?", "Should we call him a taxi?",
                "Ja, han är plakat.", "Yes — he's blackout drunk.",
                "Jag följer med.", "I'll go with him.",
                notes="The top of the scale, and a word used about somebody rather than by them, for obvious reasons.",
                difficulty="hard",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-resacon-morning": {
        # Kept as words: a slash pair, the hair of the dog, and the compound
        # whose joke is the concrete cap itself.
        "keep": ["sv-resacon-10", "sv-resacon-13", "sv-resacon-14"],
        "scenes": [
            scene(
                "sv-resacon-sc-01", "sv-resacon-09", "them",
                "You appear in the kitchen at one in the afternoon and say nothing.",
                "God morgon, eller?", "Morning — or is it?",
                "Jag är så bakis.", "I'm so hungover.",
                "Det finns kaffe.", "There's coffee.",
                notes="Bakis is the everyday word and the one you'll actually hear. Bakfull is the same thing, slightly more formal.",
                difficulty="easy",
            ),
            scene(
                "sv-resacon-sc-02", "sv-resacon-11", "them",
                "You've been scrolling back through last night's messages for twenty minutes.",
                "Varför är du så tyst?", "Why are you so quiet?",
                "Jag har fylleångest.", "I've got the drinking dread.",
                "Du sa inget konstigt, lova.", "You didn't say anything odd, I promise.",
                notes="Sweden has a word for the specific dread about what you said last night. Almost no other language names it, and everybody has it.",
                difficulty="hard",
            ),
            scene(
                "sv-resacon-sc-03", "sv-resacon-12", "them",
                "Somebody suggests a long walk and you have other plans for the sofa.",
                "Ska vi ut och gå?", "Shall we go for a walk?",
                "Inte idag, det är dagen efter.", "Not today — it's the day after.",
                "Då stannar vi inne.", "We'll stay in, then.",
                notes="Dagen efter works as a noun on its own. Nobody needs to ask after what.",
                difficulty="easy",
            ),
            scene(
                "sv-resacon-sc-04", "sv-resacon-15", "them",
                "A friend asks, far too brightly, how you're feeling this morning.",
                "Hur mår du idag då?", "So how are you feeling today?",
                "Jag har ont i håret.", "I'm rough as anything.",
                "Stackare.", "Poor thing.",
                notes="Literally 'my hair hurts'. Said with a straight face, which is what makes it funny.",
                difficulty="hard",
            ),
            scene(
                "sv-resacon-sc-05", "sv-resacon-16", "them",
                "You are lying very still and a friend asks whether you've learned anything.",
                "Har du lärt dig nåt nu?", "Have you learned anything now?",
                "Aldrig mer.", "Never again.",
                "Du sa det förra månaden också.", "You said that last month too.",
                notes="Said monthly, meant every time. The shortest complete sentence in this section.",
                difficulty="easy",
            ),
        ],
    },
}

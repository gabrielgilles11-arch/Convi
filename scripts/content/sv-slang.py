# Swedish slang, as moments rather than a glossary.
#
# Same rule as the Spanish edition: each subsection keeps its three least
# dramatisable words — the fillers, the slash pairs, the things you hear said
# about a place rather than say yourself — and hands the rest to a scene.

PLAN = {
    # ------------------------------------------------------------------
    "sv-slang-everyday": {
        # Kept as words: two fillers and a slash pair.
        "keep": ["sv-slang-01", "sv-slang-04", "sv-slang-07"],
        "scenes": [
            scene(
                "sv-slang-sc-01", "sv-slang-02", "them",
                "Someone asks how long the walk to the place you're meeting at takes.",
                "Hur långt är det dit?", "How far is it?",
                "Typ tio minuter.", "Like ten minutes.",
                "Då hinner vi.", "We'll make it, then.",
                notes="Typ is the Swedish like — an approximation, not a comparison. It goes in front of a number more often than anything else.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-02", "sv-slang-03", "them",
                "Everyone has their coat on and the taxi is outside.",
                "Är alla klara?", "Is everybody ready?",
                "Nu kör vi!", "Let's go!",
                "Jag låser.", "I'll lock up.",
                notes="Literally 'now we drive'. Said whether or not anybody is driving.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-03", "sv-slang-05", "them",
                "Someone has explained the ticket machine twice and checks you've got it.",
                "Fattar du hur jag menar?", "Do you get what I mean?",
                "Ja, jag fattar.", "Yes, I get it.",
                "Bra, då kör vi.", "Good — off we go.",
                notes="Fatta is to grasp. Jag fattar inte is the single most useful thing to be able to say while you're learning.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-04", "sv-slang-06", "them",
                "A friend has just explained a joke that took a while to land.",
                "Förstod du poängen nu?", "Did you get the point now?",
                "Nu hajar jag.", "Now I'm with you.",
                "Äntligen.", "Finally.",
                notes="Haja is fatta with the collar turned up — slangier, younger, and used the same way.",
            ),
            scene(
                "sv-slang-sc-05", "sv-slang-08", "them",
                "It's Sunday, the weather is bad, and someone asks what the plan is.",
                "Vad gör ni idag?", "What are you all doing today?",
                "Vi softar hemma.", "We're chilling at home.",
                "Låter skönt.", "Sounds nice.",
                notes="Softa is to take it easy. Mjukisbyxor and a sofa are implied.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-06", "sv-slang-09", "them",
                "The gig you've had tickets for since spring is tomorrow.",
                "Ser du fram emot imorgon?", "Are you looking forward to tomorrow?",
                "Jag är så taggad.", "I'm so hyped.",
                "Jag med!", "Me too!",
                notes="Taggad is spiked, in the sense of charged up. Peppad does the same job and is slightly gentler.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-07", "sv-slang-10", "them",
                "A friend asks what you made of the restaurant they booked.",
                "Vad tyckte du om stället?", "What did you think of the place?",
                "Sjukt bra.", "Insanely good.",
                "Va kul att du gillade det.", "Glad you liked it.",
                notes="Sjukt is literally 'sickly' and works as an intensifier in front of anything, good or bad.",
                difficulty="easy",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-slang-reactions": {
        # Kept as words: a slash pair, a prefix that needs a word after it, and
        # a bare intensifier that never stands alone.
        "keep": ["sv-slang-11", "sv-slang-12", "sv-slang-28"],
        "scenes": [
            scene(
                "sv-slang-sc-08", "sv-slang-13", "them",
                "Someone offers to sort out the tickets so you don't have to.",
                "Jag fixar biljetterna.", "I'll sort the tickets.",
                "Nice, tack.", "Nice — thanks.",
                "Inga problem.", "No problem.",
                notes="Borrowed straight from English and completely at home. Swedes use it where an English speaker might say 'great'.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-09", "sv-slang-25", "them",
                "A friend has got you into the place everyone said was full.",
                "Vi kom in, jag fixade det.", "We're in — I sorted it.",
                "Kanon!", "Brilliant!",
                "Eller hur.", "Right?",
                notes="Literally 'cannon'. Said on its own, with feeling, and never mid-sentence.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-10", "sv-slang-26", "them",
                "Someone suggests a time that happens to suit you perfectly.",
                "Ses vi vid sju?", "Shall we meet at seven?",
                "Toppen!", "Great!",
                "Då säger vi det.", "Let's say that, then.",
                notes="Toppen is the top. A shade more wholesome than kanon and safe with anybody's family.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-11", "sv-slang-27", "them",
                "A friend tells you they got the job they interviewed for.",
                "Jag fick jobbet!", "I got the job!",
                "Vad grymt!", "That's awesome!",
                "Tack, jag är så glad.", "Thanks — I'm so happy.",
                notes="Grym means cruel. As praise it means the opposite, the way 'wicked' does in English.",
            ),
            scene(
                "sv-slang-sc-12", "sv-slang-29", "them",
                "Someone parallel-parks into a space nobody thought would fit.",
                "Där, in på första försöket.", "There — first try.",
                "Snyggt!", "Nice one!",
                "Tack, tack.", "Thanks, thanks.",
                notes="Snyggt is about the thing done, not the person who did it. Du är snygg is a compliment of a very different kind.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-slang-stockholm": {
        # Kept as words: a slash abbreviation, an initialism, and one that the
        # entry itself says will date you if you say it.
        "keep": ["sv-slang-15", "sv-slang-17", "sv-slang-32"],
        "scenes": [
            scene(
                "sv-slang-sc-13", "sv-slang-14", "them",
                "You're deciding how to get across town and the traffic looks bad.",
                "Ska vi gå eller åka?", "Shall we walk or take something?",
                "Vi åker tuben, det går fortare.", "Let's take the metro — it's quicker.",
                "Bra idé.", "Good idea.",
                notes="Tuben is Tunnelbanan, and it is what everybody calls it. The signs say T.",
                region="stockholm",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-14", "sv-slang-16", "them",
                "You've run out of something and are heading to the shop.",
                "Ska du ut nånstans?", "Are you heading out somewhere?",
                "Jag ska tjacka lite mat.", "I'm going to grab some food.",
                "Köp kaffe också.", "Get coffee too.",
                notes="Tjacka is to buy, Stockholm slang, and casual enough that you wouldn't use it in a shop.",
                region="stockholm",
            ),
            scene(
                "sv-slang-sc-15", "sv-slang-18", "them",
                "Someone asks where to meet before dinner on Södermalm.",
                "Var ses vi innan?", "Where shall we meet beforehand?",
                "Vid Medis, som vanligt.", "At Medis, as usual.",
                "Perfekt, vid statyn.", "Perfect — by the statue.",
                notes="Medis is Medborgarplatsen. Stockholm shortens every place name it uses often, and this is the one you'll hear most.",
                region="stockholm",
            ),
            scene(
                "sv-slang-sc-16", "sv-slang-30", "them",
                "Someone asks which part of the city you've been staying in.",
                "Var bor du nånstans?", "Whereabouts are you staying?",
                "Jag bor på Söder.", "I'm staying in Söder.",
                "Trevligt område.", "Nice area.",
                notes="Söder is Södermalm, and saying you live there tells a Stockholmer more about you than the postcode does.",
                region="stockholm",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-17", "sv-slang-31", "them",
                "A friend suggests a night out somewhere you've heard is expensive.",
                "Vi kan dra ut ikväll.", "We could go out tonight.",
                "Inte Stureplan, det blir för dyrt.", "Not Stureplan — it'll be too expensive.",
                "Vi tar Söder istället.", "We'll do Söder instead.",
                notes="Stureplan is the expensive nightlife square, and knowing to avoid it is a Stockholm opinion you can hold on day one.",
                region="stockholm",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-slang-party": {
        # Kept as words: three slash pairs, where the point is that both halves
        # are in use.
        "keep": ["sv-slang-19", "sv-slang-20", "sv-slang-37"],
        "scenes": [
            scene(
                "sv-slang-sc-18", "sv-slang-33", "them",
                "Someone invites you out and you want to know about the bit before.",
                "Vi ses på klubben vid elva.", "See you at the club at eleven.",
                "Blir det förfest innan?", "Is there a pre-party beforehand?",
                "Ja, hemma hos mig vid åtta.", "Yes — at mine from eight.",
                notes="Förfest is where a Swedish night actually happens. Drinks out are expensive, so the flat comes first and the club comes late.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-19", "sv-slang-34", "them",
                "The club is closing and nobody in your group wants to go home.",
                "De stänger nu.", "They're closing now.",
                "Blir det efterfest nånstans?", "Is there an afterparty somewhere?",
                "Hos Erik, han har plats.", "At Erik's — he's got room.",
            ),
            scene(
                "sv-slang-sc-20", "sv-slang-35", "them",
                "It's Friday afternoon and someone asks what you're doing tonight.",
                "Vad har du för planer ikväll?", "What are your plans tonight?",
                "Vi ska ut på krogen.", "We're going out to the pub.",
                "Får jag haka på?", "Can I tag along?",
                notes="Krogen covers the pub and the restaurant both. Ut på krogen means a night out, not one drink.",
            ),
            scene(
                "sv-slang-sc-21", "sv-slang-36", "them",
                "It's midsummer, everyone is standing up, and a song is starting.",
                "Nu ska vi sjunga!", "Time for a song!",
                "Då tar vi en nubbe.", "Then let's have a snaps.",
                "Helan går!", "Here goes the first one!",
                notes="A nubbe is a small measure of snaps with a song attached. The song is not optional and there are dozens of them.",
            ),
            scene(
                "sv-slang-sc-22", "sv-slang-38", "them",
                "It's eight in the evening, Systembolaget is shut, and someone still wants a beer.",
                "Hinner vi till Systemet?", "Can we still make it to Systemet?",
                "Nej, men vi köper folköl.", "No — but we can get supermarket beer.",
                "Det duger.", "That'll do.",
                notes="Folköl is 3.5% and the strongest thing a supermarket may sell. Everything above that is Systembolaget only, and they close early.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-slang-micro": {
        # Kept as words: two fillers that open a sentence rather than being
        # one, and the yes-and-no noise.
        "keep": ["sv-slang-21", "sv-slang-39", "sv-slang-41"],
        "scenes": [
            scene(
                "sv-slang-sc-23", "sv-slang-22", "them",
                "Somebody suggests walking home for forty minutes in the rain to save the fare.",
                "Vi kan gå hem istället.", "We could walk home instead.",
                "Orka.", "Ugh, no.",
                "Okej, okej, vi tar bussen.", "Fine, fine — we'll take the bus.",
                notes="Literally 'to have the energy', said alone as a flat refusal to have any. Young, very common, and slightly rude to a stranger.",
                young=True,
            ),
            scene(
                "sv-slang-sc-24", "sv-slang-23", "them",
                "You're leaving a bar together and someone asks how you're getting back.",
                "Hur tar vi oss hem?", "How are we getting home?",
                "Vi tar tuben.", "We'll take the metro.",
                "Den går till ett.", "It runs until one.",
                region="stockholm",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-25", "sv-slang-24", "them",
                "It's two in the morning, the metro has stopped, and there are four of you.",
                "Tunnelbanan har slutat gå.", "The metro has stopped running.",
                "Vi splittar en taxi.", "We'll split a taxi.",
                "Jag beställer.", "I'll order one.",
                notes="Splitta is to split a cost. Swish makes it instant, which is why nobody argues about it.",
                region="stockholm",
                difficulty="hard",
            ),
            scene(
                "sv-slang-sc-26", "sv-slang-40", "them",
                "Someone assumes you haven't been to the island yet, and you have.",
                "Du har väl inte varit på Djurgården?", "You haven't been to Djurgården, have you?",
                "Jodå, förra veckan.", "Actually yes — last week.",
                "Vad bra!", "Oh, good!",
                notes="Jodå contradicts a negative question, the way doch does in German. Answering ja there would be understood as agreeing with the negative.",
            ),
            scene(
                "sv-slang-sc-27", "sv-slang-42", "them",
                "Your friend is still apologising for a spilt drink ten minutes later.",
                "Förlåt igen för glaset.", "Sorry again about the glass.",
                "Skitsamma, glöm det.", "Never mind — forget it.",
                "Okej då.", "All right then.",
                notes="Literally 'shit same'. Milder than it looks: it means it does not matter, not that you are angry.",
            ),
        ],
    },
    # ------------------------------------------------------------------
    "sv-slang-glue": {
        # Kept as words: three noises. They carry tone rather than content, and
        # a scene would be putting words in the gap they exist to fill.
        "keep": ["sv-slang-46", "sv-slang-47", "sv-slang-49"],
        "scenes": [
            scene(
                "sv-slang-sc-28", "sv-slang-43", "them",
                "Someone works out for themselves the thing you were trying to explain.",
                "Så bussen går först, sen tåget?", "So the bus first, then the train?",
                "Precis.", "Exactly.",
                "Då fattar jag.", "Got it.",
                notes="Precis is the confirming noise Swedes make constantly, often several times in a row while somebody else is talking.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-29", "sv-slang-44", "them",
                "You've been trying to remember the name of the place all evening and it lands.",
                "Det hette nåt med Väster…", "It was something with Väster…",
                "Just det, Västerlånggatan!", "That's right — Västerlånggatan!",
                "Där, ja!", "That's the one!",
                notes="Just det is the remembering noise, for something you knew a second ago. Not the same as precis, which agrees with somebody else.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-30", "sv-slang-45", "them",
                "Someone mentions in passing that they lived in your home town for a year.",
                "Jag bodde där ett år faktiskt.", "I actually lived there for a year.",
                "Jaså? Berätta.", "Oh really? Tell me.",
                "Det var länge sen nu.", "It was a long time ago now.",
                notes="Jaså is mild interest, and the tone does all the work: warm it is curiosity, flat it is suspicion.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-31", "sv-slang-48", "them",
                "You knock a glass off the table and it goes everywhere.",
                "Passa dig!", "Watch out!",
                "Oj då, förlåt.", "Whoops — sorry.",
                "Ingen fara alls.", "No harm done at all.",
                notes="Oj då is the small-accident noise. The då softens it into something almost affectionate.",
                difficulty="easy",
            ),
            scene(
                "sv-slang-sc-32", "sv-slang-50", "them",
                "A friend apologises for being twenty minutes late.",
                "Förlåt att jag är sen.", "Sorry I'm late.",
                "Det är lugnt.", "It's all good.",
                "Skönt, jag stressade hit.", "Good — I rushed here.",
                notes="Lugn is calm. Det är lugnt is the Swedish no worries, and it answers almost any apology.",
                difficulty="easy",
            ),
        ],
    },
}

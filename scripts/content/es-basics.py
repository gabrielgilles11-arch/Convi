# The four things the Spanish edition never taught.
#
# "Starting a convo" opened on getting a stranger's attention and went straight
# to where are you from — no hello, no how are you, no name. The Swedish and
# German editions all have them (Läget?, Wie geht's?, Vad heter du?); Spanish
# was the one missing them, and they are the first four lines anybody actually
# needs.
#
# Added as scenes rather than exchanges: practice gains them, the scenario page
# stays exactly as it is.

PLAN = {
    "starting-convo-main": {
        "keep": [],
        "scenes": [
            scene(
                "convo-sc-01", None, "them",
                "Someone you've met once before spots you in the street and says hello.",
                "¡Hola! ¿Qué tal?", "Hi! How are you?",
                "Bien, ¿y tú qué tal?", "Good — how about you?",
                "Aquí andamos.", "Getting by.",
                notes="¿Qué tal? is the default how-are-you in Spain, ahead of ¿cómo estás? It is a greeting more than a question, so a short answer and the same question back is the whole exchange.",
                difficulty="easy",
            ),
            scene(
                "convo-sc-02", None, "them",
                "A friend drops onto the stool next to you with no hello at all.",
                "¡Ey! ¿Qué pasa?", "Hey! What's up?",
                "Nada, aquí tomando algo.", "Nothing much — just having a drink.",
                "Pues me pido otra y me quedo.", "I'll get one and stay, then.",
                notes="¿Qué pasa? is what's up between friends, not a question about what has happened. ¿Qué pasa, tío? is the full version.",
                difficulty="easy",
            ),
            scene(
                "convo-sc-03", None, "them",
                "You've been talking to someone for ten minutes and neither of you has said your name.",
                "Por cierto, ¿cómo te llamas?", "By the way, what's your name?",
                "Me llamo [NOMBRE]. ¿Y tú?", "My name is [NAME]. And you?",
                "Encantado de conocerte.", "Nice to meet you.",
                notes="Me llamo is literally I call myself, and it is the normal answer. Soy [NOMBRE] works too and is a shade more casual.",
                difficulty="easy",
            ),
            scene(
                "convo-sc-04", None, "them",
                "You're introduced to a friend's mother, who greets you properly.",
                "¿Cómo estás?", "How are you?",
                "Muy bien, gracias. ¿Y usted?", "Very well, thank you. And you?",
                "Muy bien, pasa, pasa.", "Very well — come in, come in.",
                notes="Usted with somebody's parents on a first meeting. They will almost certainly tell you to drop it within a minute, and that is the point at which you drop it.",
            ),
        ],
    },
}

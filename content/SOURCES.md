# Sources

Every line of Spanish, Swedish or German in `content/*.json` has to come from
somewhere a person can check: a published phrasebook, a language blog, a course
site. The rule and the reason are in `AGENTS.md` under "Writing copy" — a line
that reads as plausible target language and is subtly wrong is the one failure
the test suite cannot catch, because the tests check structure and never
meaning.

This file is the record. Each block lists the ids it covers and the pages the
lines were taken from, so a reviewer can check a line without re-deriving where
it came from. Entries are added, never rewritten: a source that has gone dead
still says what the line was checked against.

Older material predates this file and is not listed. Anything added from here
on is.

## The first five questions — name, where from, age, work, why here

The getting-to-know-you arc, one subsection per edition. Name, origin, age,
occupation, reason for being in the country, how long you're staying, and the
sentence that says how little of the language you have.

### Spanish — `starting-convo-basics`

Covers `convo-basics-01` … `convo-basics-05`. (`convo-sc-03`,
`starting-convo-02` and `starting-convo-04` moved into this subsection from
`starting-convo-main` and are unchanged.)

- ¿Qué te trae por aquí? / Estoy de vacaciones. / He venido por trabajo. —
  https://www.spanishdict.com/translate/%C2%BFQu%C3%A9%20te%20trae%20por%20aqu%C3%AD
- ¿A qué te dedicas? and answering with "soy" plus the job, no article —
  https://human.libretexts.org/Bookshelves/Languages/Spanish/First-year_Spanish_Bookshelf/PLUMA_1%3A_Historias_en_Espanol_(Hernandez)/01%3A_Numero_1/1.03%3A__Preparacion_Comunicativa/1.3.07%3A_A_que_te_dedicas_Donde_trabajas
- No hablo español. / Hablo un poco de español. —
  https://swaplanguage.com/blog/121-common-spanish-phrases-for-travelers/
- ¿Cuántos años tienes? / Tengo __ años. (tener, not ser) —
  https://spanishboom.com/spanish-phrasebook/introductions/ and
  https://www.spanish.academy/blog/100-essential-spanish-phrases-for-conversational-fluency/

### Swedish — `sv-starting-convo-basics`

Covers `sv-convo-basics-01` … `sv-convo-basics-07`, and the rewrite of
`sv-starting-convo-08`, which now has them asking your name rather than you
asking theirs, so the learner produces "Jag heter …".

- Vad heter du? / Jag heter … , Var kommer du ifrån? / Jag kommer ifrån … ,
  Hur gammal är du? / Jag är … år gammal —
  https://en.wikiversity.org/wiki/Introduction_to_Swedish/Common_phrases
- The same three, plus the note that Swedes drop "år gammal" and just give the
  number — https://preply.com/en/blog/how-to-introduce-yourself-in-swedish-2/
  and https://www.mondly.com/phrasebook/swedish-phrases/category/social-chat/how-old-are-you
- Jag pratar inte svenska. (and "jag lär mig svenska" as the version that keeps
  them in Swedish) — https://www.naturetravels.co.uk/blog/basic-swedish-phrases/
  and https://www.routesnorth.com/blog/swedish-for-tourists/
- Vad jobbar du med? — https://svenskly.se/blog/swedish-conversation-prompts/
- Trevligt att träffas, semester, stannar, and the everyday small-talk frame —
  https://storylearning.com/learn/swedish/swedish-tips/common-swedish-phrases

### German — `de-starting-convo-basics`

Covers `de-convo-basics-01` … `de-convo-basics-07`.
(`de-starting-convo-08` moved into this subsection from
`de-starting-convo-main` and is unchanged.)

- Woher kommst du? / Ich komme aus … , Wie alt bist du? / Ich bin 30 Jahre alt,
  Was machst du beruflich? / Ich bin Lehrer (no article on the job) —
  https://www.olesentuition.co.uk/single-post/how-to-make-small-talk-in-german-a-guide-to-casual-conversation-for-beginners
  and https://www.fluentu.com/blog/german/german-small-talk/
- Ich spreche kein Deutsch. / Ich spreche ein bisschen Deutsch. —
  https://expatexplore.com/blog/german-language-guide-travel-phrases
- Ich bleibe ein paar Tage / eine Woche —
  https://blog.busuu.com/common-german-phrases/ and
  https://thetalkingticket.blog/2026/07/22/master-a2-b1-german-small-talk-with-these-60-call-and-response-phrases/

Also covers `de-convo-basics-08`.

- Ich verstehe nur Bahnhof. (taken verbatim from the article's example
  sentences, with the literal "I only understand train station", the informal
  register, and Das kommt mir Spanisch vor as the same idea) —
  https://www.thelocal.de/20181113/german-phrase-of-the-day-ich-verstehe-nur-bahnhof
  and https://en.wikipedia.org/wiki/Bahnhof_verstehen

## German additions outside that arc

### `de-starting-convo-09` — "Was geht?"

The greeting under-thirties use instead of "Wie geht's?", with "Nicht viel. Was
geht bei dir?" and "Einiges!" as the answers and the warning that it is teen
register. Tagged `young` for that reason.

- https://www.lingoda.com/blog/en/german-slang-terms/
- https://www.fluentu.com/blog/german/casual-informal-german-slang/

### `de-restaurant-09` — asking for the toilet

Spanish and Swedish both had this line and German did not.
"Entschuldigung, wo ist die Toilette?", with the note that Toilette is what you
ask for in public, Klo is the casual one, and the sign says WC.

- https://www.berlitz.com/blog/where-is-the-bathroom-german
- https://strommeninc.com/how-to-say-where-is-the-bathroom-in-german/

## Swedish corrections

### `sv-starting-convo-17` — "Kan du prata lite långsammare?"

Added to `sv-starting-convo-main`: the sentence that keeps a Swede speaking
Swedish instead of switching to English.

- https://www.routesnorth.com/blog/swedish-for-tourists/
- https://storylearning.com/learn/swedish/swedish-tips/common-swedish-phrases

### `sv-fika-02` — "Ska du ha den värmd?" removed

The counter's reply to "En kaffe och en kanelbulle, tack." was "Ska du ha den
värmd?". It is out; the beat now ends on "Varsågod.", which is what is actually
said as the order is handed over. No new line was written for it.

## Talk Mode greetings and goodbyes — `talk` in each content file

The lines every Talk conversation opens and closes with, said on their own.
No scenario page lists them, because nobody needs a page to learn that a bar
starts with hello; Talk needs them because a conversation does.

### Spanish

Covers `es-hola`, `es-buenas`, `es-buenos-dias`, `es-adios`, `es-gracias`,
`es-muchas-gracias`. "Hasta luego." was already in the content
(`starting-convo-07`) and is reused, not added.

- ¡Hola! / ¡Buenas! (all-purpose, any time of day) / ¡Buenos días! on walking
  into a café or up to a market stall / Adiós —
  https://www.immoabroad.com/how-to-greet-someone-in-spain-spanish-greeting-etiquette
- ¡Buenas! as the everyday greeting short of a close friend —
  https://baselang.com/blog/basic-grammar/spanish-greetings-goodbyes/
- Gracias / Muchas gracias / ¡Hola! / Adiós —
  https://blog.busuu.com/common-spanish-phrases/

### Swedish

Covers `sv-hej-da`, `sv-hej-hej`, `sv-tack-hej`, `sv-tack`. "Hej!", "Tja!",
"Ha det bra!" and "Tack så mycket." were already in the content.

- Hej då (the most common goodbye), Hej hej (a common goodbye), Tack hej
  (thanks, bye) — https://www.clozemaster.com/blog/goodbye-in-swedish/
- Tack / Hej då — https://www.naturetravels.co.uk/blog/basic-swedish-phrases/

### German

Covers `de-guten-tag`, `de-tschuess`, `de-auf-wiedersehen`, `de-schoenen-tag`,
`de-gleichfalls`, `de-danke`. "Hallo!", "Grüß Gott!" and "Danke schön." were
already in the content.

- Guten Tag (formal) / Tschüss / Danke(schön) —
  https://www.lingoda.com/blog/en/20-german-phrases-travelling
- Tschüss (the most common bye), Auf Wiedersehen (new acquaintances, older
  people), Schönen Tag noch (what store clerks say) answered with Danke
  gleichfalls — https://www.lingoda.com/blog/en/saying-goodbye-german/

## Talk Mode: asking for the check at a bar, and tipping in Germany

Two lines a local says where the scripts had only the textbook version.

### Spanish

Covers `es-me-cobras` ("Me cobras, por favor."), used in `beer-food-main`
after a second round, beside "La cuenta, porfa.".

- "Me cobras, por favor": how locals often ask for the bill —
  https://theculturetrip.com/europe/spain/articles/11-essential-spanish-phrases-for-ordering-at-a-restaurant-like-a-local
- "Nos cobras por favor" as the bar way to ask for the bill, and "¿Me/Nos
  cobra, por favor?" — https://www.notesinspanish.com/?p=28704
- "¿me cobras cuando puedas?" in a Madrid café dialogue —
  https://elon.io/grammar/spanish-spain/texts/cafe

### German

Covers `de-stimmt-so` ("Stimmt so, danke."), used in `de-beer-food-main` and
`de-restaurant-main` when paying cash.

- "Hier sind 25 €. Stimmt so, danke." answered with "Vielen Dank! Einen
  schönen Tag noch." — https://www.olesentuition.co.uk/single-post/how-to-ask-for-the-bill-in-german
- "das stimmt so" means "keep the change" when paying —
  https://www.yabla.com/german-blog/2019/04/21/tipping-in-germany

## Open questions: more than one right answer

Questions with no single answer (what you're drinking, where you're from) take
every sourced way a traveler might answer, in the guide, in Practice and in
Talk.

### Spanish

Covers new answers on `beer-food-01`: "Una jarra de cerveza, por favor.",
"¿Me pones un doble?", "Una clara.", "Una sin."
- https://www.thelocal.es/20240923/learning-spanish-how-to-order-a-beer-in-spain

Covers "Quiero una copa de Rioja." on `beer-food-01` and "Un café solo." on
`beer-food-coffee-01`.
- https://devourtours.com/blog/how-to-order-drink-madrid/

Covers "Soy de __." on `starting-convo-02` and "Somos de __." on
`nightlife-05`: "Soy de Uruguay.", "Somos de Canadá".
- https://www.spanishdict.com/guide/de-donde-eres

### Swedish

Covers "Jag kommer från [LAND]." on `sv-convo-basics-01`: "Jag kommer från
Colombia", "Jag kommer från Iran".
- https://blogs.transparent.com/swedish/var-kommer-du-ifran/

Covers `sv-kan-jag-fa-kaffe` ("Hej! Kan jag få en kaffe och en kanelbulle?"),
the café scenario.
- https://preply.com/en/blog/how-to-order-food-in-swedish/

### German

Covers new answers on `de-beer-food-01`: "Ich hätte gern ein Helles.", "Kann
ich ein Pils bestellen?", "Ein großes Bier, bitte."
- https://www.olesentuition.co.uk/single-post/essential-german-words-and-phrases-for-beer-lovers

Covers "Ich nehme ein Bier." on `de-beer-food-01`.
- https://lingopie.com/blog/how-to-order-beer-in-german/

Covers "Ich komme aus [LAND]." on `de-convo-basics-01`: "Ich komme aus
Deutschland."
- https://www.lingoda.com/blog/en/introduce-yourself-german/

Covers `de-nein-danke` ("Nein, danke.").
- https://www.dummies.com/article/common-conversational-words-and-phrases-in-german-195687

## Club doors: any age, any group size

Covers "Ich bin [ALTER]." and "Ich bin [ALTER] Jahre alt." on `de-nightlife-02`:
"Ich bin … Jahre alt", and "Ich bin 35" with the years dropped.
- https://www.lingoda.com/blog/en/introduce-yourself-german/

Covers "Vi är [ANTAL]." on `sv-nightlife-01`: "Nej, vi är två.", "Vi är fyra".
- https://elon.io/grammar/swedish/texts/dialogue-restaurant

A blank for a number takes a number, in digits or in words, and a bare number
answers the line on its own. The German and Swedish number words the matcher
recognizes, and how 21 to 99 are built, are from:
- https://www.languagesandnumbers.com/how-to-count-in-german/en/deu/
- https://www.languagesandnumbers.com/how-to-count-in-swedish/en/swe/

## Welcome screens

Convi's hello on the practice and Talk welcome screens (`WELCOME_HELLO` in
`src/lib/welcome.ts`). Try Convi is the name and stays in English.

- "¡Bienvenido a Try Convi!": "bienvenido a casa" (welcome home) —
  https://quillbot.com/blog/?p=30988
- "Välkommen till Try Convi!": "Välkommen till Wikipedia." —
  https://www.clozemaster.com/how-to-say-it/welcome-in-swedish
- "Willkommen bei Try Convi!": "Willkommen bei [Firma]" (welcome to [company]) —
  https://www.lingoda.com/blog/en/welcome-in-german/

## Repair: asking what something means, and staying in the language

Lines for the moment a conversation slips: a word you do not know, a line too
fast to catch, a local who switches to English to be helpful. Talk Mode's
"Huh?" moment draws on these and on the getting-unstuck lines already above.

### Spanish — `starting-convo-main`

Covers `starting-convo-20` ("¿Qué significa eso?") and `starting-convo-21`
("¿Podemos hablar en español, por favor?", with the formal "¿Podríamos hablar
en español, por favor?" in its note).
- https://joyoflanguages.com/posts/spanish-phrases

### Swedish — `sv-starting-convo-main`

Covers `sv-starting-convo-20` ("Kan du fortsätta på svenska?"). The source
gives it after "Ursäkta, jag lär mig svenska. Men jag behöver träna.", and
the advice about not doing it with a queue behind you.
- https://swedishmadeeasy.com/all-swedes-speak-english-or/

### German — `de-starting-convo-main`

Covers `de-starting-convo-20` ("Was bedeutet das?") and `de-starting-convo-21`
("Können Sie das bitte wiederholen?").
- https://storylearning.com/learn/german/german-tips/basic-german-phrases

Covers `de-starting-convo-22` ("Können Sie bitte Deutsch sprechen? Das hilft
mir beim Lernen.").
- https://www.iamexpat.de/education/education-news/how-get-germans-speak-german-you

## Filler words and the little words

One new word list per edition: the fillers and particles everyday speech runs
on, as said in Spain, Sweden and Germany. Each line is the source's own,
example sentences included.

### Spanish — `slang-fillers`

Covers `slang-fill-01` … `slang-fill-07` (Bueno, Pues, Digo, Entonces, Es
decir, Mira, ¿Sabes?), with the uses given in the source's table.
- https://www.spanishdict.com/guide/filler-words-in-spanish

Covers `slang-fill-08` ("¿Vale?" at the end of a sentence, as when giving
directions).
- https://www.fluentu.com/blog/spanish/spanish-filler-words/

### Swedish — `sv-slang-tone`

Covers `sv-slang-tone-01` and `sv-slang-tone-02` ("Jaha.", "Jaha, så det var
därför.", and stretching it to "jahaaa" to sound interested).
- https://www.thelocal.se/20190521/swedish-word-of-the-day-jaha

Covers `sv-slang-tone-03` ("Är du redo? Jajamensan!"). Wiktionary gives
jajamänsan as the standard spelling, which the gloss mentions.
- https://www.thelocal.se/20181116/swedish-word-of-the-day-jajamensan
- https://en.wiktionary.org/wiki/jajamensan

Covers `sv-slang-tone-04` ("Du har väl städat rummet?").
- https://en.wiktionary.org/wiki/v%C3%A4l

Covers `sv-slang-tone-05` … `sv-slang-tone-07`, the three uses of ju.
- https://swedishmadeeasy.com/the-swedish-word-ju/

Covers `sv-slang-tone-08` and `sv-slang-tone-09` (liksom as a filler).
- https://www.thelocal.se/20190423/swedish-word-of-the-day-liksom

### German — `de-slang-fillers`

Covers `de-slang-fill-01` ("Naja.").
- https://www.thelocal.de/20190410/naja/

Covers `de-slang-fill-02` ("Quasi schon.").
- https://www.thelocal.de/20191127/german-word-of-the-day-quasi

Covers `de-slang-fill-03` … `de-slang-fill-08` (also, halt, mal, schon, tja,
äh, each in the source's example sentence).
- https://storylearning.com/learn/german/german-tips/spoken-german

## The four that were missing, and social rituals

### Swedish

Covers `sv-starting-convo-21` ("Vad betyder det?", with the det-not-den note).
- https://elon.io/grammar/swedish/expressions/everyday-phrases

Covers `sv-slang-tone-10` ("Det blir nog bra.").
- https://elon.io/grammar/swedish/discourse/particle-nog-val

Covers `sv-starting-convo-22` ("Tack för maten, det var jättegott!", answered
"Varsågod." or "Tack själv.").
- https://elon.io/grammar/swedish/expressions/fika-culture

### German

Covers `de-slang-fill-09` ("Warum hast du eigentlich nie zurückgerufen?").
- https://babbel.com/en/magazine/german-filler-words

Covers `de-slang-fill-10` ("Das war ein langer Tag, ne?").
- https://elon.io/grammar/german/questions/tag-questions-and-echo

Covers `de-convo-basics-09` ("Darf ich Sie duzen?", and "Sie können mich
gerne duzen." in its note) and `de-convo-basics-10` ("Mahlzeit!").
- https://storylearning.com/learn/german/german-tips/german-greetings
- https://elon.io/grammar/german/pragmatics/greetings-and-leave-taking

Covers `de-convo-basics-11` ("Schönen Feierabend noch!").
- https://elon.io/grammar/german/expressions/greetings-and-social

Covers `de-beer-food-09` ("Ist hier noch frei?"). "Ja, klar." is the
content's own, from `de-starting-convo-03`; "ja klar" as the answer to this
question is from Memrise.
- https://www.lingoda.com/blog/en/the-most-common-german-phrases/
- https://www.memrise.com/dictionary/german/how-to-say-may-i-sit-here

### Spanish

Covers `starting-convo-22` ("¿Quedamos mañana a las seis?" / "Vale,
perfecto.") and the quedar-not-quedarse note.
- https://elon.io/grammar/spanish-spain/expressions/polite
- https://elon.io/grammar/spanish-spain/verb-reference/quedarse

Covers `restaurant-33` ("La cuenta, cuando puedas.") and the sobremesa note.
- https://elon.io/grammar/spanish-spain/paths/travel-spanish

Covers the dos besos line added to the note on `convo-sc-03`.
- https://www.spanishdict.com/translate/dos%20besos

## The basics, and local food and drink

The new `basics` section in each edition opens with "The first five
questions", moved unchanged from `starting-convo` (its sources are listed
above), and adds a subsection on how you look, what you're wearing and where
you're from. Each edition's food section gains a subsection of local orders.
Every line is copied as the page prints it; where a page gave a longer
exchange, only whole sentences were taken.

### Spanish — `basics-describe`

Covers `basics-describe-01` … `basics-describe-08`.

- ¿Qué llevas puesto? —
  https://www.spanishdict.com/translate/qu%C3%A9%20llevas%20puesto
- Llevo unos pantalones blancos con camiseta. / Llevo gafas y llevo un reloj
  de pulsera. / Llevo el pelo largo. / Llevo gafas negras. / Llevo dos años
  aquí en Barcelona. —
  https://www.spanishdict.com/answers/117867/does-llevar-or-usar-mean-to-wear-as-in-clothes
- Tengo los ojos verdes y mi hermano los tiene azules. (and the article-not-
  possessive note) —
  https://elon.io/grammar/spanish-spain/articles/with-body-parts
- Oye, tienes una sonrisa muy bonita, te lo digo ya. / Pues mira, tú también,
  así que vamos bien. / Tienes unos ojos preciosos. / ¿De dónde eres? Por el
  acento no me ubico. / De Bilbao, pero vivo en Madrid desde los veinte. ¿Y
  tú? — https://elon.io/grammar/spanish-spain/texts/dating

### Spanish — `beer-food-local`

Covers `beer-food-local-01` … `beer-food-local-09`.

- ¿Os traigo algo de beber mientras vais mirando? / Para mí un vermut, por
  favor. / Marchando. ¿Y os traigo pan? / Ponnos tres cañas. / ¿Qué tenéis hoy
  de especial? / Hoy tenemos pulpo a la gallega, … que las hace mi madre. /
  Pues ponnos una ración de pulpo, media de croquetas, una tortilla para
  compartir y unos calamares. / Hecho. ¿Algo más? —
  https://elon.io/grammar/spanish-spain/texts/restaurant
- Ponme una caña y una de bravas. / Marchando. / ¿Pedimos una ración de jamón
  y dos cañas para empezar? / En verano nada como una clara con limón bien
  fría en una terraza. —
  https://elon.io/grammar/spanish-spain/regional/lexical-food
- Hola, ¿me pone un tercio? / ¿Qué cervezas de barril tienes? (and the tercio,
  mediana and house-pilsner notes) —
  https://www.thelocal.es/20240923/learning-spanish-how-to-order-a-beer-in-spain

### German — `de-basics-describe`

Covers `de-basics-describe-01` … `de-basics-describe-08`.

- Wie alt bist du, wenn ich fragen darf? / Ich bin neunundzwanzig. Und du? /
  Ich bin dreiundzwanzig. Schön, dich kennenzulernen! / Hast du Instagram? /
  Ich spreche Spanisch, Deutsch und ein bisschen Englisch. —
  https://elon.io/grammar/german/texts/dialogue-introductions
- Ich bin mittelgroß und habe braune Augen / Heute trage ich eine Bluse und
  eine Brille / Du siehst heute gut aus / Das Kleid steht dir —
  https://preply.com/en/blog/describe-a-person-in-german/
- Trägst du heute wirklich Sandalen? Es regnet doch. —
  https://elon.io/grammar/german/verb-reference/tragen

### German — `de-beer-food-local`

Covers `de-beer-food-local-01` … `de-beer-food-local-09`.

- Sicher, welches Bier möchten Sie? / Kann ich ein helles Bier bekommen, nicht
  zu bitter? / Natürlich, kommt sofort. / Ich brauche ein Bier! / So schlimm?
  (and Feierabendbier) — https://www.berlitz.com/blog/beer-cheers-german
- Ich hätt’ gern einen halben Liter Hefeweizen, bitte —
  https://www.fluentu.com/blog/german/how-to-order-a-beer-in-german/
- Helles, Augustiner, Spaten, Kölsch, Radler and Alster in the notes —
  https://www.lingoda.com/blog/en/german-beer-types/
- Ich hätte gerne die Käsespätzle, bitte. / Einmal Wiener Schnitzel, bitte /
  Sind die Pommes dabei? / Haben Sie etwas Vegetarisches? —
  https://www.fluentin3months.com/food-in-german/
- Danke. Was können Sie uns denn empfehlen? / Das Schnitzel mit
  Bratkartoffeln ist heute sehr gut, und die Kürbissuppe als Vorspeise. /
  Machen Sie vierzig, stimmt so. —
  https://elon.io/grammar/german/texts/dialogue-restaurant

### Swedish — `sv-basics-describe`

Covers `sv-basics-describe-01` … `sv-basics-describe-09`.

- Hej! Du ser fräsch ut idag. / Tack så mycket! Jag gillar din tröja. / Jag
  gillar ditt hår / Vilken fin jacka / Du har vackra ögon. —
  https://preply.com/en/blog/compliments-in-swedish/
- Jag har en blå skjorta på mig idag —
  https://preply.com/en/blog/colors-in-swedish/
- Hon är mycket lång och har brunt hår. —
  https://www.babbel.com/en/magazine/most-common-swedish-adjectives
- Hon har gröna ögon och bär glasögon när hon läser. —
  https://elon.io/grammar/swedish/expressions/body-health
- Detsamma! Var kommer du ifrån? / Jag bor här i Stockholm, men jag kommer
  från Malmö. / Jag studerar svenska. Pratar du engelska? / Ja, lite. Men vi
  pratar svenska nu! —
  https://elon.io/grammar/swedish/texts/dialogue-first-meeting

### Swedish — `sv-beer-food-local`

Covers `sv-beer-food-local-01` … `sv-beer-food-local-09`.

- Vill ni ha något att dricka medan ni tittar? / Jag tar en öl, tack. Och vad
  rekommenderar du? / Våra köttbullar med potatismos är väldigt populära. Och
  fisken är dagens. / Då tar jag köttbullarna. / Utmärkt val. Kommer strax. /
  Kan jag betala med kort? Eller går det bra med Swish? / Kan jag få notan,
  tack? — https://elon.io/grammar/swedish/texts/dialogue-restaurant
- Vill du ha kaffet att ta med eller dricka här? / Att ta med, tack. Och vad
  kostar det? / Det blir femtiofem kronor. —
  https://elon.io/grammar/swedish/texts/dialogue-cafe
- Hur mycket mjölk vill du ha? / Lagom, tack. / Ska vi fika? Jag bjuder på
  kanelbullar. / På fredagar blir det fredagsmys med tacos och film. / På
  midsommar dansar vi runt midsommarstången och äter sill. —
  https://elon.io/grammar/swedish/countries/swedish-culture

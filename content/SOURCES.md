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

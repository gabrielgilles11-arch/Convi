// Talk Mode's conversation scripts. Client-safe: no content import, and no
// line of the target language anywhere in this file.
//
// Talk used to walk a scenario page's exchanges in the order they were listed,
// and a scenario page is a list: eight things that can happen at a bar, each
// one written to stand on its own. Played back to back they made a bartender
// who asks which beer you want and then ignores the answer, a "Son __ euros"
// with the blank still in it, and an offer of another round after you had
// paid. Nobody said hello and nobody said goodbye.
//
// A script is the order the conversation actually goes in. You open it, the
// way you open every one of these on a trip: "¡Buenas!", "Hej!", "Grüß Gott!".
// They answer what you said, not the next line on a list, and where what you
// say changes what happens (a caña gets "¿Algo de comer?", a "cerveza" gets
// "¿De barril o de botella?") the script says so. It ends with a goodbye.
//
// Every line is still a reference into the content files, resolved on the
// server (lib/conversations.ts). A reference is an exchange and a part (`q`,
// `aN`, `r`, with `alt` picking one side of an "A / B" line), or one of the
// sourced greetings and goodbyes under `talk` in content/*.json. What a script
// adds is order, branching, and the pairings across exchanges that the content
// keeps apart; ARCHITECTURE.md lists how to review them.
//
// Rules the tests hold every script to:
// - every reference resolves, and none of their lines has a blank or a slash
//   in it ("Son __ euros", "guapo/guapa"), since nobody says those out loud;
// - every path through a script ends, in three to ten turns;
// - every script opens with a line of yours, except the two in THEY_OPEN.

import type { Part, Ref } from "./gameScripts";

/** A line in the content: an exchange part, or a sourced talk line by id. */
export type TalkRef = Ref | { line: string };

export interface TalkSay {
  /** Something you can say here. */
  say: TalkRef;
  /** What comes back to this line in particular. Overrides the step's. */
  back?: TalkRef | null;
  /** Where this line takes the conversation. Overrides the step's. */
  next?: string | null;
}

export interface TalkStep {
  id: string;
  /** They speak first on this step. */
  them?: TalkRef;
  /**
   * You speak first and nothing they said tells you what about, so the screen
   * says it in a few words of English. Kept to the steps that need it: you
   * wanting the check, the toilet, a receipt.
   */
  cue?: string;
  /** Every line here is a right thing to say. */
  says: TalkSay[];
  /** What comes back, unless the line said has its own. */
  back?: TalkRef | null;
  /** The step after this one. Omitted: the next one listed. Null: the end. */
  next?: string | null;
}

export interface TalkScript {
  /** The subsection it is written for, which is also the conversation's id. */
  id: string;
  /** Where you are, in a sentence of English. Shown once, at the top. */
  intro: string;
  steps: TalkStep[];
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const q = (ex: string, alt?: number): Ref => ({ ex, part: "q", ...(alt === undefined ? {} : { alt }) });
const r = (ex: string, alt?: number): Ref => ({ ex, part: "r", ...(alt === undefined ? {} : { alt }) });
const a = (ex: string, i: 0 | 1 | 2, alt?: number): Ref => ({
  ex,
  part: `a${i}` as Part,
  ...(alt === undefined ? {} : { alt }),
});
/** A sourced greeting or goodbye from `talk` in the content file. */
const t = (line: string) => ({ line });

/** A line you can say, with its own reply and its own way on where it has one. */
function y(say: TalkRef, back?: TalkRef | null, next?: string | null): TalkSay {
  return {
    say,
    ...(back === undefined ? {} : { back }),
    ...(next === undefined ? {} : { next }),
  };
}

function step(id: string, body: Omit<TalkStep, "id">): TalkStep {
  return { id, ...body };
}

// ---------------------------------------------------------------------------
// Spain
// ---------------------------------------------------------------------------

const ES_HI = [y(t("es-hola")), y(t("es-buenas"))];
const ES_HI_MORNING = [y(t("es-hola")), y(t("es-buenas")), y(t("es-buenos-dias"))];
/** "Hasta luego." is the content's own (starting-convo-07); it works said either way. */
const ES_HASTA = q("starting-convo-07");
const ES_BYE = [y(ES_HASTA), y(t("es-adios")), y(t("es-gracias")), y(t("es-muchas-gracias"))];
const ES_THANKS = [y(t("es-gracias")), y(t("es-muchas-gracias"))];

const ES: TalkScript[] = [
  {
    id: "beer-food-main",
    intro: "You walk up to the bar. The bartender looks over.",
    steps: [
      step("hi", { says: ES_HI, back: q("beer-food-01") }),
      step("order", {
        says: [
          y(a("beer-food-01", 0), r("beer-food-01"), "food"),
          y(a("beer-food-01", 1), q("beer-food-02"), "tap"),
        ],
      }),
      step("tap", {
        says: [y(a("beer-food-02", 0)), y(a("beer-food-02", 1))],
        back: r("beer-food-03"),
        next: "more",
      }),
      step("food", {
        says: [
          y(a("beer-food-04", 1), r("beer-food-04")),
          y(a("beer-food-06", 1), r("beer-food-06")),
        ],
        next: "another",
      }),
      step("more", {
        them: q("beer-food-04"),
        says: [y(a("beer-food-04", 1)), y(a("beer-food-04", 0))],
        back: r("beer-food-04"),
      }),
      step("another", {
        them: q("beer-food-06"),
        says: [y(a("beer-food-06", 0)), y(a("beer-food-06", 1))],
        back: r("beer-food-06"),
      }),
      step("check", {
        them: q("beer-food-08", 0),
        says: [y(a("beer-food-08", 0))],
        back: r("beer-food-08"),
      }),
      step("pay", {
        them: q("beer-food-07"),
        says: [y(a("beer-food-07", 0), r("beer-food-07")), y(a("beer-food-07", 1), null)],
      }),
      step("bye", { cue: "All paid. Say bye on the way out.", says: ES_BYE, back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "beer-food-coffee",
    intro: "Morning. You walk into a café and up to the counter.",
    steps: [
      step("hi", { says: ES_HI_MORNING, back: q("beer-food-coffee-01") }),
      step("order", {
        says: [
          y(a("beer-food-coffee-01", 0), r("beer-food-coffee-01"), "here"),
          y(a("beer-food-coffee-01", 1), r("beer-food-coffee-01"), "here"),
          y(q("beer-food-coffee-06"), a("beer-food-coffee-06", 0), "food"),
        ],
      }),
      step("here", {
        says: [y(a("beer-food-05", 0)), y(a("beer-food-05", 1))],
        back: r("beer-food-coffee-02"),
      }),
      step("food", {
        them: q("beer-food-coffee-07"),
        says: [
          y(a("beer-food-coffee-07", 0), r("beer-food-coffee-07")),
          y(a("beer-food-06", 1), r("beer-food-06")),
        ],
      }),
      step("price", {
        cue: "Ask how much it is.",
        says: [y(q("beer-food-coffee-08"))],
        back: a("beer-food-coffee-08", 0),
      }),
      step("bye", { says: ES_BYE, back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "starting-convo-main",
    intro: "You're lost and need to ask someone on the street, in Spanish.",
    steps: [
      step("hi", { says: [y(q("starting-convo-01", 0)), ...ES_HI], back: r("starting-convo-01", 1) }),
      step("way", { cue: "Ask if this is the way to where you're going.", says: [y(q("lost-01"))], back: r("lost-01") }),
      step("lost", {
        cue: "That was fast. You didn't catch it.",
        says: [
          y(q("starting-convo-12"), a("starting-convo-12", 0), "again"),
          y(q("starting-convo-05"), a("starting-convo-05", 1), "slower"),
        ],
      }),
      step("slower", { says: [y(a("beer-food-08", 0))], back: null }),
      step("again", { them: r("lost-01"), says: [y(a("restaurant-31", 0)), ...ES_THANKS], back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "starting-convo-basics",
    intro: "At a bar, the person on the next stool turns to you.",
    steps: [
      step("hi", { says: ES_HI, back: q("convo-sc-01") }),
      step("howareyou", { says: [y(a("convo-sc-01", 0))], back: r("convo-sc-01") }),
      step("spanish", {
        them: q("convo-basics-01"),
        says: [y(a("convo-basics-01", 0)), y(a("convo-basics-01", 1))],
        back: r("convo-basics-01"),
      }),
      step("from", { them: q("starting-convo-02"), says: [y(a("starting-convo-02", 0))], back: null }),
      step("why", {
        them: q("convo-basics-02"),
        says: [y(a("convo-basics-02", 0)), y(a("convo-basics-02", 1))],
        back: r("convo-basics-02"),
      }),
      step("long", {
        them: q("starting-convo-04"),
        says: [y(a("starting-convo-04", 1)), y(a("starting-convo-04", 0))],
        back: null,
      }),
      step("job", {
        them: q("convo-basics-04"),
        says: [y(a("convo-basics-04", 0)), y(a("convo-basics-04", 1))],
        back: r("convo-basics-04"),
      }),
      step("you", {
        cue: "Ask what they do.",
        says: [y(q("convo-basics-05"))],
        back: a("convo-basics-05", 0),
      }),
      step("name", {
        them: q("convo-sc-03"),
        says: [y(a("convo-sc-03", 0)), y(a("convo-sc-03", 1))],
        back: r("convo-sc-03"),
      }),
      step("bye", {
        cue: "Time to go.",
        says: [y(q("starting-convo-11"), r("starting-convo-11")), y(ES_HASTA, ES_HASTA)],
        next: null,
      }),
    ],
  },
  {
    id: "starting-convo-bond",
    intro: "There's a game on in the bar. The guy next to you turns around.",
    steps: [
      step("hi", { says: ES_HI, back: q("starting-convo-13") }),
      step("score", {
        says: [y(a("starting-convo-13", 0)), y(a("starting-convo-13", 1))],
        back: r("starting-convo-13"),
      }),
      step("ref", { says: [y(q("starting-convo-14"))], back: a("starting-convo-14", 0) }),
      step("team", {
        them: q("starting-convo-08"),
        says: [
          y(a("starting-convo-08", 0), a("starting-convo-15", 0)),
          y(a("starting-convo-08", 1, 0), r("starting-convo-08")),
          y(a("starting-convo-08", 1, 1), r("starting-convo-08")),
        ],
      }),
      step("last", {
        them: q("starting-convo-16"),
        says: [y(a("starting-convo-16", 0)), y(a("starting-convo-16", 1))],
        back: r("starting-convo-16"),
      }),
      step("bye", {
        says: [y(q("starting-convo-11"), r("starting-convo-11")), y(ES_HASTA, ES_HASTA)],
        next: null,
      }),
    ],
  },
  {
    id: "airport",
    intro: "You've just landed in Madrid. Passport control first.",
    steps: [
      step("hi", { says: ES_HI_MORNING, back: q("airport-04") }),
      step("passport", { says: [y(a("airport-04", 0))], back: r("airport-04") }),
      step("bags", {
        cue: "Find out where the bags come out.",
        says: [y(q("airport-05"))],
        back: a("airport-05", 0),
      }),
      step("customs", { them: q("airport-08"), says: [y(a("airport-08", 0))], back: r("airport-08") }),
      step("town", {
        cue: "In arrivals. Metro or taxi into town?",
        says: [
          y(q("airport-03"), a("airport-03", 0), "ticket"),
          y(q("airport-01"), a("airport-01", 0), "fare"),
        ],
      }),
      step("ticket", {
        cue: "Ask where to buy a ticket.",
        says: [y(q("airport-07"))],
        back: a("airport-07", 0),
        next: "thanks",
      }),
      step("fare", {
        cue: "At the rank, ask the fare to the center.",
        says: [y(q("airport-02"))],
        back: a("airport-02", 0),
      }),
      step("hopin", { them: r("airport-02"), says: [y(r("beer-food-06"))], back: null, next: null }),
      step("thanks", { says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "taxi",
    intro: "You get into a taxi.",
    steps: [
      step("hi", { says: ES_HI, back: q("taxi-01") }),
      step("where", {
        says: [y(a("taxi-01", 0)), y(a("taxi-01", 1))],
        back: r("taxi-01", 0),
      }),
      step("meter", {
        cue: "The meter isn't running.",
        says: [y(q("taxi-03"))],
        back: a("taxi-03", 0),
      }),
      step("route", {
        them: q("taxi-02"),
        says: [y(a("taxi-02", 0), r("taxi-02")), y(q("taxi-08"), a("taxi-08", 0))],
      }),
      step("card", { cue: "Check they take card.", says: [y(q("taxi-04"))], back: r("taxi-04") }),
      step("stop", { cue: "You're there.", says: [y(q("taxi-05"))], back: null }),
      step("receipt", { cue: "Ask for a receipt.", says: [y(q("taxi-06"))], back: a("taxi-06", 0) }),
      step("bye", { them: r("taxi-06"), says: ES_BYE, back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "metro",
    intro: "You're taking the metro across town.",
    steps: [
      step("entrance", {
        cue: "Ask someone where the metro entrance is.",
        says: [y(q("metro-01"))],
        back: a("metro-01", 0),
      }),
      step("platform", {
        cue: "On the platform. Check it's the right direction.",
        says: [y(q("metro-08"))],
        back: a("metro-08", 0),
      }),
      step("ticket", { them: q("metro-06"), says: [y(a("metro-06", 0))], back: r("metro-06") }),
      step("closing", {
        cue: "Ask what time the metro closes.",
        says: [y(q("metro-07"))],
        back: a("metro-07", 1),
      }),
      step("thanks", { says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "getting-around-lost",
    intro: "It's late, your phone is dead, and nothing looks familiar.",
    steps: [
      step("hi", { says: [y(q("starting-convo-01", 0)), ...ES_HI], back: r("starting-convo-01", 1) }),
      step("lost", { says: [y(q("lost-03"))], back: r("lost-03") }),
      step("way", { says: [y(q("lost-01"))], back: r("lost-01") }),
      step("far", { says: [y(q("lost-02"))], back: r("lost-02") }),
      step("dark", {
        cue: "The street ahead looks dark.",
        says: [y(q("lost-08"))],
        back: a("lost-08", 0),
      }),
      step("thanks", { says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "restaurant-seating",
    intro: "Two of you, no booking, a busy restaurant.",
    steps: [
      step("hi", { says: ES_HI, back: q("restaurant-03") }),
      step("howmany", { says: [y(a("restaurant-03", 0))], back: q("restaurant-02") }),
      step("booking", {
        says: [
          y(a("restaurant-02", 0), r("restaurant-03"), "wait"),
          y(a("restaurant-02", 1), r("restaurant-02"), "inout"),
        ],
      }),
      step("wait", {
        cue: "Ask how long the wait is.",
        says: [y(q("restaurant-17"), a("restaurant-17", 0)), y(q("restaurant-04"), a("restaurant-04", 0))],
      }),
      step("inout", {
        them: q("restaurant-16"),
        says: [y(a("restaurant-16", 0)), y(a("restaurant-16", 1))],
        back: r("restaurant-16"),
      }),
      step("thanks", { says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "restaurant-ordering",
    intro: "You're seated. The waiter comes over.",
    steps: [
      step("hi", { says: ES_HI, back: q("restaurant-07") }),
      step("bread", {
        says: [y(a("restaurant-07", 0)), y(a("restaurant-07", 1))],
        back: r("restaurant-07"),
      }),
      step("menu", {
        cue: "Ask if there's a set lunch menu.",
        says: [y(q("restaurant-21"))],
        back: a("restaurant-21", 0),
      }),
      step("dish", { cue: "Ask what's in one of the dishes.", says: [y(q("restaurant-19"))], back: a("restaurant-19", 0) }),
      step("allergy", { cue: "You're allergic to nuts.", says: [y(q("restaurant-20"))], back: a("restaurant-20", 0) }),
      step("order", {
        them: q("restaurant-05"),
        says: [y(a("restaurant-05", 1)), y(a("restaurant-05", 0))],
        back: null,
      }),
      step("main", { them: q("restaurant-22"), says: [y(a("restaurant-22", 0))], back: r("restaurant-22"), next: null }),
    ],
  },
  {
    id: "restaurant-problems",
    intro: "The food is taking a while.",
    steps: [
      step("hi", { says: [y(q("starting-convo-01", 0))], back: r("starting-convo-01", 0) }),
      step("waiting", { says: [y(q("restaurant-23"))], back: a("restaurant-23", 0) }),
      step("wrong", {
        cue: "A plate arrives. It isn't yours.",
        says: [y(q("restaurant-09"), a("restaurant-09", 0)), y(q("restaurant-14"), r("restaurant-14"))],
      }),
      step("cold", { cue: "Your own dish comes, and it's cold.", says: [y(q("restaurant-13"))], back: r("restaurant-13") }),
      step("bread", { cue: "Ask for a bit more bread.", says: [y(q("restaurant-24"))], back: a("restaurant-24", 0) }),
      step("toilet", { cue: "Ask where the toilet is.", says: [y(q("restaurant-25"))], back: a("restaurant-25", 0) }),
      step("thanks", { says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "restaurant-paying",
    intro: "Plates cleared. The waiter stops by the table.",
    steps: [
      step("ok", {
        them: q("restaurant-32"),
        says: [y(a("restaurant-32", 0), r("restaurant-32")), y(a("restaurant-32", 1), null)],
      }),
      step("bill", { cue: "Ask for the check.", says: [y(q("restaurant-11"))], back: a("restaurant-11", 0) }),
      step("how", {
        them: r("restaurant-11"),
        says: [y(a("beer-food-07", 0), r("beer-food-07"), "bye"), y(a("beer-food-07", 1), null, "change")],
      }),
      step("change", { cue: "Leave the change for them.", says: [y(q("restaurant-31"))], back: a("restaurant-31", 0), next: null }),
      step("bye", { says: ES_BYE, back: a("restaurant-31", 0), next: null }),
    ],
  },
  {
    id: "hotel-checkin",
    intro: "You walk up to the hotel's front desk with your bags.",
    steps: [
      step("hi", { says: ES_HI_MORNING, back: q("hotel-01") }),
      step("booking", { says: [y(a("hotel-01", 0)), y(a("hotel-01", 1))], back: r("hotel-01") }),
      step("passport", { says: [y(a("nightlife-10", 0))], back: null }),
      step("breakfast", { cue: "Ask if breakfast is included.", says: [y(q("hotel-05"))], back: r("hotel-05", 0) }),
      step("wifi", { cue: "And the wifi password.", says: [y(q("hotel-06"))], back: r("hotel-06") }),
      step("checkout", { cue: "Ask what time checkout is.", says: [y(q("hotel-03"))], back: r("hotel-03") }),
      step("thanks", { says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "shopping-shops",
    intro: "You wander into a clothes shop.",
    steps: [
      step("hi", { says: ES_HI, back: q("shopping-11") }),
      step("looking", { says: [y(a("shopping-11", 0))], back: r("shopping-11") }),
      step("price", { cue: "You like a jacket. Ask the price.", says: [y(q("shopping-02"))], back: r("shopping-02") }),
      step("size", {
        them: q("shopping-03"),
        says: [y(a("shopping-03", 1), r("shopping-03")), y(a("shopping-03", 0), null)],
      }),
      step("color", { cue: "Ask if it comes in another color.", says: [y(q("shopping-09"))], back: a("shopping-09", 0) }),
      step("card", { cue: "Check they take card.", says: [y(q("shopping-04"))], back: r("shopping-04") }),
      step("bye", { says: ES_BYE, back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "shopping-market",
    intro: "Saturday market. You join the crowd at a fruit stall.",
    steps: [
      step("queue", {
        them: q("shopping-13"),
        says: [y(a("shopping-13", 1)), y(a("shopping-13", 0))],
        back: r("shopping-13"),
      }),
      step("hi", { cue: "Your turn.", says: ES_HI_MORNING, back: t("es-buenas") }),
      step("price", { cue: "Ask how much the tomatoes are.", says: [y(a("shopping-05", 0))], back: r("shopping-05") }),
      step("ripe", { says: [y(q("shopping-15"))], back: a("shopping-15", 0) }),
      step("weight", { cue: "Ask for half a kilo.", says: [y(q("shopping-14"))], back: a("shopping-14", 0) }),
      step("bye", { says: ES_BYE, back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "resacon-pharmacy",
    intro: "Rough morning. You make it to the pharmacy.",
    steps: [
      step("hi", { says: ES_HI_MORNING, back: t("es-buenas") }),
      step("stomach", {
        cue: "Something you ate last night didn't agree with you.",
        says: [y(q("resacon-03"))],
        back: r("resacon-03"),
      }),
      step("prescription", { says: [y(q("resacon-06"))], back: a("resacon-06", 0) }),
      step("often", { says: [y(q("resacon-08"))], back: a("resacon-08", 0) }),
      step("bye", { says: ES_BYE, back: ES_HASTA, next: null }),
    ],
  },
  {
    id: "nightlife-door",
    intro: "1 a.m. The three of you reach the door of a club.",
    steps: [
      step("hi", { says: ES_HI, back: q("nightlife-01") }),
      step("howmany", { says: [y(a("nightlife-01", 0))], back: q("nightlife-10") }),
      step("id", { says: [y(a("nightlife-10", 0))], back: null }),
      step("cover", { cue: "Ask if there's a cover charge.", says: [y(q("nightlife-02"))], back: r("nightlife-02") }),
      step("coats", { cue: "Ask about a cloakroom.", says: [y(q("nightlife-13"))], back: a("nightlife-13", 0) }),
      step("late", { says: [y(q("nightlife-03"))], back: r("nightlife-03") }),
      step("in", { them: r("nightlife-10"), says: ES_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "nightlife-friends",
    intro: "You and a friend get talking to the group at the next table.",
    steps: [
      step("hi", { says: ES_HI, back: q("nightlife-05") }),
      step("from", { says: [y(a("nightlife-05", 0))], back: r("nightlife-05") }),
      step("first", { says: [y(a("taxi-04", 0))], back: null }),
      step("plans", { cue: "Ask what the plan is tonight.", says: [y(q("nightlife-07"))], back: r("nightlife-07") }),
      step("in", {
        says: [
          y(r("nightlife-06"), null, null),
          y(q("nightlife-16"), a("nightlife-16", 0), "leave"),
        ],
      }),
      step("leave", {
        says: [y(q("starting-convo-11")), y(q("nightlife-09"))],
        back: r("nightlife-16"),
        next: null,
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Sweden
// ---------------------------------------------------------------------------

const SV_HEJ = a("sv-starting-convo-01", 1);
const SV_HI = [y(SV_HEJ)];
const SV_HI_CASUAL = [y(q("sv-starting-convo-01")), y(SV_HEJ)];
const SV_THANKS = [y(t("sv-tack")), y(r("sv-getting-around-22"))];
const SV_BYE = [
  y(t("sv-hej-da")),
  y(t("sv-hej-hej")),
  y(t("sv-tack-hej")),
  y(r("sv-starting-convo-07")),
  y(t("sv-tack")),
];

const SV: TalkScript[] = [
  {
    id: "sv-beer-food-main",
    intro: "First night in Stockholm. You walk up to the bar.",
    steps: [
      step("hi", { says: SV_HI_CASUAL, back: q("sv-beer-food-01") }),
      step("order", {
        says: [y(a("sv-beer-food-01", 1)), y(a("sv-beer-food-01", 0))],
        back: r("sv-beer-food-01"),
      }),
      step("tap", { says: [y(a("sv-beer-food-02", 0)), y(a("sv-beer-food-02", 1))], back: null }),
      step("id", {
        them: q("sv-beer-food-06"),
        says: [y(a("sv-beer-food-06", 0)), y(a("sv-beer-food-06", 1))],
        back: r("sv-beer-food-06"),
      }),
      step("food", {
        them: q("sv-beer-food-03"),
        says: [
          y(a("sv-beer-food-03", 0), r("sv-beer-food-03", 0)),
          y(a("sv-beer-food-03", 1), r("sv-beer-food-03", 0)),
          y(a("sv-beer-food-04", 0), null),
        ],
      }),
      step("pay", {
        them: q("sv-beer-food-08"),
        says: [y(a("sv-beer-food-08", 0), null), y(a("sv-beer-food-08", 1), r("sv-beer-food-08"))],
      }),
      step("receipt", {
        them: q("sv-beer-food-04"),
        says: [y(a("sv-beer-food-04", 0)), y(a("sv-beer-food-04", 1))],
        back: r("sv-beer-food-04"),
      }),
      step("bye", { says: SV_BYE, back: null, next: null }),
    ],
  },
  {
    id: "sv-beer-food-fika",
    intro: "Mid-afternoon. Time for fika at a café.",
    steps: [
      step("hi", { says: SV_HI, back: SV_HEJ }),
      step("buns", { cue: "Ask what buns they have today.", says: [y(q("sv-fika-05"))], back: a("sv-fika-05", 0) }),
      step("order", { says: [y(q("sv-fika-02"))], back: null }),
      step("here", {
        them: q("sv-fika-06"),
        says: [y(a("sv-fika-06", 0), r("sv-fika-06"), "refill"), y(a("sv-fika-06", 1), r("sv-fika-06"), "bye")],
      }),
      step("refill", { cue: "Ask if refills are included.", says: [y(q("sv-fika-04"))], back: a("sv-fika-04", 0) }),
      step("bye", { says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
  {
    id: "sv-starting-convo-main",
    intro: "You need directions, and you want to try it in Swedish.",
    steps: [
      step("hi", { says: SV_HI, back: SV_HEJ }),
      step("where", { cue: "Ask where a place is.", says: [y(q("sv-starting-convo-06"))], back: a("sv-starting-convo-06", 0, 1) }),
      step("lost", { says: [y(q("sv-starting-convo-04"))], back: a("sv-starting-convo-04", 0) }),
      step("swedish", {
        them: r("sv-starting-convo-04"),
        says: [y(q("sv-starting-convo-17"))],
        back: a("sv-starting-convo-17", 0),
      }),
      step("bye", { them: r("sv-starting-convo-06", 0), says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
  {
    id: "sv-starting-convo-basics",
    intro: "At a bar, the person next to you says hi.",
    steps: [
      step("hi", { says: SV_HI_CASUAL, back: r("sv-starting-convo-01") }),
      step("how", { says: [y(a("sv-starting-convo-02", 0))], back: r("sv-starting-convo-02", 0) }),
      step("name", {
        them: q("sv-starting-convo-08"),
        says: [y(a("sv-starting-convo-08", 0)), y(a("sv-starting-convo-08", 1))],
        back: r("sv-starting-convo-08"),
      }),
      step("from", {
        them: q("sv-convo-basics-01"),
        says: [y(a("sv-convo-basics-01", 0)), y(a("sv-convo-basics-01", 1))],
        back: r("sv-convo-basics-01"),
      }),
      step("holiday", {
        them: q("sv-convo-basics-03"),
        says: [y(a("sv-convo-basics-03", 0)), y(a("sv-convo-basics-03", 1))],
        back: r("sv-convo-basics-03"),
      }),
      step("long", {
        them: q("sv-convo-basics-04"),
        says: [y(a("sv-convo-basics-04", 0)), y(a("sv-convo-basics-04", 1))],
        back: r("sv-convo-basics-04"),
      }),
      step("job", {
        them: q("sv-convo-basics-05"),
        says: [y(a("sv-convo-basics-05", 0)), y(a("sv-convo-basics-05", 1))],
        back: r("sv-convo-basics-05"),
      }),
      step("you", { cue: "Ask what they do.", says: [y(q("sv-convo-basics-07"))], back: a("sv-convo-basics-07", 0) }),
      step("bye", {
        cue: "Time to head off.",
        says: [y(q("sv-nightlife-15"), r("sv-nightlife-15")), y(r("sv-starting-convo-07"), t("sv-hej-hej"))],
        next: null,
      }),
    ],
  },
  {
    id: "sv-getting-around-airport",
    intro: "You've just landed at Arlanda. Passport control first.",
    steps: [
      step("hi", { says: SV_HI, back: q("sv-getting-around-09") }),
      step("passport", { says: [y(a("sv-getting-around-09", 0))], back: r("sv-getting-around-09") }),
      step("bags", { cue: "Find out where the bags come out.", says: [y(q("sv-getting-around-10"))], back: a("sv-getting-around-10", 0) }),
      step("town", {
        cue: "In arrivals. Train, bus or taxi into town?",
        says: [
          y(q("sv-getting-around-07"), a("sv-getting-around-07", 0), "express"),
          y(q("sv-getting-around-08"), a("sv-getting-around-08", 0), "thanks"),
          y(q("sv-getting-around-05"), a("sv-getting-around-05", 0), "fare"),
        ],
      }),
      step("express", { them: r("sv-getting-around-07"), says: SV_THANKS, back: null, next: null }),
      step("fare", { cue: "At the rank, ask the fare to the center.", says: [y(q("sv-getting-around-06"))], back: a("sv-getting-around-06", 0) }),
      step("hopin", { them: r("sv-getting-around-06"), says: SV_THANKS, back: null, next: null }),
      step("thanks", { says: SV_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "sv-getting-around-taxi",
    intro: "You get into a taxi.",
    steps: [
      step("hi", { says: SV_HI, back: q("sv-getting-around-01") }),
      step("where", { says: [y(a("sv-getting-around-01", 0))], back: r("sv-getting-around-01", 0) }),
      step("address", {
        them: q("sv-getting-around-18"),
        says: [y(a("sv-getting-around-18", 0)), y(a("sv-getting-around-18", 1))],
        back: r("sv-getting-around-18"),
      }),
      step("cost", { cue: "Ask roughly what it'll cost.", says: [y(q("sv-getting-around-13"))], back: a("sv-getting-around-13", 0) }),
      step("card", { cue: "Check you can pay by card.", says: [y(q("sv-getting-around-14"))], back: a("sv-getting-around-14", 0) }),
      step("stop", { cue: "You're there.", says: [y(q("sv-getting-around-02"))], back: a("sv-getting-around-02", 0) }),
      step("receipt", { says: [y(q("sv-getting-around-17"))], back: a("sv-getting-around-17", 0) }),
      step("bye", { says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
  {
    id: "sv-getting-around-metro",
    intro: "You're looking for the tunnelbana.",
    steps: [
      step("hi", { says: SV_HI, back: SV_HEJ }),
      step("where", {
        cue: "Ask where the metro is.",
        says: [y(q("sv-getting-around-03", 0)), y(q("sv-getting-around-03", 1))],
        back: a("sv-getting-around-03", 0),
      }),
      step("signs", { them: r("sv-getting-around-03"), says: SV_THANKS, back: null }),
      step("platform", { cue: "On the platform. Check it's the right one.", says: [y(q("sv-getting-around-24"))], back: a("sv-getting-around-24", 0) }),
      step("change", { says: [y(q("sv-getting-around-19"))], back: a("sv-getting-around-19", 0) }),
      step("stops", { says: [y(q("sv-getting-around-20"))], back: a("sv-getting-around-20", 0) }),
      step("thanks", { says: SV_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "sv-getting-around-lost",
    intro: "Late, dark, and your map has given up. Someone stops.",
    steps: [
      step("hi", { says: SV_HI, back: q("sv-getting-around-30") }),
      step("help", { says: [y(a("sv-getting-around-30", 0))], back: a("sv-getting-around-25", 0) }),
      step("where", { says: [y(q("sv-getting-around-32"))], back: a("sv-getting-around-32", 0) }),
      step("walk", { says: [y(q("sv-getting-around-26"))], back: a("sv-getting-around-26", 0) }),
      step("map", { says: [y(q("sv-getting-around-28"))], back: a("sv-getting-around-28", 0) }),
      step("thanks", { them: r("sv-getting-around-30"), says: SV_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "sv-restaurant-main",
    intro: "Dinner for two. You walk in without a booking.",
    steps: [
      step("hi", { says: SV_HI, back: SV_HEJ }),
      step("table", { says: [y(q("sv-restaurant-01"))], back: a("sv-restaurant-01", 0) }),
      step("water", {
        them: q("sv-restaurant-03"),
        says: [y(a("sv-restaurant-03", 0)), y(a("sv-restaurant-03", 1))],
        back: r("sv-restaurant-03"),
      }),
      step("recommend", { cue: "Ask what they'd recommend.", says: [y(q("sv-restaurant-05"))], back: a("sv-restaurant-05", 0) }),
      step("order", {
        them: q("sv-restaurant-04"),
        says: [
          y(q("sv-restaurant-06"), a("sv-restaurant-06", 0), "taste"),
          y(a("sv-restaurant-04", 1), r("sv-restaurant-04"), "again"),
        ],
      }),
      step("again", { them: q("sv-restaurant-04"), says: [y(q("sv-restaurant-06"))], back: a("sv-restaurant-06", 0) }),
      step("taste", {
        them: q("sv-restaurant-08"),
        says: [y(a("sv-restaurant-08", 0)), y(a("sv-restaurant-08", 1))],
        back: r("sv-restaurant-08"),
      }),
      step("bill", { cue: "Ask for the bill.", says: [y(q("sv-restaurant-02"))], back: a("sv-restaurant-02", 0) }),
      step("split", {
        them: q("sv-restaurant-15"),
        says: [y(a("sv-restaurant-15", 0)), y(a("sv-restaurant-15", 1))],
        back: r("sv-restaurant-15"),
      }),
      step("bye", { says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
  {
    id: "sv-restaurant-problems",
    intro: "Your food is taking forever.",
    steps: [
      step("waiting", { says: [y(q("sv-restaurant-12"))], back: a("sv-restaurant-12", 0) }),
      step("wrong", { cue: "A plate arrives. Not what you ordered.", says: [y(q("sv-restaurant-09"))], back: a("sv-restaurant-09", 0) }),
      step("another", { cue: "Your glass is empty.", says: [y(q("sv-restaurant-13"))], back: a("sv-restaurant-13", 0) }),
      step("same", { says: [y(a("sv-beer-food-04", 1))], back: null }),
      step("good", { cue: "It was worth the wait.", says: [y(q("sv-restaurant-16"))], back: a("sv-restaurant-16", 0), next: null }),
    ],
  },
  {
    id: "sv-hotel-checkin",
    intro: "You arrive at the hotel reception with your bags.",
    steps: [
      step("hi", { says: SV_HI, back: SV_HEJ }),
      step("booking", { says: [y(q("sv-hotel-01"))], back: a("sv-hotel-01", 0) }),
      step("id", { them: r("sv-hotel-01"), says: [y(a("sv-shopping-10", 0))], back: null }),
      step("nights", { them: q("sv-hotel-02"), says: [y(a("sv-hotel-02", 0))], back: r("sv-hotel-02") }),
      step("breakfast", { cue: "Ask if breakfast is included.", says: [y(q("sv-hotel-03"))], back: a("sv-hotel-03", 0) }),
      step("wifi", { cue: "And the wifi password.", says: [y(q("sv-hotel-06"))], back: a("sv-hotel-06", 0) }),
      step("sauna", { cue: "Is there a sauna?", says: [y(q("sv-hotel-07"))], back: a("sv-hotel-07", 0) }),
      step("thanks", { says: SV_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "sv-shopping-shops",
    intro: "You step into a clothes shop on Drottninggatan.",
    steps: [
      step("hi", { says: SV_HI, back: q("sv-shopping-01") }),
      step("help", {
        says: [y(a("sv-shopping-01", 0), r("sv-shopping-01")), y(a("sv-shopping-01", 1), null)],
      }),
      step("size", { cue: "You like a jacket, but it's too small.", says: [y(q("sv-shopping-02"))], back: a("sv-shopping-02", 0) }),
      step("try", { says: [y(q("sv-shopping-03"))], back: a("sv-shopping-03", 0) }),
      step("price", { says: [y(q("sv-shopping-04"))], back: a("sv-shopping-04", 0) }),
      step("cash", { cue: "You only have cash on you.", says: [y(q("sv-shopping-07"))], back: a("sv-shopping-07", 0) }),
      step("bag", {
        them: q("sv-shopping-06"),
        says: [y(a("sv-shopping-06", 0), r("sv-shopping-06")), y(a("sv-shopping-06", 1), null)],
      }),
      step("bye", { says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
  {
    id: "sv-shopping-systembolaget",
    intro: "You need a bottle for dinner, so it's Systembolaget.",
    steps: [
      step("hi", { says: SV_HI, back: SV_HEJ }),
      step("recommend", { cue: "Ask for a recommendation.", says: [y(q("sv-shopping-12"))], back: a("sv-shopping-12", 0) }),
      step("swedish", { says: [y(q("sv-shopping-14"))], back: a("sv-shopping-14", 0) }),
      step("id", { them: q("sv-shopping-10"), says: [y(a("sv-shopping-10", 0))], back: r("sv-shopping-10") }),
      step("saturday", { cue: "Ask if they close early on Saturdays.", says: [y(q("sv-shopping-11"))], back: a("sv-shopping-11", 0) }),
      step("bye", { says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
  {
    id: "sv-nightlife-door",
    intro: "Saturday night. You're at the front of the queue for a club.",
    steps: [
      step("hi", { says: SV_HI_CASUAL, back: q("sv-nightlife-01") }),
      step("howmany", { says: [y(a("sv-nightlife-01", 0))], back: r("sv-nightlife-01") }),
      step("list", {
        them: q("sv-nightlife-05"),
        says: [y(a("sv-nightlife-05", 1)), y(a("sv-nightlife-05", 0))],
        back: r("sv-nightlife-05"),
      }),
      step("cover", { cue: "Ask how much it is to get in.", says: [y(q("sv-nightlife-03"))], back: a("sv-nightlife-03", 0) }),
      step("id", { them: q("sv-nightlife-02"), says: [y(a("sv-nightlife-02", 0))], back: r("sv-nightlife-02"), next: null }),
    ],
  },
  {
    id: "sv-nightlife-friends",
    intro: "At a bar in Söder, you end up next to a friendly group.",
    steps: [
      step("hi", { says: SV_HI_CASUAL, back: q("sv-nightlife-11") }),
      step("alone", {
        says: [y(a("sv-nightlife-11", 0)), y(a("sv-nightlife-11", 1))],
        back: r("sv-nightlife-11"),
      }),
      step("local", { says: [y(q("sv-nightlife-09"))], back: a("sv-nightlife-09", 0) }),
      step("drink", {
        them: q("sv-nightlife-13"),
        says: [y(a("sv-nightlife-13", 0), r("sv-nightlife-13")), y(a("sv-nightlife-13", 1), null)],
      }),
      step("tip", { cue: "Ask where's good to go next.", says: [y(q("sv-nightlife-14"))], back: a("sv-nightlife-14", 0) }),
      step("leave", { cue: "You need to head home.", says: [y(q("sv-nightlife-15"))], back: a("sv-nightlife-15", 0) }),
      step("bye", { says: [y(r("sv-starting-convo-07")), y(t("sv-hej-da")), y(t("sv-hej-hej"))], back: r("sv-nightlife-15"), next: null }),
    ],
  },
  {
    id: "sv-resacon-pharmacy",
    intro: "Rough morning. You make it to the apotek.",
    steps: [
      step("hi", { says: SV_HI, back: q("sv-resacon-02") }),
      step("what", {
        says: [y(a("sv-resacon-02", 0)), y(a("sv-resacon-02", 1))],
        back: r("sv-resacon-02"),
      }),
      step("meds", { them: q("sv-resacon-07"), says: [y(a("sv-resacon-07", 0))], back: r("sv-resacon-07") }),
      step("prescription", { says: [y(q("sv-resacon-03"))], back: a("sv-resacon-03", 0) }),
      step("often", { says: [y(q("sv-resacon-05"))], back: a("sv-resacon-05", 0) }),
      step("bye", { says: SV_BYE, back: t("sv-hej-hej"), next: null }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Germany
// ---------------------------------------------------------------------------

const DE_HALLO = q("de-starting-convo-01");
const DE_HI = [y(t("de-guten-tag")), y(DE_HALLO)];
const DE_HI_CASUAL = [y(DE_HALLO), y(a("de-starting-convo-01", 1))];
const DE_HI_BAVARIA = [y(a("de-bayern-sc-01", 0)), y(DE_HALLO), y(t("de-guten-tag"))];
const DE_THANKS = [y(t("de-danke")), y(r("de-getting-around-22"))];
const DE_BYE = [
  y(t("de-tschuess")),
  y(t("de-auf-wiedersehen")),
  y(t("de-danke")),
  y(r("de-getting-around-22")),
];
/** The shop goodbye: "Schönen Tag noch!", and "Danke, gleichfalls!" back. */
function deShopBye(id: string): TalkStep[] {
  return [
    step(id, { says: DE_BYE, back: t("de-schoenen-tag"), next: `${id}-same` }),
    step(`${id}-same`, { says: [y(t("de-gleichfalls"))], back: null, next: null }),
  ];
}

const DE: TalkScript[] = [
  {
    id: "de-beer-food-main",
    intro: "A beer hall in Munich with a friend. The waiter comes over.",
    steps: [
      step("hi", { says: DE_HI_BAVARIA, back: q("de-beer-food-01") }),
      step("order", {
        says: [
          y(a("de-beer-food-01", 0), r("de-beer-food-01"), "tap"),
          y(a("de-beer-food-01", 1), q("de-beer-food-05"), "size"),
        ],
      }),
      step("tap", { says: [y(a("de-beer-food-02", 0)), y(a("de-beer-food-02", 1))], back: null, next: "food" }),
      step("size", { says: [y(a("de-beer-food-05", 0)), y(a("de-beer-food-05", 1))], back: r("de-beer-food-05") }),
      step("food", {
        them: q("de-beer-food-03"),
        says: [y(a("de-beer-food-03", 0)), y(a("de-beer-food-03", 1))],
        back: r("de-beer-food-03"),
      }),
      step("another", {
        them: q("de-beer-food-07"),
        says: [y(a("de-beer-food-07", 0), r("de-beer-food-07")), y(a("de-beer-food-07", 1), null)],
      }),
      step("bill", { cue: "Time to pay.", says: [y(q("de-restaurant-02"))], back: a("de-restaurant-02", 0) }),
      step("split", {
        them: q("de-beer-food-04"),
        says: [y(a("de-beer-food-04", 0)), y(a("de-beer-food-04", 1))],
        back: r("de-beer-food-04"),
      }),
      step("how", { says: [y(a("de-getting-around-14", 0)), y(a("de-getting-around-14", 1))], back: null }),
      step("bye", { says: DE_BYE, back: t("de-auf-wiedersehen"), next: null }),
    ],
  },
  {
    id: "de-starting-convo-main",
    intro: "You need directions, and you want to try it in German.",
    steps: [
      step("hi", { says: DE_HI_CASUAL, back: DE_HALLO }),
      step("where", { cue: "Ask where a place is.", says: [y(q("de-starting-convo-06"))], back: a("de-starting-convo-06", 0, 1) }),
      step("lost", { cue: "You didn't catch that.", says: [y(q("de-starting-convo-04"))], back: r("de-starting-convo-04") }),
      step("again", { them: a("de-starting-convo-06", 0, 1), says: DE_THANKS, back: r("de-starting-convo-06") }),
      step("bye", { says: [y(t("de-tschuess"))], back: t("de-tschuess"), next: null }),
    ],
  },
  {
    id: "de-starting-convo-basics",
    intro: "At a bar in Berlin, the person next to you says hi.",
    steps: [
      step("hi", { says: DE_HI_CASUAL, back: r("de-starting-convo-01") }),
      step("how", {
        says: [y(a("de-starting-convo-02", 0), r("de-starting-convo-07")), y(a("de-starting-convo-02", 1), r("de-starting-convo-02", 0))],
      }),
      step("name", { cue: "Introduce yourself.", says: [y(q("de-starting-convo-08"))], back: r("de-starting-convo-08") }),
      step("from", {
        says: [y(a("de-convo-basics-01", 0)), y(a("de-convo-basics-01", 1))],
        back: r("de-convo-basics-01"),
      }),
      step("german", {
        them: q("de-convo-basics-02"),
        says: [y(a("de-convo-basics-02", 0)), y(a("de-convo-basics-02", 1))],
        back: r("de-convo-basics-02"),
      }),
      step("holiday", {
        them: q("de-convo-basics-03"),
        says: [y(a("de-convo-basics-03", 0)), y(a("de-convo-basics-03", 1))],
        back: r("de-convo-basics-03"),
      }),
      step("job", {
        them: q("de-convo-basics-05"),
        says: [y(a("de-convo-basics-05", 0)), y(a("de-convo-basics-05", 1))],
        back: r("de-convo-basics-05"),
      }),
      step("you", { cue: "Ask what they do.", says: [y(q("de-convo-basics-07"))], back: a("de-convo-basics-07", 0) }),
      step("leave", { cue: "Time to go.", says: [y(q("de-nightlife-15"))], back: a("de-nightlife-15", 0) }),
      step("bye", { says: [y(t("de-tschuess"))], back: r("de-nightlife-15"), next: null }),
    ],
  },
  {
    id: "de-getting-around-airport",
    intro: "You've just landed in Frankfurt. Passport control first.",
    steps: [
      step("hi", { says: DE_HI, back: q("de-getting-around-08") }),
      step("passport", {
        says: [y(a("de-getting-around-08", 0)), y(a("de-getting-around-08", 1))],
        back: r("de-getting-around-08"),
      }),
      step("bags", { cue: "Find out where the bags come out.", says: [y(q("de-getting-around-09"))], back: a("de-getting-around-09", 0) }),
      step("customs", { them: q("de-getting-around-11"), says: [y(a("de-getting-around-11", 0))], back: r("de-getting-around-11") }),
      step("town", {
        cue: "In arrivals. Train or taxi into the city?",
        says: [
          y(q("de-getting-around-07"), a("de-getting-around-07", 0), "train"),
          y(q("de-getting-around-05"), a("de-getting-around-05", 0), "fare"),
        ],
      }),
      step("train", { them: r("de-getting-around-07"), says: [y(q("de-getting-around-10"))], back: a("de-getting-around-10", 0), next: "thanks" }),
      step("fare", { cue: "At the rank, ask the fare to the center.", says: [y(q("de-getting-around-06"))], back: a("de-getting-around-06", 0) }),
      step("hopin", { them: r("de-getting-around-06"), says: DE_THANKS, back: null, next: null }),
      step("thanks", { says: DE_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "de-getting-around-taxi",
    intro: "You climb into a taxi.",
    steps: [
      step("hi", { says: DE_HI, back: q("de-getting-around-01") }),
      step("where", {
        says: [y(a("de-getting-around-01", 0)), y(a("de-getting-around-01", 1))],
        back: r("de-getting-around-01"),
      }),
      step("address", {
        them: q("de-getting-around-18"),
        says: [y(a("de-getting-around-18", 0)), y(a("de-getting-around-18", 1))],
        back: r("de-getting-around-18"),
      }),
      step("time", { cue: "Ask roughly how long it'll take.", says: [y(q("de-getting-around-16"))], back: a("de-getting-around-16", 0) }),
      step("stop", {
        cue: "You're there.",
        says: [y(q("de-getting-around-15"), a("de-getting-around-15", 0)), y(q("de-getting-around-02"), a("de-getting-around-02", 0))],
      }),
      step("pay", {
        them: q("de-getting-around-14"),
        says: [y(a("de-getting-around-14", 0)), y(a("de-getting-around-14", 1))],
        back: null,
      }),
      step("receipt", { cue: "Ask for a receipt.", says: [y(q("de-getting-around-17"))], back: a("de-getting-around-17", 0) }),
      ...deShopBye("bye"),
    ],
  },
  {
    id: "de-getting-around-metro",
    intro: "You're looking for the U-Bahn.",
    steps: [
      step("hi", { says: DE_HI_CASUAL, back: DE_HALLO }),
      step("where", { cue: "Ask where the U-Bahn is.", says: [y(q("de-getting-around-03"))], back: a("de-getting-around-03", 0, 0) }),
      step("signs", { them: r("de-getting-around-03"), says: DE_THANKS, back: null }),
      step("side", { cue: "On the platform. Check you're on the right side.", says: [y(q("de-getting-around-24"))], back: a("de-getting-around-24", 0) }),
      step("change", { says: [y(q("de-getting-around-19"))], back: a("de-getting-around-19", 0) }),
      step("stops", { says: [y(q("de-getting-around-20"))], back: a("de-getting-around-20", 0) }),
      step("control", {
        them: q("de-getting-around-22"),
        says: [y(a("de-getting-around-22", 0))],
        back: r("de-getting-around-22"),
        next: null,
      }),
    ],
  },
  {
    id: "de-restaurant-main",
    intro: "Dinner for two at a Gasthaus.",
    steps: [
      step("hi", { says: DE_HI, back: t("de-guten-tag") }),
      step("table", { says: [y(q("de-restaurant-01"))], back: a("de-restaurant-01", 0) }),
      step("recommend", { cue: "Ask what they'd recommend.", says: [y(q("de-restaurant-05"))], back: a("de-restaurant-05", 0) }),
      step("order", {
        them: q("de-restaurant-04"),
        says: [
          y(q("de-restaurant-06"), a("de-restaurant-06", 0), "drink"),
          y(a("de-restaurant-04", 1), r("de-restaurant-04"), "again"),
        ],
      }),
      step("again", { them: q("de-restaurant-04"), says: [y(q("de-restaurant-06"))], back: a("de-restaurant-06", 0) }),
      step("drink", { says: [y(a("de-beer-food-01", 0)), y(a("de-beer-food-01", 1))], back: null }),
      step("taste", {
        them: q("de-restaurant-08"),
        says: [y(a("de-restaurant-08", 0)), y(a("de-restaurant-08", 1))],
        back: r("de-restaurant-08"),
      }),
      step("bill", { cue: "Ask for the bill.", says: [y(q("de-restaurant-02"))], back: a("de-restaurant-02", 0) }),
      step("how", {
        them: r("de-restaurant-02"),
        says: [y(a("de-getting-around-14", 0)), y(a("de-getting-around-14", 1))],
        back: null,
      }),
      step("bye", { says: DE_BYE, back: t("de-auf-wiedersehen"), next: null }),
    ],
  },
  {
    id: "de-hotel-checkin",
    intro: "You arrive at the hotel with your suitcase.",
    steps: [
      step("hi", { says: DE_HI, back: t("de-guten-tag") }),
      step("booking", { says: [y(q("de-hotel-01"))], back: a("de-hotel-01", 0) }),
      step("passport", { them: r("de-hotel-01"), says: [y(a("de-getting-around-08", 0))], back: null }),
      step("room", { them: q("de-hotel-07"), says: [y(a("de-hotel-07", 0))], back: r("de-hotel-07") }),
      step("breakfast", { cue: "Ask if breakfast is included.", says: [y(q("de-hotel-03"))], back: a("de-hotel-03", 0) }),
      step("wifi", { cue: "And the wifi password.", says: [y(q("de-hotel-06"))], back: a("de-hotel-06", 0) }),
      step("thanks", { says: DE_THANKS, back: null, next: null }),
    ],
  },
  {
    id: "de-hotel-problems",
    intro: "Back at the hotel, and the room isn't right.",
    steps: [
      step("hi", { says: DE_HI, back: t("de-guten-tag") }),
      step("heating", { cue: "The heating isn't working.", says: [y(q("de-hotel-09"))], back: a("de-hotel-09", 0) }),
      step("towels", { cue: "You could also use more towels.", says: [y(q("de-hotel-14"))], back: a("de-hotel-14", 0) }),
      step("wake", { cue: "Early start tomorrow. Ask for a wake-up call at seven.", says: [y(q("de-hotel-12"))], back: a("de-hotel-12", 0) }),
      step("thanks", { says: DE_THANKS, back: null }),
      step("checkout", {
        them: q("de-hotel-16"),
        says: [y(a("de-hotel-16", 0)), y(a("de-hotel-16", 1))],
        back: r("de-hotel-16"),
      }),
      step("bye", { says: DE_BYE, back: t("de-auf-wiedersehen"), next: null }),
    ],
  },
  {
    id: "de-shopping-shops",
    intro: "You walk into a clothes shop.",
    steps: [
      step("hi", { says: DE_HI, back: q("de-shopping-01") }),
      step("help", {
        says: [y(a("de-shopping-01", 0), r("de-shopping-01")), y(a("de-shopping-01", 1), null)],
      }),
      step("price", { cue: "You like a shirt. Ask the price.", says: [y(q("de-shopping-04"))], back: a("de-shopping-04", 0) }),
      step("size", { cue: "It's a bit small.", says: [y(q("de-shopping-02"))], back: a("de-shopping-02", 0) }),
      step("try", { says: [y(q("de-shopping-03"))], back: a("de-shopping-03", 0) }),
      step("card", { cue: "Check you can pay by card.", says: [y(q("de-shopping-05"))], back: a("de-shopping-05", 0) }),
      step("bag", {
        them: q("de-shopping-07"),
        says: [y(a("de-shopping-07", 0), r("de-shopping-07")), y(a("de-shopping-07", 1), null)],
      }),
      ...deShopBye("bye"),
    ],
  },
  {
    id: "de-shopping-supermarket",
    intro: "Grabbing a few things at the supermarket.",
    steps: [
      step("hi", { says: DE_HI_CASUAL, back: DE_HALLO }),
      step("milk", { cue: "Ask where the milk is.", says: [y(q("de-shopping-13"))], back: a("de-shopping-13", 0) }),
      step("fruit", { says: [y(q("de-shopping-15"))], back: a("de-shopping-15", 0) }),
      step("deposit", { cue: "Is there a deposit on the bottles?", says: [y(q("de-shopping-12"))], back: a("de-shopping-12", 0) }),
      step("next", { them: q("de-shopping-11"), says: [y(a("de-shopping-11", 0))], back: null }),
      step("loyalty", { them: q("de-shopping-14"), says: [y(a("de-shopping-14", 0))], back: r("de-shopping-14") }),
      step("pack", { them: q("de-shopping-16"), says: [y(a("de-shopping-16", 0))], back: r("de-shopping-16") }),
      ...deShopBye("bye"),
    ],
  },
  {
    id: "de-nightlife-door",
    intro: "Saturday night in Berlin. You and a friend reach the front of the queue.",
    steps: [
      step("hi", { says: DE_HI_CASUAL, back: q("de-nightlife-01") }),
      step("two", { says: [y(a("de-nightlife-01", 0))], back: q("de-nightlife-02") }),
      step("age", { says: [y(a("de-nightlife-02", 0))], back: r("de-nightlife-02") }),
      step("id", { says: [y(a("de-getting-around-08", 0))], back: null }),
      step("phones", { them: q("de-nightlife-06"), says: [y(a("de-nightlife-06", 0))], back: r("de-nightlife-06") }),
      step("cover", { cue: "Ask how much it is to get in.", says: [y(q("de-nightlife-03"))], back: a("de-nightlife-03", 0) }),
      step("jacket", { cue: "Check your jacket.", says: [y(q("de-nightlife-07"))], back: a("de-nightlife-07", 0), next: null }),
    ],
  },
  {
    id: "de-nightlife-friends",
    intro: "A bar in Kreuzberg. Someone at the next table turns to you.",
    steps: [
      step("hi", { says: DE_HI_CASUAL, back: q("de-nightlife-11") }),
      step("alone", {
        says: [y(a("de-nightlife-11", 0)), y(a("de-nightlife-11", 1))],
        back: r("de-nightlife-11"),
      }),
      step("often", { says: [y(q("de-nightlife-09"))], back: a("de-nightlife-09", 0) }),
      step("drink", {
        them: q("de-nightlife-14"),
        says: [y(a("de-nightlife-14", 0), r("de-nightlife-14")), y(a("de-nightlife-14", 1), null)],
      }),
      step("tip", { cue: "Ask if they know anywhere good round here.", says: [y(q("de-nightlife-16"))], back: a("de-nightlife-16", 0) }),
      step("leave", { cue: "You should get going.", says: [y(q("de-nightlife-15"))], back: a("de-nightlife-15", 0) }),
      step("bye", { says: [y(t("de-tschuess"))], back: r("de-nightlife-15"), next: null }),
    ],
  },
  {
    id: "de-resacon-pharmacy",
    intro: "Rough morning. You make it to an Apotheke.",
    steps: [
      step("hi", { says: DE_HI, back: q("de-resacon-02") }),
      step("what", {
        says: [y(a("de-resacon-02", 0)), y(a("de-resacon-02", 1))],
        back: r("de-resacon-02"),
      }),
      step("meds", { them: q("de-resacon-06"), says: [y(a("de-resacon-06", 0))], back: r("de-resacon-06") }),
      step("prescription", { says: [y(q("de-resacon-04"))], back: a("de-resacon-04", 0) }),
      step("often", { says: [y(q("de-resacon-07"))], back: a("de-resacon-07", 0) }),
      ...deShopBye("bye"),
    ],
  },
];

export const TALK_SCRIPTS: Record<string, TalkScript[]> = {
  "es-ES": ES,
  "sv-SE": SV,
  "de-DE": DE,
};

/**
 * The two conversations where they speak before you do, because that is how
 * the moment goes: the waiter coming over to ask how it was before you ask for
 * the check, and the woman behind you at the market asking who's last in the
 * queue. Every other conversation is opened by you.
 */
export const THEY_OPEN = new Set(["restaurant-paying", "shopping-market"]);

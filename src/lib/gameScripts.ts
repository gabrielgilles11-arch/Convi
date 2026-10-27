// Game Mode's scene scripts. Client-safe: no content import, and no line of
// the target language anywhere in this file.
//
// A script is the shape of one short conversation, written the way the
// conversation actually goes: the local speaks first wherever a local would
// (the driver asks where to, the bartender asks what you're having), what
// Convi picks decides what comes next (order a caña and nobody asks "draft or
// bottle?"), and it is over in four to six turns rather than walking every
// beat a scenario page lists.
//
// Every line is a reference into the content files, by exchange id and part,
// resolved on the server (lib/gameScenes.ts). So every word on screen is still
// a sourced line from content/*.json. What a script adds is order and
// branching, and a handful of pairings across exchanges that the content keeps
// apart: "Para aquí." from the bar answering "¿Para tomar aquí?" at the café,
// or "No, gracias." turning down food. Those pairings are listed at the end of
// ARCHITECTURE.md's Game Mode section so a speaker can check them.

export type SceneKind = "taxi" | "bar" | "metro" | "cafe";

/** Which line of an exchange: its question, one of its answers, or its reply. */
export type Part = "q" | "r" | "a0" | "a1" | "a2";

/**
 * A line in content/*.json.
 *
 * `alt` picks one side of a line authored as two alternatives, "A / B": the
 * Swedish "Var är tuben? / Var är Tunnelbanan?" is two ways to ask, and the
 * game offers them as two options. Choosing a side writes nothing.
 */
export interface Ref {
  ex: string;
  part: Part;
  alt?: number;
}

export interface ScriptOption {
  /** What Convi says. */
  say: Ref;
  /**
   * The way locals say it, by what the content's own notes say ("how locals
   * order", "what everybody calls it"). Worth more points than a line that is
   * fine but textbook.
   */
  local?: boolean;
  /** What comes back, in order. */
  then?: Ref[];
  /** Where it goes. Omitted means the node's `next`; null ends the scene. */
  next?: string | null;
}

export interface ScriptNode {
  /** The local speaks first. */
  npc?: Ref;
  /**
   * Convi has to start, so the screen says what Convi wants, in English. The
   * only English prompt a scene has besides its intro.
   */
  cue?: string;
  /**
   * Neither of the above: the last thing they said was a question, and this
   * node answers it. Named so the wrong options can be checked against it.
   */
  asked?: Ref;
  /** Every line here is a fair thing to say. Wrong options are added at play. */
  options: ScriptOption[];
  next?: string | null;
}

export interface SceneScript {
  kind: SceneKind;
  title: string;
  /** One line to set the scene, in English. */
  intro: string;
  start: string;
  nodes: Record<string, ScriptNode>;
}

const q = (ex: string, alt?: number): Ref => ({
  ex,
  part: "q",
  ...(alt === undefined ? {} : { alt }),
});
const r = (ex: string, alt?: number): Ref => ({
  ex,
  part: "r",
  ...(alt === undefined ? {} : { alt }),
});
const a = (ex: string, i: 0 | 1 | 2, alt?: number): Ref => ({
  ex,
  part: `a${i}` as Part,
  ...(alt === undefined ? {} : { alt }),
});

const TAXI_INTRO = "Convi just landed with a heavy suitcase. Get from the airport to the hotel.";
const BAR_INTRO = "First night out. Convi walks up to the bar, thirsty.";
const METRO_INTRO = "Convi wants to see the city without a taxi this time.";
const CAFE_INTRO = "Morning after. Convi needs a coffee before anything else.";

// ---------------------------------------------------------------------------
// Spain
// ---------------------------------------------------------------------------

const ES: SceneScript[] = [
  {
    kind: "taxi",
    title: "Taxi from the airport",
    intro: TAXI_INTRO,
    start: "where",
    nodes: {
      where: {
        npc: q("taxi-01"),
        options: [{ say: a("taxi-01", 0), then: [r("taxi-01", 0)] }],
        next: "route",
      },
      route: {
        npc: q("taxi-02"),
        options: [
          { say: a("taxi-02", 0), then: [r("taxi-02")] },
          { say: q("taxi-08"), then: [a("taxi-08", 0)] },
        ],
        next: "stop",
      },
      stop: {
        cue: "You're there. Tell the driver right here is fine.",
        options: [{ say: q("taxi-05"), then: [r("taxi-05")] }],
        next: "card",
      },
      card: {
        cue: "No cash on you. Check they take card.",
        options: [{ say: q("taxi-04"), then: [a("taxi-04", 0)] }],
        next: null,
      },
    },
  },
  {
    kind: "bar",
    title: "Ordering at the bar",
    intro: BAR_INTRO,
    start: "order",
    nodes: {
      order: {
        npc: q("beer-food-01"),
        options: [
          // A caña is a small draft, so nobody asks "draft or bottle?" next.
          { say: a("beer-food-01", 0), local: true, then: [r("beer-food-01")], next: "food" },
          { say: a("beer-food-01", 1), next: "tap" },
        ],
      },
      tap: {
        npc: q("beer-food-02"),
        options: [{ say: a("beer-food-02", 0) }, { say: a("beer-food-02", 1) }],
        next: "style",
      },
      style: {
        npc: q("beer-food-03"),
        options: [
          { say: a("beer-food-03", 0), then: [r("beer-food-03")] },
          { say: a("beer-food-03", 1), then: [r("beer-food-03")] },
        ],
        next: "more",
      },
      // "Vale. ¿Algo de comer?" has just been asked.
      food: {
        asked: r("beer-food-01"),
        options: [
          { say: a("beer-food-04", 1), then: [r("beer-food-04")] },
          { say: a("beer-food-04", 0), then: [r("beer-food-04")] },
        ],
        next: "another",
      },
      more: {
        npc: q("beer-food-04"),
        options: [
          { say: a("beer-food-04", 1), then: [r("beer-food-04")] },
          { say: a("beer-food-04", 0), then: [r("beer-food-04")] },
        ],
        next: "another",
      },
      another: {
        npc: q("beer-food-06"),
        options: [
          { say: a("beer-food-06", 0), then: [r("beer-food-06")] },
          { say: a("beer-food-06", 1) },
        ],
        next: "pay",
      },
      pay: {
        npc: q("beer-food-07"),
        options: [
          { say: a("beer-food-07", 0), then: [r("beer-food-07")] },
          { say: a("beer-food-07", 1) },
        ],
        next: null,
      },
    },
  },
  {
    kind: "metro",
    title: "Taking the metro",
    intro: METRO_INTRO,
    start: "find",
    nodes: {
      find: {
        cue: "You can't see the metro anywhere. Ask someone.",
        options: [{ say: q("metro-01"), then: [a("metro-01", 0), r("metro-01")] }],
        next: "platform",
      },
      platform: {
        cue: "On the platform. Make sure it's the right direction.",
        options: [{ say: q("metro-08"), then: [a("metro-08", 1)] }],
        next: "ticket",
      },
      ticket: {
        npc: q("metro-06"),
        options: [{ say: a("metro-06", 0), then: [r("metro-06")] }],
        next: "late",
      },
      late: {
        cue: "It's getting late. Check you can still get back.",
        options: [{ say: q("metro-07"), then: [a("metro-07", 1)] }],
        next: null,
      },
    },
  },
  {
    kind: "cafe",
    title: "Coffee shop",
    intro: CAFE_INTRO,
    start: "order",
    nodes: {
      order: {
        npc: q("beer-food-coffee-01"),
        options: [
          { say: a("beer-food-coffee-01", 0), then: [r("beer-food-coffee-01")], next: "here" },
          { say: a("beer-food-coffee-01", 1), then: [r("beer-food-coffee-01")], next: "here" },
          // Iced coffee is its own conversation: no "for here?", it just comes.
          { say: q("beer-food-coffee-06"), then: [a("beer-food-coffee-06", 0)], next: "eat" },
        ],
      },
      // "¿Para tomar aquí?" has just been asked.
      here: {
        asked: r("beer-food-coffee-01"),
        options: [{ say: a("beer-food-05", 0) }, { say: a("beer-food-05", 1) }],
        next: "eat",
      },
      eat: {
        npc: q("beer-food-coffee-07"),
        options: [
          { say: a("beer-food-coffee-07", 0), then: [r("beer-food-coffee-07")] },
          { say: a("beer-food-06", 1) },
        ],
        next: "pay",
      },
      pay: {
        cue: "Ready to go. Ask how much it is.",
        options: [{ say: q("beer-food-coffee-08"), then: [a("beer-food-coffee-08", 0)] }],
        next: null,
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Sweden
// ---------------------------------------------------------------------------

const SV: SceneScript[] = [
  {
    kind: "taxi",
    title: "Taxi from the airport",
    intro: TAXI_INTRO,
    start: "price",
    nodes: {
      price: {
        cue: "Swedish taxis set their own fares. Check the price before you get in.",
        options: [{ say: q("sv-getting-around-13"), then: [a("sv-getting-around-13", 0)] }],
        next: "where",
      },
      where: {
        npc: q("sv-getting-around-01"),
        options: [{ say: a("sv-getting-around-01", 0), then: [r("sv-getting-around-01", 0)] }],
        next: "check",
      },
      check: {
        npc: q("sv-getting-around-18"),
        options: [
          { say: a("sv-getting-around-18", 0), then: [r("sv-getting-around-18")] },
          { say: a("sv-getting-around-18", 1), then: [r("sv-getting-around-18")] },
        ],
        next: "stop",
      },
      stop: {
        cue: "That's your door. Ask the driver to pull over.",
        options: [
          {
            say: q("sv-getting-around-02"),
            then: [a("sv-getting-around-02", 0), r("sv-getting-around-02")],
          },
        ],
        next: null,
      },
    },
  },
  {
    kind: "bar",
    title: "Ordering at the bar",
    intro: BAR_INTRO,
    start: "id",
    nodes: {
      id: {
        npc: q("sv-beer-food-06"),
        options: [
          { say: a("sv-beer-food-06", 0), then: [r("sv-beer-food-06")] },
          { say: a("sv-beer-food-06", 1), then: [r("sv-beer-food-06")] },
        ],
        next: "order",
      },
      order: {
        npc: q("sv-beer-food-01"),
        options: [
          // "What most people order": a 50cl beer over 5%.
          { say: a("sv-beer-food-01", 1), local: true, then: [r("sv-beer-food-01")] },
          { say: a("sv-beer-food-01", 0), then: [r("sv-beer-food-01")] },
        ],
        next: "tap",
      },
      // "På fat eller flaska?" has just been asked.
      tap: {
        asked: r("sv-beer-food-01"),
        options: [{ say: a("sv-beer-food-02", 0) }, { say: a("sv-beer-food-02", 1) }],
        next: "food",
      },
      food: {
        npc: q("sv-beer-food-03"),
        options: [
          { say: a("sv-beer-food-03", 0), then: [r("sv-beer-food-03", 1)] },
          { say: a("sv-beer-food-03", 1), then: [r("sv-beer-food-03", 1)] },
        ],
        next: "pay",
      },
      pay: {
        npc: q("sv-beer-food-08"),
        options: [
          { say: a("sv-beer-food-08", 0) },
          { say: a("sv-beer-food-08", 1), then: [r("sv-beer-food-08")] },
        ],
        next: null,
      },
    },
  },
  {
    kind: "metro",
    title: "Taking the tunnelbana",
    intro: METRO_INTRO,
    start: "find",
    nodes: {
      find: {
        cue: "You need the metro. Ask where it is.",
        options: [
          // "Tuben is Tunnelbanan, and it is what everybody calls it."
          {
            say: q("sv-getting-around-03", 0),
            local: true,
            then: [a("sv-getting-around-03", 0), r("sv-getting-around-03")],
          },
          {
            say: q("sv-getting-around-03", 1),
            then: [a("sv-getting-around-03", 0), r("sv-getting-around-03")],
          },
        ],
        next: "platform",
      },
      platform: {
        cue: "Two platforms. Check you're on the right one.",
        options: [{ say: q("sv-getting-around-24"), then: [a("sv-getting-around-24", 1)] }],
        next: "ticket",
      },
      ticket: {
        npc: q("sv-getting-around-22"),
        options: [{ say: a("sv-getting-around-22", 0), then: [r("sv-getting-around-22")] }],
        next: "late",
      },
      late: {
        cue: "It's past midnight. Ask if it's still running.",
        options: [{ say: q("sv-getting-around-21"), then: [a("sv-getting-around-21", 0)] }],
        next: null,
      },
    },
  },
  {
    kind: "cafe",
    title: "Fika at the café",
    intro: "Three o'clock in Stockholm, which means coffee and a bun.",
    start: "invite",
    nodes: {
      invite: {
        npc: q("sv-fika-01"),
        options: [
          { say: a("sv-fika-01", 0), then: [r("sv-fika-01")] },
          // "Proposing a time instead is better."
          { say: a("sv-fika-01", 1), local: true, then: [r("sv-fika-01")] },
        ],
        next: "order",
      },
      order: {
        cue: "At the counter. Order a coffee and a cinnamon bun.",
        options: [{ say: q("sv-fika-02"), then: [a("sv-fika-02", 0)] }],
        next: "stay",
      },
      stay: {
        npc: q("sv-fika-06"),
        options: [
          { say: a("sv-fika-06", 0), then: [r("sv-fika-06")] },
          { say: a("sv-fika-06", 1), then: [r("sv-fika-06")] },
        ],
        next: "refill",
      },
      refill: {
        npc: q("sv-fika-03"),
        options: [
          { say: a("sv-fika-03", 0), then: [r("sv-fika-03")] },
          { say: a("sv-fika-03", 1) },
        ],
        next: "bye",
      },
      bye: {
        cue: "Time to go. Thank your friend for the fika.",
        options: [{ say: q("sv-fika-07"), then: [a("sv-fika-07", 0)] }],
        next: null,
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Germany (Bavaria: the Bierhaus, the Bavarian behind the bar)
// ---------------------------------------------------------------------------

const DE: SceneScript[] = [
  {
    kind: "taxi",
    title: "Taxi from the airport",
    intro: TAXI_INTRO,
    start: "where",
    nodes: {
      where: {
        npc: q("de-getting-around-01"),
        options: [
          { say: a("de-getting-around-01", 0), then: [r("de-getting-around-01")] },
          { say: a("de-getting-around-01", 1), then: [r("de-getting-around-01")] },
        ],
        next: "check",
      },
      check: {
        npc: q("de-getting-around-18"),
        options: [
          { say: a("de-getting-around-18", 0), then: [r("de-getting-around-18")] },
          { say: a("de-getting-around-18", 1), then: [r("de-getting-around-18")] },
        ],
        next: "time",
      },
      time: {
        cue: "You're running late. Ask how long it'll take.",
        options: [
          {
            say: q("de-getting-around-16"),
            then: [a("de-getting-around-16", 0), r("de-getting-around-16")],
          },
        ],
        next: "stop",
      },
      stop: {
        cue: "That's your street. Ask the driver to let you out.",
        options: [
          {
            say: q("de-getting-around-02"),
            then: [a("de-getting-around-02", 0), r("de-getting-around-02")],
          },
          { say: q("de-getting-around-15"), then: [a("de-getting-around-15", 0)] },
        ],
        next: "pay",
      },
      pay: {
        npc: q("de-getting-around-14"),
        options: [
          { say: a("de-getting-around-14", 0), then: [r("de-getting-around-14")] },
          { say: a("de-getting-around-14", 1), then: [r("de-getting-around-14")] },
        ],
        next: null,
      },
    },
  },
  {
    kind: "bar",
    title: "Ordering at the bar",
    intro: BAR_INTRO,
    start: "order",
    nodes: {
      order: {
        npc: q("de-beer-food-01"),
        options: [
          // "Ein Helles is the southern default."
          { say: a("de-beer-food-01", 1), local: true, then: [r("de-beer-food-01")] },
          { say: a("de-beer-food-01", 0), then: [r("de-beer-food-01")] },
        ],
        next: "tap",
      },
      // "Vom Fass oder aus der Flasche?" has just been asked.
      tap: {
        asked: r("de-beer-food-01"),
        options: [
          // Size is only a question for draft, and only in Bavaria.
          { say: a("de-beer-food-02", 0), next: "size" },
          { say: a("de-beer-food-02", 1), next: "another" },
        ],
      },
      size: {
        npc: q("de-beer-food-05"),
        options: [
          { say: a("de-beer-food-05", 0), local: true, then: [r("de-beer-food-05")] },
          { say: a("de-beer-food-05", 1), then: [r("de-beer-food-05")] },
        ],
        next: "another",
      },
      another: {
        npc: q("de-beer-food-07"),
        options: [
          { say: a("de-beer-food-07", 0), then: [r("de-beer-food-07")], next: "absacker" },
          { say: a("de-beer-food-07", 1), next: "pay" },
        ],
      },
      absacker: {
        npc: q("de-beer-food-08"),
        options: [
          { say: a("de-beer-food-08", 0), then: [r("de-beer-food-08")] },
          { say: a("de-beer-food-08", 1) },
        ],
        next: "pay",
      },
      pay: {
        npc: q("de-beer-food-04"),
        options: [{ say: a("de-beer-food-04", 0) }, { say: a("de-beer-food-04", 1) }],
        next: null,
      },
    },
  },
  {
    kind: "metro",
    title: "Taking the U-Bahn",
    intro: METRO_INTRO,
    start: "find",
    nodes: {
      find: {
        cue: "You need the U-Bahn. Ask where it is.",
        options: [
          {
            say: q("de-getting-around-03"),
            then: [a("de-getting-around-03", 0, 0), r("de-getting-around-03")],
          },
        ],
        next: "change",
      },
      change: {
        cue: "On the platform. Check if you have to change.",
        options: [{ say: q("de-getting-around-19"), then: [a("de-getting-around-19", 0)] }],
        next: "ticket",
      },
      ticket: {
        npc: q("de-getting-around-22"),
        options: [{ say: a("de-getting-around-22", 0), then: [r("de-getting-around-22")] }],
        next: "late",
      },
      late: {
        cue: "It's past midnight. Ask if it's still running.",
        options: [{ say: q("de-getting-around-21"), then: [a("de-getting-around-21", 1)] }],
        next: null,
      },
    },
  },
];

/**
 * Germany has no café dialogue in its content yet, so its fourth tile stays
 * locked rather than being filled with lines nobody sourced.
 */
export const LOCKED_SCENES: Record<string, { kind: SceneKind; title: string }[]> = {
  "de-DE": [{ kind: "cafe", title: "Coffee shop" }],
};

export const GAME_SCRIPTS: Record<string, SceneScript[]> = {
  "es-ES": ES,
  "sv-SE": SV,
  "de-DE": DE,
};

/** Where a scene sits in the trip, so tiles keep one order whatever is locked. */
export const SCENE_ORDER: SceneKind[] = ["taxi", "bar", "metro", "cafe"];

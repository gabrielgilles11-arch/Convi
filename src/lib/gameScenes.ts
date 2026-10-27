// SERVER ONLY. Imports the content files. Pulled in from /api/game and from
// tests, never from a React island: the Game island imports ./gameTypes and
// fetches the resolved scenes instead.

import { getCategories, DEFAULT_LOCALE, type Exchange, type Locale } from "./content";
import {
  GAME_SCRIPTS,
  LOCKED_SCENES,
  SCENE_ORDER,
  type Ref,
  type SceneScript,
} from "./gameScripts";
import type {
  GameLine,
  GameNode,
  GameOption,
  GamePayload,
  PlayableScene,
  PoolLine,
} from "./gameTypes";

/** " / " between two ways of saying a line, as speech.ts reads it. */
const ALTERNATIVES = /\s+\/\s+/;

interface Indexed {
  exchange: Exchange;
  /** The subsection the exchange was written in. */
  group: string;
}

function indexExchanges(locale: Locale): Map<string, Indexed> {
  const out = new Map<string, Indexed>();
  for (const category of getCategories(locale)) {
    for (const sub of category.subsections) {
      const lists = [
        (sub as { exchanges?: Exchange[] }).exchanges ?? [],
        (sub as { scenes?: Exchange[] }).scenes ?? [],
      ];
      for (const list of lists) {
        for (const exchange of list) out.set(exchange.id, { exchange, group: sub.id });
      }
    }
  }
  return out;
}

/** Clip ids as scripts/generate-audio.mjs writes them, the same as conversations.ts. */
function clipId(id: string, part: Ref["part"]): string {
  if (part === "q") return `${id}-q`;
  if (part === "r") return `${id}-r`;
  return `${id}-a${part.slice(1)}`;
}

/**
 * A reference, resolved to the line as written.
 *
 * Throws on anything missing: a script pointing at a line that is not there
 * is a broken scene, and the tests run every reference through this.
 */
export function resolveRef(index: Map<string, Indexed>, ref: Ref): GameLine {
  const found = index.get(ref.ex);
  if (!found) throw new Error(`Game script: no exchange ${ref.ex}`);
  const { exchange } = found;

  const bilingual =
    ref.part === "q"
      ? exchange.question
      : ref.part === "r"
        ? exchange.likelyReply
        : exchange.answers[Number(ref.part.slice(1))];
  if (!bilingual?.es) throw new Error(`Game script: ${ref.ex} has no ${ref.part}`);

  if (ref.alt === undefined) {
    return {
      source: bilingual.es,
      en: bilingual.en ?? null,
      audioId: clipId(exchange.id, ref.part),
    };
  }

  const sides = bilingual.es.split(ALTERNATIVES);
  const side = sides[ref.alt];
  if (sides.length < 2 || !side)
    throw new Error(`Game script: ${ref.ex} ${ref.part} has no alternative ${ref.alt}`);
  const enSides = (bilingual.en ?? "").split(ALTERNATIVES);
  return {
    source: side.trim(),
    // The English splits the same way where the author wrote it that way;
    // otherwise the whole gloss still says what either side means.
    en: (enSides.length === sides.length ? enSides[ref.alt] : bilingual.en)?.trim() || null,
    // The recording is of both sides, so one side is read by the device voice.
    audioId: null,
  };
}

function resolveScene(
  locale: Locale,
  script: SceneScript,
  index: Map<string, Indexed>
): PlayableScene {
  const nodes: Record<string, GameNode> = {};

  for (const [id, node] of Object.entries(script.nodes)) {
    const lead = node.npc ?? node.asked ?? node.options[0]!.say;
    const leadEx = index.get(lead.ex);
    if (!leadEx) throw new Error(`Game script: no exchange ${lead.ex}`);

    const refs = [node.npc, node.asked, ...node.options.map((o) => o.say)].filter(
      (x): x is Ref => !!x
    );

    const options: GameOption[] = node.options.map((o) => ({
      line: resolveRef(index, o.say),
      local: !!o.local,
      then: (o.then ?? []).map((ref) => resolveRef(index, ref)),
      next: o.next === undefined ? (node.next ?? null) : o.next,
      note: index.get(o.say.ex)?.exchange.notes ?? "",
    }));

    nodes[id] = {
      id,
      npc: node.npc ? resolveRef(index, node.npc) : null,
      cue: node.cue ?? null,
      asked: node.asked ? resolveRef(index, node.asked) : null,
      situation: leadEx.exchange.situation.en,
      exchangeIds: [...new Set(refs.map((ref) => ref.ex))],
      groups: [...new Set(refs.map((ref) => index.get(ref.ex)?.group ?? ""))].filter(Boolean),
      options,
    };
  }

  return {
    id: `${locale}-${script.kind}`,
    kind: script.kind,
    title: script.title,
    intro: script.intro,
    start: script.start,
    nodes,
  };
}

/**
 * Lines Convi could say anywhere in the subsections the scenes draw on: the
 * stock the wrong options come from. Only the learner's side of each
 * exchange, as Talk resolves it: the answers when they ask, the question when
 * you do.
 */
function poolFor(scripts: SceneScript[], index: Map<string, Indexed>): PoolLine[] {
  const groups = new Set<string>();
  for (const script of scripts) {
    for (const node of Object.values(script.nodes)) {
      for (const ref of [node.npc, node.asked, ...node.options.map((o) => o.say)]) {
        if (ref) groups.add(index.get(ref.ex)?.group ?? "");
      }
    }
  }

  const out: PoolLine[] = [];
  for (const { exchange, group } of index.values()) {
    if (!groups.has(group)) continue;
    const situation = exchange.situation?.en ?? "";
    if (exchange.speaker === "them") {
      exchange.answers.forEach((answer, i) => {
        if (!answer.es) return;
        out.push({
          line: {
            source: answer.es,
            en: answer.en ?? null,
            audioId: clipId(exchange.id, `a${i}` as Ref["part"]),
          },
          exchangeId: exchange.id,
          group,
          situation,
          opens: false,
        });
      });
    } else if (exchange.question?.es) {
      out.push({
        line: {
          source: exchange.question.es,
          en: exchange.question.en ?? null,
          audioId: clipId(exchange.id, "q"),
        },
        exchangeId: exchange.id,
        group,
        situation,
        opens: true,
      });
    }
  }
  return out;
}

export function buildGame(locale: Locale = DEFAULT_LOCALE): GamePayload {
  const scripts = GAME_SCRIPTS[locale] ?? [];
  const index = indexExchanges(locale);
  const scenes = scripts
    .map((script) => resolveScene(locale, script, index))
    .sort((x, y) => SCENE_ORDER.indexOf(x.kind) - SCENE_ORDER.indexOf(y.kind));
  return { scenes, locked: LOCKED_SCENES[locale] ?? [], pool: poolFor(scripts, index) };
}

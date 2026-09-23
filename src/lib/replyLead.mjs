// Shared by the site (src/lib/conversations.ts) and the recorder
// (scripts/generate-audio.mjs), which is why it is plain JavaScript: the
// recorder runs under Node with no build step. One copy of the rule means the
// trimmed line on screen and the trimmed line recorded cannot drift apart.

/**
 * The part of a comeback that is not asking you something.
 *
 * `likelyReply` was authored for the scenario page, where an exchange stands
 * on its own and ending on a hook — "Vale. ¿Algo de comer?" — is good writing.
 * Chained into a walk-through it is a question nothing answers: the next beat
 * has its own opener, so the screen asks "anything to eat?" and then, without
 * waiting, "draft or bottle?". Two questions, no turn in between, and the
 * first one silently dropped. Forty-odd beats across the three editions read
 * that way, and one Swedish beat asked "På fat eller flaska?" twice in a row.
 *
 * So mid-conversation a comeback keeps only the sentences in front of its
 * first question. Nothing is rewritten and nothing is invented: the scenario
 * pages still carry every authored line in full, and this is the one surface
 * where a hook has something after it to collide with.
 *
 * @param {string} line
 * @returns {string}
 */
export function statementPartOf(line) {
  const sentences = line.trim().match(/[^.!?…]+[.!?…]*/g);
  if (!sentences) return "";

  /** @type {string[]} */
  const kept = [];
  for (const sentence of sentences) {
    if (/[?？]\s*$/.test(sentence)) break;
    kept.push(sentence);
  }

  // A dangling "/" is left behind when the dropped half was a slash variant
  // of the kept one: "Dime. / ¿Sí?".
  return kept.join("").trim().replace(/[/\s]+$/, "").trim();
}

/**
 * Whether a line ends on a question, and so gets trimmed mid-conversation.
 *
 * @param {string} line
 * @returns {boolean}
 */
export function endsOnQuestion(line) {
  return /[?？]\s*$/.test(line.trim());
}

/**
 * The clip id for the trimmed version of a line: the full line's id, plus
 * `-lead`. A trimmed line and a clip of the untrimmed one are not the same
 * line, so the trimmed one is recorded on its own.
 *
 * @param {string} audioId
 * @returns {string}
 */
export function leadAudioId(audioId) {
  return `${audioId}-lead`;
}
